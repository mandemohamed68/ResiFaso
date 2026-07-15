import { executeSql } from './index';

export const initDatabase = async () => {
  const dbType = process.env.DB_TYPE || (process.env.NODE_ENV === 'production' ? 'mariadb' : 'sqlite');
  console.log(`Initializing local SQL database tables (Dialect: ${dbType})...`);
  
  // Helper for safe column addition
  const safeAlter = async (table: string, column: string, type: string) => {
    try {
      await executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (err: any) {
      // Silently ignore if column exists
      const msg = err.message || '';
      if (msg.includes('duplicate') || msg.includes('already exists') || msg.includes('Duplicate')) {
        return;
      }
      console.warn(`Could not add ${column} to ${table}:`, msg);
    }
  };

  if (dbType === 'mariadb') {
    // MariaDB/MySQL compatible schema
    await executeSql("SET FOREIGN_KEY_CHECKS = 0");
    try {
      // Users Table
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
        host_cancellation_fee DECIMAL(10, 2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    // Migration: Ensure password_hash is large enough (fix for older DBs)
    try {
      await executeSql("ALTER TABLE users ADD COLUMN host_cancellation_fee DECIMAL(10, 2) DEFAULT 0");
    } catch (err) {}
    try {
      await executeSql("ALTER TABLE users ADD COLUMN host_cancellation_rules_text TEXT NULL");
    } catch (err) {}
    
    try {
      await executeSql("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255)");
      await executeSql("ALTER TABLE users MODIFY COLUMN display_name VARCHAR(500)");
      await executeSql("ALTER TABLE users MODIFY COLUMN identity_document_front LONGTEXT");
      await executeSql("ALTER TABLE users MODIFY COLUMN identity_document_back LONGTEXT");
      await executeSql("ALTER TABLE users MODIFY COLUMN id_card_url LONGTEXT");
      console.log("Migration MariaDB: Colonnes users document et password_hash mises à jour.");
    } catch (err) {}

    try {
      await executeSql("ALTER TABLE users CHANGE photo_url photo_url LONGTEXT");
    } catch (err) {}

    // Ensure 'uid' column exists in MariaDB for compatibility with imported SQL dumps
    try {
      const columns: any = await executeSql(`
        SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH
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
        } catch (err) {}
        await executeSql(updateQuery);
        
        await executeSql("ALTER TABLE users MODIFY uid VARCHAR(255) NOT NULL");
        await executeSql("ALTER TABLE users ADD UNIQUE KEY uk_users_uid (uid)");
      } else {
        // Make sure we resolve any null/empty values before modifying column to NOT NULL
        let updateQuery = "UPDATE users SET uid = email WHERE uid IS NULL OR uid = ''";
        try {
          const idCheck = await executeSql(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'
          `);
          if (idCheck && idCheck.length > 0) {
            updateQuery = "UPDATE users SET uid = COALESCE(id, email) WHERE uid IS NULL OR uid = ''";
          }
        } catch (err) {}
        await executeSql(updateQuery);

        // Force length to 255 to match notifications.user_id and ensure unique index
        await executeSql("ALTER TABLE users MODIFY uid VARCHAR(255) NOT NULL");
        
        const indexes: any = await executeSql(`
          SHOW INDEX FROM users WHERE Column_name = 'uid' AND Non_unique = 0
        `);
        if (!indexes || indexes.length === 0) {
          await executeSql("ALTER TABLE users ADD UNIQUE KEY uk_users_uid (uid)");
        }
      }

      // Ensure 'password_hash' column exists (might be named 'password' in imported dumps)
      const pwColumns: any = await executeSql(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' 
        AND COLUMN_NAME IN ('password_hash', 'password')
      `);

      const hasPasswordHash = pwColumns.some((c: any) => (c.columnName || c.COLUMN_NAME) === 'password_hash');
      const hasPassword = pwColumns.some((c: any) => (c.columnName || c.COLUMN_NAME) === 'password');

      if (!hasPasswordHash && hasPassword) {
        console.log("Migration MariaDB: Renommage de 'password' en 'password_hash'...");
        await executeSql("ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255)");
      } else if (!hasPasswordHash && !hasPassword) {
        console.log("Migration MariaDB: Ajout de la colonne 'password_hash'...");
        await executeSql("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)");
      }

      // Ensure all extra user columns exist for MariaDB
      const extraCols = ['identity_document_front', 'identity_document_back', 'permissions', 'id_number', 'id_type', 'id_expiry', 'id_card_url', 'verification_status', 'has_accepted_terms', 'host_cancellation_fee', 'host_cancellation_rules_text', 'deactivated'];
      for (const col of extraCols) {
        const columns: any = await executeSql(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = ?
        `, [col]);
        if (!columns || columns.length === 0) {
          console.log(`Migration MariaDB: Ajout de la colonne '${col}'...`);
          let typeDef = "LONGTEXT NULL";
          if (col === 'verification_status') {
            typeDef = "VARCHAR(50) DEFAULT 'none'";
          } else if (col === 'id_card_url' || col === 'identity_document_front' || col === 'identity_document_back' || col === 'display_name') {
            typeDef = "LONGTEXT NULL";
          } else if (col === 'id_number' || col === 'id_type' || col === 'id_expiry') {
            typeDef = "VARCHAR(255) NULL";
          } else if (col === 'has_accepted_terms') {
            typeDef = "BOOLEAN DEFAULT 0";
          } else if (col === 'host_cancellation_fee') {
            typeDef = "DECIMAL(10, 2) DEFAULT 0";
          } else if (col === 'host_cancellation_rules_text') {
            typeDef = "TEXT NULL";
          }
          try {
            await executeSql(`ALTER TABLE users ADD COLUMN ${col} ${typeDef}`);
          } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('duplicate') || msg.includes('already exists') || msg.includes('Duplicate')) {
              console.log(`Colonne '${col}' existe déjà.`);
            } else {
              console.error(`Erreur lors de l'ajout de la colonne '${col}':`, msg);
            }
          }
        } else {
          // If column exists, ensure it's LONGTEXT for documents
          if (['identity_document_front', 'identity_document_back', 'id_card_url'].includes(col)) {
             try {
               await executeSql(`ALTER TABLE users MODIFY COLUMN ${col} LONGTEXT`);
             } catch (err) {}
          }
        }
      }
    } catch (err: any) {
      console.warn("Migration MariaDB users check failed:", err.message);
    }

    // Ensure a trigger exists to keep 'id' and 'uid' in sync on insertion
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
      console.log("Migration MariaDB: Déclencheur before_insert_users opérationnel.");
    } catch (err: any) {
      console.warn("Avertissement: Impossible de créer ou vérifier le déclencheur before_insert_users (cela est normal si l'utilisateur de la base de données n'a pas les privilèges TRIGGER):", err.message);
    }

    // Residences Table
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
        console.log("Migration MariaDB: Colonnes rating et review_count ajoutées à la table residences.");
      }
    } catch (err: any) {
      console.warn("Avertissement migration MariaDB residences.rating/review_count:", err.message);
    }

    try {
      const phoneCols = await executeSql("SHOW COLUMNS FROM residences LIKE 'owner_phone'");
      if (!phoneCols || phoneCols.length === 0) {
        await executeSql("ALTER TABLE residences ADD COLUMN owner_phone VARCHAR(50)");
        console.log("Migration MariaDB: Colonne owner_phone ajoutée à la table residences.");
      }
    } catch (phoneErr: any) {
      console.warn("Avertissement migration MariaDB residences.owner_phone:", phoneErr.message);
    }

    try {
      const cols = await executeSql("SHOW COLUMNS FROM residences LIKE 'utilities_included'");
      if (!cols || cols.length === 0) {
        await executeSql("ALTER TABLE residences ADD COLUMN utilities_included TEXT");
        console.log("Migration MariaDB: Colonne utilities_included ajoutée à la table residences.");
      }
    } catch (colErr: any) {
      console.warn("Avertissement migration MariaDB residences.utilities_included:", colErr.message);
    }

    try {
      await executeSql("ALTER TABLE residences MODIFY COLUMN type VARCHAR(100) NULL");
      console.log("Migration MariaDB: Colonne type de residences modifiée en VARCHAR(100).");
    } catch (typeErr: any) {
      console.warn("Avertissement migration MariaDB residences.type:", typeErr.message);
    }

    // Residence Amenities Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_amenities (
        residence_id VARCHAR(128),
        amenity VARCHAR(100),
        PRIMARY KEY (residence_id, amenity),
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Residence Images Table
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
    } catch (err) {}

    // Bookings Table
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
        console.log("Migration MariaDB: Colonne verifications_status ajoutée à la table bookings.");
      }
    } catch (err: any) {
      console.warn("Avertissement migration MariaDB bookings.verifications_status:", err.message);
    }

    // Reviews Table
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

    // Withdrawals Table
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

    // Advertisements Table
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
    } catch (err) {}

    // Settings Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      ) ENGINE=InnoDB
    `);

    // FAQ Table
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
    } catch (err: any) {
      console.error("Error creating faqs table:", err.message);
    }

    // Conversations Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(128) PRIMARY KEY,
        participants TEXT NOT NULL,
        last_message TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        related_id VARCHAR(128)
      ) ENGINE=InnoDB
    `);

    // Messages Table
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

    // Notifications Table (with corrected user_id length matching users.uid)
    try {
      let uidLength = 128; // Default fallback
      try {
        const uidCols: any = await executeSql(`
          SELECT CHARACTER_MAXIMUM_LENGTH 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'uid'
        `);
        if (uidCols && uidCols.length > 0 && uidCols[0].CHARACTER_MAXIMUM_LENGTH) {
          uidLength = Number(uidCols[0].CHARACTER_MAXIMUM_LENGTH);
        }
      } catch (lenErr) {
        // Fallback to 128
      }

      await executeSql(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(${uidLength}) NOT NULL,
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
      } catch (colErr: any) {
        // Fallback or ignore
      }

      // Explicitly modify existing user_id column to match users.uid length
      try {
        await executeSql(`ALTER TABLE notifications MODIFY COLUMN user_id VARCHAR(${uidLength}) NOT NULL`);
      } catch (modifyErr: any) {
        // Ignored or already aligned
      }
      
      // Attempt FK creation separately so it doesn't block the whole table creation if it fails
      try {
        const existingFks = await executeSql("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND CONSTRAINT_NAME = 'fk_notifications_user'");
        if (!existingFks || existingFks.length === 0) {
          await executeSql("ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY(user_id) REFERENCES users(uid) ON DELETE CASCADE");
        }
      } catch (fkErr: any) {
        // FK might already exist or user table doesn't match
        console.warn("FK notification creation warning (maybe already exists):", fkErr.message);
      }
    } catch (err: any) {
      console.error("Erreur table notifications:", err.message);
    }

    // Password Resets Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(255) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL
      ) ENGINE=InnoDB
    `);

    // Support Chat Messages
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

    // Favorites
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

    // Contact Messages
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
      console.log("Migration MariaDB: Colonnes admin_notes et replied_at vérifiées pour contact_messages.");
    } catch (msgColErr: any) {
      console.warn("Avertissement migration MariaDB contact_messages:", msgColErr.message);
    }
    } finally {
      await executeSql("SET FOREIGN_KEY_CHECKS = 1");
    }
  } else {
    // SQLite compatible schema (unchanged)
    // Users Table
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure extra columns exist in SQLite (idempotent)
    const sqliteExtraCols = [
      { name: 'identity_document_front', type: 'TEXT' },
      { name: 'identity_document_back', type: 'TEXT' },
      { name: 'permissions', type: 'TEXT' },
      { name: 'id_number', type: 'TEXT' },
      { name: 'id_type', type: 'TEXT' },
      { name: 'id_expiry', type: 'TEXT' },
      { name: 'id_card_url', type: 'TEXT' },
      { name: 'verification_status', type: "TEXT DEFAULT 'none'" },
      { name: 'has_accepted_terms', type: 'INTEGER DEFAULT 0' },
      { name: 'host_cancellation_fee', type: 'REAL DEFAULT 0' },
      { name: 'host_cancellation_rules_text', type: 'TEXT' },
      { name: 'deactivated', type: 'INTEGER DEFAULT 0' }
    ];

    // Users extra columns
    for (const col of sqliteExtraCols) {
      await safeAlter('users', col.name, col.type);
    }

    // Residences Table
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
        utilities_included TEXT,
        owner_phone TEXT,
        rating REAL DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(uid)
      )
    `);

    await safeAlter('residences', 'utilities_included', 'TEXT');
    await safeAlter('residences', 'owner_phone', 'TEXT');
    await safeAlter('residences', 'rating', 'REAL DEFAULT 0');
    await safeAlter('residences', 'review_count', 'INTEGER DEFAULT 0');

    // Residence Amenities Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_amenities (
        residence_id TEXT,
        amenity TEXT,
        PRIMARY KEY (residence_id, amenity),
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )
    `);

    // Residence Images Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        residence_id TEXT,
        image_url TEXT NOT NULL,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )
    `);

    // Bookings Table
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
        verifications_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(residence_id) REFERENCES residences(id),
        FOREIGN KEY(client_id) REFERENCES users(uid),
        FOREIGN KEY(owner_id) REFERENCES users(uid)
      )
    `);

    // Reviews Table
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

    // Withdrawals Table
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

    // Advertisements Table
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

    // Settings Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // FAQ Table
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
    } catch (err: any) {
      console.error("Error creating faqs table (sqlite):", err.message);
    }

    // Conversations Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        participants TEXT NOT NULL,
        last_message TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        related_id TEXT
      )
    `);

    // Messages Table
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

    // Support Chat Messages
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

    // Notifications Table
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

    // Password Resets Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);

    // Contact Messages
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

    await safeAlter('contact_messages', 'admin_notes', 'TEXT');
    await safeAlter('contact_messages', 'replied_at', 'TEXT');
  }

    // Verification Types table
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

    // Add verifications_status to bookings if not exists
    await safeAlter('bookings', 'verifications_status', 'TEXT');

    // Seed default verification types
    try {
      const existingTypes = await executeSql("SELECT id FROM verification_types LIMIT 1");
      if (!existingTypes || existingTypes.length === 0) {
        const defaultTypes = [
          { id: 'id_valid', label: 'Pièce d’identité valide (recto/verso)', description: 'Vérifier que la pièce est originale et en cours de validité.' },
          { id: 'age_check', label: 'Âge ≥ 18 ans', description: 'Vérifier que le client est majeur.' },
          { id: 'name_match', label: 'Correspondance du nom', description: 'Le nom sur la pièce doit correspondre au nom de la réservation.' },
          { id: 'contract_sign', label: 'Signature du contrat', description: 'Si applicable, le contrat de location a été signé.' }
        ];
        for (const type of defaultTypes) {
          await executeSql(
            "INSERT INTO verification_types (id, label, description, is_active) VALUES (?, ?, ?, 1)",
            [type.id, type.label, type.description]
          );
        }
      }
    } catch (err) {}

  // Seed default settings if they do not exist
  try {
    const existingGlobal = await executeSql("SELECT * FROM settings WHERE `key` = 'global'");
    if (!existingGlobal || existingGlobal.length === 0) {
      await executeSql("INSERT INTO settings (`key`, value) VALUES ('global', ?)", [JSON.stringify({})]);
      console.log("Seeded 'global' setting with default empty object.");
    }
  } catch (seedErr: any) {
    console.warn("Could not seed default settings:", seedErr.message);
  }

  // Seed default FAQs if they do not exist
  try {
    const existingFaqs = await executeSql("SELECT id FROM faqs LIMIT 1");
    if (!existingFaqs || existingFaqs.length === 0) {
      console.log("Seeding default FAQs...");
      const defaultFaqs = [
        {
          id: 'faq_gen_1',
          question: "Qu'est-ce que ResiFaso ?",
          answer: "ResiFaso est la plateforme de référence au Burkina Faso pour la réservation de résidences meublées, d'appartements et de chambres d'hôtes. Nous connectons des hôtes locaux de confiance avec des voyageurs à la recherche d'un séjour confortable et sécurisé.",
          category: 'general',
          order: 1
        },
        {
          id: 'faq_gen_2',
          question: "Comment puis-je contacter l'assistance clientèle ?",
          answer: "Vous pouvez nous contacter directement en remplissant notre formulaire sur la page de Contact, ou nous envoyer un message via WhatsApp ou par appel téléphonique pour obtenir une réponse rapide de nos équipes.",
          category: 'general',
          order: 2
        },
        {
          id: 'faq_book_1',
          question: "Comment réserver une résidence sur ResiFaso ?",
          answer: "Recherchez la ville ou le quartier de votre choix, sélectionnez la résidence qui répond à vos besoins, choisissez vos dates et cliquez sur 'Réserver'. Vous devrez ensuite verser un acompte de garantie (généralement 30%) par Mobile Money pour confirmer votre réservation.",
          category: 'booking',
          order: 1
        },
        {
          id: 'faq_book_2',
          question: "Puis-je modifier ou annuler ma réservation ?",
          answer: "Oui, vous pouvez demander l'annulation de votre séjour depuis votre espace client dans l'onglet 'Mes Séjours'. Selon la politique d'annulation de l'hôte et la proximité de votre séjour, un remboursement complet ou partiel de l'acompte pourra être accordé.",
          category: 'booking',
          order: 2
        },
        {
          id: 'faq_pay_1',
          question: "Quels sont les moyens de paiement acceptés ?",
          answer: "Nous acceptons les paiements mobiles les plus populaires au Burkina Faso : Orange Money et Moov Money. Toutes les transactions sont chiffrées et hautement sécurisées pour votre sérénité.",
          category: 'payment',
          order: 1
        },
        {
          id: 'faq_pay_2',
          question: "Comment fonctionne l'acompte et le solde restant ?",
          answer: "Pour réserver une résidence, vous payez un acompte de 30% en ligne via Mobile Money lors de la confirmation. Les 70% restants (le solde) doivent être réglés directement à l'hôte lors de votre arrivée et de la remise des clés.",
          category: 'payment',
          order: 2
        },
        {
          id: 'faq_host_1',
          question: "Comment inscrire ma résidence ou mon appartement ?",
          answer: "Inscrivez-vous sur ResiFaso, accédez à votre profil et demandez à activer l'espace Hôte. Une fois activé, vous pourrez lister vos propriétés avec des photos, descriptifs, tarifs, secteur et équipements gratuitement.",
          category: 'host',
          order: 1
        },
        {
          id: 'faq_host_2',
          question: "Comment et quand puis-je retirer mes gains d'hôte ?",
          answer: "Les acomptes payés en ligne par vos clients sont ajoutés à votre portefeuille hôte. Vous pouvez soumettre une demande de retrait vers votre compte Orange Money ou Moov Money directement depuis votre tableau de bord dès que vous le souhaitez.",
          category: 'host',
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
  } catch (faqErr: any) {
    console.warn("Could not seed default FAQs:", faqErr.message);
  }

  // --- SEEDING SUPER ADMIN ---
  try {
    const superAdminEmail = 'mandemohamed68@gmail.com';
    const superAdminPass = 'mm@27071986@';
    
    const existing = await executeSql("SELECT uid FROM users WHERE email = ?", [superAdminEmail]);
    if (!existing || existing.length === 0) {
      console.log("Seeding Super Admin...");
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash(superAdminPass, 10);
      const uid = 'admin_master';
      await executeSql(
        "INSERT INTO users (uid, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
        [uid, superAdminEmail, hashedPassword, 'Super Admin', 'admin']
      );
      console.log("Super Admin créé avec succès.");
    } else {
      // Ensure role is admin even if it was changed
      await executeSql("UPDATE users SET role = 'admin' WHERE email = ?", [superAdminEmail]);
    }
  } catch (seedErr: any) {
    console.error("Erreur lors du seeding du Super Admin:", seedErr.message);
  }

  console.log("SQL Database tables initialized successfully.");
};
