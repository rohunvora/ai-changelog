/**
 * Twitter/X scraper for MRR claims
 * Uses free alternatives (Nitter instances, RSS) due to Twitter API costs
 */

import { parseMRRClaim, extractVibecodingTools, extractVibecodingPercent } from "./claim-parser";

export interface TwitterMRRClaim {
  tweetId?: string;
  author: string;
  authorHandle: string;
  text: string;
  url: string;
  date: Date;
  mrr?: number; // In cents
  arr?: number; // In cents
  vibecodedTools?: string[];
  vibecodedPercent?: number;
}

/**
 * Nitter instance URLs (free Twitter frontends)
 * These can go down, so we'll try multiple
 */
const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.it",
  "https://nitter.pussthecat.org",
  "https://nitter.privacydev.net",
];

/**
 * Search Twitter via Nitter RSS feed
 * Note: Nitter instances are unreliable and may be rate-limited
 */
export async function searchTwitterViaNitter(query: string): Promise<TwitterMRRClaim[]> {
  const claims: TwitterMRRClaim[] = [];
  
  // Try each Nitter instance until one works
  for (const instance of NITTER_INSTANCES) {
    try {
      // Nitter RSS format: /search/rss?f=tweets&q=[query]
      const rssUrl = `${instance}/search/rss?f=tweets&q=${encodeURIComponent(query)}`;
      
      const response = await fetch(rssUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });
      
      if (!response.ok) {
        continue; // Try next instance
      }
      
      const xml = await response.text();
      
      // Parse RSS XML
      // This is simplified - would need proper XML parsing
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      
      for (const item of items) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const authorMatch = item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/);
        
        if (!titleMatch || !linkMatch) {
          continue;
        }
        
        const text = titleMatch[1];
        const url = linkMatch[1];
        const date = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();
        const author = authorMatch ? authorMatch[1] : "Unknown";
        
        // Extract handle from URL or author
        const handleMatch = url.match(/twitter\.com\/([^\/]+)/) || 
                          author.match(/@?(\w+)/);
        const handle = handleMatch ? handleMatch[1] : "unknown";
        
        // Parse MRR claim
        const parsedClaim = parseMRRClaim(text);
        if (!parsedClaim || !parsedClaim.mrr) {
          continue; // Skip if no MRR found
        }
        
        // Extract vibecoding tools
        const tools = extractVibecodingTools(text);
        const percent = extractVibecodingPercent(text);
        
        claims.push({
          author,
          authorHandle: handle,
          text,
          url,
          date,
          mrr: parsedClaim.mrr,
          arr: parsedClaim.arr,
          vibecodedTools: tools,
          vibecodedPercent: percent || undefined,
        });
      }
      
      // If we got results, stop trying other instances
      if (claims.length > 0) {
        break;
      }
    } catch (error) {
      console.error(`Error searching Nitter instance ${instance}:`, error);
      continue; // Try next instance
    }
  }
  
  return claims;
}

/**
 * Search queries for finding vibecoded MRR claims
 */
export const TWITTER_SEARCH_QUERIES = [
  '"MRR" ("built with" OR "vibecoded" OR "cursor" OR "claude" OR "shipped in")',
  '"$" "month" ("solo" OR "indie" OR "bootstrapped") ("AI" OR "vibecoded")',
  '"ARR" ("AI" OR "no-code" OR "vibecoding")',
  '"revenue" ("cursor" OR "claude" OR "lovable" OR "replit")',
];

/**
 * Process a Twitter claim and create/update founder + claim
 */
export async function processTwitterClaim(
  claim: TwitterMRRClaim,
  db: any,
  schema: any
): Promise<{ founderId: string; claimId: string } | null> {
  if (!claim.mrr) {
    return null;
  }
  
  const now = Date.now();
  const { ulid } = await import("ulid");
  
  const { eq, or } = await import("drizzle-orm");
  
  // Check if founder already exists (by Twitter handle or product URL)
  const existingFounder = await db
    .select()
    .from(schema.founders)
    .where(
      or(
        eq(schema.founders.twitterHandle, `@${claim.authorHandle}`),
        eq(schema.founders.productUrl, claim.url)
      )
    )
    .limit(1)
    .then((rows: any[]) => rows[0]);
  
  let founderId: string;
  
  if (existingFounder) {
    founderId = existingFounder.id;
    // Update founder info
    await db.update(schema.founders)
      .set({
        name: claim.author,
        twitterHandle: `@${claim.authorHandle}`,
        vibecodedClaim: claim.text,
        vibecodedSource: claim.url,
        vibecodedPercent: claim.vibecodedPercent || existingFounder.vibecodedPercent,
        toolsUsed: claim.vibecodedTools && claim.vibecodedTools.length > 0
          ? JSON.stringify(claim.vibecodedTools)
          : existingFounder.toolsUsed,
        updatedAt: new Date(now),
      })
      .where(schema.founders.id.eq(founderId));
  } else {
    // Create new founder
    founderId = ulid();
    await db.insert(schema.founders).values({
      id: founderId,
      name: claim.author,
      twitterHandle: `@${claim.authorHandle}`,
      productName: "Unknown", // Would need to extract from tweet
      productUrl: claim.url,
      vibecodedClaim: claim.text,
      vibecodedSource: claim.url,
      vibecodedPercent: claim.vibecodedPercent || null,
      toolsUsed: claim.vibecodedTools && claim.vibecodedTools.length > 0
        ? JSON.stringify(claim.vibecodedTools)
        : null,
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
        eq(schema.mrrClaims.mrr, claim.mrr)
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
  
  // Check how many sources this founder already has
  const existingSources = await db
    .select()
    .from(schema.claimSources)
    .innerJoin(
      schema.mrrClaims,
      eq(schema.mrrClaims.id, schema.claimSources.claimId)
    )
    .where(eq(schema.mrrClaims.founderId, founderId))
    .then((rows: any[]) => rows.length);
  
  const confidence = calculateInitialConfidence("twitter", false, false, existingSources + 1);
  
  await db.insert(schema.mrrClaims).values({
    id: claimId,
    founderId,
    mrr: claim.mrr,
    arr: claim.arr || null,
    claimDate: new Date(claim.date),
    confidence,
    confidenceReason: "Twitter/X claim",
    isStripeVerified: false,
    isOpenStartup: false,
    hasMultipleSources: existingSources >= 2,
    scrapedAt: new Date(now),
  });
  
  // Create source
  const sourceId = ulid();
  await db.insert(schema.claimSources).values({
    id: sourceId,
    claimId,
    sourceType: "twitter",
    sourceUrl: claim.url,
    sourceDate: new Date(claim.date),
    rawText: claim.text,
    createdAt: new Date(now),
  });
  
  return { founderId, claimId };
}

