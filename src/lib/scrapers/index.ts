import { scrapeOpenAI } from "./openai";
import { scrapeAnthropic } from "./anthropic";
import { scrapeGoogle } from "./google";
import { scrapeXAI } from "./xai";
import { scrapePerplexity } from "./perplexity";
import { scrapeCohere } from "./cohere";
import { NormalizedUpdate, ProviderKey } from "./types";

export * from "./types";

export const scrapers: Record<ProviderKey, () => Promise<NormalizedUpdate[]>> = {
  openai: scrapeOpenAI,
  anthropic: scrapeAnthropic,
  google: scrapeGoogle,
  xai: scrapeXAI,
  perplexity: scrapePerplexity,
  cohere: scrapeCohere,
};

export async function scrapeAll(): Promise<NormalizedUpdate[]> {
  const results = await Promise.allSettled(
    Object.values(scrapers).map((scraper) => scraper())
  );

  const allUpdates: NormalizedUpdate[] = [];

  results.forEach((result, index) => {
    const providerName = Object.keys(scrapers)[index];
    if (result.status === "fulfilled") {
      console.log(`${providerName}: Found ${result.value.length} updates`);
      allUpdates.push(...result.value);
    } else {
      console.error(`${providerName}: Failed -`, result.reason);
    }
  });

  // Sort by date, most recent first (timestamps are now numbers)
  allUpdates.sort((a, b) => b.publishedAt - a.publishedAt);

  return allUpdates;
}

export async function scrapeProvider(
  provider: ProviderKey
): Promise<NormalizedUpdate[]> {
  const scraper = scrapers[provider];
  if (!scraper) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return scraper();
}

