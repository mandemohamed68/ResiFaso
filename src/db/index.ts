import dotenv from 'dotenv';
dotenv.config();

import { dbQuery as sqliteQuery } from './sqlite';
import { dbQuery as mariadbQuery } from './mariadb';

const dbType = process.env.DB_TYPE || 'sqlite';

export let queryDatabase: (query: string, params?: any[]) => Promise<any>;

if (dbType === 'mariadb') {
  queryDatabase = mariadbQuery;
} else {
  queryDatabase = sqliteQuery;
}

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
  } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toCamel(key)]: keysToCamel(obj[key]),
      }),
      {},
    );
  }
  return obj;
}

export const executeSql = async (sql: string, params: any[] = []) => {
    const results = await queryDatabase(sql, params);
    return keysToCamel(results);
};
