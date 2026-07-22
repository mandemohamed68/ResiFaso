import dotenv from 'dotenv';
dotenv.config();

import { dbQuery as sqliteQuery } from './sqlite';
import { dbQuery as mariadbQuery } from './mariadb';

const dbType = process.env.DB_TYPE || (process.env.NODE_ENV === 'production' ? 'mariadb' : 'sqlite');

export let queryDatabase = async (query: string, params?: any[]): Promise<any> => {
  if (dbType === 'mariadb') {
    return await mariadbQuery(query, params);
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
    
    // Intercept notifications insertion to send real FCM Push Notification
    if (sql.trim().toLowerCase().startsWith("insert into notifications")) {
        try {
            // Params: [id, user_id, title, message, type, reference_id]
            const [id, userId, title, message, type, referenceId] = params;
            if (userId && title && message) {
                // Dynamically import fcm-server to prevent compile-time circular dependency
                import("../lib/fcm-server").then(({ sendPushNotification }) => {
                    sendPushNotification(userId, title, message, {
                        id: String(id || ""),
                        type: String(type || "general"),
                        referenceId: String(referenceId || "")
                    }).catch(e => console.error("[FCM Background Send Error]:", e.message));
                }).catch(e => console.error("[FCM Import Error]:", e.message));
            }
        } catch (e: any) {
            console.error("[FCM Intercept Error]:", e.message);
        }
    }
    
    return keysToCamel(results);
};
