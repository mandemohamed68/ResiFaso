var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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

// src/db/init.ts
var init_exports = {};
__export(init_exports, {
  initDatabase: () => initDatabase
});
var import_bcrypt, initDatabase;
var init_init = __esm({
  "src/db/init.ts"() {
    init_db();
    import_bcrypt = __toESM(require("bcrypt"), 1);
    initDatabase = async () => {
      const dbType2 = process.env.DB_TYPE || (process.env.NODE_ENV === "production" ? "mariadb" : "sqlite");
      console.log(`Initializing local SQL database tables (Dialect: ${dbType2})...`);
      const safeAlter = async (table, column, type) => {
        try {
          await executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        } catch (err) {
          const msg = err.message || "";
          if (msg.includes("duplicate") || msg.includes("already exists") || msg.includes("Duplicate")) {
            return;
          }
          console.warn(`Could not add ${column} to ${table}:`, msg);
        }
      };
      if (dbType2 === "mariadb") {
        console.log("Starting MariaDB schema initialization...");
        await executeSql("SET FOREIGN_KEY_CHECKS = 0");
        try {
          await executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(500),
        phone_number VARCHAR(50),
        photo_url LONGTEXT,
        role VARCHAR(50) DEFAULT 'client',
        is_verified BOOLEAN DEFAULT 0,
        is_suspended BOOLEAN DEFAULT 0,
        deactivated BOOLEAN DEFAULT 0,
        password_hash VARCHAR(255),
        identity_document_front LONGTEXT,
        identity_document_back LONGTEXT,
        permissions TEXT,
        id_number VARCHAR(255),
        id_type VARCHAR(255),
        id_expiry VARCHAR(255),
        id_card_url LONGTEXT,
        verification_status VARCHAR(50) DEFAULT 'none',
        commission_percentage DECIMAL(10, 2) NULL,
        host_cancellation_fee DECIMAL(10, 2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
          try {
            await executeSql("ALTER TABLE users ADD COLUMN commission_percentage DECIMAL(10, 2) NULL");
          } catch (err) {
          }
          try {
            await executeSql("ALTER TABLE users ADD COLUMN host_cancellation_fee DECIMAL(10, 2) DEFAULT 0");
          } catch (err) {
          }
          try {
            await executeSql("ALTER TABLE users ADD COLUMN host_cancellation_rules_text TEXT NULL");
          } catch (err) {
          }
          try {
            await executeSql("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255)");
            await executeSql("ALTER TABLE users MODIFY COLUMN display_name VARCHAR(500)");
            await executeSql("ALTER TABLE users MODIFY COLUMN identity_document_front LONGTEXT");
            await executeSql("ALTER TABLE users MODIFY COLUMN identity_document_back LONGTEXT");
            await executeSql("ALTER TABLE users MODIFY COLUMN id_card_url LONGTEXT");
          } catch (err) {
          }
          try {
            await executeSql("ALTER TABLE users CHANGE photo_url photo_url LONGTEXT");
          } catch (err) {
          }
          try {
            const columns = await executeSql(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = 'uid'
      `);
            if (!columns || columns.length === 0) {
              console.log("Migration MariaDB: La colonne 'uid' est manquante dans 'users'. Ajout en cours...");
              await executeSql("ALTER TABLE users ADD COLUMN uid VARCHAR(255) NULL");
              let updateQuery = "UPDATE users SET uid = email WHERE uid IS NULL OR uid = ''";
              try {
                const idCheck = await executeSql(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'
          `);
                if (idCheck && idCheck.length > 0) {
                  updateQuery = "UPDATE users SET uid = COALESCE(id, email) WHERE uid IS NULL OR uid = ''";
                }
              } catch (err) {
              }
              await executeSql(updateQuery);
              await executeSql("ALTER TABLE users MODIFY uid VARCHAR(255) NOT NULL");
              await executeSql("ALTER TABLE users ADD UNIQUE KEY uk_users_uid (uid)");
            } else {
              await executeSql("ALTER TABLE users MODIFY uid VARCHAR(255) NOT NULL");
            }
            try {
              const userCols = await executeSql("SHOW COLUMNS FROM users");
              if (Array.isArray(userCols)) {
                const colNames = userCols.map((c) => {
                  const val = String(c.Field || c.field || c.COLUMN_NAME || c.column_name || c.columnName || "");
                  return val.toLowerCase().replace(/[^a-z0-9]/g, "");
                });
                const hasPasswordHash = colNames.includes("passwordhash");
                const hasPassword = colNames.includes("password");
                if (!hasPasswordHash && hasPassword) {
                  try {
                    await executeSql("ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255)");
                  } catch (e) {
                  }
                } else if (!hasPasswordHash && !hasPassword) {
                  try {
                    await executeSql("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)");
                  } catch (e) {
                  }
                }
              }
            } catch (e) {
            }
            const extraCols = [
              "identity_document_front",
              "identity_document_back",
              "permissions",
              "id_number",
              "id_type",
              "id_expiry",
              "id_card_url",
              "verification_status",
              "has_accepted_terms",
              "host_cancellation_fee",
              "host_cancellation_rules_text",
              "deactivated",
              "commission_percentage"
            ];
            for (const col of extraCols) {
              const columns2 = await executeSql(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = ?
        `, [col]);
              if (!columns2 || columns2.length === 0) {
                console.log(`Migration MariaDB: Ajout de la colonne '${col}'...`);
                let typeDef = "LONGTEXT NULL";
                if (col === "verification_status") {
                  typeDef = "VARCHAR(50) DEFAULT 'none'";
                } else if (["id_card_url", "identity_document_front", "identity_document_back", "display_name"].includes(col)) {
                  typeDef = "LONGTEXT NULL";
                } else if (["id_number", "id_type", "id_expiry"].includes(col)) {
                  typeDef = "VARCHAR(255) NULL";
                } else if (col === "has_accepted_terms") {
                  typeDef = "BOOLEAN DEFAULT 0";
                } else if (col === "host_cancellation_fee" || col === "commission_percentage") {
                  typeDef = "DECIMAL(10, 2) DEFAULT NULL";
                  if (col === "host_cancellation_fee") typeDef = "DECIMAL(10, 2) DEFAULT 0";
                } else if (col === "host_cancellation_rules_text") {
                  typeDef = "TEXT NULL";
                }
                try {
                  await executeSql(`ALTER TABLE users ADD COLUMN ${col} ${typeDef}`);
                } catch (err) {
                }
              }
            }
          } catch (err) {
            console.warn("Migration MariaDB users check failed:", err.message);
          }
          try {
            await executeSql(`
        CREATE TRIGGER IF NOT EXISTS before_insert_users
        BEFORE INSERT ON users
        FOR EACH ROW
        BEGIN
          IF NEW.id IS NULL AND NEW.uid IS NOT NULL THEN
            SET NEW.id = NEW.uid;
          ELSEIF NEW.uid IS NULL AND NEW.id IS NOT NULL THEN
            SET NEW.uid = NEW.id;
          END IF;
        END
      `);
            console.log("Migration MariaDB: D\xE9clencheur before_insert_users op\xE9rationnel.");
          } catch (err) {
            console.warn("Avertissement: Impossible de cr\xE9er ou v\xE9rifier le d\xE9clencheur before_insert_users (cela est normal si l'utilisateur de la base de donn\xE9es n'a pas les privil\xE8ges TRIGGER):", err.message);
          }
          await executeSql(`
      CREATE TABLE IF NOT EXISTS residences (
        id VARCHAR(128) PRIMARY KEY,
        owner_id VARCHAR(128) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(100),
        price_per_night DECIMAL(10, 2),
        advance_percentage DECIMAL(5, 2) DEFAULT 100,
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
        utilities_included TEXT,
        owner_phone VARCHAR(50),
        rating DECIMAL(3, 2) DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(uid) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
          try {
            const ratingCols = await executeSql("SHOW COLUMNS FROM residences LIKE 'rating'");
            if (!ratingCols || ratingCols.length === 0) {
              await executeSql("ALTER TABLE residences ADD COLUMN rating DECIMAL(3, 2) DEFAULT 0");
              await executeSql("ALTER TABLE residences ADD COLUMN review_count INTEGER DEFAULT 0");
              console.log("Migration MariaDB: Colonnes rating et review_count ajout\xE9es \xE0 la table residences.");
            }
          } catch (err) {
            console.warn("Avertissement migration MariaDB residences.rating/review_count:", err.message);
          }
          try {
            const phoneCols = await executeSql("SHOW COLUMNS FROM residences LIKE 'owner_phone'");
            if (!phoneCols || phoneCols.length === 0) {
              await executeSql("ALTER TABLE residences ADD COLUMN owner_phone VARCHAR(50)");
              console.log("Migration MariaDB: Colonne owner_phone ajout\xE9e \xE0 la table residences.");
            }
          } catch (phoneErr) {
            console.warn("Avertissement migration MariaDB residences.owner_phone:", phoneErr.message);
          }
          try {
            const cols = await executeSql("SHOW COLUMNS FROM residences LIKE 'utilities_included'");
            if (!cols || cols.length === 0) {
              await executeSql("ALTER TABLE residences ADD COLUMN utilities_included TEXT");
              console.log("Migration MariaDB: Colonne utilities_included ajout\xE9e \xE0 la table residences.");
            }
          } catch (colErr) {
            console.warn("Avertissement migration MariaDB residences.utilities_included:", colErr.message);
          }
          try {
            await executeSql("ALTER TABLE residences MODIFY COLUMN type VARCHAR(100) NULL");
            console.log("Migration MariaDB: Colonne type de residences modifi\xE9e en VARCHAR(100).");
          } catch (typeErr) {
            console.warn("Avertissement migration MariaDB residences.type:", typeErr.message);
          }
          await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_amenities (
        residence_id VARCHAR(128),
        amenity VARCHAR(100),
        PRIMARY KEY (residence_id, amenity),
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
          await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        residence_id VARCHAR(128),
        image_url LONGTEXT NOT NULL,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
          try {
            await executeSql("ALTER TABLE residence_images CHANGE image_url image_url LONGTEXT");
          } catch (err) {
          }
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
        host_cancellation_fee DECIMAL(10, 2) DEFAULT 0,
        nights_consumed INTEGER DEFAULT 0,
        cost_of_nights_spent DECIMAL(10, 2) DEFAULT 0,
        verifications_status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE SET NULL,
        FOREIGN KEY(client_id) REFERENCES users(uid) ON DELETE SET NULL,
        FOREIGN KEY(owner_id) REFERENCES users(uid) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
          try {
            const colCheck = await executeSql("SHOW COLUMNS FROM bookings LIKE 'verifications_status'");
            if (!colCheck || colCheck.length === 0) {
              await executeSql("ALTER TABLE bookings ADD COLUMN verifications_status VARCHAR(50) DEFAULT 'pending'");
              console.log("Migration MariaDB: Colonne verifications_status ajout\xE9e \xE0 la table bookings.");
            }
          } catch (err) {
            console.warn("Avertissement migration MariaDB bookings.verifications_status:", err.message);
          }
          try {
            const colCheck = await executeSql("SHOW COLUMNS FROM bookings LIKE 'refund_reason'");
            if (!colCheck || colCheck.length === 0) {
              await executeSql("ALTER TABLE bookings ADD COLUMN refund_reason TEXT NULL");
            }
          } catch (err) {
          }
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
      ) ENGINE=InnoDB
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
      ) ENGINE=InnoDB
    `);
          await executeSql(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        image_url LONGTEXT,
        link_url TEXT,
        is_active BOOLEAN DEFAULT 1,
        frequency_seconds INTEGER DEFAULT 10,
        start_at VARCHAR(50),
        end_at VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
          try {
            await executeSql("ALTER TABLE advertisements CHANGE image_url image_url LONGTEXT");
          } catch (err) {
          }
          await executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      ) ENGINE=InnoDB
    `);
          try {
            await executeSql(`
        CREATE TABLE IF NOT EXISTS faqs (
          id VARCHAR(128) PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          category VARCHAR(100),
          \`order\` INTEGER DEFAULT 0
        ) ENGINE=InnoDB
      `);
            console.log("Table 'faqs' checked/created successfully.");
          } catch (err) {
            console.error("Error creating faqs table:", err.message);
          }
          await executeSql(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(128) PRIMARY KEY,
        participants TEXT NOT NULL,
        last_message TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        related_id VARCHAR(128)
      ) ENGINE=InnoDB
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
      ) ENGINE=InnoDB
    `);
          try {
            let uidLength = 128;
            let collationClause = "";
            try {
              const uidCols = await executeSql(`
          SELECT 
            CHARACTER_MAXIMUM_LENGTH AS max_len,
            CHARACTER_SET_NAME AS char_set,
            COLLATION_NAME AS coll_name
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'uid'
        `);
              if (uidCols && uidCols.length > 0) {
                const maxLen = uidCols[0].maxLen;
                const charSet = uidCols[0].charSet;
                const collName = uidCols[0].collName;
                if (maxLen) {
                  uidLength = Number(maxLen);
                }
                if (charSet && collName) {
                  collationClause = ` CHARACTER SET ${charSet} COLLATE ${collName}`;
                }
              }
            } catch (lenErr) {
            }
            await executeSql(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(${uidLength})${collationClause} NOT NULL,
          title VARCHAR(255),
          message TEXT,
          type VARCHAR(50),
          is_read BOOLEAN DEFAULT 0,
          reference_id VARCHAR(128),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
      `);
            try {
              const columns = await executeSql("SHOW COLUMNS FROM notifications LIKE 'reference_id'");
              if (!columns || columns.length === 0) {
                await executeSql("ALTER TABLE notifications ADD COLUMN reference_id VARCHAR(128)");
              }
            } catch (colErr) {
            }
            try {
              await executeSql(`ALTER TABLE notifications MODIFY COLUMN user_id VARCHAR(${uidLength})${collationClause} NOT NULL`);
            } catch (modifyErr) {
            }
            try {
              const existingFks = await executeSql("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND CONSTRAINT_NAME = 'fk_notifications_user'");
              if (!existingFks || existingFks.length === 0) {
                await executeSql("ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY(user_id) REFERENCES users(uid) ON DELETE CASCADE");
              }
            } catch (fkErr) {
              console.warn("FK notification creation warning (maybe already exists):", fkErr.message);
            }
          } catch (err) {
            console.error("Erreur table notifications:", err.message);
          }
          await executeSql(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(255) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL
      ) ENGINE=InnoDB
    `);
          await executeSql(`
      CREATE TABLE IF NOT EXISTS support_chat_messages (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        sender_id VARCHAR(128) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(uid) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
          await executeSql(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id VARCHAR(128) NOT NULL,
        residence_id VARCHAR(128) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, residence_id),
        FOREIGN KEY(user_id) REFERENCES users(uid) ON DELETE CASCADE,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
          await executeSql(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        subject VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'unread',
        admin_notes TEXT,
        replied_at VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
          try {
            const cols_msg = await executeSql("SHOW COLUMNS FROM contact_messages LIKE 'admin_notes'");
            if (!cols_msg || cols_msg.length === 0) {
              await executeSql("ALTER TABLE contact_messages ADD COLUMN admin_notes TEXT");
            }
            const cols_msg_replied = await executeSql("SHOW COLUMNS FROM contact_messages LIKE 'replied_at'");
            if (!cols_msg_replied || cols_msg_replied.length === 0) {
              await executeSql("ALTER TABLE contact_messages ADD COLUMN replied_at VARCHAR(50)");
            }
            console.log("Migration MariaDB: Colonnes admin_notes et replied_at v\xE9rifi\xE9es pour contact_messages.");
          } catch (msgColErr) {
            console.warn("Avertissement migration MariaDB contact_messages:", msgColErr.message);
          }
          await executeSql(`
      CREATE TABLE IF NOT EXISTS partners (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        logo_url LONGTEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        website_url VARCHAR(500) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
          await safeAlter("partners", "website_url", "VARCHAR(500) NULL");
        } finally {
          await executeSql("SET FOREIGN_KEY_CHECKS = 1");
        }
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
        deactivated BOOLEAN DEFAULT 0,
        password_hash TEXT,
        identity_document_front TEXT,
        identity_document_back TEXT,
        permissions TEXT,
        id_number TEXT,
        id_type TEXT,
        id_expiry TEXT,
        id_card_url TEXT,
        verification_status TEXT DEFAULT 'none',
        commission_percentage REAL NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        const sqliteExtraCols = [
          { name: "identity_document_front", type: "TEXT" },
          { name: "identity_document_back", type: "TEXT" },
          { name: "permissions", type: "TEXT" },
          { name: "id_number", type: "TEXT" },
          { name: "id_type", type: "TEXT" },
          { name: "id_expiry", type: "TEXT" },
          { name: "id_card_url", type: "TEXT" },
          { name: "verification_status", type: "TEXT DEFAULT 'none'" },
          { name: "has_accepted_terms", type: "INTEGER DEFAULT 0" },
          { name: "host_cancellation_fee", type: "REAL DEFAULT 0" },
          { name: "host_cancellation_rules_text", type: "TEXT" },
          { name: "deactivated", type: "INTEGER DEFAULT 0" },
          { name: "commission_percentage", type: "REAL NULL" }
        ];
        for (const col of sqliteExtraCols) {
          await safeAlter("users", col.name, col.type);
        }
        await executeSql(`
      CREATE TABLE IF NOT EXISTS residences (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        price_per_night REAL,
        advance_percentage REAL DEFAULT 100,
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
        utilities_included TEXT,
        owner_phone TEXT,
        rating REAL DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(uid)
      )
    `);
        await safeAlter("residences", "utilities_included", "TEXT");
        await safeAlter("residences", "owner_phone", "TEXT");
        await safeAlter("residences", "rating", "REAL DEFAULT 0");
        await safeAlter("residences", "review_count", "INTEGER DEFAULT 0");
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
        host_cancellation_fee REAL DEFAULT 0,
        nights_consumed INTEGER DEFAULT 0,
        cost_of_nights_spent REAL DEFAULT 0,
        verifications_status TEXT DEFAULT 'pending',
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
        try {
          await executeSql(`
        CREATE TABLE IF NOT EXISTS faqs (
          id TEXT PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          category TEXT,
          \`order\` INTEGER DEFAULT 0
        )
      `);
        } catch (err) {
          console.error("Error creating faqs table (sqlite):", err.message);
        }
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
      CREATE TABLE IF NOT EXISTS support_chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(uid)
      )
    `);
        await executeSql(`
      CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo_url TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        website_url TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await safeAlter("partners", "website_url", "TEXT NULL");
        await executeSql(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        is_read BOOLEAN DEFAULT 0,
        reference_id TEXT,
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
        admin_notes TEXT,
        replied_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await safeAlter("contact_messages", "admin_notes", "TEXT");
        await safeAlter("contact_messages", "replied_at", "TEXT");
      }
      await executeSql(`
      CREATE TABLE IF NOT EXISTS verification_types (
        id VARCHAR(100) PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
      await safeAlter("bookings", "verifications_status", "TEXT");
      await safeAlter("bookings", "host_cancellation_fee", "REAL DEFAULT 0");
      await safeAlter("bookings", "nights_consumed", "INTEGER DEFAULT 0");
      await safeAlter("bookings", "cost_of_nights_spent", "REAL DEFAULT 0");
      try {
        const existingTypes = await executeSql("SELECT id FROM verification_types LIMIT 1");
        if (!existingTypes || existingTypes.length === 0) {
          const defaultTypes = [
            { id: "id_valid", label: "Pi\xE8ce d\u2019identit\xE9 valide (recto/verso)", description: "V\xE9rifier que la pi\xE8ce est originale et en cours de validit\xE9." },
            { id: "age_check", label: "\xC2ge \u2265 18 ans", description: "V\xE9rifier que le client est majeur." },
            { id: "name_match", label: "Correspondance du nom", description: "Le nom sur la pi\xE8ce doit correspondre au nom de la r\xE9servation." },
            { id: "contract_sign", label: "Signature du contrat", description: "Si applicable, le contrat de location a \xE9t\xE9 sign\xE9." }
          ];
          for (const type of defaultTypes) {
            await executeSql(
              "INSERT INTO verification_types (id, label, description, is_active) VALUES (?, ?, ?, 1)",
              [type.id, type.label, type.description]
            );
          }
        }
      } catch (err) {
      }
      try {
        const existingGlobal = await executeSql("SELECT * FROM settings WHERE `key` = 'global'");
        if (!existingGlobal || existingGlobal.length === 0) {
          await executeSql("INSERT INTO settings (`key`, value) VALUES ('global', ?)", [JSON.stringify({})]);
          console.log("Seeded 'global' setting with default empty object.");
        }
        const existingCommission = await executeSql("SELECT * FROM settings WHERE `key` = 'platform_commission'");
        if (!existingCommission || existingCommission.length === 0) {
          await executeSql("INSERT INTO settings (`key`, value) VALUES ('platform_commission', '10')");
          console.log("Seeded 'platform_commission' setting with 10%.");
        }
      } catch (seedErr) {
        console.warn("Could not seed default settings:", seedErr.message);
      }
      try {
        const existingFaqs = await executeSql("SELECT id FROM faqs LIMIT 1");
        if (!existingFaqs || existingFaqs.length === 0) {
          console.log("Seeding default FAQs...");
          const defaultFaqs = [
            {
              id: "faq_gen_1",
              question: "Qu'est-ce que ResiFaso ?",
              answer: "ResiFaso est la plateforme de r\xE9f\xE9rence au Burkina Faso pour la r\xE9servation de r\xE9sidences meubl\xE9es, d'appartements et de chambres d'h\xF4tes. Nous connectons des h\xF4tes locaux de confiance avec des voyageurs \xE0 la recherche d'un s\xE9jour confortable et s\xE9curis\xE9.",
              category: "general",
              order: 1
            },
            {
              id: "faq_gen_2",
              question: "Comment puis-je contacter l'assistance client\xE8le ?",
              answer: "Vous pouvez nous contacter directement en remplissant notre formulaire sur la page de Contact, ou nous envoyer un message via WhatsApp ou par appel t\xE9l\xE9phonique pour obtenir une r\xE9ponse rapide de nos \xE9quipes.",
              category: "general",
              order: 2
            },
            {
              id: "faq_book_1",
              question: "Comment r\xE9server une r\xE9sidence sur ResiFaso ?",
              answer: "Recherchez la ville ou le quartier de votre choix, s\xE9lectionnez la r\xE9sidence qui r\xE9pond \xE0 vos besoins, choisissez vos dates et cliquez sur 'R\xE9server'. Vous devrez ensuite verser l'acompte de garantie requis par Mobile Money pour confirmer votre r\xE9servation.",
              category: "booking",
              order: 1
            },
            {
              id: "faq_book_2",
              question: "Puis-je modifier ou annuler ma r\xE9servation ?",
              answer: "Oui, vous pouvez demander l'annulation de votre s\xE9jour depuis votre espace client dans l'onglet 'Mes S\xE9jours'. Selon la politique d'annulation de l'h\xF4te et la proximit\xE9 de votre s\xE9jour, un remboursement calcul\xE9 sur l'acompte pourra \xEAtre accord\xE9 (hors commission de service).",
              category: "booking",
              order: 2
            },
            {
              id: "faq_pay_1",
              question: "Quels sont les moyens de paiement accept\xE9s ?",
              answer: "Nous acceptons les paiements mobiles les plus populaires au Burkina Faso : Orange Money, Moov Money, Telecel Money et Coris Money. Toutes les transactions sont chiffr\xE9es et hautement s\xE9curis\xE9es pour votre s\xE9r\xE9nit\xE9.",
              category: "payment",
              order: 1
            },
            {
              id: "faq_pay_2",
              question: "Comment fonctionne l'acompte et le solde restant ?",
              answer: "Pour r\xE9server une r\xE9sidence, vous payez l'acompte exig\xE9 en ligne via Mobile Money lors de la confirmation. Le solde restant doit \xEAtre r\xE9gl\xE9 directement \xE0 l'h\xF4te lors de votre arriv\xE9e et de la remise des cl\xE9s.",
              category: "payment",
              order: 2
            },
            {
              id: "faq_host_1",
              question: "Comment inscrire ma r\xE9sidence ou mon appartement ?",
              answer: "Inscrivez-vous sur ResiFaso, acc\xE9dez \xE0 votre profil et demandez \xE0 activer l'espace H\xF4te. Une fois activ\xE9, vous pourrez lister vos propri\xE9t\xE9s avec des photos, descriptifs, tarifs, secteur et \xE9quipements gratuitement.",
              category: "host",
              order: 1
            },
            {
              id: "faq_host_2",
              question: "Comment et quand puis-je retirer mes gains d'h\xF4te ?",
              answer: "Les acomptes pay\xE9s en ligne par vos clients sont ajout\xE9s \xE0 votre portefeuille h\xF4te. Vous pouvez soumettre une demande de retrait vers votre compte Orange Money, Moov Money, Telecel Money ou Coris Money directement depuis votre tableau de bord d\xE8s que vous le souhaitez.",
              category: "host",
              order: 2
            }
          ];
          for (const faq of defaultFaqs) {
            await executeSql(
              "INSERT INTO faqs (id, question, answer, category, `order`) VALUES (?, ?, ?, ?, ?)",
              [faq.id, faq.question, faq.answer, faq.category, faq.order]
            );
          }
          console.log("Seeded 8 default FAQ questions successfully.");
        }
      } catch (faqErr) {
        console.warn("Could not seed default FAQs:", faqErr.message);
      }
      try {
        const superAdminEmail = "mandemohamed68@gmail.com";
        const superAdminPass = "mm@27071986@";
        const existing = await executeSql("SELECT uid FROM users WHERE email = ?", [superAdminEmail]);
        if (!existing || existing.length === 0) {
          console.log("Seeding Super Admin...");
          const hashedPassword = await import_bcrypt.default.hash(superAdminPass, 10);
          const uid = "admin_master";
          await executeSql(
            "INSERT INTO users (uid, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
            [uid, superAdminEmail, hashedPassword, "Super Admin", "admin"]
          );
          console.log("Super Admin cr\xE9\xE9 avec succ\xE8s.");
        } else {
          await executeSql("UPDATE users SET role = 'admin' WHERE email = ?", [superAdminEmail]);
        }
      } catch (seedErr) {
        console.error("Erreur lors du seeding du Super Admin:", seedErr.message);
      }
      console.log("SQL Database tables initialized successfully.");
    };
  }
});

// src/db/sqlite.ts
var import_dotenv, import_path, import_fs, db, getDb, dbQuery;
var init_sqlite = __esm({
  "src/db/sqlite.ts"() {
    import_dotenv = __toESM(require("dotenv"), 1);
    import_path = __toESM(require("path"), 1);
    import_fs = __toESM(require("fs"), 1);
    import_dotenv.default.config();
    db = null;
    getDb = async () => {
      if (!db) {
        let DatabaseSync;
        try {
          const sqliteModule = await import("node:sqlite");
          DatabaseSync = sqliteModule.DatabaseSync;
        } catch (e) {
          throw new Error(
            "SQLite is not supported on this version of Node.js. Please upgrade to Node.js v22.5.0 or higher, or use DB_TYPE=mariadb / DB_TYPE=firebase."
          );
        }
        const dbPath = process.env.DB_SQLITE_PATH || import_path.default.join(process.cwd(), "database.sqlite");
        let isMalformed = false;
        if (import_fs.default.existsSync(dbPath)) {
          try {
            const testDb = new DatabaseSync(dbPath);
            testDb.prepare("PRAGMA integrity_check;").all();
            if (typeof testDb.close === "function") {
              testDb.close();
            }
          } catch (err) {
            if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk image"))) {
              isMalformed = true;
              console.error("SQLite integrity check failed. Database file is malformed/corrupted:", err.message);
            }
          }
        }
        if (isMalformed) {
          try {
            const backupPath = `${dbPath}.malformed.${Date.now()}`;
            import_fs.default.renameSync(dbPath, backupPath);
            console.warn(`Renamed corrupted SQLite database to: ${backupPath}`);
          } catch (renameErr) {
            console.error("Could not rename corrupted SQLite file (it might be locked). Truncating instead:", renameErr.message);
            try {
              import_fs.default.writeFileSync(dbPath, "");
              console.warn("Corrupted SQLite file successfully truncated.");
            } catch (truncErr) {
              console.error("Could not truncate corrupted SQLite file:", truncErr.message);
            }
          }
        }
        db = new DatabaseSync(dbPath);
      }
      return db;
    };
    dbQuery = async (query, params = []) => {
      try {
        const database = await getDb();
        const stmt = database.prepare(query);
        if (query.trim().toUpperCase().startsWith("SELECT")) {
          return stmt.all(...params);
        } else {
          const result = stmt.run(...params);
          return {
            lastID: result.lastInsertRowid,
            changes: result.changes
          };
        }
      } catch (err) {
        if (err.message && (err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk image"))) {
          console.error("SQLite Query Error indicating corruption, attempting auto-recovery:", err.message);
          db = null;
          try {
            const dbPath = process.env.DB_SQLITE_PATH || import_path.default.join(process.cwd(), "database.sqlite");
            if (import_fs.default.existsSync(dbPath)) {
              const backupPath = `${dbPath}.malformed.${Date.now()}`;
              try {
                import_fs.default.renameSync(dbPath, backupPath);
                console.warn(`Renamed corrupted SQLite database to: ${backupPath}`);
              } catch (renameErr) {
                console.warn("Could not rename corrupted SQLite file (it might be locked). Truncating instead:", renameErr.message);
                import_fs.default.writeFileSync(dbPath, "");
                console.warn("Corrupted SQLite file successfully truncated.");
              }
            }
            console.log("Re-initializing SQLite database tables...");
            const { initDatabase: initDatabase2 } = await Promise.resolve().then(() => (init_init(), init_exports));
            await initDatabase2();
            console.log("Retrying query after database recreation...");
            const database = await getDb();
            const stmt = database.prepare(query);
            if (query.trim().toUpperCase().startsWith("SELECT")) {
              return stmt.all(...params);
            } else {
              const result = stmt.run(...params);
              return {
                lastID: result.lastInsertRowid,
                changes: result.changes
              };
            }
          } catch (recoveryErr) {
            console.error("SQLite database recovery failed:", recoveryErr);
          }
        }
        console.error("SQLite Query Error:", err);
        throw err;
      }
    };
  }
});

// src/db/mariadb.ts
var import_mariadb, import_dotenv2, pool, dbQuery2;
var init_mariadb = __esm({
  "src/db/mariadb.ts"() {
    import_mariadb = __toESM(require("mariadb"), 1);
    import_dotenv2 = __toESM(require("dotenv"), 1);
    import_dotenv2.default.config();
    console.log("Connecting to database:", process.env.DB_NAME || "resifaso_db");
    pool = import_mariadb.default.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "resifaso_db",
      connectionLimit: 20,
      acquireTimeout: 2e4
    });
    dbQuery2 = async (query, params) => {
      let conn;
      try {
        conn = await pool.getConnection();
        const rows = await conn.query(query, params);
        return rows;
      } catch (err) {
        throw err;
      } finally {
        if (conn) conn.release();
      }
    };
  }
});

// src/lib/fcm-server.ts
var fcm_server_exports = {};
__export(fcm_server_exports, {
  registerDeviceToken: () => registerDeviceToken,
  sendPushNotification: () => sendPushNotification,
  sendPushToAll: () => sendPushToAll,
  unregisterDeviceToken: () => unregisterDeviceToken
});
async function registerDeviceToken(userId, token, deviceType) {
  if (!userId || !token) return false;
  try {
    const existing = await executeSql(
      "SELECT 1 FROM user_push_tokens WHERE user_id = ? AND token = ?",
      [userId, token]
    );
    if (existing && existing.length > 0) {
      await executeSql(
        "UPDATE user_push_tokens SET device_type = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND token = ?",
        [deviceType || null, userId, token]
      );
    } else {
      await executeSql(
        "INSERT INTO user_push_tokens (user_id, token, device_type) VALUES (?, ?, ?)",
        [userId, token, deviceType || null]
      );
    }
    return true;
  } catch (error) {
    console.error("[FCM] Error registering device token:", error.message);
    return false;
  }
}
async function unregisterDeviceToken(token) {
  if (!token) return false;
  try {
    await executeSql("DELETE FROM user_push_tokens WHERE token = ?", [token]);
    return true;
  } catch (error) {
    console.error("[FCM] Error unregistering device token:", error.message);
    return false;
  }
}
async function sendPushNotification(userId, title, body, data) {
  if (!fcmInitialized) {
    return false;
  }
  try {
    const rows = await executeSql("SELECT token FROM user_push_tokens WHERE user_id = ?", [userId]);
    if (!rows || rows.length === 0) {
      return false;
    }
    const tokens = rows.map((r) => r.token);
    const messages = tokens.map((token) => ({
      token,
      notification: {
        title,
        body
      },
      data: data || {}
    }));
    console.log(`[FCM] Sending push notification to ${tokens.length} device(s) for user ${userId}`);
    const response = await (0, import_messaging.getMessaging)().sendEach(messages);
    response.responses.forEach((res, index) => {
      if (!res.success) {
        const error = res.error;
        if (error && (error.code === "messaging/registration-token-not-registered" || error.code === "messaging/invalid-registration-token")) {
          const badToken = tokens[index];
          console.log(`[FCM] Removing invalid registration token for user ${userId}`);
          executeSql("DELETE FROM user_push_tokens WHERE token = ?", [badToken]).catch((e) => {
            console.error("[FCM] Failed to delete invalid token:", e.message);
          });
        } else {
          console.warn(`[FCM] Failed to send push to token at index ${index}:`, res.error?.message);
        }
      }
    });
    return true;
  } catch (error) {
    console.error("[FCM] Error sending push notification:", error.message);
    return false;
  }
}
async function sendPushToAll(title, body, data) {
  if (!fcmInitialized) return false;
  try {
    const rows = await executeSql("SELECT DISTINCT token, user_id FROM user_push_tokens");
    if (!rows || rows.length === 0) {
      return false;
    }
    const tokens = rows.map((r) => r.token);
    const messages = tokens.map((token) => ({
      token,
      notification: {
        title,
        body
      },
      data: data || {}
    }));
    console.log(`[FCM] Broadcasting push notification to ${tokens.length} device(s)`);
    const response = await (0, import_messaging.getMessaging)().sendEach(messages);
    response.responses.forEach((res, index) => {
      if (!res.success) {
        const error = res.error;
        if (error && (error.code === "messaging/registration-token-not-registered" || error.code === "messaging/invalid-registration-token")) {
          const badToken = tokens[index];
          executeSql("DELETE FROM user_push_tokens WHERE token = ?", [badToken]).catch(() => {
          });
        }
      }
    });
    return true;
  } catch (error) {
    console.error("[FCM] Error broadcasting push notification:", error.message);
    return false;
  }
}
var import_app, import_messaging, import_fs2, import_path2, fcmInitialized;
var init_fcm_server = __esm({
  "src/lib/fcm-server.ts"() {
    import_app = require("firebase-admin/app");
    import_messaging = require("firebase-admin/messaging");
    import_fs2 = require("fs");
    import_path2 = __toESM(require("path"), 1);
    init_db();
    fcmInitialized = false;
    try {
      let serviceAccount = null;
      const localAccountPath = import_path2.default.join(process.cwd(), "resifaso-firebase-adminsdk-fbsvc-23372c78ad.json");
      if ((0, import_fs2.existsSync)(localAccountPath)) {
        try {
          const content = (0, import_fs2.readFileSync)(localAccountPath, "utf8");
          serviceAccount = JSON.parse(content);
        } catch (e) {
        }
      }
      if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
        const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        if (rawEnv.startsWith("{")) {
          try {
            serviceAccount = JSON.parse(rawEnv);
          } catch (e) {
          }
        }
        if (!serviceAccount) {
          try {
            const decoded = Buffer.from(rawEnv, "base64").toString("utf8");
            if (decoded.startsWith("{")) {
              serviceAccount = JSON.parse(decoded);
            }
          } catch (e) {
          }
        }
      }
      if (serviceAccount && serviceAccount.project_id) {
        (0, import_app.initializeApp)({
          credential: (0, import_app.cert)(serviceAccount)
        });
        fcmInitialized = true;
        console.log("[FCM] Firebase Admin SDK initialized successfully!");
      } else {
      }
    } catch (error) {
      console.error("[FCM] Failed to initialize Firebase Admin SDK:", error.message);
    }
  }
});

// src/db/index.ts
function toCamel(s) {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase().replace("-", "").replace("_", "");
  });
}
function keysToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v));
  } else if (obj !== null && typeof obj === "object") {
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(obj)) {
      return obj;
    }
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toCamel(key)]: keysToCamel(obj[key])
      }),
      {}
    );
  }
  return obj;
}
var import_dotenv3, dbType, queryDatabase, executeSql;
var init_db = __esm({
  "src/db/index.ts"() {
    import_dotenv3 = __toESM(require("dotenv"), 1);
    init_sqlite();
    init_mariadb();
    import_dotenv3.default.config();
    dbType = process.env.DB_TYPE || (process.env.NODE_ENV === "production" ? "mariadb" : "sqlite");
    queryDatabase = async (query, params) => {
      if (dbType === "mariadb") {
        return await dbQuery2(query, params);
      } else {
        return await dbQuery(query, params);
      }
    };
    executeSql = async (sql, params = []) => {
      const results = await queryDatabase(sql, params);
      if (sql.trim().toLowerCase().startsWith("insert into notifications")) {
        try {
          const [id, userId, title, message, type, referenceId] = params;
          if (userId && title && message) {
            Promise.resolve().then(() => (init_fcm_server(), fcm_server_exports)).then(({ sendPushNotification: sendPushNotification2 }) => {
              sendPushNotification2(userId, title, message, {
                id: String(id || ""),
                type: String(type || "general"),
                referenceId: String(referenceId || "")
              }).catch((e) => console.error("[FCM Background Send Error]:", e.message));
            }).catch((e) => console.error("[FCM Import Error]:", e.message));
          }
        } catch (e) {
          console.error("[FCM Intercept Error]:", e.message);
        }
      }
      return keysToCamel(results);
    };
  }
});

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv4 = __toESM(require("dotenv"), 1);
var import_bcrypt2 = __toESM(require("bcrypt"), 1);
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
init_db();
init_init();

// src/db/queries.ts
init_db();
var cleanSecteur = (val) => {
  if (!val || typeof val !== "string") return val;
  return val.replace(/\bS[EÉ]C\b/gi, "Secteur");
};
var getUserProfile = async (uid) => {
  const users = await executeSql(`
    SELECT 
      uid, email, display_name as displayName, role, photo_url as photoUrl, 
      is_verified as isVerified, created_at as createdAt, is_suspended as isSuspended, 
      permissions, identity_document_front as identityDocumentFront, 
      identity_document_back as identityDocumentBack, id_number as idNumber, 
      id_type as idType, id_expiry as idExpiry, id_card_url as idCardUrl, 
      verification_status as verificationStatus, phone_number as phoneNumber, phone_number as phone,
      host_cancellation_fee as hostCancellationFee, host_cancellation_rules_text as hostCancellationRulesText
    FROM users 
    WHERE uid = ?
  `, [uid]);
  if (users.length === 0) return null;
  const user = users[0];
  if (user.hasAcceptedTerms === void 0) {
    user.hasAcceptedTerms = 1;
  }
  return user;
};
var getAllUsers = async () => {
  return await executeSql(`
    SELECT 
      uid, email, display_name as displayName, role, photo_url as photoUrl, 
      is_verified as isVerified, created_at as createdAt, is_suspended as isSuspended, 
      permissions, identity_document_front as identityDocumentFront, 
      identity_document_back as identityDocumentBack, id_number as idNumber, 
      id_type as idType, id_expiry as idExpiry, id_card_url as idCardUrl, 
      verification_status as verificationStatus, phone_number as phoneNumber,
      has_accepted_terms as hasAcceptedTerms,
      host_cancellation_fee as hostCancellationFee, host_cancellation_rules_text as hostCancellationRulesText
    FROM users 
    ORDER BY created_at DESC
  `);
};
var getAllResidences = async (ownerId) => {
  let sql = `
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      utilities_included as utilitiesIncludedRaw, owner_phone as ownerPhone,
      created_at as createdAt 
    FROM residences
  `;
  const params = [];
  if (ownerId) {
    sql += " WHERE owner_id = ?";
    params.push(ownerId);
  }
  sql += " ORDER BY created_at DESC";
  const rows = await executeSql(sql, params);
  if (rows.length === 0) return [];
  const allAmenities = await executeSql("SELECT residence_id, amenity FROM residence_amenities");
  const allImages = await executeSql("SELECT residence_id, image_url FROM residence_images");
  const amenitiesMap = {};
  allAmenities.forEach((a) => {
    const resId = a.residence_id || a.residenceId;
    if (!amenitiesMap[resId]) amenitiesMap[resId] = [];
    amenitiesMap[resId].push(a.amenity);
  });
  const imagesMap = {};
  allImages.forEach((i) => {
    const resId = i.residence_id || i.residenceId;
    if (!imagesMap[resId]) imagesMap[resId] = [];
    imagesMap[resId].push(i.image_url || i.imageUrl);
  });
  const activeBookings = await executeSql(`
    SELECT residence_id, check_in, check_out 
    FROM bookings 
    WHERE booking_status NOT IN ('cancelled', 'declined')
  `);
  const bookingsMap = {};
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  activeBookings.forEach((b) => {
    const resId = b.residence_id || b.residenceId;
    let checkOut = b.checkOut || b.check_out;
    let checkIn = b.checkIn || b.check_in;
    if (checkOut instanceof Date) checkOut = checkOut.toISOString();
    if (checkIn instanceof Date) checkIn = checkIn.toISOString();
    checkOut = String(checkOut).split("T")[0];
    checkIn = String(checkIn).split("T")[0];
    if (checkOut >= todayStr) {
      if (!bookingsMap[resId]) bookingsMap[resId] = [];
      bookingsMap[resId].push({ from: checkIn, to: checkOut });
    }
  });
  return rows.map((res) => ({
    id: res.id,
    ownerId: res.ownerId || res.owner_id || res.ownerid,
    title: res.title,
    description: res.description,
    type: res.type,
    pricePerNight: res.pricePerNight !== void 0 ? res.pricePerNight : res.price_per_night !== void 0 ? res.price_per_night : res.pricepernight,
    advancePercentage: res.advancePercentage !== void 0 ? res.advancePercentage : res.advance_percentage !== void 0 ? res.advance_percentage : res.advancepercentage,
    cleaningFee: res.cleaningFee !== void 0 ? res.cleaningFee : res.cleaning_fee !== void 0 ? res.cleaning_fee : res.cleaningfee,
    serviceFee: res.serviceFee !== void 0 ? res.serviceFee : res.service_fee !== void 0 ? res.service_fee : res.servicefee,
    city: res.city,
    neighborhood: res.neighborhood,
    street: res.street,
    capacity: res.capacity,
    bedrooms: res.bedrooms,
    beds: res.beds,
    bathrooms: res.bathrooms,
    rooms: res.rooms,
    status: res.status,
    availabilityStatus: res.availabilityStatus || res.availability_status || res.availabilitystatus,
    promoted: res.promoted !== void 0 ? !!res.promoted : !!res.promoted,
    weeklyDiscount: res.weeklyDiscount !== void 0 ? res.weeklyDiscount : res.weekly_discount !== void 0 ? res.weekly_discount : res.weeklydiscount,
    monthlyDiscount: res.monthlyDiscount !== void 0 ? res.monthlyDiscount : res.monthly_discount !== void 0 ? res.monthly_discount : res.monthlydiscount,
    promoPrice: res.promoPrice !== void 0 ? res.promoPrice : res.promo_price !== void 0 ? res.promo_price : res.promoprice,
    rejectionReason: res.rejectionReason || res.rejection_reason || res.rejectionreason,
    ownerPhone: res.ownerPhone || res.owner_phone || res.ownerphone,
    createdAt: res.createdAt || res.created_at || res.createdat,
    amenities: amenitiesMap[res.id] || [],
    images: imagesMap[res.id] || [],
    occupiedDates: bookingsMap[res.id] || [],
    address: {
      city: cleanSecteur(res.city),
      neighborhood: cleanSecteur(res.neighborhood),
      street: cleanSecteur(res.street || res.neighborhood)
    },
    utilitiesIncluded: (() => {
      try {
        const raw = res.utilitiesIncludedRaw || res.utilities_included || res.utilitiesincluded;
        if (!raw) return { water: false, electricity: false };
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) {
        console.warn(`Error parsing utilitiesIncluded for residence ${res.id}:`, e);
        return { water: false, electricity: false };
      }
    })()
  }));
};
var getResidenceById = async (id) => {
  const rows = await executeSql(`
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      utilities_included as utilitiesIncludedRaw, owner_phone as ownerPhone,
      created_at as createdAt 
    FROM residences WHERE id = ?
  `, [id]);
  if (rows.length === 0) return null;
  const row = rows[0];
  const amenities = await executeSql("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [id]);
  const images = await executeSql("SELECT image_url FROM residence_images WHERE residence_id = ?", [id]);
  const bookings = await executeSql(`
    SELECT check_in, check_out 
    FROM bookings 
    WHERE residence_id = ? AND booking_status NOT IN ('cancelled', 'declined')
  `, [id]);
  return {
    id: row.id,
    ownerId: row.ownerId || row.owner_id || row.ownerid,
    title: row.title,
    description: row.description,
    type: row.type,
    pricePerNight: row.pricePerNight !== void 0 ? row.pricePerNight : row.price_per_night !== void 0 ? row.price_per_night : row.pricepernight,
    advancePercentage: row.advancePercentage !== void 0 ? row.advancePercentage : row.advance_percentage !== void 0 ? row.advance_percentage : row.advancepercentage,
    cleaningFee: row.cleaningFee !== void 0 ? row.cleaningFee : row.cleaning_fee !== void 0 ? row.cleaning_fee : row.cleaningfee,
    serviceFee: row.serviceFee !== void 0 ? row.serviceFee : row.service_fee !== void 0 ? row.service_fee : row.servicefee,
    city: row.city,
    neighborhood: row.neighborhood,
    street: row.street,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    rooms: row.rooms,
    status: row.status,
    availabilityStatus: row.availabilityStatus || row.availability_status || row.availabilitystatus,
    promoted: row.promoted !== void 0 ? !!row.promoted : !!row.promoted,
    weeklyDiscount: row.weeklyDiscount !== void 0 ? row.weeklyDiscount : row.weekly_discount !== void 0 ? row.weekly_discount : row.weeklydiscount,
    monthlyDiscount: row.monthlyDiscount !== void 0 ? row.monthlyDiscount : row.monthly_discount !== void 0 ? row.monthly_discount : row.monthlydiscount,
    promoPrice: row.promoPrice !== void 0 ? row.promoPrice : row.promo_price !== void 0 ? row.promo_price : row.promoprice,
    rejectionReason: row.rejectionReason || row.rejection_reason || row.rejectionreason,
    ownerPhone: row.ownerPhone || row.owner_phone || row.ownerphone,
    createdAt: row.createdAt || row.created_at || row.createdat,
    amenities: amenities.map((a) => a.amenity),
    images: images.map((i) => i.image_url || i.imageUrl),
    occupiedDates: bookings.map((b) => {
      let co = b.checkOut || b.check_out;
      let ci = b.checkIn || b.check_in;
      if (co instanceof Date) co = co.toISOString();
      if (ci instanceof Date) ci = ci.toISOString();
      return { from: String(ci).split("T")[0], to: String(co).split("T")[0] };
    }).filter((b) => b.to >= (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
    address: {
      city: cleanSecteur(row.city),
      neighborhood: cleanSecteur(row.neighborhood),
      street: cleanSecteur(row.street || row.neighborhood)
    },
    utilitiesIncluded: (() => {
      try {
        const raw = row.utilitiesIncludedRaw || row.utilities_included || row.utilitiesincluded;
        if (!raw) return { water: false, electricity: false };
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) {
        console.warn(`Error parsing utilitiesIncluded for residence ${id}:`, e);
        return { water: false, electricity: false };
      }
    })()
  };
};
var getAllBookings = async (options = {}) => {
  let sql = `
    SELECT 
      b.id, b.residence_id as residenceId, b.client_id as clientId, b.owner_id as ownerId, 
      b.check_in as checkIn, b.check_out as checkOut, b.guests, b.total_price as totalPrice, 
      b.advance_paid as advancePaid, b.payment_status as paymentStatus, b.booking_status as bookingStatus, 
      b.transaction_id as transactionId, b.cancelled_by as cancelledBy, b.cancellation_reason as cancellationReason, 
      b.cancelled_at as cancelledAt, b.refund_status as refundStatus, b.refund_amount as refundAmount, 
      b.refund_phone as refundPhone, b.refund_provider as refundProvider, b.refund_processed_at as refundProcessedAt, 
      b.host_cancellation_fee as hostCancellationFee, b.nights_consumed as nightsConsumed, b.cost_of_nights_spent as costOfNightsSpent,
      b.stay_status as stayStatus, b.checked_in_at as checkedInAt, b.checked_out_at as checkedOutAt, 
      b.verifications_status as verificationsStatus,
      b.created_at as createdAt,
      u.display_name as clientName
    FROM bookings b
    LEFT JOIN users u ON b.client_id = u.uid
  `;
  let params = [];
  const whereClauses = [];
  if (options.residenceId) {
    whereClauses.push("residence_id = ?");
    params.push(options.residenceId);
  }
  if (!options.isAdmin) {
    if (options.clientId && options.ownerId) {
      whereClauses.push("(client_id = ? OR owner_id = ?)");
      params.push(options.clientId, options.ownerId);
    } else if (options.clientId) {
      whereClauses.push("client_id = ?");
      params.push(options.clientId);
    } else if (options.ownerId) {
      whereClauses.push("owner_id = ?");
      params.push(options.ownerId);
    }
  }
  if (whereClauses.length > 0) {
    sql += " WHERE " + whereClauses.join(" AND ");
  }
  sql += " ORDER BY b.created_at DESC";
  const rows = await executeSql(sql, params);
  return rows.map((row) => ({
    id: row.id,
    residenceId: row.residenceId || row.residence_id || row.residenceid,
    clientId: row.clientId || row.client_id || row.clientid,
    ownerId: row.ownerId || row.owner_id || row.ownerid,
    checkIn: row.checkIn || row.check_in || row.checkin,
    checkOut: row.checkOut || row.check_out || row.checkout,
    guests: row.guests,
    totalPrice: row.totalPrice !== void 0 ? row.totalPrice : row.total_price !== void 0 ? row.total_price : row.totalprice,
    advancePaid: row.advancePaid !== void 0 ? row.advancePaid : row.advance_paid !== void 0 ? row.advance_paid : row.advancepaid,
    paymentStatus: row.paymentStatus || row.payment_status || row.paymentstatus,
    bookingStatus: row.bookingStatus || row.booking_status || row.bookingstatus,
    transactionId: row.transactionId || row.transaction_id || row.transactionid,
    cancelledBy: row.cancelledBy || row.cancelled_by || row.cancelledby,
    cancellationReason: row.cancellationReason || row.cancellation_reason || row.cancellationreason,
    cancelledAt: row.cancelledAt || row.cancelled_at || row.cancelledat,
    refundStatus: row.refundStatus || row.refund_status || row.refundstatus,
    refundAmount: row.refundAmount !== void 0 ? row.refundAmount : row.refund_amount !== void 0 ? row.refund_amount : row.refundamount,
    refundPhone: row.refundPhone || row.refund_phone || row.refundphone,
    refundProvider: row.refundProvider || row.refund_provider || row.refundprovider,
    refundProcessedAt: row.refundProcessedAt || row.refund_processed_at || row.refundprocessedat,
    hostCancellationFee: row.hostCancellationFee !== void 0 ? row.hostCancellationFee : row.host_cancellation_fee !== void 0 ? row.host_cancellation_fee : row.hostcancellationfee,
    nightsConsumed: row.nightsConsumed !== void 0 ? row.nightsConsumed : row.nights_consumed !== void 0 ? row.nights_consumed : row.nightsconsumed,
    costOfNightsSpent: row.costOfNightsSpent !== void 0 ? row.costOfNightsSpent : row.cost_of_nights_spent !== void 0 ? row.cost_of_nights_spent : row.costofnightsspent,
    stayStatus: row.stayStatus || row.stay_status || row.staystatus,
    checkedInAt: row.checkedInAt || row.checked_in_at || row.checkedinat,
    checkedOutAt: row.checkedOutAt || row.checked_out_at || row.checkedoutat,
    verificationsStatus: row.verificationsStatus || row.verifications_status || row.verificationsstatus,
    createdAt: row.createdAt || row.created_at || row.createdat,
    clientName: row.clientName || row.client_name || row.clientname
  }));
};
var getBookingById = async (id) => {
  const results = await executeSql(`
    SELECT 
      b.id, b.residence_id as residenceId, b.client_id as clientId, b.owner_id as ownerId, 
      b.check_in as checkIn, b.check_out as checkOut, b.guests, b.total_price as totalPrice, 
      b.advance_paid as advancePaid, b.payment_status as paymentStatus, b.booking_status as bookingStatus, 
      b.transaction_id as transactionId, b.verifications_status as verificationsStatus,
      b.host_cancellation_fee as hostCancellationFee, b.nights_consumed as nightsConsumed, b.cost_of_nights_spent as costOfNightsSpent,
      b.created_at as createdAt,
      u.display_name as clientName
    FROM bookings b
    LEFT JOIN users u ON b.client_id = u.uid
    WHERE b.id = ?
  `, [id]);
  const row = results[0];
  if (!row) return null;
  return {
    id: row.id,
    residenceId: row.residenceId || row.residence_id || row.residenceid,
    clientId: row.clientId || row.client_id || row.clientid,
    ownerId: row.ownerId || row.owner_id || row.ownerid,
    checkIn: row.checkIn || row.check_in || row.checkin,
    checkOut: row.checkOut || row.check_out || row.checkout,
    guests: row.guests,
    totalPrice: row.totalPrice !== void 0 ? row.totalPrice : row.total_price !== void 0 ? row.total_price : row.totalprice,
    advancePaid: row.advancePaid !== void 0 ? row.advancePaid : row.advance_paid !== void 0 ? row.advance_paid : row.advancepaid,
    paymentStatus: row.paymentStatus || row.payment_status || row.paymentstatus,
    bookingStatus: row.bookingStatus || row.booking_status || row.bookingstatus,
    transactionId: row.transactionId || row.transaction_id || row.transactionid,
    verificationsStatus: row.verificationsStatus || row.verifications_status || row.verificationsstatus,
    hostCancellationFee: row.hostCancellationFee !== void 0 ? row.hostCancellationFee : row.host_cancellation_fee !== void 0 ? row.host_cancellation_fee : row.hostcancellationfee,
    nightsConsumed: row.nightsConsumed !== void 0 ? row.nightsConsumed : row.nights_consumed !== void 0 ? row.nights_consumed : row.nightsconsumed,
    costOfNightsSpent: row.costOfNightsSpent !== void 0 ? row.costOfNightsSpent : row.cost_of_nights_spent !== void 0 ? row.cost_of_nights_spent : row.costofnightsspent,
    createdAt: row.createdAt || row.created_at || row.createdat,
    clientName: row.clientName || row.client_name || row.clientname
  };
};
var getSettings = async (key) => {
  const results = await executeSql("SELECT value FROM settings WHERE `key` = ?", [key]);
  if (results.length === 0) return {};
  try {
    let data = typeof results[0].value === "string" ? JSON.parse(results[0].value) : results[0].value;
    if (data && typeof data === "object") {
      const replaceSlogan = (obj) => {
        if (!obj) return obj;
        if (typeof obj === "string") {
          return obj.replace(/HOSPITALIT[ÉE]\s+MORTS?\s+COMFORT/gi, "HOSPITALIT\xC9, CONFORT, S\xC9R\xC9NIT\xC9");
        }
        if (Array.isArray(obj)) {
          return obj.map(replaceSlogan);
        }
        if (typeof obj === "object") {
          const res = {};
          for (const [k, v] of Object.entries(obj)) {
            res[k] = replaceSlogan(v);
          }
          return res;
        }
        return obj;
      };
      data = replaceSlogan(data);
    }
    if (key === "global" && data) {
      if (data.commissionRate !== void 0) data.commissionRate = Number(data.commissionRate);
      if (data.isTestMode !== void 0) data.isTestMode = Boolean(data.isTestMode);
      if (data.enablePhoneCalls !== void 0) data.enablePhoneCalls = Boolean(data.enablePhoneCalls);
      if (data.enableWhatsApp !== void 0) data.enableWhatsApp = Boolean(data.enableWhatsApp);
      if (data.announcement && data.announcement.active !== void 0) {
        data.announcement.active = Boolean(data.announcement.active);
      }
    }
    return data;
  } catch (e) {
    console.error(`[Error] Failed to parse settings for key ${key}:`, e);
    return {};
  }
};
var saveSettings = async (key, value) => {
  console.log(`[DEBUG] Saving settings for key: ${key}, value:`, JSON.stringify(value));
  const valString = JSON.stringify(value);
  const existing = await executeSql("SELECT `key` FROM settings WHERE `key` = ?", [key]);
  if (existing.length > 0) {
    await executeSql("UPDATE settings SET value = ? WHERE `key` = ?", [valString, key]);
  } else {
    await executeSql("INSERT INTO settings (`key`, value) VALUES (?, ?)", [key, valString]);
  }
};
var getAllAds = async () => {
  const rows = await executeSql(`
    SELECT 
      id, title, description, image_url as imageUrl, link_url as linkUrl, 
      is_active as isActive, frequency_seconds as frequencySeconds, 
      start_at as startAt, end_at as endAt, created_at as createdAt 
    FROM advertisements 
    ORDER BY created_at DESC
  `);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl || row.image_url,
    linkUrl: row.linkUrl || row.link_url,
    isActive: row.isActive !== void 0 ? row.isActive : row.is_active,
    frequencySeconds: row.frequencySeconds !== void 0 ? row.frequencySeconds : row.frequency_seconds,
    startAt: row.startAt || row.start_at,
    endAt: row.endAt || row.end_at,
    createdAt: row.createdAt || row.created_at
  }));
};
var getAllReviews = async () => {
  return await executeSql(`
    SELECT 
      id, booking_id as bookingId, residence_id as residenceId, client_id as clientId, 
      rating, comment, created_at as createdAt 
    FROM reviews 
    ORDER BY created_at DESC
  `);
};
var getReviewsByResidenceId = async (residenceId) => {
  return await executeSql(`
    SELECT 
      r.id, r.booking_id as bookingId, r.residence_id as residenceId, r.client_id as clientId, 
      r.rating, r.comment, r.created_at as createdAt,
      u.display_name as clientName, u.photo_url as clientPhoto
    FROM reviews r
    LEFT JOIN users u ON r.client_id = u.uid
    WHERE r.residence_id = ?
    ORDER BY r.created_at DESC
  `, [residenceId]);
};
var getAllWithdrawals = async (ownerId) => {
  let sql = `
    SELECT 
      id, owner_id as ownerId, amount, phone, provider, status, 
      created_at as createdAt, approved_at as approvedAt,
      transaction_id as transactionId, rejection_reason as rejectionReason
    FROM withdrawals
  `;
  let params = [];
  if (ownerId) {
    sql += " WHERE owner_id = ?";
    params = [ownerId];
  }
  sql += " ORDER BY created_at DESC";
  return await executeSql(sql, params);
};
var getAllContactMessages = async () => {
  return await executeSql(`
    SELECT 
      id, name, email, subject, message, status, 
      admin_notes as adminNotes, replied_at as repliedAt, created_at as createdAt 
    FROM contact_messages 
    ORDER BY created_at DESC
  `);
};
var getAllConversations = async (uid, isAdmin = false) => {
  let sql = `
    SELECT id, participants, related_id as relatedId, updated_at as updatedAt 
    FROM conversations 
  `;
  let params = [];
  if (!isAdmin) {
    sql += " WHERE participants LIKE ?";
    params = [`%${uid}%`];
  }
  sql += " ORDER BY updated_at DESC";
  const conversations = await executeSql(sql, params);
  return conversations.map((c) => ({
    id: c.id,
    relatedId: c.relatedId || c.related_id,
    updatedAt: c.updatedAt || c.updated_at,
    participants: typeof c.participants === "string" ? c.participants.split(",") : c.participants
  }));
};
var getMessages = async (conversationId) => {
  return await executeSql(`
    SELECT 
      id, conversation_id as conversationId, sender_id as senderId, 
      text, is_read as isRead, created_at as createdAt 
    FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC
  `, [conversationId]);
};
var deleteResidence = async (id) => {
  await executeSql("DELETE FROM residence_amenities WHERE residence_id = ?", [id]);
  await executeSql("DELETE FROM residence_images WHERE residence_id = ?", [id]);
  await executeSql("DELETE FROM residences WHERE id = ?", [id]);
};
var toSnakeCase = (str) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
var formatSqlValue = (val) => {
  if (val === void 0 || val === null) {
    return null;
  }
  if (typeof val === "boolean") {
    return val ? 1 : 0;
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    return val.replace("T", " ").substring(0, 19);
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  return val;
};
var VALID_RESIDENCE_COLS = /* @__PURE__ */ new Set([
  "id",
  "owner_id",
  "title",
  "description",
  "type",
  "price_per_night",
  "advance_percentage",
  "cleaning_fee",
  "service_fee",
  "city",
  "neighborhood",
  "street",
  "capacity",
  "bedrooms",
  "beds",
  "bathrooms",
  "rooms",
  "status",
  "availability_status",
  "promoted",
  "weekly_discount",
  "monthly_discount",
  "promo_price",
  "rejection_reason",
  "utilities_included",
  "owner_phone",
  "created_at"
]);
var VALID_USER_COLS = /* @__PURE__ */ new Set([
  "uid",
  "email",
  "display_name",
  "phone_number",
  "photo_url",
  "role",
  "is_verified",
  "is_suspended",
  "password_hash",
  "identity_document_front",
  "identity_document_back",
  "permissions",
  "id_number",
  "id_type",
  "id_expiry",
  "id_card_url",
  "verification_status",
  "has_accepted_terms",
  "host_cancellation_fee",
  "host_cancellation_rules_text",
  "created_at",
  "deactivated",
  "commission_percentage"
]);
var updateResidence = async (id, updates) => {
  const { amenities, images, address, utilitiesIncluded, ...rest } = updates;
  const mappedUpdates = {};
  for (const [k, v] of Object.entries(rest)) {
    const snakeKey = toSnakeCase(k);
    if (VALID_RESIDENCE_COLS.has(snakeKey)) {
      mappedUpdates[snakeKey] = formatSqlValue(v);
    }
  }
  if (address) {
    mappedUpdates.city = address.city;
    mappedUpdates.neighborhood = address.neighborhood;
    mappedUpdates.street = address.street;
  }
  if (utilitiesIncluded !== void 0) {
    mappedUpdates.utilities_included = formatSqlValue(utilitiesIncluded);
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
    const snakeKey = toSnakeCase(k);
    if (VALID_RESIDENCE_COLS.has(snakeKey) || snakeKey === "id") {
      mappedObj[snakeKey] = formatSqlValue(v);
    }
  }
  if (address) {
    mappedObj.city = address.city;
    mappedObj.neighborhood = address.neighborhood;
    mappedObj.street = address.street;
  }
  if (utilitiesIncluded !== void 0) {
    mappedObj.utilities_included = formatSqlValue(utilitiesIncluded);
  }
  if (res.id) mappedObj.id = res.id;
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
var VALID_BOOKING_COLS = /* @__PURE__ */ new Set([
  "id",
  "residence_id",
  "client_id",
  "owner_id",
  "check_in",
  "check_out",
  "guests",
  "total_price",
  "advance_paid",
  "payment_status",
  "booking_status",
  "transaction_id",
  "cancelled_by",
  "cancellation_reason",
  "cancelled_at",
  "refund_status",
  "refund_amount",
  "refund_phone",
  "refund_provider",
  "refund_processed_at",
  "refund_reason",
  "stay_status",
  "checked_in_at",
  "checked_out_at",
  "host_cancellation_fee",
  "nights_consumed",
  "cost_of_nights_spent",
  "verifications_status",
  "created_at"
]);
var updateBookingStatus = async (id, updates) => {
  const mappedUpdates = {};
  for (const [k, v] of Object.entries(updates)) {
    if (k === "id") continue;
    let snakeKey = toSnakeCase(k);
    if (snakeKey === "refund_reason") {
      mappedUpdates["cancellation_reason"] = formatSqlValue(v);
    }
    if (VALID_BOOKING_COLS.has(snakeKey)) {
      mappedUpdates[snakeKey] = formatSqlValue(v);
    }
  }
  const fields = Object.keys(mappedUpdates);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  await executeSql(`UPDATE bookings SET ${setClause} WHERE id = ?`, [...Object.values(mappedUpdates), id]);
};
var updateUserProfile = async (uid, updates) => {
  const mappedUpdates = {};
  for (const [k, v] of Object.entries(updates)) {
    if (k === "uid") continue;
    let dbValue = formatSqlValue(v);
    let targetKey = null;
    if (k === "displayName") targetKey = "display_name";
    else if (k === "photoUrl") targetKey = "photo_url";
    else if (k === "isVerified") targetKey = "is_verified";
    else if (k === "isSuspended") targetKey = "is_suspended";
    else if (k === "phoneNumber") targetKey = "phone_number";
    else if (k === "commissionPercentage") targetKey = "commission_percentage";
    else if (k === "createdAt") targetKey = "created_at";
    else if (k === "password") targetKey = "password_hash";
    else {
      const snake = toSnakeCase(k);
      if (VALID_USER_COLS.has(snake)) {
        targetKey = snake;
      }
    }
    if (targetKey) {
      mappedUpdates[targetKey] = dbValue;
    }
  }
  const existing = await executeSql("SELECT uid FROM users WHERE uid = ?", [uid]);
  if (existing.length > 0) {
    const fields = Object.keys(mappedUpdates);
    if (fields.length > 0) {
      const setClause = fields.map((f) => `${f} = ?`).join(", ");
      await executeSql(`UPDATE users SET ${setClause} WHERE uid = ?`, [...Object.values(mappedUpdates), uid]);
    }
  } else {
    const fullFields = { uid, ...mappedUpdates };
    const fields = Object.keys(fullFields);
    const placeholders = fields.map(() => "?").join(", ");
    await executeSql(`INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders})`, Object.values(fullFields));
  }
};
var deleteUser = async (uid) => {
  await executeSql("DELETE FROM users WHERE uid = ?", [uid]);
};
var deleteReview = async (id) => {
  await executeSql("DELETE FROM reviews WHERE id = ?", [id]);
};
var getNotifications = async (userId) => {
  const rows = await executeSql("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id || row.userId,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read !== void 0 ? !!row.is_read : !!row.isRead,
    referenceId: row.reference_id || row.referenceId,
    createdAt: row.created_at || row.createdAt
  }));
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
    if (req.user && req.user.email === "mandemohamed68@gmail.com") {
      req.user.role = "admin";
    }
    next();
  });
};

// server.ts
init_fcm_server();
import_dotenv4.default.config();
var JWT_SECRET2 = process.env.JWT_SECRET || "super-secret-key-change-me";
var DB_TYPE = process.env.DB_TYPE || (process.env.NODE_ENV === "production" ? "mariadb" : "sqlite");
var PROCESSOR_ORANGE = "11688813752134336";
var PROCESSOR_MOOV = "11688813838374580";
var PROCESSOR_TELECEL = "11744695746597207";
var SAPPAY_BASE_PUBLIC_SANDBOX = "https://sandbox.sappay.net/api/v1";
var SAPPAY_BASE_CHECKOUT_SANDBOX = "https://sandbox.sappay.net/api/v1/checkout";
var SAPPAY_BASE_PUBLIC_PROD = "https://api.prod.sappay.net/api/public";
var SAPPAY_BASE_CHECKOUT_PROD = "https://api.prod.sappay.net/api/checkout";
async function getSappayCredentials() {
  const defaultClientId = (process.env.SAPPAY_CLIENT_ID || "").trim();
  const defaultClientSecret = (process.env.SAPPAY_CLIENT_SECRET || "").trim();
  const defaultUsername = (process.env.SAPPAY_USERNAME || "").trim();
  const defaultPassword = (process.env.SAPPAY_PASSWORD || "").trim();
  let finalCreds = {
    clientId: defaultClientId,
    clientSecret: defaultClientSecret,
    username: defaultUsername,
    password: defaultPassword,
    isTestMode: false
  };
  try {
    const results = await executeSql("SELECT value FROM settings WHERE `key` = 'global'");
    if (results && results.length > 0) {
      const data = JSON.parse(results[0].value);
      if (data?.sappayClientId) finalCreds.clientId = data.sappayClientId.trim();
      if (data?.sappayClientSecret) finalCreds.clientSecret = data.sappayClientSecret.trim();
      if (data?.sappayUsername) finalCreds.username = data.sappayUsername.trim();
      if (data?.sappayPassword) finalCreds.password = data.sappayPassword.trim();
      if (data?.isTestMode !== void 0) finalCreds.isTestMode = data.isTestMode;
    }
  } catch (e) {
    console.warn("Sappay: Impossible de lire les param\xE8tres depuis la base, utilisation des valeurs .env.", e.message);
  }
  return finalCreds;
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
  let clean = phone.replace(/\s/g, "").replace(/[^0-9+]/g, "");
  if (clean.startsWith("+226")) clean = clean.slice(4);
  else if (clean.startsWith("00226")) clean = clean.slice(5);
  else if (clean.startsWith("226") && clean.length > 8) clean = clean.slice(3);
  if (clean.length > 8) clean = clean.slice(-8);
  return clean;
}
function findInvoiceId(responseData) {
  if (!responseData) return null;
  if (responseData.response?.invoice_detail?.invoice_id) return responseData.response.invoice_detail.invoice_id;
  if (responseData.response?.invoice_id) return responseData.response.invoice_id;
  if (responseData.invoice_id) return responseData.invoice_id;
  if (responseData.id) return responseData.id;
  if (responseData.data?.invoice_id) return responseData.data.invoice_id;
  return null;
}
async function getSappayToken() {
  const credentials = await getSappayCredentials();
  const urls = await getSappayBaseUrls();
  const payload = {
    grant_type: "password",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    username: credentials.username,
    password: credentials.password
  };
  console.log(`[Sappay] Authentification pour ${credentials.username} (mode ${credentials.isTestMode ? "test" : "prod"})`);
  const makeRequest = async (contentType, body) => {
    const headers = { "Accept": "application/json" };
    if (contentType === "application/json") {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(body).toString();
    }
    return fetch(`${urls.publicBase}/authentication/`, {
      method: "POST",
      headers,
      body
    });
  };
  try {
    let response = await makeRequest("application/json", payload);
    if (!response.ok && (response.status === 400 || response.status === 401)) {
      console.warn(`[Sappay] \xC9chec JSON (${response.status}), tentative x-www-form-urlencoded...`);
      response = await makeRequest("application/x-www-form-urlencoded", payload);
    }
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Sappay] \xC9chec (${response.status}) :`, errorBody.substring(0, 300));
      throw new Error(`Sappay auth \xE9chou\xE9e (${response.status}) : ${errorBody}`);
    }
    const data = await response.json();
    const token = data.access || data.access_token || data.token || data.response?.access_token;
    if (!token) {
      throw new Error("Aucun access_token dans la r\xE9ponse Sappay.");
    }
    return token;
  } catch (err) {
    if (credentials.isTestMode) {
      console.warn("[Sappay] Mode test, retour d'un token fictif.");
      return "mock_sappay_token_fallback";
    }
    throw new Error(`Sappay authentification : ${err.message}`);
  }
}
async function performSappayPayout(amount, phone, provider) {
  try {
    const creds = await getSappayCredentials();
    const urls = await getSappayBaseUrls();
    const cleanPhone = normalizePhoneNumberSappay(phone);
    const processor = provider.toLowerCase().includes("moov") ? PROCESSOR_MOOV : PROCESSOR_ORANGE;
    console.log(`[Payout] Initiation d'un virement de ${amount} F CFA vers ${cleanPhone} (${provider})`);
    if (creds.isTestMode || !creds.clientId || creds.clientId.startsWith("OM_MOOV_GATEWAY") || creds.clientId.includes("****")) {
      const mockTxId = "pay_mock_" + Math.random().toString(36).substr(2, 9).toUpperCase();
      console.log(`[Payout] Simulation de virement r\xE9ussie (Transaction ID: ${mockTxId})`);
      return {
        success: true,
        transactionId: mockTxId
      };
    }
    const token = await getSappayToken();
    if (token === "mock_sappay_token_fallback") {
      const mockTxId = "pay_mock_" + Math.random().toString(36).substr(2, 9).toUpperCase();
      return { success: true, transactionId: mockTxId };
    }
    const payload = {
      processor,
      amount,
      destination: cleanPhone,
      reference: "REFUND_" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      description: "Remboursement de reservation sur ResiFaso"
    };
    const response = await fetch(`${urls.publicBase}/transfers/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payout] Echec de l'API SapPay :", errorText);
      throw new Error(`API SapPay a retourne une erreur : ${errorText}`);
    }
    const data = await response.json();
    const txId = data.transaction_id || data.id || data.response?.transaction_id || "pay_" + Math.random().toString(36).substr(2, 9).toUpperCase();
    return {
      success: true,
      transactionId: txId
    };
  } catch (err) {
    console.error("[Payout] Erreur lors du payout :", err.message);
    return {
      success: false,
      transactionId: "",
      error: err.message
    };
  }
}
async function startServer() {
  if (DB_TYPE !== "firebase") {
    await initDatabase().catch((err) => console.error("Init DB error:", err));
    try {
      await executeSql("ALTER TABLE users ADD COLUMN has_accepted_terms BOOLEAN DEFAULT 0");
    } catch (e) {
    }
    try {
      await executeSql("ALTER TABLE withdrawals ADD COLUMN transaction_id VARCHAR(255)");
    } catch (e) {
    }
    try {
      await executeSql("ALTER TABLE withdrawals ADD COLUMN rejection_reason TEXT");
    } catch (e) {
    }
    try {
      if (DB_TYPE === "mariadb") {
        await executeSql(`
          CREATE TABLE IF NOT EXISTS user_push_tokens (
            user_id VARCHAR(128) NOT NULL,
            token VARCHAR(255) NOT NULL,
            device_type VARCHAR(50),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, token)
          ) ENGINE=InnoDB
        `);
      } else {
        await executeSql(`
          CREATE TABLE IF NOT EXISTS user_push_tokens (
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            device_type TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, token)
          )
        `);
      }
    } catch (e) {
      console.error("Error creating user_push_tokens table:", e);
    }
  }
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, displayName, role: requestedRole, identity_document_front, identity_document_back } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });
    try {
      const existing = await executeSql("SELECT uid FROM users WHERE email = ?", [email]);
      if (existing.length > 0) return res.status(400).json({ error: "Cet email est d\xE9j\xE0 utilis\xE9" });
      const hashedPassword = await import_bcrypt2.default.hash(password, 10);
      const uid = "u_" + Math.random().toString(36).substr(2, 9);
      const role = email === "mandemohamed68@gmail.com" ? "admin" : requestedRole || "client";
      await executeSql(
        "INSERT INTO users (uid, email, password_hash, display_name, role, identity_document_front, identity_document_back) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [uid, email, hashedPassword, displayName || "Voyageur", role, identity_document_front || null, identity_document_back || null]
      );
      const token = import_jsonwebtoken2.default.sign({ uid, email, role }, JWT_SECRET2, { expiresIn: "30d" });
      const fullUser = await getUserProfile(uid);
      res.json({ token, user: fullUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    let { email, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    try {
      if (email === "mandemohamed68@gmail.com" && password === "mm@27071986@") {
        const existing = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
        const hashedPassword = await import_bcrypt2.default.hash("mm@27071986@", 10);
        if (existing.length === 0) {
          const uid = "admin_master";
          await executeSql(
            "INSERT INTO users (uid, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
            [uid, email, hashedPassword, "Super Admin", "admin"]
          );
          console.log("[Auth] Super Admin auto-created upon login request with credentials.");
        } else {
          await executeSql(
            "UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?",
            [hashedPassword, email]
          );
          console.log("[Auth] Super Admin credentials and role auto-repaired upon login request.");
        }
      }
      const users = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
      if (users.length === 0) return res.status(401).json({ error: "Identifiants invalides" });
      const user = users[0];
      if (user.email === "mandemohamed68@gmail.com" && user.role !== "admin") {
        await executeSql("UPDATE users SET role = 'admin' WHERE uid = ?", [user.uid]);
        user.role = "admin";
      }
      const pwdHash = user.passwordHash || user.password_hash;
      if (!pwdHash) return res.status(401).json({ error: "Ce compte n'a pas encore de mot de passe local. Veuillez cliquer sur 'Oubli\xE9 ?' pour en d\xE9finir un." });
      const match = await import_bcrypt2.default.compare(password, pwdHash);
      if (!match) return res.status(401).json({ error: "Identifiants invalides" });
      const token = import_jsonwebtoken2.default.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET2, { expiresIn: "30d" });
      const fullUser = await getUserProfile(user.uid);
      res.json({ token, user: fullUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await getUserProfile(req.user.uid);
      if (!user) return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/residences", async (req, res) => {
    try {
      const { ownerId } = req.query;
      const residences = await getAllResidences(ownerId);
      res.json(residences);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/residences/:id", async (req, res) => {
    try {
      const residence = await getResidenceById(req.params.id);
      if (!residence) return res.status(404).json({ error: "R\xE9sidence non trouv\xE9e" });
      res.json(residence);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/residences", authenticateToken, async (req, res) => {
    try {
      const id = "res_" + Math.random().toString(36).substr(2, 9);
      const data = { ...req.body, id, ownerId: req.user?.uid };
      await createResidence(data);
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/residences/:id", authenticateToken, async (req, res) => {
    try {
      const existing = await getResidenceById(req.params.id);
      if (!existing) return res.status(404).json({ error: "R\xE9sidence non trouv\xE9e" });
      if (existing.ownerId !== req.user?.uid && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      await updateResidence(req.params.id, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/residences/:id", authenticateToken, async (req, res) => {
    try {
      const existing = await getResidenceById(req.params.id);
      if (!existing) return res.status(404).json({ error: "R\xE9sidence non trouv\xE9e" });
      if (existing.ownerId !== req.user?.uid && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      await deleteResidence(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/admin/residences/:id/reassign", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      const { newOwnerId } = req.body;
      if (!newOwnerId) return res.status(400).json({ error: "newOwnerId est requis" });
      await executeSql("UPDATE residences SET owner_id = ? WHERE id = ?", [newOwnerId, req.params.id]);
      await executeSql("UPDATE bookings SET owner_id = ? WHERE residence_id = ?", [newOwnerId, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/bookings", authenticateToken, async (req, res) => {
    try {
      const role = req.query.role;
      const uid = req.user?.uid;
      const isAdmin = req.user?.role === "admin" || req.user?.email === "mandemohamed68@gmail.com";
      const options = { isAdmin };
      if (role === "client") options.clientId = uid;
      else if (role === "owner") options.ownerId = uid;
      else if (!isAdmin) {
        options.clientId = uid;
        options.ownerId = uid;
      }
      const bookings = await getAllBookings(options);
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/residences/:id/bookings", async (req, res) => {
    try {
      const bookings = await executeSql(`
        SELECT id, check_in, check_out, booking_status 
        FROM bookings 
        WHERE residence_id = ? 
        AND booking_status NOT IN ('cancelled', 'declined')
      `, [req.params.id]);
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/residences/:id/reviews", async (req, res) => {
    try {
      const reviews = await getReviewsByResidenceId(req.params.id);
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/bookings", authenticateToken, async (req, res) => {
    try {
      const id = "bk_" + Math.random().toString(36).substr(2, 9);
      const { residenceId, ownerId, checkIn, checkOut, guests, totalPrice, advancePaid, transactionId } = req.body;
      if (!residenceId || !ownerId || !checkIn || !checkOut || !totalPrice) {
        return res.status(400).json({ error: "Donn\xE9es de r\xE9servation incompl\xE8tes" });
      }
      const overlaps = await executeSql(`
        SELECT id, check_in, check_out FROM bookings 
        WHERE residence_id = ? 
        AND booking_status NOT IN ('cancelled', 'declined')
        AND (check_in <= ? AND ? <= check_out)
      `, [residenceId, checkOut, checkIn]);
      if (overlaps.length > 0) {
        return res.status(400).json({
          error: "Ces dates sont d\xE9j\xE0 r\xE9serv\xE9es pour cette r\xE9sidence.",
          overlaps: overlaps.map((o) => ({ from: o.check_in, to: o.check_out }))
        });
      }
      await executeSql(`
        INSERT INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, transaction_id, booking_status, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `, [id, residenceId, req.user?.uid, ownerId, checkIn, checkOut, guests || 1, totalPrice, advancePaid || 0, transactionId || null]);
      res.json({ success: true, id });
    } catch (err) {
      console.error("[API Bookings] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/bookings/:id", authenticateToken, async (req, res) => {
    try {
      const bookingId = req.params.id;
      const oldBookingArr = await executeSql("SELECT * FROM bookings WHERE id = ?", [bookingId]);
      if (oldBookingArr.length === 0) {
        return res.status(404).json({ error: "R\xE9servation introuvable" });
      }
      const oldBooking = oldBookingArr[0];
      const bStatus = oldBooking.booking_status || oldBooking.bookingStatus;
      const bClientId = oldBooking.client_id || oldBooking.clientId;
      const bOwnerId = oldBooking.owner_id || oldBooking.ownerId;
      const bResidenceId = oldBooking.residence_id || oldBooking.residenceId;
      const bRefundStatus = oldBooking.refund_status || oldBooking.refundStatus;
      const bRefundAmount = Number(oldBooking.refund_amount || oldBooking.refundAmount || 0);
      const bRefundPhone = oldBooking.refund_phone || oldBooking.refundPhone || "";
      const bRefundProvider = oldBooking.refund_provider || oldBooking.refundProvider || "";
      let residenceTitle = "R\xE9sidence";
      try {
        const resArr = await executeSql("SELECT title FROM residences WHERE id = ?", [bResidenceId]);
        if (resArr.length > 0) {
          residenceTitle = resArr[0].title;
        }
      } catch (e) {
      }
      let refundMode = "manual";
      try {
        const results = await executeSql("SELECT value FROM settings WHERE `key` = 'global'");
        if (results && results.length > 0) {
          const s = JSON.parse(results[0].value);
          if (s?.refundMode) refundMode = s.refundMode;
        }
      } catch (e) {
      }
      const isCancelling = (req.body.bookingStatus === "cancelled" || req.body.booking_status === "cancelled") && bStatus !== "cancelled";
      if (isCancelling) {
        const refundAmt = Number(req.body.refundAmount || req.body.refund_amount || 0);
        const refPhone = req.body.refundPhone || req.body.refund_phone || "";
        const refProvider = req.body.refundProvider || req.body.refund_provider || "";
        let isAutoRefunded = false;
        let payoutError = null;
        if (refundAmt > 0 && refPhone) {
          if (refundMode === "auto") {
            const payoutResult = await performSappayPayout(refundAmt, refPhone, refProvider);
            if (payoutResult.success) {
              req.body.refundStatus = "refunded";
              req.body.refund_status = "refunded";
              req.body.refundProcessedAt = (/* @__PURE__ */ new Date()).toISOString();
              req.body.refund_processed_at = (/* @__PURE__ */ new Date()).toISOString();
              req.body.transactionId = payoutResult.transactionId;
              req.body.transaction_id = payoutResult.transactionId;
              isAutoRefunded = true;
            } else {
              payoutError = payoutResult.error || "\xC9chec de transaction";
              req.body.refundStatus = "failed";
              req.body.refund_status = "failed";
              req.body.refundReason = payoutError;
              req.body.refund_reason = payoutError;
            }
          } else {
            req.body.refundStatus = "pending";
            req.body.refund_status = "pending";
          }
        }
        const clientNotifId = "not_" + Math.random().toString(36).substr(2, 9);
        let clientMsg = "";
        if (refundAmt > 0) {
          if (refundMode === "auto") {
            if (isAutoRefunded) {
              clientMsg = `Votre s\xE9jour chez "${residenceTitle}" a \xE9t\xE9 annul\xE9. Un remboursement automatique de ${refundAmt} F CFA a \xE9t\xE9 effectu\xE9 vers votre compte Mobile Money ${refPhone} via SapPay (TxID: ${req.body.transactionId}).`;
            } else {
              clientMsg = `Votre s\xE9jour chez "${residenceTitle}" a \xE9t\xE9 annul\xE9. Une tentative de remboursement automatique de ${refundAmt} F CFA a \xE9chou\xE9 (Erreur: ${payoutError}). L'administration a \xE9t\xE9 notifi\xE9e et proc\xE8dera \xE0 un traitement manuel prochainement.`;
            }
          } else {
            clientMsg = `Votre demande d'annulation pour "${residenceTitle}" est enregistr\xE9e. Un remboursement de ${refundAmt} F CFA est en attente d'approbation par l'administration et sera trait\xE9 prochainement.`;
          }
        } else {
          clientMsg = `Votre r\xE9servation pour "${residenceTitle}" a \xE9t\xE9 annul\xE9e de mani\xE8re imm\xE9diate (aucun paiement n'avait \xE9t\xE9 effectu\xE9).`;
        }
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [clientNotifId, bClientId, "Annulation de S\xE9jour \u274C", clientMsg, "booking", bookingId]
        );
        const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
        let hostMsg = "";
        if (refundAmt > 0) {
          if (refundMode === "auto") {
            if (isAutoRefunded) {
              hostMsg = `Le voyageur a annul\xE9 sa r\xE9servation pour "${residenceTitle}". Un remboursement de ${refundAmt} F CFA a \xE9t\xE9 effectu\xE9 automatiquement et avec succ\xE8s via SapPay.`;
            } else {
              hostMsg = `Le voyageur a annul\xE9 sa r\xE9servation pour "${residenceTitle}". Le remboursement automatique de ${refundAmt} F CFA a \xE9chou\xE9 (Erreur: ${payoutError}). L'administration va g\xE9rer la situation.`;
            }
          } else {
            hostMsg = `Le voyageur a annul\xE9 sa r\xE9servation pour "${residenceTitle}". Un remboursement de ${refundAmt} F CFA est en cours de validation manuelle par l'administration.`;
          }
        } else {
          hostMsg = `Le voyageur a annul\xE9 sa r\xE9servation pour "${residenceTitle}" (aucun paiement n'avait \xE9t\xE9 effectu\xE9).`;
        }
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [hostNotifId, bOwnerId, "Annulation Voyageur \u274C", hostMsg, "booking", bookingId]
        );
        try {
          const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin'");
          for (const admin of admins) {
            const adminNotifId = "not_" + Math.random().toString(36).substr(2, 9);
            let adminMsg = "";
            if (refundAmt > 0) {
              if (refundMode === "auto") {
                if (isAutoRefunded) {
                  adminMsg = `[Auto] R\xE9servation ${bookingId} annul\xE9e par le client. Remboursement automatique de ${refundAmt} F CFA pay\xE9 avec succ\xE8s via SapPay.`;
                } else {
                  adminMsg = `[ECHEC AUTO \u26A0\uFE0F] R\xE9servation ${bookingId} annul\xE9e. Remboursement automatique de ${refundAmt} F CFA vers ${refPhone} a \xC9CHOU\xC9 (Erreur: ${payoutError}). Action manuelle ou relance requise.`;
                }
              } else {
                adminMsg = `[Manuel] R\xE9servation ${bookingId} annul\xE9e par le client. Remboursement de ${refundAmt} F CFA vers ${refPhone} en attente de votre approbation.`;
              }
            } else {
              adminMsg = `R\xE9servation ${bookingId} annul\xE9e par le client (Aucun paiement \xE0 rembourser).`;
            }
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [adminNotifId, admin.uid, "Notification de Remboursement \u{1F4B0}", adminMsg, "booking", bookingId]
            );
          }
        } catch (adminErr) {
          console.error("Error notifying admins:", adminErr);
        }
      }
      const isApproval = (req.body.refundStatus === "refunded" || req.body.refund_status === "refunded") && (bRefundStatus === "pending" || bRefundStatus === "failed");
      if (isApproval) {
        const forceManual = req.body.forceManual === true;
        const triggerPayout = req.body.triggerPayout === true;
        delete req.body.forceManual;
        delete req.body.triggerPayout;
        delete req.body.force_manual;
        delete req.body.trigger_payout;
        const runPayout = triggerPayout || refundMode === "auto" && !forceManual;
        if (runPayout && bRefundAmount > 0 && bRefundPhone) {
          const payoutResult = await performSappayPayout(bRefundAmount, bRefundPhone, bRefundProvider);
          if (payoutResult.success) {
            req.body.refundStatus = "refunded";
            req.body.refund_status = "refunded";
            req.body.refundProcessedAt = (/* @__PURE__ */ new Date()).toISOString();
            req.body.refund_processed_at = (/* @__PURE__ */ new Date()).toISOString();
            req.body.transactionId = payoutResult.transactionId;
            req.body.transaction_id = payoutResult.transactionId;
            const clientNotifId = "not_" + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [clientNotifId, bClientId, "Remboursement Effectu\xE9 \u26A1", `Votre remboursement de ${bRefundAmount} F CFA pour le s\xE9jour chez "${residenceTitle}" a \xE9t\xE9 effectu\xE9 avec succ\xE8s par virement automatique SapPay vers votre num\xE9ro ${bRefundPhone} (TxID: ${payoutResult.transactionId}).`, "booking", bookingId]
            );
            const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [hostNotifId, bOwnerId, "Remboursement Finalis\xE9 \u{1F4B0}", `Le remboursement de ${bRefundAmount} F CFA li\xE9 au s\xE9jour chez "${residenceTitle}" a \xE9t\xE9 effectu\xE9 avec succ\xE8s via virement automatique SapPay.`, "booking", bookingId]
            );
          } else {
            req.body.refundStatus = "failed";
            req.body.refund_status = "failed";
            req.body.refundReason = payoutResult.error || "Erreur de virement SapPay";
            req.body.refund_reason = payoutResult.error || "Erreur de virement SapPay";
            const clientNotifId = "not_" + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [clientNotifId, bClientId, "\xC9chec du Remboursement \u26A0\uFE0F", `La tentative de virement automatique pour votre remboursement de ${bRefundAmount} F CFA chez "${residenceTitle}" a \xE9chou\xE9 (Erreur: ${payoutResult.error}). L'administration a \xE9t\xE9 alert\xE9e pour proc\xE9der \xE0 une autre solution.`, "booking", bookingId]
            );
            const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [hostNotifId, bOwnerId, "\xC9chec Remboursement \u26A0\uFE0F", `Le virement de remboursement automatique pour le s\xE9jour chez "${residenceTitle}" a \xE9chou\xE9. L'administration va r\xE9gulariser cela.`, "booking", bookingId]
            );
            await updateBookingStatus(bookingId, req.body);
            return res.status(500).json({ error: `\xC9chec du virement automatique SapPay : ${payoutResult.error || "Erreur API"}` });
          }
        } else {
          req.body.refundStatus = "refunded";
          req.body.refund_status = "refunded";
          req.body.refundProcessedAt = (/* @__PURE__ */ new Date()).toISOString();
          req.body.refund_processed_at = (/* @__PURE__ */ new Date()).toISOString();
          req.body.transactionId = req.body.transactionId || "MANUEL_HORS_PLATEFORME";
          req.body.transaction_id = req.body.transactionId || "MANUEL_HORS_PLATEFORME";
          const clientNotifId = "not_" + Math.random().toString(36).substr(2, 9);
          await executeSql(
            "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [clientNotifId, bClientId, "Remboursement Effectu\xE9 \u2705", `Votre remboursement de ${bRefundAmount} F CFA pour le s\xE9jour chez "${residenceTitle}" a \xE9t\xE9 approuv\xE9 par l'administration et effectu\xE9 avec succ\xE8s (par cash ou autre moyen hors-plateforme).`, "booking", bookingId]
          );
          const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
          await executeSql(
            "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [hostNotifId, bOwnerId, "Remboursement Finalis\xE9 \u{1F4B0}", `Le remboursement de ${bRefundAmount} F CFA li\xE9 au s\xE9jour chez "${residenceTitle}" a \xE9t\xE9 marqu\xE9 comme effectu\xE9 par l'administration (par cash ou autre moyen hors-plateforme).`, "booking", bookingId]
          );
        }
      }
      const isRejection = (req.body.refundStatus === "rejected" || req.body.refund_status === "rejected") && (bRefundStatus === "pending" || bRefundStatus === "failed");
      if (isRejection) {
        const rejectReason = req.body.refundReason || req.body.refund_reason || "Aucun motif sp\xE9cifi\xE9";
        req.body.refundReason = rejectReason;
        req.body.refund_reason = rejectReason;
        const clientNotifId = "not_" + Math.random().toString(36).substr(2, 9);
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [clientNotifId, bClientId, "Remboursement Rejet\xE9 \u274C", `Votre demande de remboursement de ${bRefundAmount} F CFA pour le s\xE9jour chez "${residenceTitle}" a \xE9t\xE9 rejet\xE9e par l'administration. Motif : ${rejectReason}`, "booking", bookingId]
        );
        const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [hostNotifId, bOwnerId, "Remboursement Rejet\xE9 \u274C", `La demande de remboursement de ${bRefundAmount} F CFA pour le s\xE9jour chez "${residenceTitle}" a \xE9t\xE9 rejet\xE9e par l'administration. Motif : ${rejectReason}`, "booking", bookingId]
        );
      }
      await updateBookingStatus(bookingId, req.body);
      res.json({ success: true });
    } catch (err) {
      console.error("[PATCH Booking] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/conversations", authenticateToken, async (req, res) => {
    try {
      const uid = req.user?.uid || "";
      const isAdmin = req.user?.role === "admin" || req.user?.email === "mandemohamed68@gmail.com";
      const convs = await getAllConversations(uid, isAdmin);
      res.json(convs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/conversations", authenticateToken, async (req, res) => {
    try {
      const { participants, relatedId } = req.body;
      const participantsStr = participants.sort().join(",");
      const existing = await executeSql("SELECT id FROM conversations WHERE participants = ? AND (related_id = ? OR related_id IS NULL)", [participantsStr, relatedId]);
      if (existing.length > 0) {
        return res.json({ id: existing[0].id });
      }
      const id = "conv_" + Math.random().toString(36).substr(2, 9);
      await executeSql("INSERT INTO conversations (id, participants, related_id) VALUES (?, ?, ?)", [id, participantsStr, relatedId]);
      res.json({ id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/conversations/:id/messages", authenticateToken, async (req, res) => {
    try {
      const messages = await getMessages(req.params.id);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/conversations/:id/messages", authenticateToken, async (req, res) => {
    try {
      const msgId = "msg_" + Math.random().toString(36).substr(2, 9);
      const { text } = req.body;
      await executeSql("INSERT INTO messages (id, conversation_id, sender_id, text) VALUES (?, ?, ?, ?)", [msgId, req.params.id, req.user?.uid, text]);
      await executeSql("UPDATE conversations SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [text, req.params.id]);
      res.json({ success: true, id: msgId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/users", authenticateToken, async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/users/public", async (req, res) => {
    try {
      const users = await executeSql("SELECT uid, display_name as displayName, photo_url as photoUrl FROM users");
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/users/public", async (req, res) => {
    try {
      const uids = req.body.uids || [];
      if (!uids || uids.length === 0) {
        return res.json({});
      }
      const placeholders = uids.map(() => "?").join(",");
      const users = await executeSql(
        `SELECT uid, display_name as displayName, photo_url as photoUrl FROM users WHERE uid IN (${placeholders})`,
        uids
      );
      const result = {};
      for (const u of users) {
        result[u.uid] = u;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/users/profile", authenticateToken, async (req, res) => {
    try {
      await updateUserProfile(req.user?.uid || "", req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/users/:uid", authenticateToken, async (req, res) => {
    try {
      const userProfile = await getUserProfile(req.params.uid);
      if (!userProfile) {
        return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
      }
      res.json(userProfile);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/users/:uid", authenticateToken, async (req, res) => {
    try {
      if (req.user?.uid !== req.params.uid && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      const updates = { ...req.body };
      if (updates.password) {
        updates.passwordHash = await import_bcrypt2.default.hash(updates.password, 10);
        delete updates.password;
      }
      await updateUserProfile(req.params.uid, updates);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/users/:uid/accept-terms", authenticateToken, async (req, res) => {
    try {
      if (req.user?.uid !== req.params.uid) {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      await executeSql("UPDATE users SET has_accepted_terms = 1 WHERE uid = ?", [req.params.uid]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/users/:uid/favorites", authenticateToken, async (req, res) => {
    try {
      if (req.user?.uid !== req.params.uid) {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      const rows = await executeSql(
        "SELECT residence_id FROM favorites WHERE user_id = ?",
        [req.params.uid]
      );
      res.json(rows.map((r) => r.residence_id));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/users/:uid/favorites/:residenceId", authenticateToken, async (req, res) => {
    try {
      if (req.user?.uid !== req.params.uid) {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      await executeSql(
        "INSERT IGNORE INTO favorites (user_id, residence_id) VALUES (?, ?)",
        [req.params.uid, req.params.residenceId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/users/:uid/favorites/:residenceId", authenticateToken, async (req, res) => {
    try {
      if (req.user?.uid !== req.params.uid) {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      await executeSql(
        "DELETE FROM favorites WHERE user_id = ? AND residence_id = ?",
        [req.params.uid, req.params.residenceId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/verification-types", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Interdit" });
      const types = await executeSql("SELECT * FROM verification_types ORDER BY created_at ASC");
      res.json(types);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/admin/verification-types", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Interdit" });
      const { id, label, description, is_active, isActive } = req.body;
      const activeValue = isActive !== void 0 ? isActive : is_active;
      await executeSql(
        "INSERT INTO verification_types (id, label, description, is_active) VALUES (?, ?, ?, ?)",
        [id || "vt_" + Math.random().toString(36).substr(2, 9), label, description, activeValue !== false ? 1 : 0]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/admin/verification-types/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Interdit" });
      const { label, description, is_active, isActive } = req.body;
      const activeValue = isActive !== void 0 ? isActive : is_active;
      await executeSql(
        "UPDATE verification_types SET label = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [label, description, activeValue !== false ? 1 : 0, req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/admin/verification-types/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Interdit" });
      await executeSql("DELETE FROM verification_types WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/reservations/:id/verifications", authenticateToken, async (req, res) => {
    try {
      const booking = await getBookingById(req.params.id);
      if (!booking) return res.status(404).json({ error: "R\xE9servation non trouv\xE9e" });
      if (req.user?.uid !== booking.ownerId && req.user?.uid !== booking.clientId && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Non autoris\xE9" });
      }
      const activeTypes = await executeSql("SELECT * FROM verification_types WHERE is_active = 1");
      const currentStatus = booking.verificationsStatus ? typeof booking.verificationsStatus === "string" ? JSON.parse(booking.verificationsStatus) : booking.verificationsStatus : {};
      res.json({
        types: Array.isArray(activeTypes) ? activeTypes : [],
        status: currentStatus
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/reservations/:id/verifications", authenticateToken, async (req, res) => {
    try {
      const booking = await getBookingById(req.params.id);
      if (!booking) return res.status(404).json({ error: "R\xE9servation non trouv\xE9e" });
      if (req.user?.uid !== booking.ownerId && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Seul l'h\xF4te peut valider les v\xE9rifications" });
      }
      const { verificationId, status } = req.body;
      if (!verificationId) {
        return res.status(400).json({ error: "verificationId est requis" });
      }
      const currentStatus = booking.verificationsStatus ? typeof booking.verificationsStatus === "string" ? JSON.parse(booking.verificationsStatus) : booking.verificationsStatus : {};
      if (currentStatus[verificationId] === true && status === false) {
        return res.status(403).json({ error: "Cette v\xE9rification est d\xE9j\xE0 valid\xE9e et ne peut pas \xEAtre modifi\xE9e." });
      }
      currentStatus[verificationId] = status;
      await executeSql(
        "UPDATE bookings SET verifications_status = ? WHERE id = ?",
        [JSON.stringify(currentStatus), req.params.id]
      );
      res.json({ success: true, status: currentStatus });
    } catch (err) {
      console.error("[VERIFICATION ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/users/:uid", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "R\xE9serv\xE9 aux administrateurs" });
      }
      const uid = req.params.uid;
      try {
        await executeSql("SET FOREIGN_KEY_CHECKS = 0");
        await executeSql("DELETE FROM support_chat_messages WHERE user_id = ? OR sender_id = ?", [uid, uid]);
        await executeSql("DELETE FROM messages WHERE sender_id = ?", [uid]);
        await executeSql("DELETE FROM notifications WHERE user_id = ?", [uid]);
        await executeSql("DELETE FROM favorites WHERE user_id = ?", [uid]);
        await executeSql("DELETE FROM reviews WHERE client_id = ?", [uid]);
        const userResidences = await executeSql("SELECT id FROM residences WHERE owner_id = ?", [uid]);
        for (const res2 of userResidences) {
          await executeSql("DELETE FROM residence_amenities WHERE residence_id = ?", [res2.id]);
          await executeSql("DELETE FROM residence_images WHERE residence_id = ?", [res2.id]);
          await executeSql("DELETE FROM reviews WHERE residence_id = ?", [res2.id]);
          await executeSql("DELETE FROM residences WHERE id = ?", [res2.id]);
        }
        await executeSql("DELETE FROM bookings WHERE client_id = ?", [uid]);
        await executeSql("UPDATE bookings SET owner_id = NULL WHERE owner_id = ?", [uid]);
        await executeSql("UPDATE withdrawals SET owner_id = NULL WHERE owner_id = ?", [uid]);
        await deleteUser(uid);
        await executeSql("SET FOREIGN_KEY_CHECKS = 1");
        res.json({ success: true });
      } catch (innerErr) {
        await executeSql("SET FOREIGN_KEY_CHECKS = 1");
        throw innerErr;
      }
    } catch (err) {
      console.error("[DELETE USER ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/support/messages", authenticateToken, async (req, res) => {
    try {
      const showAll = req.query.all === "true" && req.user?.role === "admin";
      if (showAll) {
        const rows = await executeSql("SELECT * FROM support_chat_messages ORDER BY created_at ASC");
        res.json(rows);
      } else {
        const rows = await executeSql("SELECT * FROM support_chat_messages WHERE user_id = ? ORDER BY created_at ASC", [req.user?.uid]);
        res.json(rows);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/support/messages", authenticateToken, async (req, res) => {
    try {
      const id = "msg_" + Math.random().toString(36).substr(2, 9);
      let userId = req.user?.uid;
      let senderId = req.user?.uid;
      if (req.user?.role === "admin") {
        if (req.body.user_id) {
          userId = req.body.user_id;
          senderId = "admin";
        }
      }
      await executeSql(
        "INSERT INTO support_chat_messages (id, user_id, sender_id, message) VALUES (?, ?, ?, ?)",
        [id, userId, senderId, req.body.message]
      );
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const settings = await getSettings(req.params.key);
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/settings/:key", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "R\xE9serv\xE9 aux administrateurs" });
      }
      await saveSettings(req.params.key, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/promotions", async (req, res) => {
    try {
      const ads = await getAllAds();
      res.json(ads);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/promotions", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      const id = req.body.id || "ad_" + Math.random().toString(36).substr(2, 9);
      const fields = ["id", "title", "description", "image_url", "link_url", "is_active", "frequency_seconds", "start_at", "end_at"];
      const vals = [
        id,
        req.body.title ?? null,
        req.body.description ?? null,
        (req.body.image_url || req.body.imageUrl) ?? null,
        (req.body.link_url || req.body.linkUrl) ?? null,
        (req.body.is_active !== void 0 ? req.body.is_active : req.body.isActive) ? 1 : 0,
        (req.body.frequency_seconds || req.body.frequencySeconds) ?? 10,
        (req.body.start_at || req.body.startAt) ?? null,
        (req.body.end_at || req.body.endAt) ?? null
      ];
      const placeholders = fields.map(() => "?").join(", ");
      const dbType2 = DB_TYPE;
      if (dbType2 === "mariadb") {
        const nonIdFields = fields.filter((f) => f !== "id");
        const updateClause = nonIdFields.map((f) => `${f} = VALUES(${f})`).join(", ");
        await executeSql(`INSERT INTO advertisements (${fields.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`, vals);
      } else {
        const nonIdFields = fields.filter((f) => f !== "id");
        const sqliteUpdate = nonIdFields.map((f) => `${f} = ?`).join(", ");
        const nonIdVals = vals.filter((_, idx) => fields[idx] !== "id");
        await executeSql(`INSERT INTO advertisements (${fields.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${sqliteUpdate}`, [...vals, ...nonIdVals]);
      }
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/promotions/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      await executeSql("DELETE FROM advertisements WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/faqs", async (req, res) => {
    try {
      const faqs = await executeSql("SELECT * FROM faqs ORDER BY `order` ASC");
      res.json(faqs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/faqs", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      const id = req.body.id || "faq_" + Math.random().toString(36).substr(2, 9);
      const { question, answer, category, order } = req.body;
      const dbType2 = DB_TYPE;
      if (dbType2 === "mariadb") {
        await executeSql("INSERT INTO faqs (id, question, answer, category, `order`) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE question=VALUES(question), answer=VALUES(answer), category=VALUES(category), `order`=VALUES(`order`)", [id, question, answer, category, order]);
      } else {
        await executeSql("INSERT INTO faqs (id, question, answer, category, `order`) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET question=?, answer=?, category=?, `order`=?", [id, question, answer, category, order, question, answer, category, order]);
      }
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/faqs/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      await executeSql("DELETE FROM faqs WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/contact-messages", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      const messages = await getAllContactMessages();
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/contact-messages", async (req, res) => {
    try {
      const id = "cont_" + Math.random().toString(36).substr(2, 9);
      const { name, email, subject, message } = req.body;
      await executeSql("INSERT INTO contact_messages (id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)", [id, name, email, subject, message]);
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/contact-messages/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      const mappedUpdates = {};
      for (const [k, v] of Object.entries(req.body)) {
        let key = k;
        if (k === "repliedAt") key = "replied_at";
        mappedUpdates[key] = formatSqlValue(v);
      }
      const fields = Object.keys(mappedUpdates);
      if (fields.length > 0) {
        const setClause = fields.map((f) => `${f} = ?`).join(", ");
        await executeSql(`UPDATE contact_messages SET ${setClause} WHERE id = ?`, [...Object.values(mappedUpdates), req.params.id]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/contact-messages/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      await executeSql("DELETE FROM contact_messages WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await getAllReviews();
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/reviews/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      await deleteReview(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/withdrawals", authenticateToken, async (req, res) => {
    try {
      const ownerId = req.query.ownerId;
      let targetOwnerId = void 0;
      if (ownerId) {
        targetOwnerId = ownerId;
      } else if (req.user?.role !== "admin") {
        targetOwnerId = req.user?.uid;
      }
      const withdrawals = await getAllWithdrawals(targetOwnerId);
      res.json(withdrawals);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/withdrawals", authenticateToken, async (req, res) => {
    try {
      const id = "wth_" + Math.random().toString(36).substr(2, 9);
      const { amount, phone, provider } = req.body;
      const ownerId = req.user?.uid;
      const ownerName = req.user?.displayName || "H\xF4te ResiFaso";
      const amountNum = parseFloat(amount);
      let withdrawalMode = "manual";
      try {
        const results = await executeSql("SELECT value FROM settings WHERE `key` = 'global'");
        if (results && results.length > 0) {
          const s = JSON.parse(results[0].value);
          if (s?.withdrawalMode) withdrawalMode = s.withdrawalMode;
        }
      } catch (errSettings) {
        console.warn("Error loading global settings for withdrawalMode:", errSettings);
      }
      if (withdrawalMode === "auto") {
        console.log(`[Auto Withdraw] Triggering automatic payout via SapPay for withdrawal request ${id} (Amount: ${amountNum})`);
        const payoutResult = await performSappayPayout(amountNum, phone, provider);
        if (payoutResult.success) {
          await executeSql(
            "INSERT INTO withdrawals (id, owner_id, amount, phone, provider, status, approved_at, transaction_id) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)",
            [id, ownerId, amountNum, phone, provider, (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19), payoutResult.transactionId]
          );
          const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
          await executeSql(
            "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [
              hostNotifId,
              ownerId,
              "Retrait Effectu\xE9 \u26A1",
              `Votre retrait de ${amountNum} F CFA via ${provider.toUpperCase()} a \xE9t\xE9 trait\xE9 automatiquement avec succ\xE8s (TxID SapPay: ${payoutResult.transactionId}).`,
              "payment",
              id
            ]
          );
          try {
            const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
            for (const admin of admins) {
              const adminNotifId = "not_" + Math.random().toString(36).substr(2, 9);
              await executeSql(
                "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  adminNotifId,
                  admin.uid,
                  "Retrait Automatique R\xE9ussi \u26A1",
                  `Un virement automatique de ${amountNum} F CFA pour l'h\xF4te ${ownerName} a \xE9t\xE9 pay\xE9 avec succ\xE8s via SapPay.`,
                  "payment",
                  id
                ]
              );
            }
          } catch (adminErr) {
            console.error("Error notifying admins:", adminErr);
          }
          return res.json({ success: true, id, status: "approved", transactionId: payoutResult.transactionId });
        } else {
          await executeSql(
            "INSERT INTO withdrawals (id, owner_id, amount, phone, provider, status, rejection_reason) VALUES (?, ?, ?, ?, ?, 'failed', ?)",
            [id, ownerId, amountNum, phone, provider, payoutResult.error || "Erreur API SapPay"]
          );
          const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
          await executeSql(
            "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [
              hostNotifId,
              ownerId,
              "\xC9chec du Retrait \u26A0\uFE0F",
              `La tentative de virement automatique pour votre retrait de ${amountNum} F CFA chez ResiFaso a \xE9chou\xE9 (Erreur: ${payoutResult.error || "Erreur API"}). L'administration a \xE9t\xE9 alert\xE9e pour proc\xE9der \xE0 une r\xE9gularisation manuelle.`,
              "payment",
              id
            ]
          );
          try {
            const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
            for (const admin of admins) {
              const adminNotifId = "not_" + Math.random().toString(36).substr(2, 9);
              await executeSql(
                "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  adminNotifId,
                  admin.uid,
                  "\xC9chec Retrait Automatique \u26A0\uFE0F",
                  `Le virement automatique de ${amountNum} F CFA pour l'h\xF4te ${ownerName} a \xE9chou\xE9 (Erreur: ${payoutResult.error}). Une action manuelle est requise.`,
                  "payment",
                  id
                ]
              );
            }
          } catch (adminErr) {
            console.error("Error notifying admins:", adminErr);
          }
          return res.json({ success: false, id, status: "failed", error: payoutResult.error });
        }
      } else {
        await executeSql(
          "INSERT INTO withdrawals (id, owner_id, amount, phone, provider, status) VALUES (?, ?, ?, ?, ?, 'pending')",
          [id, ownerId, amountNum, phone, provider]
        );
        const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [
            hostNotifId,
            ownerId,
            "Demande de Retrait Enregistr\xE9e ! \u{1F4B8}",
            `Votre demande de retrait de ${amountNum} F CFA via ${provider.toUpperCase()} a \xE9t\xE9 enregistr\xE9e. Elle est en attente de validation manuelle par l'administrateur.`,
            "payment",
            id
          ]
        );
        try {
          const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
          for (const admin of admins) {
            const adminNotifId = "not_" + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [
                adminNotifId,
                admin.uid,
                "Nouvelle Demande de Retrait \u{1F4E5}",
                `L'h\xF4te ${ownerName} a demand\xE9 un retrait de ${amountNum} F CFA via ${provider.toUpperCase()}`,
                "payment",
                id
              ]
            );
          }
        } catch (adminErr) {
          console.error("Error notifying admins:", adminErr);
        }
        return res.json({ success: true, id, status: "pending" });
      }
    } catch (err) {
      console.error("Error creating withdrawal request:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/withdrawals/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      const body = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (key === "approvedAt") {
          body["approved_at"] = formatSqlValue(value);
        } else if (key === "ownerId") {
          body["owner_id"] = formatSqlValue(value);
        } else if (key === "createdAt") {
          body["created_at"] = formatSqlValue(value);
        } else if (key === "transactionId") {
          body["transaction_id"] = formatSqlValue(value);
        } else if (key === "rejectionReason") {
          body["rejection_reason"] = formatSqlValue(value);
        } else {
          body[key] = formatSqlValue(value);
        }
      }
      const fields = Object.keys(body);
      const setClause = fields.map((f) => `${f} = ?`).join(", ");
      await executeSql(`UPDATE withdrawals SET ${setClause} WHERE id = ?`, [...Object.values(body), req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/withdrawals/:id/payout", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      const { id } = req.params;
      const withdrawals = await executeSql("SELECT * FROM withdrawals WHERE id = ?", [id]);
      if (!withdrawals || withdrawals.length === 0) {
        return res.status(404).json({ error: "Demande de retrait introuvable" });
      }
      const withd = withdrawals[0];
      const amount = parseFloat(withd.amount);
      const phone = withd.phone;
      const provider = withd.provider;
      const ownerId = withd.owner_id || withd.ownerId;
      let ownerName = "H\xF4te ResiFaso";
      const userRows = await executeSql("SELECT display_name FROM users WHERE uid = ?", [ownerId]);
      if (userRows && userRows.length > 0) {
        ownerName = userRows[0].display_name || "H\xF4te ResiFaso";
      }
      console.log(`[Admin Payout Trigger] Initiating manual/retry payout via SapPay for withdrawal request ${id} (Amount: ${amount})`);
      const payoutResult = await performSappayPayout(amount, phone, provider);
      if (payoutResult.success) {
        await executeSql(
          "UPDATE withdrawals SET status = 'approved', approved_at = ?, transaction_id = ?, rejection_reason = NULL WHERE id = ?",
          [(/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19), payoutResult.transactionId, id]
        );
        const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [
            hostNotifId,
            ownerId,
            "Retrait Valid\xE9 & Pay\xE9 ! \u26A1",
            `Votre demande de retrait de ${amount} F CFA via ${provider.toUpperCase()} a \xE9t\xE9 pay\xE9e automatiquement avec succ\xE8s via SapPay. (ID de transaction: ${payoutResult.transactionId})`,
            "payment",
            id
          ]
        );
        try {
          const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
          for (const admin of admins) {
            const adminNotifId = "not_" + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [
                adminNotifId,
                admin.uid,
                "Retrait Automatique Ex\xE9cut\xE9 (Admin) \u26A1",
                `Le virement SapPay de ${amount} F CFA pour l'h\xF4te ${ownerName} a \xE9t\xE9 effectu\xE9 avec succ\xE8s.`,
                "payment",
                id
              ]
            );
          }
        } catch (adminErr) {
          console.error("Error notifying admins:", adminErr);
        }
        return res.json({ success: true, transactionId: payoutResult.transactionId });
      } else {
        await executeSql(
          "UPDATE withdrawals SET status = 'failed', rejection_reason = ? WHERE id = ?",
          [payoutResult.error || "Erreur de virement SapPay", id]
        );
        const hostNotifId = "not_" + Math.random().toString(36).substr(2, 9);
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [
            hostNotifId,
            ownerId,
            "\xC9chec du Virement de Retrait \u26A0\uFE0F",
            `Le virement automatique pour votre retrait de ${amount} F CFA via ${provider.toUpperCase()} a \xE9chou\xE9 (Erreur: ${payoutResult.error || "Erreur API"}). L'administration proc\xE9dera \xE0 une v\xE9rification manuelle.`,
            "payment",
            id
          ]
        );
        try {
          const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
          for (const admin of admins) {
            const adminNotifId = "not_" + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [
                adminNotifId,
                admin.uid,
                "\xC9chec Virement Retrait \u26A0\uFE0F",
                `Le virement automatique de ${amount} F CFA pour l'h\xF4te ${ownerName} a \xE9chou\xE9 (Erreur: ${payoutResult.error}).`,
                "payment",
                id
              ]
            );
          }
        } catch (adminErr) {
          console.error("Error notifying admins:", adminErr);
        }
        return res.status(500).json({ error: `\xC9chec du virement automatique SapPay : ${payoutResult.error || "Erreur API"}` });
      }
    } catch (err) {
      console.error("Error in trigger payout:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/user-alerts", authenticateToken, async (req, res) => {
    try {
      const { userId } = req.query;
      const targetId = userId || req.user?.uid || "";
      const notifications = await getNotifications(targetId);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/user-alerts", authenticateToken, async (req, res) => {
    try {
      const id = "not_" + Math.random().toString(36).substr(2, 9);
      const { user_id, userId, title, message, type, reference_id, referenceId } = req.body;
      const targetUserId = user_id || userId;
      const targetReferenceId = reference_id || referenceId;
      if (!targetUserId) {
        return res.status(400).json({ error: "user_id is required" });
      }
      await executeSql(
        "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
        [id, targetUserId, title, message, type, targetReferenceId]
      );
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/user-alerts/register-token", authenticateToken, async (req, res) => {
    try {
      const { token, deviceType } = req.body;
      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }
      const success = await registerDeviceToken(req.user.uid, token, deviceType);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/user-alerts/unregister-token", authenticateToken, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }
      const success = await unregisterDeviceToken(token);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/user-alerts/test-push", authenticateToken, async (req, res) => {
    try {
      const { title, body } = req.body;
      const success = await sendPushNotification(
        req.user.uid,
        title || "\u{1F514} Test de Notification ResiFaso",
        body || "F\xE9licitations, vos notifications instantan\xE9es sont configur\xE9es avec succ\xE8s !"
      );
      res.json({ success, message: success ? "Notification de test envoy\xE9e avec succ\xE8s !" : "Aucun appareil enregistr\xE9 trouv\xE9 pour cet utilisateur." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/user-alerts/:id/read", authenticateToken, async (req, res) => {
    try {
      await executeSql("UPDATE notifications SET is_read = 1 WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/user-alerts/read-all", authenticateToken, async (req, res) => {
    try {
      const userId = req.body.userId || req.user?.uid;
      await executeSql("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/admin/reset-db", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      await initDatabase();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/payment/sappay/init", async (req, res) => {
    const { amount, note, email } = req.body;
    try {
      const credentials = await getSappayCredentials();
      const urls = await getSappayBaseUrls();
      const token = await getSappayToken();
      const payload = {
        type: "SIMPLE",
        customer: {
          email: email || "client@resifaso.com",
          country: 1
        },
        amount: parseFloat(amount).toFixed(2),
        note: note || "Validation acompte"
      };
      if (credentials.isTestMode) {
        return res.json({
          invoice_id: `mock_inv_${Date.now()}`,
          access_token: token
        });
      }
      const response = await fetch(`${urls.publicBase}/invoice/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erreur Sappay cr\xE9ation facture : ${text}`);
      }
      const data = await response.json();
      const invoiceId = findInvoiceId(data);
      if (!invoiceId) throw new Error("Impossible de r\xE9cup\xE9rer l'ID de facture.");
      res.json({ invoice_id: invoiceId, access_token: token });
    } catch (error) {
      console.error("Erreur /sappay/init :", error);
      const credentials = await getSappayCredentials();
      if (credentials.isTestMode) {
        return res.json({ invoice_id: `mock_inv_${Date.now()}`, access_token: "mock" });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/payment/sappay/get-otp", async (req, res) => {
    const { customer_msisdn, invoice_id, payment_processor_id, access_token } = req.body;
    const PULL_OPERATORS = [PROCESSOR_ORANGE, PROCESSOR_TELECEL];
    if (PULL_OPERATORS.includes(payment_processor_id)) {
      return res.json({
        trans_id: `manual_otp_${Date.now()}`,
        message: "Veuillez g\xE9n\xE9rer votre code OTP via USSD et le saisir pour valider le paiement."
      });
    }
    try {
      const credentials = await getSappayCredentials();
      const urls = await getSappayBaseUrls();
      if (credentials.isTestMode) {
        return res.json({
          trans_id: `mock_txn_${Date.now()}`,
          message: "Mode test : OTP simul\xE9 (1234 ou 123456)"
        });
      }
      const response = await fetch(`${urls.checkoutBase}/get-otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${access_token}`
        },
        body: JSON.stringify({
          customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
          invoice_id,
          payment_processor_id
        })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erreur Sappay get-otp : ${text}`);
      }
      const data = await response.json();
      res.json({
        trans_id: data.trans_id || data.transaction_id || `txn_${Date.now()}`,
        message: data.message || "OTP envoy\xE9 par SMS."
      });
    } catch (error) {
      console.error("Erreur /sappay/get-otp :", error);
      const credentials = await getSappayCredentials();
      if (credentials.isTestMode) {
        return res.json({ trans_id: `mock_txn_${Date.now()}`, message: "OTP simul\xE9 (1234/123456)" });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app.post(["/api/payments/sappay/perform", "/api/payment/sappay/perform"], async (req, res) => {
    const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token } = req.body;
    try {
      const credentials = await getSappayCredentials();
      const isTestMode = credentials.isTestMode || req.body.isTestMode || false;
      const urls = { checkoutBase: isTestMode ? SAPPAY_BASE_CHECKOUT_SANDBOX : SAPPAY_BASE_CHECKOUT_PROD };
      if (isTestMode) {
        if (otp && (otp === "1234" || otp === "123456" || otp.length >= 4)) {
          return res.json({ status: "SUCCESS", message: "Paiement test r\xE9ussi." });
        }
        return res.status(400).json({ error: "OTP invalide (mode test)" });
      }
      const payload = {
        invoice_id,
        payment_processor_id,
        customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
        otp: otp ? otp.toString() : ""
      };
      if (trans_id) payload.trans_id = trans_id;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${access_token}`
      };
      const response = await fetch(`${urls.checkoutBase}/perform/`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      if (!response.ok) {
        let detail = responseText;
        try {
          const err = JSON.parse(responseText);
          detail = err.message || err.error || detail;
        } catch (e) {
        }
        return res.status(response.status).json({ error: "Erreur Sappay perform", details: detail });
      }
      const data = JSON.parse(responseText);
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Erreur /sappay/perform :", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/submit-review", authenticateToken, async (req, res) => {
    const { bookingId, residenceId, rating, comment } = req.body;
    if (!bookingId || !residenceId || !rating) {
      return res.status(400).json({ error: "Param\xE8tres manquants" });
    }
    try {
      if (req.user?.uid) {
        const userExists = await executeSql("SELECT uid FROM users WHERE uid = ?", [req.user.uid]);
        if (userExists.length === 0) {
          await executeSql(
            "INSERT INTO users (uid, email, role, display_name) VALUES (?, ?, ?, ?)",
            [req.user.uid, req.user.email || "voyageur@resifaso.com", req.user.role || "client", "Voyageur"]
          );
          console.log(`[Review] Auto-created missing user record for ${req.user.uid} to satisfy foreign key constraint.`);
        }
      }
      const reviewId = `rev_${Date.now()}`;
      await executeSql(
        `INSERT INTO reviews (id, booking_id, residence_id, client_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [reviewId, bookingId, residenceId, req.user?.uid, rating, comment || ""]
      );
      const rows = await executeSql(
        `SELECT AVG(rating) as avgRating, COUNT(*) as count FROM reviews WHERE residence_id = ?`,
        [residenceId]
      );
      const avg = Number(rows[0]?.avgRating || 0);
      const count = Number(rows[0]?.count || 0);
      await executeSql(
        `UPDATE residences SET rating = ?, review_count = ? WHERE id = ?`,
        [parseFloat(avg.toFixed(1)), count, residenceId]
      );
      res.json({ success: true, reviewId });
    } catch (error) {
      console.error("Erreur submit-review :", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/upload", authenticateToken, async (req, res) => {
    try {
      if (!req.body.image) return res.status(400).json({ error: "Image requise" });
      const imageUrl = req.body.image;
      res.json({ url: imageUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/partners", async (req, res) => {
    try {
      const partners = await executeSql("SELECT id, name, logo_url as logoUrl, is_active as isActive, website_url as websiteUrl FROM partners ORDER BY created_at DESC");
      res.json(partners);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/admin/partners", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      const { id, name, logoUrl, websiteUrl } = req.body;
      await executeSql("INSERT INTO partners (id, name, logo_url, website_url, is_active) VALUES (?, ?, ?, ?, 1)", [id, name, logoUrl, websiteUrl || null]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/admin/partners/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      const { name, logoUrl, isActive, websiteUrl } = req.body;
      const updates = {};
      if (name !== void 0) updates.name = formatSqlValue(name);
      if (logoUrl !== void 0) updates.logo_url = formatSqlValue(logoUrl);
      if (isActive !== void 0) updates.is_active = isActive ? 1 : 0;
      if (websiteUrl !== void 0) updates.website_url = formatSqlValue(websiteUrl);
      const fields = Object.keys(updates);
      if (fields.length === 0) return res.json({ success: true });
      const setClause = fields.map((f) => `${f} = ?`).join(", ");
      await executeSql(`UPDATE partners SET ${setClause} WHERE id = ?`, [...Object.values(updates), req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/admin/partners/:id", authenticateToken, async (req, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Non autoris\xE9" });
      await executeSql("DELETE FROM partners WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis" });
    email = email.trim().toLowerCase();
    try {
      const users = await executeSql("SELECT uid FROM users WHERE email = ?", [email]);
      if (users.length === 0) return res.status(404).json({ error: "Email inconnu" });
      const token = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = new Date(Date.now() + 3600 * 1e3);
      const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace("T", " ");
      await executeSql("DELETE FROM password_resets WHERE email = ?", [email]);
      await executeSql("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)", [email, token, expiresAtStr]);
      console.log(`[PASSWORD RESET] Code generated for ${email}: ${token}`);
      let emailSent = false;
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = import_nodemailer.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });
          await transporter.sendMail({
            from: process.env.SMTP_FROM || `"ResiFaso" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "ResiFaso - Code de r\xE9initialisation de votre mot de passe",
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #dc2626; margin-top: 0;">ResiFaso</h2>
                <p>Bonjour,</p>
                <p>Voici votre code de r\xE9initialisation de mot de passe :</p>
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #0f172a;">${token}</span>
                </div>
                <p style="font-size: 13px; color: #64748b;">Ce code est valable pendant 1 heure.</p>
                <p style="font-size: 13px; color: #64748b;">Si vous n'avez pas demand\xE9 de r\xE9initialisation, veuillez ignorer cet email.</p>
              </div>
            `
          });
          emailSent = true;
          console.log(`[PASSWORD RESET] Email sent successfully to ${email}`);
        } catch (mailErr) {
          console.error(`[PASSWORD RESET] SMTP Error:`, mailErr);
        }
      }
      res.json({
        success: true,
        message: emailSent ? "Un email avec votre code de r\xE9initialisation a \xE9t\xE9 envoy\xE9." : "Un code de r\xE9initialisation a \xE9t\xE9 g\xE9n\xE9r\xE9.",
        code: token,
        // Returned for testing / preview UI ease
        emailSent,
        email
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    let { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Tous les champs sont requis (Email, Code, Nouveau mot de passe)" });
    }
    email = email.trim().toLowerCase();
    code = code.trim();
    try {
      const resets = await executeSql("SELECT * FROM password_resets WHERE email = ? AND token = ?", [email, code]);
      if (resets.length === 0) {
        return res.status(400).json({ error: "Code de r\xE9initialisation invalide ou email incorrect" });
      }
      const reset = resets[0];
      const expiresAt = new Date(reset.expiresAt || reset.expires_at);
      if (expiresAt.getTime() < Date.now()) {
        await executeSql("DELETE FROM password_resets WHERE email = ?", [email]);
        return res.status(400).json({ error: "Ce code de r\xE9initialisation a expir\xE9. Veuillez en demander un nouveau." });
      }
      const hashedPassword = await import_bcrypt2.default.hash(newPassword, 10);
      await executeSql("UPDATE users SET password_hash = ? WHERE email = ?", [hashedPassword, email]);
      await executeSql("DELETE FROM password_resets WHERE email = ?", [email]);
      console.log(`[PASSWORD RESET] Password successfully updated for ${email}`);
      res.json({ success: true, message: "Votre mot de passe a \xE9t\xE9 r\xE9initialis\xE9 avec succ\xE8s ! Vous pouvez maintenant vous connecter." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Route not found" });
  });
  app.use(import_express.default.static(import_path3.default.join(process.cwd(), "public")));
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path3.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path3.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u2705 Serveur d\xE9marr\xE9 sur http://localhost:${PORT}`);
  });
}
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});
startServer();
//# sourceMappingURL=server.cjs.map
