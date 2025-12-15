import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc, inArray } from "drizzle-orm";
import { cookies } from "next/headers";

const ANON_ID_COOKIE = "anon_id";

// GET /api/ideas - Get ideas (optionally filtered to user's bookmarks)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const savedOnly = searchParams.get("saved") === "true";
    const updateId = searchParams.get("updateId");

    // Get user's anonymous ID for bookmark checking
    const cookieStore = await cookies();
    const anonId = cookieStore.get(ANON_ID_COOKIE)?.value;

    let ideas;
    
    if (savedOnly) {
      // Get bookmarked ideas for this user
      if (!anonId) {
        return NextResponse.json({ ideas: [] });
      }

      // Get bookmarked idea IDs
      const bookmarks = await db
        .select()
        .from(schema.ideaBookmarks)
        .where(eq(schema.ideaBookmarks.anonId, anonId));
      
      if (bookmarks.length === 0) {
        return NextResponse.json({ ideas: [] });
      }

      const bookmarkedIds = bookmarks.map((b) => b.ideaId);
      
      ideas = await db
        .select()
        .from(schema.ideas)
        .where(inArray(schema.ideas.id, bookmarkedIds))
        .orderBy(desc(schema.ideas.generatedAt));
      
      // Mark all as saved
      ideas = ideas.map((idea) => ({
        ...idea,
        saved: true,
        complexity: complexityToString(idea.complexity),
        potentialImpact: impactToString(idea.potentialImpact),
        generatedAt: new Date(idea.generatedAt).toISOString(),
      }));
    } else if (updateId) {
      // Get ideas for a specific update
      ideas = await db
        .select()
        .from(schema.ideas)
        .where(eq(schema.ideas.updateId, updateId))
        .orderBy(desc(schema.ideas.generatedAt));
      
      // Check which are bookmarked
      const bookmarkedIds = new Set<string>();
      if (anonId) {
        const bookmarks = await db
          .select()
          .from(schema.ideaBookmarks)
          .where(eq(schema.ideaBookmarks.anonId, anonId));
        bookmarks.forEach((b) => bookmarkedIds.add(b.ideaId));
      }

      ideas = ideas.map((idea) => ({
        ...idea,
        saved: bookmarkedIds.has(idea.id),
        complexity: complexityToString(idea.complexity),
        potentialImpact: impactToString(idea.potentialImpact),
        generatedAt: new Date(idea.generatedAt).toISOString(),
      }));
    } else {
      // Get all ideas
      ideas = await db
        .select()
        .from(schema.ideas)
        .orderBy(desc(schema.ideas.generatedAt))
        .limit(100);

      // Check which are bookmarked
      const bookmarkedIds = new Set<string>();
      if (anonId) {
        const bookmarks = await db
          .select()
          .from(schema.ideaBookmarks)
          .where(eq(schema.ideaBookmarks.anonId, anonId));
        bookmarks.forEach((b) => bookmarkedIds.add(b.ideaId));
      }

      ideas = ideas.map((idea) => ({
        ...idea,
        saved: bookmarkedIds.has(idea.id),
        complexity: complexityToString(idea.complexity),
        potentialImpact: impactToString(idea.potentialImpact),
        generatedAt: new Date(idea.generatedAt).toISOString(),
      }));
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

/**
 * Convert numeric complexity to string for frontend compatibility.
 */
function complexityToString(complexity: number | null): string {
  if (complexity === null) return "medium";
  if (complexity <= 2) return "low";
  if (complexity <= 3) return "medium";
  return "high";
}

/**
 * Convert numeric impact to string for frontend compatibility.
 */
function impactToString(impact: number | null): string {
  if (impact === null) return "medium";
  if (impact <= 2) return "low";
  if (impact <= 3) return "medium";
  return "high";
}

