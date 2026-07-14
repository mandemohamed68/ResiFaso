import fs from 'fs';
import path from 'path';
import { executeSql } from './src/db/index';
import dotenv from 'dotenv';

dotenv.config();

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      // Handle escaped single quotes '' or \'
      if (i > 0 && (sql[i - 1] === "\\" || sql[i - 1] === "'")) {
        // Escaped quote, do not toggle string mode
        current += char;
      } else {
        inString = !inString;
        current += char;
      }
    } else if (char === ';' && !inString) {
      statements.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements;
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
        statements.push(sql);
      }
    }
    
    console.log(`Extracted and converted ${statements.length} INSERT statements for SQLite.`);
    
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
