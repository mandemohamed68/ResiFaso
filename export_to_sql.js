import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  appId: config.appId
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, config.firestoreDatabaseId || "(default)");

const escapeSql = (val) => {
  if (val === undefined || val === null) return "NULL";
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'number') return val;
  if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
};

async function exportDatabase() {
  console.log("Démarrage de l'exportation des collections Firebase Firestore...");
  let sql = `-- Dump Complet pour MariaDB / MySQL\n`;
  sql += `-- Généré le ${new Date().toISOString()}\n`;
  sql += `-- Contient toutes les tables, données et images (URLs de stockage)\n\n`;

  try {
    // 1. Users
    console.log("Exportation de la table 'users'...");
    sql += `CREATE TABLE IF NOT EXISTS users (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  email VARCHAR(255) NOT NULL UNIQUE,\n`;
    sql += `  display_name VARCHAR(255) NOT NULL,\n`;
    sql += `  phone_number VARCHAR(50),\n`;
    sql += `  photo_url TEXT,\n`;
    sql += `  role VARCHAR(50) DEFAULT 'client',\n`;
    sql += `  is_verified BOOLEAN DEFAULT FALSE,\n`;
    sql += `  is_suspended BOOLEAN DEFAULT FALSE,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `) PARTITION BY KEY(id) PARTITIONS 4;\n\n`;

    const usersSnap = await getDocs(collection(db, 'users'));
    const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
    
    if (users.length > 0) {
      users.forEach(u => {
        sql += `INSERT IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at) VALUES (\n`;
        sql += `  ${escapeSql(u.uid)},\n`;
        sql += `  ${escapeSql(u.email)},\n`;
        sql += `  ${escapeSql(u.displayName || u.display_name || '')},\n`;
        sql += `  ${escapeSql(u.phoneNumber || u.phone_number || '')},\n`;
        sql += `  ${escapeSql(u.photoURL || u.photo_url || '')},\n`;
        sql += `  ${escapeSql(u.role || 'client')},\n`;
        sql += `  ${escapeSql(u.isVerified || false)},\n`;
        sql += `  ${escapeSql(u.isSuspended || false)},\n`;
        sql += `  ${escapeSql(u.createdAt ? (String(u.createdAt).includes('T') ? new Date(u.createdAt).toISOString().replace('T', ' ').substring(0, 19) : u.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 2. Residences
    console.log("Exportation de la table 'residences'...");
    sql += `CREATE TABLE IF NOT EXISTS residences (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  owner_id VARCHAR(128) NOT NULL,\n`;
    sql += `  owner_name VARCHAR(255),\n`;
    sql += `  owner_phone VARCHAR(50),\n`;
    sql += `  title VARCHAR(255) NOT NULL,\n`;
    sql += `  description TEXT,\n`;
    sql += `  type VARCHAR(100) NOT NULL,\n`;
    sql += `  price_per_night DECIMAL(10, 2) NOT NULL,\n`;
    sql += `  advance_percentage INT DEFAULT 0,\n`;
    sql += `  cleaning_fee DECIMAL(10, 2) DEFAULT 0,\n`;
    sql += `  service_fee DECIMAL(10, 2) DEFAULT 0,\n`;
    sql += `  city VARCHAR(100),\n`;
    sql += `  neighborhood VARCHAR(100),\n`;
    sql += `  street VARCHAR(255),\n`;
    sql += `  lat DECIMAL(10, 8),\n`;
    sql += `  lng DECIMAL(11, 8),\n`;
    sql += `  capacity INT DEFAULT 1,\n`;
    sql += `  bedrooms INT DEFAULT 1,\n`;
    sql += `  beds INT DEFAULT 1,\n`;
    sql += `  bathrooms INT DEFAULT 1,\n`;
    sql += `  rooms INT DEFAULT 1,\n`;
    sql += `  status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  availability_status VARCHAR(50) DEFAULT 'available',\n`;
    sql += `  promoted BOOLEAN DEFAULT FALSE,\n`;
    sql += `  weekly_discount INT DEFAULT 0,\n`;
    sql += `  monthly_discount INT DEFAULT 0,\n`;
    sql += `  promo_price DECIMAL(10, 2),\n`;
    sql += `  rejection_reason TEXT,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `) PARTITION BY KEY(id) PARTITIONS 4;\n\n`;

    const resSnap = await getDocs(collection(db, 'residences'));
    const residences = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (residences.length > 0) {
      residences.forEach(r => {
        sql += `INSERT IGNORE INTO residences (id, owner_id, owner_name, owner_phone, title, description, type, price_per_night, advance_percentage, cleaning_fee, service_fee, city, neighborhood, street, lat, lng, capacity, bedrooms, beds, bathrooms, rooms, status, availability_status, promoted, weekly_discount, monthly_discount, promo_price, rejection_reason, created_at) VALUES (\n`;
        sql += `  ${escapeSql(r.id)},\n`;
        sql += `  ${escapeSql(r.ownerId || r.owner_id)},\n`;
        sql += `  ${escapeSql(r.ownerName || r.owner_name || '')},\n`;
        sql += `  ${escapeSql(r.ownerPhone || r.owner_phone || '')},\n`;
        sql += `  ${escapeSql(r.title)},\n`;
        sql += `  ${escapeSql(r.description)},\n`;
        sql += `  ${escapeSql(r.type || 'appartement')},\n`;
        sql += `  ${escapeSql(r.pricePerNight || r.price || r.pricePerNight === 0 ? r.pricePerNight : 0)},\n`;
        sql += `  ${escapeSql(r.advancePercentage || 0)},\n`;
        sql += `  ${escapeSql(r.cleaningFee || 0)},\n`;
        sql += `  ${escapeSql(r.serviceFee || 0)},\n`;
        sql += `  ${escapeSql(r.address?.city || r.city || '')},\n`;
        sql += `  ${escapeSql(r.address?.neighborhood || r.neighborhood || '')},\n`;
        sql += `  ${escapeSql(r.address?.street || '')},\n`;
        sql += `  ${escapeSql(r.lat || null)},\n`;
        sql += `  ${escapeSql(r.lng || null)},\n`;
        sql += `  ${escapeSql(r.capacity || 1)},\n`;
        sql += `  ${escapeSql(r.bedrooms || 1)},\n`;
        sql += `  ${escapeSql(r.beds || 1)},\n`;
        sql += `  ${escapeSql(r.bathrooms || 1)},\n`;
        sql += `  ${escapeSql(r.rooms || 1)},\n`;
        sql += `  ${escapeSql(r.status || 'pending')},\n`;
        sql += `  ${escapeSql(r.availabilityStatus || 'available')},\n`;
        sql += `  ${escapeSql(r.promoted ? 1 : 0)},\n`;
        sql += `  ${escapeSql(r.weeklyDiscount || 0)},\n`;
        sql += `  ${escapeSql(r.monthlyDiscount || 0)},\n`;
        sql += `  ${escapeSql(r.promoPrice || null)},\n`;
        sql += `  ${escapeSql(r.rejectionReason || null)},\n`;
        sql += `  ${escapeSql(r.createdAt ? (String(r.createdAt).includes('T') ? new Date(r.createdAt).toISOString().replace('T', ' ').substring(0, 19) : r.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 3. Amenities
    console.log("Exportation de la table 'residence_amenities'...");
    sql += `CREATE TABLE IF NOT EXISTS residence_amenities (\n`;
    sql += `  residence_id VARCHAR(128),\n`;
    sql += `  amenity VARCHAR(100),\n`;
    sql += `  PRIMARY KEY (residence_id, amenity)\n`;
    sql += `) PARTITION BY KEY(residence_id) PARTITIONS 4;\n\n`;

    if (residences.length > 0) {
      residences.forEach(r => {
        if (r.amenities && Array.isArray(r.amenities)) {
          r.amenities.forEach(a => {
            sql += `INSERT IGNORE INTO residence_amenities (residence_id, amenity) VALUES (${escapeSql(r.id)}, ${escapeSql(a)});\n`;
          });
        }
      });
      sql += '\n';
    }

    // 4. Images
    console.log("Exportation de la table 'residence_images'...");
    sql += `CREATE TABLE IF NOT EXISTS residence_images (\n`;
    sql += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
    sql += `  residence_id VARCHAR(128),\n`;
    sql += `  image_url TEXT NOT NULL\n`;
    sql += `) PARTITION BY KEY(id) PARTITIONS 4;\n\n`;

    if (residences.length > 0) {
      residences.forEach(r => {
        if (r.images && Array.isArray(r.images)) {
          r.images.forEach(img => {
            sql += `INSERT IGNORE INTO residence_images (residence_id, image_url) VALUES (${escapeSql(r.id)}, ${escapeSql(img)});\n`;
          });
        }
      });
      sql += '\n';
    }

    // 5. Bookings
    console.log("Exportation de la table 'bookings'...");
    sql += `CREATE TABLE IF NOT EXISTS bookings (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  residence_id VARCHAR(128) NOT NULL,\n`;
    sql += `  client_id VARCHAR(128) NOT NULL,\n`;
    sql += `  owner_id VARCHAR(128) NOT NULL,\n`;
    sql += `  check_in DATE NOT NULL,\n`;
    sql += `  check_out DATE NOT NULL,\n`;
    sql += `  guests INT DEFAULT 1,\n`;
    sql += `  total_price DECIMAL(10, 2) NOT NULL,\n`;
    sql += `  advance_paid DECIMAL(10, 2) DEFAULT 0,\n`;
    sql += `  payment_status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  booking_status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  transaction_id VARCHAR(255),\n`;
    sql += `  cancelled_by VARCHAR(50) NULL,\n`;
    sql += `  cancellation_reason TEXT NULL,\n`;
    sql += `  cancelled_at TIMESTAMP NULL,\n`;
    sql += `  refund_status VARCHAR(50) DEFAULT 'none',\n`;
    sql += `  refund_amount DECIMAL(10, 2) DEFAULT 0,\n`;
    sql += `  refund_phone VARCHAR(50) NULL,\n`;
    sql += `  refund_provider VARCHAR(50) NULL,\n`;
    sql += `  refund_processed_at TIMESTAMP NULL,\n`;
    sql += `  stay_status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  checked_in_at TIMESTAMP NULL,\n`;
    sql += `  checked_out_at TIMESTAMP NULL,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `) PARTITION BY KEY(id) PARTITIONS 4;\n\n`;

    const bSnap = await getDocs(collection(db, 'bookings'));
    const bookings = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (bookings.length > 0) {
      bookings.forEach(b => {
        sql += `INSERT IGNORE INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, booking_status, transaction_id, cancelled_by, cancellation_reason, cancelled_at, refund_status, refund_amount, refund_phone, refund_provider, refund_processed_at, stay_status, checked_in_at, checked_out_at, created_at) VALUES (\n`;
        sql += `  ${escapeSql(b.id)},\n`;
        sql += `  ${escapeSql(b.residenceId || b.residence_id)},\n`;
        sql += `  ${escapeSql(b.clientId || b.client_id)},\n`;
        sql += `  ${escapeSql(b.ownerId || b.owner_id)},\n`;
        sql += `  ${escapeSql(b.checkIn ? b.checkIn.substring(0, 10) : '2023-01-01')},\n`;
        sql += `  ${escapeSql(b.checkOut ? b.checkOut.substring(0, 10) : '2023-01-02')},\n`;
        sql += `  ${escapeSql(b.guests || 1)},\n`;
        sql += `  ${escapeSql(b.totalPrice || b.total_price || 0)},\n`;
        sql += `  ${escapeSql(b.advancePaid || b.advance_paid || 0)},\n`;
        sql += `  ${escapeSql(b.paymentStatus || b.payment_status || 'pending')},\n`;
        sql += `  ${escapeSql(b.bookingStatus || b.booking_status || b.status || 'pending')},\n`;
        sql += `  ${escapeSql(b.transactionId || b.transaction_id || null)},\n`;
        sql += `  ${escapeSql(b.cancelledBy || b.cancelled_by || null)},\n`;
        sql += `  ${escapeSql(b.cancellationReason || b.cancellation_reason || null)},\n`;
        sql += `  ${escapeSql(b.cancelledAt ? (String(b.cancelledAt).includes('T') ? new Date(b.cancelledAt).toISOString().replace('T', ' ').substring(0, 19) : b.cancelledAt) : null)},\n`;
        sql += `  ${escapeSql(b.refundStatus || b.refund_status || 'none')},\n`;
        sql += `  ${escapeSql(b.refundAmount || b.refund_amount || 0)},\n`;
        sql += `  ${escapeSql(b.refundPhone || b.refund_phone || null)},\n`;
        sql += `  ${escapeSql(b.refundProvider || b.refund_provider || null)},\n`;
        sql += `  ${escapeSql(b.refundProcessedAt ? (String(b.refundProcessedAt).includes('T') ? new Date(b.refundProcessedAt).toISOString().replace('T', ' ').substring(0, 19) : b.refundProcessedAt) : null)},\n`;
        sql += `  ${escapeSql(b.stayStatus || b.stay_status || 'pending')},\n`;
        sql += `  ${escapeSql(b.checkedInAt ? (String(b.checkedInAt).includes('T') ? new Date(b.checkedInAt).toISOString().replace('T', ' ').substring(0, 19) : b.checkedInAt) : null)},\n`;
        sql += `  ${escapeSql(b.checkedOutAt ? (String(b.checkedOutAt).includes('T') ? new Date(b.checkedOutAt).toISOString().replace('T', ' ').substring(0, 19) : b.checkedOutAt) : null)},\n`;
        sql += `  ${escapeSql(b.createdAt ? (String(b.createdAt).includes('T') ? new Date(b.createdAt).toISOString().replace('T', ' ').substring(0, 19) : b.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 6. Reviews
    console.log("Exportation de la table 'reviews'...");
    sql += `CREATE TABLE IF NOT EXISTS reviews (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  booking_id VARCHAR(128) NOT NULL,\n`;
    sql += `  residence_id VARCHAR(128) NOT NULL,\n`;
    sql += `  client_id VARCHAR(128) NOT NULL,\n`;
    sql += `  rating INT NOT NULL,\n`;
    sql += `  comment TEXT,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `) PARTITION BY KEY(id) PARTITIONS 4;\n\n`;

    const rvSnap = await getDocs(collection(db, 'reviews'));
    const reviews = rvSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (reviews.length > 0) {
      reviews.forEach(rv => {
        sql += `INSERT IGNORE INTO reviews (id, booking_id, residence_id, client_id, rating, comment, created_at) VALUES (\n`;
        sql += `  ${escapeSql(rv.id)},\n`;
        sql += `  ${escapeSql(rv.bookingId || rv.booking_id || '')},\n`;
        sql += `  ${escapeSql(rv.residenceId || rv.residence_id || '')},\n`;
        sql += `  ${escapeSql(rv.clientId || rv.client_id || '')},\n`;
        sql += `  ${escapeSql(rv.rating)},\n`;
        sql += `  ${escapeSql(rv.comment)},\n`;
        sql += `  ${escapeSql(rv.createdAt ? (String(rv.createdAt).includes('T') ? new Date(rv.createdAt).toISOString().replace('T', ' ').substring(0, 19) : rv.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 7. Withdrawals
    console.log("Exportation de la table 'withdrawals'...");
    sql += `CREATE TABLE IF NOT EXISTS withdrawals (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  owner_id VARCHAR(128) NOT NULL,\n`;
    sql += `  owner_name VARCHAR(255),\n`;
    sql += `  owner_email VARCHAR(255),\n`;
    sql += `  amount DECIMAL(10, 2) NOT NULL,\n`;
    sql += `  phone VARCHAR(50) NOT NULL,\n`;
    sql += `  provider VARCHAR(50) NOT NULL,\n`;
    sql += `  status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  approved_at TIMESTAMP NULL\n`;
    sql += `) PARTITION BY KEY(id) PARTITIONS 4;\n\n`;

    const wdSnap = await getDocs(collection(db, 'withdrawals'));
    const withdrawals = wdSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (withdrawals.length > 0) {
      withdrawals.forEach(w => {
        sql += `INSERT IGNORE INTO withdrawals (id, owner_id, owner_name, owner_email, amount, phone, provider, status, created_at, approved_at) VALUES (\n`;
        sql += `  ${escapeSql(w.id)},\n`;
        sql += `  ${escapeSql(w.ownerId || w.owner_id)},\n`;
        sql += `  ${escapeSql(w.ownerName || w.owner_name || '')},\n`;
        sql += `  ${escapeSql(w.ownerEmail || w.owner_email || '')},\n`;
        sql += `  ${escapeSql(w.amount)},\n`;
        sql += `  ${escapeSql(w.phone)},\n`;
        sql += `  ${escapeSql(w.provider)},\n`;
        sql += `  ${escapeSql(w.status)},\n`;
        sql += `  ${escapeSql(w.createdAt ? (String(w.createdAt).includes('T') ? new Date(w.createdAt).toISOString().replace('T', ' ').substring(0, 19) : w.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))},\n`;
        sql += `  ${escapeSql(w.approvedAt || w.approved_at ? (String(w.approvedAt || w.approved_at).includes('T') ? new Date(w.approvedAt || w.approved_at).toISOString().replace('T', ' ').substring(0, 19) : (w.approvedAt || w.approved_at)) : null)}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 8. Advertisements
    console.log("Exportation de la table 'advertisements'...");
    sql += `CREATE TABLE IF NOT EXISTS advertisements (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  title VARCHAR(255) NOT NULL,\n`;
    sql += `  description TEXT,\n`;
    sql += `  image_url TEXT NOT NULL,\n`;
    sql += `  link_url TEXT,\n`;
    sql += `  is_active BOOLEAN DEFAULT TRUE,\n`;
    sql += `  frequency_seconds INT DEFAULT 30,\n`;
    sql += `  start_at TIMESTAMP NULL,\n`;
    sql += `  end_at TIMESTAMP NULL,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `) PARTITION BY KEY(id) PARTITIONS 2;\n\n`;

    const adSnap = await getDocs(collection(db, 'ads'));
    const ads = adSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (ads.length > 0) {
      ads.forEach(ad => {
        sql += `INSERT IGNORE INTO advertisements (id, title, description, image_url, link_url, is_active, frequency_seconds, start_at, end_at, created_at) VALUES (\n`;
        sql += `  ${escapeSql(ad.id)},\n`;
        sql += `  ${escapeSql(ad.title)},\n`;
        sql += `  ${escapeSql(ad.description || '')},\n`;
        sql += `  ${escapeSql(ad.imageUrl || ad.image_url || '')},\n`;
        sql += `  ${escapeSql(ad.linkUrl || ad.link_url || '')},\n`;
        sql += `  ${escapeSql(ad.isActive !== false ? 1 : 0)},\n`;
        sql += `  ${escapeSql(ad.frequencySeconds || ad.frequency_seconds || 30)},\n`;
        sql += `  ${escapeSql(ad.startAt || ad.start_at ? (String(ad.startAt || ad.start_at).includes('T') ? new Date(ad.startAt || ad.start_at).toISOString().replace('T', ' ').substring(0, 19) : (ad.startAt || ad.start_at)) : null)},\n`;
        sql += `  ${escapeSql(ad.endAt || ad.end_at ? (String(ad.endAt || ad.end_at).includes('T') ? new Date(ad.endAt || ad.end_at).toISOString().replace('T', ' ').substring(0, 19) : (ad.endAt || ad.end_at)) : null)},\n`;
        sql += `  ${escapeSql(ad.createdAt ? (ad.createdAt.includes('T') ? new Date(ad.createdAt).toISOString().replace('T', ' ').substring(0, 19) : ad.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    fs.writeFileSync('resifaso_dump_exported.sql', sql, 'utf8');
    console.log("Exportation complétée ! Fichier généré : 'resifaso_dump_exported.sql'");
    process.exit(0);
  } catch (err) {
    console.error("Erreur durant l'exportation :", err);
    process.exit(1);
  }
}

exportDatabase();
