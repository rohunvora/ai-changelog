import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { scrapeAll, NormalizedUpdate, PROVIDERS } from "@/lib/scrapers";
import { eq, and } from "drizzle-orm";
import { ulid } from "ulid";
import { computeHash, htmlToMarkdown } from "@/lib/scrape/utils";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for cron

const LOCK_NAME = "cron_scrape";
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verify the request is from Vercel Cron.
 * Vercel sends the CRON_SECRET as Authorization: Bearer <secret>
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow in development
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  
  // If no secret configured, allow (but warn)
  if (!cronSecret) {
    console.warn("CRON_SECRET not set - cron endpoint is unprotected");
    return true;
  }
  
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Acquire lock for cron execution.
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
 * Release lock after cron completes.
 */
async function releaseLock(): Promise<void> {
  try {
    await db.delete(schema.locks).where(eq(schema.locks.name, LOCK_NAME));
  } catch (error) {
    console.error("Lock release error:", error);
  }
}

/**
 * Process and upsert updates with hash-based deduplication.
 */
async function processUpdates(updates: NormalizedUpdate[]): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
}> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const update of updates) {
    const hash = computeHash(
      update.title,
      update.url,
      update.publishedAt,
      update.contentText
    );
    
    const contentMd = update.contentMd || htmlToMarkdown(update.contentHtml);
    const now = Date.now();
    
    try {
      const existing = await db
        .select()
        .from(schema.updates)
        .where(
          and(
            eq(schema.updates.provider, update.provider),
            eq(schema.updates.url, update.url)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        if (existing[0].hash !== hash) {
          await db
            .update(schema.updates)
            .set({
              title: update.title,
              contentText: update.contentText,
              contentMd: contentMd,
              raw: update.contentHtml,
              hash: hash,
              category: update.category,
              scrapedAt: new Date(now),
            })
            .where(eq(schema.updates.id, existing[0].id));
          updated++;
        } else {
          skipped++;
        }
      } else {
        await db.insert(schema.updates).values({
          id: ulid(),
          provider: update.provider,
          title: update.title,
          url: update.url,
          category: update.category,
          contentText: update.contentText,
          contentMd: contentMd,
          raw: update.contentHtml,
          hash: hash,
          publishedAt: new Date(update.publishedAt),
          scrapedAt: new Date(now),
          externalId: update.externalId,
        });
        inserted++;
      }
    } catch (error) {
      console.error(`Error processing "${update.title}":`, error);
      skipped++;
    }
  }
  
  return { inserted, updated, skipped };
}

/**
 * GET /api/cron/scrape - Vercel cron endpoint
 * 
 * Vercel crons always use GET requests.
 * This endpoint runs all scrapers with lock protection.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verify authorization
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Acquire lock
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    return NextResponse.json(
      { 
        ok: false, 
        error: "Scrape already in progress",
        locked: true,
      },
      { status: 409 }
    );
  }
  
  try {
    console.log("Starting cron scrape...");
    
    // Run all scrapers
    const updates = await scrapeAll();
    
    console.log(`Scraped ${updates.length} updates from ${Object.keys(PROVIDERS).length} providers`);
    
    // Process with upsert
    const { inserted, updated, skipped } = await processUpdates(updates);
    
    const duration = Date.now() - startTime;
    
    console.log(`Cron complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped (${duration}ms)`);
    
    return NextResponse.json({
      ok: true,
      scraped: updates.length,
      inserted,
      updated,
      skipped,
      duration,
    });
  } catch (error) {
    console.error("Cron scrape error:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await releaseLock();
  }
}

