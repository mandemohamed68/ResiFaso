const mariadb = require('mariadb');
require('dotenv').config();

async function fixSettings() {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'resifaso_db',
    });

    console.log("Connecté à MariaDB.");

    // 1. Créer la table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    console.log("Table 'settings' vérifiée/créée.");

    // 2. Insérer la valeur par défaut pour 'global'
    await conn.query(`
      INSERT IGNORE INTO settings (\`key\`, value) VALUES ('global', '{}')
    `);
    console.log("Ligne 'global' insérée/vérifiée avec succès.");

    console.log("Le correctif a été appliqué avec succès. Vous pouvez maintenant redémarrer l'application avec 'pm2 restart resifaso'.");

  } catch (err) {
    console.error("Erreur lors du script :", err);
  } finally {
    if (conn) conn.end();
  }
}

fixSettings();
