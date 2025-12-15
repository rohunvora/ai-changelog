import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { searchTwitterViaNitter, processTwitterClaim, TWITTER_SEARCH_QUERIES } from "@/lib/scrapers/twitter-mrr";
import { scrapeIndieHackersProducts, processIndieHackersProduct } from "@/lib/scrapers/indie-hackers";
import { scrapeBaremetrics, processOpenStartup } from "@/lib/scrapers/open-startups";

export const dynamic = "force-dynamic";

const LOCK_NAME = "scrape-mrr";
const LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if request is authorized (from Vercel Cron)
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  
  if (!cronSecret) {
    console.warn("CRON_SECRET not set - cron endpoint is unprotected");
    return true;
  }
  
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Acquire lock for cron execution
 */
async function acquireLock(): Promise<boolean> {
  const now = Date.now();
  
  try {
    const existing = await db
      .select()
      .from(schema.locks)
      .where(eq(schema.locks.name, LOCK_NAME))
      .limit(1);
    
    if (existing.length > 0 && existing[0].expiresAt.getTime() > now) {
      return false;
    }
    
    await db
      .insert(schema.locks)
      .values({
        name: LOCK_NAME,
        lockedAt: new Date(now),
        expiresAt: new Date(now + LOCK_TTL_MS),
      })
      .onConflictDoUpdate({
        target: schema.locks.name,
        set: {
          lockedAt: new Date(now),
          expiresAt: new Date(now + LOCK_TTL_MS),
        },
      });
    
    return true;
  } catch (error) {
    console.error("Lock error:", error);
    return false;
  }
}

/**
 * Release lock after cron completes
 */
async function releaseLock(): Promise<void> {
  try {
    await db.delete(schema.locks).where(eq(schema.locks.name, LOCK_NAME));
  } catch (error) {
    console.error("Lock release error:", error);
  }
}

/**
 * GET /api/cron/scrape-mrr
 * Scrapes MRR claims from Twitter, Indie Hackers, and Open Startup dashboards
 */
export async function GET(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    return NextResponse.json(
      { error: "Another scrape job is already running" },
      { status: 409 }
    );
  }
  
  try {
    console.log("Starting MRR scraping job...");
    const results = {
      twitter: { found: 0, processed: 0 },
      indieHackers: { found: 0, processed: 0 },
      openStartups: { found: 0, processed: 0 },
    };
    
    // 1. Scrape Twitter
    try {
      console.log("Scraping Twitter...");
      for (const query of TWITTER_SEARCH_QUERIES.slice(0, 2)) { // Limit to 2 queries per run
        const claims = await searchTwitterViaNitter(query);
        results.twitter.found += claims.length;
        
        for (const claim of claims) {
          try {
            const result = await processTwitterClaim(claim, db, schema);
            if (result) {
              results.twitter.processed++;
            }
          } catch (error) {
            console.error(`Error processing Twitter claim:`, error);
          }
          
          // Rate limiting: wait 2 seconds between claims
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error("Twitter scraping error:", error);
    }
    
    // 2. Scrape Indie Hackers
    try {
      console.log("Scraping Indie Hackers...");
      const products = await scrapeIndieHackersProducts();
      results.indieHackers.found = products.length;
      
      for (const product of products) {
        try {
          const result = await processIndieHackersProduct(product, db, schema);
          if (result) {
            results.indieHackers.processed++;
          }
        } catch (error) {
          console.error(`Error processing Indie Hackers product:`, error);
        }
        
        // Rate limiting: wait 1 second between products
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Indie Hackers scraping error:", error);
    }
    
    // 3. Scrape Open Startups (curated list)
    // For now, this is a placeholder - would need a curated list of dashboard URLs
    try {
      console.log("Scraping Open Startups...");
      // TODO: Maintain a curated list of open startup dashboard URLs
      const openStartupUrls: string[] = []; // Would be populated from config
      
      for (const url of openStartupUrls) {
        try {
          const data = await scrapeBaremetrics(url);
          if (data) {
            results.openStartups.found++;
            const result = await processOpenStartup(data, db, schema);
            if (result) {
              results.openStartups.processed++;
            }
          }
        } catch (error) {
          console.error(`Error processing open startup ${url}:`, error);
        }
        
        // Rate limiting: wait 2 seconds between dashboards
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error("Open Startup scraping error:", error);
    }
    
    const totalProcessed = 
      results.twitter.processed + 
      results.indieHackers.processed + 
      results.openStartups.processed;
    
    console.log(`MRR scraping complete. Processed ${totalProcessed} new claims.`);
    
    return NextResponse.json({
      success: true,
      results,
      totalProcessed,
    });
  } catch (error) {
    console.error("MRR scraping job error:", error);
    return NextResponse.json(
      { error: "Scraping job failed", details: String(error) },
      { status: 500 }
    );
  } finally {
    await releaseLock();
  }
}

