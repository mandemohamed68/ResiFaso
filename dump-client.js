import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
const auth = getAuth(app);

async function main() {
  try {
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

    console.log("Signing in anonymously...");
    await signInAnonymously(auth);
    console.log("Signed in anonymously.");

    // USERS
    console.log("Migrating users...");
    try {
      sql += "-- TABLE USERS\n";
      const usersSnap = await getDocs(collection(db, "users"));
      for (const doc of usersSnap.docs) {
        const data = doc.data();
        sql += `INSERT IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.email || `${doc.id}@example.com`)}, ${escapeSql(data.displayName || data.name || '')}, ${escapeSql(data.phoneNumber)}, ${escapeSql(data.photoURL)}, ${escapeSql(data.role || 'client')}, ${escapeBool(data.isVerified)}, ${escapeBool(data.isSuspended)}, ${escapeDate(data.createdAt || new Date())});\n`;
      }
    } catch (e) { console.log(e.message); }

    // RESIDENCES
    console.log("Migrating residences...");
    try {
      sql += "\n-- TABLE RESIDENCES\n";
      const resSnap = await getDocs(collection(db, "residences"));
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
      const bookSnap = await getDocs(collection(db, "bookings"));
      for (const doc of bookSnap.docs) {
        const data = doc.data();
        sql += `INSERT IGNORE INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, booking_status, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.residenceId || 'unknown')}, ${escapeSql(data.clientId || 'unknown')}, ${escapeSql(data.ownerId || 'unknown')}, ${escapeDate(data.checkIn || new Date())}, ${escapeDate(data.checkOut || new Date())}, ${Number(data.guests) || 1}, ${Number(data.totalPrice) || 0}, ${Number(data.advancePaid) || 0}, ${escapeSql(data.paymentStatus || 'pending')}, ${escapeSql(data.status || data.bookingStatus || 'pending')}, ${escapeDate(data.createdAt || new Date())});\n`;
      }
    } catch (e) { console.log(e.message); }

    // REVIEWS
    console.log("Migrating reviews...");
    try {
      sql += "\n-- TABLE REVIEWS\n";
      const revSnap = await getDocs(collection(db, "reviews"));
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
