import 'dotenv/config';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import { pool, poolReady } from "./src/lib/db-server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";

dotenv.config();

export let userPasswordColumn = "password";

// Safe detection of __dirname and __filename for both CJS and ESM
const currentFilename = typeof __filename !== "undefined" 
  ? __filename 
  : (typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "");

const currentDirname = typeof __dirname !== "undefined" 
  ? __dirname 
  : (currentFilename ? path.dirname(currentFilename) : process.cwd());

const SAPPAY_BASE_PUBLIC_SANDBOX = "https://sandbox.sappay.net/api/v1";
const SAPPAY_BASE_CHECKOUT_SANDBOX = "https://sandbox.sappay.net/api/v1/checkout";

const SAPPAY_BASE_PUBLIC_PROD = "https://api.prod.sappay.net/api/public";
const SAPPAY_BASE_CHECKOUT_PROD = "https://api.prod.sappay.net/api/checkout";

// Dynamically fetch administrator-configured Sappay credentials
async function getSappayCredentials() {
  try {
    // Dans la base MariaDB, on pourrait stocker ces paramètres de façon globale
    // Mais pour l'instant, on fallback vers process.env pour un fonctionnement robuste sans Firebase
    return {
      clientId: process.env.SAPPAY_CLIENT_ID || "IJIJhhArSLVJNIs2ylGwowxTCqm5t5br92lAPlgF",
      clientSecret: process.env.SAPPAY_CLIENT_SECRET || "7qrVeDjSmDQjHksFyzKriidK3iuSo3RK6h5voHnbXAAPZvQEQnF9LIPzjqOcg4POqmikuUoJ7ynI565leEzbFhSnKZynwCLVOChma3y7vesLBRwaoyixtLcknd4g6Rdm",
      username: process.env.SAPPAY_USERNAME || "mandemohamed68@gmail.com",
      password: process.env.SAPPAY_PASSWORD || "mm@27071986@",
      isTestMode: false
    };
  } catch (e: any) {
    console.warn("Sappay: Error reading configuration:", e.message);
  }
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
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true
    }
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    console.log("🟢 Live Socket client connected:", socket.id);
    
    socket.on("join", (userId) => {
      socket.join(`user:${userId}`);
      console.log(`👤 Client joined channel user:${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Live Socket client disconnected:", socket.id);
    });
  });

  const PORT = Number(process.env.PORT) || 3000;

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

  app.use(express.json());

  // --- WORKFLOW AUDIT LOGGING SYSTEM ---
  async function logWorkflowAction(level: string, category: string, userEmail: string | null, userRole: string | null, message: string, details: any = null, durationMs: number = 0) {
    try {
      let detailsStr = "";
      if (details) {
        if (typeof details === "object") {
          try {
            detailsStr = JSON.stringify(details);
          } catch (e) {
            detailsStr = String(details);
          }
        } else {
          detailsStr = String(details);
        }
      }
      await pool.execute(
        "INSERT INTO system_logs (level, category, user_email, user_role, message, details, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [level, category, userEmail || "anonymous", userRole || "guest", message, detailsStr, durationMs]
      );
    } catch (err: any) {
      console.error("Failed to write to system_logs:", err.message);
    }
  }

  // Pre-emptive Auth Decoder Middleware for request logging
  app.use((req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");
        if (decoded) {
          req.userEmail = decoded.email;
          req.userRole = decoded.role;
          req.userId = decoded.uid;
        }
      }
    } catch (e) {
      // Quiet fallback
    }
    next();
  });

  // Global HTTP Request Logger
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith("/api/admin/system-logs")) {
      return next();
    }

    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const level = status >= 400 ? "ERROR" : (status >= 300 ? "WARN" : "SUCCESS");
      
      let category = "API_REQUEST";
      if (req.path.startsWith("/api/auth")) category = "AUTHENTIFICATION";
      else if (req.path.startsWith("/api/bookings")) category = "RÉSERVATION";
      else if (req.path.startsWith("/api/owner")) category = "COMPTE_PROPRIÉTAIRE";
      else if (req.path.startsWith("/api/withdrawals")) category = "RETRAITS";
      else if (req.path.startsWith("/api/ads")) category = "PUBLICITÉ";

      const userEmail = req.userEmail || null;
      const userRole = req.userRole || null;

      let bodyDetails = "";
      if (req.body && Object.keys(req.body).length > 0) {
        const clonedBody = { ...req.body };
        if (clonedBody.password) clonedBody.password = "[MASQUÉ]";
        if (clonedBody.adminPassword) clonedBody.adminPassword = "[MASQUÉ]";
        try {
          bodyDetails = JSON.stringify(clonedBody);
        } catch (e) {
          bodyDetails = "[Données non-sérialisables]";
        }
      } else if (Object.keys(req.query || {}).length > 0) {
        bodyDetails = `Query Params: ${JSON.stringify(req.query)}`;
      }

      const methodEmoji = req.method === "GET" ? "📥" : req.method === "POST" ? "📤" : req.method === "PUT" ? "🔄" : "❌";
      const message = `${methodEmoji} ${req.method} ${req.path} -> Statut ${status}`;

      logWorkflowAction(
        level,
        category,
        userEmail,
        userRole,
        message,
        bodyDetails || null,
        duration
      );
    });

    next();
  });

  // --- DB TABLES INITIALIZATION ---
  (async () => {
    try {
      await poolReady;
      await pool.execute(`CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'client',
        phone_number VARCHAR(50),
        photo_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_suspended BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await pool.execute(`CREATE TABLE IF NOT EXISTS residences (
        id VARCHAR(255) PRIMARY KEY,
        owner_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50),
        price_per_night DECIMAL(10, 2),
        advance_percentage INT,
        cleaning_fee DECIMAL(10, 2),
        service_fee DECIMAL(10, 2),
        city VARCHAR(100),
        neighborhood VARCHAR(100),
        street VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        availability_status VARCHAR(50) DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        promoted BOOLEAN DEFAULT FALSE
      )`);

      await pool.execute(`CREATE TABLE IF NOT EXISTS residence_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        residence_id VARCHAR(255),
        image_url TEXT,
        FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )`);

      await pool.execute(`CREATE TABLE IF NOT EXISTS residence_amenities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        residence_id VARCHAR(255),
        amenity VARCHAR(100),
        FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE
      )`);

      await pool.execute(`CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        residence_id VARCHAR(255),
        client_id VARCHAR(255),
        check_in DATE,
        check_out DATE,
        guests INT,
        total_price DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'pending',
        booking_status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await pool.execute(`CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255),
        residence_id VARCHAR(255),
        client_id VARCHAR(255),
        rating INT,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await pool.execute(`CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50) PRIMARY KEY,
        data JSON
      )`);

      await pool.execute(`CREATE TABLE IF NOT EXISTS ads (
        id VARCHAR(255) PRIMARY KEY,
        image_url TEXT,
        title VARCHAR(255),
        description TEXT,
        link_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        frequency_seconds INT DEFAULT 10,
        start_at TIMESTAMP NULL,
        end_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await (pool as any).execute(`CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(255) PRIMARY KEY,
        owner_id VARCHAR(255),
        owner_name VARCHAR(255),
        amount DECIMAL(10, 2),
        provider VARCHAR(50),
        phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP NULL
      )`);

      await (pool as any).execute(`CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(20) DEFAULT 'INFO',
        category VARCHAR(50) DEFAULT 'SYSTEM',
        user_email VARCHAR(255) NULL,
        user_role VARCHAR(50) NULL,
        message TEXT,
        details TEXT DEFAULT NULL,
        duration_ms INT DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await (pool as any).execute(`CREATE TABLE IF NOT EXISTS reservations (
        id VARCHAR(128) PRIMARY KEY,
        residence_id VARCHAR(128) NOT NULL,
        client_id VARCHAR(128) NOT NULL,
        owner_id VARCHAR(128) NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        guests INT DEFAULT 1,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      // Ensure super admin exists with id 'usr_admin_default' and email 'mandemohamed68@gmail.com'
      const [adminExistsRows]: any = await (pool as any).execute("SELECT * FROM users WHERE email = ?", ["mandemohamed68@gmail.com"]);
      if (adminExistsRows.length === 0) {
        const pwdHash = await bcrypt.hash("mm@27071986@", 10);
        await (pool as any).execute(
          `INSERT INTO users (id, email, password, display_name, role) VALUES (?, ?, ?, ?, ?)`,
          ["usr_admin_default", "mandemohamed68@gmail.com", pwdHash, "Super Administrateur", "admin"]
        );
        console.log("Seeded default Super Admin user successfully.");
      } else {
        const existing = adminExistsRows[0];
        if (existing.role !== 'admin' || existing.id !== 'usr_admin_default') {
          await (pool as any).execute("UPDATE users SET id = 'usr_admin_default', role = 'admin' WHERE email = ?", ["mandemohamed68@gmail.com"]);
          console.log("Adjusted existing Super Admin identity and role.");
        }
      }

      // Ensure default settings exist in settings table
      try {
        const [settingsRows]: any = await (pool as any).execute("SELECT * FROM settings WHERE id = ?", ["global"]);
        if (settingsRows.length === 0) {
          const defaultSettings = {
            platformName: "ResiFaso",
            commissionRate: 10,
            isTestMode: false,
            enablePhoneCalls: true,
            enableWhatsApp: true
          };
          await (pool as any).execute(
            "INSERT INTO settings (id, data) VALUES (?, ?)",
            ["global", JSON.stringify(defaultSettings)]
          );
          console.log("Seeded default global settings successfully.");
        }
      } catch (settingsSeedErr: any) {
        console.warn("⚠️ Error seeding default settings:", settingsSeedErr.message);
      }

      // Ensure default ads exist in ads table
      try {
        const [adsRows]: any = await (pool as any).execute("SELECT * FROM ads");
        if (adsRows.length === 0) {
          await (pool as any).execute(
            `INSERT INTO ads (id, image_url, title, description, link_url, is_active, frequency_seconds) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              "ad_default_1",
              "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
              "Réservez vos vacances avec ResiFaso",
              "Découvrez de magnifiques résidences et villas de standing à travers tout le Burkina au meilleur prix.",
              "https://resifaso.com",
              1,
              10
            ]
          );
          console.log("Seeded default advertisement successfully.");
        }
      } catch (adsSeedErr: any) {
        console.warn("⚠️ Error seeding default ads:", adsSeedErr.message);
      }

      // Ensure default residences exist in residences table
      try {
        const [resRows]: any = await (pool as any).execute("SELECT * FROM residences");
        if (resRows.length === 0) {
          const defaultResidences = [
            {
              id: "res_1",
              owner_id: "usr_admin_default",
              title: "Villa de Luxe Somptueuse",
              description: "Magnifique villa calme et sécurisée située dans un quartier résidentiel huppé de Ouagadougou. Dispose de tout le confort moderne réclamé. Idéal pour séjours court et moyen terme.",
              type: "villa",
              price_per_night: 45000,
              advance_percentage: 20,
              cleaning_fee: 5000,
              service_fee: 2500,
              city: "Ouagadougou",
              neighborhood: "Ouaga 2000",
              street: "Avenue Mouammar Kadhafi",
              status: "published",
              availability_status: "available",
              images: [
                "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80"
              ],
              amenities: ["Piscine", "Wi-Fi", "Climatisation", "Sécurité 24/7", "Cuisine équipée"]
            },
            {
              id: "res_2",
              owner_id: "usr_admin_default",
              title: "Bel Appartement Meublé de Standing",
              description: "Appartement moderne, élégamment décoré pour vos séjours professionnels ou en famille. Gardiennage 24/7 et climatisation intégrale.",
              type: "appartement",
              price_per_night: 25000,
              advance_percentage: 15,
              cleaning_fee: 3000,
              service_fee: 1500,
              city: "Ouagadougou",
              neighborhood: "Koulouba",
              street: "Rue de l'Aéroport",
              status: "published",
              availability_status: "available",
              images: [
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
              ],
              amenities: ["Wi-Fi", "Climatisation", "Sécurité 24/7", "Cuisine équipée"]
            },
            {
              id: "res_3",
              owner_id: "usr_admin_default",
              title: "Studio Confortable Zone Industrielle",
              description: "Studio parfait pour voyageurs d'affaires au centre de Bobo-Dioulasso. Proche de toutes commodités, autonome et équipé.",
              type: "studio",
              price_per_night: 15000,
              advance_percentage: 10,
              cleaning_fee: 2000,
              service_fee: 1000,
              city: "Bobo-Dioulasso",
              neighborhood: "Tounouma",
              street: "Avenue de la Nation",
              status: "published",
              availability_status: "available",
              images: [
                "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80"
              ],
              amenities: ["Wi-Fi", "Climatisation", "Cuisine équipée"]
            }
          ];

          for (const res of defaultResidences) {
            await (pool as any).execute(
              `INSERT INTO residences (id, owner_id, title, description, type, price_per_night, advance_percentage, cleaning_fee, service_fee, city, neighborhood, street, status, availability_status) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                res.id, res.owner_id, res.title, res.description, res.type,
                res.price_per_night, res.advance_percentage, res.cleaning_fee, res.service_fee,
                res.city, res.neighborhood, res.street, res.status, res.availability_status
              ]
            );

            for (const img of res.images) {
              await (pool as any).execute(
                "INSERT INTO residence_images (residence_id, image_url) VALUES (?, ?)",
                [res.id, img]
              );
            }

            for (const amen of res.amenities) {
              await (pool as any).execute(
                "INSERT INTO residence_amenities (residence_id, amenity) VALUES (?, ?)",
                [res.id, amen]
              );
            }
          }
          console.log("Seeded default residences, images, and amenities successfully.");
        }
      } catch (resSeedErr: any) {
        console.warn("⚠️ Error seeding default residences:", resSeedErr.message);
      }

      // Safely ensure users password and phone_number columns exist
      try {
        await (pool as any).execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT ''");
      } catch (e) {
        try {
          await (pool as any).execute("ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT ''");
        } catch (err) {}
      }
      try {
        await (pool as any).execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50) NULL");
      } catch (e) {
        try {
          await (pool as any).execute("ALTER TABLE users ADD COLUMN phone_number VARCHAR(50) NULL");
        } catch (err) {}
      }

      // Safely ensure residences has residence_id
      try {
        const [resCols]: any = await (pool as any).execute("SHOW COLUMNS FROM residences");
        const resColNames = resCols.map((c: any) => c.Field.toLowerCase());
        if (!resColNames.includes("residence_id")) {
          // Add residence_id column as auto-increment and make sure it has an index
          await (pool as any).execute("ALTER TABLE residences ADD COLUMN residence_id INT AUTO_INCREMENT, ADD KEY (residence_id)");
          console.log("✅ Added residence_id column to residences.");
        }
      } catch (err: any) {
        console.warn("⚠️ Error modifying residences table structure:", err.message);
      }

      // Update all residences to be owned by super admin as requested
      await (pool as any).execute("UPDATE residences SET owner_id = 'usr_admin_default'");
      console.log("✅ All residences have been assigned to super admin 'usr_admin_default'.");

      console.log("✅ MariaDB tables checked/created successfully.");
    } catch (err) {
      console.error("❌ Error initializing MariaDB tables:", err);
    }
  })();

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

  // --- AUTONOME MARIADB API ROUTES ---

  // Auth: Register
  app.post("/api/auth/register", async (req: any, res: any) => {
    try {
      const { email, password, displayName, role } = req.body;
      const [rows]: any = await (pool as any).execute("SELECT * FROM users WHERE email = ?", [email]);
      if (rows.length > 0) return res.status(400).json({ error: "Email already exists" });
      
      const pwdHash = await bcrypt.hash(password, 10);
      const uid = "u_" + Math.random().toString(36).substr(2, 9);
      const userRole = role || 'client';
      
      await (pool as any).execute(
        `INSERT INTO users (id, email, ${userPasswordColumn}, display_name, role) VALUES (?, ?, ?, ?, ?)`,
        [uid, email, pwdHash, displayName, userRole]
      );
      const token = jwt.sign({ uid, email, role: userRole }, process.env.JWT_SECRET || "resifaso_secret", { expiresIn: "7d" });
      res.json({ token, user: { uid, email, displayName, role: userRole } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [rows]: any = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
      if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const user = rows[0];
      const storedHash = user[userPasswordColumn] || user.password_hash || user.password;
      const isValid = storedHash ? await bcrypt.compare(password, storedHash) : true;
      if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign({ uid: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "resifaso_secret", { expiresIn: "7d" });
      res.json({ token, user: { uid: user.id, email: user.email, displayName: user.display_name, role: user.role } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Auth: Me
  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });
    try {
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");
      const [rows]: any = await pool.execute("SELECT * FROM users WHERE id = ?", [decoded.uid]);
      if (rows.length === 0) return res.status(404).json({ error: "User not found" });
      const user = rows[0];
      res.json({ user: { uid: user.id, email: user.email, displayName: user.display_name, role: user.role } });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Residences: Get all
  app.get("/api/residences", async (req, res) => {
    try {
      const [rows]: any = await pool.execute("SELECT * FROM residences WHERE status = 'published'");
      const residences = await Promise.all(rows.map(async (row: any) => {
        const [images]: any = await pool.execute("SELECT image_url FROM residence_images WHERE residence_id = ?", [row.id]);
        const [amenities]: any = await pool.execute("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [row.id]).catch(() => [[]]);
        return {
          id: row.id,
          ownerId: row.owner_id || "unknown",
          title: row.title,
          description: row.description || "",
          type: row.type || "appartement",
          pricePerNight: Number(row.price_per_night) || 0,
          advancePercentage: Number(row.advance_percentage) || 0,
          cleaningFee: Number(row.cleaning_fee) || 0,
          serviceFee: Number(row.service_fee) || 0,
          address: {
            city: row.city || "",
            neighborhood: row.neighborhood || "",
            street: row.street || "",
            coordinates: {
              lat: 12.371428,
              lng: -1.519662
            }
          },
          amenities: Array.isArray(amenities) ? amenities.map((a: any) => a.amenity) : [],
          images: Array.isArray(images) ? images.map((i: any) => i.image_url) : [],
          location: row.city + (row.neighborhood ? ", " + row.neighborhood : ""),
          rating: 4.5,
          reviewCount: 3,
          status: row.status || "published",
          availabilityStatus: row.availability_status || "available"
        };
      }));
      res.json({ residences });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bookings: Create
  // Residences: Get Owner Residences
  app.get("/api/owner/residences", async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");
      
      const [rows]: any = await pool.execute("SELECT * FROM residences WHERE owner_id = ?", [decoded.uid]);
      const residences = await Promise.all(rows.map(async (row: any) => {
        const [images]: any = await pool.execute("SELECT image_url FROM residence_images WHERE residence_id = ?", [row.id]);
        const [amenities]: any = await pool.execute("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [row.id]).catch(() => [[]]);
        return {
          id: row.id,
          ownerId: row.owner_id,
          title: row.title,
          description: row.description,
          type: row.type,
          pricePerNight: Number(row.price_per_night),
          advancePercentage: Number(row.advance_percentage),
          cleaningFee: Number(row.cleaning_fee),
          serviceFee: Number(row.service_fee),
          address: {
            city: row.city,
            neighborhood: row.neighborhood,
            street: row.street,
            coordinates: { lat: 12.371428, lng: -1.519662 }
          },
          amenities: amenities.map((a: any) => a.amenity),
          images: images.map((i: any) => i.image_url),
          status: row.status,
          availabilityStatus: row.availability_status
        };
      }));
      res.json({ residences });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Residences: Add new
  app.post("/api/owner/residences", async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");

      const resData = req.body;
      const rId = "r_" + Math.random().toString(36).substr(2, 9);
      
      await pool.execute(
        `INSERT INTO residences (id, owner_id, title, description, type, price_per_night, advance_percentage, cleaning_fee, service_fee, city, neighborhood, street, status, availability_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rId, decoded.uid, resData.title, resData.description, resData.type, 
          resData.pricePerNight, resData.advancePercentage, resData.cleaningFee, resData.serviceFee,
          resData.address?.city, resData.address?.neighborhood, resData.address?.street,
          'pending', 'available'
        ]
      );

      if (resData.images && resData.images.length > 0) {
        for (const img of resData.images) {
          await pool.execute("INSERT INTO residence_images (residence_id, image_url) VALUES (?, ?)", [rId, img]);
        }
      }

      if (resData.amenities && resData.amenities.length > 0) {
        for (const am of resData.amenities) {
          await pool.execute("INSERT INTO residence_amenities (residence_id, amenity) VALUES (?, ?)", [rId, am]);
        }
      }

      res.json({ success: true, id: rId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Residences: Update
  app.put("/api/owner/residences/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const resData = req.body;
      
      await pool.execute(
        `UPDATE residences SET title=?, description=?, type=?, price_per_night=?, advance_percentage=?, cleaning_fee=?, service_fee=?, city=?, neighborhood=?, street=?, availability_status=? WHERE id=?`,
        [
          resData.title, resData.description, resData.type, resData.pricePerNight, 
          resData.advancePercentage, resData.cleaningFee, resData.serviceFee,
          resData.address?.city, resData.address?.neighborhood, resData.address?.street,
          resData.availabilityStatus, id
        ]
      );

      // Simple image/amenity sync: delete all and re-add
      await pool.execute("DELETE FROM residence_images WHERE residence_id = ?", [id]);
      if (resData.images && resData.images.length > 0) {
        for (const img of resData.images) {
          await pool.execute("INSERT INTO residence_images (residence_id, image_url) VALUES (?, ?)", [id, img]);
        }
      }

      await pool.execute("DELETE FROM residence_amenities WHERE residence_id = ?", [id]);
      if (resData.amenities && resData.amenities.length > 0) {
        for (const am of resData.amenities) {
          await pool.execute("INSERT INTO residence_amenities (residence_id, amenity) VALUES (?, ?)", [id, am]);
        }
      }

      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Residences: Delete
  app.delete("/api/owner/residences/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.execute("DELETE FROM residences WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Bookings: Update Status
  app.patch("/api/bookings/:id/status", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await pool.execute("UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ADMIN API ---

  // Admin middleware (optional but good)
  const isAdmin = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });
    try {
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");
      if (decoded.role !== 'admin') {
        // En tant que mesure de sécurité souple pour le dév, on peut aussi checker l'email
        if (decoded.email !== 'mandemohamed68@gmail.com') {
           return res.status(403).json({ error: "Admin access required" });
        }
      }
      req.admin = decoded;
      next();
    } catch (e) { res.status(401).json({ error: "Invalid token" }); }
  };

  // Admin: Get Real-time workflow system logs
  app.get("/api/admin/system-logs", isAdmin, async (req: any, res: any) => {
    try {
      const [rows]: any = await pool.execute("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 300");
      const logs = rows.map((r: any) => {
        let detailsObj = null;
        if (r.details) {
          try {
            detailsObj = JSON.parse(r.details);
          } catch (e) {
            detailsObj = r.details;
          }
        }
        return {
          id: r.id,
          timestamp: r.timestamp,
          level: r.level || "INFO",
          category: r.category || "SYSTEM",
          user_email: r.user_email || "anonymous",
          user_role: r.user_role || "guest",
          message: r.message,
          details: detailsObj,
          duration_ms: r.duration_ms || 0
        };
      });
      res.json({ logs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Purge system logs
  app.delete("/api/admin/system-logs", isAdmin, async (req: any, res: any) => {
    try {
      await pool.execute("DELETE FROM system_logs");
      res.json({ success: true, message: "Workflow activity logs purged" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Get All Users
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const [rows]: any = await pool.execute("SELECT id as uid, email, display_name as displayName, role, phone_number as phoneNumber, photo_url as photoUrl, is_verified as isVerified, is_suspended as isSuspended, created_at as createdAt FROM users");
      res.json({ users: rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Update User
  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const fields = Object.keys(updates).map(k => `${k === 'displayName' ? 'display_name' : k === 'isVerified' ? 'is_verified' : k === 'isSuspended' ? 'is_suspended' : k}=?`).join(", ");
      const values = Object.values(updates);
      await (pool as any).execute(`UPDATE users SET ${fields} WHERE id=?`, [...values, id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Delete User
  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await (pool as any).execute("DELETE FROM users WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Get All Residences
  app.get("/api/admin/residences", isAdmin, async (req, res) => {
    try {
      const [rows]: any = await (pool as any).execute("SELECT * FROM residences");
      const residences = await Promise.all(rows.map(async (row: any) => {
        const [images]: any = await (pool as any).execute("SELECT image_url FROM residence_images WHERE residence_id = ?", [row.id]);
        const [amenities]: any = await (pool as any).execute("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [row.id]).catch(() => [[]]);
        return {
          id: row.id,
          ownerId: row.owner_id,
          title: row.title,
          description: row.description,
          type: row.type,
          pricePerNight: Number(row.price_per_night),
          address: { city: row.city, neighborhood: row.neighborhood, street: row.street },
          amenities: amenities.map((a: any) => a.amenity),
          images: images.map((i: any) => i.image_url),
          status: row.status,
          promoted: !!row.promoted,
          availabilityStatus: row.availability_status
        };
      }));
      res.json({ residences });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Update Residence Status/Promoted
  app.patch("/api/admin/residences/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, promoted } = req.body;
      if (status !== undefined) await (pool as any).execute("UPDATE residences SET status = ? WHERE id = ?", [status, id]);
      if (promoted !== undefined) await (pool as any).execute("UPDATE residences SET promoted = ? WHERE id = ?", [promoted ? 1 : 0, id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Get Settings
  app.get("/api/admin/settings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [rows]: any = await (pool as any).execute("SELECT data FROM settings WHERE id = ?", [id]);
      if (rows.length > 0) {
        let settingsData = rows[0].data;
        if (typeof settingsData === "string") {
          try {
            settingsData = JSON.parse(settingsData);
          } catch (e) {
            // Keep as string if it is not valid JSON
          }
        }
        res.json(settingsData);
      } else {
        res.json({});
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Save Settings
  app.post("/api/admin/settings/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await (pool as any).execute("INSERT INTO settings (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?", [id, JSON.stringify(data), JSON.stringify(data)]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Ads
  app.get("/api/admin/ads", async (req, res) => {
    try {
      const [rows]: any = await (pool as any).execute("SELECT * FROM ads ORDER BY created_at DESC");
      res.json({ ads: rows.map((r: any) => ({
        id: r.id,
        imageUrl: r.image_url,
        title: r.title,
        description: r.description,
        linkUrl: r.link_url,
        isActive: !!r.is_active,
        frequencySeconds: r.frequency_seconds,
        startAt: r.start_at,
        endAt: r.end_at,
        createdAt: r.created_at
      })) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/ads", isAdmin, async (req, res) => {
    try {
      const ad = req.body;
      const id = ad.id || "ad_" + Date.now();
      await pool.execute(
        `INSERT INTO ads (id, image_url, title, description, link_url, is_active, frequency_seconds, start_at, end_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE image_url=?, title=?, description=?, link_url=?, is_active=?, frequency_seconds=?, start_at=?, end_at=?`,
        [
          id, ad.imageUrl, ad.title, ad.description, ad.linkUrl, ad.isActive ? 1 : 0, ad.frequencySeconds, ad.startAt || null, ad.endAt || null,
          ad.imageUrl, ad.title, ad.description, ad.linkUrl, ad.isActive ? 1 : 0, ad.frequencySeconds, ad.startAt || null, ad.endAt || null
        ]
      );
      res.json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Withdrawals
  app.get("/api/admin/withdrawals", isAdmin, async (req, res) => {
    try {
      const [rows]: any = await pool.execute("SELECT * FROM withdrawals ORDER BY created_at DESC");
      res.json({ withdrawals: rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/admin/withdrawals/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvedAt } = req.body;
      await pool.execute("UPDATE withdrawals SET status = ?, approved_at = ? WHERE id = ?", [status, approvedAt || null, id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // RESERVATIONS & BOOKINGS ENDPOINTS
  app.post("/api/reservations", async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");
      const clientId = decoded.uid;

      const { residenceId, checkIn, checkOut, guests, totalPrice } = req.body;

      // Get owner_id from residence
      const [resRows]: any = await pool.execute("SELECT owner_id, price_per_night FROM residences WHERE id = ?", [residenceId]);
      if (resRows.length === 0) {
        return res.status(404).json({ error: "Résidence introuvable." });
      }
      const ownerId = resRows[0].owner_id;

      // Overlap Check (status IN ('pending', 'confirmed'))
      const [overlapRows]: any = await pool.execute(
        "SELECT * FROM reservations WHERE residence_id = ? AND status IN ('pending', 'confirmed') AND NOT (check_out <= ? OR check_in >= ?)",
        [residenceId, new Date(checkIn), new Date(checkOut)]
      );

      if (overlapRows.length > 0) {
        return res.status(400).json({ error: "Désolé, cette résidence est déjà occupée ou réservée sur ces dates." });
      }

      const rId = "res_" + Math.random().toString(36).substr(2, 9);
      const finalPrice = totalPrice || (resRows[0].price_per_night * (Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) || 1));

      // Insert to reservations table
      await pool.execute(
        "INSERT INTO reservations (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')",
        [rId, residenceId, clientId, ownerId, new Date(checkIn), new Date(checkOut), guests || 1, finalPrice]
      );

      // Also insert to bookings table (for perfect compatibility with legacy watchers)
      await pool.execute(
        "INSERT INTO bookings (id, residence_id, client_id, check_in, check_out, guests, total_price, status, booking_status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'pending')",
        [rId, residenceId, clientId, new Date(checkIn), new Date(checkOut), guests || 1, finalPrice]
      );

      // Emit Event via Socket.io
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${ownerId}`).emit("reservation:new", {
          id: rId,
          residenceId,
          clientId,
          ownerId,
          checkIn,
          checkOut,
          guests,
          totalPrice: finalPrice,
          status: 'pending'
        });
      }

      res.json({ success: true, bookingId: rId, reservationId: rId });
    } catch (e: any) {
      console.error("Error creating reservation:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/reservations/client", async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");
      const clientId = decoded.uid;

      const [rows]: any = await pool.execute(
        `SELECT r.*, res.title as residenceTitle, res.city, res.neighborhood, res.owner_id 
         FROM reservations r 
         JOIN residences res ON r.residence_id = res.id 
         WHERE r.client_id = ? 
         ORDER BY r.created_at DESC`,
        [clientId]
      );

      const mappedReservations = rows.map((row: any) => ({
        id: row.id,
        residenceId: row.residence_id,
        residenceTitle: row.residenceTitle,
        location: row.city + (row.neighborhood ? ", " + row.neighborhood : ""),
        checkIn: row.check_in,
        checkOut: row.check_out,
        guests: row.guests,
        totalPrice: row.total_price,
        status: row.status,
        bookingStatus: row.status,
        paymentStatus: row.payment_status,
        ownerId: row.owner_id,
        clientId: row.client_id,
        createdAt: row.created_at
      }));

      res.json({ bookings: mappedReservations });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/reservations/owner", async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token" });
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");
      const ownerId = decoded.uid;

      const [rows]: any = await pool.execute(
        `SELECT 
          r.*, 
          res.title as residenceTitle, 
          res.city, 
          res.neighborhood,
          u.display_name as clientName,
          u.email as clientEmail,
          u.phone_number as clientPhone
         FROM reservations r 
         JOIN residences res ON r.residence_id = res.id 
         LEFT JOIN users u ON r.client_id = u.id
         WHERE r.owner_id = ? 
         ORDER BY r.created_at DESC`,
        [ownerId]
      );

      const mappedReservations = rows.map((row: any) => ({
        id: row.id,
        residenceId: row.residence_id,
        residenceTitle: row.residenceTitle,
        location: row.city + (row.neighborhood ? ", " + row.neighborhood : ""),
        checkIn: row.check_in,
        checkOut: row.check_out,
        guests: row.guests,
        totalPrice: row.total_price,
        status: row.status,
        bookingStatus: row.status,
        paymentStatus: row.payment_status,
        ownerId: row.owner_id,
        clientId: row.client_id,
        createdAt: row.created_at,
        clientName: row.clientName || "Voyageur Anonyme",
        clientEmail: row.clientEmail || "N/A",
        clientPhone: row.clientPhone || "N/A"
      }));

      res.json({ bookings: mappedReservations });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/reservations/:id/status", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status, paymentStatus, stayStatus } = req.body;

      // Check who triggers
      const [infoRows]: any = await pool.execute("SELECT client_id, owner_id FROM reservations WHERE id = ?", [id]);
      if (infoRows.length === 0) {
        return res.status(404).json({ error: "Réservation introuvable." });
      }
      const { client_id, owner_id } = infoRows[0];

      await pool.execute(
        "UPDATE reservations SET status = ?, payment_status = COALESCE(?, payment_status) WHERE id = ?",
        [status, paymentStatus || null, id]
      );

      // Keep bookings table perfectly synced
      await pool.execute(
        `UPDATE bookings SET 
          status = ?, 
          booking_status = ?, 
          payment_status = COALESCE(?, payment_status)
         WHERE id = ?`,
        [status, status, paymentStatus || null, id]
      );

      // Emit Event via Socket.io
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${client_id}`).emit("reservation:updated", {
          id,
          status,
          paymentStatus,
          stayStatus
        });
        io.to(`user:${owner_id}`).emit("reservation:updated", {
          id,
          status,
          paymentStatus,
          stayStatus
        });
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Legacy Bookings Fallback (proxies directly to the modern reservations database)
  app.post("/api/bookings", async (req: any, res: any) => {
    req.url = "/api/reservations";
    app._router.handle(req, res);
  });

  app.get("/api/bookings", async (req: any, res: any) => {
    const roleQ = req.query.role;
    if (roleQ === 'client') {
      req.url = "/api/reservations/client";
    } else if (roleQ === 'owner') {
      req.url = "/api/reservations/owner";
    } else {
      // Auto fallback by token
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token" });
        const token = authHeader.split(" ")[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "resifaso_secret");
        if (decoded.role === 'owner' || decoded.role === 'admin') {
          req.url = "/api/reservations/owner";
        } else {
          req.url = "/api/reservations/client";
        }
      } catch {
        req.url = "/api/reservations/client";
      }
    }
    app._router.handle(req, res);
  });

  app.post("/api/submit-review", async (req, res) => {
    const { bookingId, residenceId, clientId, rating, comment } = req.body;
    
    try {
      const reviewId = "rev_" + Math.random().toString(36).substr(2, 9);
      await pool.execute(
        `INSERT INTO reviews (id, booking_id, residence_id, client_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)`,
        [reviewId, bookingId, residenceId, clientId, rating, comment || ""]
      );

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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Auto-seed default Super Admin and auto-detect columns
    (async () => {
      try {
        await poolReady;
        // Detect database table users password column name
        try {
          const [columns]: any = await pool.execute("DESCRIBE users");
          const fieldNames = columns.map((c: any) => c.Field ? c.Field.toLowerCase() : "");
          if (!fieldNames.includes("password") && !fieldNames.includes("password_hash")) {
            console.log("ℹ️ No password column found. Adding password column...");
            await pool.execute("ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT ''");
            userPasswordColumn = "password";
          } else if (!fieldNames.includes("password") && fieldNames.includes("password_hash")) {
            userPasswordColumn = "password_hash";
            console.log("ℹ️ Auto-detected column [password_hash] for user credentials storage.");
          } else {
            console.log(`ℹ️ Using default column [${userPasswordColumn}] for user credentials storage.`);
          }
        } catch (colErr: any) {
          console.warn("⚠️ Column auto-detection skipped:", colErr.message);
        }

        const [rows]: any = await pool.execute("SELECT * FROM users WHERE email = ?", ["mandemohamed68@gmail.com"]);
        if (rows.length === 0) {
          const pwdHash = await bcrypt.hash("mm@27071986@", 10);
          await pool.execute(
            `INSERT INTO users (id, email, ${userPasswordColumn}, display_name, role) VALUES (?, ?, ?, ?, ?)`,
            ["usr_admin_default", "mandemohamed68@gmail.com", pwdHash, "Super Administrateur", "admin"]
          );
          console.log(`Seeded default Super Admin user (mandemohamed68@gmail.com) successfully using [${userPasswordColumn}].`);
        } else {
          const existing = rows[0];
          if (existing.role !== 'admin') {
            await (pool as any).execute("UPDATE users SET role = 'admin' WHERE email = ?", ["mandemohamed68@gmail.com"]);
            console.log("Updated default Super Admin role to 'admin'.");
          }
        }
      } catch (err: any) {
        console.warn("Seeding default Super Admin user skipped or failed:", err.message);
      }
    })();
  });
}

startServer();
