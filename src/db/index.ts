import dotenv from 'dotenv';
dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

export let queryDatabase: (query: string, params?: any[]) => Promise<any> = async () => {
    throw new Error("Database not initialized");
};

// Lazy initialization so we don't crash if packages are missing
if (dbType === 'mariadb') {
  import('./mariadb').then(module => {
    queryDatabase = module.dbQuery;
  }).catch(err => console.error("Failed to load mariadb driver", err));
} else if (dbType === 'sqlite') {
  import('./sqlite').then(module => {
    queryDatabase = module.dbQuery;
  }).catch(err => console.error("Failed to load sqlite driver", err));
} else {
  // Use Firebase
  queryDatabase = async () => {
      throw new Error("Local query execution is disabled when using Firebase natively.");
  };
}

export const executeSql = async (sql: string, params: any[] = []) => {
    return await queryDatabase(sql, params);
};
