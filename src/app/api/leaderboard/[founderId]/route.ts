import { NextRequest, NextResponse } from "next/server";
import { db, schema, ensureDb } from "@/db";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboard/[founderId]
 * Returns full history for a founder: all claims, all sources, confidence breakdown
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ founderId: string }> }
) {
  try {
    await ensureDb();
    const { founderId } = await params;
    
    // Get founder
    const founder = await db
      .select()
      .from(schema.founders)
      .where(eq(schema.founders.id, founderId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!founder) {
      return NextResponse.json(
        { error: "Founder not found" },
        { status: 404 }
      );
    }
    
    // Get all MRR claims for this founder (ordered by date)
    const claims = await db
      .select()
      .from(schema.mrrClaims)
      .where(eq(schema.mrrClaims.founderId, founderId))
      .orderBy(desc(schema.mrrClaims.claimDate));
    
    // Get all sources for each claim
    const claimsWithSources = await Promise.all(
      claims.map(async (claim) => {
        const sources = await db
          .select()
          .from(schema.claimSources)
          .where(eq(schema.claimSources.claimId, claim.id))
          .orderBy(desc(schema.claimSources.sourceDate));
        
        return {
          ...claim,
          sources,
        };
      })
    );
    
    const toolsUsed = founder.toolsUsed 
      ? JSON.parse(founder.toolsUsed) 
      : [];
    
    return NextResponse.json({
      founder: {
        id: founder.id,
        name: founder.name,
        twitterHandle: founder.twitterHandle,
        productName: founder.productName,
        productUrl: founder.productUrl,
        category: founder.category,
        vibecodedClaim: founder.vibecodedClaim,
        vibecodedSource: founder.vibecodedSource,
        vibecodedPercent: founder.vibecodedPercent,
        toolsUsed,
        createdAt: founder.createdAt,
        updatedAt: founder.updatedAt,
      },
      claims: claimsWithSources.map((claim) => ({
        id: claim.id,
        mrr: claim.mrr, // In cents
        arr: claim.arr, // In cents
        claimDate: claim.claimDate,
        confidence: claim.confidence,
        confidenceReason: claim.confidenceReason,
        isStripeVerified: claim.isStripeVerified,
        isOpenStartup: claim.isOpenStartup,
        hasMultipleSources: claim.hasMultipleSources,
        scrapedAt: claim.scrapedAt,
        sources: claim.sources.map((source) => ({
          id: source.id,
          sourceType: source.sourceType,
          sourceUrl: source.sourceUrl,
          sourceDate: source.sourceDate,
          rawText: source.rawText,
          createdAt: source.createdAt,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching founder details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

