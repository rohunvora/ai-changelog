import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { scrapeAll, scrapeProvider, ProviderKey, PROVIDERS, NormalizedUpdate } from "@/lib/scrapers";
import { eq, and, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { computeHash, htmlToMarkdown } from "@/lib/scrape/utils";
import { classifyUpdate } from "@/lib/classifier";

const LOCK_NAME = "scrape";
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if the request is authorized (for cron or manual triggers).
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // Skip auth in development or if no secret is set
  if (!cronSecret || process.env.NODE_ENV !== "production") {
    return true;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Acquire a distributed lock to prevent concurrent scrape runs.
 * Returns true if lock acquired, false if already locked.
 */
async function acquireLock(): Promise<boolean> {
  const now = Date.now();
  
  try {
    // Check if lock exists and is still valid
    const existing = await db
      .select()
      .from(schema.locks)
      .where(eq(schema.locks.name, LOCK_NAME))
      .limit(1);
    
    if (existing.length > 0 && existing[0].expiresAt.getTime() > now) {
      console.log("Lock held, skipping scrape");
      return false;
    }
    
    // Acquire or refresh lock
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
    console.error("Lock acquisition error:", error);
    return false;
  }
}

/**
 * Release the lock after scrape completes.
 */
async function releaseLock(): Promise<void> {
  try {
    await db.delete(schema.locks).where(eq(schema.locks.name, LOCK_NAME));
  } catch (error) {
    console.error("Lock release error:", error);
  }
}

/**
 * Process scraped updates: upsert with hash-based change detection.
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
      // Check if update exists
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
        // Update only if content changed
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
        // Classify new update
        const classification = await classifyUpdate(
          update.provider,
          update.title,
          update.contentText
        );
        
        // Insert new update with classification
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
          unlockType: classification.unlockType,
          capability: classification.capability || null,
          enablesBuilding: classification.enablesBuilding 
            ? JSON.stringify(classification.enablesBuilding)
            : null,
          publishedAt: new Date(update.publishedAt),
          scrapedAt: new Date(now),
          externalId: update.externalId,
        });
        inserted++;
      }
    } catch (error) {
      console.error(`Error processing update "${update.title}":`, error);
      skipped++;
    }
  }
  
  return { inserted, updated, skipped };
}

/**
 * Run the scrape pipeline with lock protection.
 */
async function runScrapeWithLock(provider?: ProviderKey): Promise<{
  success: boolean;
  scraped: number;
  inserted: number;
  updated: number;
  skipped: number;
  provider: string;
  locked?: boolean;
}> {
  // Acquire lock
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    return {
      success: false,
      scraped: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      provider: provider || "all",
      locked: true,
    };
  }
  
  try {
    // Run scrapers
    const updates = provider && provider in PROVIDERS
      ? await scrapeProvider(provider)
      : await scrapeAll();
    
    // Process updates with upsert
    const { inserted, updated, skipped } = await processUpdates(updates);
    
    return {
      success: true,
      scraped: updates.length,
      inserted,
      updated,
      skipped,
      provider: provider || "all",
    };
  } finally {
    await releaseLock();
  }
}

// GET /api/scrape - Get scrape status (also used by frontend to get counts)
export async function GET(request: NextRequest) {
  try {
    // Check if this is a cron trigger (has authorization header)
    const authHeader = request.headers.get("authorization");
    
    // If it has auth header, treat as cron trigger
    if (authHeader) {
      if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const result = await runScrapeWithLock();
      
      if (result.locked) {
        return NextResponse.json(
          { error: "Scrape already in progress", ...result },
          { status: 409 }
        );
      }
      
      return NextResponse.json(result);
    }
    
    // Otherwise, return status counts
    const counts = await Promise.all(
      Object.keys(PROVIDERS).map(async (provider) => {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.updates)
          .where(eq(schema.updates.provider, provider));
        return { provider, count: result[0]?.count || 0 };
      })
    );

    const total = counts.reduce((sum, c) => sum + c.count, 0);

    return NextResponse.json({
      providers: counts,
      total,
    });
  } catch (error) {
    console.error("Scrape/Status error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// POST /api/scrape - Manual scrape trigger
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const provider = body.provider as ProviderKey | undefined;

    const result = await runScrapeWithLock(provider);
    
    if (result.locked) {
      return NextResponse.json(
        { error: "Scrape already in progress", ...result },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Failed to scrape updates" },
      { status: 500 }
    );
  }
}

