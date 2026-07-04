import { executeSql } from './index';

export const initDatabase = async () => {
  console.log("Initializing local SQL database tables...");

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
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // FAQ Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS faq (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      order_index INTEGER DEFAULT 0
    )
  `);

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

  console.log("SQL Database tables initialized successfully.");
};
