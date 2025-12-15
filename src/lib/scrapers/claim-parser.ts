/**
 * Parse MRR/ARR claims from unstructured text
 * Handles common formats like "$10k MRR", "$10,000/month", "10k ARR"
 */

export interface ParsedClaim {
  mrr?: number; // Monthly recurring revenue in cents
  arr?: number; // Annual recurring revenue in cents
  currency: string; // "USD", "EUR", etc.
  timeframe?: string; // "month", "year", "monthly", "annually"
  rawText: string;
  confidence: number; // 0-1 based on parsing quality
}

/**
 * Parse MRR/ARR from text
 * Returns null if no valid claim found
 */
export function parseMRRClaim(text: string): ParsedClaim | null {
  const normalized = text.trim();
  
  // Common patterns:
  // "$10k MRR", "$10,000 MRR", "$10k/month", "$10k/mo"
  // "10k ARR", "$10k ARR", "$10k/year"
  // "MRR: $10k", "Monthly: $10k"
  
  // Extract currency (default to USD)
  const currencyMatch = text.match(/\$|USD|EUR|GBP|€|£/);
  const currency = currencyMatch ? (currencyMatch[0] === "$" ? "USD" : currencyMatch[0]) : "USD";
  
  // Patterns for MRR
  const mrrPatterns = [
    // "$10k MRR", "$10,000 MRR"
    /\$?\s*([\d,]+\.?\d*)\s*(k|K|thousand|M|million)?\s*(MRR|mrr)/i,
    // "$10k/month", "$10k/mo", "$10k per month"
    /\$?\s*([\d,]+\.?\d*)\s*(k|K|thousand|M|million)?\s*\/?\s*(month|mo|monthly)/i,
    // "MRR: $10k", "Monthly: $10k"
    /(?:MRR|mrr|monthly|month)\s*:?\s*\$?\s*([\d,]+\.?\d*)\s*(k|K|thousand|M|million)?/i,
  ];
  
  // Patterns for ARR
  const arrPatterns = [
    // "$10k ARR", "$10,000 ARR"
    /\$?\s*([\d,]+\.?\d*)\s*(k|K|thousand|M|million)?\s*(ARR|arr)/i,
    // "$10k/year", "$10k annually"
    /\$?\s*([\d,]+\.?\d*)\s*(k|K|thousand|M|million)?\s*\/?\s*(year|yr|annually|annual)/i,
    // "ARR: $10k", "Annual: $10k"
    /(?:ARR|arr|annual|annually|yearly)\s*:?\s*\$?\s*([\d,]+\.?\d*)\s*(k|K|thousand|M|million)?/i,
  ];
  
  let mrr: number | undefined;
  let arr: number | undefined;
  let timeframe: string | undefined;
  let confidence = 0.5; // Default confidence
  
  // Try MRR patterns first
  for (const pattern of mrrPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const amount = parseAmount(match[1], match[2]);
      if (amount > 0) {
        mrr = amount * 100; // Convert to cents
        timeframe = "month";
        confidence = 0.8; // High confidence for explicit MRR mentions
        break;
      }
    }
  }
  
  // Try ARR patterns
  if (!mrr) {
    for (const pattern of arrPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const amount = parseAmount(match[1], match[2]);
        if (amount > 0) {
          arr = amount * 100; // Convert to cents
          timeframe = "year";
          confidence = 0.8; // High confidence for explicit ARR mentions
          break;
        }
      }
    }
  }
  
  // If we found ARR but not MRR, calculate MRR
  if (arr && !mrr) {
    mrr = Math.round(arr / 12);
    confidence = 0.6; // Lower confidence for calculated values
  }
  
  // Reject ambiguous claims
  if (!mrr && !arr) {
    return null;
  }
  
  // Reject ranges (e.g., "$5k-$10k")
  if (normalized.match(/[\d,]+\s*[-–—]\s*[\d,]+/)) {
    return null;
  }
  
  // Reject projections (e.g., "targeting $10k", "aiming for")
  if (normalized.match(/(target|aim|goal|projected|projection|expect|hope|plan)/i)) {
    confidence *= 0.5; // Lower confidence but don't reject
  }
  
  return {
    mrr,
    arr,
    currency,
    timeframe,
    rawText: text,
    confidence,
  };
}

/**
 * Parse amount string with multiplier
 * "10" + "k" = 10000
 * "10" + "M" = 10000000
 */
function parseAmount(amountStr: string, multiplier?: string): number {
  const cleaned = amountStr.replace(/,/g, "");
  const base = parseFloat(cleaned);
  
  if (isNaN(base)) {
    return 0;
  }
  
  if (!multiplier) {
    return base;
  }
  
  const mult = multiplier.toLowerCase();
  if (mult === "k" || mult === "thousand") {
    return base * 1000;
  }
  if (mult === "m" || mult === "million") {
    return base * 1000000;
  }
  
  return base;
}

/**
 * Extract vibecoding claims from text
 * Returns array of tools mentioned
 */
export function extractVibecodingTools(text: string): string[] {
  const tools: string[] = [];
  const normalized = text.toLowerCase();
  
  // Common vibecoding tools
  const toolPatterns = [
    { name: "cursor", patterns: [/cursor/i, /cursor\.ai/i] },
    { name: "claude", patterns: [/claude/i, /anthropic/i] },
    { name: "copilot", patterns: [/copilot/i, /github copilot/i] },
    { name: "lovable", patterns: [/lovable/i, /lovable\.dev/i] },
    { name: "replit", patterns: [/replit/i] },
    { name: "bolt", patterns: [/bolt\.new/i, /bolt new/i] },
    { name: "v0", patterns: [/v0/i, /v0\.dev/i] },
    { name: "gpt", patterns: [/gpt-4/i, /gpt-3/i, /chatgpt/i] },
  ];
  
  for (const tool of toolPatterns) {
    for (const pattern of tool.patterns) {
      if (pattern.test(normalized)) {
        tools.push(tool.name);
        break;
      }
    }
  }
  
  return [...new Set(tools)]; // Deduplicate
}

/**
 * Extract vibecoding percentage if mentioned
 * Returns null if not found
 */
export function extractVibecodingPercent(text: string): number | null {
  // Patterns: "90% vibecoded", "built 80% with", "90 percent"
  const patterns = [
    /(\d+)%\s*(vibecoded|built|with|using|ai|ai-assisted)/i,
    /(vibecoded|built|with|using|ai|ai-assisted)\s*(\d+)%/i,
    /(\d+)\s*percent\s*(vibecoded|built|with|using|ai|ai-assisted)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const percent = parseInt(match[1] || match[2], 10);
      if (percent >= 0 && percent <= 100) {
        return percent;
      }
    }
  }
  
  return null;
}

