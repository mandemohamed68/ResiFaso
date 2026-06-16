import React, { useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../lib/firebase';
import { Download, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DumpData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDump = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      const db = getFirestore(app, "ai-studio-030e0428-dc57-4d21-86df-d49144265349");

      let sql = "";
      
      const escapeSql = (str: any) => {
        if (!str) return 'NULL';
        if (str === 'undefined') return 'NULL';
        return "'" + String(str).replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
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

      // USERS
      sql += "-- TABLE USERS\n";
      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach(doc => {
        const data = doc.data();
        sql += `INSERT IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.email || `${doc.id}@example.com`)}, ${escapeSql(data.displayName || data.name || '')}, ${escapeSql(data.phoneNumber)}, ${escapeSql(data.photoURL)}, ${escapeSql(data.role || 'client')}, ${escapeBool(data.isVerified)}, ${escapeBool(data.isSuspended)}, ${escapeDate(data.createdAt || new Date())});\n`;
      });

      // RESIDENCES
      sql += "\n-- TABLE RESIDENCES\n";
      const resSnap = await getDocs(collection(db, "residences"));
      resSnap.forEach(doc => {
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
      });

      // BOOKINGS
      sql += "\n-- TABLE BOOKINGS\n";
      const bookSnap = await getDocs(collection(db, "bookings"));
      bookSnap.forEach(doc => {
        const data = doc.data();
        sql += `INSERT IGNORE INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, booking_status, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.residenceId || 'unknown')}, ${escapeSql(data.clientId || 'unknown')}, ${escapeSql(data.ownerId || 'unknown')}, ${escapeDate(data.checkIn || new Date())}, ${escapeDate(data.checkOut || new Date())}, ${Number(data.guests) || 1}, ${Number(data.totalPrice) || 0}, ${Number(data.advancePaid) || 0}, ${escapeSql(data.paymentStatus || 'pending')}, ${escapeSql(data.status || data.bookingStatus || 'pending')}, ${escapeDate(data.createdAt || new Date())});\n`;
      });

      // REVIEWS
      sql += "\n-- TABLE REVIEWS\n";
      const revSnap = await getDocs(collection(db, "reviews"));
      revSnap.forEach(doc => {
        const data = doc.data();
        sql += `INSERT IGNORE INTO reviews (id, booking_id, residence_id, client_id, rating, comment, created_at) VALUES (${escapeSql(doc.id)}, ${escapeSql(data.bookingId || 'unknown')}, ${escapeSql(data.residenceId || 'unknown')}, ${escapeSql(data.clientId || 'unknown')}, ${Number(data.rating) || 5}, ${escapeSql(data.comment)}, ${escapeDate(data.createdAt || new Date())});\n`;
      });

      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DUMP_MARIADB.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess("Fichier SQL généré et téléchargé avec succès !");
    } catch (e: any) {
      setError(e.message || "Erreur de migration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <h1 className="text-2xl font-black text-slate-800 mb-2">Migration MariaDB</h1>
        <p className="text-slate-500 mb-6 font-medium text-sm">
          Afin de contourner les restrictions de sécurité Firestore, vous devez vous authentifier ici avec votre profil Administrateur (via Google) pour pouvoir extraire la base de données.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-start gap-3 mb-6">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{success}</span>
          </div>
        )}

        <button
          onClick={handleDump}
          disabled={loading}
          className="w-full bg-[#111111] hover:bg-black text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-pulse">Génération en cours...</span>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Générer DUMP_MARIADB.sql
            </>
          )}
        </button>
      </div>
    </div>
  );
};
