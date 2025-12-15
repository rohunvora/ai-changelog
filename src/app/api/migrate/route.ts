import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/migrate
 * Create leaderboard tables if they don't exist
 */
export async function POST() {
  try {
    // Create founders table
    await db.run(sql`
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
    
    // Create mrr_claims table
    await db.run(sql`
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
        scraped_at INTEGER NOT NULL,
        FOREIGN KEY (founder_id) REFERENCES founders(id)
      )
    `);
    
    // Create claim_sources table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS claim_sources (
        id TEXT PRIMARY KEY,
        claim_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_date INTEGER,
        raw_text TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (claim_id) REFERENCES mrr_claims(id)
      )
    `);
    
    // Create indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS founders_product_url_idx ON founders(product_url)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS founders_twitter_idx ON founders(twitter_handle)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS mrr_claims_founder_idx ON mrr_claims(founder_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS mrr_claims_date_idx ON mrr_claims(claim_date)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS mrr_claims_confidence_idx ON mrr_claims(confidence)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS claim_sources_claim_idx ON claim_sources(claim_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS claim_sources_type_idx ON claim_sources(source_type)`);
    
    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}

