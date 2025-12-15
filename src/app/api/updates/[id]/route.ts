import { NextRequest, NextResponse } from "next/server";
import { db, schema, ensureDb } from "@/db";
import { eq, desc, like, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/updates/[id]
 * Returns full update details with opportunities and related products
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;
    
    // Fetch update
    const update = await db
      .select()
      .from(schema.updates)
      .where(eq(schema.updates.id, id))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!update) {
      return NextResponse.json(
        { error: "Update not found" },
        { status: 404 }
      );
    }
    
    // Fetch opportunities for this update
    let opportunities: Array<{
      id: string;
      title: string;
      description: string;
      targetUser: string;
      jobToBeDone: string;
      surfaceArea: string;
      hardDependencies: string[];
      distributionWedge: string[];
      moatPotential: string[];
      indieViabilityScore: number;
      timeToRevenueScore: number;
      competitionScore: number;
      pricingAnchor: string | null;
      mvpBullets: string[];
      risks: string[];
    }> = [];
    
    try {
      const rawOpps = await db
        .select()
        .from(schema.opportunities)
        .where(eq(schema.opportunities.updateId, id));
      
      opportunities = rawOpps.map(opp => ({
        id: opp.id,
        title: opp.title,
        description: opp.description,
        targetUser: opp.targetUser,
        jobToBeDone: opp.jobToBeDone,
        surfaceArea: opp.surfaceArea,
        hardDependencies: opp.hardDependencies ? JSON.parse(opp.hardDependencies) : [],
        distributionWedge: opp.distributionWedge ? JSON.parse(opp.distributionWedge) : [],
        moatPotential: opp.moatPotential ? JSON.parse(opp.moatPotential) : [],
        indieViabilityScore: opp.indieViabilityScore,
        timeToRevenueScore: opp.timeToRevenueScore,
        competitionScore: opp.competitionScore,
        pricingAnchor: opp.pricingAnchor,
        mvpBullets: opp.mvpBullets ? JSON.parse(opp.mvpBullets) : [],
        risks: opp.risks ? JSON.parse(opp.risks) : [],
      }));
    } catch {
      // Table might not exist yet
    }
    
    // Find related products based on category/capability matching
    let relatedProducts: Array<{
      id: string;
      productName: string;
      founderName: string;
      twitterHandle: string | null;
      category: string | null;
      mrr: number;
      vibecodedPercent: number | null;
      toolsUsed: string[];
    }> = [];
    
    try {
      // Get category from update
      const enablesBuilding = update.enablesBuilding 
        ? JSON.parse(update.enablesBuilding) 
        : [];
      
      // Find products in matching categories or with matching tools
      const founders = await db
        .select({
          founder: schema.founders,
          claim: schema.mrrClaims,
        })
        .from(schema.founders)
        .innerJoin(
          schema.mrrClaims,
          eq(schema.mrrClaims.founderId, schema.founders.id)
        )
        .orderBy(desc(schema.mrrClaims.mrr))
        .limit(5);
      
      relatedProducts = founders.map(({ founder, claim }) => ({
        id: founder.id,
        productName: founder.productName,
        founderName: founder.name,
        twitterHandle: founder.twitterHandle,
        category: founder.category,
        mrr: claim.mrr,
        vibecodedPercent: founder.vibecodedPercent,
        toolsUsed: founder.toolsUsed ? JSON.parse(founder.toolsUsed) : [],
      }));
    } catch {
      // Tables might not exist yet
    }
    
    // Parse enablesBuilding if it exists
    let enablesBuilding: string[] = [];
    try {
      enablesBuilding = update.enablesBuilding 
        ? JSON.parse(update.enablesBuilding) 
        : [];
    } catch {
      enablesBuilding = [];
    }
    
    // Generate market gaps based on existing data
    const marketGaps = generateMarketGaps(update, relatedProducts);
    
    // Extract capability tags from content
    const capabilityTags = extractCapabilityTags(update);
    
    return NextResponse.json({
      id: update.id,
      title: update.title,
      provider: update.provider,
      url: update.url,
      category: update.category,
      contentMd: update.contentMd,
      unlockType: update.unlockType,
      capability: update.capability,
      enablesBuilding,
      publishedAt: update.publishedAt,
      opportunities,
      relatedProducts,
      marketGaps,
      capabilityTags,
    });
  } catch (error) {
    console.error("Error fetching update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to generate market gaps based on update content
function generateMarketGaps(
  update: typeof schema.updates.$inferSelect,
  existingProducts: Array<{ category: string | null }>
): string[] {
  const gaps: string[] = [];
  const existingCategories = new Set(existingProducts.map(p => p.category).filter(Boolean));
  
  // Common verticals that are often underserved
  const potentialVerticals = [
    { name: "Healthcare", key: "healthcare" },
    { name: "Legal/Compliance", key: "legal" },
    { name: "Education", key: "education" },
    { name: "Finance", key: "finance" },
    { name: "Real Estate", key: "real_estate" },
    { name: "Non-profits", key: "nonprofit" },
  ];
  
  for (const vertical of potentialVerticals) {
    if (!existingCategories.has(vertical.key)) {
      gaps.push(`No vibecoded products serving ${vertical.name} yet`);
    }
  }
  
  // Capability-specific gaps
  if (update.unlockType === "new_capability") {
    gaps.push(`First-mover advantage: Few products leveraging this new capability`);
  }
  
  return gaps.slice(0, 4); // Limit to 4 gaps
}

// Helper to extract capability tags from update content
function extractCapabilityTags(
  update: typeof schema.updates.$inferSelect
): string[] {
  const tags: string[] = [];
  const content = `${update.title} ${update.contentText}`.toLowerCase();
  
  const tagMappings: Record<string, string[]> = {
    "reasoning": ["reasoning", "think", "chain of thought", "cot", "o1", "o3"],
    "multimodal": ["multimodal", "image", "vision", "audio", "video"],
    "tool_use": ["tool", "function calling", "tool use", "mcp", "computer use"],
    "voice": ["voice", "speech", "audio", "realtime", "conversation"],
    "search": ["search", "retrieval", "rag", "grounding", "web search"],
    "agents": ["agent", "agentic", "autonomous", "workflow"],
    "code_gen": ["code", "coding", "programming", "developer"],
    "vision": ["vision", "image understanding", "ocr", "screenshot"],
    "browsing": ["browse", "web", "internet", "navigate"],
  };
  
  for (const [tag, keywords] of Object.entries(tagMappings)) {
    if (keywords.some(kw => content.includes(kw))) {
      tags.push(tag);
    }
  }
  
  return tags;
}
