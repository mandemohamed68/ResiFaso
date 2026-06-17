import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, Residence, Booking, Conversation, Message } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Cleans an object by removing any keys with 'undefined' values.
 */
export function cleanData<T extends object>(data: T): T {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach(key => {
    // @ts-ignore
    if (cleaned[key] === undefined) {
      // @ts-ignore
      delete cleaned[key];
    } else if (cleaned[key] !== null && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
      // @ts-ignore
      cleaned[key] = cleanData(cleaned[key]);
    }
  });
  return cleaned;
}

// ==========================================
// RESIDENCES COLLECTION CLIENT
// ==========================================

export async function getPublishedResidences(): Promise<Residence[]> {
  const path = 'residences';
  try {
    const q = query(collection(db, path), where('status', '==', 'published'));
    const snap = await getDocs(q);
    const list: Residence[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as Residence);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAllResidences(): Promise<Residence[]> {
  const path = 'residences';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Residence[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as Residence);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getOwnerResidences(ownerId: string): Promise<Residence[]> {
  const path = 'residences';
  try {
    const q = query(collection(db, path), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    const list: Residence[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as Residence);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function addResidence(resData: Omit<Residence, 'id'>): Promise<string> {
  const path = 'residences';
  try {
    const docRef = await addDoc(collection(db, path), cleanData(resData));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function updateResidence(id: string, updates: Partial<Residence>): Promise<void> {
  const path = `residences/${id}`;
  try {
    await updateDoc(doc(db, 'residences', id), cleanData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteResidence(id: string): Promise<void> {
  const path = `residences/${id}`;
  try {
    await deleteDoc(doc(db, 'residences', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// BOOKINGS MANAGEMENT
// ==========================================

export async function createBooking(bookingData: Omit<Booking, 'id'>): Promise<string> {
  const path = 'bookings';
  try {
    const docRef = await addDoc(collection(db, path), cleanData({
      ...bookingData,
      createdAt: new Date().toISOString()
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function getClientBookings(clientId: string): Promise<Booking[]> {
  const path = 'bookings';
  try {
    const q = query(
      collection(db, path), 
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const list: Booking[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as Booking);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getOwnerBookings(ownerId: string): Promise<Booking[]> {
  const path = 'bookings';
  try {
    const q = query(
      collection(db, path), 
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const list: Booking[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as Booking);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAllBookings(): Promise<Booking[]> {
  const path = 'bookings';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Booking[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as Booking);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateBookingStatus(id: string, updates: Partial<Booking>): Promise<void> {
  const path = `bookings/${id}`;
  try {
    await updateDoc(doc(db, 'bookings', id), cleanData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// USER PROFILES
// ==========================================

export async function getAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    const list: UserProfile[] = [];
    snap.forEach(doc => {
      list.push(doc.data() as UserProfile);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), cleanData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// SYSTEM LOGS & METRICS
// ==========================================

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'residence' | 'payment' | 'system';
  isRead: boolean;
  createdAt: string;
  referenceId?: string;
}

export async function sendNotification(notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>): Promise<void> {
  const path = 'notifications';
  try {
    await addDoc(collection(db, path), {
      ...notif,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ==========================================
// MESSAGING
// ==========================================

export async function getOrCreateConversation(participants: string[], relatedId?: string): Promise<string> {
  const path = 'conversations';
  try {
    // Basic search for existing conversation with same participants
    const q = query(collection(db, path), where('participants', 'array-contains', participants[0]));
    const snap = await getDocs(q);
    
    let existingId: string | null = null;
    snap.forEach(docSnap => {
      const data = docSnap.data() as Conversation;
      if (data.participants.length === participants.length && 
          participants.every(p => data.participants.includes(p))) {
        existingId = docSnap.id;
      }
    });

    if (existingId) return existingId;

    // Create new
    const docRef = await addDoc(collection(db, path), {
      participants,
      updatedAt: new Date().toISOString(),
      relatedId: relatedId || null
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return '';
  }
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
  const msgPath = `conversations/${conversationId}/messages`;
  try {
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      conversationId,
      senderId,
      text,
      createdAt: new Date().toISOString(),
      isRead: false
    });

    // Update conversation lastMessage
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: text,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, msgPath);
  }
}

// ==========================================
// DATABASE AUTO-SEEDER
// ==========================================
import { MOCK_RESIDENCES } from '../mockData';

export async function seedDatabaseIfNeeded() {
  const path = 'residences';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      console.log("Seeding empty database with sample Burkina residences...");
      for (const res of MOCK_RESIDENCES) {
        await setDoc(doc(db, 'residences', res.id), res);
      }
      console.log("Database seeded successfully!");
    }

    // Seed global platform settings containing the global announcement if not present
    const settingsSnap = await getDocs(collection(db, 'settings'));
    if (settingsSnap.empty) {
      console.log("Seeding default global settings with announcement...");
      await setDoc(doc(db, 'settings', 'global'), {
        platformName: 'ResiFaso',
        commissionRate: 10,
        isTestMode: false,
        announcement: {
          text: "Bienvenue sur ResiFaso ! Profitez d'un séjour mémorable dans nos résidences d'exception au Burkina Faso. 🇧🇫 ✨",
          type: 'info',
          active: true,
          updatedAt: new Date().toISOString()
        }
      });
      console.log("Global settings seeded successfully!");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

// ==========================================
// WITHDRAWALS MANAGEMENT
// ==========================================
import { WithdrawalRequest, WithdrawalStatus } from '../types';

export async function createWithdrawalRequest(data: Omit<WithdrawalRequest, 'id'>): Promise<string> {
  const path = 'withdrawals';
  try {
    const docRef = await addDoc(collection(db, path), cleanData({
      ...data,
      createdAt: new Date().toISOString()
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function getOwnerWithdrawals(ownerId: string): Promise<WithdrawalRequest[]> {
  const path = 'withdrawals';
  try {
    const q = query(
      collection(db, path),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const list: WithdrawalRequest[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as WithdrawalRequest);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAllWithdrawals(): Promise<WithdrawalRequest[]> {
  const path = 'withdrawals';
  try {
    const snap = await getDocs(collection(db, path));
    const list: WithdrawalRequest[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as WithdrawalRequest);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateWithdrawalStatus(id: string, status: WithdrawalStatus, approvedAt?: string): Promise<void> {
  const path = `withdrawals/${id}`;
  try {
    const updates: Partial<WithdrawalRequest> = { status };
    if (approvedAt) {
      updates.approvedAt = approvedAt;
    }
    await updateDoc(doc(db, 'withdrawals', id), cleanData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function hardResetDatabase() {
  const collectionsToClear = ['bookings', 'reviews', 'notifications', 'conversations', 'residences', 'users'];
  
  for (const coll of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, coll));
      for (const d of snap.docs) {
        if (coll === 'conversations') {
          try {
            const msgSnap = await getDocs(collection(db, 'conversations', d.id, 'messages'));
            for (const m of msgSnap.docs) {
              await deleteDoc(doc(db, 'conversations', d.id, 'messages', m.id));
            }
          } catch (e) {
            console.error("Subcollection messages clean error:", e);
          }
        }
        await deleteDoc(doc(db, coll, d.id));
      }
    } catch (e) {
      console.error(`Error resetting database collection ${coll}:`, e);
    }
  }

  // Force reseed standard mock residences
  for (const res of MOCK_RESIDENCES) {
    await setDoc(doc(db, 'residences', res.id), res);
  }
}

