import { dbQuery } from './src/db/mariadb';

async function checkColumns() {
  try {
    const rows = await dbQuery("DESCRIBE users;");
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
}

checkColumns();
