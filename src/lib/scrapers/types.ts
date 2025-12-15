export interface ScrapedUpdate {
  provider: string;
  title: string;
  content: string;
  url: string;
  category?: string;
  publishedAt: string;
  externalId?: string;
}

export interface Scraper {
  name: string;
  provider: string;
  scrape(): Promise<ScrapedUpdate[]>;
}

export const PROVIDERS = {
  openai: { name: "OpenAI", color: "#10A37F" },
  anthropic: { name: "Anthropic", color: "#D4A574" },
  google: { name: "Google", color: "#4285F4" },
  xai: { name: "xAI", color: "#000000" },
  perplexity: { name: "Perplexity", color: "#20808D" },
  cohere: { name: "Cohere", color: "#39594D" },
} as const;

export type ProviderKey = keyof typeof PROVIDERS;

export const CATEGORIES = {
  new_model: { name: "New Model", color: "#8B5CF6" },
  api_update: { name: "API Update", color: "#3B82F6" },
  feature: { name: "New Feature", color: "#10B981" },
  pricing: { name: "Pricing", color: "#F59E0B" },
  deprecation: { name: "Deprecation", color: "#EF4444" },
  sdk: { name: "SDK Update", color: "#6366F1" },
  docs: { name: "Documentation", color: "#6B7280" },
  other: { name: "Other", color: "#9CA3AF" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

// Helper to categorize updates based on keywords
export function categorizeUpdate(title: string, content: string): CategoryKey {
  const text = `${title} ${content}`.toLowerCase();

  if (
    text.includes("new model") ||
    text.includes("introducing") ||
    text.includes("launch") ||
    text.includes("gpt-") ||
    text.includes("claude") ||
    text.includes("gemini")
  ) {
    return "new_model";
  }
  if (text.includes("api") || text.includes("endpoint")) {
    return "api_update";
  }
  if (text.includes("sdk") || text.includes("library") || text.includes("package")) {
    return "sdk";
  }
  if (text.includes("price") || text.includes("pricing") || text.includes("cost")) {
    return "pricing";
  }
  if (
    text.includes("deprecat") ||
    text.includes("sunset") ||
    text.includes("remove") ||
    text.includes("end of life")
  ) {
    return "deprecation";
  }
  if (text.includes("feature") || text.includes("capability") || text.includes("support")) {
    return "feature";
  }
  if (text.includes("doc") || text.includes("guide") || text.includes("tutorial")) {
    return "docs";
  }

  return "other";
}

