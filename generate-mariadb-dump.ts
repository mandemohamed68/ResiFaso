import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function main() {
  let adminDb;
  try {
    const serviceAccountPath = path.join(process.cwd(), "service-account.json");
    if (!fs.existsSync(serviceAccountPath)) {
      console.error("service-account.json not found");
      process.exit(1);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    
    // Check if the user specified a database ID in firebase-applet-config.json
    let dbId = "(default)";
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (config.firestoreDatabaseId) {
            dbId = config.firestoreDatabaseId;
        }
      }
    } catch(e) {}

    console.log(`Connecting with service account credentials to database: ${dbId}...`);

    initializeApp({
      credential: cert(serviceAccount)
    });
    
    adminDb = getFirestore(dbId);
    console.log("Connected to Firebase via Service Account.");
  } catch (e: any) {
    console.error("Firebase Admin initialization failed:", e);
    process.exit(1);
  }

  let sql = "";

  // Helper to escape SQL string
  const escapeSql = (str: string | null | undefined) => {
    if (!str) return 'NULL';
    if (str === 'undefined') return 'NULL';
    return "'" + str.replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
  };
  
  const escapeBool = (b: any) => b ? 1 : 0;
  
  const escapeDate = (d: any) => {
    if (!d) return 'NULL';
    try {
      const date = d.toDate ? d.toDate() : new Date(d);
      return "'" + date.toISOString().slice(0, 19).replace('T', ' ') + "'";
    } catch {
      return 'NULL';
    }
  };

  // MIGRATION OF USERS
  console.log("Migrating users...");
  try {
    sql += "-- TABLE USERS\n";
    const usersSnap = await adminDb.collection("users").get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      sql += `INSERT IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.email || `${doc.id}@example.com`)}, ${escapeSql(data.displayName || data.name || '')}, ${escapeSql(data.phoneNumber)}, ${escapeSql(data.photoURL)}, ${escapeSql(data.role || 'client')}, ${escapeBool(data.isVerified)}, ${escapeBool(data.isSuspended)}, ${escapeDate(data.createdAt || new Date())});\n`;
    }
  } catch (e) {
    console.error("Error migrating users:", e);
  }

  // MIGRATION OF RESIDENCES
  console.log("Migrating residences...");
  try {
    sql += "\n-- TABLE RESIDENCES\n";
    const resSnap = await adminDb.collection("residences").get();
    for (const doc of resSnap.docs) {
      const data = doc.data();
      sql += `INSERT IGNORE INTO residences (id, owner_id, title, description, type, price_per_night, advance_percentage, cleaning_fee, service_fee, city, neighborhood, street, status, availability_status, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.ownerId || 'unknown')}, ${escapeSql(data.title || '')}, ${escapeSql(data.description)}, ${escapeSql(data.type || 'appartement')}, ${Number(data.pricePerNight) || 0}, ${Number(data.advancePercentage) || 0}, ${Number(data.cleaningFee) || 0}, ${Number(data.serviceFee) || 0}, ${escapeSql(data.address?.city || data.city)}, ${escapeSql(data.address?.neighborhood || data.neighborhood)}, ${escapeSql(data.address?.street || data.street)}, ${escapeSql(data.status || 'published')}, ${escapeSql(data.availabilityStatus || 'available')}, ${escapeDate(data.createdAt || new Date())});\n`;
      
      if (data.images && Array.isArray(data.images)) {
        for (const imgUrl of data.images) {
          sql += `INSERT IGNORE INTO residence_images (residence_id, image_url) VALUES (${escapeSql(doc.id)}, ${escapeSql(imgUrl)});\n`;
        }
      }
      
      if (data.amenities && Array.isArray(data.amenities)) {
        for (const am of data.amenities) {
          sql += `INSERT IGNORE INTO residence_amenities (residence_id, amenity) VALUES (${escapeSql(doc.id)}, ${escapeSql(am)});\n`;
        }
      }
    }
  } catch (e) {
    console.error("Error migrating residences:", e);
  }

  // MIGRATION OF BOOKINGS
  console.log("Migrating bookings...");
  try {
    sql += "\n-- TABLE BOOKINGS\n";
    const bookSnap = await adminDb.collection("bookings").get();
    for (const doc of bookSnap.docs) {
      const data = doc.data();
      sql += `INSERT IGNORE INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, booking_status, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.residenceId || 'unknown')}, ${escapeSql(data.clientId || 'unknown')}, ${escapeSql(data.ownerId || 'unknown')}, ${escapeDate(data.checkIn || new Date())}, ${escapeDate(data.checkOut || new Date())}, ${Number(data.guests) || 1}, ${Number(data.totalPrice) || 0}, ${Number(data.advancePaid) || 0}, ${escapeSql(data.paymentStatus || 'pending')}, ${escapeSql(data.status || data.bookingStatus || 'pending')}, ${escapeDate(data.createdAt || new Date())});\n`;
    }
  } catch (e) {
    console.error("Error migrating bookings:", e);
  }

  // MIGRATION OF REVIEWS
  console.log("Migrating reviews...");
  try {
    sql += "\n-- TABLE REVIEWS\n";
    const revSnap = await adminDb.collection("reviews").get();
    for (const doc of revSnap.docs) {
      const data = doc.data();
      sql += `INSERT IGNORE INTO reviews (id, booking_id, residence_id, client_id, rating, comment, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.bookingId || 'unknown')}, ${escapeSql(data.residenceId || 'unknown')}, ${escapeSql(data.clientId || 'unknown')}, ${Number(data.rating) || 5}, ${escapeSql(data.comment)}, ${escapeDate(data.createdAt || new Date())});\n`;
    }
  } catch (e) {
    console.error("Error migrating reviews:", e);
  }

  fs.writeFileSync('MIGRATION_DUMP.sql', sql);
  console.log("Migration dump written to MIGRATION_DUMP.sql");
  process.exit(0);
}

main();
