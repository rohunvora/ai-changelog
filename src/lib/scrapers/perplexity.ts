import * as cheerio from "cheerio";
import { NormalizedUpdate, categorizeUpdate } from "./types";
import { htmlToText, parseDate } from "../scrape/utils";

const PERPLEXITY_DOCS_URL = "https://docs.perplexity.ai/changelog";
const PERPLEXITY_BLOG_URL = "https://www.perplexity.ai/hub";

export async function scrapePerplexity(): Promise<NormalizedUpdate[]> {
  const updates: NormalizedUpdate[] = [];

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
          const items: Array<{ text: string; html: string }> = [];

          $content.find("li").each((_, li) => {
            items.push({ text: $(li).text().trim(), html: $(li).html() || "" });
          });

          $content.filter("p").each((_, p) => {
            const text = $(p).text().trim();
            if (text.length > 20) {
              items.push({ text, html: $(p).html() || "" });
            }
          });

          if (items.length === 0) {
            const allHtml = $content.html() || "";
            items.push({ text: $content.text().trim(), html: allHtml });
          }

          items.forEach((item, index) => {
            if (item.text.length > 10) {
              updates.push({
                provider: "perplexity",
                title: item.text.slice(0, 200),
                url: PERPLEXITY_DOCS_URL,
                contentHtml: item.html,
                contentText: item.text,
                category: categorizeUpdate(item.text, item.text),
                publishedAt: parseDate(headerText),
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
            const contentHtml = $el.find("p").html() || "";
            const contentText = htmlToText(contentHtml) || $el.find("p").text().trim();
            const dateText = $el.find("time, [class*='date']").text().trim();

            if (title && title.length > 5) {
              updates.push({
                provider: "perplexity",
                title: title.slice(0, 200),
                url: PERPLEXITY_DOCS_URL,
                contentHtml: contentHtml.slice(0, 10000),
                contentText: contentText.slice(0, 2000) || title,
                category: categorizeUpdate(title, contentText),
                publishedAt: parseDate(dateText),
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
        const contentHtml = $el.find("p, [class*='excerpt']").html() || "";
        const contentText = htmlToText(contentHtml) || $el.find("p, [class*='excerpt']").text().trim();
        const link = $el.find("a").first().attr("href");

        if (title && title.length > 5 && !updates.find((u) => u.title === title)) {
          updates.push({
            provider: "perplexity",
            title: title.slice(0, 200),
            url: link?.startsWith("http") ? link : `https://www.perplexity.ai${link || ""}`,
            contentHtml: contentHtml.slice(0, 10000),
            contentText: contentText.slice(0, 2000) || title,
            category: categorizeUpdate(title, contentText),
            publishedAt: parseDate(undefined),
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

