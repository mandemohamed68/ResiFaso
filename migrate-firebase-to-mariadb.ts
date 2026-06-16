import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'resifaso_user',
  password: process.env.DB_PASSWORD || 'mm@27071986@',
  database: process.env.DB_NAME || 'resifaso_db',
  port: Number(process.env.DB_PORT) || 3306,
});

async function main() {
  let adminDb;
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (getApps().length === 0) {
        initializeApp({ projectId: config.projectId });
      }
      adminDb = getFirestore(config.firestoreDatabaseId || "(default)");
      console.log(`Connected to Firebase (project: ${config.projectId})`);
    } else {
      if (getApps().length === 0) {
        initializeApp();
      }
      adminDb = getFirestore();
      console.log("Connected to Firebase (default ADC)");
    }
  } catch (e: any) {
    console.error("Firebase Admin initialization failed:", e);
    process.exit(1);
  }

  // MIGRATION OF USERS
  console.log("Migrating users...");
  try {
    const usersSnap = await adminDb.collection("users").get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date();
      await pool.execute(
        `INSERT IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          data.email || `${doc.id}@example.com`, // Fallback si email manquant
          data.displayName || data.name || '',
          data.phoneNumber || null,
          data.photoURL || null,
          data.role || 'client',
          data.isVerified ? 1 : 0,
          data.isSuspended ? 1 : 0,
          createdAt
        ]
      );
    }
    console.log(`Migrated ${usersSnap.docs.length} users.`);
  } catch (e) {
    console.error("Error migrating users:", e);
  }

  // MIGRATION OF RESIDENCES
  console.log("Migrating residences...");
  try {
    const resSnap = await adminDb.collection("residences").get();
    for (const doc of resSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date();
      await pool.execute(
        `INSERT IGNORE INTO residences (id, owner_id, title, description, type, price_per_night, advance_percentage, cleaning_fee, service_fee, city, neighborhood, street, status, availability_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          data.ownerId || 'unknown',
          data.title || '',
          data.description || null,
          data.type || 'appartement',
          data.pricePerNight || 0,
          data.advancePercentage || 0,
          data.cleaningFee || 0,
          data.serviceFee || 0,
          data.address?.city || data.city || null,
          data.address?.neighborhood || data.neighborhood || null,
          data.address?.street || data.street || null,
          data.status || 'published',
          data.availabilityStatus || 'available',
          createdAt
        ]
      );
      
      // Images
      if (data.images && Array.isArray(data.images)) {
        for (const imgUrl of data.images) {
           await pool.execute(
             `INSERT IGNORE INTO residence_images (residence_id, image_url) VALUES (?, ?)`,
             [doc.id, imgUrl]
           );
        }
      }
      
      // Amenities
      if (data.amenities && Array.isArray(data.amenities)) {
        for (const am of data.amenities) {
           await pool.execute(
             `INSERT IGNORE INTO residence_amenities (residence_id, amenity) VALUES (?, ?)`,
             [doc.id, am]
           );
        }
      }
    }
    console.log(`Migrated ${resSnap.docs.length} residences.`);
  } catch (e) {
    console.error("Error migrating residences:", e);
  }

  // MIGRATION OF BOOKINGS
  console.log("Migrating bookings...");
  try {
    const bookSnap = await adminDb.collection("bookings").get();
    for (const doc of bookSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date();
      const checkIn = data.checkIn ? (data.checkIn.toDate ? data.checkIn.toDate() : new Date(data.checkIn)) : new Date();
      const checkOut = data.checkOut ? (data.checkOut.toDate ? data.checkOut.toDate() : new Date(data.checkOut)) : new Date();
      
      await pool.execute(
        `INSERT IGNORE INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, booking_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          data.residenceId || 'unknown',
          data.clientId || 'unknown',
          data.ownerId || 'unknown',
          checkIn,
          checkOut,
          data.guests || 1,
          data.totalPrice || 0,
          data.advancePaid || 0,
          data.paymentStatus || 'pending',
          data.status || data.bookingStatus || 'pending',
          createdAt
        ]
      );
    }
    console.log(`Migrated ${bookSnap.docs.length} bookings.`);
  } catch (e) {
    console.error("Error migrating bookings:", e);
  }

  // MIGRATION OF REVIEWS
  console.log("Migrating reviews...");
  try {
    const revSnap = await adminDb.collection("reviews").get();
    for (const doc of revSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date();
      await pool.execute(
        `INSERT IGNORE INTO reviews (id, booking_id, residence_id, client_id, rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          data.bookingId || 'unknown',
          data.residenceId || 'unknown',
          data.clientId || 'unknown',
          data.rating || 5,
          data.comment || null,
          createdAt
        ]
      );
    }
    console.log(`Migrated ${revSnap.docs.length} reviews.`);
  } catch (e) {
    console.error("Error migrating reviews:", e);
  }

  console.log("Migration complete.");
  process.exit(0);
}

main();
