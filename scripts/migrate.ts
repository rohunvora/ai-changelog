/**
 * Migration script to upgrade the database schema
 * 
 * Changes:
 * - Convert integer IDs to ULID text IDs
 * - Add hash, raw, contentText, contentMd fields to updates
 * - Convert string dates to integer timestamps
 * - Add ideaBookmarks and locks tables
 * - Add unique index on (provider, url)
 * 
 * Run with: npx tsx scripts/migrate.ts
 */

import Database from "better-sqlite3";
import { ulid } from "ulid";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "changelog.db");
const backupPath = path.join(process.cwd(), "data", `changelog.backup.${Date.now()}.db`);

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function computeHash(title: string, url: string, publishedAt: number, contentText: string): string {
  const data = `${title}|${url}|${publishedAt}|${contentText.slice(0, 2000)}`;
  return createHash("sha256").update(data).digest("hex");
}

function parseDate(dateStr: string): number {
  if (!dateStr) return Date.now();
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
}

async function migrate() {
  console.log("Starting migration...");
  
  // Check if database exists
  const dbExists = fs.existsSync(dbPath);
  
  if (!dbExists) {
    console.log("No existing database found. Creating fresh schema...");
    const db = new Database(dbPath);
    createFreshSchema(db);
    db.close();
    console.log("Fresh database created successfully!");
    return;
  }

  // Backup existing database
  console.log(`Backing up database to ${backupPath}...`);
  fs.copyFileSync(dbPath, backupPath);
  console.log("Backup created.");

  const db = new Database(dbPath);

  try {
    // Check if migration is needed by looking at schema
    const tableInfo = db.prepare("PRAGMA table_info(updates)").all() as Array<{ name: string; type: string }>;
    const hasNewSchema = tableInfo.some((col) => col.name === "hash");
    
    if (hasNewSchema) {
      console.log("Database already migrated. Skipping...");
      db.close();
      return;
    }

    console.log("Migrating existing data...");

    // Begin transaction
    db.exec("BEGIN TRANSACTION");

    // 1. Read all existing data
    const existingUpdates = db.prepare("SELECT * FROM updates").all() as Array<{
      id: number;
      provider: string;
      title: string;
      content: string;
      summary: string | null;
      url: string;
      category: string | null;
      published_at: string;
      scraped_at: string;
      external_id: string | null;
    }>;

    const existingIdeas = db.prepare("SELECT * FROM ideas").all() as Array<{
      id: number;
      update_id: number;
      title: string;
      description: string;
      complexity: string | null;
      potential_impact: string | null;
      tech_stack: string | null;
      saved: number | null;
      generated_at: string;
    }>;

    console.log(`Found ${existingUpdates.length} updates and ${existingIdeas.length} ideas`);

    // Create ID mapping for updates (old int -> new ULID)
    const updateIdMap = new Map<number, string>();
    existingUpdates.forEach((u) => {
      updateIdMap.set(u.id, ulid());
    });

    // 2. Drop old tables
    db.exec("DROP TABLE IF EXISTS ideas");
    db.exec("DROP TABLE IF EXISTS updates");

    // 3. Create new schema
    createFreshSchema(db);

    // 4. Migrate updates
    const insertUpdate = db.prepare(`
      INSERT INTO updates (id, provider, title, url, category, content_text, content_md, raw, hash, published_at, scraped_at, external_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Track (provider, url) to avoid duplicates
    const seenProviderUrls = new Set<string>();

    for (const update of existingUpdates) {
      const key = `${update.provider}|${update.url}`;
      if (seenProviderUrls.has(key)) {
        console.log(`Skipping duplicate: ${update.title}`);
        continue;
      }
      seenProviderUrls.add(key);

      const newId = updateIdMap.get(update.id)!;
      const publishedAt = parseDate(update.published_at);
      const scrapedAt = parseDate(update.scraped_at);
      const contentText = update.content || update.title;
      const contentMd = update.content || update.title;
      const hash = computeHash(update.title, update.url, publishedAt, contentText);

      insertUpdate.run(
        newId,
        update.provider,
        update.title,
        update.url,
        update.category,
        contentText,
        contentMd,
        "", // raw - we don't have original HTML
        hash,
        publishedAt,
        scrapedAt,
        update.external_id
      );
    }

    // 5. Migrate ideas
    const insertIdea = db.prepare(`
      INSERT INTO ideas (id, update_id, title, description, complexity, potential_impact, tech_stack, model, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Also migrate saved ideas to bookmarks (using a default anon_id)
    const insertBookmark = db.prepare(`
      INSERT OR IGNORE INTO idea_bookmarks (anon_id, idea_id, created_at)
      VALUES (?, ?, ?)
    `);

    const complexityMap: Record<string, number> = { low: 1, medium: 3, high: 5 };
    const impactMap: Record<string, number> = { low: 1, medium: 3, high: 5 };

    for (const idea of existingIdeas) {
      const newUpdateId = updateIdMap.get(idea.update_id);
      if (!newUpdateId) {
        console.log(`Skipping orphaned idea: ${idea.title}`);
        continue;
      }

      const newIdeaId = ulid();
      const generatedAt = parseDate(idea.generated_at);
      const complexity = idea.complexity ? (complexityMap[idea.complexity.toLowerCase()] || 3) : null;
      const potentialImpact = idea.potential_impact ? (impactMap[idea.potential_impact.toLowerCase()] || 3) : null;

      insertIdea.run(
        newIdeaId,
        newUpdateId,
        idea.title,
        idea.description,
        complexity,
        potentialImpact,
        idea.tech_stack,
        "migrated", // model
        generatedAt
      );

      // If idea was saved, create a bookmark with a migration marker
      if (idea.saved) {
        insertBookmark.run("_migrated_", newIdeaId, generatedAt);
      }
    }

    // Commit transaction
    db.exec("COMMIT");

    console.log("Migration completed successfully!");
    console.log(`Migrated ${seenProviderUrls.size} updates and ${existingIdeas.length} ideas`);

  } catch (error) {
    console.error("Migration failed:", error);
    db.exec("ROLLBACK");
    
    // Restore backup
    console.log("Restoring backup...");
    fs.copyFileSync(backupPath, dbPath);
    console.log("Backup restored.");
    
    throw error;
  } finally {
    db.close();
  }
}

function createFreshSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS updates (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT,
      content_text TEXT NOT NULL,
      content_md TEXT NOT NULL,
      raw TEXT NOT NULL DEFAULT '',
      hash TEXT NOT NULL,
      published_at INTEGER NOT NULL,
      scraped_at INTEGER NOT NULL,
      external_id TEXT
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS updates_provider_url_idx ON updates (provider, url);
    CREATE INDEX IF NOT EXISTS updates_published_idx ON updates (published_at);
    CREATE INDEX IF NOT EXISTS updates_provider_idx ON updates (provider);
    
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
    );
    
    CREATE INDEX IF NOT EXISTS ideas_update_idx ON ideas (update_id);
    
    CREATE TABLE IF NOT EXISTS idea_bookmarks (
      anon_id TEXT NOT NULL,
      idea_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS bookmark_unique_idx ON idea_bookmarks (anon_id, idea_id);
    CREATE INDEX IF NOT EXISTS bookmarks_anon_idx ON idea_bookmarks (anon_id);
    
    CREATE TABLE IF NOT EXISTS locks (
      name TEXT PRIMARY KEY,
      locked_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
}

// Run migration
migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

