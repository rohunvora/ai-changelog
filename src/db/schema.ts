import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const updates = sqliteTable("updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull(), // openai, anthropic, google, xai, perplexity, cohere
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"), // AI-generated summary
  url: text("url").notNull(),
  category: text("category"), // new_model, api_update, pricing, deprecation, feature, etc.
  publishedAt: text("published_at").notNull(),
  scrapedAt: text("scraped_at").notNull(),
  externalId: text("external_id"), // To prevent duplicates
});

export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  updateId: integer("update_id")
    .notNull()
    .references(() => updates.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  complexity: text("complexity"), // low, medium, high
  potentialImpact: text("potential_impact"), // low, medium, high
  techStack: text("tech_stack"), // suggested technologies
  saved: integer("saved", { mode: "boolean" }).default(false),
  generatedAt: text("generated_at").notNull(),
});

export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;

