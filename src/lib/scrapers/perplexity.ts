import * as cheerio from "cheerio";
import { ScrapedUpdate, categorizeUpdate } from "./types";

const PERPLEXITY_DOCS_URL = "https://docs.perplexity.ai/changelog";
const PERPLEXITY_BLOG_URL = "https://www.perplexity.ai/hub";

export async function scrapePerplexity(): Promise<ScrapedUpdate[]> {
  const updates: ScrapedUpdate[] = [];

  try {
    // Try the docs changelog
    const response = await fetch(PERPLEXITY_DOCS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      // Look for changelog entries - typically date headers with content
      $("h1, h2, h3").each((_, header) => {
        const $header = $(header);
        const headerText = $header.text().trim();

        // Check if it's a date header
        if (
          headerText.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/) ||
          headerText.match(/\w+ \d+, \d{4}/) ||
          headerText.match(/\w+ \d{4}/)
        ) {
          const $content = $header.nextUntil("h1, h2, h3");
          const items: string[] = [];

          $content.find("li").each((_, li) => {
            items.push($(li).text().trim());
          });

          $content.filter("p").each((_, p) => {
            const text = $(p).text().trim();
            if (text.length > 20) {
              items.push(text);
            }
          });

          if (items.length === 0) {
            items.push($content.text().trim());
          }

          items.forEach((item, index) => {
            if (item.length > 10) {
              updates.push({
                provider: "perplexity",
                title: item.slice(0, 200),
                content: item,
                url: PERPLEXITY_DOCS_URL,
                category: categorizeUpdate(item, item),
                publishedAt: headerText,
                externalId: `perplexity-${headerText}-${index}`,
              });
            }
          });
        }
      });

      // Alternative: look for article/card structure
      if (updates.length === 0) {
        $("article, [class*='changelog'], [class*='release']").each(
          (_, element) => {
            const $el = $(element);
            const title = $el.find("h2, h3, h4, strong").first().text().trim();
            const content = $el.find("p").text().trim();
            const dateText = $el.find("time, [class*='date']").text().trim();

            if (title && title.length > 5) {
              updates.push({
                provider: "perplexity",
                title: title.slice(0, 200),
                content: content.slice(0, 2000) || title,
                url: PERPLEXITY_DOCS_URL,
                category: categorizeUpdate(title, content),
                publishedAt: dateText || new Date().toISOString(),
                externalId: `perplexity-${Buffer.from(title).toString("base64").slice(0, 20)}`,
              });
            }
          }
        );
      }
    }

    // Also try the blog/hub for announcements
    const blogResponse = await fetch(PERPLEXITY_BLOG_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (blogResponse.ok) {
      const html = await blogResponse.text();
      const $ = cheerio.load(html);

      $("article, [class*='post'], [class*='card']").each((_, element) => {
        const $el = $(element);
        const title = $el.find("h2, h3, [class*='title']").first().text().trim();
        const content = $el.find("p, [class*='excerpt']").text().trim();
        const link = $el.find("a").first().attr("href");

        if (title && title.length > 5 && !updates.find((u) => u.title === title)) {
          updates.push({
            provider: "perplexity",
            title: title.slice(0, 200),
            content: content.slice(0, 2000) || title,
            url: link?.startsWith("http") ? link : `https://www.perplexity.ai${link || ""}`,
            category: categorizeUpdate(title, content),
            publishedAt: new Date().toISOString(),
            externalId: `perplexity-blog-${Buffer.from(title).toString("base64").slice(0, 20)}`,
          });
        }
      });
    }
  } catch (error) {
    console.error("Perplexity scraper error:", error);
  }

  return updates.slice(0, 20);
}

