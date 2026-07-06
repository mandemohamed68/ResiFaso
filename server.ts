import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from "nodemailer";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { executeSql } from './src/db/index';
import { initDatabase } from './src/db/init';
import { authenticateToken, AuthRequest } from './src/lib/auth-middleware';
import * as queries from './src/db/queries';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

// Safe detection of __dirname and __filename for both CJS and ESM
const currentFilename = typeof __filename !== "undefined" 
  ? __filename 
  : "";

const currentDirname = typeof __dirname !== "undefined" 
  ? __dirname 
  : (currentFilename ? path.dirname(currentFilename) : process.cwd());

// Initialize Firebase Admin utilizing credentials if available
let adminDb: any = null;
if (DB_TYPE === 'firebase') {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      
      const apps = getApps();
      if (apps.length === 0) {
        initializeApp({
          projectId: config.projectId,
        });
      }
      
      const dbId = config.firestoreDatabaseId || "(default)";
      adminDb = getFirestore(dbId);
      console.log(`Firebase Admin initialized for project ${config.projectId} and database ${dbId}`);
    } else {
      const apps = getApps();
      if (apps.length === 0) {
        initializeApp();
      }
      adminDb = getFirestore();
      console.log("Firebase Admin initialized with default ADC");
    }
  } catch (e: any) {
    console.error("Firebase Admin initialization failed:", e);
  }
}

const SAPPAY_BASE_PUBLIC_SANDBOX = "https://sandbox.sappay.net/api/v1";
const SAPPAY_BASE_CHECKOUT_SANDBOX = "https://sandbox.sappay.net/api/v1/checkout";

const SAPPAY_BASE_PUBLIC_PROD = "https://api.prod.sappay.net/api/public";
const SAPPAY_BASE_CHECKOUT_PROD = "https://api.prod.sappay.net/api/checkout";

// Dynamically fetch administrator-configured Sappay credentials
async function getSappayCredentials() {
  if (DB_TYPE === 'firebase' && adminDb) {
    try {
      const docSnap = await adminDb.collection("settings").doc("global").get();
      if (docSnap.exists) {
        const data = docSnap.data();
        return {
          clientId: data?.sappayClientId || process.env.SAPPAY_CLIENT_ID || "",
          clientSecret: data?.sappayClientSecret || process.env.SAPPAY_CLIENT_SECRET || "",
          username: data?.sappayUsername || process.env.SAPPAY_USERNAME || "",
          password: data?.sappayPassword || process.env.SAPPAY_PASSWORD || "",
          isTestMode: data?.isTestMode !== undefined ? data.isTestMode : false
        };
      }
    } catch (e: any) {
      console.warn("Sappay: Error reading Firebase configuration:", e.message);
    }
  } else if (DB_TYPE !== 'firebase') {
    try {
      const results = await executeSql("SELECT value FROM settings WHERE `key` = 'global'");
      if (results && results.length > 0) {
        const data = JSON.parse(results[0].value);
        return {
          clientId: data?.sappayClientId || process.env.SAPPAY_CLIENT_ID || "",
          clientSecret: data?.sappayClientSecret || process.env.SAPPAY_CLIENT_SECRET || "",
          username: data?.sappayUsername || process.env.SAPPAY_USERNAME || "",
          password: data?.sappayPassword || process.env.SAPPAY_PASSWORD || "",
          isTestMode: data?.isTestMode !== undefined ? data.isTestMode : false
        };
      }
    } catch (e: any) {
      console.warn("Sappay: Error reading SQL configuration:", e.message);
    }
  }
  return {
    clientId: process.env.SAPPAY_CLIENT_ID || "IJIJhhArSLVJNIs2ylGwowxTCqm5t5br92lAPlgF",
    clientSecret: process.env.SAPPAY_CLIENT_SECRET || "7qrVeDjSmDQjHksFyzKriidK3iuSo3RK6h5voHnbXAAPZvQEQnF9LIPzjqOcg4POqmikuUoJ7ynI565leEzbFhSnKZynwCLVOChma3y7vesLBRwaoyixtLcknd4g6Rdm",
    username: process.env.SAPPAY_USERNAME || "mandemohamed68@gmail.com",
    password: process.env.SAPPAY_PASSWORD || "mm@27071986",
    isTestMode: false
  };
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

// Convert phone number into clean MSISDN for Sappay (Burkina Faso focus)
function normalizePhoneNumberSappay(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  // If it starts with 226 or 00226 and is longer than 8 digits, take the last 8
  if (clean.length > 8) {
    if (clean.startsWith("226")) return clean.slice(-8);
    if (clean.startsWith("00226")) return clean.slice(-8);
  }
  // Otherwise return as is (Sappay expects 8 digits for BF Mobile Money in most cases)
  return clean;
}

// Safely resolve Invoice ID from response dictionary
function findInvoiceId(responseData: any): string | null {
  if (!responseData) return null;
  
  // Check Sappay production response structure: response.invoice_detail.invoice_id
  if (responseData.response?.invoice_detail?.invoice_id) return responseData.response.invoice_detail.invoice_id;
  if (responseData.response?.invoice_id) return responseData.response.invoice_id;
  
  // Standard fallbacks
  if (responseData.invoice_id) return responseData.invoice_id;
  if (responseData.id) return responseData.id;
  if (responseData.data?.invoice_id) return responseData.data.invoice_id;
  if (responseData.data?.id) return responseData.data.id;
  
  return null;
}

// Request new bearer auth token from Sappay API using admin credentials
async function getSappayToken(): Promise<string> {
  const credentials = await getSappayCredentials();
  const urls = await getSappayBaseUrls();
  try {
    const response = await fetch(`${urls.publicBase}/authentication/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        grant_type: "password",
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password
      })
    });
    
    if (response.ok) {
      const data: any = await response.json();
      const token = data.access || data.access_token || data.token || data.response?.access || data.response?.access_token || data.response?.token;
      if (!token && !credentials.isTestMode) {
        throw new Error("Sappay a retourné un succès sans jeton d'accès (access_token absent).");
      }
      return token || "mock_sappay_token_success";
    } else {
      const errorText = await response.text();
      if (!credentials.isTestMode) {
        throw new Error(`Échec de l'authentification Sappay (${response.status}): ${errorText}`);
      }
      return "mock_sappay_token_fallback";
    }
  } catch (err: any) {
    if (!credentials.isTestMode) {
      throw new Error(`Erreur de connexion Sappay lors de l'authentification : ${err.message}`);
    }
    return "mock_sappay_token_error_fallback";
  }
}

