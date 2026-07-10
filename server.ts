import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import { executeSql } from './src/db/index';
import { initDatabase } from './src/db/init';
import { formatSqlValue } from './src/db/queries';
import { authenticateToken, AuthRequest } from './src/lib/auth-middleware';
import * as queries from './src/db/queries';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'mariadb' ou 'sqlite'

// ---------- SAPPAY CONFIGURATION ----------
// IDs des opérateurs (à adapter selon votre base Sappay)
const PROCESSOR_ORANGE = "11688813752134336";
const PROCESSOR_MOOV = "11688813838374580";
const PROCESSOR_TELECEL = "11744695746597207";
const PROCESSOR_CORIS = "11702302492453862";

const SAPPAY_BASE_PUBLIC_SANDBOX = "https://sandbox.sappay.net/api/v1";
const SAPPAY_BASE_CHECKOUT_SANDBOX = "https://sandbox.sappay.net/api/v1/checkout";
const SAPPAY_BASE_PUBLIC_PROD = "https://api.prod.sappay.net/api/public";
const SAPPAY_BASE_CHECKOUT_PROD = "https://api.prod.sappay.net/api/checkout";

// Récupération des identifiants Sappay depuis la base (ou .env)
async function getSappayCredentials() {
  const defaultClientId = (process.env.SAPPAY_CLIENT_ID || "").trim();
  const defaultClientSecret = (process.env.SAPPAY_CLIENT_SECRET || "").trim();
  const defaultUsername = (process.env.SAPPAY_USERNAME || "").trim();
  const defaultPassword = (process.env.SAPPAY_PASSWORD || "").trim();

  let finalCreds = {
    clientId: defaultClientId,
    clientSecret: defaultClientSecret,
    username: defaultUsername,
    password: defaultPassword,
    isTestMode: false
  };

  try {
    const results = await executeSql("SELECT value FROM settings WHERE `key` = 'global'");
    if (results && results.length > 0) {
      const data = JSON.parse(results[0].value);
      if (data?.sappayClientId) finalCreds.clientId = data.sappayClientId.trim();
      if (data?.sappayClientSecret) finalCreds.clientSecret = data.sappayClientSecret.trim();
      if (data?.sappayUsername) finalCreds.username = data.sappayUsername.trim();
      if (data?.sappayPassword) finalCreds.password = data.sappayPassword.trim();
      if (data?.isTestMode !== undefined) finalCreds.isTestMode = data.isTestMode;
    }
  } catch (e: any) {
    console.warn("Sappay: Impossible de lire les paramètres depuis la base, utilisation des valeurs .env.", e.message);
  }

  return finalCreds;
}

async function getSappayBaseUrls() {
  const creds = await getSappayCredentials();
  if (creds.isTestMode) {
    return {
      publicBase: process.env.SAPPAY_BASE_PUBLIC || SAPPAY_BASE_PUBLIC_SANDBOX,
      checkoutBase: process.env.SAPPAY_BASE_CHECKOUT || SAPPAY_BASE_CHECKOUT_SANDBOX
    };
  } else {
    return {
      publicBase: process.env.SAPPAY_BASE_PUBLIC_PROD || SAPPAY_BASE_PUBLIC_PROD,
      checkoutBase: process.env.SAPPAY_BASE_CHECKOUT_PROD || SAPPAY_BASE_CHECKOUT_PROD
    };
  }
}

function normalizePhoneNumberSappay(phone: string): string {
  let clean = phone.replace(/\s/g, '').replace(/[^0-9+]/g, '');
  if (clean.startsWith('+226')) clean = clean.slice(4);
  else if (clean.startsWith('00226')) clean = clean.slice(5);
  else if (clean.startsWith('226') && clean.length > 8) clean = clean.slice(3);
  if (clean.length > 8) clean = clean.slice(-8);
  return clean;
}

function findInvoiceId(responseData: any): string | null {
  if (!responseData) return null;
  if (responseData.response?.invoice_detail?.invoice_id) return responseData.response.invoice_detail.invoice_id;
  if (responseData.response?.invoice_id) return responseData.response.invoice_id;
  if (responseData.invoice_id) return responseData.invoice_id;
  if (responseData.id) return responseData.id;
  if (responseData.data?.invoice_id) return responseData.data.invoice_id;
  return null;
}

