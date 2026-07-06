import { DatabaseSync } from 'node:sqlite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

let db: DatabaseSync | null = null;

const getDb = () => {
  if (!db) {
    const dbPath = process.env.DB_SQLITE_PATH || path.join(process.cwd(), 'database.sqlite');
    db = new DatabaseSync(dbPath);
  }
  return db;
};

export const dbQuery = async (query: string, params: any[] = []) => {
  try {
    const database = getDb();
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

