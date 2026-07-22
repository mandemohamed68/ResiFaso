import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "fs";
import path from "path";
import { executeSql } from "../db/index";

let fcmInitialized = false;

try {
  let serviceAccount: any;

  if (process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim()) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.trim());
    } catch (e: any) {
      try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT.trim(), "base64").toString("utf8");
        serviceAccount = JSON.parse(decoded);
      } catch (e2) {
        // Fallback to local file if environment variable is invalid JSON
        const serviceAccountPath = path.join(process.cwd(), "resifaso-firebase-adminsdk-fbsvc-23372c78ad.json");
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      }
    }
  } else {
    const serviceAccountPath = path.join(process.cwd(), "resifaso-firebase-adminsdk-fbsvc-23372c78ad.json");
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  }

  initializeApp({
    credential: cert(serviceAccount)
  });
  fcmInitialized = true;
  console.log("[FCM] Firebase Admin SDK initialized successfully!");
} catch (error: any) {
  console.error("[FCM] Failed to initialize Firebase Admin SDK:", error.message);
}

/**
 * Register or update a device push token for a specific user.
 */
export async function registerDeviceToken(userId: string, token: string, deviceType?: string): Promise<boolean> {
  if (!userId || !token) return false;
  try {
    const existing = await executeSql(
      "SELECT 1 FROM user_push_tokens WHERE user_id = ? AND token = ?",
      [userId, token]
    );

    if (existing && existing.length > 0) {
      await executeSql(
        "UPDATE user_push_tokens SET device_type = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND token = ?",
        [deviceType || null, userId, token]
      );
    } else {
      await executeSql(
        "INSERT INTO user_push_tokens (user_id, token, device_type) VALUES (?, ?, ?)",
        [userId, token, deviceType || null]
      );
    }
    return true;
  } catch (error: any) {
    console.error("[FCM] Error registering device token:", error.message);
    return false;
  }
}

/**
 * Remove a device push token from the database.
 */
export async function unregisterDeviceToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await executeSql("DELETE FROM user_push_tokens WHERE token = ?", [token]);
    return true;
  } catch (error: any) {
    console.error("[FCM] Error unregistering device token:", error.message);
    return false;
  }
}

/**
 * Dispatches a push notification via FCM to all registered tokens for a specific user.
 * Automatically cleans up any obsolete/dead tokens.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!fcmInitialized) {
    console.warn("[FCM] Firebase Admin SDK not initialized. Cannot send push notification.");
    return false;
  }

  try {
    const rows = await executeSql("SELECT token FROM user_push_tokens WHERE user_id = ?", [userId]);
    if (!rows || rows.length === 0) {
      return false;
    }

    const tokens: string[] = rows.map((r: any) => r.token);
    const messages = tokens.map(token => ({
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
    }));

    console.log(`[FCM] Sending push notification to ${tokens.length} device(s) for user ${userId}`);
    const response = await getMessaging().sendEach(messages);

    // Clean up invalid or expired tokens
    response.responses.forEach((res, index) => {
      if (!res.success) {
        const error = res.error;
        if (
          error &&
          (error.code === "messaging/registration-token-not-registered" ||
            error.code === "messaging/invalid-registration-token")
        ) {
          const badToken = tokens[index];
          console.log(`[FCM] Removing invalid registration token for user ${userId}`);
          executeSql("DELETE FROM user_push_tokens WHERE token = ?", [badToken]).catch(e => {
            console.error("[FCM] Failed to delete invalid token:", e.message);
          });
        } else {
          console.warn(`[FCM] Failed to send push to token at index ${index}:`, res.error?.message);
        }
      }
    });

    return true;
  } catch (error: any) {
    console.error("[FCM] Error sending push notification:", error.message);
    return false;
  }
}

/**
 * Send a broadcast push notification to all registered tokens.
 */
export async function sendPushToAll(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!fcmInitialized) return false;

  try {
    const rows = await executeSql("SELECT DISTINCT token, user_id FROM user_push_tokens");
    if (!rows || rows.length === 0) {
      return false;
    }

    const tokens: string[] = rows.map((r: any) => r.token);
    const messages = tokens.map(token => ({
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
    }));

    console.log(`[FCM] Broadcasting push notification to ${tokens.length} device(s)`);
    const response = await getMessaging().sendEach(messages);

    response.responses.forEach((res, index) => {
      if (!res.success) {
        const error = res.error;
        if (
          error &&
          (error.code === "messaging/registration-token-not-registered" ||
            error.code === "messaging/invalid-registration-token")
        ) {
          const badToken = tokens[index];
          executeSql("DELETE FROM user_push_tokens WHERE token = ?", [badToken]).catch(() => {});
        }
      }
    });

    return true;
  } catch (error: any) {
    console.error("[FCM] Error broadcasting push notification:", error.message);
    return false;
  }
}
