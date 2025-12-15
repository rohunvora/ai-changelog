import * as cheerio from "cheerio";
import { NormalizedUpdate, categorizeUpdate } from "./types";
import { htmlToText, parseDate } from "../scrape/utils";

const OPENAI_CHANGELOG_URL = "https://platform.openai.com/docs/changelog";

export async function scrapeOpenAI(): Promise<NormalizedUpdate[]> {
  const updates: NormalizedUpdate[] = [];

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
        const contentHtml = $el.find("p, .description").html() || "";
        const contentText = htmlToText(contentHtml) || $el.find("p, .description").text().trim();
        const dateText =
          $el.find("time, .date, [datetime]").attr("datetime") ||
          $el.find("time, .date").text().trim();

        if (title && contentText) {
          updates.push({
            provider: "openai",
            title: title.slice(0, 200),
            url: OPENAI_CHANGELOG_URL,
            contentHtml: contentHtml.slice(0, 10000),
            contentText: contentText.slice(0, 2000),
            category: categorizeUpdate(title, contentText),
            publishedAt: parseDate(dateText),
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
          const itemHtml = $(item).html() || "";
          if (text.length > 20) {
            updates.push({
              provider: "openai",
              title: text.slice(0, 150),
              url: OPENAI_CHANGELOG_URL,
              contentHtml: itemHtml,
              contentText: text,
              category: categorizeUpdate(text, text),
              publishedAt: parseDate(dateHeader),
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

