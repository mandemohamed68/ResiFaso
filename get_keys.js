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
  const collections = ['users', 'residences', 'bookings', 'reviews', 'withdrawals', 'ads'];
  for (const coll of collections) {
    console.log(`\n--- Collection: ${coll} ---`);
    const q = query(collection(db, coll), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log("(Vide)");
    } else {
      console.log("Keys:", Object.keys(snap.docs[0].data()).join(", "));
    }
  }
  process.exit(0);
}
check();
