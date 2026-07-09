require('dotenv').config();
const mariadb = require('mariadb');
(async () => {
  const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'resifaso_db',
  });
  const conn = await pool.getConnection();
  try {
    let rows = await conn.query("SHOW COLUMNS FROM users LIKE 'uid'");
    console.log("users.uid:", rows);
    rows = await conn.query("SHOW COLUMNS FROM notifications LIKE 'user_id'");
    console.log("notifications.user_id:", rows);
  } catch(e) { console.error(e); }
  await conn.release();
  process.exit();
})();
