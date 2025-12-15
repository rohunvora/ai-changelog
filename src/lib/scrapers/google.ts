import * as cheerio from "cheerio";
import { NormalizedUpdate, categorizeUpdate } from "./types";
import { htmlToText, parseDate } from "../scrape/utils";

const GOOGLE_AI_CHANGELOG = "https://ai.google.dev/gemini-api/docs/changelog";

export async function scrapeGoogle(): Promise<NormalizedUpdate[]> {
  const updates: NormalizedUpdate[] = [];

  try {
    const response = await fetch(GOOGLE_AI_CHANGELOG, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Google scraper failed: ${response.status}`);
      return updates;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Google changelog typically has date headers with bullet points
    $("h2, h3").each((_, header) => {
      const $header = $(header);
      const dateText = $header.text().trim();

      // Look for date patterns
      if (
        dateText.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/) ||
        dateText.match(/\w+ \d+, \d{4}/) ||
        dateText.match(/\d{1,2} \w+ \d{4}/)
      ) {
        const $content = $header.nextUntil("h2, h3");
        const items: Array<{ text: string; html: string }> = [];

        $content.find("li").each((_, li) => {
          items.push({ text: $(li).text().trim(), html: $(li).html() || "" });
        });

        // Also get paragraph content
        $content.filter("p").each((_, p) => {
          const text = $(p).text().trim();
          if (text.length > 20) {
            items.push({ text, html: $(p).html() || "" });
          }
        });

        items.forEach((item, index) => {
          if (item.text.length > 10) {
            updates.push({
              provider: "google",
              title: item.text.slice(0, 200),
              url: GOOGLE_AI_CHANGELOG,
              contentHtml: item.html,
              contentText: item.text,
              category: categorizeUpdate(item.text, item.text),
              publishedAt: parseDate(dateText),
              externalId: `google-${dateText}-${index}`,
            });
          }
        });
      }
    });

    // Alternative structure: article or section based
    if (updates.length === 0) {
      $("article, section, .devsite-article-body").each((_, element) => {
        const $el = $(element);
        $el.find("h3, h4, strong").each((_, header) => {
          const title = $(header).text().trim();
          const contentHtml = $(header).parent().html() || "";
          const contentText = htmlToText(contentHtml) || $(header).parent().text().trim();

          if (title.length > 10 && contentText.length > 20) {
            updates.push({
              provider: "google",
              title: title.slice(0, 200),
              url: GOOGLE_AI_CHANGELOG,
              contentHtml: contentHtml.slice(0, 10000),
              contentText: contentText.slice(0, 2000),
              category: categorizeUpdate(title, contentText),
              publishedAt: parseDate(undefined),
              externalId: `google-${Buffer.from(title).toString("base64").slice(0, 20)}`,
            });
          }
        });
      });
    }
  } catch (error) {
    console.error("Google scraper error:", error);
  }

  return updates.slice(0, 20);
}

