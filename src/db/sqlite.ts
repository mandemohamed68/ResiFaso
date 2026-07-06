import dotenv from 'dotenv';
import path from 'path';

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
    db = new DatabaseSync(dbPath);
  }
  return db;
};

export const dbQuery = async (query: string, params: any[] = []) => {
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
  } catch (err) {
    console.error("SQLite Query Error:", err);
    throw err;
  }
};

