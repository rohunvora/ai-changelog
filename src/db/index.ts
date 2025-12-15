import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { sql } from "drizzle-orm";

// Database URL configuration:
// - For Turso: use TURSO_DATABASE_URL (e.g., "libsql://your-db.turso.io")
// - For local: use "file:./data/changelog.db" or leave empty for in-memory
const getDatabaseUrl = () => {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  // Local development fallback
  if (process.env.NODE_ENV !== "production") {
    return "file:./data/changelog.db";
  }
  // In production without Turso, use in-memory (data won't persist between function calls)
  return ":memory:";
};

const client = createClient({
  url: getDatabaseUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export { schema };

// Track if we've initialized the database this session
let isInitialized = false;

/**
 * Initialize the database schema and seed data if needed.
 * Call this at the start of API routes.
 */
export async function ensureDb() {
  if (isInitialized) return;
  
  try {
    // Create tables if they don't exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS updates (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT,
        content_text TEXT NOT NULL,
        content_md TEXT NOT NULL,
        raw TEXT NOT NULL DEFAULT '',
        unlock_type TEXT DEFAULT 'improvement',
        capability TEXT,
        enables_building TEXT,
        hash TEXT NOT NULL,
        published_at INTEGER NOT NULL,
        scraped_at INTEGER NOT NULL,
        external_id TEXT
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS ideas (
        id TEXT PRIMARY KEY,
        update_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        complexity INTEGER,
        potential_impact INTEGER,
        tech_stack TEXT,
        model TEXT,
        generated_at INTEGER NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS idea_bookmarks (
        anon_id TEXT NOT NULL,
        idea_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS locks (
        name TEXT PRIMARY KEY,
        locked_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);
    
    // Leaderboard tables
    await client.execute(`
      CREATE TABLE IF NOT EXISTS founders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        twitter_handle TEXT,
        product_name TEXT NOT NULL,
        product_url TEXT,
        category TEXT,
        vibecoded_claim TEXT,
        vibecoded_source TEXT,
        vibecoded_percent INTEGER,
        tools_used TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS mrr_claims (
        id TEXT PRIMARY KEY,
        founder_id TEXT NOT NULL,
        mrr INTEGER NOT NULL,
        arr INTEGER,
        claim_date INTEGER NOT NULL,
        confidence TEXT NOT NULL,
        confidence_reason TEXT,
        is_stripe_verified INTEGER DEFAULT 0,
        is_open_startup INTEGER DEFAULT 0,
        has_multiple_sources INTEGER DEFAULT 0,
        scraped_at INTEGER NOT NULL
      )
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS claim_sources (
        id TEXT PRIMARY KEY,
        claim_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_date INTEGER,
        raw_text TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    
    // Opportunities table (structured business opportunities linked to updates)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id TEXT PRIMARY KEY,
        update_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        target_user TEXT NOT NULL,
        job_to_be_done TEXT NOT NULL,
        surface_area TEXT NOT NULL,
        hard_dependencies TEXT,
        distribution_wedge TEXT,
        moat_potential TEXT,
        indie_viability_score INTEGER NOT NULL,
        time_to_revenue_score INTEGER NOT NULL,
        competition_score INTEGER NOT NULL,
        pricing_anchor TEXT,
        mvp_bullets TEXT,
        risks TEXT,
        related_product_ids TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    // Create indexes
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS updates_provider_url_idx ON updates(provider, url)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS updates_published_idx ON updates(published_at)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS updates_provider_idx ON updates(provider)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS updates_unlock_type_idx ON updates(unlock_type)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS ideas_update_idx ON ideas(update_id)`);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS bookmark_unique_idx ON idea_bookmarks(anon_id, idea_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS bookmarks_anon_idx ON idea_bookmarks(anon_id)`);
    
    // Leaderboard indexes
    await client.execute(`CREATE INDEX IF NOT EXISTS founders_product_url_idx ON founders(product_url)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS founders_twitter_idx ON founders(twitter_handle)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS mrr_claims_founder_idx ON mrr_claims(founder_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS mrr_claims_date_idx ON mrr_claims(claim_date)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS mrr_claims_confidence_idx ON mrr_claims(confidence)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS claim_sources_claim_idx ON claim_sources(claim_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS claim_sources_type_idx ON claim_sources(source_type)`);
    
    // Opportunities indexes
    await client.execute(`CREATE INDEX IF NOT EXISTS opportunities_update_idx ON opportunities(update_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS opportunities_surface_idx ON opportunities(surface_area)`);

    // Check if we need to seed updates
    const result = await db.select({ count: sql<number>`count(*)` }).from(schema.updates);
    const count = result[0]?.count || 0;
    
    if (count === 0) {
      console.log("Database empty, seeding with demo data...");
      const { seedDatabase } = await import("@/lib/seed");
      await seedDatabase();
    }
    
    // Check if we need to seed leaderboard
    const foundersResult = await db.select({ count: sql<number>`count(*)` }).from(schema.founders);
    const foundersCount = foundersResult[0]?.count || 0;
    
    if (foundersCount === 0) {
      console.log("Leaderboard empty, seeding with vibecoded apps...");
      const { seedLeaderboard } = await import("@/lib/seed-leaderboard");
      await seedLeaderboard();
    }
    
    // Check if we need to seed opportunities
    try {
      const oppsResult = await db.select({ count: sql<number>`count(*)` }).from(schema.opportunities);
      const oppsCount = oppsResult[0]?.count || 0;
      
      if (oppsCount === 0) {
        console.log("Opportunities empty, seeding structured opportunities...");
        const { seedOpportunities } = await import("@/lib/seed-opportunities");
        await seedOpportunities();
      }
    } catch {
      // Table might not exist yet, that's okay
    }
    
    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
    // Don't throw - let the request continue and handle errors gracefully
  }
}
