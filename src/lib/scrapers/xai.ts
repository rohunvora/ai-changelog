import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { ScrapedUpdate, categorizeUpdate } from "./types";

const XAI_BLOG_URL = "https://x.ai/blog";
const XAI_DOCS_URL = "https://docs.x.ai/changelog";

export async function scrapeXAI(): Promise<ScrapedUpdate[]> {
  const updates: ScrapedUpdate[] = [];
  const parser = new Parser();

  try {
    // Try RSS feed first
    try {
      const feed = await parser.parseURL("https://x.ai/blog/rss");
      feed.items?.forEach((item) => {
        if (item.title && item.link) {
          updates.push({
            provider: "xai",
            title: item.title.slice(0, 200),
            content: item.contentSnippet?.slice(0, 2000) || item.content?.slice(0, 2000) || item.title,
            url: item.link,
            category: categorizeUpdate(item.title, item.contentSnippet || ""),
            publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
            externalId: `xai-${item.guid || item.link}`,
          });
        }
      });
    } catch {
      console.log("xAI RSS not available, falling back to scraping");
    }

    // Fallback to web scraping
    if (updates.length === 0) {
      const response = await fetch(XAI_BLOG_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        // Look for blog post cards/articles
        $("article, [class*='post'], [class*='blog'], a[href*='/blog/']").each(
          (_, element) => {
            const $el = $(element);
            const title =
              $el.find("h2, h3, h4, [class*='title']").first().text().trim() ||
              $el.attr("title");
            const content = $el.find("p, [class*='excerpt'], [class*='description']").text().trim();
            const link = $el.attr("href") || $el.find("a").first().attr("href");
            const dateText = $el.find("time, [class*='date']").text().trim();

            if (title && title.length > 5) {
              const fullUrl = link?.startsWith("http")
                ? link
                : `https://x.ai${link}`;
              updates.push({
                provider: "xai",
                title: title.slice(0, 200),
                content: content.slice(0, 2000) || title,
                url: fullUrl || XAI_BLOG_URL,
                category: categorizeUpdate(title, content),
                publishedAt: dateText || new Date().toISOString(),
                externalId: `xai-${Buffer.from(title).toString("base64").slice(0, 20)}`,
              });
            }
          }
        );
      }
    }

    // Also try the docs changelog
    try {
      const docsResponse = await fetch(XAI_DOCS_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (docsResponse.ok) {
        const html = await docsResponse.text();
        const $ = cheerio.load(html);

        $("h2, h3").each((_, header) => {
          const $header = $(header);
          const title = $header.text().trim();
          const content = $header.nextUntil("h2, h3").text().trim();

          if (title.match(/\d{4}/) || title.match(/v\d/i)) {
            updates.push({
              provider: "xai",
              title: `API: ${title}`.slice(0, 200),
              content: content.slice(0, 2000) || title,
              url: XAI_DOCS_URL,
              category: "api_update",
              publishedAt: title,
              externalId: `xai-docs-${Buffer.from(title).toString("base64").slice(0, 20)}`,
            });
          }
        });
      }
    } catch {
      console.log("xAI docs changelog not accessible");
    }
  } catch (error) {
    console.error("xAI scraper error:", error);
  }

  return updates.slice(0, 20);
}

