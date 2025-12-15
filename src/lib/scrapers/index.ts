import { scrapeOpenAI } from "./openai";
import { scrapeAnthropic } from "./anthropic";
import { scrapeGoogle } from "./google";
import { scrapeXAI } from "./xai";
import { scrapePerplexity } from "./perplexity";
import { scrapeCohere } from "./cohere";
import { ScrapedUpdate, ProviderKey } from "./types";

export * from "./types";

export const scrapers: Record<ProviderKey, () => Promise<ScrapedUpdate[]>> = {
  openai: scrapeOpenAI,
  anthropic: scrapeAnthropic,
  google: scrapeGoogle,
  xai: scrapeXAI,
  perplexity: scrapePerplexity,
  cohere: scrapeCohere,
};

export async function scrapeAll(): Promise<ScrapedUpdate[]> {
  const results = await Promise.allSettled(
    Object.values(scrapers).map((scraper) => scraper())
  );

  const allUpdates: ScrapedUpdate[] = [];

  results.forEach((result, index) => {
    const providerName = Object.keys(scrapers)[index];
    if (result.status === "fulfilled") {
      console.log(`${providerName}: Found ${result.value.length} updates`);
      allUpdates.push(...result.value);
    } else {
      console.error(`${providerName}: Failed -`, result.reason);
    }
  });

  // Sort by date, most recent first
  allUpdates.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime() || 0;
    const dateB = new Date(b.publishedAt).getTime() || 0;
    return dateB - dateA;
  });

  return allUpdates;
}

export async function scrapeProvider(
  provider: ProviderKey
): Promise<ScrapedUpdate[]> {
  const scraper = scrapers[provider];
  if (!scraper) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return scraper();
}

