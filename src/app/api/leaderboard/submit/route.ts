import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { ulid } from "ulid";
import { eq, or } from "drizzle-orm";
import { parseMRRClaim, extractVibecodingTools, extractVibecodingPercent } from "@/lib/scrapers/claim-parser";
import { calculateInitialConfidence } from "@/lib/scrapers/confidence-scorer";

export const dynamic = "force-dynamic";

interface SubmitRequest {
  // Founder info
  founderName: string;
  twitterHandle?: string;
  productName: string;
  productUrl?: string;
  category?: string;
  
  // MRR claim
  mrrClaimText: string; // Raw text containing MRR claim
  mrrSourceUrl: string; // URL where claim was made
  
  // Vibecoding claim
  vibecodedClaimText: string; // Raw text about vibecoding
  vibecodedSourceUrl: string; // URL where vibecoding claim was made
  
  // Optional
  toolsUsed?: string[]; // Explicit list of tools
}

export async function POST(req: NextRequest) {
  try {
    const body: SubmitRequest = await req.json();
    
    // Validate required fields
    if (!body.founderName || !body.productName || !body.mrrClaimText || !body.mrrSourceUrl || !body.vibecodedClaimText || !body.vibecodedSourceUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Parse MRR claim
    const parsedClaim = parseMRRClaim(body.mrrClaimText);
    if (!parsedClaim || !parsedClaim.mrr) {
      return NextResponse.json(
        { error: "Could not parse MRR from claim text. Please include a clear MRR amount (e.g., '$10k MRR' or '$10,000/month')" },
        { status: 400 }
      );
    }
    
    // Extract vibecoding tools
    const toolsUsed = body.toolsUsed || extractVibecodingTools(body.vibecodedClaimText);
    if (toolsUsed.length === 0) {
      return NextResponse.json(
        { error: "Could not identify vibecoding tools. Please specify tools used (e.g., Cursor, Claude, Lovable)" },
        { status: 400 }
      );
    }
    
    const vibecodedPercent = extractVibecodingPercent(body.vibecodedClaimText);
    
    const now = Date.now();
    
    // Check if founder/product already exists
    const founderConditions = [];
    if (body.productUrl) {
      founderConditions.push(eq(schema.founders.productUrl, body.productUrl));
    }
    founderConditions.push(eq(schema.founders.productName, body.productName));
    
    let founder = await db.select().from(schema.founders)
      .where(founderConditions.length === 1 ? founderConditions[0] : or(...founderConditions))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!founder) {
      // Create new founder
      const founderId = ulid();
      await db.insert(schema.founders).values({
        id: founderId,
        name: body.founderName,
        twitterHandle: body.twitterHandle || null,
        productName: body.productName,
        productUrl: body.productUrl || null,
        category: body.category || null,
        vibecodedClaim: body.vibecodedClaimText,
        vibecodedSource: body.vibecodedSourceUrl,
        vibecodedPercent: vibecodedPercent || null,
        toolsUsed: JSON.stringify(toolsUsed),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
      founder = await db.select().from(schema.founders).where(eq(schema.founders.id, founderId)).limit(1).then(rows => rows[0]);
    } else {
      // Update existing founder
      await db.update(schema.founders)
        .set({
          name: body.founderName,
          twitterHandle: body.twitterHandle || founder.twitterHandle,
          productUrl: body.productUrl || founder.productUrl,
          category: body.category || founder.category,
          vibecodedClaim: body.vibecodedClaimText,
          vibecodedSource: body.vibecodedSourceUrl,
          vibecodedPercent: vibecodedPercent || founder.vibecodedPercent,
          toolsUsed: JSON.stringify(toolsUsed),
          updatedAt: new Date(now),
        })
        .where(eq(schema.founders.id, founder.id));
    }
    
    if (!founder) {
      return NextResponse.json(
        { error: "Failed to create/update founder" },
        { status: 500 }
      );
    }
    
    // Create MRR claim
    const claimId = ulid();
    const confidence = calculateInitialConfidence("manual", false, false, 1);
    
    await db.insert(schema.mrrClaims).values({
      id: claimId,
      founderId: founder.id,
      mrr: parsedClaim.mrr,
      arr: parsedClaim.arr || null,
      claimDate: new Date(now),
      confidence,
      confidenceReason: "Manual submission - pending review",
      isStripeVerified: false,
      isOpenStartup: false,
      hasMultipleSources: false,
      scrapedAt: new Date(now),
    });
    
    // Create source
    const sourceId = ulid();
    await db.insert(schema.claimSources).values({
      id: sourceId,
      claimId,
      sourceType: "manual",
      sourceUrl: body.mrrSourceUrl,
      sourceDate: new Date(now),
      rawText: body.mrrClaimText,
      createdAt: new Date(now),
    });
    
    return NextResponse.json({
      success: true,
      founderId: founder.id,
      claimId,
      message: "Submission received. It will be reviewed before appearing on the leaderboard.",
    });
  } catch (error) {
    console.error("Error submitting leaderboard entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

