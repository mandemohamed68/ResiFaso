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

export const executeSql = async (sql: string, params: any[] = []) => {
    return await queryDatabase(sql, params);
};
