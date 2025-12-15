/**
 * Indie Hackers scraper
 * Scrapes product pages with revenue data and checks for vibecoding mentions
 */

import { parseMRRClaim, extractVibecodingTools, extractVibecodingPercent } from "./claim-parser";
import type { Founder, NewFounder, MRRClaim, NewMRRClaim, ClaimSource, NewClaimSource } from "@/db/schema";

export interface IndieHackersProduct {
  name: string;
  url: string;
  founderName: string;
  founderUrl: string;
  revenue?: string; // "$10k/mo" format
  description?: string;
  category?: string;
}

/**
 * Scrape Indie Hackers products page
 * Note: Indie Hackers doesn't have a public API, so this would need to scrape HTML
 * For MVP, we'll use a curated list or manual input
 */
export async function scrapeIndieHackersProducts(): Promise<IndieHackersProduct[]> {
  // TODO: Implement actual scraping
  // For now, return empty array
  // In production, this would:
  // 1. Fetch https://www.indiehackers.com/products
  // 2. Parse HTML for products with revenue data
  // 3. Extract product details and founder info
  // 4. Check product pages for vibecoding mentions
  
  return [];
}

/**
 * Process an Indie Hackers product and create/update founder + claim
 */
export async function processIndieHackersProduct(
  product: IndieHackersProduct,
  db: any, // Drizzle DB instance
  schema: any // Schema exports
): Promise<{ founderId: string; claimId: string } | null> {
  if (!product.revenue) {
    return null; // Skip products without revenue
  }
  
  // Parse MRR claim
  const parsedClaim = parseMRRClaim(product.revenue);
  if (!parsedClaim || !parsedClaim.mrr) {
    return null;
  }
  
  // Check description for vibecoding mentions
  const description = product.description || "";
  const toolsUsed = extractVibecodingTools(description);
  const vibecodedPercent = extractVibecodingPercent(description);
  
  // Skip if no vibecoding tools mentioned
  if (toolsUsed.length === 0) {
    return null;
  }
  
  const { eq } = await import("drizzle-orm");
  
  // Check if founder/product already exists
  const existingFounder = await db
    .select()
    .from(schema.founders)
    .where(eq(schema.founders.productUrl, product.url))
    .limit(1)
    .then((rows: any[]) => rows[0]);
  
  const now = Date.now();
  const { ulid } = await import("ulid");
  
  let founderId: string;
  
  if (existingFounder) {
    founderId = existingFounder.id;
    // Update founder info
    await db.update(schema.founders)
      .set({
        name: product.founderName,
        vibecodedClaim: description,
        vibecodedSource: product.url,
        vibecodedPercent: vibecodedPercent || existingFounder.vibecodedPercent,
        toolsUsed: JSON.stringify(toolsUsed),
        updatedAt: new Date(now),
      })
      .where(schema.founders.id.eq(founderId));
  } else {
    // Create new founder
    founderId = ulid();
    await db.insert(schema.founders).values({
      id: founderId,
      name: product.founderName,
      productName: product.name,
      productUrl: product.url,
      category: product.category || null,
      vibecodedClaim: description,
      vibecodedSource: product.url,
      vibecodedPercent: vibecodedPercent || null,
      toolsUsed: JSON.stringify(toolsUsed),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
  }
  
  const { and } = await import("drizzle-orm");
  
  // Check if claim already exists (same MRR, same date)
  const existingClaim = await db
    .select()
    .from(schema.mrrClaims)
    .where(
      and(
        eq(schema.mrrClaims.founderId, founderId),
        eq(schema.mrrClaims.mrr, parsedClaim.mrr)
      )
    )
    .limit(1)
    .then((rows: any[]) => rows[0]);
  
  if (existingClaim) {
    return { founderId, claimId: existingClaim.id };
  }
  
  // Create new claim
  const claimId = ulid();
  const { calculateInitialConfidence } = await import("./confidence-scorer");
  const confidence = calculateInitialConfidence("indie_hackers", false, false, 1);
  
  await db.insert(schema.mrrClaims).values({
    id: claimId,
    founderId,
    mrr: parsedClaim.mrr,
    arr: parsedClaim.arr || null,
    claimDate: new Date(now),
    confidence,
    confidenceReason: "Indie Hackers product page",
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
    sourceType: "indie_hackers",
    sourceUrl: product.url,
    sourceDate: new Date(now),
    rawText: product.revenue,
    createdAt: new Date(now),
  });
  
  return { founderId, claimId };
}