async function startServer() {
  // Initialize SQL database if requested
  if (DB_TYPE !== 'firebase') {
    try {
      await initDatabase();
    } catch (err) {
      console.error("Database initialization failed:", err);
    }
  }

  const app = express();
  const PORT = 3000;

  // Lightweight CORS middleware to allow calls from mobile Capacitor webview (localhost / capacitor:// etc)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- CUSTOM AUTH SYSTEM (SQL) ---
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

    try {
      if (DB_TYPE === 'firebase') {
        return res.status(400).json({ error: "L'enregistrement direct n'est pas supporté en mode Firebase." });
      }

      const existing = await executeSql("SELECT uid FROM users WHERE email = ?", [email]);
      if (existing && existing.length > 0) return res.status(400).json({ error: "Cet email est déjà utilisé" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = 'u_' + Math.random().toString(36).substr(2, 9);
      const role = email === 'mandemohamed68@gmail.com' ? 'admin' : 'client';

      await executeSql(
        "INSERT INTO users (uid, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
        [uid, email, hashedPassword, displayName || 'Voyageur', role]
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
      if (DB_TYPE === 'firebase') {
        return res.status(400).json({ error: "L'authentification directe n'est pas supportée en mode Firebase." });
      }

      const users = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
      if (!users || users.length === 0) return res.status(401).json({ error: "Identifiants invalides" });

      const user = users[0];
      if (!user.password_hash) return res.status(401).json({ error: "Compte sans mot de passe local. Utilisez l'auth sociale si configurée." });

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
      if (DB_TYPE === 'firebase') return res.status(400).json({ error: "Non supporté en mode Firebase" });
      const users = await executeSql("SELECT uid, email, display_name as displayName, role, photo_url as photoUrl, is_verified as isVerified FROM users WHERE uid = ?", [req.user?.uid]);
      if (!users || users.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé" });
      res.json(users[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- GENERIC DATA API (SQL) ---
  app.get("/api/residences", async (req, res) => {
    try {
      const list = await queries.getAllResidences();
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/residences/:id", async (req, res) => {
    try {
      const item = await queries.getResidenceById(req.params.id);
      if (!item) return res.status(404).json({ error: "Non trouvé" });
      res.json(item);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const data = await queries.getSettings(req.params.key);
      res.json(data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/settings/:key", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Réservé aux admins" });
    try {
      await queries.saveSettings(req.params.key, req.body);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/admin/db-type", (req, res) => {
    res.json({ dbType: DB_TYPE });
  });

  app.get("/api/ads", async (req, res) => {
    try {
      const list = await queries.getAllAds();
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/ads", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Réservé aux admins" });
    const { id, title, description, imageUrl, linkUrl, position, active } = req.body;
    try {
      const existing = await executeSql("SELECT id FROM advertisements WHERE id = ?", [id]);
      if (existing.length > 0) {
        await executeSql("UPDATE advertisements SET title = ?, description = ?, image_url = ?, link_url = ?, position = ?, active = ? WHERE id = ?", [title, description, imageUrl, linkUrl, position, active ? 1 : 0, id]);
      } else {
        await executeSql("INSERT INTO advertisements (id, title, description, image_url, link_url, position, active) VALUES (?, ?, ?, ?, ?, ?, ?)", [id, title, description, imageUrl, linkUrl, position, active ? 1 : 0]);
      }
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/ads/:id", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Réservé aux admins" });
    try {
      await executeSql("DELETE FROM advertisements WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/faqs", async (req, res) => {
    try {
      const list = await executeSql("SELECT * FROM faqs ORDER BY `order` ASC");
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/faqs", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Réservé aux admins" });
    const { id, question, answer, category, order } = req.body;
    try {
      const existing = await executeSql("SELECT id FROM faqs WHERE id = ?", [id]);
      if (existing.length > 0) {
        await executeSql("UPDATE faqs SET question = ?, answer = ?, category = ?, `order` = ? WHERE id = ?", [question, answer, category, order, id]);
      } else {
        await executeSql("INSERT INTO faqs (id, question, answer, category, `order`) VALUES (?, ?, ?, ?, ?)", [id, question, answer, category, order]);
      }
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/faqs/:id", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Réservé aux admins" });
    try {
      await executeSql("DELETE FROM faqs WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/contact-messages", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Réservé aux admins" });
    try {
      const list = await executeSql("SELECT * FROM contact_messages ORDER BY created_at DESC");
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/contact-messages", async (req, res) => {
    const { id, name, email, subject, message } = req.body;
    const msgId = id || `msg_${Date.now()}`;
    try {
      await executeSql("INSERT INTO contact_messages (id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)", [msgId, name, email, subject, message]);
      res.json({ success: true, id: msgId });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/contact-messages/:id", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Réservé aux admins" });
    try {
      await executeSql("DELETE FROM contact_messages WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/contact-messages/:id", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Réservé aux admins" });
    const { is_read } = req.body;
    try {
      await executeSql("UPDATE contact_messages SET is_read = ? WHERE id = ?", [is_read ? 1 : 0, req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/reviews", async (req, res) => {
    try {
      const list = await executeSql("SELECT * FROM reviews ORDER BY created_at DESC");
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/reviews/:id", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
    try {
      await queries.deleteReview(req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const list = await executeSql("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [req.user?.uid]);
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/notifications/:id/read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await executeSql("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user?.uid]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const notif = req.body;
      const id = `notif_${Date.now()}`;
      await executeSql(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, notif.userId, notif.title, notif.message, notif.type, 0]);
      res.json({ id, ...notif, is_read: 0 });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Messaging API
  app.post("/api/conversations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { participants, relatedId } = req.body;
      // Check if conversation exists
      const existing = await executeSql("SELECT * FROM conversations WHERE participants LIKE ?", [`%${participants[0]}%`]);
      const conv = existing.find((c: any) => {
        const p = JSON.parse(c.participants);
        return p.length === participants.length && participants.every((id: string) => p.includes(id));
      });

      if (conv) {
        return res.json({ ...conv, participants: JSON.parse(conv.participants) });
      }

      const id = `conv_${Date.now()}`;
      await executeSql(`
        INSERT INTO conversations (id, participants, related_id)
        VALUES (?, ?, ?)
      `, [id, JSON.stringify(participants), relatedId || null]);
      res.json({ id, participants, related_id: relatedId || null });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/conversations/:id/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { senderId, text } = req.body;
      const id = `msg_${Date.now()}`;
      await executeSql(`
        INSERT INTO messages (id, conversation_id, sender_id, text)
        VALUES (?, ?, ?, ?)
      `, [id, req.params.id, senderId, text]);
      
      await executeSql("UPDATE conversations SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [text, req.params.id]);
      
      res.json({ id, conversation_id: req.params.id, senderId, text, created_at: new Date().toISOString() });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/conversations/:id/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const list = await executeSql("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", [req.params.id]);
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Withdrawals API
  app.get("/api/withdrawals", authenticateToken, async (req: AuthRequest, res) => {
    try {
      let query = "SELECT * FROM withdrawals";
      let params: any[] = [];
      if (req.user?.role !== 'admin') {
        query += " WHERE owner_id = ?";
        params.push(req.user?.uid);
      }
      query += " ORDER BY created_at DESC";
      const list = await executeSql(query, params);
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/withdrawals", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      const id = `with_${Date.now()}`;
      await executeSql(`
        INSERT INTO withdrawals (id, owner_id, amount, phone, provider, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, req.user?.uid, data.amount, data.phone, data.provider, 'pending']);
      res.json({ id, ...data, status: 'pending' });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/withdrawals/:id", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
    try {
      const { status, approvedAt } = req.body;
      await executeSql("UPDATE withdrawals SET status = ?, approved_at = ? WHERE id = ?", [status, approvedAt || null, req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/residences/:id", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'owner') return res.status(403).json({ error: "Interdit" });
    try {
      await queries.deleteResidence(req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/residences/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await queries.updateResidence(req.params.id, req.body);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/residences", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = `res_${Date.now()}`;
      await queries.createResidence({ id, ...req.body, ownerId: req.user?.uid });
      res.json({ id });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/bookings/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await queries.updateBookingStatus(req.params.id, req.body);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/users/:uid", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.uid !== req.params.uid && req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
    try {
      await queries.updateUserProfile(req.params.uid, req.body);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/users/:uid", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
    try {
      await queries.deleteUser(req.params.uid);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/admin/reset-db", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
    try {
      // Hard reset logic
      await executeSql("DELETE FROM bookings");
      await executeSql("DELETE FROM reviews");
      await executeSql("DELETE FROM notifications");
      await executeSql("DELETE FROM messages");
      await executeSql("DELETE FROM conversations");
      // Reseed if needed? Or just empty?
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/users", authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
    try {
      const list = await queries.getAllUsers();
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/bookings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const field = req.query.role === 'owner' ? 'owner_id' : 'client_id';
      const list = await executeSql(`SELECT * FROM bookings WHERE ${field} = ? ORDER BY created_at DESC`, [req.user?.uid]);
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/bookings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const booking = req.body;
      const id = `book_${Date.now()}`;
      await executeSql(`
        INSERT INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, booking_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, 
        booking.residenceId, 
        req.user?.uid, 
        booking.ownerId, 
        booking.checkIn, 
        booking.checkOut, 
        booking.guests || 1, 
        booking.totalPrice, 
        booking.advancePaid || 0,
        'pending'
      ]);
      res.json({ id, ...booking, booking_status: 'pending' });
    } catch (err: any) { 
      console.error("Booking Creation Error:", err);
      res.status(500).json({ error: err.message }); 
    }
  });

  app.get("/api/residences/:id/bookings", async (req, res) => {
    try {
      const list = await executeSql("SELECT * FROM bookings WHERE residence_id = ? AND booking_status IN ('confirmed', 'pending')", [req.params.id]);
      res.json(list);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Auth & Email endpoints
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis" });

    try {
      let userExists = false;
      let emailSettings: any = null;

      if (DB_TYPE === 'firebase') {
        if (!adminDb) throw new Error("Base de données non initialisée");
        const usersSnap = await adminDb.collection("users").where("email", "==", email).get();
        userExists = !usersSnap.empty;
        const settingsSnap = await adminDb.collection("settings").doc("email").get();
        if (settingsSnap.exists) emailSettings = settingsSnap.data();
      } else {
        const users = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
        userExists = users.length > 0;
        const settings = await executeSql("SELECT value FROM settings WHERE `key` = 'email'");
        if (settings.length > 0) emailSettings = JSON.parse(settings[0].value);
      }

      if (!userExists) {
        return res.status(404).json({ error: "Aucun utilisateur trouvé avec cet email" });
      }

      if (!emailSettings || !emailSettings.smtpHost) {
        return res.status(500).json({ error: "Le service d'envoi d'email n'est pas configuré par l'administrateur." });
      }

      let resetLink = "";
      if (DB_TYPE === 'firebase') {
        resetLink = await getAuth().generatePasswordResetLink(email);
      } else {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
        if (DB_TYPE === 'mariadb') {
          await executeSql("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?", [email, token, expiresAt, token, expiresAt]);
        } else {
          await executeSql("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET token = ?, expires_at = ?", [email, token, expiresAt, token, expiresAt]);
        }
        resetLink = `${req.headers.origin}?view=reset-password&email=${email}&token=${token}`;
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: emailSettings.smtpHost,
        port: Number(emailSettings.smtpPort),
        secure: emailSettings.smtpSecure,
        auth: {
          user: emailSettings.smtpUser,
          pass: emailSettings.smtpPass,
        },
      });

      // Send email
      await transporter.sendMail({
        from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
        to: email,
        subject: "Réinitialisation de votre mot de passe - ResiFaso",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #e11d48; text-align: center;">ResiFaso</h2>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ResiFaso.</p>
            <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Réinitialiser mon mot de passe</a>
            </div>
            <p>Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet email en toute sécurité.</p>
            <p>Ce lien expirera bientôt.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666; text-align: center;">
              &copy; 2026 ResiFaso. Burkina Faso.
            </p>
          </div>
        `,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de l'envoi de l'email" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;
    try {
      if (DB_TYPE === 'firebase') {
        return res.status(400).json({ error: "Reset password for Firebase should be handled on client via reset link" });
      } else {
        const resets = await executeSql("SELECT * FROM password_resets WHERE email = ? AND token = ?", [email, token]);
        if (resets.length === 0) return res.status(400).json({ error: "Lien invalide ou expiré" });
        
        const reset = resets[0];
        if (new Date(reset.expires_at) < new Date()) {
          return res.status(400).json({ error: "Lien expiré" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await executeSql("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
        await executeSql("DELETE FROM password_resets WHERE email = ?", [email]);
        
        res.json({ success: true });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/email-settings", async (req, res) => {
    try {
      if (DB_TYPE === 'firebase') {
        if (!adminDb) throw new Error("Base de données non initialisée");
        const docSnap = await adminDb.collection("settings").doc("email").get();
        return res.json(docSnap.exists ? docSnap.data() : {});
      } else {
        const results = await executeSql("SELECT value FROM settings WHERE `key` = 'email'");
        return res.json(results.length > 0 ? JSON.parse(results[0].value) : {});
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/email-settings", async (req, res) => {
    try {
      const settings = req.body;
      if (DB_TYPE === 'firebase') {
        if (!adminDb) throw new Error("Base de données non initialisée");
        await adminDb.collection("settings").doc("email").set(settings, { merge: true });
      } else {
        if (DB_TYPE === 'mariadb') {
          await executeSql("INSERT INTO settings (`key`, value) VALUES ('email', ?) ON DUPLICATE KEY UPDATE value = ?", [JSON.stringify(settings), JSON.stringify(settings)]);
        } else {
          await executeSql("INSERT INTO settings (`key`, value) VALUES ('email', ?) ON CONFLICT(`key`) DO UPDATE SET value = ?", [JSON.stringify(settings), JSON.stringify(settings)]);
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sappay API Gateway Proxy: INIT invoice
  app.post("/api/payment/sappay/init", async (req, res) => {
    try {
      const { amount, note, email } = req.body;
      const getCreds = await getSappayCredentials();
      const isTestMode = getCreds.isTestMode;
      const token = await getSappayToken();
      const urls = await getSappayBaseUrls();

      let invoiceResponse;
      try {
        invoiceResponse = await fetch(`${urls.publicBase}/invoice/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            type: "SIMPLE",
            customer: {
              email: email || "client@resifaso.com",
              country: 1
            },
            amount: Math.round(Number(amount)),
            note: note || `Réservation RESIFASO #${Math.random().toString(36).substr(2, 5).toUpperCase()}`
          }),
        });
      } catch (fetchErr: any) {
        if (!isTestMode) {
          return res.status(500).json({ error: `Erreur de connexion Sappay lors de la création de la facture : ${fetchErr.message}` });
        }
        const mockInvoiceId = "inv_" + Math.random().toString(36).substr(2, 9);
        return res.json({
          invoice_id: mockInvoiceId,
          access_token: token,
          status: "PENDING",
          isMock: true
        });
      }

      let responseText = "";
      try {
        responseText = await invoiceResponse.text();
      } catch (e) {
        responseText = "Impossible de lire la réponse.";
      }

      if (!invoiceResponse.ok) {
        if (!isTestMode) {
          return res.status(invoiceResponse.status).json({ 
            error: `Sappay Invoice API Error (${invoiceResponse.status})`, 
            details: responseText 
          });
        }
        console.warn(`Sappay invoice creation returned error (${invoiceResponse.status}). Rolling back to Sandbox mode.`);
        const mockInvoiceId = "inv_" + Math.random().toString(36).substr(2, 9);
        return res.json({
          invoice_id: mockInvoiceId,
          access_token: token,
          status: "PENDING",
          isMock: true
        });
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Sappay response was not valid JSON: ${responseText.substring(0, 500)}`);
      }
      const invoiceId = findInvoiceId(responseData);

      if (!invoiceId) {
        return res.status(400).json({ error: "Could not retrieve Invoice ID from Sappay", details: responseData });
      }

      res.json({ 
        invoice_id: invoiceId, 
        access_token: token,
        status: responseData.status || "PENDING"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sappay API Gateway Proxy: GET OTP
  app.post("/api/payment/sappay/get-otp", async (req, res) => {
    try {
      const { customer_msisdn, invoice_id, payment_processor_id, access_token } = req.body;
      const getCreds = await getSappayCredentials();
      const isTestMode = getCreds.isTestMode;
      const urls = await getSappayBaseUrls();
      
      if (invoice_id && (invoice_id.startsWith("inv_") || invoice_id.includes("mock"))) {
        return res.json({
          status: "SUCCESS",
          trans_id: "tx_" + Math.random().toString(36).substr(2, 9),
          message: "SMS OTP envoyé avec succès (Mode Sandbox)"
        });
      }

      const headers: any = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token}`;
      }

      let response;
      try {
        response = await fetch(`${urls.checkoutBase}/get-otp/`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
            invoice_id,
            payment_processor_id
          }),
        });
      } catch (fetchErr: any) {
        if (!isTestMode) {
          return res.status(500).json({ error: `Erreur de connexion Sappay lors de la demande d'OTP : ${fetchErr.message}` });
        }
        return res.json({
          status: "SUCCESS",
          trans_id: "tx_" + Math.random().toString(36).substr(2, 9),
          message: "SMS OTP envoyé avec succès (Mode Sandbox Fallback)"
        });
      }

      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la réponse.";
      }

      if (!response.ok) {
        if (!isTestMode) {
          return res.status(response.status).json({ 
            error: `La demande de code OTP auprès de la passerelle Sappay a échoué (${response.status})`, 
            details: responseText 
          });
        }
        console.warn(`Sappay get-otp returned error (${response.status}). Using sandbox fallback.`);
        return res.json({
          status: "SUCCESS",
          trans_id: "tx_" + Math.random().toString(36).substr(2, 9),
          message: "SMS OTP envoyé avec succès (Mode Sandbox Fallback)"
        });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return res.status(500).json({ error: "Format de réponse OTP invalide" });
      }
      res.status(response.status).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sappay API Gateway Proxy: PERFORM (Final validation)
  app.post("/api/payment/sappay/perform", async (req, res) => {
    try {
      const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token } = req.body;
      const getCreds = await getSappayCredentials();
      const isTestMode = getCreds.isTestMode;
      const urls = await getSappayBaseUrls();
      
      if (invoice_id && (invoice_id.startsWith("inv_") || invoice_id.includes("mock"))) {
        if (otp.toString() === "1234" || otp.toString() === "123456" || otp.toString().length === 4 || otp.toString().length === 6) {
          return res.json({
            status: "SUCCESS",
            message: "Paiement effectué avec succès (Mode Sandbox)"
          });
        } else {
          return res.status(400).json({ error: "Code OTP invalide (Mode Sandbox)" });
        }
      }

      const payload: any = {
        invoice_id,
        payment_processor_id,
        customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
        otp: otp.toString()
      };

      if (trans_id) {
        payload.trans_id = trans_id;
      }

      const headers: any = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token}`;
      }

      // Sapphire Perform Call
      let response;
      try {
        response = await fetch(`${urls.checkoutBase}/perform/`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      } catch (fetchErr: any) {
        if (!isTestMode) {
          return res.status(500).json({ error: `Erreur de connexion Sappay (Perform) : ${fetchErr.message}` });
        }
        if (otp.toString() === "1234" || otp.toString() === "123456" || otp.toString().length === 4 || otp.toString().length === 6) {
          return res.json({
            status: "SUCCESS",
            message: "Paiement effectué avec succès (Mode Sandbox Fallback)"
          });
        }
        return res.status(400).json({
          error: "Code OTP invalide (Mode Sandbox Fallback)"
        });
      }

      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la réponse.";
      }

      if (!response.ok) {
        let errorTitle = `Erreur Sappay (${response.status})`;
        let detailMessage = responseText;
        
        try {
          const errData = JSON.parse(responseText);
          if (errData.message) detailMessage = errData.message;
          if (errData.error && typeof errData.error === 'string') detailMessage = errData.error;
        } catch (e) {
          // Not JSON or no message
        }

        if (!isTestMode) {
          return res.status(response.status).json({ 
            error: errorTitle, 
            details: detailMessage 
          });
        }
        console.warn(`Sappay perform returned error (${response.status}). Falling back to sandbox support.`);
        if (otp.toString() === "1234" || otp.toString() === "123456" || otp.toString().length === 4 || otp.toString().length === 6) {
          return res.json({
            status: "SUCCESS",
            message: "Paiement effectué avec succès (Mode Sandbox Fallback)"
          });
        }
        return res.status(response.status).json({ 
          error: "Erreur de validation du paiement",
          details: detailMessage
        });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return res.status(500).json({ error: "Format de réponse perform invalide" });
      }
      res.status(response.status).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API to submit review and update residence rating
  app.post("/api/submit-review", async (req, res) => {
    const { bookingId, residenceId, clientId, rating, comment, bookingRef } = req.body;
    
    try {
      if (!adminDb) {
        return res.status(500).json({ error: "Database not initialized. Please configure database credentials." });
      }
      // 1. Add review
      await adminDb.collection('reviews').add({
        bookingId,
        residenceId,
        clientId,
        rating,
        comment,
        createdAt: new Date().toISOString()
      });

      // 2. Update residence rating
      const resRef = adminDb.collection('residences').doc(residenceId);
      const resDoc = await resRef.get();
      
      if (resDoc.exists) {
        const data = resDoc.data();
        const currentRating = data?.rating || 0;
        const currentCount = data?.reviewCount || 0;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + rating) / newCount;

        await resRef.update({
          rating: Number(newRating.toFixed(1)),
          reviewCount: newCount
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error submitting review:", error);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });

  // API Mock for Mobile Money OTP
  app.post("/api/payments/initiate", (req, res) => {
    const { phone, amount, provider } = req.body;
    console.log(`Initiating ${provider} payment for ${phone} of ${amount} FCFA`);
    // In a real app, this would call Orange/Moov/Wave API
    res.json({
      status: "pending",
      transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
      message: "OTP sent to your phone"
    });
  });

  app.post("/api/payments/verify", (req, res) => {
    const { transactionId, otp } = req.body;
    console.log(`Verifying OTP ${otp} for transaction ${transactionId}`);
    // Mock verification
    if (otp === "1234") {
      res.json({ status: "success", message: "Payment confirmed" });
    } else {
      res.status(400).json({ status: "error", message: "Invalid OTP" });
    }
  });

  // Generate a complete MariaDB compatible SQL dump of all Firestore collections
  app.get("/api/db/generate-dump", async (req, res) => {
    try {
      if (!adminDb) {
        return res.status(500).json({ error: "Firebase Admin is not initialized." });
      }

      const escapeSql = (val: any) => {
        if (val === undefined || val === null) return "NULL";
        if (typeof val === 'boolean') return val ? 1 : 0;
        if (typeof val === 'number') return val;
        if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      };

      let sql = `-- Dump Complet pour MariaDB / MySQL\n`;
      sql += `-- Généré le ${new Date().toISOString()}\n`;
      sql += `-- Contient toutes les tables, données et images\n\n`;

      // 1. Users
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

      const usersSnap = await adminDb.collection('users').get();
      const users = usersSnap.docs.map((d: any) => ({ uid: d.id, ...d.data() }));
      if (users.length > 0) {
        users.forEach((u: any) => {
          sql += `INSERT IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at) VALUES (\n`;
          sql += `  ${escapeSql(u.uid)},\n`;
          sql += `  ${escapeSql(u.email)},\n`;
          sql += `  ${escapeSql(u.displayName || u.display_name || '')},\n`;
          sql += `  ${escapeSql(u.phoneNumber || u.phone_number || '')},\n`;
          sql += `  ${escapeSql(u.photoURL || u.photo_url || '')},\n`;
          sql += `  ${escapeSql(u.role || 'client')},\n`;
          sql += `  ${escapeSql(u.isVerified || false)},\n`;
          sql += `  ${escapeSql(u.isSuspended || false)},\n`;
          sql += `  ${escapeSql(u.createdAt ? (u.createdAt.includes('T') ? new Date(u.createdAt).toISOString().replace('T', ' ').substring(0, 19) : u.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
          sql += `);\n`;
        });
        sql += '\n';
      }

      // 2. Residences
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

      const resSnap = await adminDb.collection('residences').get();
      const residences = resSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      
      if (residences.length > 0) {
        residences.forEach((r: any) => {
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
          sql += `  ${escapeSql(r.createdAt ? (r.createdAt.includes('T') ? new Date(r.createdAt).toISOString().replace('T', ' ').substring(0, 19) : r.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
          sql += `);\n`;
        });
        sql += '\n';
      }

      // 3. Amenities
      sql += `CREATE TABLE IF NOT EXISTS residence_amenities (\n`;
      sql += `  residence_id VARCHAR(128),\n`;
      sql += `  amenity VARCHAR(100),\n`;
      sql += `  PRIMARY KEY (residence_id, amenity)\n`;
      sql += `) PARTITION BY KEY(residence_id) PARTITIONS 4;\n\n`;

      if (residences.length > 0) {
        residences.forEach((r: any) => {
          if (r.amenities && Array.isArray(r.amenities)) {
            r.amenities.forEach((a: string) => {
              sql += `INSERT IGNORE INTO residence_amenities (residence_id, amenity) VALUES (${escapeSql(r.id)}, ${escapeSql(a)});\n`;
            });
          }
        });
        sql += '\n';
      }

      // 4. Images
      sql += `CREATE TABLE IF NOT EXISTS residence_images (\n`;
      sql += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
      sql += `  residence_id VARCHAR(128),\n`;
      sql += `  image_url TEXT NOT NULL\n`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 4;\n\n`;

      if (residences.length > 0) {
        residences.forEach((r: any) => {
          if (r.images && Array.isArray(r.images)) {
            r.images.forEach((img: string) => {
              sql += `INSERT IGNORE INTO residence_images (residence_id, image_url) VALUES (${escapeSql(r.id)}, ${escapeSql(img)});\n`;
            });
          }
        });
        sql += '\n';
      }

      // 5. Bookings
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

      const bSnap = await adminDb.collection('bookings').get();
      const bookings = bSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      
      if (bookings.length > 0) {
        bookings.forEach((b: any) => {
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
          sql += `  ${escapeSql(b.cancelledAt ? (b.cancelledAt.includes('T') ? new Date(b.cancelledAt).toISOString().replace('T', ' ').substring(0, 19) : b.cancelledAt) : null)},\n`;
          sql += `  ${escapeSql(b.refundStatus || b.refund_status || 'none')},\n`;
          sql += `  ${escapeSql(b.refundAmount || b.refund_amount || 0)},\n`;
          sql += `  ${escapeSql(b.refundPhone || b.refund_phone || null)},\n`;
          sql += `  ${escapeSql(b.refundProvider || b.refund_provider || null)},\n`;
          sql += `  ${escapeSql(b.refundProcessedAt ? (b.refundProcessedAt.includes('T') ? new Date(b.refundProcessedAt).toISOString().replace('T', ' ').substring(0, 19) : b.refundProcessedAt) : null)},\n`;
          sql += `  ${escapeSql(b.stayStatus || b.stay_status || 'pending')},\n`;
          sql += `  ${escapeSql(b.checkedInAt ? (b.checkedInAt.includes('T') ? new Date(b.checkedInAt).toISOString().replace('T', ' ').substring(0, 19) : b.checkedInAt) : null)},\n`;
          sql += `  ${escapeSql(b.checkedOutAt ? (b.checkedOutAt.includes('T') ? new Date(b.checkedOutAt).toISOString().replace('T', ' ').substring(0, 19) : b.checkedOutAt) : null)},\n`;
          sql += `  ${escapeSql(b.createdAt ? (b.createdAt.includes('T') ? new Date(b.createdAt).toISOString().replace('T', ' ').substring(0, 19) : b.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
          sql += `);\n`;
        });
        sql += '\n';
      }

      // 6. Reviews
      sql += `CREATE TABLE IF NOT EXISTS reviews (\n`;
      sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
      sql += `  booking_id VARCHAR(128) NOT NULL,\n`;
      sql += `  residence_id VARCHAR(128) NOT NULL,\n`;
      sql += `  client_id VARCHAR(128) NOT NULL,\n`;
      sql += `  rating INT NOT NULL,\n`;
      sql += `  comment TEXT,\n`;
      sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
      sql += `) PARTITION BY KEY(id) PARTITIONS 4;\n\n`;

      const rvSnap = await adminDb.collection('reviews').get();
      const reviews = rvSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      
      if (reviews.length > 0) {
        reviews.forEach((rv: any) => {
          sql += `INSERT IGNORE INTO reviews (id, booking_id, residence_id, client_id, rating, comment, created_at) VALUES (\n`;
          sql += `  ${escapeSql(rv.id)},\n`;
          sql += `  ${escapeSql(rv.bookingId || rv.booking_id || '')},\n`;
          sql += `  ${escapeSql(rv.residenceId || rv.residence_id || '')},\n`;
          sql += `  ${escapeSql(rv.clientId || rv.client_id || '')},\n`;
          sql += `  ${escapeSql(rv.rating)},\n`;
          sql += `  ${escapeSql(rv.comment)},\n`;
          sql += `  ${escapeSql(rv.createdAt ? (rv.createdAt.includes('T') ? new Date(rv.createdAt).toISOString().replace('T', ' ').substring(0, 19) : rv.createdAt) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
          sql += `);\n`;
        });
        sql += '\n';
      }

      // 7. Withdrawals
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

      const wdSnap = await adminDb.collection('withdrawals').get();
      const withdrawals = wdSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      
      if (withdrawals.length > 0) {
        withdrawals.forEach((w: any) => {
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

      const adSnap = await adminDb.collection('ads').get();
      const ads = adSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      
      if (ads.length > 0) {
        ads.forEach((ad: any) => {
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

      // Save to disk
      const dumpPath = path.join(process.cwd(), "resifaso_dump_exported.sql");
      fs.writeFileSync(dumpPath, sql, 'utf8');
      console.log(`Generated SQL dump successfully at: ${dumpPath}`);

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="resifaso_dump_exported.sql"');
      res.send(sql);

    } catch (err: any) {
      console.error("Error generating SQL dump:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Execute local SQL (MariaDB / SQLite) when run on local server
  app.post("/api/db/query", async (req, res) => {
    try {
      const { sql, params } = req.body;
      if (!sql) {
        return res.status(400).json({ error: "Missing SQL query" });
      }
      if (DB_TYPE === "firebase") {
        return res.status(400).json({ error: "Local DB not configured. Set DB_TYPE to mariadb or sqlite." });
      }
      const result = await executeSql(sql, params || []);
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error("SQL Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Serve public folder statically
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
