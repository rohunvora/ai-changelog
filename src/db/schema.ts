import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// Provider enum for type safety
export const providers = [
  "openai", "anthropic", "google", "xai", "perplexity", "cohere",
] as const;
export type Provider = typeof providers[number];

// Unlock type classification
export const unlockTypes = [
  "new_capability",  // Unlocks something that wasn't possible before
  "improvement",     // Better/faster/cheaper at existing capabilities
  "operational",     // Pricing, deprecations, SDK updates
] as const;
export type UnlockType = typeof unlockTypes[number];

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
  
  // Capability unlock classification
  unlockType: text("unlock_type").default("improvement"), // new_capability, improvement, operational
  capability: text("capability"), // What new capability this unlocks (for new_capability)
  enablesBuilding: text("enables_building"), // JSON array of app categories this enables
  
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
  unlockTypeIdx: index("updates_unlock_type_idx").on(t.unlockType),
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

// Founders/Products being tracked for vibecoded MRR
export const founders = sqliteTable("founders", {
  id: text("id").primaryKey(), // ULID
  name: text("name").notNull(),
  twitterHandle: text("twitter_handle"),
  productName: text("product_name").notNull(),
  productUrl: text("product_url"),
  category: text("category"), // "saas", "api", "mobile_app", etc.
  
  // Vibecoding verification
  vibecodedClaim: text("vibecoded_claim"), // Their exact words
  vibecodedSource: text("vibecoded_source"), // URL to claim
  vibecodedPercent: integer("vibecoded_percent"), // If they specified
  toolsUsed: text("tools_used"), // JSON array: ["cursor", "claude", "lovable"]
  
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  productUrlIdx: index("founders_product_url_idx").on(t.productUrl),
  twitterIdx: index("founders_twitter_idx").on(t.twitterHandle),
}));

// Individual MRR claims (track history)
export const mrrClaims = sqliteTable("mrr_claims", {
  id: text("id").primaryKey(),
  founderId: text("founder_id").notNull().references(() => founders.id),
  
  mrr: integer("mrr").notNull(), // In cents to avoid float issues
  arr: integer("arr"), // If explicitly stated
  claimDate: integer("claim_date", { mode: "timestamp_ms" }).notNull(),
  
  // Confidence scoring
  confidence: text("confidence", { enum: ["high", "medium", "low"] }).notNull(),
  confidenceReason: text("confidence_reason"), // Why this score
  
  // Verification flags
  isStripeVerified: integer("is_stripe_verified", { mode: "boolean" }).default(false),
  isOpenStartup: integer("is_open_startup", { mode: "boolean" }).default(false),
  hasMultipleSources: integer("has_multiple_sources", { mode: "boolean" }).default(false),
  
  scrapedAt: integer("scraped_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  founderIdx: index("mrr_claims_founder_idx").on(t.founderId),
  claimDateIdx: index("mrr_claims_date_idx").on(t.claimDate),
  confidenceIdx: index("mrr_claims_confidence_idx").on(t.confidence),
}));

// Sources for each claim (one claim can have multiple sources)
export const claimSources = sqliteTable("claim_sources", {
  id: text("id").primaryKey(),
  claimId: text("claim_id").notNull().references(() => mrrClaims.id),
  
  sourceType: text("source_type", { 
    enum: ["twitter", "indie_hackers", "open_startup", "interview", "manual"] 
  }).notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceDate: integer("source_date", { mode: "timestamp_ms" }),
  rawText: text("raw_text"), // Original text containing the claim
  
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  claimIdx: index("claim_sources_claim_idx").on(t.claimId),
  sourceTypeIdx: index("claim_sources_type_idx").on(t.sourceType),
}));

export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type IdeaBookmark = typeof ideaBookmarks.$inferSelect;
export type NewIdeaBookmark = typeof ideaBookmarks.$inferInsert;
export type Founder = typeof founders.$inferSelect;
export type NewFounder = typeof founders.$inferInsert;
export type MRRClaim = typeof mrrClaims.$inferSelect;
export type NewMRRClaim = typeof mrrClaims.$inferInsert;
export type ClaimSource = typeof claimSources.$inferSelect;
export type NewClaimSource = typeof claimSources.$inferInsert;

