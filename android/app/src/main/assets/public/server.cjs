var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv4 = __toESM(require("dotenv"), 1);
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
var import_auth = require("firebase-admin/auth");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_bcrypt = __toESM(require("bcrypt"), 1);
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);

// src/db/index.ts
var import_dotenv3 = __toESM(require("dotenv"), 1);

// src/db/sqlite.ts
var import_sqlite3 = __toESM(require("sqlite3"), 1);
var import_sqlite = require("sqlite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path = __toESM(require("path"), 1);
import_dotenv.default.config();
var dbPromise = null;
var getDb = async () => {
  if (!dbPromise) {
    dbPromise = (0, import_sqlite.open)({
      filename: process.env.DB_SQLITE_PATH || import_path.default.join(process.cwd(), "database.sqlite"),
      driver: import_sqlite3.default.Database
    });
  }
  return dbPromise;
};
var dbQuery = async (query, params) => {
  try {
    const db = await getDb();
    if (query.trim().toUpperCase().startsWith("SELECT")) {
      return await db.all(query, params);
    } else {
      const result = await db.run(query, params);
      return result;
    }
  } catch (err) {
    console.error("SQLite Query Error:", err);
    throw err;
  }
};

// src/db/mariadb.ts
var import_mariadb = __toESM(require("mariadb"), 1);
var import_dotenv2 = __toESM(require("dotenv"), 1);
import_dotenv2.default.config();
var pool = import_mariadb.default.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "resifaso_db",
  connectionLimit: 5
});
var dbQuery2 = async (query, params) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(query, params);
    return rows;
  } catch (err) {
    console.error("MariaDB Query Error:", err);
    throw err;
  } finally {
    if (conn) conn.end();
  }
};

// src/db/index.ts
import_dotenv3.default.config();
var dbType = process.env.DB_TYPE || "sqlite";
var queryDatabase;
if (dbType === "mariadb") {
  queryDatabase = dbQuery2;
} else if (dbType === "sqlite") {
  queryDatabase = dbQuery;
} else {
  queryDatabase = async () => {
    throw new Error("Local query execution is disabled when using Firebase natively.");
  };
}
var executeSql = async (sql, params = []) => {
  return await queryDatabase(sql, params);
};

// src/db/init.ts
var initDatabase = async () => {
  const dbType2 = process.env.DB_TYPE || "sqlite";
  console.log(`Initializing local SQL database tables (Dialect: ${dbType2})...`);
  if (dbType2 === "mariadb") {
    await executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        phone_number VARCHAR(50),
        photo_url TEXT,
        role VARCHAR(50) DEFAULT 'client',
        is_verified BOOLEAN DEFAULT 0,
        is_suspended BOOLEAN DEFAULT 0,
        password_hash VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residences (
        id VARCHAR(128) PRIMARY KEY,
        owner_id VARCHAR(128) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(100),
        price_per_night DECIMAL(10, 2),
        advance_percentage DECIMAL(5, 2) DEFAULT 30,
        cleaning_fee DECIMAL(10, 2) DEFAULT 0,
        service_fee DECIMAL(10, 2) DEFAULT 0,
        city VARCHAR(100),
        neighborhood VARCHAR(100),
        street VARCHAR(255),
        capacity INTEGER,
        bedrooms INTEGER,
        beds INTEGER,
        bathrooms INTEGER,
        rooms INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        availability_status VARCHAR(50) DEFAULT 'available',
        promoted BOOLEAN DEFAULT 0,
        weekly_discount DECIMAL(5, 2) DEFAULT 0,
        monthly_discount DECIMAL(5, 2) DEFAULT 0,
        promo_price DECIMAL(10, 2),
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(uid) ON DELETE CASCADE
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_amenities (
        residence_id VARCHAR(128),
        amenity VARCHAR(100),
        PRIMARY KEY (residence_id, amenity),
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        residence_id VARCHAR(128),
        image_url TEXT NOT NULL,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(128) PRIMARY KEY,
        residence_id VARCHAR(128),
        client_id VARCHAR(128),
        owner_id VARCHAR(128),
        check_in VARCHAR(50),
        check_out VARCHAR(50),
        guests INTEGER,
        total_price DECIMAL(10, 2),
        advance_paid DECIMAL(10, 2) DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'pending',
        booking_status VARCHAR(50) DEFAULT 'pending',
        transaction_id VARCHAR(255),
        cancelled_by VARCHAR(50),
        cancellation_reason TEXT,
        cancelled_at VARCHAR(50),
        refund_status VARCHAR(50),
        refund_amount DECIMAL(10, 2),
        refund_phone VARCHAR(50),
        refund_provider VARCHAR(50),
        refund_processed_at VARCHAR(50),
        stay_status VARCHAR(50) DEFAULT 'upcoming',
        checked_in_at VARCHAR(50),
        checked_out_at VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE SET NULL,
        FOREIGN KEY(client_id) REFERENCES users(uid) ON DELETE SET NULL,
        FOREIGN KEY(owner_id) REFERENCES users(uid) ON DELETE SET NULL
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(128) PRIMARY KEY,
        booking_id VARCHAR(128),
        residence_id VARCHAR(128),
        client_id VARCHAR(128),
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE,
        FOREIGN KEY(client_id) REFERENCES users(uid) ON DELETE CASCADE
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(128) PRIMARY KEY,
        owner_id VARCHAR(128),
        amount DECIMAL(10, 2),
        phone VARCHAR(50),
        provider VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at VARCHAR(50),
        FOREIGN KEY(owner_id) REFERENCES users(uid) ON DELETE SET NULL
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        image_url TEXT,
        link_url TEXT,
        is_active BOOLEAN DEFAULT 1,
        frequency_seconds INTEGER DEFAULT 10,
        start_at VARCHAR(50),
        end_at VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS faq (
        id VARCHAR(128) PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100),
        order_index INTEGER DEFAULT 0
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(128) PRIMARY KEY,
        participants TEXT NOT NULL,
        last_message TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        related_id VARCHAR(128)
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(128) PRIMARY KEY,
        conversation_id VARCHAR(128),
        sender_id VARCHAR(128),
        text TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128),
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(uid) ON DELETE CASCADE
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(255) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        subject VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'unread',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        phone_number TEXT,
        photo_url TEXT,
        role TEXT DEFAULT 'client',
        is_verified BOOLEAN DEFAULT 0,
        is_suspended BOOLEAN DEFAULT 0,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residences (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        price_per_night REAL,
        advance_percentage REAL DEFAULT 30,
        cleaning_fee REAL DEFAULT 0,
        service_fee REAL DEFAULT 0,
        city TEXT,
        neighborhood TEXT,
        street TEXT,
        capacity INTEGER,
        bedrooms INTEGER,
        beds INTEGER,
        bathrooms INTEGER,
        rooms INTEGER,
        status TEXT DEFAULT 'pending',
        availability_status TEXT DEFAULT 'available',
        promoted BOOLEAN DEFAULT 0,
        weekly_discount REAL DEFAULT 0,
        monthly_discount REAL DEFAULT 0,
        promo_price REAL,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(uid)
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_amenities (
        residence_id TEXT,
        amenity TEXT,
        PRIMARY KEY (residence_id, amenity),
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        residence_id TEXT,
        image_url TEXT NOT NULL,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        residence_id TEXT,
        client_id TEXT,
        owner_id TEXT,
        check_in TEXT,
        check_out TEXT,
        guests INTEGER,
        total_price REAL,
        advance_paid REAL,
        payment_status TEXT DEFAULT 'pending',
        booking_status TEXT DEFAULT 'pending',
        transaction_id TEXT,
        cancelled_by TEXT,
        cancellation_reason TEXT,
        cancelled_at TEXT,
        refund_status TEXT,
        refund_amount REAL,
        refund_phone TEXT,
        refund_provider TEXT,
        refund_processed_at TEXT,
        stay_status TEXT DEFAULT 'upcoming',
        checked_in_at TEXT,
        checked_out_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(residence_id) REFERENCES residences(id),
        FOREIGN KEY(client_id) REFERENCES users(uid),
        FOREIGN KEY(owner_id) REFERENCES users(uid)
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        booking_id TEXT,
        residence_id TEXT,
        client_id TEXT,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(booking_id) REFERENCES bookings(id),
        FOREIGN KEY(residence_id) REFERENCES residences(id),
        FOREIGN KEY(client_id) REFERENCES users(uid)
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id TEXT PRIMARY KEY,
        owner_id TEXT,
        amount REAL,
        phone TEXT,
        provider TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at TEXT,
        FOREIGN KEY(owner_id) REFERENCES users(uid)
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        image_url TEXT,
        link_url TEXT,
        is_active BOOLEAN DEFAULT 1,
        frequency_seconds INTEGER DEFAULT 10,
        start_at TEXT,
        end_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS faq (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT,
        order_index INTEGER DEFAULT 0
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        participants TEXT NOT NULL,
        last_message TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        related_id TEXT
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        sender_id TEXT,
        text TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id)
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(uid)
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        subject TEXT,
        message TEXT,
        status TEXT DEFAULT 'unread',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  try {
    const existingGlobal = await executeSql("SELECT * FROM settings WHERE `key` = 'global'");
    if (!existingGlobal || existingGlobal.length === 0) {
      await executeSql("INSERT INTO settings (`key`, value) VALUES ('global', ?)", [JSON.stringify({})]);
      console.log("Seeded 'global' setting with default empty object.");
    }
  } catch (seedErr) {
    console.warn("Could not seed default settings:", seedErr.message);
  }
  console.log("SQL Database tables initialized successfully.");
};

// src/lib/auth-middleware.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Non autoris\xE9" });
  }
  import_jsonwebtoken.default.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token invalide ou expir\xE9" });
    }
    req.user = user;
    next();
  });
};

