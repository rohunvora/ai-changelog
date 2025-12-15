import * as cheerio from "cheerio";
import { ScrapedUpdate, categorizeUpdate } from "./types";

const OPENAI_CHANGELOG_URL = "https://platform.openai.com/docs/changelog";

export async function scrapeOpenAI(): Promise<ScrapedUpdate[]> {
  const updates: ScrapedUpdate[] = [];

  try {
    const response = await fetch(OPENAI_CHANGELOG_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`OpenAI scraper failed: ${response.status}`);
      return updates;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // OpenAI changelog structure: entries with dates and descriptions
    // The structure may vary, so we try multiple selectors
    $("article, .changelog-entry, [data-testid='changelog-entry']").each(
      (_, element) => {
        const $el = $(element);
        const title =
          $el.find("h2, h3, .title").first().text().trim() ||
          $el.find("strong").first().text().trim();
        const content = $el.find("p, .description").text().trim();
        const dateText =
          $el.find("time, .date, [datetime]").attr("datetime") ||
          $el.find("time, .date").text().trim();

        if (title && content) {
          updates.push({
            provider: "openai",
            title: title.slice(0, 200),
            content: content.slice(0, 2000),
            url: OPENAI_CHANGELOG_URL,
            category: categorizeUpdate(title, content),
            publishedAt: dateText || new Date().toISOString(),
            externalId: `openai-${Buffer.from(title).toString("base64").slice(0, 20)}`,
          });
        }
      }
    );

    // Alternative: try parsing list items
    if (updates.length === 0) {
      $("section, .content-block").each((_, section) => {
        const $section = $(section);
        const dateHeader = $section.find("h2, h3").first().text().trim();

        $section.find("li, p").each((_, item) => {
          const text = $(item).text().trim();
          if (text.length > 20) {
            updates.push({
              provider: "openai",
              title: text.slice(0, 150),
              content: text,
              url: OPENAI_CHANGELOG_URL,
              category: categorizeUpdate(text, text),
              publishedAt: dateHeader || new Date().toISOString(),
              externalId: `openai-${Buffer.from(text).toString("base64").slice(0, 20)}`,
            });
          }
        });
      });
    }
  } catch (error) {
    console.error("OpenAI scraper error:", error);
  }

  return updates.slice(0, 20); // Limit to latest 20
}

