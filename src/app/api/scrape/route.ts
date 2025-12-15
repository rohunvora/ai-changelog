import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { scrapeAll, scrapeProvider, ProviderKey, PROVIDERS } from "@/lib/scrapers";
import { eq } from "drizzle-orm";

// POST /api/scrape - Run scrapers (protected by CRON_SECRET)
export async function POST(request: NextRequest) {
  try {
    // Check for cron secret in header or query param
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Skip auth check in development or if no secret is set
    if (cronSecret && process.env.NODE_ENV === "production") {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const provider = body.provider as ProviderKey | undefined;

    let updates;
    if (provider && provider in PROVIDERS) {
      updates = await scrapeProvider(provider);
    } else {
      updates = await scrapeAll();
    }

    // Insert updates, skipping duplicates
    let inserted = 0;
    let skipped = 0;

    for (const update of updates) {
      // Check if update already exists by externalId
      if (update.externalId) {
        const existing = await db
          .select()
          .from(schema.updates)
          .where(eq(schema.updates.externalId, update.externalId))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }
      }

      // Insert new update
      await db.insert(schema.updates).values({
        provider: update.provider,
        title: update.title,
        content: update.content,
        url: update.url,
        category: update.category,
        publishedAt: update.publishedAt,
        scrapedAt: new Date().toISOString(),
        externalId: update.externalId,
      });
      inserted++;
    }

    return NextResponse.json({
      success: true,
      scraped: updates.length,
      inserted,
      skipped,
      provider: provider || "all",
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Failed to scrape updates" },
      { status: 500 }
    );
  }
}

// GET /api/scrape - Get scrape status
export async function GET() {
  try {
    const counts = await Promise.all(
      Object.keys(PROVIDERS).map(async (provider) => {
        const result = await db
          .select()
          .from(schema.updates)
          .where(eq(schema.updates.provider, provider));
        return { provider, count: result.length };
      })
    );

    const total = counts.reduce((sum, c) => sum + c.count, 0);

    return NextResponse.json({
      providers: counts,
      total,
    });
  } catch (error) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}

