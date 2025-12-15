/**
 * Migration script to add unlock type classification
 * 
 * Adds:
 * - unlock_type column
 * - capability column  
 * - enables_building column
 * - Index on unlock_type
 * 
 * Then classifies all existing updates.
 * 
 * Run with: npx tsx scripts/add-unlock-type.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { classifyUpdate, UNLOCK_TYPES } from "../src/lib/classifier";

const dbPath = path.join(process.cwd(), "data", "changelog.db");

async function migrate() {
  console.log("Adding unlock type classification...\n");
  
  const db = new Database(dbPath);
  
  try {
    // Check if column already exists
    const columns = db.prepare("PRAGMA table_info(updates)").all() as Array<{ name: string }>;
    const hasUnlockType = columns.some(col => col.name === "unlock_type");
    
    if (!hasUnlockType) {
      console.log("Adding new columns...");
      db.exec(`
        ALTER TABLE updates ADD COLUMN unlock_type TEXT DEFAULT 'improvement';
        ALTER TABLE updates ADD COLUMN capability TEXT;
        ALTER TABLE updates ADD COLUMN enables_building TEXT;
      `);
      
      // Add index
      db.exec(`
        CREATE INDEX IF NOT EXISTS updates_unlock_type_idx ON updates (unlock_type);
      `);
      
      console.log("Columns added.\n");
    } else {
      console.log("Columns already exist.\n");
    }
    
    // Get all updates that need classification
    const updates = db.prepare(`
      SELECT id, provider, title, content_text as contentText
      FROM updates 
      WHERE unlock_type = 'improvement' OR unlock_type IS NULL
    `).all() as Array<{
      id: string;
      provider: string;
      title: string;
      contentText: string;
    }>;
    
    console.log(`Classifying ${updates.length} updates...\n`);
    
    const updateStmt = db.prepare(`
      UPDATE updates 
      SET unlock_type = ?, capability = ?, enables_building = ?
      WHERE id = ?
    `);
    
    let newCapabilities = 0;
    let improvements = 0;
    let operational = 0;
    
    for (const update of updates) {
      const result = await classifyUpdate(
        update.provider,
        update.title,
        update.contentText
      );
      
      const enablesBuildingJson = result.enablesBuilding 
        ? JSON.stringify(result.enablesBuilding)
        : null;
      
      updateStmt.run(
        result.unlockType,
        result.capability || null,
        enablesBuildingJson,
        update.id
      );
      
      if (result.unlockType === UNLOCK_TYPES.NEW_CAPABILITY) {
        newCapabilities++;
        console.log(`🔓 NEW: ${update.title.slice(0, 60)}...`);
        if (result.capability) {
          console.log(`   Capability: ${result.capability}`);
        }
        if (result.enablesBuilding?.length) {
          console.log(`   Enables: ${result.enablesBuilding.join(', ')}`);
        }
      } else if (result.unlockType === UNLOCK_TYPES.OPERATIONAL) {
        operational++;
        console.log(`⚙️  OPS: ${update.title.slice(0, 60)}...`);
      } else {
        improvements++;
        console.log(`📈 IMP: ${update.title.slice(0, 60)}...`);
      }
    }
    
    console.log(`\n✅ Classification complete!`);
    console.log(`   🔓 New Capabilities: ${newCapabilities}`);
    console.log(`   📈 Improvements: ${improvements}`);
    console.log(`   ⚙️  Operational: ${operational}`);
    
  } finally {
    db.close();
  }
}

migrate().catch(console.error);

