import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, eq, and, sql } from "drizzle-orm";
import { ProviderKey, CategoryKey } from "@/lib/scrapers";

// GET /api/updates - Get all updates with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as ProviderKey | null;
    const category = searchParams.get("category") as CategoryKey | null;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build conditions
    const conditions = [];

    if (provider) {
      conditions.push(eq(schema.updates.provider, provider));
    }

    if (category) {
      conditions.push(eq(schema.updates.category, category));
    }

    if (search) {
      // Search in title and contentText (the searchable text field)
      conditions.push(
        sql`(${schema.updates.title} LIKE ${"%" + search + "%"} OR ${schema.updates.contentText} LIKE ${"%" + search + "%"})`
      );
    }

    // Execute query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rawUpdates = await db
      .select()
      .from(schema.updates)
      .where(whereClause)
      .orderBy(desc(schema.updates.publishedAt))
      .limit(limit)
      .offset(offset);

    // Transform to match expected frontend format
    const updates = rawUpdates.map((u) => ({
      id: u.id,
      provider: u.provider,
      title: u.title,
      content: u.contentMd || u.contentText, // Use markdown for display, fallback to text
      url: u.url,
      category: u.category,
      publishedAt: new Date(u.publishedAt).toISOString(),
      scrapedAt: new Date(u.scrapedAt).toISOString(),
    }));

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.updates)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      updates,
      total,
      limit,
      offset,
      hasMore: offset + updates.length < total,
    });
  } catch (error) {
    console.error("Updates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch updates" },
      { status: 500 }
    );
  }
}