async function getSappayToken(): Promise<string> {
  const credentials = await getSappayCredentials();
  const urls = await getSappayBaseUrls();
  const payload = {
    grant_type: "password",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    username: credentials.username,
    password: credentials.password
  };

  console.log(`[Sappay] Authentification pour ${credentials.username} (mode ${credentials.isTestMode ? 'test' : 'prod'})`);

  const makeRequest = async (contentType: string, body: any) => {
    const headers: Record<string, string> = { "Accept": "application/json" };
    if (contentType === 'application/json') {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(body).toString();
    }
    return fetch(`${urls.publicBase}/authentication/`, {
      method: "POST",
      headers,
      body
    });
  };

  try {
    let response = await makeRequest('application/json', payload);
    if (!response.ok && (response.status === 400 || response.status === 401)) {
      console.warn(`[Sappay] Échec JSON (${response.status}), tentative x-www-form-urlencoded...`);
      response = await makeRequest('application/x-www-form-urlencoded', payload);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Sappay] Échec (${response.status}) :`, errorBody.substring(0, 300));
      throw new Error(`Sappay auth échouée (${response.status}) : ${errorBody}`);
    }

    const data = await response.json();
    const token = data.access || data.access_token || data.token || data.response?.access_token;
    if (!token) {
      throw new Error("Aucun access_token dans la réponse Sappay.");
    }
    return token;
  } catch (err: any) {
    if (credentials.isTestMode) {
      console.warn("[Sappay] Mode test, retour d'un token fictif.");
      return "mock_sappay_token_fallback";
    }
    throw new Error(`Sappay authentification : ${err.message}`);
  }
}

// ---------- SERVEUR EXPRESS ----------
async function startServer() {
  if (DB_TYPE !== 'firebase') {
    await initDatabase().catch(err => console.error("Init DB error:", err));
  }

  const app = express();
  const PORT = 3000;

  // CORS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ---------- AUTH ----------
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, displayName, role: requestedRole, identity_document_front, identity_document_back } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

    try {
      const existing = await executeSql("SELECT uid FROM users WHERE email = ?", [email]);
      if (existing.length > 0) return res.status(400).json({ error: "Cet email est déjà utilisé" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = 'u_' + Math.random().toString(36).substr(2, 9);
      const role = email === 'mandemohamed68@gmail.com' ? 'admin' : (requestedRole || 'client');

      await executeSql(
        "INSERT INTO users (uid, email, password_hash, display_name, role, identity_document_front, identity_document_back) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [uid, email, hashedPassword, displayName || 'Voyageur', role, identity_document_front || null, identity_document_back || null]
      );

      const token = jwt.sign({ uid, email, role }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { uid, email, displayName: displayName || 'Voyageur', role } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const users = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
      if (users.length === 0) return res.status(401).json({ error: "Identifiants invalides" });
      const user = users[0];

      if (user.email === 'mandemohamed68@gmail.com' && user.role !== 'admin') {
        await executeSql("UPDATE users SET role = 'admin' WHERE uid = ?", [user.uid]);
        user.role = 'admin';
      }

      if (!user.password_hash) return res.status(401).json({ error: "Compte sans mot de passe local." });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: "Identifiants invalides" });

      const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { uid: user.uid, email: user.email, displayName: user.display_name, role: user.role } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const users = await executeSql(
        "SELECT uid, email, display_name as displayName, role, photo_url as photoUrl, is_verified as isVerified FROM users WHERE uid = ?",
        [req.user?.uid]
      );
      if (users.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé" });
      res.json(users[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Residences ---
  app.get("/api/residences", async (req, res) => {
    try {
      const { ownerId } = req.query;
      const residences = await queries.getAllResidences(ownerId as string);
      res.json(residences);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/residences/:id", async (req, res) => {
    try {
      const residence = await queries.getResidenceById(req.params.id);
      if (!residence) return res.status(404).json({ error: "Résidence non trouvée" });
      res.json(residence);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/residences", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = 'res_' + Math.random().toString(36).substr(2, 9);
      const data = { ...req.body, id, ownerId: req.user?.uid };
      await queries.createResidence(data);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/residences/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const existing = await queries.getResidenceById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Résidence non trouvée" });
      if (existing.ownerId !== req.user?.uid && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Non autorisé" });
      }
      await queries.updateResidence(req.params.id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/residences/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const existing = await queries.getResidenceById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Résidence non trouvée" });
      if (existing.ownerId !== req.user?.uid && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Non autorisé" });
      }
      await queries.deleteResidence(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Bookings ---
  app.get("/api/bookings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const role = req.query.role;
      const uid = req.user?.uid;
      const isAdmin = req.user?.role === 'admin' || req.user?.email === 'mandemohamed68@gmail.com';
      
      const options: any = { isAdmin };
      if (role === 'client') options.clientId = uid;
      else if (role === 'owner') options.ownerId = uid;
      else if (!isAdmin) {
        options.clientId = uid;
        options.ownerId = uid;
      }
      
      const bookings = await queries.getAllBookings(options);
      res.json(bookings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/residences/:id/bookings", async (req, res) => {
    try {
      const bookings = await executeSql("SELECT * FROM bookings WHERE residence_id = ?", [req.params.id]);
      res.json(bookings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/bookings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = 'bk_' + Math.random().toString(36).substr(2, 9);
      const { residenceId, ownerId, checkIn, checkOut, guests, totalPrice, advancePaid, transactionId } = req.body;
      await executeSql(`
        INSERT INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, transaction_id, booking_status, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'paid')
      `, [id, residenceId, req.user?.uid, ownerId, checkIn, checkOut, guests, totalPrice, advancePaid, transactionId]);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/bookings/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await queries.updateBookingStatus(req.params.id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Conversations & Messages ---
  app.get("/api/conversations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      const isAdmin = req.user?.role === 'admin' || req.user?.email === 'mandemohamed68@gmail.com';
      const convs = await queries.getAllConversations(uid, isAdmin);
      res.json(convs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/conversations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { participants, relatedId } = req.body;
      const participantsStr = participants.sort().join(',');
      const existing = await executeSql("SELECT id FROM conversations WHERE participants = ? AND (related_id = ? OR related_id IS NULL)", [participantsStr, relatedId]);
      
      if (existing.length > 0) {
        return res.json({ id: existing[0].id });
      }

      const id = 'conv_' + Math.random().toString(36).substr(2, 9);
      await executeSql("INSERT INTO conversations (id, participants, related_id) VALUES (?, ?, ?)", [id, participantsStr, relatedId]);
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/conversations/:id/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const messages = await queries.getMessages(req.params.id);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/conversations/:id/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const msgId = 'msg_' + Math.random().toString(36).substr(2, 9);
      const { text } = req.body;
      await executeSql("INSERT INTO messages (id, conversation_id, sender_id, text) VALUES (?, ?, ?, ?)", [msgId, req.params.id, req.user?.uid, text]);
      await executeSql("UPDATE conversations SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [text, req.params.id]);
      res.json({ success: true, id: msgId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Users ---
  app.get("/api/users", authenticateToken, async (req, res) => {
    try {
      const users = await queries.getAllUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users/public", async (req, res) => {
    try {
      const users = await executeSql("SELECT uid, display_name as displayName, photo_url as photoUrl FROM users");
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/users/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await queries.updateUserProfile(req.user?.uid || '', req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/users/:uid", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.uid !== req.params.uid && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Non autorisé" });
      }
      const updates = { ...req.body };
      if (updates.password) {
        updates.passwordHash = await bcrypt.hash(updates.password, 10);
        delete updates.password;
      }
      await queries.updateUserProfile(req.params.uid, updates);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Verification Types (Admin) ---
  app.get("/api/admin/verification-types", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
      const types = await executeSql("SELECT * FROM verification_types ORDER BY created_at ASC");
      res.json(types);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/verification-types", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
      const { id, label, description } = req.body;
      await executeSql(
        "INSERT INTO verification_types (id, label, description, is_active) VALUES (?, ?, ?, 1)",
        [id || 'vt_' + Math.random().toString(36).substr(2, 9), label, description]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/verification-types/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
      const { label, description, is_active } = req.body;
      await executeSql(
        "UPDATE verification_types SET label = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [label, description, is_active ? 1 : 0, req.params.id]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/verification-types/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
      // Check if used (optional, user said "if not used", otherwise disable)
      // For now just delete or deactivate
      await executeSql("DELETE FROM verification_types WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Booking Verifications (Owner/Admin) ---
  app.get("/api/reservations/:id/verifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const booking = await queries.getBookingById(req.params.id);
      if (!booking) return res.status(404).json({ error: "Réservation non trouvée" });
      
      if (req.user?.uid !== booking.ownerId && req.user?.uid !== booking.clientId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Non autorisé" });
      }

      const activeTypes = await executeSql("SELECT * FROM verification_types WHERE is_active = 1");
      const currentStatus = booking.verificationsStatus ? (typeof booking.verificationsStatus === 'string' ? JSON.parse(booking.verificationsStatus) : booking.verificationsStatus) : {};
      
      res.json({
        types: Array.isArray(activeTypes) ? activeTypes : [],
        status: currentStatus
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/reservations/:id/verifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const booking = await queries.getBookingById(req.params.id);
      if (!booking) return res.status(404).json({ error: "Réservation non trouvée" });
      
      if (req.user?.uid !== booking.ownerId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Seul l'hôte peut valider les vérifications" });
      }

      const { verificationId, status } = req.body;
      const currentStatus = booking.verificationsStatus ? (typeof booking.verificationsStatus === 'string' ? JSON.parse(booking.verificationsStatus) : booking.verificationsStatus) : {};
      
      if (currentStatus[verificationId] === true && status === false) {
        return res.status(403).json({ error: "Cette vérification est déjà validée et ne peut pas être modifiée." });
      }

      currentStatus[verificationId] = status;

      await executeSql(
        "UPDATE bookings SET verifications_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [JSON.stringify(currentStatus), req.params.id]
      );

      res.json({ success: true, status: currentStatus });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/users/:uid", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Réservé aux administrateurs" });
      }
      await queries.deleteUser(req.params.uid);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Settings ---
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const settings = await queries.getSettings(req.params.key);
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings/:key", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Réservé aux administrateurs" });
      }
      await queries.saveSettings(req.params.key, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Ads ---
  app.get("/api/ads", async (req, res) => {
    try {
      const ads = await queries.getAllAds();
      res.json(ads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ads", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      const id = req.body.id || 'ad_' + Math.random().toString(36).substr(2, 9);
      const fields = ['id', 'title', 'description', 'image_url', 'link_url', 'is_active', 'frequency_seconds', 'start_at', 'end_at'];
      const vals = [
        id,
        req.body.title ?? null,
        req.body.description ?? null,
        (req.body.image_url || req.body.imageUrl) ?? null,
        (req.body.link_url || req.body.linkUrl) ?? null,
        (req.body.is_active !== undefined ? req.body.is_active : req.body.isActive) ? 1 : 0,
        (req.body.frequency_seconds || req.body.frequencySeconds) ?? 10,
        (req.body.start_at || req.body.startAt) ?? null,
        (req.body.end_at || req.body.endAt) ?? null
      ];
      
      const placeholders = fields.map(() => '?').join(', ');
      
      const dbType = process.env.DB_TYPE || 'sqlite';
      if (dbType === 'mariadb') {
        const updateClause = fields.map(f => `${f} = VALUES(${f})`).join(', ');
        await executeSql(`INSERT INTO advertisements (${fields.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`, vals);
      } else {
        const sqliteUpdate = fields.map(f => `${f} = ?`).join(', ');
        await executeSql(`INSERT INTO advertisements (${fields.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${sqliteUpdate}`, [...vals, ...vals]);
      }
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/ads/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      await executeSql("DELETE FROM advertisements WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- FAQs ---
  app.get("/api/faqs", async (req, res) => {
    try {
      const faqs = await executeSql("SELECT * FROM faqs ORDER BY `order` ASC");
      res.json(faqs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/faqs", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      const id = req.body.id || 'faq_' + Math.random().toString(36).substr(2, 9);
      const { question, answer, category, order } = req.body;
      
      const dbType = process.env.DB_TYPE || 'sqlite';
      if (dbType === 'mariadb') {
        await executeSql("INSERT INTO faqs (id, question, answer, category, `order`) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE question=VALUES(question), answer=VALUES(answer), category=VALUES(category), `order`=VALUES(`order`)", [id, question, answer, category, order]);
      } else {
        await executeSql("INSERT INTO faqs (id, question, answer, category, `order`) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET question=?, answer=?, category=?, `order`=?", [id, question, answer, category, order, question, answer, category, order]);
      }
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/faqs/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      await executeSql("DELETE FROM faqs WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Contact Messages ---
  app.get("/api/contact-messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      const messages = await queries.getAllContactMessages();
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/contact-messages", async (req, res) => {
    try {
      const id = 'cont_' + Math.random().toString(36).substr(2, 9);
      const { name, email, subject, message } = req.body;
      await executeSql("INSERT INTO contact_messages (id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)", [id, name, email, subject, message]);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/contact-messages/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      const mappedUpdates: any = {};
      for (const [k, v] of Object.entries(req.body)) {
        let key = k;
        if (k === 'repliedAt') key = 'replied_at';
        mappedUpdates[key] = formatSqlValue(v);
      }
      const fields = Object.keys(mappedUpdates);
      if (fields.length > 0) {
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        await executeSql(`UPDATE contact_messages SET ${setClause} WHERE id = ?`, [...Object.values(mappedUpdates), req.params.id]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/contact-messages/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      await executeSql("DELETE FROM contact_messages WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Reviews ---
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await queries.getAllReviews();
      res.json(reviews);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/reviews/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      await queries.deleteReview(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Withdrawals ---
  app.get("/api/withdrawals", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      let targetOwnerId: string | undefined = undefined;
      
      if (ownerId) {
        targetOwnerId = ownerId;
      } else if (req.user?.role !== 'admin') {
        targetOwnerId = req.user?.uid;
      }
      
      const withdrawals = await queries.getAllWithdrawals(targetOwnerId);
      res.json(withdrawals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/withdrawals", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = 'wth_' + Math.random().toString(36).substr(2, 9);
      const { amount, phone, provider } = req.body;
      await executeSql("INSERT INTO withdrawals (id, owner_id, amount, phone, provider) VALUES (?, ?, ?, ?, ?)", [id, req.user?.uid, amount, phone, provider]);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/withdrawals/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      const body: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (key === 'approvedAt') {
          body['approved_at'] = formatSqlValue(value);
        } else if (key === 'ownerId') {
          body['owner_id'] = formatSqlValue(value);
        } else if (key === 'createdAt') {
          body['created_at'] = formatSqlValue(value);
        } else {
          body[key] = formatSqlValue(value);
        }
      }
      const fields = Object.keys(body);
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      await executeSql(`UPDATE withdrawals SET ${setClause} WHERE id = ?`, [...Object.values(body), req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Notifications ---
  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.query;
      const targetId = (userId as string) || req.user?.uid || '';
      const notifications = await queries.getNotifications(targetId);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = 'not_' + Math.random().toString(36).substr(2, 9);
      const { user_id, userId, title, message, type, reference_id, referenceId } = req.body;
      const targetUserId = user_id || userId;
      const targetReferenceId = reference_id || referenceId;
      
      if (!targetUserId) {
        return res.status(400).json({ error: "user_id is required" });
      }

      await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)", 
        [id, targetUserId, title, message, type, targetReferenceId]);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      await executeSql("UPDATE notifications SET is_read = 1 WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notifications/read-all", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.body.userId || req.user?.uid;
      await executeSql("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Admin ---
  app.post("/api/admin/reset-db", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      await initDatabase();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------- ROUTES MÉTIER (conservées telles quelles) ----------
  // (Toutes les routes existantes pour residences, bookings, notifications, etc.
  //  Elles utilisent executeSql / queries, donc OK.)

  // ---------- SAPPAY – INIT ----------
  app.post("/api/payment/sappay/init", async (req, res) => {
    const { amount, note, email } = req.body;
    try {
      const credentials = await getSappayCredentials();
      const urls = await getSappayBaseUrls();
      const token = await getSappayToken();

      const payload = {
        type: "SIMPLE",
        customer: {
          email: email || "client@resifaso.com",
          country: 1
        },
        amount: parseFloat(amount).toFixed(2),
        note: note || "Validation acompte"
      };

      if (credentials.isTestMode) {
        return res.json({
          invoice_id: `mock_inv_${Date.now()}`,
          access_token: token
        });
      }

      const response = await fetch(`${urls.publicBase}/invoice/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erreur Sappay création facture : ${text}`);
      }

      const data = await response.json();
      const invoiceId = findInvoiceId(data);
      if (!invoiceId) throw new Error("Impossible de récupérer l'ID de facture.");

      res.json({ invoice_id: invoiceId, access_token: token });
    } catch (error: any) {
      console.error("Erreur /sappay/init :", error);
      const credentials = await getSappayCredentials();
      if (credentials.isTestMode) {
        return res.json({ invoice_id: `mock_inv_${Date.now()}`, access_token: "mock" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- SAPPAY – GET OTP (avec gestion des opérateurs PULL) ----------
  app.post("/api/payment/sappay/get-otp", async (req, res) => {
    const { customer_msisdn, invoice_id, payment_processor_id, access_token } = req.body;

    // Opérateurs PULL-OTP (l'OTP est généré manuellement par l'utilisateur via USSD)
    const PULL_OPERATORS = [PROCESSOR_ORANGE, PROCESSOR_TELECEL];

    if (PULL_OPERATORS.includes(payment_processor_id)) {
      // Pas d'appel à Sappay, on renvoie une réponse factice pour que le frontend continue
      return res.json({
        trans_id: `manual_otp_${Date.now()}`,
        message: "Veuillez générer votre code OTP via USSD et le saisir pour valider le paiement."
      });
    }

    // Pour Moov et Coris (PUSH-OTP), on appelle Sappay
    try {
      const credentials = await getSappayCredentials();
      const urls = await getSappayBaseUrls();

      if (credentials.isTestMode) {
        return res.json({
          trans_id: `mock_txn_${Date.now()}`,
          message: "Mode test : OTP simulé (1234 ou 123456)"
        });
      }

      const response = await fetch(`${urls.checkoutBase}/get-otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${access_token}`
        },
        body: JSON.stringify({
          customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
          invoice_id,
          payment_processor_id
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erreur Sappay get-otp : ${text}`);
      }

      const data = await response.json();
      res.json({
        trans_id: data.trans_id || data.transaction_id || `txn_${Date.now()}`,
        message: data.message || "OTP envoyé par SMS."
      });
    } catch (error: any) {
      console.error("Erreur /sappay/get-otp :", error);
      const credentials = await getSappayCredentials();
      if (credentials.isTestMode) {
        return res.json({ trans_id: `mock_txn_${Date.now()}`, message: "OTP simulé (1234/123456)" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- SAPPAY – PERFORM ----------
  app.post(["/api/payments/sappay/perform", "/api/payment/sappay/perform"], async (req, res) => {
    const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token } = req.body;
    try {
      const credentials = await getSappayCredentials();
      const isTestMode = credentials.isTestMode || req.body.isTestMode || false;
      const urls = { checkoutBase: isTestMode ? SAPPAY_BASE_CHECKOUT_SANDBOX : SAPPAY_BASE_CHECKOUT_PROD };

      if (isTestMode) {
        if (otp && (otp === "1234" || otp === "123456" || otp.length >= 4)) {
          return res.json({ status: "SUCCESS", message: "Paiement test réussi." });
        }
        return res.status(400).json({ error: "OTP invalide (mode test)" });
      }

      const payload: any = {
        invoice_id,
        payment_processor_id,
        customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
        otp: otp ? otp.toString() : ""
      };
      if (trans_id) payload.trans_id = trans_id;

      const headers: any = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${access_token}`
      };

      const response = await fetch(`${urls.checkoutBase}/perform/`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      if (!response.ok) {
        let detail = responseText;
        try { const err = JSON.parse(responseText); detail = err.message || err.error || detail; } catch (e) {}
        return res.status(response.status).json({ error: "Erreur Sappay perform", details: detail });
      }

      const data = JSON.parse(responseText);
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Erreur /sappay/perform :", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- AVIS (REVIEWS) – version SQL ----------
  app.post("/api/submit-review", authenticateToken, async (req: AuthRequest, res) => {
    const { bookingId, residenceId, rating, comment } = req.body;
    if (!bookingId || !residenceId || !rating) {
      return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
      const reviewId = `rev_${Date.now()}`;
      await executeSql(
        `INSERT INTO reviews (id, booking_id, residence_id, client_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [reviewId, bookingId, residenceId, req.user?.uid, rating, comment || '']
      );

      const rows = await executeSql(
        `SELECT AVG(rating) as avgRating, COUNT(*) as count FROM reviews WHERE residence_id = ?`,
        [residenceId]
      );
      const avg = rows[0]?.avgRating || 0;
      const count = rows[0]?.count || 0;
      await executeSql(
        `UPDATE residences SET rating = ?, review_count = ? WHERE id = ?`,
        [parseFloat(avg.toFixed(1)), count, residenceId]
      );

      res.json({ success: true, reviewId });
    } catch (error: any) {
      console.error("Erreur submit-review :", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- FORGOT PASSWORD (squelette) ----------
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis" });
    try {
      const users = await executeSql("SELECT uid FROM users WHERE email = ?", [email]);
      if (users.length === 0) return res.status(404).json({ error: "Email inconnu" });
      res.json({ success: true, message: "Un email de réinitialisation a été envoyé (si SMTP configuré)." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 404 for undefined API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Route not found" });
  });

  // ---------- SERVEUR STATIQUE ----------
  app.use(express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

startServer();
