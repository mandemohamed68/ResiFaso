import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

const host = process.env.DB_HOST || '127.0.0.1';
const user = process.env.DB_USER || 'resifaso_user';
const database = process.env.DB_NAME || 'resifaso_db';
const port = Number(process.env.DB_PORT) || 3306;

// Gather possible password candidates
const envPwd = process.env.DB_PASSWORD;
const candidatesSet = new Set<string>();

if (envPwd) {
  candidatesSet.add(envPwd);
  if (envPwd.startsWith('"') && envPwd.endsWith('"')) {
    candidatesSet.add(envPwd.slice(1, -1));
  } else if (envPwd.startsWith("'") && envPwd.endsWith("'")) {
    candidatesSet.add(envPwd.slice(1, -1));
  } else {
    candidatesSet.add(`"${envPwd}"`);
    candidatesSet.add(`'${envPwd}'`);
  }
}

candidatesSet.add('mm@27071986');
candidatesSet.add('"mm@27071986"');
candidatesSet.add('mm@27071986@');
candidatesSet.add('"mm@27071986@"');

const candidates = Array.from(candidatesSet);

let currentPool: mysql.Pool;
let isFallbackMode = false;

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

// Initial default
currentPool = createPoolForPassword(candidates[0]);

// Asynchronous validation
async function findWorkingPool() {
  for (let i = 0; i < candidates.length; i++) {
    const pwd = candidates[i];
    const testPool = createPoolForPassword(pwd);
    try {
      const conn = await testPool.getConnection();
      conn.release();
      
      currentPool = testPool;
      isFallbackMode = false;
      console.log(`✅ Base de données MariaDB connectée avec succès (${database})`);
      return;
    } catch (err: any) {
      await testPool.end().catch(() => {});
    }
  }
  console.log("⚠️ Aucune base MariaDB locale active sur le port 3306. Activation du mode Base de Données Locale Autonome (JSON persistant).");
  isFallbackMode = true;
}

export const poolReady = findWorkingPool();

// ==========================================
// FALLBACK LOCAL JSON DATABASE EMULATOR
// ==========================================
const LOCAL_DB_PATH = path.join(process.cwd(), 'local_db.json');

function saveDB(data: any) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local JSON DB:', err);
  }
}

