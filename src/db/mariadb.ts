import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const dbName = process.env.DB_NAME || 'resifaso_db';

console.log(`[MariaDB] Connecting to database: ${dbName} at ${dbHost}:${dbPort}`);

const pool = mariadb.createPool({
  host: dbHost,
  port: dbPort,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  connectionLimit: 20,
  acquireTimeout: 20000
});

export const dbQuery = async (query: string, params?: any[]) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(query, params);
    return rows;
  } catch (err: any) {
    console.error(`[MariaDB Query Error]: ${err.message} | Query: "${query.substring(0, 150)}..."`);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

