import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import nodemailer from "nodemailer";
import { executeSql } from './src/db/index';
import { initDatabase } from './src/db/init';
import { formatSqlValue } from './src/db/queries';
import { authenticateToken, AuthRequest } from './src/lib/auth-middleware';
import * as queries from './src/db/queries';
import { registerDeviceToken, unregisterDeviceToken, sendPushNotification, sendPushToAll } from './src/lib/fcm-server';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const DB_TYPE = process.env.DB_TYPE || (process.env.NODE_ENV === 'production' ? 'mariadb' : 'sqlite'); // 'mariadb' ou 'sqlite'

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
      if (data?.isTestMode !== undefined) finalCreds.isTestMode = false;
    }
  } catch (e: any) {
    console.warn("Sappay: Impossible de lire les paramètres depuis la base, utilisation des valeurs .env.", e.message);
  }

  finalCreds.isTestMode = false;
  return finalCreds;
}

async function getSappayBaseUrls() {
  return {
    publicBase: (process.env.SAPPAY_BASE_PUBLIC || SAPPAY_BASE_PUBLIC_PROD).trim(),
    checkoutBase: (process.env.SAPPAY_BASE_CHECKOUT || SAPPAY_BASE_CHECKOUT_PROD).trim()
  };
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

// Perform payout via SapPay
async function performSappayPayout(amount: number, phone: string, provider: string): Promise<{ success: boolean; transactionId: string; error?: string }> {
  try {
    const creds = await getSappayCredentials();
    const urls = await getSappayBaseUrls();
    const cleanPhone = normalizePhoneNumberSappay(phone);
    const processor = provider.toLowerCase().includes('moov') ? PROCESSOR_MOOV : PROCESSOR_ORANGE;

    console.log(`[Payout] Initiation d'un virement de ${amount} F CFA vers ${cleanPhone} (${provider})`);

    if (creds.isTestMode || !creds.clientId || creds.clientId.startsWith('OM_MOOV_GATEWAY') || creds.clientId.includes('****')) {
      // Simulate successful payout
      const mockTxId = 'pay_mock_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      console.log(`[Payout] Simulation de virement réussie (Transaction ID: ${mockTxId})`);
      return {
        success: true,
        transactionId: mockTxId
      };
    }

    const token = await getSappayToken();
    if (token === "mock_sappay_token_fallback") {
      const mockTxId = 'pay_mock_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      return { success: true, transactionId: mockTxId };
    }

    const payload = {
      processor: processor,
      amount: amount,
      destination: cleanPhone,
      reference: 'REFUND_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      description: 'Remboursement de reservation sur ResiFaso'
    };

    const response = await fetch(`${urls.publicBase}/transfers/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payout] Echec de l'API SapPay :", errorText);
      throw new Error(`API SapPay a retourne une erreur : ${errorText}`);
    }

    const data = await response.json();
    const txId = data.transaction_id || data.id || data.response?.transaction_id || 'pay_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    return {
      success: true,
      transactionId: txId
    };
  } catch (err: any) {
    console.error("[Payout] Erreur lors du payout :", err.message);
    return {
      success: false,
      transactionId: '',
      error: err.message
    };
  }
}

// ---------- SERVEUR EXPRESS ----------
async function startServer() {
  if (DB_TYPE !== 'firebase') {
    await initDatabase().catch(err => console.error("Init DB error:", err));
    // Safe addition of columns if initDatabase missed them
    try {
      if (DB_TYPE === 'sqlite') {
        const uCols: any = await executeSql("PRAGMA table_info(users)");
        if (Array.isArray(uCols) && !uCols.some((c: any) => String(c.name || '').toLowerCase() === 'has_accepted_terms')) {
          await executeSql("ALTER TABLE users ADD COLUMN has_accepted_terms BOOLEAN DEFAULT 0");
        }
        const wCols: any = await executeSql("PRAGMA table_info(withdrawals)");
        if (Array.isArray(wCols)) {
          if (!wCols.some((c: any) => String(c.name || '').toLowerCase() === 'transaction_id')) {
            await executeSql("ALTER TABLE withdrawals ADD COLUMN transaction_id VARCHAR(255)");
          }
          if (!wCols.some((c: any) => String(c.name || '').toLowerCase() === 'rejection_reason')) {
            await executeSql("ALTER TABLE withdrawals ADD COLUMN rejection_reason TEXT");
          }
        }
      } else {
        try { await executeSql("ALTER TABLE users ADD COLUMN has_accepted_terms BOOLEAN DEFAULT 0"); } catch (e) {}
        try { await executeSql("ALTER TABLE withdrawals ADD COLUMN transaction_id VARCHAR(255)"); } catch (e) {}
        try { await executeSql("ALTER TABLE withdrawals ADD COLUMN rejection_reason TEXT"); } catch (e) {}
      }
    } catch (e) {}
    try {
      if (DB_TYPE === 'mariadb') {
        await executeSql(`
          CREATE TABLE IF NOT EXISTS user_push_tokens (
            user_id VARCHAR(128) NOT NULL,
            token VARCHAR(255) NOT NULL,
            device_type VARCHAR(50),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, token)
          ) ENGINE=InnoDB
        `);
      } else {
        await executeSql(`
          CREATE TABLE IF NOT EXISTS user_push_tokens (
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            device_type TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, token)
          )
        `);
      }
    } catch (e) {
      console.error("Error creating user_push_tokens table:", e);
    }
  }

  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;

  // CORS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Normalize duplicate /api/api/, trailing slashes, or root /api requests
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/api/')) {
      req.url = req.url.replace(/^\/api\/api\//, '/api/');
    }
    if (req.path === '/api' || req.path === '/api/') {
      return res.json({ status: 'ok', message: 'ResiFaso API is online', timestamp: new Date().toISOString() });
    }
    if (req.url.startsWith('/api/') && req.url.endsWith('/') && req.url.length > 5) {
      req.url = req.url.slice(0, -1);
    }
    next();
  });

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
      const fullUser = await queries.getUserProfile(uid);
      res.json({ token, user: fullUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    let { email, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    
    try {
      // Automatic robust setup/repair for default Super Admin mandemohamed68@gmail.com / mm@27071986@
      if (email === 'mandemohamed68@gmail.com' && password === 'mm@27071986@') {
        const existing = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
        const hashedPassword = await bcrypt.hash('mm@27071986@', 10);
        
        if (existing.length === 0) {
          // If the super admin doesn't exist yet, auto-create him
          const uid = 'admin_master';
          await executeSql(
            "INSERT INTO users (uid, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
            [uid, email, hashedPassword, 'Super Admin', 'admin']
          );
          console.log("[Auth] Super Admin auto-created upon login request with credentials.");
        } else {
          // If he exists, ensure his role is admin and his password hash is correctly stored
          await executeSql(
            "UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?",
            [hashedPassword, email]
          );
          console.log("[Auth] Super Admin credentials and role auto-repaired upon login request.");
        }
      }

      const users = await executeSql("SELECT * FROM users WHERE email = ?", [email]);
      if (users.length === 0) return res.status(401).json({ error: "Identifiants invalides" });
      const user = users[0];

      if (user.email === 'mandemohamed68@gmail.com' && user.role !== 'admin') {
        await executeSql("UPDATE users SET role = 'admin' WHERE uid = ?", [user.uid]);
        user.role = 'admin';
      }

      const pwdHash = user.passwordHash || user.password_hash;
      if (!pwdHash) return res.status(401).json({ error: "Ce compte n'a pas encore de mot de passe local. Veuillez cliquer sur 'Oublié ?' pour en définir un." });

      const match = await bcrypt.compare(password, pwdHash);
      if (!match) return res.status(401).json({ error: "Identifiants invalides" });

      const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      const fullUser = await queries.getUserProfile(user.uid);
      res.json({ token, user: fullUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await queries.getUserProfile(req.user!.uid);
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
      res.json(user);
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

  app.put("/api/admin/residences/:id/reassign", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Non autorisé" });
      }
      const { newOwnerId } = req.body;
      if (!newOwnerId) return res.status(400).json({ error: "newOwnerId est requis" });
      
      await executeSql("UPDATE residences SET owner_id = ? WHERE id = ?", [newOwnerId, req.params.id]);
      await executeSql("UPDATE bookings SET owner_id = ? WHERE residence_id = ?", [newOwnerId, req.params.id]);
      
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
      const bookings = await executeSql(`
        SELECT id, check_in, check_out, booking_status, payment_status 
        FROM bookings 
        WHERE residence_id = ? 
        AND LOWER(booking_status) NOT IN ('cancelled', 'declined', 'annulee', 'annulé', 'refusee', 'refusé', 'expired', 'canceled')
        AND LOWER(payment_status) IN ('paid', 'advance_paid', 'partial_paid', 'partiel', 'fully_paid')
      `, [req.params.id]);
      res.json(bookings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/residences/:id/reviews", async (req, res) => {
    try {
      const reviews = await queries.getReviewsByResidenceId(req.params.id);
      res.json(reviews);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/bookings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = 'bk_' + Math.random().toString(36).substr(2, 9);
      const { residenceId, ownerId, checkIn, checkOut, guests, totalPrice, advancePaid, transactionId } = req.body;
      
      if (!residenceId || !ownerId || !checkIn || !checkOut || !totalPrice) {
        return res.status(400).json({ error: "Données de réservation incomplètes" });
      }

      // Check for overlapping bookings
      // An overlap occurs if: (new_check_in <= existing_check_out) AND (existing_check_in <= new_check_out)
      // Only paid bookings (at least deposit) block the dates.
      const overlaps = await executeSql(`
        SELECT id, check_in, check_out FROM bookings 
        WHERE residence_id = ? 
        AND LOWER(booking_status) NOT IN ('cancelled', 'declined', 'annulee', 'annulé', 'refusee', 'refusé', 'expired', 'canceled')
        AND LOWER(payment_status) IN ('paid', 'advance_paid', 'partial_paid', 'partiel')
        AND (check_in <= ? AND ? <= check_out)
      `, [residenceId, checkOut, checkIn]);

      if (overlaps.length > 0) {
        return res.status(400).json({ 
          error: "Ces dates sont déjà réservées pour cette résidence.",
          overlaps: overlaps.map((o: any) => ({ from: o.check_in, to: o.check_out }))
        });
      }

      await executeSql(`
        INSERT INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, transaction_id, booking_status, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `, [id, residenceId, req.user?.uid, ownerId, checkIn, checkOut, guests || 1, totalPrice, advancePaid || 0, transactionId || null]);
      
      res.json({ success: true, id });
    } catch (err: any) {
      console.error("[API Bookings] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/bookings/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const bookingId = req.params.id;
      const oldBookingArr = await executeSql("SELECT * FROM bookings WHERE id = ?", [bookingId]);
      if (oldBookingArr.length === 0) {
        return res.status(404).json({ error: "Réservation introuvable" });
      }
      const oldBooking = oldBookingArr[0];

      // Extract details
      const bStatus = oldBooking.booking_status || oldBooking.bookingStatus;
      const bPaymentStatus = oldBooking.payment_status || oldBooking.paymentStatus;
      const bClientId = oldBooking.client_id || oldBooking.clientId;
      const bOwnerId = oldBooking.owner_id || oldBooking.ownerId;
      const bResidenceId = oldBooking.residence_id || oldBooking.residenceId;
      const bRefundStatus = oldBooking.refund_status || oldBooking.refundStatus;
      const bRefundAmount = Number(oldBooking.refund_amount || oldBooking.refundAmount || 0);
      const bRefundPhone = oldBooking.refund_phone || oldBooking.refundPhone || '';
      const bRefundProvider = oldBooking.refund_provider || oldBooking.refundProvider || '';

      // Get residence title
      let residenceTitle = "Résidence";
      try {
        const resArr = await executeSql("SELECT title FROM residences WHERE id = ?", [bResidenceId]);
        if (resArr.length > 0) {
          residenceTitle = resArr[0].title;
        }
      } catch (e) {}

      // Get global settings (for refundMode)
      let refundMode = 'manual';
      try {
        const results = await executeSql("SELECT value FROM settings WHERE `key` = 'global'");
        if (results && results.length > 0) {
          const s = JSON.parse(results[0].value);
          if (s?.refundMode) refundMode = s.refundMode;
        }
      } catch (e) {}

      // A. If booking status is transitioning to cancelled
      const isCancelling = (req.body.bookingStatus === 'cancelled' || req.body.booking_status === 'cancelled') && bStatus !== 'cancelled';
      if (isCancelling) {
        // If it was ongoing, mark it as completed/finished instantly
        if (oldBooking.stay_status === 'ongoing' || oldBooking.stayStatus === 'ongoing') {
          req.body.stayStatus = 'completed';
          req.body.stay_status = 'completed';
          req.body.checkedOutAt = new Date().toISOString();
          req.body.checked_out_at = new Date().toISOString();
        }

        const refundAmt = Number(req.body.refundAmount || req.body.refund_amount || 0);
        const refPhone = req.body.refundPhone || req.body.refund_phone || '';
        const refProvider = req.body.refundProvider || req.body.refund_provider || '';

        let isAutoRefunded = false;
        let payoutError: string | null = null;

        if (refundAmt > 0 && refPhone) {
          if (refundMode === 'auto') {
            // Attempt automatic payout via SapPay
            const payoutResult = await performSappayPayout(refundAmt, refPhone, refProvider);
            if (payoutResult.success) {
              req.body.refundStatus = 'refunded';
              req.body.refund_status = 'refunded';
              req.body.refundProcessedAt = new Date().toISOString();
              req.body.refund_processed_at = new Date().toISOString();
              req.body.transactionId = payoutResult.transactionId;
              req.body.transaction_id = payoutResult.transactionId;
              isAutoRefunded = true;
            } else {
              payoutError = payoutResult.error || 'Échec de transaction';
              // If auto payout fails, mark status as failed and notify everyone of the failed payout
              req.body.refundStatus = 'failed';
              req.body.refund_status = 'failed';
              req.body.refundReason = payoutError;
              req.body.refund_reason = payoutError;
            }
          } else {
            // Manual mode: status is pending
            req.body.refundStatus = 'pending';
            req.body.refund_status = 'pending';
          }
        }

        // Notify Traveler
        const clientNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
        let clientMsg = '';
        if (refundAmt > 0) {
          if (refundMode === 'auto') {
            if (isAutoRefunded) {
              clientMsg = `Votre séjour chez "${residenceTitle}" a été annulé. Un remboursement automatique de ${refundAmt} F CFA a été effectué vers votre compte Mobile Money ${refPhone} via SapPay (TxID: ${req.body.transactionId}).`;
            } else {
              clientMsg = `Votre séjour chez "${residenceTitle}" a été annulé. Une tentative de remboursement automatique de ${refundAmt} F CFA a échoué (Erreur: ${payoutError}). L'administration a été notifiée et procèdera à un traitement manuel prochainement.`;
            }
          } else {
            clientMsg = `Votre demande d'annulation pour "${residenceTitle}" est enregistrée. Un remboursement de ${refundAmt} F CFA est en attente d'approbation par l'administration et sera traité prochainement.`;
          }
        } else {
          clientMsg = `Votre réservation pour "${residenceTitle}" a été annulée de manière immédiate (aucun paiement n'avait été effectué).`;
        }
        
        await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [clientNotifId, bClientId, "Annulation de Séjour ❌", clientMsg, "booking", bookingId]);

        // Notify Host
        const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
        let hostMsg = '';
        if (refundAmt > 0) {
          if (refundMode === 'auto') {
            if (isAutoRefunded) {
              hostMsg = `Le voyageur a annulé sa réservation pour "${residenceTitle}". Un remboursement de ${refundAmt} F CFA a été effectué automatiquement et avec succès via SapPay.`;
            } else {
              hostMsg = `Le voyageur a annulé sa réservation pour "${residenceTitle}". Le remboursement automatique de ${refundAmt} F CFA a échoué (Erreur: ${payoutError}). L'administration va gérer la situation.`;
            }
          } else {
            hostMsg = `Le voyageur a annulé sa réservation pour "${residenceTitle}". Un remboursement de ${refundAmt} F CFA est en cours de validation manuelle par l'administration.`;
          }
        } else {
          hostMsg = `Le voyageur a annulé sa réservation pour "${residenceTitle}" (aucun paiement n'avait été effectué).`;
        }
        
        await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [hostNotifId, bOwnerId, "Annulation Voyageur ❌", hostMsg, "booking", bookingId]);

        // Notify all Admin users
        try {
          const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin'");
          for (const admin of admins) {
            const adminNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            let adminMsg = '';
            if (refundAmt > 0) {
              if (refundMode === 'auto') {
                if (isAutoRefunded) {
                  adminMsg = `[Auto] Réservation ${bookingId} annulée par le client. Remboursement automatique de ${refundAmt} F CFA payé avec succès via SapPay.`;
                } else {
                  adminMsg = `[ECHEC AUTO ⚠️] Réservation ${bookingId} annulée. Remboursement automatique de ${refundAmt} F CFA vers ${refPhone} a ÉCHOUÉ (Erreur: ${payoutError}). Action manuelle ou relance requise.`;
                }
              } else {
                adminMsg = `[Manuel] Réservation ${bookingId} annulée par le client. Remboursement de ${refundAmt} F CFA vers ${refPhone} en attente de votre approbation.`;
              }
            } else {
              adminMsg = `Réservation ${bookingId} annulée par le client (Aucun paiement à rembourser).`;
            }
            
            await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [adminNotifId, admin.uid, "Notification de Remboursement 💰", adminMsg, "booking", bookingId]);
          }
        } catch (adminErr) {
          console.error("Error notifying admins:", adminErr);
        }
      }

      // B. If admin is approving a refund (from 'pending' or 'failed')
      const isApproval = (req.body.refundStatus === 'refunded' || req.body.refund_status === 'refunded') && 
                         (bRefundStatus === 'pending' || bRefundStatus === 'failed');
                         
      if (isApproval) {
        const forceManual = req.body.forceManual === true;
        const triggerPayout = req.body.triggerPayout === true;
        delete req.body.forceManual;
        delete req.body.triggerPayout;
        delete req.body.force_manual;
        delete req.body.trigger_payout;
        
        // Decide whether to run payout:
        // Run payout only if explicitly requested, or if mode is auto and not forced to manual
        const runPayout = triggerPayout || (refundMode === 'auto' && !forceManual);
        
        if (runPayout && bRefundAmount > 0 && bRefundPhone) {
          // Trigger/Retry payout via SapPay
          const payoutResult = await performSappayPayout(bRefundAmount, bRefundPhone, bRefundProvider);
          if (payoutResult.success) {
            req.body.refundStatus = 'refunded';
            req.body.refund_status = 'refunded';
            req.body.refundProcessedAt = new Date().toISOString();
            req.body.refund_processed_at = new Date().toISOString();
            req.body.transactionId = payoutResult.transactionId;
            req.body.transaction_id = payoutResult.transactionId;
            
            // Notify traveler of successful automatic payout approval
            const clientNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [clientNotifId, bClientId, "Remboursement Effectué ⚡", `Votre remboursement de ${bRefundAmount} F CFA pour le séjour chez "${residenceTitle}" a été effectué avec succès par virement automatique SapPay vers votre numéro ${bRefundPhone} (TxID: ${payoutResult.transactionId}).`, "booking", bookingId]);

            // Notify host
            const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [hostNotifId, bOwnerId, "Remboursement Finalisé 💰", `Le remboursement de ${bRefundAmount} F CFA lié au séjour chez "${residenceTitle}" a été effectué avec succès via virement automatique SapPay.`, "booking", bookingId]);
          } else {
            // Payout failed! Mark status as failed and notify everyone
            req.body.refundStatus = 'failed';
            req.body.refund_status = 'failed';
            req.body.refundReason = payoutResult.error || "Erreur de virement SapPay";
            req.body.refund_reason = payoutResult.error || "Erreur de virement SapPay";
            
            // Notify stakeholders of failure
            const clientNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [clientNotifId, bClientId, "Échec du Remboursement ⚠️", `La tentative de virement automatique pour votre remboursement de ${bRefundAmount} F CFA chez "${residenceTitle}" a échoué (Erreur: ${payoutResult.error}). L'administration a été alertée pour procéder à une autre solution.`, "booking", bookingId]);

            const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [hostNotifId, bOwnerId, "Échec Remboursement ⚠️", `Le virement de remboursement automatique pour le séjour chez "${residenceTitle}" a échoué. L'administration va régulariser cela.`, "booking", bookingId]);

            await queries.updateBookingStatus(bookingId, req.body);
            return res.status(500).json({ error: `Échec du virement automatique SapPay : ${payoutResult.error || 'Erreur API'}` });
          }
        } else {
          // Manual approval (offline/cash/car/etc.)
          req.body.refundStatus = 'refunded';
          req.body.refund_status = 'refunded';
          req.body.refundProcessedAt = new Date().toISOString();
          req.body.refund_processed_at = new Date().toISOString();
          req.body.transactionId = req.body.transactionId || 'MANUEL_HORS_PLATEFORME';
          req.body.transaction_id = req.body.transactionId || 'MANUEL_HORS_PLATEFORME';

          // Notify traveler of manual approval success
          const clientNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
          await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [clientNotifId, bClientId, "Remboursement Effectué ✅", `Votre remboursement de ${bRefundAmount} F CFA pour le séjour chez "${residenceTitle}" a été approuvé par l'administration et effectué avec succès (par cash ou autre moyen hors-plateforme).`, "booking", bookingId]);

          // Notify host
          const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
          await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [hostNotifId, bOwnerId, "Remboursement Finalisé 💰", `Le remboursement de ${bRefundAmount} F CFA lié au séjour chez "${residenceTitle}" a été marqué comme effectué par l'administration (par cash ou autre moyen hors-plateforme).`, "booking", bookingId]);
        }
      }

      // C. If admin is rejecting a refund (from 'pending' or 'failed')
      const isRejection = (req.body.refundStatus === 'rejected' || req.body.refund_status === 'rejected') && 
                          (bRefundStatus === 'pending' || bRefundStatus === 'failed');
                          
      if (isRejection) {
        const rejectReason = req.body.refundReason || req.body.refund_reason || "Aucun motif spécifié";
        req.body.refundReason = rejectReason;
        req.body.refund_reason = rejectReason;
        
        // Notify traveler of rejection with the reason
        const clientNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
        await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [clientNotifId, bClientId, "Remboursement Rejeté ❌", `Votre demande de remboursement de ${bRefundAmount} F CFA pour le séjour chez "${residenceTitle}" a été rejetée par l'administration. Motif : ${rejectReason}`, "booking", bookingId]);

        // Notify host
        const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
        await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [hostNotifId, bOwnerId, "Remboursement Rejeté ❌", `La demande de remboursement de ${bRefundAmount} F CFA pour le séjour chez "${residenceTitle}" a été rejetée par l'administration. Motif : ${rejectReason}`, "booking", bookingId]);
      }

      // D. Automatic Conflict Resolution after payment
      const isPaying = (req.body.paymentStatus === 'paid' || req.body.paymentStatus === 'fully_paid' || req.body.paymentStatus === 'advance_paid' || 
                        req.body.payment_status === 'paid' || req.body.payment_status === 'fully_paid' || req.body.payment_status === 'advance_paid') && 
                       (bPaymentStatus !== 'paid' && bPaymentStatus !== 'fully_paid' && bPaymentStatus !== 'advance_paid');

      if (isPaying) {
          const checkIn = oldBooking.check_in || oldBooking.checkIn;
          const checkOut = oldBooking.check_out || oldBooking.checkOut;
          
          const conflicts = await executeSql(`
            SELECT id, client_id as clientId FROM bookings
            WHERE residence_id = ? 
            AND id != ?
            AND LOWER(booking_status) NOT IN ('cancelled', 'declined', 'annulee', 'annulé', 'refusee', 'refusé', 'expired', 'canceled')
            AND (
              (check_in >= ? AND check_in < ?) OR
              (check_out > ? AND check_out <= ?) OR
              (check_in <= ? AND check_out >= ?)
            )
          `, [bResidenceId, bookingId, checkIn, checkOut, checkIn, checkOut, checkIn, checkOut]);

          for (const conflict of conflicts) {
              const cId = conflict.id;
              const cClientId = conflict.clientId || conflict.client_id;
              
              await queries.updateBookingStatus(cId, {
                  bookingStatus: 'declined',
                  cancellationReason: "Quelqu'un a réservé les mêmes dates et a payé son acompte à votre place."
              });

              const notifId = 'not_' + Math.random().toString(36).substr(2, 9);
              await executeSql("INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
                [notifId, cClientId, "Réservation Rejetée ⚠️", `Votre réservation pour "${residenceTitle}" a été rejetée car un autre client a payé son acompte pour les mêmes dates avant vous.`, "booking", cId]);
          }
      }

      // E. Prevent check-in if not paid
      const isCheckingIn = (req.body.stayStatus === 'ongoing' || req.body.stay_status === 'ongoing') && 
                           (oldBooking.stay_status !== 'ongoing');
      
      if (isCheckingIn) {
          const currentPaymentStatus = req.body.paymentStatus || req.body.payment_status || oldBooking.payment_status || oldBooking.paymentStatus;
          const statusStr = String(currentPaymentStatus || '').toLowerCase();
          if (statusStr !== 'paid' && statusStr !== 'fully_paid' && statusStr !== 'advance_paid') {
              return res.status(400).json({ error: "Le séjour ne peut pas débuter tant que l'acompte n'est pas payé." });
          }
      }

      await queries.updateBookingStatus(bookingId, req.body);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[PATCH Booking] Error:", err.message);
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

  app.put("/api/conversations/:id/read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || '';
      await executeSql("UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?", [req.params.id, uid]);
      res.json({ success: true });
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

  app.post("/api/users/public", async (req, res) => {
    try {
      const uids: string[] = req.body.uids || [];
      if (!uids || uids.length === 0) {
        return res.json({});
      }
      const placeholders = uids.map(() => '?').join(',');
      const users = await executeSql(
        `SELECT uid, display_name as displayName, photo_url as photoUrl FROM users WHERE uid IN (${placeholders})`,
        uids
      );
      
      const result: Record<string, any> = {};
      for (const u of users) {
        result[u.uid] = u;
      }
      res.json(result);
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

  app.get("/api/users/:uid", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userProfile = await queries.getUserProfile(req.params.uid);
      if (!userProfile) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      res.json(userProfile);
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

  app.post("/api/users/:uid/accept-terms", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.uid !== req.params.uid) {
        return res.status(403).json({ error: "Non autorisé" });
      }
      await executeSql("UPDATE users SET has_accepted_terms = 1 WHERE uid = ?", [req.params.uid]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Favorites ---
  app.get("/api/users/:uid/favorites", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.uid !== req.params.uid) {
        return res.status(403).json({ error: "Non autorisé" });
      }
      const rows = await executeSql(
        "SELECT residence_id FROM favorites WHERE user_id = ?",
        [req.params.uid]
      );
      res.json(rows.map((r: any) => r.residence_id));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/users/:uid/favorites/:residenceId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.uid !== req.params.uid) {
        return res.status(403).json({ error: "Non autorisé" });
      }
      await executeSql(
        "INSERT IGNORE INTO favorites (user_id, residence_id) VALUES (?, ?)",
        [req.params.uid, req.params.residenceId]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/users/:uid/favorites/:residenceId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.uid !== req.params.uid) {
        return res.status(403).json({ error: "Non autorisé" });
      }
      await executeSql(
        "DELETE FROM favorites WHERE user_id = ? AND residence_id = ?",
        [req.params.uid, req.params.residenceId]
      );
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
      const { id, label, description, is_active, isActive } = req.body;
      const activeValue = isActive !== undefined ? isActive : is_active;
      await executeSql(
        "INSERT INTO verification_types (id, label, description, is_active) VALUES (?, ?, ?, ?)",
        [id || 'vt_' + Math.random().toString(36).substr(2, 9), label, description, activeValue !== false ? 1 : 0]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/verification-types/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Interdit" });
      const { label, description, is_active, isActive } = req.body;
      const activeValue = isActive !== undefined ? isActive : is_active;
      await executeSql(
        "UPDATE verification_types SET label = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [label, description, activeValue !== false ? 1 : 0, req.params.id]
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
      if (!verificationId) {
        return res.status(400).json({ error: "verificationId est requis" });
      }

      const currentStatus = booking.verificationsStatus ? (typeof booking.verificationsStatus === 'string' ? JSON.parse(booking.verificationsStatus) : booking.verificationsStatus) : {};
      
      if (currentStatus[verificationId] === true && status === false) {
        return res.status(403).json({ error: "Cette vérification est déjà validée et ne peut pas être modifiée." });
      }

      currentStatus[verificationId] = status;

      await executeSql(
        "UPDATE bookings SET verifications_status = ? WHERE id = ?",
        [JSON.stringify(currentStatus), req.params.id]
      );

      res.json({ success: true, status: currentStatus });
    } catch (err: any) {
      console.error("[VERIFICATION ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/users/:uid", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Réservé aux administrateurs" });
      }
      
      const uid = req.params.uid;
      
      // Thorough cleanup of related records to avoid foreign key constraint errors
      // Use a transaction-like approach by disabling FK checks temporarily if needed, 
      // but manual cleanup is safer for data integrity.
      
      try {
        await executeSql("SET FOREIGN_KEY_CHECKS = 0");
        
        // 1. Social & Communication
        await executeSql("DELETE FROM support_chat_messages WHERE user_id = ? OR sender_id = ?", [uid, uid]);
        await executeSql("DELETE FROM messages WHERE sender_id = ?", [uid]);
        await executeSql("DELETE FROM notifications WHERE user_id = ?", [uid]);
        await executeSql("DELETE FROM favorites WHERE user_id = ?", [uid]);
        
        // 2. Reviews (usually cascade, but let's be explicit)
        await executeSql("DELETE FROM reviews WHERE client_id = ?", [uid]);
        
        // 3. Residences related (amenities and images should cascade from residence delete)
        // Find all residences owned by this user
        const userResidences = await executeSql("SELECT id FROM residences WHERE owner_id = ?", [uid]);
        for (const res of userResidences) {
          await executeSql("DELETE FROM residence_amenities WHERE residence_id = ?", [res.id]);
          await executeSql("DELETE FROM residence_images WHERE residence_id = ?", [res.id]);
          await executeSql("DELETE FROM reviews WHERE residence_id = ?", [res.id]);
          await executeSql("DELETE FROM residences WHERE id = ?", [res.id]);
        }
        
        // 4. Bookings (SET NULL usually, but let's delete if user is the client to be clean)
        await executeSql("DELETE FROM bookings WHERE client_id = ?", [uid]);
        await executeSql("UPDATE bookings SET owner_id = NULL WHERE owner_id = ?", [uid]);
        
        // 5. Withdrawals - set to null if they exist
        await executeSql("UPDATE withdrawals SET owner_id = NULL WHERE owner_id = ?", [uid]);
        
        // 6. Finally delete the user
        await queries.deleteUser(uid);
        
        await executeSql("SET FOREIGN_KEY_CHECKS = 1");
        res.json({ success: true });
      } catch (innerErr: any) {
        await executeSql("SET FOREIGN_KEY_CHECKS = 1");
        throw innerErr;
      }
    } catch (err: any) {
      console.error("[DELETE USER ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Support Chat ---
  app.get("/api/support/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const showAll = req.query.all === 'true' && req.user?.role === 'admin';
      
      if (showAll) {
        const rows = await executeSql("SELECT * FROM support_chat_messages ORDER BY created_at ASC");
        res.json(rows);
      } else {
        const rows = await executeSql("SELECT * FROM support_chat_messages WHERE user_id = ? ORDER BY created_at ASC", [req.user?.uid]);
        res.json(rows);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/support/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = 'msg_' + Math.random().toString(36).substr(2, 9);
      // user_id is the recipient/owner of the chat. If admin sends from admin panel, they pass user_id. 
      // If admin tests from client widget, user_id is missing, so fallback to their own uid.
      let userId = req.user?.uid;
      let senderId = req.user?.uid;
      
      if (req.user?.role === 'admin') {
        if (req.body.user_id) {
          userId = req.body.user_id;
          senderId = 'admin';
        }
      }
      
      await executeSql(
        "INSERT INTO support_chat_messages (id, user_id, sender_id, message) VALUES (?, ?, ?, ?)",
        [id, userId, senderId, req.body.message]
      );
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/support/messages/read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { user_id } = req.body || {};
      if (req.user?.role === 'admin' && user_id) {
        await executeSql("UPDATE support_chat_messages SET is_read = 1 WHERE user_id = ? AND sender_id != 'admin'", [user_id]);
      } else {
        await executeSql("UPDATE support_chat_messages SET is_read = 1 WHERE user_id = ? AND sender_id != ?", [req.user?.uid, req.user?.uid]);
      }
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

  // --- Mobile App Version & APK Public Endpoint ---
  app.get("/api/app-version", async (req, res) => {
    try {
      const settings = await queries.getSettings('mobile_app');
      res.json({
        androidMinVersion: settings.androidMinVersion || '1.0.0',
        androidLatestVersion: settings.androidLatestVersion || '1.0.0',
        androidApkUrl: settings.androidApkUrl || 'https://www.resifaso.net/downloads/resifaso.apk',
        iosMinVersion: settings.iosMinVersion || '1.0.0',
        iosLatestVersion: settings.iosLatestVersion || '1.0.0',
        iosAppStoreUrl: settings.iosAppStoreUrl || 'https://apps.apple.com/app/resifaso',
        forceUpdate: !!settings.forceUpdate,
        updateMessage: settings.updateMessage || "Une nouvelle version de l'application ResiFaso est disponible. Veuillez mettre à jour votre application.",
        mobileMaintenance: !!settings.mobileMaintenance,
        mobileMaintenanceMessage: settings.mobileMaintenanceMessage || "L'application mobile est actuellement en maintenance programmée. Merci de repasser plus tard.",
        packageName: settings.packageName || "com.resifaso.app",
        updatedAt: settings.updatedAt || new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/upload-apk", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Réservé aux administrateurs" });
      }
      const { apkUrl, version, notes } = req.body;
      const currentSettings = await queries.getSettings('mobile_app');
      const updated = {
        ...currentSettings,
        androidApkUrl: apkUrl || currentSettings.androidApkUrl || 'https://www.resifaso.net/downloads/resifaso.apk',
        androidLatestVersion: version || currentSettings.androidLatestVersion || '1.0.0',
        releaseNotes: notes || currentSettings.releaseNotes || 'Nouvelle version publiée',
        updatedAt: new Date().toISOString()
      };
      await queries.saveSettings('mobile_app', updated);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Ads ---
  app.get("/api/promotions", async (req, res) => {
    try {
      const ads = await queries.getAllAds();
      res.json(ads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/promotions", authenticateToken, async (req: AuthRequest, res) => {
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
      
      const dbType = DB_TYPE;
      if (dbType === 'mariadb') {
        const nonIdFields = fields.filter(f => f !== 'id');
        const updateClause = nonIdFields.map(f => `${f} = VALUES(${f})`).join(', ');
        await executeSql(`INSERT INTO advertisements (${fields.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`, vals);
      } else {
        const nonIdFields = fields.filter(f => f !== 'id');
        const sqliteUpdate = nonIdFields.map(f => `${f} = ?`).join(', ');
        const nonIdVals = vals.filter((_, idx) => fields[idx] !== 'id');
        await executeSql(`INSERT INTO advertisements (${fields.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${sqliteUpdate}`, [...vals, ...nonIdVals]);
      }
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/promotions/:id", authenticateToken, async (req: AuthRequest, res) => {
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
      
      const dbType = DB_TYPE;
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
      const ownerId = req.user?.uid;
      const ownerName = (req.user as any)?.displayName || 'Hôte ResiFaso';
      const amountNum = parseFloat(amount);

      // Get global settings (for withdrawalMode)
      let withdrawalMode = 'manual';
      try {
        const results = await executeSql("SELECT value FROM settings WHERE `key` = 'global'");
        if (results && results.length > 0) {
          const s = JSON.parse(results[0].value);
          if (s?.withdrawalMode) withdrawalMode = s.withdrawalMode;
        }
      } catch (errSettings) {
        console.warn("Error loading global settings for withdrawalMode:", errSettings);
      }

      if (withdrawalMode === 'auto') {
        console.log(`[Auto Withdraw] Triggering automatic payout via SapPay for withdrawal request ${id} (Amount: ${amountNum})`);
        const payoutResult = await performSappayPayout(amountNum, phone, provider);

        if (payoutResult.success) {
          // Success
          await executeSql(
            "INSERT INTO withdrawals (id, owner_id, amount, phone, provider, status, approved_at, transaction_id) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)",
            [id, ownerId, amountNum, phone, provider, new Date().toISOString().replace('T', ' ').substring(0, 19), payoutResult.transactionId]
          );

          // Notify traveler / host
          const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
          await executeSql(
            "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [
              hostNotifId,
              ownerId,
              "Retrait Effectué ⚡",
              `Votre retrait de ${amountNum} F CFA via ${provider.toUpperCase()} a été traité automatiquement avec succès (TxID SapPay: ${payoutResult.transactionId}).`,
              "payment",
              id
            ]
          );

          // Notify admins
          try {
            const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
            for (const admin of admins) {
              const adminNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
              await executeSql(
                "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  adminNotifId,
                  admin.uid,
                  "Retrait Automatique Réussi ⚡",
                  `Un virement automatique de ${amountNum} F CFA pour l'hôte ${ownerName} a été payé avec succès via SapPay.`,
                  "payment",
                  id
                ]
              );
            }
          } catch (adminErr) {
            console.error("Error notifying admins:", adminErr);
          }

          return res.json({ success: true, id, status: 'approved', transactionId: payoutResult.transactionId });
        } else {
          // Payout failed
          await executeSql(
            "INSERT INTO withdrawals (id, owner_id, amount, phone, provider, status, rejection_reason) VALUES (?, ?, ?, ?, ?, 'failed', ?)",
            [id, ownerId, amountNum, phone, provider, payoutResult.error || "Erreur API SapPay"]
          );

          // Notify host of failure
          const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
          await executeSql(
            "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [
              hostNotifId,
              ownerId,
              "Échec du Retrait ⚠️",
              `La tentative de virement automatique pour votre retrait de ${amountNum} F CFA chez ResiFaso a échoué (Erreur: ${payoutResult.error || 'Erreur API'}). L'administration a été alertée pour procéder à une régularisation manuelle.`,
              "payment",
              id
            ]
          );

          // Notify admins of failure
          try {
            const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
            for (const admin of admins) {
              const adminNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
              await executeSql(
                "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  adminNotifId,
                  admin.uid,
                  "Échec Retrait Automatique ⚠️",
                  `Le virement automatique de ${amountNum} F CFA pour l'hôte ${ownerName} a échoué (Erreur: ${payoutResult.error}). Une action manuelle est requise.`,
                  "payment",
                  id
                ]
              );
            }
          } catch (adminErr) {
            console.error("Error notifying admins:", adminErr);
          }

          return res.json({ success: false, id, status: 'failed', error: payoutResult.error });
        }
      } else {
        // Manual Mode (default)
        await executeSql(
          "INSERT INTO withdrawals (id, owner_id, amount, phone, provider, status) VALUES (?, ?, ?, ?, ?, 'pending')",
          [id, ownerId, amountNum, phone, provider]
        );

        // Notify host
        const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [
            hostNotifId,
            ownerId,
            "Demande de Retrait Enregistrée ! 💸",
            `Votre demande de retrait de ${amountNum} F CFA via ${provider.toUpperCase()} a été enregistrée. Elle est en attente de validation manuelle par l'administrateur.`,
            "payment",
            id
          ]
        );

        // Notify admins
        try {
          const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
          for (const admin of admins) {
            const adminNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [
                adminNotifId,
                admin.uid,
                "Nouvelle Demande de Retrait 📥",
                `L'hôte ${ownerName} a demandé un retrait de ${amountNum} F CFA via ${provider.toUpperCase()}`,
                "payment",
                id
              ]
            );
          }
        } catch (adminErr) {
          console.error("Error notifying admins:", adminErr);
        }

        return res.json({ success: true, id, status: 'pending' });
      }
    } catch (err: any) {
      console.error("Error creating withdrawal request:", err);
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
        } else if (key === 'transactionId') {
          body['transaction_id'] = formatSqlValue(value);
        } else if (key === 'rejectionReason') {
          body['rejection_reason'] = formatSqlValue(value);
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

  app.post("/api/withdrawals/:id/payout", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      
      const { id } = req.params;
      
      // Fetch the withdrawal request
      const withdrawals = await executeSql("SELECT * FROM withdrawals WHERE id = ?", [id]);
      if (!withdrawals || withdrawals.length === 0) {
        return res.status(404).json({ error: "Demande de retrait introuvable" });
      }
      
      const withd = withdrawals[0];
      const amount = parseFloat(withd.amount);
      const phone = withd.phone;
      const provider = withd.provider;
      const ownerId = withd.owner_id || withd.ownerId;
      
      // Fetch user's name
      let ownerName = "Hôte ResiFaso";
      const userRows = await executeSql("SELECT display_name FROM users WHERE uid = ?", [ownerId]);
      if (userRows && userRows.length > 0) {
        ownerName = userRows[0].display_name || "Hôte ResiFaso";
      }

      console.log(`[Admin Payout Trigger] Initiating manual/retry payout via SapPay for withdrawal request ${id} (Amount: ${amount})`);
      const payoutResult = await performSappayPayout(amount, phone, provider);
      
      if (payoutResult.success) {
        // Success
        await executeSql(
          "UPDATE withdrawals SET status = 'approved', approved_at = ?, transaction_id = ?, rejection_reason = NULL WHERE id = ?",
          [new Date().toISOString().replace('T', ' ').substring(0, 19), payoutResult.transactionId, id]
        );
        
        // Notify host
        const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [
            hostNotifId,
            ownerId,
            "Retrait Validé & Payé ! ⚡",
            `Votre demande de retrait de ${amount} F CFA via ${provider.toUpperCase()} a été payée automatiquement avec succès via SapPay. (ID de transaction: ${payoutResult.transactionId})`,
            "payment",
            id
          ]
        );
        
        // Notify admins
        try {
          const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
          for (const admin of admins) {
            const adminNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [
                adminNotifId,
                admin.uid,
                "Retrait Automatique Exécuté (Admin) ⚡",
                `Le virement SapPay de ${amount} F CFA pour l'hôte ${ownerName} a été effectué avec succès.`,
                "payment",
                id
              ]
            );
          }
        } catch (adminErr) {
          console.error("Error notifying admins:", adminErr);
        }
        
        return res.json({ success: true, transactionId: payoutResult.transactionId });
      } else {
        // Failed
        await executeSql(
          "UPDATE withdrawals SET status = 'failed', rejection_reason = ? WHERE id = ?",
          [payoutResult.error || "Erreur de virement SapPay", id]
        );
        
        // Notify host
        const hostNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
        await executeSql(
          "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
          [
            hostNotifId,
            ownerId,
            "Échec du Virement de Retrait ⚠️",
            `Le virement automatique pour votre retrait de ${amount} F CFA via ${provider.toUpperCase()} a échoué (Erreur: ${payoutResult.error || 'Erreur API'}). L'administration procédera à une vérification manuelle.`,
            "payment",
            id
          ]
        );
        
        // Notify admins
        try {
          const admins = await executeSql("SELECT uid FROM users WHERE role = 'admin' OR email = 'mandemohamed68@gmail.com'");
          for (const admin of admins) {
            const adminNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [
                adminNotifId,
                admin.uid,
                "Échec Virement Retrait ⚠️",
                `Le virement automatique de ${amount} F CFA pour l'hôte ${ownerName} a échoué (Erreur: ${payoutResult.error}).`,
                "payment",
                id
              ]
            );
          }
        } catch (adminErr) {
          console.error("Error notifying admins:", adminErr);
        }
        
        return res.status(500).json({ error: `Échec du virement automatique SapPay : ${payoutResult.error || 'Erreur API'}` });
      }
    } catch (err: any) {
      console.error("Error in trigger payout:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Notifications ---
  app.get("/api/user-alerts", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.query;
      const targetId = (userId as string) || req.user?.uid || '';
      const notifications = await queries.getNotifications(targetId);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user-alerts", authenticateToken, async (req: AuthRequest, res) => {
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

  // Register device token for FCM Push Notifications
  app.post("/api/user-alerts/register-token", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { token, deviceType } = req.body;
      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }
      const success = await registerDeviceToken(req.user!.uid, token, deviceType);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Unregister device token
  app.post("/api/user-alerts/unregister-token", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }
      const success = await unregisterDeviceToken(token);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send a test FCM push notification
  app.post("/api/user-alerts/test-push", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { title, body } = req.body;
      const success = await sendPushNotification(
        req.user!.uid,
        title || "🔔 Test de Notification ResiFaso",
        body || "Félicitations, vos notifications instantanées sont configurées avec succès !"
      );
      res.json({ success, message: success ? "Notification de test envoyée avec succès !" : "Aucun appareil enregistré trouvé pour cet utilisateur." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user-alerts/:id/read", authenticateToken, async (req, res) => {
    try {
      await executeSql("UPDATE notifications SET is_read = 1 WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user-alerts/read-all", authenticateToken, async (req: AuthRequest, res) => {
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
  app.post(["/api/payment/sappay/init", "/api/payments/sappay/init"], async (req, res) => {
    const { amount, note, email, bookingId } = req.body;
    try {
      const urls = await getSappayBaseUrls();
      const token = await getSappayToken();

      const webhookUrl = bookingId 
        ? `https://resifaso.net/api/payment/sappay/webhook?booking_id=${bookingId}`
        : `https://resifaso.net/api/payment/sappay/webhook`;

      const payload = {
        type: "SIMPLE",
        customer: {
          email: email || "client@resifaso.com",
          country: 1
        },
        amount: parseFloat(amount).toFixed(2),
        note: note || "Validation acompte Residence MEUBLE",
        callback_url: webhookUrl,
        webhook_url: webhookUrl,
        redirect_url: webhookUrl,
        return_url: webhookUrl
      };

      const targetUrl = urls.publicBase.replace(/\/$/, '') + '/invoice/';
      console.log(`[Sappay Init] Requesting: ${targetUrl} | Amount: ${amount}`);
      
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Sappay Init] Error ${response.status}:`, text);
        throw new Error(`Erreur Sappay création facture (${response.status}): ${text}`);
      }

      const data = await response.json();
      const invoiceId = findInvoiceId(data);
      if (!invoiceId) throw new Error("Impossible de récupérer l'ID de facture.");

      res.json({ invoice_id: invoiceId, access_token: token });
    } catch (error: any) {
      console.error("Erreur /api/payment/sappay/init :", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- SAPPAY – GET OTP (avec gestion des opérateurs PULL) ----------
  app.post(["/api/payment/sappay/get-otp", "/api/payments/sappay/get-otp"], async (req, res) => {
    const { customer_msisdn, invoice_id, payment_processor_id, access_token } = req.body;

    // Opérateurs PULL-OTP (l'OTP est généré manuellement par l'utilisateur via USSD)
    const PULL_OPERATORS = [PROCESSOR_ORANGE, PROCESSOR_TELECEL];

    if (PULL_OPERATORS.includes(payment_processor_id)) {
      // Pas d'appel à Sappay, on renvoie une réponse pour que le frontend continue
      return res.json({
        trans_id: `manual_otp_${Date.now()}`,
        message: "Veuillez générer votre code OTP via USSD et le saisir pour valider le paiement."
      });
    }

    // Pour Moov et Coris (PUSH-OTP), on appelle Sappay
    try {
      const urls = await getSappayBaseUrls();
      const token = (access_token && access_token !== "mock") ? access_token : (await getSappayToken());

      const targetUrl = urls.checkoutBase.replace(/\/$/, '') + '/get-otp/';
      console.log(`[Sappay OTP] Requesting: ${targetUrl} | Invoice: ${invoice_id}`);
      
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
          invoice_id,
          payment_processor_id
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Sappay OTP] Error ${response.status}:`, text);
        throw new Error(`Erreur Sappay get-otp (${response.status}): ${text}`);
      }

      const data = await response.json();
      res.json({
        trans_id: data.trans_id || data.transaction_id || `txn_${Date.now()}`,
        message: data.message || "OTP envoyé par SMS."
      });
    } catch (error: any) {
      console.error("Erreur /api/payment/sappay/get-otp :", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- SAPPAY – PERFORM ----------
  app.post(["/api/payment/sappay/perform", "/api/payments/sappay/perform"], async (req, res) => {
    const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token, amount, email } = req.body;
    try {
      const urls = await getSappayBaseUrls();
      const token = (access_token && access_token !== "mock") ? access_token : (await getSappayToken());

      const payload: any = {
        invoice_id,
        payment_processor_id,
        customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
        otp: otp ? otp.toString() : "",
        email: email || "client@resifaso.com",
        amount: amount ? Math.round(parseFloat(amount)).toString() : undefined
      };
      if (trans_id) payload.trans_id = trans_id;

      const targetUrl = urls.checkoutBase.replace(/\/$/, '') + '/perform/';
      console.log(`[Sappay Perform] Requesting: ${targetUrl} | Invoice: ${invoice_id} | OTP: ${otp}`);
      
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      if (!response.ok) {
        console.error(`[Sappay Perform] Error ${response.status}:`, responseText);
        let detail = responseText;
        try { 
          const err = JSON.parse(responseText); 
          detail = err.message || err.error || err.details || detail; 
        } catch (e) {}
        return res.status(response.status).json({ error: "Erreur Sappay perform", details: detail });
      }

      const data = JSON.parse(responseText);
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Erreur /api/payment/sappay/perform :", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- SAPPAY – WEBHOOK / CALLBACK ----------
  app.all(["/api/payment/sappay/webhook", "/api/payment/sappay/callback", "/api/payments/sappay/webhook"], async (req, res) => {
    console.log("[Sappay Webhook] Notification reçue :", JSON.stringify(req.body || req.query));
    
    try {
      const query = req.query || {};
      const body = req.body || {};
      
      const bookingId = query.booking_id || body.booking_id || query.id || body.id || body.invoice_id || query.invoice_id;
      
      // Look for SUCCESS status indicators
      const status = body.status || body.response?.status || query.status || (body.success === true ? 'SUCCESS' : null);
      
      if (bookingId) {
        console.log(`[Sappay Webhook] Identifiant trouvé : ${bookingId}. Statut : ${status}`);
        
        // Let's see if this booking exists in the database
        const bookings = await executeSql("SELECT * FROM bookings WHERE id = ? OR transaction_id = ?", [bookingId, bookingId]);
        if (bookings && bookings.length > 0) {
          const booking = bookings[0];
          const actualBookingId = booking.id;
          const oldPaymentStatus = booking.payment_status || booking.paymentStatus || '';
          
          if (oldPaymentStatus !== 'paid' && oldPaymentStatus !== 'fully_paid') {
            const nextPaymentStatus = oldPaymentStatus === 'advance_paid' ? 'fully_paid' : 'advance_paid';
            
            await queries.updateBookingStatus(actualBookingId, { 
              paymentStatus: nextPaymentStatus,
              bookingStatus: 'confirmed'
            });
            
            console.log(`[Sappay Webhook] Réservation ${actualBookingId} mise à jour avec succès : paymentStatus = ${nextPaymentStatus}, bookingStatus = confirmed`);
            
            // Create user notification
            const notifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [notifId, booking.client_id || booking.clientId, "Paiement Confirmé ! ✅", `Votre paiement pour la réservation ${actualBookingId} a été validé avec succès par Sappay.`, "payment", actualBookingId]
            );
            
            // Create owner notification
            const ownerNotifId = 'not_' + Math.random().toString(36).substr(2, 9);
            await executeSql(
              "INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
              [ownerNotifId, booking.owner_id || booking.ownerId, "Nouveau Paiement Reçu 💰", `Un acompte/paiement a été reçu via Sappay pour la réservation ${actualBookingId}.`, "payment", actualBookingId]
            );
          } else {
            console.log(`[Sappay Webhook] La réservation ${actualBookingId} est déjà marquée comme payée/soldée (${oldPaymentStatus}).`);
          }
        } else {
          console.log(`[Sappay Webhook] Aucune réservation trouvée dans la base de données pour l'identifiant ${bookingId}.`);
        }
      }
    } catch (err: any) {
      console.error("[Sappay Webhook] Erreur lors du traitement :", err.message);
    }
    
    // Réponse 200 OK exigée par Sappay pour valider la réception du callback
    return res.status(200).json({ status: "SUCCESS", message: "Callback bien reçu" });
  });


  // ---------- AVIS (REVIEWS) – version SQL ----------
  app.post("/api/submit-review", authenticateToken, async (req: AuthRequest, res) => {
    const { bookingId, residenceId, rating, comment } = req.body;
    if (!bookingId || !residenceId || !rating) {
      return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
      // Ensure the logged-in user exists in the users table to prevent Foreign Key failure
      if (req.user?.uid) {
        const userExists = await executeSql("SELECT uid FROM users WHERE uid = ?", [req.user.uid]);
        if (userExists.length === 0) {
          await executeSql(
            "INSERT INTO users (uid, email, role, display_name) VALUES (?, ?, ?, ?)",
            [req.user.uid, req.user.email || 'voyageur@resifaso.com', req.user.role || 'client', 'Voyageur']
          );
          console.log(`[Review] Auto-created missing user record for ${req.user.uid} to satisfy foreign key constraint.`);
        }
      }

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
      const avg = Number(rows[0]?.avgRating || 0);
      const count = Number(rows[0]?.count || 0);
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

  // --- Upload ---
  app.post("/api/upload", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.body.image) return res.status(400).json({ error: "Image requise" });
      // Here you would normally upload to S3, Cloud Storage, or similar.
      // Since we need to keep it simple and the user didn't specify,
      // we'll return the provided base64 string as the URL.
      // In a real production app, this must be replaced with proper storage.
      const imageUrl = req.body.image; 
      res.json({ url: imageUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Partners ---

  app.get("/api/partners", async (req, res) => {
    try {
      const partners = await executeSql("SELECT id, name, logo_url as logoUrl, is_active as isActive, website_url as websiteUrl FROM partners ORDER BY created_at DESC");
      res.json(partners);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/partners", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      const { id, name, logoUrl, websiteUrl } = req.body;
      await executeSql("INSERT INTO partners (id, name, logo_url, website_url, is_active) VALUES (?, ?, ?, ?, 1)", [id, name, logoUrl, websiteUrl || null]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/partners/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      const { name, logoUrl, isActive, websiteUrl } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = formatSqlValue(name);
      if (logoUrl !== undefined) updates.logo_url = formatSqlValue(logoUrl);
      if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;
      if (websiteUrl !== undefined) updates.website_url = formatSqlValue(websiteUrl);

      const fields = Object.keys(updates);
      if (fields.length === 0) return res.json({ success: true });

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      await executeSql(`UPDATE partners SET ${setClause} WHERE id = ?`, [...Object.values(updates), req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/partners/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: "Non autorisé" });
      await executeSql("DELETE FROM partners WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------- FORGOT PASSWORD AND RESET PASSWORD ----------
  app.post("/api/auth/forgot-password", async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis" });
    email = email.trim().toLowerCase();
    
    try {
      const users = await executeSql("SELECT uid FROM users WHERE email = ?", [email]);
      if (users.length === 0) return res.status(404).json({ error: "Email inconnu" });
      
      // Generate a 6-digit random code for testing/resetting
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now
      const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS
      
      // Save code in database
      await executeSql("DELETE FROM password_resets WHERE email = ?", [email]);
      await executeSql("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)", [email, token, expiresAtStr]);
      
      console.log(`[PASSWORD RESET] Code generated for ${email}: ${token}`);

      let emailSent = false;
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          await transporter.sendMail({
            from: process.env.SMTP_FROM || `"ResiFaso" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "ResiFaso - Code de réinitialisation de votre mot de passe",
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #dc2626; margin-top: 0;">ResiFaso</h2>
                <p>Bonjour,</p>
                <p>Voici votre code de réinitialisation de mot de passe :</p>
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #0f172a;">${token}</span>
                </div>
                <p style="font-size: 13px; color: #64748b;">Ce code est valable pendant 1 heure.</p>
                <p style="font-size: 13px; color: #64748b;">Si vous n'avez pas demandé de réinitialisation, veuillez ignorer cet email.</p>
              </div>
            `
          });
          emailSent = true;
          console.log(`[PASSWORD RESET] Email sent successfully to ${email}`);
        } catch (mailErr) {
          console.error(`[PASSWORD RESET] SMTP Error:`, mailErr);
        }
      }
      
      res.json({ 
        success: true, 
        message: emailSent ? "Un email avec votre code de réinitialisation a été envoyé." : "Un code de réinitialisation a été généré.",
        code: token, // Returned for testing / preview UI ease
        emailSent,
        email
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    let { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Tous les champs sont requis (Email, Code, Nouveau mot de passe)" });
    }
    email = email.trim().toLowerCase();
    code = code.trim();
    
    try {
      // Find the code
      const resets = await executeSql("SELECT * FROM password_resets WHERE email = ? AND token = ?", [email, code]);
      if (resets.length === 0) {
        return res.status(400).json({ error: "Code de réinitialisation invalide ou email incorrect" });
      }
      
      const reset = resets[0];
      // Check expiry
      const expiresAt = new Date(reset.expiresAt || reset.expires_at);
      if (expiresAt.getTime() < Date.now()) {
        await executeSql("DELETE FROM password_resets WHERE email = ?", [email]);
        return res.status(400).json({ error: "Ce code de réinitialisation a expiré. Veuillez en demander un nouveau." });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      await executeSql("UPDATE users SET password_hash = ? WHERE email = ?", [hashedPassword, email]);
      
      // Clean up token
      await executeSql("DELETE FROM password_resets WHERE email = ?", [email]);
      
      console.log(`[PASSWORD RESET] Password successfully updated for ${email}`);
      res.json({ success: true, message: "Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 404 for undefined API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

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
