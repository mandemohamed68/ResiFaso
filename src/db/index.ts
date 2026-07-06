import dotenv from 'dotenv';
dotenv.config();

import { dbQuery as sqliteQuery } from './sqlite';
import { dbQuery as mariadbQuery } from './mariadb';

const dbType = process.env.DB_TYPE || 'sqlite';

export let queryDatabase: (query: string, params?: any[]) => Promise<any>;

if (dbType === 'mariadb') {
  queryDatabase = mariadbQuery;
} else if (dbType === 'sqlite') {
  queryDatabase = sqliteQuery;
} else {
  // Use Firebase
  queryDatabase = async () => {
      throw new Error("Local query execution is disabled when using Firebase natively.");
  };
}

export const executeSql = async (sql: string, params: any[] = []) => {
    return await queryDatabase(sql, params);
};
