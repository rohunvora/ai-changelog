import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// Provider enum for type safety
export const providers = [
  "openai", "anthropic", "google", "xai", "perplexity", "cohere",
] as const;
export type Provider = typeof providers[number];

export const updates = sqliteTable("updates", {
  id: text("id").primaryKey(), // ULID
  provider: text("provider").notNull(), // openai, anthropic, google, xai, perplexity, cohere
  title: text("title").notNull(),
  url: text("url").notNull(),
  category: text("category"), // new_model, api_update, pricing, deprecation, feature, etc.
  
  // Content fields
  contentText: text("content_text").notNull(), // For search (stripped text)
  contentMd: text("content_md").notNull(), // For rendering (markdown)
  raw: text("raw").notNull().default(""), // Original HTML/JSON for re-processing
  
  // Change detection
  hash: text("hash").notNull(), // SHA256 of meaningful fields
  
  // Timestamps (ms since epoch)
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  scrapedAt: integer("scraped_at", { mode: "timestamp_ms" }).notNull(),
  
  // Legacy fields for backwards compatibility during migration
  externalId: text("external_id"), // Old dedup field
}, (t) => ({
  providerUrlUnique: uniqueIndex("updates_provider_url_idx").on(t.provider, t.url),
  publishedIdx: index("updates_published_idx").on(t.publishedAt),
  providerIdx: index("updates_provider_idx").on(t.provider),
}));

export const ideas = sqliteTable("ideas", {
  id: text("id").primaryKey(), // ULID
  updateId: text("update_id").notNull(), // References updates.id
  title: text("title").notNull(),
  description: text("description").notNull(),
  complexity: integer("complexity"), // 1-5 scale
  potentialImpact: integer("potential_impact"), // 1-5 scale
  techStack: text("tech_stack"), // suggested technologies
  model: text("model"), // Which model generated this
  generatedAt: integer("generated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  updateIdx: index("ideas_update_idx").on(t.updateId),
}));

// Per-user bookmarks (using anonymous ID for MVP)
export const ideaBookmarks = sqliteTable("idea_bookmarks", {
  anonId: text("anon_id").notNull(), // Cookie-based anonymous ID
  ideaId: text("idea_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  bookmarkUnique: uniqueIndex("bookmark_unique_idx").on(t.anonId, t.ideaId),
  anonIdx: index("bookmarks_anon_idx").on(t.anonId),
}));

// Lock table for idempotent cron jobs
export const locks = sqliteTable("locks", {
  name: text("name").primaryKey(),
  lockedAt: integer("locked_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type IdeaBookmark = typeof ideaBookmarks.$inferSelect;
export type NewIdeaBookmark = typeof ideaBookmarks.$inferInsert;

