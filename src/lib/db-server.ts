import 'dotenv/config';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du pool de connexion MariaDB
export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'resifaso_user',
  // Si le mot de passe inclut littéralement des guillemets, on les force ici
  password: process.env.DB_PASSWORD || '"mm@27071986"',
  database: process.env.DB_NAME || 'resifaso_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Vérifier la connexion
pool.getConnection()
  .then(conn => {
    console.log(`✅ Base de données MariaDB connectée (${process.env.DB_NAME})`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion à MariaDB :', err.message);
  });
