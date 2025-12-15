/**
 * Confidence scoring for MRR claims
 * Scores claims based on verification quality and source reliability
 */

import type { MRRClaim, ClaimSource } from "@/db/schema";

export type Confidence = "high" | "medium" | "low";

export interface ConfidenceResult {
  level: Confidence;
  reason: string;
  score: number; // 0-100
}

/**
 * Score confidence for an MRR claim based on its sources and verification flags
 */
export function scoreConfidence(
  claim: MRRClaim,
  sources: ClaimSource[]
): ConfidenceResult {
  let score = 0;
  const reasons: string[] = [];
  
  // HIGH confidence factors (70-100)
  if (claim.isStripeVerified) {
    score += 40;
    reasons.push("Stripe verified");
  }
  
  if (claim.isOpenStartup) {
    score += 35;
    reasons.push("Open startup dashboard");
  }
  
  if (claim.hasMultipleSources && sources.length >= 3) {
    score += 25;
    reasons.push(`${sources.length} corroborating sources`);
  }
  
  // MEDIUM confidence factors (40-69)
  if (sources.length >= 2 && !claim.hasMultipleSources) {
    score += 15;
    reasons.push(`${sources.length} sources`);
  }
  
  // Check for interview sources (usually detailed)
  const hasInterview = sources.some(s => s.sourceType === "interview");
  if (hasInterview) {
    score += 20;
    reasons.push("Detailed interview source");
  }
  
  // Check for consistent source types
  const sourceTypes = new Set(sources.map(s => s.sourceType));
  if (sourceTypes.size >= 2) {
    score += 10;
    reasons.push("Multiple source types");
  }
  
  // LOW confidence factors (0-39)
  // Single source is a red flag unless it's verified
  if (sources.length === 1 && !claim.isStripeVerified && !claim.isOpenStartup) {
    score = Math.min(score, 30);
    reasons.push("Single unverified source");
  }
  
  // Twitter-only sources are less reliable
  const onlyTwitter = sources.every(s => s.sourceType === "twitter");
  if (onlyTwitter && sources.length < 3) {
    score = Math.min(score, 35);
    reasons.push("Twitter-only sources");
  }
  
  // Manual submissions without verification
  const onlyManual = sources.every(s => s.sourceType === "manual");
  if (onlyManual && !claim.isStripeVerified) {
    score = Math.min(score, 25);
    reasons.push("Unverified manual submission");
  }
  
  // Determine level
  let level: Confidence;
  if (score >= 70) {
    level = "high";
  } else if (score >= 40) {
    level = "medium";
  } else {
    level = "low";
  }
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));
  
  return {
    level,
    reason: reasons.length > 0 ? reasons.join(", ") : "No verification factors",
    score,
  };
}

/**
 * Check if a claim should be flagged for review
 */
export function shouldFlagForReview(claim: MRRClaim, sources: ClaimSource[]): boolean {
  // Flag if confidence is low
  const result = scoreConfidence(claim, sources);
  if (result.level === "low") {
    return true;
  }
  
  // Flag if only manual submission
  const onlyManual = sources.every(s => s.sourceType === "manual");
  if (onlyManual) {
    return true;
  }
  
  // Flag if no sources
  if (sources.length === 0) {
    return true;
  }
  
  return false;
}

/**
 * Calculate confidence for a new claim before insertion
 * This is used during scraping to determine initial confidence
 */
export function calculateInitialConfidence(
  sourceType: ClaimSource["sourceType"],
  isStripeVerified: boolean,
  isOpenStartup: boolean,
  sourceCount: number
): Confidence {
  if (isStripeVerified || isOpenStartup) {
    return "high";
  }
  
  if (sourceType === "open_startup") {
    return "high";
  }
  
  if (sourceType === "interview" && sourceCount >= 1) {
    return "medium";
  }
  
  if (sourceType === "indie_hackers" && sourceCount >= 1) {
    return "medium";
  }
  
  if (sourceType === "twitter" && sourceCount >= 3) {
    return "medium";
  }
  
  if (sourceType === "twitter" && sourceCount >= 1) {
    return "low";
  }
  
  if (sourceType === "manual") {
    return "low";
  }
  
  return "low";
}

