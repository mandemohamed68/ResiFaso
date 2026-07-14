
import { dbQuery } from './src/db/mariadb';

async function checkDatabase() {
  try {
    const rows = await dbQuery("SELECT DATABASE() as db;");
    console.log('Current Database:', rows);
    const tables = await dbQuery("SHOW TABLES LIKE 'users';");
    console.log('Users table exists:', tables);
    const columns = await dbQuery("DESCRIBE users;");
    console.log('Users columns:', columns);
  } catch (err) {
    console.error(err);
  }
}

checkDatabase();
