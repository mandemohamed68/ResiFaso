import { executeSql } from './index';

export const initDatabase = async () => {
  const dbType = process.env.DB_TYPE || 'sqlite';
  console.log(`Initializing local SQL database tables (Dialect: ${dbType})...`);

  if (dbType === 'mariadb') {
    // MariaDB/MySQL compatible schema
    // Users Table
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

    // Ensure 'uid' column exists in MariaDB for compatibility with imported SQL dumps
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
        
        // Check if 'id' column exists to copy values from
        const idColumns = await executeSql(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'id'
        `);
        
        if (idColumns && idColumns.length > 0) {
          // Add 'uid' column
          await executeSql("ALTER TABLE users ADD COLUMN uid VARCHAR(128) NULL");
          // Copy 'id' values to 'uid'
          await executeSql("UPDATE users SET uid = id WHERE uid IS NULL");
          // Add unique constraint to make it referenceable by foreign keys
          await executeSql("ALTER TABLE users ADD UNIQUE KEY (uid)");
          console.log("Migration MariaDB: Colonne 'uid' ajoutée et synchronisée avec 'id' avec succès.");
        } else {
          // If neither 'uid' nor 'id' exists (should not happen), add 'uid'
          await executeSql("ALTER TABLE users ADD COLUMN uid VARCHAR(128) PRIMARY KEY");
        }
      }
    } catch (err: any) {
      console.error("Erreur lors de la vérification/migration de la colonne 'uid' de la table 'users':", err.message);
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(uid) ON DELETE CASCADE
      )
    `);

    // Residence Amenities Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_amenities (
        residence_id VARCHAR(128),
        amenity VARCHAR(100),
        PRIMARY KEY (residence_id, amenity),
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )
    `);

    // Residence Images Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS residence_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        residence_id VARCHAR(128),
        image_url TEXT NOT NULL,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )
    `);

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(residence_id) REFERENCES residences(id) ON DELETE SET NULL,
        FOREIGN KEY(client_id) REFERENCES users(uid) ON DELETE SET NULL,
        FOREIGN KEY(owner_id) REFERENCES users(uid) ON DELETE SET NULL
      )
    `);

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
      )
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
      )
    `);

    // Advertisements Table
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

    // Settings Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      )
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
        )
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
      )
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
      )
    `);

    // Notifications Table
    try {
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
      console.log("Table 'notifications' checked/created successfully.");
    } catch (err: any) {
      console.error("Error creating notifications table:", err.message);
    }

    // Password Resets Table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(255) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL
      )
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    // SQLite compatible schema
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
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(uid)
      )
    `);

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

    // Notifications Table
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

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

  console.log("SQL Database tables initialized successfully.");
};
