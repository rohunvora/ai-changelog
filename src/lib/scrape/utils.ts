import { createHash } from "crypto";
import TurndownService from "turndown";

// Initialize Turndown for HTML to Markdown conversion
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

/**
 * Compute a SHA256 hash of the meaningful content fields.
 * Used to detect when an update's content has changed.
 */
export function computeHash(
  title: string,
  url: string,
  publishedAt: number,
  contentText: string
): string {
  const data = `${title}|${url}|${publishedAt}|${contentText.slice(0, 2000)}`;
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Strip HTML tags to get plain text for search indexing.
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  
  return html
    // Remove script and style tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Replace common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Add newlines for block elements
    .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, "\n")
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convert HTML to Markdown for rendering.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  
  try {
    return turndown.turndown(html);
  } catch {
    // Fallback to plain text if turndown fails
    return htmlToText(html);
  }
}

/**
 * Parse a date string to timestamp (ms).
 * Returns current time if parsing fails.
 */
export function parseDate(dateStr: string | undefined): number {
  if (!dateStr) return Date.now();
  
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
}

/**
 * Truncate text to a maximum length, preserving word boundaries.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + "...";
  }
  
  return truncated + "...";
}

