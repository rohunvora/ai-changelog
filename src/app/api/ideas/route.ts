import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

// GET /api/ideas - Get all saved ideas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const savedOnly = searchParams.get("saved") === "true";

    let ideas;
    if (savedOnly) {
      ideas = await db
        .select()
        .from(schema.ideas)
        .where(eq(schema.ideas.saved, true))
        .orderBy(desc(schema.ideas.generatedAt));
    } else {
      ideas = await db
        .select()
        .from(schema.ideas)
        .orderBy(desc(schema.ideas.generatedAt));
    }

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("Ideas fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ideas" },
      { status: 500 }
    );
  }
}

