import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

// POST /api/ideas/[id]/save - Toggle save status for an idea
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ideaId = parseInt(id);
    const body = await request.json();
    const { saved } = body;

    if (isNaN(ideaId)) {
      return NextResponse.json({ error: "Invalid idea ID" }, { status: 400 });
    }

    await db
      .update(schema.ideas)
      .set({ saved: saved })
      .where(eq(schema.ideas.id, ideaId));

    return NextResponse.json({ success: true, saved });
  } catch (error) {
    console.error("Save idea error:", error);
    return NextResponse.json(
      { error: "Failed to save idea" },
      { status: 500 }
    );
  }
}

