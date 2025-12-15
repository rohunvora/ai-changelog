import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { ulid } from "ulid";

const ANON_ID_COOKIE = "anon_id";
const ANON_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Get or create anonymous user ID from cookie.
 */
async function getOrCreateAnonId(): Promise<string> {
  const cookieStore = await cookies();
  let anonId = cookieStore.get(ANON_ID_COOKIE)?.value;
  
  if (!anonId) {
    anonId = ulid();
  }
  
  return anonId;
}

// POST /api/ideas/[id]/save - Toggle bookmark status for an idea
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ideaId } = await params;
    const body = await request.json();
    const { saved } = body;

    if (!ideaId) {
      return NextResponse.json({ error: "Invalid idea ID" }, { status: 400 });
    }

    // Verify idea exists
    const idea = await db
      .select()
      .from(schema.ideas)
      .where(eq(schema.ideas.id, ideaId))
      .limit(1);

    if (idea.length === 0) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    const anonId = await getOrCreateAnonId();
    const now = Date.now();

    if (saved) {
      // Add bookmark
      await db
        .insert(schema.ideaBookmarks)
        .values({
          anonId,
          ideaId,
          createdAt: new Date(now),
        })
        .onConflictDoNothing(); // Ignore if already bookmarked
    } else {
      // Remove bookmark
      await db
        .delete(schema.ideaBookmarks)
        .where(
          and(
            eq(schema.ideaBookmarks.anonId, anonId),
            eq(schema.ideaBookmarks.ideaId, ideaId)
          )
        );
    }

    // Create response with cookie
    const response = NextResponse.json({ success: true, saved });
    
    // Set anon_id cookie if it's new
    response.cookies.set(ANON_ID_COOKIE, anonId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ANON_ID_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Save idea error:", error);
    return NextResponse.json(
      { error: "Failed to save idea" },
      { status: 500 }
    );
  }
}

// GET /api/ideas/[id]/save - Check if idea is bookmarked
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ideaId } = await params;
    
    if (!ideaId) {
      return NextResponse.json({ error: "Invalid idea ID" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const anonId = cookieStore.get(ANON_ID_COOKIE)?.value;
    
    if (!anonId) {
      return NextResponse.json({ saved: false });
    }

    const bookmark = await db
      .select()
      .from(schema.ideaBookmarks)
      .where(
        and(
          eq(schema.ideaBookmarks.anonId, anonId),
          eq(schema.ideaBookmarks.ideaId, ideaId)
        )
      )
      .limit(1);

    return NextResponse.json({ saved: bookmark.length > 0 });
  } catch (error) {
    console.error("Check bookmark error:", error);
    return NextResponse.json(
      { error: "Failed to check bookmark" },
      { status: 500 }
    );
  }
}

