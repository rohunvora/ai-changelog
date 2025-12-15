import * as cheerio from "cheerio";
import { ScrapedUpdate, categorizeUpdate } from "./types";

const ANTHROPIC_CHANGELOG_URL = "https://docs.anthropic.com/en/release-notes/overview";
const ANTHROPIC_API_CHANGELOG = "https://docs.anthropic.com/en/api/release-notes";

export async function scrapeAnthropic(): Promise<ScrapedUpdate[]> {
  const updates: ScrapedUpdate[] = [];

  try {
    // Try the main release notes page
    const response = await fetch(ANTHROPIC_CHANGELOG_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      // Look for release note entries
      $("article, section, .release-note, [class*='release']").each(
        (_, element) => {
          const $el = $(element);
          const title = $el.find("h2, h3, h4").first().text().trim();
          const content = $el.find("p, ul").text().trim();
          const dateText =
            $el.find("time, .date, [datetime]").attr("datetime") ||
            $el.find("time, .date, span").first().text().trim();

          if (title && title.length > 5) {
            updates.push({
              provider: "anthropic",
              title: title.slice(0, 200),
              content: content.slice(0, 2000) || title,
              url: ANTHROPIC_CHANGELOG_URL,
              category: categorizeUpdate(title, content),
              publishedAt: dateText || new Date().toISOString(),
              externalId: `anthropic-${Buffer.from(title).toString("base64").slice(0, 20)}`,
            });
          }
        }
      );

      // Try parsing headers as entries
      if (updates.length === 0) {
        $("h2, h3").each((_, header) => {
          const $header = $(header);
          const title = $header.text().trim();
          const content = $header.nextUntil("h2, h3").text().trim();

          if (title && title.length > 5 && !title.toLowerCase().includes("overview")) {
            updates.push({
              provider: "anthropic",
              title: title.slice(0, 200),
              content: content.slice(0, 2000) || title,
              url: ANTHROPIC_CHANGELOG_URL,
              category: categorizeUpdate(title, content),
              publishedAt: new Date().toISOString(),
              externalId: `anthropic-${Buffer.from(title).toString("base64").slice(0, 20)}`,
            });
          }
        });
      }
    }

    // Also try the API changelog
    const apiResponse = await fetch(ANTHROPIC_API_CHANGELOG, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (apiResponse.ok) {
      const html = await apiResponse.text();
      const $ = cheerio.load(html);

      $("h2, h3").each((_, header) => {
        const $header = $(header);
        const title = $header.text().trim();
        const content = $header.nextUntil("h2, h3").text().trim();

        // Check if it looks like a date (API changelog format)
        if (title.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/) || title.match(/\w+ \d+, \d{4}/)) {
          updates.push({
            provider: "anthropic",
            title: `API Update: ${title}`,
            content: content.slice(0, 2000) || "API changelog update",
            url: ANTHROPIC_API_CHANGELOG,
            category: "api_update",
            publishedAt: title,
            externalId: `anthropic-api-${Buffer.from(title).toString("base64").slice(0, 20)}`,
          });
        }
      });
    }
  } catch (error) {
    console.error("Anthropic scraper error:", error);
  }

  return updates.slice(0, 20);
}

