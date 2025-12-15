import * as cheerio from "cheerio";
import { NormalizedUpdate, categorizeUpdate } from "./types";
import { htmlToText, parseDate } from "../scrape/utils";

const COHERE_CHANGELOG_URL = "https://docs.cohere.com/changelog";
const COHERE_BLOG_URL = "https://cohere.com/blog";

export async function scrapeCohere(): Promise<NormalizedUpdate[]> {
  const updates: NormalizedUpdate[] = [];

  try {
    // Try the docs changelog
    const response = await fetch(COHERE_CHANGELOG_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      // Look for changelog entries
      $("h2, h3").each((_, header) => {
        const $header = $(header);
        const headerText = $header.text().trim();

        // Check if it looks like a version or date
        if (
          headerText.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/) ||
          headerText.match(/v\d+\.\d+/) ||
          headerText.match(/\w+ \d+, \d{4}/)
        ) {
          const $content = $header.nextUntil("h2, h3");
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
            const allContent = $content.text().trim();
            const allHtml = $content.html() || "";
            if (allContent.length > 10) {
              items.push({ text: allContent, html: allHtml });
            }
          }

          items.forEach((item, index) => {
            if (item.text.length > 10) {
              updates.push({
                provider: "cohere",
                title: item.text.slice(0, 200),
                url: COHERE_CHANGELOG_URL,
                contentHtml: item.html,
                contentText: item.text,
                category: categorizeUpdate(item.text, item.text),
                publishedAt: parseDate(headerText),
                externalId: `cohere-${headerText}-${index}`,
              });
            }
          });
        }
      });

      // Alternative structure
      if (updates.length === 0) {
        $("[class*='changelog'], [class*='release'], article").each(
          (_, element) => {
            const $el = $(element);
            const title = $el.find("h3, h4, strong").first().text().trim();
            const contentHtml = $el.find("p, ul").html() || "";
            const contentText = htmlToText(contentHtml) || $el.find("p, ul").text().trim();
            const dateText = $el.find("time, [class*='date']").text().trim();

            if (title && title.length > 5) {
              updates.push({
                provider: "cohere",
                title: title.slice(0, 200),
                url: COHERE_CHANGELOG_URL,
                contentHtml: contentHtml.slice(0, 10000),
                contentText: contentText.slice(0, 2000) || title,
                category: categorizeUpdate(title, contentText),
                publishedAt: parseDate(dateText),
                externalId: `cohere-${Buffer.from(title).toString("base64").slice(0, 20)}`,
              });
            }
          }
        );
      }
    }

    // Also check the blog
    const blogResponse = await fetch(COHERE_BLOG_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (blogResponse.ok) {
      const html = await blogResponse.text();
      const $ = cheerio.load(html);

      $("article, [class*='post'], [class*='blog-card'], a[href*='/blog/']").each(
        (_, element) => {
          const $el = $(element);
          const title = $el.find("h2, h3, [class*='title']").first().text().trim();
          const contentHtml = $el.find("p, [class*='excerpt']").html() || "";
          const contentText = htmlToText(contentHtml) || $el.find("p, [class*='excerpt']").text().trim();
          const link = $el.attr("href") || $el.find("a").first().attr("href");
          const dateText = $el.find("time, [class*='date']").text().trim();

          if (title && title.length > 5 && !updates.find((u) => u.title === title)) {
            const fullUrl = link?.startsWith("http")
              ? link
              : `https://cohere.com${link}`;
            updates.push({
              provider: "cohere",
              title: title.slice(0, 200),
              url: fullUrl || COHERE_BLOG_URL,
              contentHtml: contentHtml.slice(0, 10000),
              contentText: contentText.slice(0, 2000) || title,
              category: categorizeUpdate(title, contentText),
              publishedAt: parseDate(dateText),
              externalId: `cohere-blog-${Buffer.from(title).toString("base64").slice(0, 20)}`,
            });
          }
        }
      );
    }
  } catch (error) {
    console.error("Cohere scraper error:", error);
  }

  return updates.slice(0, 20);
}

