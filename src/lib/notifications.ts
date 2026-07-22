import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiFetch } from './api';

/**
 * Play a beautiful, dual-tone, high-quality synthesized sound
 * imitating Facebook / WhatsApp pleasant chime notifications.
 */
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Create oscillator nodes
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Sweet, pure high-pitch dual tones
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.08); // A5
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6 (an octave up)
    osc2.frequency.exponentialRampToValueAtTime(1760.00, ctx.currentTime + 0.10); // A6
    
    // Gentle exponential volume decay
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    // Connections
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Play sequence
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.45);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (e) {
    console.warn("Failed to synthesize notification chime:", e);
  }
}

/**
 * Request notification permissions for both web and native mobile (Android/iOS)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // 1. Native platform (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        return req.display === 'granted';
      }
      return true;
    } catch (e) {
      console.error("Capacitor local notification permissions request failed:", e);
      return false;
    }
  }
  
  // 2. Web browser standard Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'default') {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return Notification.permission === 'granted';
    } catch (e) {
      console.error("Web standard notification permission request failed:", e);
      return false;
    }
  }
  
  return false;
}

/**
 * Dispatches a native or web notification with alert sounds and vibration feedback
 */
export async function showNotification(
  id: string | number,
  title: string,
  body: string,
  payload?: { url?: string; [key: string]: any }
): Promise<boolean> {
  // Play custom synthesized sound instantly
  playNotificationSound();
  
  // Create a numeric ID for Android compatibility
  const numericId = typeof id === 'number' 
    ? id 
    : Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 100000;

  // 1. Mobile App Native (Capacitor LocalNotifications)
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: numericId,
            title,
            body,
            extra: payload || {},
            smallIcon: 'ic_launcher_round',
            largeIcon: 'ic_launcher_foreground',
            actionTypeId: 'OPEN_APP'
          }
        ]
      });
      return true;
    } catch (e) {
      console.error("Capacitor notification trigger failed:", e);
    }
  }
  
  // 2. Web browser fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const options: any = {
          body,
          icon: '/logoresifaso_new.jpg',
          badge: '/favicon.png',
          vibrate: [100, 50, 100],
          data: payload || {}
        };
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          if (payload?.url && (window as any).onNavigateNotification) {
            (window as any).onNavigateNotification(payload.url);
          }
        };
        return true;
      } catch (e) {
        console.error("Web standard notification constructor failed:", e);
      }
    }
  }
  
  return false;
}

/**
 * Registers device for FCM Push Notifications (native Android/iOS)
 */
export async function registerPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform()) {
    console.log('[FCM Client] Non-native platform, skipping registration.');
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      // Register with Apple / Google to receive push notifications
      await PushNotifications.register();
    }

    // Success callback
    await PushNotifications.addListener('registration', async (token) => {
      console.log('[FCM Client] Push registration success, token:', token.value);
      try {
        await apiFetch('/api/user-alerts/register-token', {
          method: 'POST',
          body: JSON.stringify({
            token: token.value,
            deviceType: Capacitor.getPlatform()
          })
        });
      } catch (err) {
        console.error('[FCM Client] Failed to register token on server:', err);
      }
    });

    // Error callback
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[FCM Client] Error on registration:', error);
    });

    // Foreground notification received callback
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM Client] Foreground push received:', notification);
      showNotification(
        notification.id || Math.random().toString(),
        notification.title || "ResiFaso",
        notification.body || "",
        notification.data
      );
    });
  } catch (err) {
    console.error('[FCM Client] Failed to initialize push notifications:', err);
  }
}

/**
 * Unregisters device for FCM Push Notifications (native Android/iOS)
 */
export async function unregisterPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await PushNotifications.removeAllListeners();
  } catch (err) {
    console.error('[FCM Client] Failed to unregister push notifications:', err);
  }
}
