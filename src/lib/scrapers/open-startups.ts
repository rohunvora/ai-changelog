/**
 * Open Startup scraper
 * Scrapes public dashboards like Baremetrics, Plausible, etc.
 */

import { parseMRRClaim, extractVibecodingTools, extractVibecodingPercent } from "./claim-parser";

export interface OpenStartupData {
  name: string;
  url: string;
  dashboardUrl: string;
  mrr?: number; // In cents
  arr?: number; // In cents
  lastUpdated: Date;
  founderName?: string;
  productName?: string;
}

/**
 * Known open startup dashboards to scrape
 * Format: { name, dashboardUrl, parser }
 */
const OPEN_STARTUP_DASHBOARDS = [
  // Baremetrics public pages
  // Example: https://baremetrics.com/public/[company-id]
  {
    name: "Baremetrics",
    baseUrl: "https://baremetrics.com/public",
    // Would need to maintain a list of company IDs
  },
  // Plausible Analytics public stats
  // Example: https://plausible.io/[site-name]
  {
    name: "Plausible",
    baseUrl: "https://plausible.io",
  },
  // Individual founder dashboards (curated list)
  // These would be manually added
];

/**
 * Scrape a Baremetrics public dashboard
 */
export async function scrapeBaremetrics(dashboardUrl: string): Promise<OpenStartupData | null> {
  try {
    const response = await fetch(dashboardUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    
    // Parse HTML for MRR data
    // Baremetrics typically shows MRR in a specific format
    // This is a simplified parser - would need to be adjusted based on actual HTML structure
    const mrrMatch = html.match(/MRR[:\s]*\$?([\d,]+\.?\d*)\s*(k|K|M|million)?/i);
    
    if (!mrrMatch) {
      return null;
    }
    
    const amount = parseFloat(mrrMatch[1].replace(/,/g, ""));
    const multiplier = mrrMatch[2]?.toLowerCase();
    let mrr = amount;
    
    if (multiplier === "k" || multiplier === "thousand") {
      mrr = amount * 1000;
    } else if (multiplier === "m" || multiplier === "million") {
      mrr = amount * 1000000;
    }
    
    return {
      name: "Unknown", // Would extract from page
      url: dashboardUrl,
      dashboardUrl,
      mrr: Math.round(mrr * 100), // Convert to cents
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Error scraping Baremetrics:", error);
    return null;
  }
}

/**
 * Scrape a Plausible public stats page
 * Note: Plausible shows traffic, not revenue, so this might not be useful
 */
export async function scrapePlausible(siteUrl: string): Promise<OpenStartupData | null> {
  // Plausible doesn't show revenue, only traffic
  // Skip for now
  return null;
}

/**
 * Process an open startup entry and create/update founder + claim
 */
export async function processOpenStartup(
  data: OpenStartupData,
  db: any,
  schema: any,
  vibecodedClaim?: string,
  vibecodedSource?: string
): Promise<{ founderId: string; claimId: string } | null> {
  if (!data.mrr) {
    return null;
  }
  
  const now = Date.now();
  const { ulid } = await import("ulid");
  
  // Extract vibecoding info if provided
  const toolsUsed = vibecodedClaim ? extractVibecodingTools(vibecodedClaim) : [];
  const vibecodedPercent = vibecodedClaim ? extractVibecodingPercent(vibecodedClaim) : null;
  
  const { eq } = await import("drizzle-orm");
  
  // Check if founder/product already exists
  const existingFounder = await db
    .select()
    .from(schema.founders)
    .where(eq(schema.founders.productUrl, data.url))
    .limit(1)
    .then((rows: any[]) => rows[0]);
  
  let founderId: string;
  
  if (existingFounder) {
    founderId = existingFounder.id;
    // Update founder info
    await db.update(schema.founders)
      .set({
        name: data.founderName || existingFounder.name,
        productName: data.productName || existingFounder.productName,
        updatedAt: new Date(now),
      })
      .where(schema.founders.id.eq(founderId));
  } else {
    // Create new founder
    founderId = ulid();
    await db.insert(schema.founders).values({
      id: founderId,
      name: data.founderName || "Unknown",
      productName: data.productName || data.name,
      productUrl: data.url,
      vibecodedClaim: vibecodedClaim || null,
      vibecodedSource: vibecodedSource || null,
      vibecodedPercent: vibecodedPercent || null,
      toolsUsed: toolsUsed.length > 0 ? JSON.stringify(toolsUsed) : null,
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
        eq(schema.mrrClaims.mrr, data.mrr)
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
  const confidence = calculateInitialConfidence("open_startup", false, true, 1);
  
  await db.insert(schema.mrrClaims).values({
    id: claimId,
    founderId,
    mrr: data.mrr,
    arr: data.arr || null,
    claimDate: new Date(data.lastUpdated),
    confidence,
    confidenceReason: "Open startup dashboard",
    isStripeVerified: false,
    isOpenStartup: true, // This is the key flag
    hasMultipleSources: false,
    scrapedAt: new Date(now),
  });
  
  // Create source
  const sourceId = ulid();
  await db.insert(schema.claimSources).values({
    id: sourceId,
    claimId,
    sourceType: "open_startup",
    sourceUrl: data.dashboardUrl,
    sourceDate: new Date(data.lastUpdated),
    rawText: `MRR: $${(data.mrr / 100).toFixed(2)}`,
    createdAt: new Date(now),
  });
  
  return { founderId, claimId };
}

