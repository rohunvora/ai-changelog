import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

// GET /api/updates/[id] - Get a single update
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.length === 0) {
      return NextResponse.json({ error: "Invalid update ID" }, { status: 400 });
    }

    const update = await db
      .select()
      .from(schema.updates)
      .where(eq(schema.updates.id, id))
      .limit(1);

    if (update.length === 0) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    // Also get any generated ideas for this update
    const ideas = await db
      .select()
      .from(schema.ideas)
      .where(eq(schema.ideas.updateId, id));

    // Transform for frontend compatibility
    const transformedUpdate = {
      ...update[0],
      content: update[0].contentMd || update[0].contentText,
      publishedAt: new Date(update[0].publishedAt).toISOString(),
      scrapedAt: new Date(update[0].scrapedAt).toISOString(),
    };

    return NextResponse.json({
      update: transformedUpdate,
      ideas,
    });
  } catch (error) {
    console.error("Update fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch update" },
      { status: 500 }
    );
  }
}

