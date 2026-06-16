import 'dotenv/config';
import mysql from 'mysql2/promise';

const host = process.env.DB_HOST || '127.0.0.1';
const user = process.env.DB_USER || 'resifaso_user';
const database = process.env.DB_NAME || 'resifaso_db';
const port = Number(process.env.DB_PORT) || 3306;

// Rassemblement de tous les candidats de mot de passe possibles pour éviter toute erreur de guillemets/syntaxe
const envPwd = process.env.DB_PASSWORD;
const candidatesSet = new Set<string>();

if (envPwd) {
  candidatesSet.add(envPwd);
  // Cas où le mot de passe dans .env a déjà des guillemets
  if (envPwd.startsWith('"') && envPwd.endsWith('"')) {
    candidatesSet.add(envPwd.slice(1, -1));
  } else if (envPwd.startsWith("'") && envPwd.endsWith("'")) {
    candidatesSet.add(envPwd.slice(1, -1));
  } else {
    candidatesSet.add(`"${envPwd}"`);
    candidatesSet.add(`'${envPwd}'`);
  }
}

// Candidats par défaut avec guillemets littéraux ou normaux, avec ou sans arobase final
candidatesSet.add('mm@27071986');
candidatesSet.add('"mm@27071986"');
candidatesSet.add('mm@27071986@');
candidatesSet.add('"mm@27071986@"');

const candidates = Array.from(candidatesSet);

let currentPool: mysql.Pool;

function createPoolForPassword(pwd: string): mysql.Pool {
  return mysql.createPool({
    host,
    user,
    password: pwd,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// Initialise avec le premier candidat
currentPool = createPoolForPassword(candidates[0]);

// Recherche asynchrone du bon mot de passe, auto-réparation sur erreur de connexion
async function findWorkingPool() {
  for (let i = 0; i < candidates.length; i++) {
    const pwd = candidates[i];
    const testPool = createPoolForPassword(pwd);
    try {
      const conn = await testPool.getConnection();
      conn.release();
      
      // Trouvé un mot de passe de connexion valide !
      currentPool = testPool;
      console.log(`✅ Base de données MariaDB connectée avec succès (${database})`);
      return;
    } catch (err: any) {
      await testPool.end().catch(() => {});
    }
  }
  console.error("❌ Aucune configuration de mot de passe MariaDB n'a fonctionné. Connexion en attente de correctifs...");
}

findWorkingPool();

// Exportation d'un Proxy transparent vers le pool actif pour ne jamais introduire d'erreur d'importation
export const pool = new Proxy({} as mysql.Pool, {
  get(target, prop, receiver) {
    const value = Reflect.get(currentPool, prop);
    if (typeof value === 'function') {
      return function (this: any, ...args: any[]) {
        return value.apply(currentPool, args);
      };
    }
    return value;
  }
});
