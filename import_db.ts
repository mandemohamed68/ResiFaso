import fs from 'fs';
import path from 'path';
import { executeSql } from './src/db/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Script d'importation de base de données à partir du fichier généré
async function runImport() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error("Usage: node import_db.js <chemin_vers_fichier.sql>");
    process.exit(1);
  }

  const dbType = process.env.DB_TYPE;
  if (!dbType || dbType === 'firebase') {
    console.error("Erreur: Vous devez configurer DB_TYPE=mariadb ou DB_TYPE=sqlite dans .env");
    process.exit(1);
  }

  console.log(`Préparation de l'importation dans ${dbType}...`);
  try {
    const fullPath = path.resolve(sqlFile);
    const sqlContent = fs.readFileSync(fullPath, 'utf8');
    
    // Split by semicolons for basic execution, avoiding empty queries
    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    console.log(`Exécution de ${statements.length} requêtes SQL...`);
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await executeSql(statements[i]);
      } catch (err: any) {
        console.warn(`Avertissement (requête ${i + 1}):`, err.message);
      }
    }
    
    console.log("Importation terminée avec succès !");
    process.exit(0);
  } catch (err) {
    console.error("Erreur lors de l'importation :", err);
    process.exit(1);
  }
}

runImport();
