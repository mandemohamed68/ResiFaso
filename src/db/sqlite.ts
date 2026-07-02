import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

let dbPromise: Promise<Database> | null = null;

const getDb = async () => {
  if (!dbPromise) {
    dbPromise = open({
      filename: process.env.DB_SQLITE_PATH || path.join(process.cwd(), 'database.sqlite'),
      driver: sqlite3.Database
    });
  }
  return dbPromise;
};

export const dbQuery = async (query: string, params?: any[]) => {
  try {
    const db = await getDb();
    // If it's a SELECT query, use .all(), otherwise use .run()
    if (query.trim().toUpperCase().startsWith("SELECT")) {
      return await db.all(query, params);
    } else {
      const result = await db.run(query, params);
      return result;
    }
  } catch (err) {
    console.error("SQLite Query Error:", err);
    throw err;
  }
};
