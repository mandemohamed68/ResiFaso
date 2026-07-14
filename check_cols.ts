
import { dbQuery } from './src/db/mariadb';

async function checkColumns() {
  try {
    const rows = await dbQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = 'resifaso_db';");
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
}

checkColumns();
