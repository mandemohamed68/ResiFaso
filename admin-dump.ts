import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    
    initializeApp({
      credential: applicationDefault(),
      projectId: config.projectId
    });
    
    // The database ID is in the config
    const db = getFirestore(config.firestoreDatabaseId || "(default)");
    console.log("Connected to Firestore using Application Default Credentials.");

    let sql = "";

    const escapeSql = (str) => {
      if (!str) return 'NULL';
      if (str === 'undefined') return 'NULL';
      return "'" + str.replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
    };
    
    const escapeBool = (b) => b ? 1 : 0;
    
    const escapeDate = (d) => {
      if (!d) return 'NULL';
      try {
        const date = d.toDate ? d.toDate() : new Date(d);
        return "'" + date.toISOString().slice(0, 19).replace('T', ' ') + "'";
      } catch {
        return 'NULL';
      }
    };

    // USERS
    console.log("Migrating users...");
    try {
      sql += "-- TABLE USERS\n";
      const usersSnap = await db.collection("users").get();
      for (const doc of usersSnap.docs) {
        const data = doc.data();
        sql += `INSERT IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.email || `${doc.id}@example.com`)}, ${escapeSql(data.displayName || data.name || '')}, ${escapeSql(data.phoneNumber)}, ${escapeSql(data.photoURL)}, ${escapeSql(data.role || 'client')}, ${escapeBool(data.isVerified)}, ${escapeBool(data.isSuspended)}, ${escapeDate(data.createdAt || new Date())});\n`;
      }
    } catch (e) { console.log(e.message); }

    // RESIDENCES
    console.log("Migrating residences...");
    try {
      sql += "\n-- TABLE RESIDENCES\n";
      const resSnap = await db.collection("residences").get();
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
    } catch (e) { console.log(e.message); }

    // BOOKINGS
    console.log("Migrating bookings...");
    try {
      sql += "\n-- TABLE BOOKINGS\n";
      const bookSnap = await db.collection("bookings").get();
      for (const doc of bookSnap.docs) {
        const data = doc.data();
        sql += `INSERT IGNORE INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, booking_status, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.residenceId || 'unknown')}, ${escapeSql(data.clientId || 'unknown')}, ${escapeSql(data.ownerId || 'unknown')}, ${escapeDate(data.checkIn || new Date())}, ${escapeDate(data.checkOut || new Date())}, ${Number(data.guests) || 1}, ${Number(data.totalPrice) || 0}, ${Number(data.advancePaid) || 0}, ${escapeSql(data.paymentStatus || 'pending')}, ${escapeSql(data.status || data.bookingStatus || 'pending')}, ${escapeDate(data.createdAt || new Date())});\n`;
      }
    } catch (e) { console.log(e.message); }

    // REVIEWS
    console.log("Migrating reviews...");
    try {
      sql += "\n-- TABLE REVIEWS\n";
      const revSnap = await db.collection("reviews").get();
      for (const doc of revSnap.docs) {
        const data = doc.data();
        sql += `INSERT IGNORE INTO reviews (id, booking_id, residence_id, client_id, rating, comment, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.bookingId || 'unknown')}, ${escapeSql(data.residenceId || 'unknown')}, ${escapeSql(data.clientId || 'unknown')}, ${Number(data.rating) || 5}, ${escapeSql(data.comment)}, ${escapeDate(data.createdAt || new Date())});\n`;
      }
    } catch (e) { console.log(e.message); }

    fs.writeFileSync('DUMP_MARIADB.sql', sql);
    console.log("Done! Wrote to DUMP_MARIADB.sql");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