function loadDB(): any {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
    } catch (err) {
      console.error('Error parsing local DB, recreating...', err);
    }
  }

  // Generate complete seed database for perfect preview state!
  const defaultAdminHash = bcrypt.hashSync("mm@27071986@", 10);
  const initialData = {
    users: [
      {
        id: "usr_admin_default",
        email: "mandemohamed68@gmail.com",
        password: defaultAdminHash,
        display_name: "Super Administrateur",
        role: "admin",
        phone_number: "22670000000",
        photo_url: "",
        is_verified: 1,
        is_suspended: 0,
        created_at: new Date().toISOString()
      }
    ],
    residences: [
      {
        residence_id: 1,
        id: "res_1",
        owner_id: "usr_admin_default",
        title: "Villa de Luxe Somptueuse",
        description: "Magnifique villa calme et sécurisée située dans un quartier résidentiel huppé de Ouagadougou. Dispose de tout le confort moderne réclamé. Idéal pour séjours court et moyen terme.",
        type: "villa",
        price_per_night: 45000,
        advance_percentage: 20,
        cleaning_fee: 5000,
        service_fee: 2500,
        city: "Ouagadougou",
        neighborhood: "Ouaga 2000",
        street: "Avenue Mouammar Kadhafi",
        status: "published",
        availability_status: "available",
        created_at: new Date().toISOString()
      },
      {
        residence_id: 2,
        id: "res_2",
        owner_id: "usr_admin_default",
        title: "Bel Appartement Meublé de Standing",
        description: "Appartement moderne, élégamment décoré pour vos séjours professionnels ou en famille. Gardiennage 24/7 et climatisation intégrale.",
        type: "appartement",
        price_per_night: 25000,
        advance_percentage: 15,
        cleaning_fee: 3000,
        service_fee: 1500,
        city: "Ouagadougou",
        neighborhood: "Koulouba",
        street: "Rue de l'Aéroport",
        status: "published",
        availability_status: "available",
        created_at: new Date().toISOString()
      },
      {
        residence_id: 3,
        id: "res_3",
        owner_id: "usr_admin_default",
        title: "Studio Confortable Zone Industrielle",
        description: "Studio parfait pour voyageurs d'affaires au centre de Bobo-Dioulasso. Proche de toutes commodités, autonome et équipé.",
        type: "studio",
        price_per_night: 15000,
        advance_percentage: 10,
        cleaning_fee: 2000,
        service_fee: 1000,
        city: "Bobo-Dioulasso",
        neighborhood: "Tounouma",
        street: "Avenue de la Nation",
        status: "published",
        availability_status: "available",
        created_at: new Date().toISOString()
      }
    ],
    residence_images: [
      { residence_id: "res_1", image_url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80" },
      { residence_id: "res_1", image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80" },
      { residence_id: "res_2", image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80" },
      { residence_id: "res_3", image_url: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80" }
    ],
    residence_amenities: [
      { residence_id: "res_1", amenity: "Piscine" },
      { residence_id: "res_1", amenity: "WiFi" },
      { residence_id: "res_1", amenity: "Climatisation" },
      { residence_id: "res_1", amenity: "Sécurité" },
      { residence_id: "res_1", amenity: "TV" },
      { residence_id: "res_1", amenity: "Cuisine" },
      { residence_id: "res_2", amenity: "WiFi" },
      { residence_id: "res_2", amenity: "Climatisation" },
      { residence_id: "res_2", amenity: "Sécurité" },
      { residence_id: "res_2", amenity: "Cuisine" },
      { residence_id: "res_3", amenity: "WiFi" },
      { residence_id: "res_3", amenity: "Climatisation" },
      { residence_id: "res_3", amenity: "Cuisine" }
    ],
    bookings: [],
    withdrawals: [],
    settings: [
      { id: "global", data: JSON.stringify({ platformName: "ResiFaso", commissionRate: 10, isTestMode: false, enablePhoneCalls: true, enableWhatsApp: true }) }
    ],
    ads: []
  };

  saveDB(initialData);
  return initialData;
}

// Emulate queries precisely
async function mockExecute(sql: string, params: any[] = []): Promise<[any, any]> {
  const db = loadDB();
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  // 1. CREATE TABLE, ALTER TABLE, etc. -> No op, return empty success
  if (normalizedSql.toUpperCase().startsWith('CREATE') || 
      normalizedSql.toUpperCase().startsWith('ALTER') || 
      normalizedSql.toUpperCase().startsWith('DROP')) {
    return [[], null];
  }

  // 2. DESCRIBE or SHOW COLUMNS
  if (normalizedSql.toUpperCase().startsWith('DESCRIBE') || normalizedSql.toUpperCase().startsWith('SHOW COLUMNS')) {
    if (normalizedSql.toLowerCase().includes('users')) {
      return [
        [
          { Field: 'id' }, { Field: 'email' }, { Field: 'password' }, { Field: 'display_name' }, 
          { Field: 'role' }, { Field: 'phone_number' }, { Field: 'photo_url' }, 
          { Field: 'is_verified' }, { Field: 'is_suspended' }, { Field: 'created_at' }
        ],
        null
      ];
    }
    if (normalizedSql.toLowerCase().includes('residences')) {
      return [
        [
          { Field: 'residence_id' }, { Field: 'id' }, { Field: 'owner_id' }, { Field: 'title' }, 
          { Field: 'description' }, { Field: 'type' }, { Field: 'price_per_night' }, 
          { Field: 'advance_percentage' }, { Field: 'cleaning_fee' }, { Field: 'service_fee' }, 
          { Field: 'city' }, { Field: 'neighborhood' }, { Field: 'street' }, { Field: 'status' }, 
          { Field: 'availability_status' }, { Field: 'created_at' }
        ],
        null
      ];
    }
    return [
      [{ Field: 'id' }],
      null
    ];
  }

  // 3. SELECT Queries
  if (normalizedSql.toUpperCase().startsWith('SELECT')) {
    // SELECT * FROM users WHERE email = ?
    if (normalizedSql.toLowerCase().includes('from users') && normalizedSql.toLowerCase().includes('email =')) {
      const email = params[0];
      const match = db.users.filter((u: any) => u.email === email);
      return [match, null];
    }

    // SELECT * FROM users WHERE id = ?
    if (normalizedSql.toLowerCase().includes('from users') && normalizedSql.toLowerCase().includes('id =')) {
      const id = params[0];
      const match = db.users.filter((u: any) => u.id === id);
      return [match, null];
    }

    // SELECT admin values / admin view
    if (normalizedSql.toLowerCase().includes('from users') && !normalizedSql.toLowerCase().includes('where')) {
      const mapped = db.users.map((u: any) => ({
        uid: u.id,
        email: u.email,
        displayName: u.display_name,
        role: u.role,
        phoneNumber: u.phone_number,
        photoUrl: u.photo_url || "",
        isVerified: u.is_verified,
        isSuspended: u.is_suspended,
        createdAt: u.created_at
      }));
      return [mapped, null];
    }

    // SELECT * FROM residences WHERE status = 'published'
    if (normalizedSql.toLowerCase().includes('from residences') && normalizedSql.toLowerCase().includes("status = 'published'")) {
      const match = db.residences.filter((r: any) => r.status === 'published');
      return [match, null];
    }

    // SELECT * FROM residences WHERE owner_id = ?
    if (normalizedSql.toLowerCase().includes('from residences') && normalizedSql.toLowerCase().includes("owner_id =")) {
      const ownerId = params[0];
      const match = db.residences.filter((r: any) => r.owner_id === ownerId);
      return [match, null];
    }

    // SELECT * FROM residences WHERE id = ?
    if (normalizedSql.toLowerCase().includes('from residences') && normalizedSql.toLowerCase().includes("id =")) {
      const id = params[0];
      const match = db.residences.filter((r: any) => r.id === id);
      return [match, null];
    }

    // SELECT * FROM residences
    if (normalizedSql.toLowerCase().includes('from residences') && !normalizedSql.toLowerCase().includes("where")) {
      const match = db.residences;
      return [match, null];
    }

    // SELECT image_url FROM residence_images
    if (normalizedSql.toLowerCase().includes('from residence_images')) {
      const resId = params[0];
      const match = db.residence_images
        .filter((i: any) => i.residence_id === resId)
        .map((i: any) => ({ image_url: i.image_url }));
      return [match, null];
    }

    // SELECT amenity FROM residence_amenities
    if (normalizedSql.toLowerCase().includes('from residence_amenities')) {
      const resId = params[0];
      const match = db.residence_amenities
        .filter((a: any) => a.residence_id === resId)
        .map((a: any) => ({ amenity: a.amenity }));
      return [match, null];
    }

    // SELECT data FROM settings WHERE id = ?
    if (normalizedSql.toLowerCase().includes('from settings') && normalizedSql.toLowerCase().includes('id =')) {
      const id = params[0];
      const match = db.settings.filter((s: any) => s.id === id);
      return [match, null];
    }

    // SELECT * FROM withdrawals
    if (normalizedSql.toLowerCase().includes('from withdrawals')) {
      const sorted = [...db.withdrawals].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return [sorted, null];
    }

    // SELECT * FROM bookings WHERE client_id = ?
    if (normalizedSql.toLowerCase().includes('from bookings') && normalizedSql.toLowerCase().includes('client_id =')) {
      const clientId = params[0];
      const match = db.bookings.filter((b: any) => b.client_id === clientId);
      return [match, null];
    }

    // SELECT * FROM bookings WHERE owner_id = ?
    if (normalizedSql.toLowerCase().includes('from bookings') && normalizedSql.toLowerCase().includes('owner_id =')) {
      const ownerId = params[0];
      const match = db.bookings.filter((b: any) => b.owner_id === ownerId);
      return [match, null];
    }

    // SELECT * FROM bookings
    if (normalizedSql.toLowerCase().includes('from bookings')) {
      const sorted = [...db.bookings].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return [sorted, null];
    }

    // SELECT * FROM ads
    if (normalizedSql.toLowerCase().includes('from ads')) {
      return [db.ads, null];
    }
  }

  // 4. INSERT Queries
  if (normalizedSql.toUpperCase().startsWith('INSERT')) {
    if (normalizedSql.toLowerCase().includes('insert into users')) {
      const uid = params[0];
      const email = params[1];
      const password = params[2];
      const displayName = params[3];
      const role = params[4];
      const val: any = {
        id: uid,
        email,
        password,
        display_name: displayName,
        role: role || 'client',
        phone_number: params[5] || null,
        photo_url: params[6] || null,
        is_verified: params[7] !== undefined ? params[7] : 0,
        is_suspended: params[8] !== undefined ? params[8] : 0,
        created_at: params[9] || new Date().toISOString()
      };
      
      db.users = db.users.filter((u: any) => u.id !== uid && u.email !== email);
      db.users.push(val);
      saveDB(db);
      return [{ affectedRows: 1, insertId: uid }, null];
    }

    if (normalizedSql.toLowerCase().includes('insert into residences')) {
      const id = params[0];
      const owner_id = params[1] || 'usr_admin_default';
      const title = params[2];
      const description = params[3];
      const type = params[4] || 'appartement';
      const price_per_night = params[5];
      const advance_percentage = params[6];
      const cleaning_fee = params[7];
      const service_fee = params[8];
      const city = params[9];
      const neighborhood = params[10];
      const street = params[11];
      const status = params[12] || 'published';
      const availability_status = params[13] || 'available';

      const newIdNum = db.residences.length > 0 ? Math.max(...db.residences.map((r: any) => r.residence_id || 0)) + 1 : 1;
      const val = {
        residence_id: newIdNum,
        id,
        owner_id,
        title,
        description,
        type,
        price_per_night,
        advance_percentage,
        cleaning_fee,
        service_fee,
        city,
        neighborhood,
        street,
        status,
        availability_status,
        created_at: new Date().toISOString()
      };

      db.residences = db.residences.filter((r: any) => r.id !== id);
      db.residences.push(val);
      saveDB(db);
      return [{ affectedRows: 1, insertId: id }, null];
    }

    if (normalizedSql.toLowerCase().includes('insert into residence_images')) {
      const residence_id = params[0];
      const image_url = params[1];
      db.residence_images.push({ residence_id, image_url });
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }

    if (normalizedSql.toLowerCase().includes('insert into residence_amenities')) {
      const residence_id = params[0];
      const amenity = params[1];
      db.residence_amenities.push({ residence_id, amenity });
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }

    if (normalizedSql.toLowerCase().includes('insert into settings')) {
      const id = params[0];
      const data = params[1];
      db.settings = db.settings.filter((s: any) => s.id !== id);
      db.settings.push({ id, data });
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }

    if (normalizedSql.toLowerCase().includes('insert into bookings')) {
      const id = params[0];
      const residence_id = params[1];
      const client_id = params[2];
      const owner_id = params[3];
      const check_in = params[4];
      const check_out = params[5];
      const guests = params[6];
      const total_price = params[7];
      const advance_paid = params[8];
      const payment_status = params[9];
      const booking_status = params[10];

      const val = {
        id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, status: booking_status, booking_status,
        created_at: new Date().toISOString()
      };
      db.bookings = db.bookings.filter((b: any) => b.id !== id);
      db.bookings.push(val);
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }

    if (normalizedSql.toLowerCase().includes('insert into withdrawals')) {
      const id = params[0];
      const owner_id = params[1];
      const owner_name = params[2];
      const amount = params[3];
      const phone = params[4];
      const provider = params[5];
      const status = params[6];
      const val = {
        id, owner_id, owner_name, amount, phone, provider, status, created_at: new Date().toISOString()
      };
      db.withdrawals.push(val);
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }

    if (normalizedSql.toLowerCase().includes('insert into ads')) {
      const id = params[0];
      const title = params[1];
      const image_url = params[2];
      const link_url = params[3];
      const position = params[4];
      const active = params[5];
      const val = { id, title, image_url, link_url, position, active };
      db.ads.push(val);
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }
  }

  // 5. UPDATE Queries
  if (normalizedSql.toUpperCase().startsWith('UPDATE')) {
    if (normalizedSql.toLowerCase().includes('update residences')) {
      // Find where ID is
      const id = params[params.length - 1];
      const matchIndex = db.residences.findIndex((r: any) => r.id === id);
      if (matchIndex !== -1) {
        db.residences[matchIndex].title = params[0];
        db.residences[matchIndex].description = params[1];
        db.residences[matchIndex].type = params[2];
        db.residences[matchIndex].price_per_night = params[3];
        db.residences[matchIndex].advance_percentage = params[4];
        db.residences[matchIndex].cleaning_fee = params[5];
        db.residences[matchIndex].service_fee = params[6];
        db.residences[matchIndex].city = params[7];
        db.residences[matchIndex].neighborhood = params[8];
        db.residences[matchIndex].street = params[9];
        db.residences[matchIndex].availability_status = params[10];
        saveDB(db);
        return [{ affectedRows: 1 }, null];
      }
    }

    if (normalizedSql.toLowerCase().includes('update bookings')) {
      const status = params[0];
      const id = params[1];
      const matchIndex = db.bookings.findIndex((b: any) => b.id === id);
      if (matchIndex !== -1) {
        db.bookings[matchIndex].booking_status = status;
        db.bookings[matchIndex].status = status;
        db.bookings[matchIndex].payment_status = status === 'confirmed' ? 'paid' : db.bookings[matchIndex].payment_status;
        saveDB(db);
        return [{ affectedRows: 1 }, null];
      }
    }

    if (normalizedSql.toLowerCase().includes('update withdrawals')) {
      const status = params[0];
      const approvedAt = params[1];
      const id = params[2];
      const matchIndex = db.withdrawals.findIndex((w: any) => w.id === id);
      if (matchIndex !== -1) {
        db.withdrawals[matchIndex].status = status;
        db.withdrawals[matchIndex].approved_at = approvedAt;
        saveDB(db);
        return [{ affectedRows: 1 }, null];
      }
    }

    if (normalizedSql.toLowerCase().includes('update users')) {
      if (normalizedSql.toLowerCase().includes('role =') && normalizedSql.toLowerCase().includes('email =')) {
        const idVal = params[0];
        const roleVal = params[1];
        const emailVal = params[2];
        const matchIndex = db.users.findIndex((u: any) => u.email === emailVal);
        if (matchIndex !== -1) {
          db.users[matchIndex].id = idVal;
          db.users[matchIndex].role = roleVal;
          saveDB(db);
          return [{ affectedRows: 1 }, null];
        }
      }
    }
  }

  // 6. DELETE Queries
  if (normalizedSql.toUpperCase().startsWith('DELETE')) {
    if (normalizedSql.toLowerCase().includes('from residence_images')) {
      const resId = params[0];
      db.residence_images = db.residence_images.filter((i: any) => i.residence_id !== resId);
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }

    if (normalizedSql.toLowerCase().includes('from residence_amenities')) {
      const resId = params[0];
      db.residence_amenities = db.residence_amenities.filter((a: any) => a.residence_id !== resId);
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }

    if (normalizedSql.toLowerCase().includes('from residences')) {
      const id = params[0];
      db.residences = db.residences.filter((r: any) => r.id !== id);
      db.residence_images = db.residence_images.filter((i: any) => i.residence_id !== id);
      db.residence_amenities = db.residence_amenities.filter((a: any) => a.residence_id !== id);
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }

    if (normalizedSql.toLowerCase().includes('from ads')) {
      const id = params[0];
      db.ads = db.ads.filter((a: any) => a.id !== id);
      saveDB(db);
      return [{ affectedRows: 1 }, null];
    }
  }

  return [[], null];
}

// Transparent fail-safe Pool wrapper Proxy
const fallbackPool = {
  async execute(sql: string, params: any[] = []): Promise<[any, any]> {
    if (isFallbackMode) {
      return mockExecute(sql, params);
    }
    try {
      return await currentPool.execute(sql, params);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
        console.warn("⚠️ Base MariaDB inaccessible. Activation automatique de l'émulateur JSON persistant.");
        isFallbackMode = true;
        return mockExecute(sql, params);
      }
      throw err;
    }
  },
  async query(sql: string, params: any[] = []): Promise<[any, any]> {
    return this.execute(sql, params);
  },
  async end() {
    if (!isFallbackMode) {
      await currentPool.end();
    }
  }
};

export const pool = new Proxy({} as mysql.Pool, {
  get(target, prop, receiver) {
    const active = isFallbackMode ? fallbackPool : currentPool;
    const value = Reflect.get(active, prop);
    if (typeof value === 'function') {
      return function (this: any, ...args: any[]) {
        return value.apply(active, args);
      };
    }
    return value;
  }
});
