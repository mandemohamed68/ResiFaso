import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  appId: config.appId
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, config.firestoreDatabaseId || "(default)");

async function check() {
  for (const coll of ['residences', 'bookings', 'users', 'ads', 'reviews']) {
    console.log(`--- Collection: ${coll} ---`);
    const q = query(collection(db, coll), limit(1));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  }
  process.exit(0);
}
check();
