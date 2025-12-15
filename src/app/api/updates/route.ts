import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, eq, and, like, sql } from "drizzle-orm";
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
      conditions.push(
        sql`(${schema.updates.title} LIKE ${"%" + search + "%"} OR ${schema.updates.content} LIKE ${"%" + search + "%"})`
      );
    }

    // Execute query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const updates = await db
      .select()
      .from(schema.updates)
      .where(whereClause)
      .orderBy(desc(schema.updates.publishedAt))
      .limit(limit)
      .offset(offset);

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

