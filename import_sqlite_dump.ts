import fs from 'fs';
import path from 'path';
import { executeSql } from './src/db/index';
import dotenv from 'dotenv';

dotenv.config();

function splitSqlStatements(sql: string): string[] {
  return sql.split(/;\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
}

async function runImport() {
  console.log("Starting customized import for SQLite...");
  try {
    const sqlFile = 'resifaso_dump_exported.sql';
    const fullPath = path.resolve(sqlFile);
    const sqlContent = fs.readFileSync(fullPath, 'utf8');
    
    // Split into individual statements by semicolon, respecting single quotes
    const rawStatements = splitSqlStatements(sqlContent);
    const statements: string[] = [];
    
    for (const raw of rawStatements) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('INSERT ')) {
        // Convert INSERT IGNORE INTO to INSERT OR IGNORE INTO
        let sql = trimmed;
        if (sql.includes('INSERT IGNORE INTO')) {
          sql = sql.replace('INSERT IGNORE INTO', 'INSERT OR IGNORE INTO');
        }
        // Convert MySQL \' to SQLite ''
        sql = sql.replace(/\\'/g, "''");
        // Convert users(id) to users(uid)
        sql = sql.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\s+users\s*\(\s*id\s*,/i, 'INSERT OR IGNORE INTO users (uid,');
        sql = sql.replace(/\bINSERT\s+INTO\s+users\s*\(\s*id\s*,/i, 'INSERT INTO users (uid,');
        statements.push(sql);
      }
    }
    
    console.log(`Extracted and converted ${statements.length} INSERT statements for SQLite.`);

    // Clear existing data to ensure a clean import state
    try {
      await executeSql("PRAGMA foreign_keys = OFF");
      await executeSql("DELETE FROM residence_amenities");
      await executeSql("DELETE FROM residence_images");
      await executeSql("DELETE FROM bookings");
      await executeSql("DELETE FROM reviews");
      await executeSql("DELETE FROM withdrawals");
      await executeSql("DELETE FROM advertisements");
      await executeSql("DELETE FROM residences");
      await executeSql("DELETE FROM users");
      console.log("Successfully cleared previous table data for a fresh import.");
    } catch (e: any) {
      console.warn("Could not clear tables, proceeding anyway:", e.message);
    }
    
    // Add columns if they are missing in SQLite
    try {
      await executeSql("ALTER TABLE residences ADD COLUMN owner_name TEXT");
    } catch (e) {}
    try {
      await executeSql("ALTER TABLE residences ADD COLUMN owner_phone TEXT");
    } catch (e) {}
    try {
      await executeSql("ALTER TABLE residences ADD COLUMN lat REAL");
    } catch (e) {}
    try {
      await executeSql("ALTER TABLE residences ADD COLUMN lng REAL");
    } catch (e) {}
    try {
      await executeSql("ALTER TABLE withdrawals ADD COLUMN owner_name TEXT");
    } catch (e) {}
    try {
      await executeSql("ALTER TABLE withdrawals ADD COLUMN owner_email TEXT");
    } catch (e) {}
    
    // Disable foreign keys during import
    try {
      await executeSql("PRAGMA foreign_keys = OFF");
      console.log("Foreign keys disabled.");
    } catch (e: any) {
      console.error("Could not disable foreign keys:", e.message);
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await executeSql(statements[i]);
        successCount++;
      } catch (err: any) {
        failCount++;
        // Print only the first few errors to avoid spamming the log
        if (failCount <= 15) {
          console.warn(`Failed statement: ${statements[i].substring(0, 150)}...`);
          console.warn(`Reason:`, err.message);
        }
      }
    }
    
    console.log(`Import finished! Success: ${successCount}, Failed: ${failCount}`);
    process.exit(0);
  } catch (err) {
    console.error("Error during import :", err);
    process.exit(1);
  }
}

runImport();
