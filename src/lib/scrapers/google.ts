import * as cheerio from "cheerio";
import { ScrapedUpdate, categorizeUpdate } from "./types";

const GOOGLE_AI_CHANGELOG = "https://ai.google.dev/gemini-api/docs/changelog";

export async function scrapeGoogle(): Promise<ScrapedUpdate[]> {
  const updates: ScrapedUpdate[] = [];

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
        const items: string[] = [];

        $content.find("li").each((_, li) => {
          items.push($(li).text().trim());
        });

        // Also get paragraph content
        $content.filter("p").each((_, p) => {
          const text = $(p).text().trim();
          if (text.length > 20) {
            items.push(text);
          }
        });

        items.forEach((item, index) => {
          if (item.length > 10) {
            updates.push({
              provider: "google",
              title: item.slice(0, 200),
              content: item,
              url: GOOGLE_AI_CHANGELOG,
              category: categorizeUpdate(item, item),
              publishedAt: dateText,
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
          const content = $(header).parent().text().trim();

          if (title.length > 10 && content.length > 20) {
            updates.push({
              provider: "google",
              title: title.slice(0, 200),
              content: content.slice(0, 2000),
              url: GOOGLE_AI_CHANGELOG,
              category: categorizeUpdate(title, content),
              publishedAt: new Date().toISOString(),
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

