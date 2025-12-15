import { NextRequest, NextResponse } from "next/server";
import { db, schema, ensureDb } from "@/db";
import { desc, eq, and, sql, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboard
 * Query params:
 * - confidence: "high" | "medium" | "low" | "all" (default: "all")
 * - sort: "mrr" | "recent" | "confidence" (default: "mrr")
 * - category: "saas" | "api" | "mobile" | "all" (default: "all")
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    
    const confidenceParam = searchParams.get("confidence") || "all"; // high, medium, low, all
    const sort = searchParams.get("sort") || "mrr"; // mrr, recent, confidence
    const category = searchParams.get("category") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    // Cast confidence to valid type
    const confidence = confidenceParam as "high" | "medium" | "low" | "all";
    
    // Get all founders with their latest claims
    // First, get all founders
    const allFounders = await db
      .select()
      .from(schema.founders)
      .where(category !== "all" ? eq(schema.founders.category, category) : undefined);
    
    // For each founder, get their latest claim
    const entries: Array<{
      founder: typeof schema.founders.$inferSelect;
      claim: typeof schema.mrrClaims.$inferSelect;
      sourceCount: number;
    }> = [];
    
    for (const founder of allFounders) {
      // Get latest claim for this founder
      const claims = await db
        .select()
        .from(schema.mrrClaims)
        .where(
          and(
            eq(schema.mrrClaims.founderId, founder.id),
            confidence !== "all" ? eq(schema.mrrClaims.confidence, confidence) : undefined
          )
        )
        .orderBy(desc(schema.mrrClaims.claimDate))
        .limit(1);
      
      if (claims.length === 0) continue;
      
      const claim = claims[0];
      
      // Get source count
      const sources = await db
        .select()
        .from(schema.claimSources)
        .where(eq(schema.claimSources.claimId, claim.id));
      
      entries.push({
        founder,
        claim,
        sourceCount: sources.length,
      });
    }
    
    // Sort entries
    if (sort === "mrr") {
      entries.sort((a, b) => b.claim.mrr - a.claim.mrr);
    } else if (sort === "recent") {
      entries.sort((a, b) => b.claim.claimDate.getTime() - a.claim.claimDate.getTime());
    } else if (sort === "confidence") {
      const confidenceOrder = { high: 1, medium: 2, low: 3 };
      entries.sort((a, b) => {
        const aOrder = confidenceOrder[a.claim.confidence];
        const bOrder = confidenceOrder[b.claim.confidence];
        if (aOrder !== bOrder) return aOrder - bOrder;
        return b.claim.mrr - a.claim.mrr;
      });
    }
    
    // Apply pagination
    const results = entries.slice(offset, offset + limit);
    
    // Total count is the length of entries before pagination
    const totalCount = entries.length;
    
    // Format response
    const leaderboard = results.map((row) => {
      const toolsUsed = row.founder.toolsUsed 
        ? JSON.parse(row.founder.toolsUsed) 
        : [];
      
      return {
        founder: {
          id: row.founder.id,
          name: row.founder.name,
          twitterHandle: row.founder.twitterHandle,
          productName: row.founder.productName,
          productUrl: row.founder.productUrl,
          category: row.founder.category,
          vibecodedClaim: row.founder.vibecodedClaim,
          vibecodedSource: row.founder.vibecodedSource,
          vibecodedPercent: row.founder.vibecodedPercent,
          toolsUsed,
        },
        claim: {
          id: row.claim.id,
          mrr: row.claim.mrr, // In cents
          arr: row.claim.arr, // In cents
          claimDate: new Date(row.claim.claimDate).toISOString(),
          confidence: row.claim.confidence,
          confidenceReason: row.claim.confidenceReason,
          isStripeVerified: row.claim.isStripeVerified,
          isOpenStartup: row.claim.isOpenStartup,
          hasMultipleSources: row.claim.hasMultipleSources,
        },
        sourceCount: row.sourceCount || 0,
      };
    });
    
    return NextResponse.json({
      leaderboard,
      total: totalCount,
      hasMore: offset + leaderboard.length < totalCount,
      filters: {
        confidence: confidenceParam,
        sort,
        category,
      },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