// src/db/queries.ts
var getAllUsers = async () => {
  return await executeSql("SELECT uid, email, display_name as displayName, role, photo_url as photoUrl, is_verified as isVerified, created_at as createdAt FROM users");
};
var getAllResidences = async () => {
  const residences = await executeSql(`
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      created_at as createdAt 
    FROM residences
  `);
  for (const res of residences) {
    const amenities = await executeSql("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [res.id]);
    res.amenities = amenities.map((a) => a.amenity);
    const images = await executeSql("SELECT image_url FROM residence_images WHERE residence_id = ?", [res.id]);
    res.images = images.map((i) => i.image_url);
    res.address = {
      city: res.city,
      neighborhood: res.neighborhood,
      street: res.street
    };
    res.utilitiesIncluded = { water: true, electricity: true };
  }
  return residences;
};
var getResidenceById = async (id) => {
  const res = await executeSql(`
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      created_at as createdAt 
    FROM residences WHERE id = ?`, [id]);
  if (!res[0]) return null;
  const residence = res[0];
  const amenities = await executeSql("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [id]);
  residence.amenities = amenities.map((a) => a.amenity);
  const images = await executeSql("SELECT image_url FROM residence_images WHERE residence_id = ?", [id]);
  residence.images = images.map((i) => i.image_url);
  residence.address = {
    city: residence.city,
    neighborhood: residence.neighborhood,
    street: residence.street
  };
  residence.utilitiesIncluded = { water: true, electricity: true };
  return residence;
};
var getSettings = async (key) => {
  const results = await executeSql("SELECT value FROM settings WHERE `key` = ?", [key]);
  return results.length > 0 ? JSON.parse(results[0].value) : {};
};
var saveSettings = async (key, value) => {
  const dbType2 = process.env.DB_TYPE || "sqlite";
  if (dbType2 === "mariadb") {
    await executeSql("INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?", [key, JSON.stringify(value), JSON.stringify(value)]);
  } else {
    await executeSql("INSERT INTO settings (`key`, value) VALUES (?, ?) ON CONFLICT(`key`) DO UPDATE SET value = ?", [key, JSON.stringify(value), JSON.stringify(value)]);
  }
};
var getAllAds = async () => {
  return await executeSql("SELECT * FROM advertisements ORDER BY created_at DESC");
};
var deleteResidence = async (id) => {
  await executeSql("DELETE FROM residence_amenities WHERE residence_id = ?", [id]);
  await executeSql("DELETE FROM residence_images WHERE residence_id = ?", [id]);
  await executeSql("DELETE FROM residences WHERE id = ?", [id]);
};
var toSnakeCase = (str) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
var updateResidence = async (id, updates) => {
  const { amenities, images, address, utilitiesIncluded, ...rest } = updates;
  const mappedUpdates = {};
  for (const [k, v] of Object.entries(rest)) {
    mappedUpdates[toSnakeCase(k)] = v;
  }
  if (address) {
    mappedUpdates.city = address.city;
    mappedUpdates.neighborhood = address.neighborhood;
    mappedUpdates.street = address.street;
  }
  const fields = Object.keys(mappedUpdates);
  if (fields.length > 0) {
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = Object.values(mappedUpdates);
    await executeSql(`UPDATE residences SET ${setClause} WHERE id = ?`, [...values, id]);
  }
  if (amenities) {
    await executeSql("DELETE FROM residence_amenities WHERE residence_id = ?", [id]);
    for (const a of amenities) {
      await executeSql("INSERT INTO residence_amenities (residence_id, amenity) VALUES (?, ?)", [id, a]);
    }
  }
  if (images) {
    await executeSql("DELETE FROM residence_images WHERE residence_id = ?", [id]);
    for (const img of images) {
      await executeSql("INSERT INTO residence_images (residence_id, image_url) VALUES (?, ?)", [id, img]);
    }
  }
};
var createResidence = async (res) => {
  const { amenities, images, address, utilitiesIncluded, ...rest } = res;
  const mappedObj = {};
  for (const [k, v] of Object.entries(rest)) {
    mappedObj[toSnakeCase(k)] = v;
  }
  if (address) {
    mappedObj.city = address.city;
    mappedObj.neighborhood = address.neighborhood;
    mappedObj.street = address.street;
  }
  const fields = Object.keys(mappedObj);
  const placeholders = fields.map(() => "?").join(", ");
  await executeSql(`INSERT INTO residences (${fields.join(", ")}) VALUES (${placeholders})`, Object.values(mappedObj));
  if (amenities) {
    for (const a of amenities) {
      await executeSql("INSERT INTO residence_amenities (residence_id, amenity) VALUES (?, ?)", [res.id, a]);
    }
  }
  if (images) {
    for (const img of images) {
      await executeSql("INSERT INTO residence_images (residence_id, image_url) VALUES (?, ?)", [res.id, img]);
    }
  }
};
var updateBookingStatus = async (id, updates) => {
  const fields = Object.keys(updates);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  await executeSql(`UPDATE bookings SET ${setClause} WHERE id = ?`, [...Object.values(updates), id]);
};
var updateUserProfile = async (uid, updates) => {
  const fields = Object.keys(updates);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  await executeSql(`UPDATE users SET ${setClause} WHERE uid = ?`, [...Object.values(updates), uid]);
};

// server.ts
import_dotenv4.default.config();
var JWT_SECRET2 = process.env.JWT_SECRET || "super-secret-key-change-me";
var DB_TYPE = process.env.DB_TYPE || "sqlite";
var currentFilename = typeof __filename !== "undefined" ? __filename : "";
var currentDirname = typeof __dirname !== "undefined" ? __dirname : currentFilename ? import_path2.default.dirname(currentFilename) : process.cwd();
var adminDb = null;
try {
  const configPath = import_path2.default.join(process.cwd(), "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    const config = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
    const apps = (0, import_app.getApps)();
    if (apps.length === 0) {
      (0, import_app.initializeApp)({
        projectId: config.projectId
      });
    }
    const dbId = config.firestoreDatabaseId || "(default)";
    adminDb = (0, import_firestore.getFirestore)(dbId);
    console.log(`Firebase Admin initialized for project ${config.projectId} and database ${dbId}`);
  } else {
    const apps = (0, import_app.getApps)();
    if (apps.length === 0) {
      (0, import_app.initializeApp)();
    }
    adminDb = (0, import_firestore.getFirestore)();
    console.log("Firebase Admin initialized with default ADC");
  }
} catch (e) {
  console.error("Firebase Admin initialization failed:", e);
}
var SAPPAY_BASE_PUBLIC_SANDBOX = "https://sandbox.sappay.net/api/v1";
var SAPPAY_BASE_CHECKOUT_SANDBOX = "https://sandbox.sappay.net/api/v1/checkout";
var SAPPAY_BASE_PUBLIC_PROD = "https://api.prod.sappay.net/api/public";
var SAPPAY_BASE_CHECKOUT_PROD = "https://api.prod.sappay.net/api/checkout";
async function getSappayCredentials() {
  if (DB_TYPE === "firebase" && adminDb) {
    try {
      const docSnap = await adminDb.collection("settings").doc("global").get();
      if (docSnap.exists) {
        const data = docSnap.data();
        return {
          clientId: data?.sappayClientId || process.env.SAPPAY_CLIENT_ID || "",
          clientSecret: data?.sappayClientSecret || process.env.SAPPAY_CLIENT_SECRET || "",
          username: data?.sappayUsername || process.env.SAPPAY_USERNAME || "",
          password: data?.sappayPassword || process.env.SAPPAY_PASSWORD || "",
          isTestMode: data?.isTestMode !== void 0 ? data.isTestMode : false
        };
      }
    } catch (e) {
      console.warn("Sappay: Error reading Firebase configuration:", e.message);
    }
  } else if (DB_TYPE !== "firebase") {
    try {
      const results = await executeSql("SELECT value FROM settings WHERE `key` = 'global'");
      if (results && results.length > 0) {
        const data = JSON.parse(results[0].value);
        return {
          clientId: data?.sappayClientId || process.env.SAPPAY_CLIENT_ID || "",
          clientSecret: data?.sappayClientSecret || process.env.SAPPAY_CLIENT_SECRET || "",
          username: data?.sappayUsername || process.env.SAPPAY_USERNAME || "",
          password: data?.sappayPassword || process.env.SAPPAY_PASSWORD || "",
          isTestMode: data?.isTestMode !== void 0 ? data.isTestMode : false
        };
      }
    } catch (e) {
      console.warn("Sappay: Error reading SQL configuration:", e.message);
    }
  }
  return {
    clientId: process.env.SAPPAY_CLIENT_ID || "IJIJhhArSLVJNIs2ylGwowxTCqm5t5br92lAPlgF",
    clientSecret: process.env.SAPPAY_CLIENT_SECRET || "7qrVeDjSmDQjHksFyzKriidK3iuSo3RK6h5voHnbXAAPZvQEQnF9LIPzjqOcg4POqmikuUoJ7ynI565leEzbFhSnKZynwCLVOChma3y7vesLBRwaoyixtLcknd4g6Rdm",
    username: process.env.SAPPAY_USERNAME || "mandemohamed68@gmail.com",
    password: process.env.SAPPAY_PASSWORD || "mm@27071986",
    isTestMode: false
  };
}
async function getSappayBaseUrls() {
  const creds = await getSappayCredentials();
  if (creds.isTestMode) {
    return {
      publicBase: process.env.SAPPAY_BASE_PUBLIC || SAPPAY_BASE_PUBLIC_SANDBOX,
      checkoutBase: process.env.SAPPAY_BASE_CHECKOUT || SAPPAY_BASE_CHECKOUT_SANDBOX
    };
  } else {
    return {
      publicBase: process.env.SAPPAY_BASE_PUBLIC_PROD || SAPPAY_BASE_PUBLIC_PROD,
      checkoutBase: process.env.SAPPAY_BASE_CHECKOUT_PROD || SAPPAY_BASE_CHECKOUT_PROD
    };
  }
}
function normalizePhoneNumberSappay(phone) {
  let clean = phone.replace(/\D/g, "");
  if (clean.length > 8) {
    if (clean.startsWith("226")) return clean.slice(-8);
    if (clean.startsWith("00226")) return clean.slice(-8);
  }
  return clean;
}
function findInvoiceId(responseData) {
  if (!responseData) return null;
  if (responseData.response?.invoice_detail?.invoice_id) return responseData.response.invoice_detail.invoice_id;
  if (responseData.response?.invoice_id) return responseData.response.invoice_id;
  if (responseData.invoice_id) return responseData.invoice_id;
  if (responseData.id) return responseData.id;
  if (responseData.data?.invoice_id) return responseData.data.invoice_id;
  if (responseData.data?.id) return responseData.data.id;
  return null;
}
async function getSappayToken() {
  const credentials = await getSappayCredentials();
  const urls = await getSappayBaseUrls();
  try {
    const response = await fetch(`${urls.publicBase}/authentication/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        grant_type: "password",
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password
      })
    });
    if (response.ok) {
      const data = await response.json();
      const token = data.access || data.access_token || data.token || data.response?.access || data.response?.access_token || data.response?.token;
      if (!token && !credentials.isTestMode) {
        throw new Error("Sappay a retourn\xE9 un succ\xE8s sans jeton d'acc\xE8s (access_token absent).");
      }
      return token || "mock_sappay_token_success";
    } else {
      const errorText = await response.text();
      if (!credentials.isTestMode) {
        throw new Error(`\xC9chec de l'authentification Sappay (${response.status}): ${errorText}`);
      }
      return "mock_sappay_token_fallback";
    }
  } catch (err) {
    if (!credentials.isTestMode) {
      throw new Error(`Erreur de connexion Sappay lors de l'authentification : ${err.message}`);
    }
    return "mock_sappay_token_error_fallback";
  }
}
async function startServer() {
  if (DB_TYPE !== "firebase") {
    try {
      await initDatabase();
    } catch (err) {
      console.error("Database initialization failed:", err);
    }
  }
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });
    try {
      if (DB_TYPE === "firebase") {
        return res.status(400).json({ error: "L'enregistrement direct n'est pas support\xE9 en mode Firebase." });
      }
      const existing = await executeSql("SELECT uid FROM users WHERE email = ?", [email]);
      if (existing && existing.length > 0) return res.status(400).json({ error: "Cet email est d\xE9j\xE0 utilis\xE9" });
      const hashedPassword = await import_bcrypt.default.hash(password, 10);
      const uid = "u_" + Math.random().toString(36).substr(2, 9);
      const role = email === "mandemohamed68@gmail.com" ? "admin" : "client";
      await executeSql(
        "INSERT INTO users (uid, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
        [uid, email, hashedPassword, displayName || "Voyageur", role]
      );
      const token = import_jsonwebtoken2.default.sign({ uid, email, role }, JWT_SECRET2, { expiresIn: "30d" });
      res.json({ token, user: { uid, email, displayName: displayName || "Voyageur", role } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      if (DB_TYPE === "firebase") {
        return res.status(400).json({ error: "L'authentification directe n'est pas support\xE9e en mode Firebase." });
      }
      const users = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
      if (!users || users.length === 0) return res.status(401).json({ error: "Identifiants invalides" });
      const user = users[0];
      if (!user.password_hash) return res.status(401).json({ error: "Compte sans mot de passe local. Utilisez l'auth sociale si configur\xE9e." });
      const match = await import_bcrypt.default.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: "Identifiants invalides" });
      const token = import_jsonwebtoken2.default.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET2, { expiresIn: "30d" });
      res.json({ token, user: { uid: user.uid, email: user.email, displayName: user.display_name, role: user.role } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      if (DB_TYPE === "firebase") return res.status(400).json({ error: "Non support\xE9 en mode Firebase" });
      const users = await executeSql("SELECT uid, email, display_name as displayName, role, photo_url as photoUrl, is_verified as isVerified FROM users WHERE uid = ?", [req.user?.uid]);
      if (!users || users.length === 0) return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
      res.json(users[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/residences", async (req, res) => {
    try {
      const list = await getAllResidences();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/residences/:id", async (req, res) => {
    try {
      const item = await getResidenceById(req.params.id);
      if (!item) return res.status(404).json({ error: "Non trouv\xE9" });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const data = await getSettings(req.params.key);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/settings/:key", authenticateToken, async (req, res) => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "R\xE9serv\xE9 aux admins" });
    try {
      await saveSettings(req.params.key, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/ads", async (req, res) => {
    try {
      const list = await getAllAds();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const list = await executeSql("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [req.user?.uid]);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      await executeSql("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user?.uid]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const notif = req.body;
      const id = `notif_${Date.now()}`;
      await executeSql(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, notif.userId, notif.title, notif.message, notif.type, 0]);
      res.json({ id, ...notif, is_read: 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/conversations", authenticateToken, async (req, res) => {
    try {
      const { participants, relatedId } = req.body;
      const existing = await executeSql("SELECT * FROM conversations WHERE participants LIKE ?", [`%${participants[0]}%`]);
      const conv = existing.find((c) => {
        const p = JSON.parse(c.participants);
        return p.length === participants.length && participants.every((id2) => p.includes(id2));
      });
      if (conv) {
        return res.json({ ...conv, participants: JSON.parse(conv.participants) });
      }
      const id = `conv_${Date.now()}`;
      await executeSql(`
        INSERT INTO conversations (id, participants, related_id)
        VALUES (?, ?, ?)
      `, [id, JSON.stringify(participants), relatedId || null]);
      res.json({ id, participants, related_id: relatedId || null });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/conversations/:id/messages", authenticateToken, async (req, res) => {
    try {
      const { senderId, text } = req.body;
      const id = `msg_${Date.now()}`;
      await executeSql(`
        INSERT INTO messages (id, conversation_id, sender_id, text)
        VALUES (?, ?, ?, ?)
      `, [id, req.params.id, senderId, text]);
      await executeSql("UPDATE conversations SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [text, req.params.id]);
      res.json({ id, conversation_id: req.params.id, senderId, text, created_at: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/conversations/:id/messages", authenticateToken, async (req, res) => {
    try {
      const list = await executeSql("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", [req.params.id]);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/withdrawals", authenticateToken, async (req, res) => {
    try {
      let query = "SELECT * FROM withdrawals";
      let params = [];
      if (req.user?.role !== "admin") {
        query += " WHERE owner_id = ?";
        params.push(req.user?.uid);
      }
      query += " ORDER BY created_at DESC";
      const list = await executeSql(query, params);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/withdrawals", authenticateToken, async (req, res) => {
    try {
      const data = req.body;
      const id = `with_${Date.now()}`;
      await executeSql(`
        INSERT INTO withdrawals (id, owner_id, amount, phone, provider, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, req.user?.uid, data.amount, data.phone, data.provider, "pending"]);
      res.json({ id, ...data, status: "pending" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/withdrawals/:id", authenticateToken, async (req, res) => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Interdit" });
    try {
      const { status, approvedAt } = req.body;
      await executeSql("UPDATE withdrawals SET status = ?, approved_at = ? WHERE id = ?", [status, approvedAt || null, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/residences/:id", authenticateToken, async (req, res) => {
    if (req.user?.role !== "admin" && req.user?.role !== "owner") return res.status(403).json({ error: "Interdit" });
    try {
      await deleteResidence(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/residences/:id", authenticateToken, async (req, res) => {
    try {
      await updateResidence(req.params.id, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/residences", authenticateToken, async (req, res) => {
    try {
      const id = `res_${Date.now()}`;
      await createResidence({ id, ...req.body, ownerId: req.user?.uid });
      res.json({ id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/bookings/:id", authenticateToken, async (req, res) => {
    try {
      await updateBookingStatus(req.params.id, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/users/:uid", authenticateToken, async (req, res) => {
    if (req.user?.uid !== req.params.uid && req.user?.role !== "admin") return res.status(403).json({ error: "Interdit" });
    try {
      await updateUserProfile(req.params.uid, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/admin/reset-db", authenticateToken, async (req, res) => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Interdit" });
    try {
      await executeSql("DELETE FROM bookings");
      await executeSql("DELETE FROM reviews");
      await executeSql("DELETE FROM notifications");
      await executeSql("DELETE FROM messages");
      await executeSql("DELETE FROM conversations");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/users", authenticateToken, async (req, res) => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Interdit" });
    try {
      const list = await getAllUsers();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/bookings", authenticateToken, async (req, res) => {
    try {
      const field = req.query.role === "owner" ? "owner_id" : "client_id";
      const list = await executeSql(`SELECT * FROM bookings WHERE ${field} = ? ORDER BY created_at DESC`, [req.user?.uid]);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/bookings", authenticateToken, async (req, res) => {
    try {
      const booking = req.body;
      const id = `book_${Date.now()}`;
      await executeSql(`
        INSERT INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, total_price, booking_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, booking.residenceId, req.user?.uid, booking.ownerId, booking.checkIn, booking.checkOut, booking.totalPrice, "pending"]);
      res.json({ id, ...booking, booking_status: "pending" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/residences/:id/bookings", async (req, res) => {
    try {
      const list = await executeSql("SELECT * FROM bookings WHERE residence_id = ? AND booking_status IN ('confirmed', 'pending')", [req.params.id]);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis" });
    try {
      let userExists = false;
      let emailSettings = null;
      if (DB_TYPE === "firebase") {
        if (!adminDb) throw new Error("Base de donn\xE9es non initialis\xE9e");
        const usersSnap = await adminDb.collection("users").where("email", "==", email).get();
        userExists = !usersSnap.empty;
        const settingsSnap = await adminDb.collection("settings").doc("email").get();
        if (settingsSnap.exists) emailSettings = settingsSnap.data();
      } else {
        const users = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
        userExists = users.length > 0;
        const settings = await executeSql("SELECT value FROM settings WHERE `key` = 'email'");
        if (settings.length > 0) emailSettings = JSON.parse(settings[0].value);
      }
      if (!userExists) {
        return res.status(404).json({ error: "Aucun utilisateur trouv\xE9 avec cet email" });
      }
      if (!emailSettings || !emailSettings.smtpHost) {
        return res.status(500).json({ error: "Le service d'envoi d'email n'est pas configur\xE9 par l'administrateur." });
      }
      let resetLink = "";
      if (DB_TYPE === "firebase") {
        resetLink = await (0, import_auth.getAuth)().generatePasswordResetLink(email);
      } else {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + 36e5).toISOString();
        if (DB_TYPE === "mariadb") {
          await executeSql("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?", [email, token, expiresAt, token, expiresAt]);
        } else {
          await executeSql("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET token = ?, expires_at = ?", [email, token, expiresAt, token, expiresAt]);
        }
        resetLink = `${req.headers.origin}?view=reset-password&email=${email}&token=${token}`;
      }
      const transporter = import_nodemailer.default.createTransport({
        host: emailSettings.smtpHost,
        port: Number(emailSettings.smtpPort),
        secure: emailSettings.smtpSecure,
        auth: {
          user: emailSettings.smtpUser,
          pass: emailSettings.smtpPass
        }
      });
      await transporter.sendMail({
        from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
        to: email,
        subject: "R\xE9initialisation de votre mot de passe - ResiFaso",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #e11d48; text-align: center;">ResiFaso</h2>
            <p>Bonjour,</p>
            <p>Vous avez demand\xE9 la r\xE9initialisation de votre mot de passe pour votre compte ResiFaso.</p>
            <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">R\xE9initialiser mon mot de passe</a>
            </div>
            <p>Si vous n'avez pas demand\xE9 ce changement, vous pouvez ignorer cet email en toute s\xE9curit\xE9.</p>
            <p>Ce lien expirera bient\xF4t.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666; text-align: center;">
              &copy; 2026 ResiFaso. Burkina Faso.
            </p>
          </div>
        `
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de l'envoi de l'email" });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;
    try {
      if (DB_TYPE === "firebase") {
        return res.status(400).json({ error: "Reset password for Firebase should be handled on client via reset link" });
      } else {
        const resets = await executeSql("SELECT * FROM password_resets WHERE email = ? AND token = ?", [email, token]);
        if (resets.length === 0) return res.status(400).json({ error: "Lien invalide ou expir\xE9" });
        const reset = resets[0];
        if (new Date(reset.expires_at) < /* @__PURE__ */ new Date()) {
          return res.status(400).json({ error: "Lien expir\xE9" });
        }
        const hashedPassword = await import_bcrypt.default.hash(newPassword, 10);
        await executeSql("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
        await executeSql("DELETE FROM password_resets WHERE email = ?", [email]);
        res.json({ success: true });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/admin/email-settings", async (req, res) => {
    try {
      if (DB_TYPE === "firebase") {
        if (!adminDb) throw new Error("Base de donn\xE9es non initialis\xE9e");
        const docSnap = await adminDb.collection("settings").doc("email").get();
        return res.json(docSnap.exists ? docSnap.data() : {});
      } else {
        const results = await executeSql("SELECT value FROM settings WHERE `key` = 'email'");
        return res.json(results.length > 0 ? JSON.parse(results[0].value) : {});
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/admin/email-settings", async (req, res) => {
    try {
      const settings = req.body;
      if (DB_TYPE === "firebase") {
        if (!adminDb) throw new Error("Base de donn\xE9es non initialis\xE9e");
        await adminDb.collection("settings").doc("email").set(settings, { merge: true });
      } else {
        if (DB_TYPE === "mariadb") {
          await executeSql("INSERT INTO settings (`key`, value) VALUES ('email', ?) ON DUPLICATE KEY UPDATE value = ?", [JSON.stringify(settings), JSON.stringify(settings)]);
        } else {
          await executeSql("INSERT INTO settings (`key`, value) VALUES ('email', ?) ON CONFLICT(`key`) DO UPDATE SET value = ?", [JSON.stringify(settings), JSON.stringify(settings)]);
        }
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/payment/sappay/init", async (req, res) => {
    try {
      const { amount, note, email } = req.body;
      const getCreds = await getSappayCredentials();
      const isTestMode = getCreds.isTestMode;
      const token = await getSappayToken();
      const urls = await getSappayBaseUrls();
      let invoiceResponse;
      try {
        invoiceResponse = await fetch(`${urls.publicBase}/invoice/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            type: "SIMPLE",
            customer: {
              email: email || "client@resifaso.com",
              country: 1
            },
            amount: Math.round(Number(amount)),
            note: note || `R\xE9servation RESIFASO #${Math.random().toString(36).substr(2, 5).toUpperCase()}`
          })
        });
      } catch (fetchErr) {
        if (!isTestMode) {
          return res.status(500).json({ error: `Erreur de connexion Sappay lors de la cr\xE9ation de la facture : ${fetchErr.message}` });
        }
        const mockInvoiceId = "inv_" + Math.random().toString(36).substr(2, 9);
        return res.json({
          invoice_id: mockInvoiceId,
          access_token: token,
          status: "PENDING",
          isMock: true
        });
      }
      let responseText = "";
      try {
        responseText = await invoiceResponse.text();
      } catch (e) {
        responseText = "Impossible de lire la r\xE9ponse.";
      }
      if (!invoiceResponse.ok) {
        if (!isTestMode) {
          return res.status(invoiceResponse.status).json({
            error: `Sappay Invoice API Error (${invoiceResponse.status})`,
            details: responseText
          });
        }
        console.warn(`Sappay invoice creation returned error (${invoiceResponse.status}). Rolling back to Sandbox mode.`);
        const mockInvoiceId = "inv_" + Math.random().toString(36).substr(2, 9);
        return res.json({
          invoice_id: mockInvoiceId,
          access_token: token,
          status: "PENDING",
          isMock: true
        });
      }
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Sappay response was not valid JSON: ${responseText.substring(0, 500)}`);
      }
      const invoiceId = findInvoiceId(responseData);
      if (!invoiceId) {
        return res.status(400).json({ error: "Could not retrieve Invoice ID from Sappay", details: responseData });
      }
      res.json({
        invoice_id: invoiceId,
        access_token: token,
        status: responseData.status || "PENDING"
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/payment/sappay/get-otp", async (req, res) => {
    try {
      const { customer_msisdn, invoice_id, payment_processor_id, access_token } = req.body;
      const getCreds = await getSappayCredentials();
      const isTestMode = getCreds.isTestMode;
      const urls = await getSappayBaseUrls();
      if (invoice_id && (invoice_id.startsWith("inv_") || invoice_id.includes("mock"))) {
        return res.json({
          status: "SUCCESS",
          trans_id: "tx_" + Math.random().toString(36).substr(2, 9),
          message: "SMS OTP envoy\xE9 avec succ\xE8s (Mode Sandbox)"
        });
      }
      const headers = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token}`;
      }
      let response;
      try {
        response = await fetch(`${urls.checkoutBase}/get-otp/`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
            invoice_id,
            payment_processor_id
          })
        });
      } catch (fetchErr) {
        if (!isTestMode) {
          return res.status(500).json({ error: `Erreur de connexion Sappay lors de la demande d'OTP : ${fetchErr.message}` });
        }
        return res.json({
          status: "SUCCESS",
          trans_id: "tx_" + Math.random().toString(36).substr(2, 9),
          message: "SMS OTP envoy\xE9 avec succ\xE8s (Mode Sandbox Fallback)"
        });
      }
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la r\xE9ponse.";
      }
      if (!response.ok) {
        if (!isTestMode) {
          return res.status(response.status).json({
            error: `La demande de code OTP aupr\xE8s de la passerelle Sappay a \xE9chou\xE9 (${response.status})`,
            details: responseText
          });
        }
        console.warn(`Sappay get-otp returned error (${response.status}). Using sandbox fallback.`);
        return res.json({
          status: "SUCCESS",
          trans_id: "tx_" + Math.random().toString(36).substr(2, 9),
          message: "SMS OTP envoy\xE9 avec succ\xE8s (Mode Sandbox Fallback)"
        });
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return res.status(500).json({ error: "Format de r\xE9ponse OTP invalide" });
      }
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/payment/sappay/perform", async (req, res) => {
    try {
      const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token } = req.body;
      const getCreds = await getSappayCredentials();
      const isTestMode = getCreds.isTestMode;
      const urls = await getSappayBaseUrls();
      if (invoice_id && (invoice_id.startsWith("inv_") || invoice_id.includes("mock"))) {
        if (otp.toString() === "1234" || otp.toString() === "123456" || otp.toString().length === 4 || otp.toString().length === 6) {
          return res.json({
            status: "SUCCESS",
            message: "Paiement effectu\xE9 avec succ\xE8s (Mode Sandbox)"
          });
        } else {
          return res.status(400).json({ error: "Code OTP invalide (Mode Sandbox)" });
        }
      }
      const payload = {
        invoice_id,
        payment_processor_id,
        customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
        otp: otp.toString()
      };
      if (trans_id) {
        payload.trans_id = trans_id;
      }
      const headers = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token}`;
      }
      let response;
      try {
        response = await fetch(`${urls.checkoutBase}/perform/`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
      } catch (fetchErr) {
        if (!isTestMode) {
          return res.status(500).json({ error: `Erreur de connexion Sappay (Perform) : ${fetchErr.message}` });
        }
        if (otp.toString() === "1234" || otp.toString() === "123456" || otp.toString().length === 4 || otp.toString().length === 6) {
          return res.json({
            status: "SUCCESS",
            message: "Paiement effectu\xE9 avec succ\xE8s (Mode Sandbox Fallback)"
          });
        }
        return res.status(400).json({
          error: "Code OTP invalide (Mode Sandbox Fallback)"
        });
      }
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la r\xE9ponse.";
      }
      if (!response.ok) {
        let errorTitle = `Erreur Sappay (${response.status})`;
        let detailMessage = responseText;
        try {
          const errData = JSON.parse(responseText);
          if (errData.message) detailMessage = errData.message;
          if (errData.error && typeof errData.error === "string") detailMessage = errData.error;
        } catch (e) {
        }
        if (!isTestMode) {
          return res.status(response.status).json({
            error: errorTitle,
            details: detailMessage
          });
        }
        console.warn(`Sappay perform returned error (${response.status}). Falling back to sandbox support.`);
        if (otp.toString() === "1234" || otp.toString() === "123456" || otp.toString().length === 4 || otp.toString().length === 6) {
          return res.json({
            status: "SUCCESS",
            message: "Paiement effectu\xE9 avec succ\xE8s (Mode Sandbox Fallback)"
          });
        }
        return res.status(response.status).json({
          error: "Erreur de validation du paiement",
          details: detailMessage
        });
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return res.status(500).json({ error: "Format de r\xE9ponse perform invalide" });
      }
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/submit-review", async (req, res) => {
    const { bookingId, residenceId, clientId, rating, comment, bookingRef } = req.body;
    try {
      if (!adminDb) {
        return res.status(500).json({ error: "Database not initialized. Please configure database credentials." });
      }
      await adminDb.collection("reviews").add({
        bookingId,
        residenceId,
        clientId,
        rating,
        comment,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const resRef = adminDb.collection("residences").doc(residenceId);
      const resDoc = await resRef.get();
      if (resDoc.exists) {
        const data = resDoc.data();
        const currentRating = data?.rating || 0;
        const currentCount = data?.reviewCount || 0;
        const newCount = currentCount + 1;
        const newRating = (currentRating * currentCount + rating) / newCount;
        await resRef.update({
          rating: Number(newRating.toFixed(1)),
          reviewCount: newCount
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error submitting review:", error);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });
  app.post("/api/payments/initiate", (req, res) => {
    const { phone, amount, provider } = req.body;
    console.log(`Initiating ${provider} payment for ${phone} of ${amount} FCFA`);
    res.json({
      status: "pending",
      transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
      message: "OTP sent to your phone"
    });
  });
  app.post("/api/payments/verify", (req, res) => {
    const { transactionId, otp } = req.body;
    console.log(`Verifying OTP ${otp} for transaction ${transactionId}`);
    if (otp === "1234") {
      res.json({ status: "success", message: "Payment confirmed" });
    } else {
      res.status(400).json({ status: "error", message: "Invalid OTP" });
    }
  });
  app.get("/api/db/generate-dump", async (req, res) => {
    try {
      if (!adminDb) {
        return res.status(500).json({ error: "Firebase Admin is not initialized." });
      }
      const escapeSql = (val) => {
        if (val === void 0 || val === null) return "NULL";
        if (typeof val === "boolean") return val ? 1 : 0;
        if (typeof val === "number") return val;
        if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      };
      let sql = `-- Dump Complet pour MariaDB / MySQL
`;
      sql += `-- G\xE9n\xE9r\xE9 le ${(/* @__PURE__ */ new Date()).toISOString()}
`;
      sql += `-- Contient toutes les tables, donn\xE9es et images

`;
      sql += `CREATE TABLE IF NOT EXISTS users (
`;
      sql += `  id VARCHAR(128) PRIMARY KEY,
`;
      sql += `  email VARCHAR(255) NOT NULL UNIQUE,
`;
      sql += `  display_name VARCHAR(255) NOT NULL,
`;
      sql += `  phone_number VARCHAR(50),
`;
      sql += `  photo_url TEXT,
`;
      sql += `  role VARCHAR(50) DEFAULT 'client',
`;
      sql += `  is_verified BOOLEAN DEFAULT FALSE,
`;
      sql += `  is_suspended BOOLEAN DEFAULT FALSE,
`;
      sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 4;

`;
      const usersSnap = await adminDb.collection("users").get();
      const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      if (users.length > 0) {
        users.forEach((u) => {
          sql += `INSERT IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at) VALUES (
`;
          sql += `  ${escapeSql(u.uid)},
`;
          sql += `  ${escapeSql(u.email)},
`;
          sql += `  ${escapeSql(u.displayName || u.display_name || "")},
`;
          sql += `  ${escapeSql(u.phoneNumber || u.phone_number || "")},
`;
          sql += `  ${escapeSql(u.photoURL || u.photo_url || "")},
`;
          sql += `  ${escapeSql(u.role || "client")},
`;
          sql += `  ${escapeSql(u.isVerified || false)},
`;
          sql += `  ${escapeSql(u.isSuspended || false)},
`;
          sql += `  ${escapeSql(u.createdAt ? u.createdAt.includes("T") ? new Date(u.createdAt).toISOString().replace("T", " ").substring(0, 19) : u.createdAt : (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19))}
`;
          sql += `);
`;
        });
        sql += "\n";
      }
      sql += `CREATE TABLE IF NOT EXISTS residences (
`;
      sql += `  id VARCHAR(128) PRIMARY KEY,
`;
      sql += `  owner_id VARCHAR(128) NOT NULL,
`;
      sql += `  owner_name VARCHAR(255),
`;
      sql += `  owner_phone VARCHAR(50),
`;
      sql += `  title VARCHAR(255) NOT NULL,
`;
      sql += `  description TEXT,
`;
      sql += `  type VARCHAR(100) NOT NULL,
`;
      sql += `  price_per_night DECIMAL(10, 2) NOT NULL,
`;
      sql += `  advance_percentage INT DEFAULT 0,
`;
      sql += `  cleaning_fee DECIMAL(10, 2) DEFAULT 0,
`;
      sql += `  service_fee DECIMAL(10, 2) DEFAULT 0,
`;
      sql += `  city VARCHAR(100),
`;
      sql += `  neighborhood VARCHAR(100),
`;
      sql += `  street VARCHAR(255),
`;
      sql += `  lat DECIMAL(10, 8),
`;
      sql += `  lng DECIMAL(11, 8),
`;
      sql += `  capacity INT DEFAULT 1,
`;
      sql += `  bedrooms INT DEFAULT 1,
`;
      sql += `  beds INT DEFAULT 1,
`;
      sql += `  bathrooms INT DEFAULT 1,
`;
      sql += `  rooms INT DEFAULT 1,
`;
      sql += `  status VARCHAR(50) DEFAULT 'pending',
`;
      sql += `  availability_status VARCHAR(50) DEFAULT 'available',
`;
      sql += `  promoted BOOLEAN DEFAULT FALSE,
`;
      sql += `  weekly_discount INT DEFAULT 0,
`;
      sql += `  monthly_discount INT DEFAULT 0,
`;
      sql += `  promo_price DECIMAL(10, 2),
`;
      sql += `  rejection_reason TEXT,
`;
      sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 4;

`;
      const resSnap = await adminDb.collection("residences").get();
      const residences = resSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (residences.length > 0) {
        residences.forEach((r) => {
          sql += `INSERT IGNORE INTO residences (id, owner_id, owner_name, owner_phone, title, description, type, price_per_night, advance_percentage, cleaning_fee, service_fee, city, neighborhood, street, lat, lng, capacity, bedrooms, beds, bathrooms, rooms, status, availability_status, promoted, weekly_discount, monthly_discount, promo_price, rejection_reason, created_at) VALUES (
`;
          sql += `  ${escapeSql(r.id)},
`;
          sql += `  ${escapeSql(r.ownerId || r.owner_id)},
`;
          sql += `  ${escapeSql(r.ownerName || r.owner_name || "")},
`;
          sql += `  ${escapeSql(r.ownerPhone || r.owner_phone || "")},
`;
          sql += `  ${escapeSql(r.title)},
`;
          sql += `  ${escapeSql(r.description)},
`;
          sql += `  ${escapeSql(r.type || "appartement")},
`;
          sql += `  ${escapeSql(r.pricePerNight || r.price || r.pricePerNight === 0 ? r.pricePerNight : 0)},
`;
          sql += `  ${escapeSql(r.advancePercentage || 0)},
`;
          sql += `  ${escapeSql(r.cleaningFee || 0)},
`;
          sql += `  ${escapeSql(r.serviceFee || 0)},
`;
          sql += `  ${escapeSql(r.address?.city || r.city || "")},
`;
          sql += `  ${escapeSql(r.address?.neighborhood || r.neighborhood || "")},
`;
          sql += `  ${escapeSql(r.address?.street || "")},
`;
          sql += `  ${escapeSql(r.lat || null)},
`;
          sql += `  ${escapeSql(r.lng || null)},
`;
          sql += `  ${escapeSql(r.capacity || 1)},
`;
          sql += `  ${escapeSql(r.bedrooms || 1)},
`;
          sql += `  ${escapeSql(r.beds || 1)},
`;
          sql += `  ${escapeSql(r.bathrooms || 1)},
`;
          sql += `  ${escapeSql(r.rooms || 1)},
`;
          sql += `  ${escapeSql(r.status || "pending")},
`;
          sql += `  ${escapeSql(r.availabilityStatus || "available")},
`;
          sql += `  ${escapeSql(r.promoted ? 1 : 0)},
`;
          sql += `  ${escapeSql(r.weeklyDiscount || 0)},
`;
          sql += `  ${escapeSql(r.monthlyDiscount || 0)},
`;
          sql += `  ${escapeSql(r.promoPrice || null)},
`;
          sql += `  ${escapeSql(r.rejectionReason || null)},
`;
          sql += `  ${escapeSql(r.createdAt ? r.createdAt.includes("T") ? new Date(r.createdAt).toISOString().replace("T", " ").substring(0, 19) : r.createdAt : (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19))}
`;
          sql += `);
`;
        });
        sql += "\n";
      }
      sql += `CREATE TABLE IF NOT EXISTS residence_amenities (
`;
      sql += `  residence_id VARCHAR(128),
`;
      sql += `  amenity VARCHAR(100),
`;
      sql += `  PRIMARY KEY (residence_id, amenity)
`;
      sql += `) PARTITION BY KEY(residence_id) PARTITIONS 4;

`;
      if (residences.length > 0) {
        residences.forEach((r) => {
          if (r.amenities && Array.isArray(r.amenities)) {
            r.amenities.forEach((a) => {
              sql += `INSERT IGNORE INTO residence_amenities (residence_id, amenity) VALUES (${escapeSql(r.id)}, ${escapeSql(a)});
`;
            });
          }
        });
        sql += "\n";
      }
      sql += `CREATE TABLE IF NOT EXISTS residence_images (
`;
      sql += `  id INT AUTO_INCREMENT PRIMARY KEY,
`;
      sql += `  residence_id VARCHAR(128),
`;
      sql += `  image_url TEXT NOT NULL
`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 4;

`;
      if (residences.length > 0) {
        residences.forEach((r) => {
          if (r.images && Array.isArray(r.images)) {
            r.images.forEach((img) => {
              sql += `INSERT IGNORE INTO residence_images (residence_id, image_url) VALUES (${escapeSql(r.id)}, ${escapeSql(img)});
`;
            });
          }
        });
        sql += "\n";
      }
      sql += `CREATE TABLE IF NOT EXISTS bookings (
`;
      sql += `  id VARCHAR(128) PRIMARY KEY,
`;
      sql += `  residence_id VARCHAR(128) NOT NULL,
`;
      sql += `  client_id VARCHAR(128) NOT NULL,
`;
      sql += `  owner_id VARCHAR(128) NOT NULL,
`;
      sql += `  check_in DATE NOT NULL,
`;
      sql += `  check_out DATE NOT NULL,
`;
      sql += `  guests INT DEFAULT 1,
`;
      sql += `  total_price DECIMAL(10, 2) NOT NULL,
`;
      sql += `  advance_paid DECIMAL(10, 2) DEFAULT 0,
`;
      sql += `  payment_status VARCHAR(50) DEFAULT 'pending',
`;
      sql += `  booking_status VARCHAR(50) DEFAULT 'pending',
`;
      sql += `  transaction_id VARCHAR(255),
`;
      sql += `  cancelled_by VARCHAR(50) NULL,
`;
      sql += `  cancellation_reason TEXT NULL,
`;
      sql += `  cancelled_at TIMESTAMP NULL,
`;
      sql += `  refund_status VARCHAR(50) DEFAULT 'none',
`;
      sql += `  refund_amount DECIMAL(10, 2) DEFAULT 0,
`;
      sql += `  refund_phone VARCHAR(50) NULL,
`;
      sql += `  refund_provider VARCHAR(50) NULL,
`;
      sql += `  refund_processed_at TIMESTAMP NULL,
`;
      sql += `  stay_status VARCHAR(50) DEFAULT 'pending',
`;
      sql += `  checked_in_at TIMESTAMP NULL,
`;
      sql += `  checked_out_at TIMESTAMP NULL,
`;
      sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 4;

`;
      const bSnap = await adminDb.collection("bookings").get();
      const bookings = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (bookings.length > 0) {
        bookings.forEach((b) => {
          sql += `INSERT IGNORE INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, booking_status, transaction_id, cancelled_by, cancellation_reason, cancelled_at, refund_status, refund_amount, refund_phone, refund_provider, refund_processed_at, stay_status, checked_in_at, checked_out_at, created_at) VALUES (
`;
          sql += `  ${escapeSql(b.id)},
`;
          sql += `  ${escapeSql(b.residenceId || b.residence_id)},
`;
          sql += `  ${escapeSql(b.clientId || b.client_id)},
`;
          sql += `  ${escapeSql(b.ownerId || b.owner_id)},
`;
          sql += `  ${escapeSql(b.checkIn ? b.checkIn.substring(0, 10) : "2023-01-01")},
`;
          sql += `  ${escapeSql(b.checkOut ? b.checkOut.substring(0, 10) : "2023-01-02")},
`;
          sql += `  ${escapeSql(b.guests || 1)},
`;
          sql += `  ${escapeSql(b.totalPrice || b.total_price || 0)},
`;
          sql += `  ${escapeSql(b.advancePaid || b.advance_paid || 0)},
`;
          sql += `  ${escapeSql(b.paymentStatus || b.payment_status || "pending")},
`;
          sql += `  ${escapeSql(b.bookingStatus || b.booking_status || b.status || "pending")},
`;
          sql += `  ${escapeSql(b.transactionId || b.transaction_id || null)},
`;
          sql += `  ${escapeSql(b.cancelledBy || b.cancelled_by || null)},
`;
          sql += `  ${escapeSql(b.cancellationReason || b.cancellation_reason || null)},
`;
          sql += `  ${escapeSql(b.cancelledAt ? b.cancelledAt.includes("T") ? new Date(b.cancelledAt).toISOString().replace("T", " ").substring(0, 19) : b.cancelledAt : null)},
`;
          sql += `  ${escapeSql(b.refundStatus || b.refund_status || "none")},
`;
          sql += `  ${escapeSql(b.refundAmount || b.refund_amount || 0)},
`;
          sql += `  ${escapeSql(b.refundPhone || b.refund_phone || null)},
`;
          sql += `  ${escapeSql(b.refundProvider || b.refund_provider || null)},
`;
          sql += `  ${escapeSql(b.refundProcessedAt ? b.refundProcessedAt.includes("T") ? new Date(b.refundProcessedAt).toISOString().replace("T", " ").substring(0, 19) : b.refundProcessedAt : null)},
`;
          sql += `  ${escapeSql(b.stayStatus || b.stay_status || "pending")},
`;
          sql += `  ${escapeSql(b.checkedInAt ? b.checkedInAt.includes("T") ? new Date(b.checkedInAt).toISOString().replace("T", " ").substring(0, 19) : b.checkedInAt : null)},
`;
          sql += `  ${escapeSql(b.checkedOutAt ? b.checkedOutAt.includes("T") ? new Date(b.checkedOutAt).toISOString().replace("T", " ").substring(0, 19) : b.checkedOutAt : null)},
`;
          sql += `  ${escapeSql(b.createdAt ? b.createdAt.includes("T") ? new Date(b.createdAt).toISOString().replace("T", " ").substring(0, 19) : b.createdAt : (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19))}
`;
          sql += `);
`;
        });
        sql += "\n";
      }
      sql += `CREATE TABLE IF NOT EXISTS reviews (
`;
      sql += `  id VARCHAR(128) PRIMARY KEY,
`;
      sql += `  booking_id VARCHAR(128) NOT NULL,
`;
      sql += `  residence_id VARCHAR(128) NOT NULL,
`;
      sql += `  client_id VARCHAR(128) NOT NULL,
`;
      sql += `  rating INT NOT NULL,
`;
      sql += `  comment TEXT,
`;
      sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 4;

`;
      const rvSnap = await adminDb.collection("reviews").get();
      const reviews = rvSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (reviews.length > 0) {
        reviews.forEach((rv) => {
          sql += `INSERT IGNORE INTO reviews (id, booking_id, residence_id, client_id, rating, comment, created_at) VALUES (
`;
          sql += `  ${escapeSql(rv.id)},
`;
          sql += `  ${escapeSql(rv.bookingId || rv.booking_id || "")},
`;
          sql += `  ${escapeSql(rv.residenceId || rv.residence_id || "")},
`;
          sql += `  ${escapeSql(rv.clientId || rv.client_id || "")},
`;
          sql += `  ${escapeSql(rv.rating)},
`;
          sql += `  ${escapeSql(rv.comment)},
`;
          sql += `  ${escapeSql(rv.createdAt ? rv.createdAt.includes("T") ? new Date(rv.createdAt).toISOString().replace("T", " ").substring(0, 19) : rv.createdAt : (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19))}
`;
          sql += `);
`;
        });
        sql += "\n";
      }
      sql += `CREATE TABLE IF NOT EXISTS withdrawals (
`;
      sql += `  id VARCHAR(128) PRIMARY KEY,
`;
      sql += `  owner_id VARCHAR(128) NOT NULL,
`;
      sql += `  owner_name VARCHAR(255),
`;
      sql += `  owner_email VARCHAR(255),
`;
      sql += `  amount DECIMAL(10, 2) NOT NULL,
`;
      sql += `  phone VARCHAR(50) NOT NULL,
`;
      sql += `  provider VARCHAR(50) NOT NULL,
`;
      sql += `  status VARCHAR(50) DEFAULT 'pending',
`;
      sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
`;
      sql += `  approved_at TIMESTAMP NULL
`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 4;

`;
      const wdSnap = await adminDb.collection("withdrawals").get();
      const withdrawals = wdSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (withdrawals.length > 0) {
        withdrawals.forEach((w) => {
          sql += `INSERT IGNORE INTO withdrawals (id, owner_id, owner_name, owner_email, amount, phone, provider, status, created_at, approved_at) VALUES (
`;
          sql += `  ${escapeSql(w.id)},
`;
          sql += `  ${escapeSql(w.ownerId || w.owner_id)},
`;
          sql += `  ${escapeSql(w.ownerName || w.owner_name || "")},
`;
          sql += `  ${escapeSql(w.ownerEmail || w.owner_email || "")},
`;
          sql += `  ${escapeSql(w.amount)},
`;
          sql += `  ${escapeSql(w.phone)},
`;
          sql += `  ${escapeSql(w.provider)},
`;
          sql += `  ${escapeSql(w.status)},
`;
          sql += `  ${escapeSql(w.createdAt ? String(w.createdAt).includes("T") ? new Date(w.createdAt).toISOString().replace("T", " ").substring(0, 19) : w.createdAt : (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19))},
`;
          sql += `  ${escapeSql(w.approvedAt || w.approved_at ? String(w.approvedAt || w.approved_at).includes("T") ? new Date(w.approvedAt || w.approved_at).toISOString().replace("T", " ").substring(0, 19) : w.approvedAt || w.approved_at : null)}
`;
          sql += `);
`;
        });
        sql += "\n";
      }
      sql += `CREATE TABLE IF NOT EXISTS advertisements (
`;
      sql += `  id VARCHAR(128) PRIMARY KEY,
`;
      sql += `  title VARCHAR(255) NOT NULL,
`;
      sql += `  description TEXT,
`;
      sql += `  image_url TEXT NOT NULL,
`;
      sql += `  link_url TEXT,
`;
      sql += `  is_active BOOLEAN DEFAULT TRUE,
`;
      sql += `  frequency_seconds INT DEFAULT 30,
`;
      sql += `  start_at TIMESTAMP NULL,
`;
      sql += `  end_at TIMESTAMP NULL,
`;
      sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 2;

`;
      const adSnap = await adminDb.collection("ads").get();
      const ads = adSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (ads.length > 0) {
        ads.forEach((ad) => {
          sql += `INSERT IGNORE INTO advertisements (id, title, description, image_url, link_url, is_active, frequency_seconds, start_at, end_at, created_at) VALUES (
`;
          sql += `  ${escapeSql(ad.id)},
`;
          sql += `  ${escapeSql(ad.title)},
`;
          sql += `  ${escapeSql(ad.description || "")},
`;
          sql += `  ${escapeSql(ad.imageUrl || ad.image_url || "")},
`;
          sql += `  ${escapeSql(ad.linkUrl || ad.link_url || "")},
`;
          sql += `  ${escapeSql(ad.isActive !== false ? 1 : 0)},
`;
          sql += `  ${escapeSql(ad.frequencySeconds || ad.frequency_seconds || 30)},
`;
          sql += `  ${escapeSql(ad.startAt || ad.start_at ? String(ad.startAt || ad.start_at).includes("T") ? new Date(ad.startAt || ad.start_at).toISOString().replace("T", " ").substring(0, 19) : ad.startAt || ad.start_at : null)},
`;
          sql += `  ${escapeSql(ad.endAt || ad.end_at ? String(ad.endAt || ad.end_at).includes("T") ? new Date(ad.endAt || ad.end_at).toISOString().replace("T", " ").substring(0, 19) : ad.endAt || ad.end_at : null)},
`;
          sql += `  ${escapeSql(ad.createdAt ? ad.createdAt.includes("T") ? new Date(ad.createdAt).toISOString().replace("T", " ").substring(0, 19) : ad.createdAt : (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19))}
`;
          sql += `);
`;
        });
        sql += "\n";
      }
      const dumpPath = import_path2.default.join(process.cwd(), "resifaso_dump_exported.sql");
      import_fs.default.writeFileSync(dumpPath, sql, "utf8");
      console.log(`Generated SQL dump successfully at: ${dumpPath}`);
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", 'attachment; filename="resifaso_dump_exported.sql"');
      res.send(sql);
    } catch (err) {
      console.error("Error generating SQL dump:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/db/query", async (req, res) => {
    try {
      const { sql, params } = req.body;
      if (!sql) {
        return res.status(400).json({ error: "Missing SQL query" });
      }
      if (DB_TYPE === "firebase") {
        return res.status(400).json({ error: "Local DB not configured. Set DB_TYPE to mariadb or sqlite." });
      }
      const result = await executeSql(sql, params || []);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error("SQL Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.use(import_express.default.static(import_path2.default.join(process.cwd(), "public")));
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
