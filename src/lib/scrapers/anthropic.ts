import * as cheerio from "cheerio";
import { NormalizedUpdate, categorizeUpdate } from "./types";
import { htmlToText, parseDate } from "../scrape/utils";

const ANTHROPIC_CHANGELOG_URL = "https://docs.anthropic.com/en/release-notes/overview";
const ANTHROPIC_API_CHANGELOG = "https://docs.anthropic.com/en/api/release-notes";

export async function scrapeAnthropic(): Promise<NormalizedUpdate[]> {
  const updates: NormalizedUpdate[] = [];

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
          const contentHtml = $el.find("p, ul").html() || "";
          const contentText = htmlToText(contentHtml) || $el.find("p, ul").text().trim();
          const dateText =
            $el.find("time, .date, [datetime]").attr("datetime") ||
            $el.find("time, .date, span").first().text().trim();

          if (title && title.length > 5) {
            updates.push({
              provider: "anthropic",
              title: title.slice(0, 200),
              url: ANTHROPIC_CHANGELOG_URL,
              contentHtml: contentHtml.slice(0, 10000),
              contentText: contentText.slice(0, 2000) || title,
              category: categorizeUpdate(title, contentText),
              publishedAt: parseDate(dateText),
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
          const contentHtml = $header.nextUntil("h2, h3").html() || "";
          const contentText = htmlToText(contentHtml) || $header.nextUntil("h2, h3").text().trim();

          if (title && title.length > 5 && !title.toLowerCase().includes("overview")) {
            updates.push({
              provider: "anthropic",
              title: title.slice(0, 200),
              url: ANTHROPIC_CHANGELOG_URL,
              contentHtml: contentHtml.slice(0, 10000),
              contentText: contentText.slice(0, 2000) || title,
              category: categorizeUpdate(title, contentText),
              publishedAt: parseDate(undefined),
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
        const contentHtml = $header.nextUntil("h2, h3").html() || "";
        const contentText = htmlToText(contentHtml) || $header.nextUntil("h2, h3").text().trim();

        // Check if it looks like a date (API changelog format)
        if (title.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/) || title.match(/\w+ \d+, \d{4}/)) {
          updates.push({
            provider: "anthropic",
            title: `API Update: ${title}`,
            url: ANTHROPIC_API_CHANGELOG,
            contentHtml: contentHtml.slice(0, 10000),
            contentText: contentText.slice(0, 2000) || "API changelog update",
            category: "api_update",
            publishedAt: parseDate(title),
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

