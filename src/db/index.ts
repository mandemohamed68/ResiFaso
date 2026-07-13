import dotenv from 'dotenv';
dotenv.config();

import { dbQuery as sqliteQuery } from './sqlite';
import { dbQuery as mariadbQuery } from './mariadb';

const dbType = process.env.DB_TYPE || 'sqlite';

export let queryDatabase = async (query: string, params?: any[]): Promise<any> => {
  if (dbType === 'mariadb') {
    try {
      return await mariadbQuery(query, params);
    } catch (err: any) {
      const msg = err.message || '';
      // If the query failed because of a duplicate/schema error (e.g. duplicate column name),
      // we must propagate the error immediately so callers like safeAlter can catch and ignore it.
      if (
        msg.includes('duplicate') ||
        msg.includes('Duplicate') ||
        msg.includes('already exists') ||
        msg.includes('1060') ||
        msg.includes('1050') ||
        msg.includes('1062') ||
        msg.includes('42S21')
      ) {
        throw err;
      }
      console.warn(`[Database] MariaDB query failed, falling back to SQLite for local development preview: ${err.message}`);
      return await sqliteQuery(query, params);
    }
  } else {
    return await sqliteQuery(query, params);
  }
};

function toCamel(s: string) {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
}

function keysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  } else if (obj !== null && typeof obj === 'object') {
    // Avoid modifying special objects like Dates or RegExps
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }
    // Avoid modifying Buffers if any exist in the row
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {
      return obj;
    }
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toCamel(key)]: keysToCamel(obj[key]),
      }),
      {} as any,
    );
  }
  return obj;
}

export const executeSql = async (sql: string, params: any[] = []) => {
    const results = await queryDatabase(sql, params);
    return keysToCamel(results);
};
