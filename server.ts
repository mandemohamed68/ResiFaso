import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from "fs";

dotenv.config();

// Safe detection of __dirname and __filename for both CJS and ESM
const currentFilename = typeof __filename !== "undefined" 
  ? __filename 
  : (typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "");

const currentDirname = typeof __dirname !== "undefined" 
  ? __dirname 
  : (currentFilename ? path.dirname(currentFilename) : process.cwd());

// Initialize Firebase Admin utilizing credentials if available
let adminDb: any = null;
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

const SAPPAY_BASE_PUBLIC_SANDBOX = "https://sandbox.sappay.net/api/v1";
const SAPPAY_BASE_CHECKOUT_SANDBOX = "https://sandbox.sappay.net/api/v1/checkout";

const SAPPAY_BASE_PUBLIC_PROD = "https://api.prod.sappay.net/api/public";
const SAPPAY_BASE_CHECKOUT_PROD = "https://api.prod.sappay.net/api/checkout";

// Dynamically fetch administrator-configured Sappay credentials
async function getSappayCredentials() {
  if (adminDb) {
    try {
      const docSnap = await adminDb.collection("settings").doc("global").get();
      if (docSnap.exists) {
        const data = docSnap.data();
        return {
          clientId: data?.sappayClientId || process.env.SAPPAY_CLIENT_ID || "",
          clientSecret: data?.sappayClientSecret || process.env.SAPPAY_CLIENT_SECRET || "",
          username: data?.sappayUsername || process.env.SAPPAY_USERNAME || "",
          password: data?.sappayPassword || process.env.SAPPAY_PASSWORD || "",
          // Default to false (Production) for Sappay integration
          isTestMode: data?.isTestMode !== undefined ? data.isTestMode : false
        };
      }
    } catch (e: any) {
      // Quietly log error once and avoid re-logging if it's a permission issue
      if (e.message?.includes("PERMISSION_DENIED")) {
        console.log("Sappay: Firestore permission denied, using environment defaults.");
      } else {
        console.warn("Sappay: Error reading configuration:", e.message);
      }
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
  const app = express();
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
