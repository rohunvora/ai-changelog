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
    const updateId = parseInt(id);

    if (isNaN(updateId)) {
      return NextResponse.json({ error: "Invalid update ID" }, { status: 400 });
    }

    const update = await db
      .select()
      .from(schema.updates)
      .where(eq(schema.updates.id, updateId))
      .limit(1);

    if (update.length === 0) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    // Also get any generated ideas for this update
    const ideas = await db
      .select()
      .from(schema.ideas)
      .where(eq(schema.ideas.updateId, updateId));

    return NextResponse.json({
      update: update[0],
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

