import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

let db: any = null;

const getDb = async () => {
  if (!db) {
    let DatabaseSync;
    try {
      const sqliteModule = await import('node:sqlite');
      DatabaseSync = sqliteModule.DatabaseSync;
    } catch (e) {
      throw new Error(
        "SQLite is not supported on this version of Node.js. " +
        "Please upgrade to Node.js v22.5.0 or higher, or use DB_TYPE=mariadb / DB_TYPE=firebase."
      );
    }
    const dbPath = process.env.DB_SQLITE_PATH || path.join(process.cwd(), 'database.sqlite');
    
    // Check if the database is malformed before returning it
    let isMalformed = false;
    if (fs.existsSync(dbPath)) {
      try {
        const testDb = new DatabaseSync(dbPath);
        // Try a simple prepare/execution to verify integrity
        testDb.prepare("PRAGMA integrity_check;").all();
        // Try to close testDb if supported, ignore if not
        if (typeof testDb.close === 'function') {
          testDb.close();
        }
      } catch (err: any) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk image"))) {
          isMalformed = true;
          console.error("SQLite integrity check failed. Database file is malformed/corrupted:", err.message);
        }
      }
    }

    if (isMalformed) {
      try {
        const backupPath = `${dbPath}.malformed.${Date.now()}`;
        fs.renameSync(dbPath, backupPath);
        console.warn(`Renamed corrupted SQLite database to: ${backupPath}`);
      } catch (renameErr: any) {
        console.error("Could not rename corrupted SQLite file (it might be locked). Truncating instead:", renameErr.message);
        try {
          fs.writeFileSync(dbPath, '');
          console.warn("Corrupted SQLite file successfully truncated.");
        } catch (truncErr: any) {
          console.error("Could not truncate corrupted SQLite file:", truncErr.message);
        }
      }
    }

    db = new DatabaseSync(dbPath);
  }
  return db;
};

export const dbQuery = async (query: string, params: any[] = []): Promise<any> => {
  try {
    const database = await getDb();
    const stmt = database.prepare(query);
    
    // If it's a SELECT query, use .all(), otherwise use .run()
    if (query.trim().toUpperCase().startsWith("SELECT")) {
      return stmt.all(...params);
    } else {
      const result = stmt.run(...params);
      return {
        lastID: result.lastInsertRowid,
        changes: result.changes
      };
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk image"))) {
      console.error("SQLite Query Error indicating corruption, attempting auto-recovery:", err.message);
      db = null; // Reset the connection reference
      
      try {
        const dbPath = process.env.DB_SQLITE_PATH || path.join(process.cwd(), 'database.sqlite');
        if (fs.existsSync(dbPath)) {
          const backupPath = `${dbPath}.malformed.${Date.now()}`;
          try {
            fs.renameSync(dbPath, backupPath);
            console.warn(`Renamed corrupted SQLite database to: ${backupPath}`);
          } catch (renameErr: any) {
            console.warn("Could not rename corrupted SQLite file (it might be locked). Truncating instead:", renameErr.message);
            fs.writeFileSync(dbPath, '');
            console.warn("Corrupted SQLite file successfully truncated.");
          }
        }
        
        console.log("Re-initializing SQLite database tables...");
        const { initDatabase } = await import('./init');
        await initDatabase();
        
        // Retry the query once on the fresh database!
        console.log("Retrying query after database recreation...");
        const database = await getDb();
        const stmt = database.prepare(query);
        if (query.trim().toUpperCase().startsWith("SELECT")) {
          return stmt.all(...params);
        } else {
          const result = stmt.run(...params);
          return {
            lastID: result.lastInsertRowid,
            changes: result.changes
          };
        }
      } catch (recoveryErr) {
        console.error("SQLite database recovery failed:", recoveryErr);
      }
    }
    const errMsg = String(err?.message || err || '');
    if (errMsg.includes('duplicate column name') || errMsg.includes('already exists') || errMsg.includes('Duplicate column')) {
      throw err;
    }
    console.error("SQLite Query Error:", err);
    throw err;
  }
};


