import { UserProfile, Residence, Booking, Conversation, Message, WithdrawalRequest, WithdrawalStatus } from '../types';
import { getApiUrl } from './api';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Helper for fetch
const apiFetch = async (endpoint: string, options: any = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;

  try {
    const response = await fetch(fullUrl, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (err: any) {
    console.error(`Fetch error at ${endpoint}:`, err);
    throw err;
  }
};

// ==========================================
// RESIDENCES COLLECTION CLIENT
// ==========================================

export async function getPublishedResidences(): Promise<Residence[]> {
  return apiFetch('/api/residences').then(list => list.filter((r: any) => r.status === 'published'));
}

export async function getAllResidences(): Promise<Residence[]> {
  return apiFetch('/api/residences');
}

export async function getResidenceById(id: string): Promise<Residence | null> {
  return apiFetch(`/api/residences/${id}`).catch(() => null);
}

export async function createResidence(resData: Omit<Residence, 'id'>): Promise<string> {
  const res = await apiFetch('/api/residences', {
    method: 'POST',
    body: JSON.stringify(resData)
  });
  return res.id;
}

export async function updateResidence(id: string, updates: Partial<Residence>): Promise<void> {
  await apiFetch(`/api/residences/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteResidence(id: string): Promise<void> {
  await apiFetch(`/api/residences/${id}`, {
    method: 'DELETE'
  });
}

export async function getOwnerResidences(ownerId: string): Promise<Residence[]> {
  return apiFetch(`/api/residences?ownerId=${ownerId}`);
}

// ==========================================
// BOOKINGS MANAGEMENT
// ==========================================

export async function createBooking(bookingData: Omit<Booking, 'id'>): Promise<string> {
  const res = await apiFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData)
  });
  return res.id;
}

export async function getClientBookings(clientId: string): Promise<Booking[]> {
  return apiFetch(`/api/bookings?role=client&userId=${clientId}`);
}

export async function getOwnerBookings(ownerId: string): Promise<Booking[]> {
  return apiFetch(`/api/bookings?role=owner&userId=${ownerId}`);
}

export async function getAllBookings(): Promise<Booking[]> {
  return apiFetch('/api/bookings');
}

export async function updateBookingStatus(id: string, updates: Partial<Booking>): Promise<void> {
  await apiFetch(`/api/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

// ==========================================
// USER PROFILES
// ==========================================

export async function getAllUsers(): Promise<UserProfile[]> {
  return apiFetch('/api/users');
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  await apiFetch(`/api/users/${uid}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export function deleteUser(uid: string): Promise<void> {
  return apiFetch(`/api/users/${uid}`, {
    method: 'DELETE'
  });
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export async function sendNotification(notif: any): Promise<void> {
  await apiFetch('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(notif)
  });
}

// ==========================================
// MESSAGING
// ==========================================

export async function getOrCreateConversation(participants: string[], relatedId?: string): Promise<string> {
  const res = await apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ participants, relatedId })
  });
  return res.id;
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
  await apiFetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ senderId, text })
  });
}

// ==========================================
// WITHDRAWALS MANAGEMENT
// ==========================================

export async function createWithdrawalRequest(data: Omit<WithdrawalRequest, 'id'>): Promise<string> {
  const res = await apiFetch('/api/withdrawals', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.id;
}

export async function getOwnerWithdrawals(ownerId: string): Promise<WithdrawalRequest[]> {
  return apiFetch(`/api/withdrawals?ownerId=${ownerId}`);
}

export async function getAllWithdrawals(): Promise<WithdrawalRequest[]> {
  return apiFetch('/api/withdrawals');
}

export async function updateWithdrawalStatus(id: string, status: WithdrawalStatus, approvedAt?: string): Promise<void> {
  await apiFetch(`/api/withdrawals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, approvedAt })
  });
}

// ==========================================
// DATABASE AUTO-SEEDER
// ==========================================

export async function seedDatabaseIfNeeded() {
  // Server-side handles seeding by default in init.ts
}

export async function hardResetDatabase() {
  await apiFetch('/api/admin/reset-db', { method: 'POST' });
}

// ==========================================
// ADMIN CONFIG & SETTINGS
// ==========================================

export async function getBackendDbType(): Promise<string> {
  return 'sql';
}

export async function getGlobalSettings(): Promise<any> {
  return apiFetch('/api/settings/global').catch(() => ({}));
}

export async function saveGlobalSettings(settings: any): Promise<void> {
  await apiFetch('/api/settings/global', {
    method: 'POST',
    body: JSON.stringify(settings)
  });
}

export async function getContactSettings(): Promise<any> {
  return apiFetch('/api/settings/contactSettings').catch(() => ({}));
}

export async function saveContactSettings(settings: any): Promise<void> {
  await apiFetch('/api/settings/contactSettings', {
    method: 'POST',
    body: JSON.stringify(settings)
  });
}

// ==========================================
// FAQS
// ==========================================

export async function getAllFaqs(): Promise<any[]> {
  return apiFetch('/api/faqs').catch(() => []);
}

export async function saveFaq(faq: any): Promise<void> {
  await apiFetch('/api/faqs', {
    method: 'POST',
    body: JSON.stringify(faq)
  });
}

export async function deleteFaq(id: string): Promise<void> {
  await apiFetch(`/api/faqs/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// ADVERTISEMENTS (ADS)
// ==========================================

export async function getAllAds(): Promise<any[]> {
  return apiFetch('/api/ads').catch(() => []);
}

export async function saveAd(ad: any): Promise<void> {
  await apiFetch('/api/ads', {
    method: 'POST',
    body: JSON.stringify(ad)
  });
}

export async function deleteAd(id: string): Promise<void> {
  await apiFetch(`/api/ads/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// CONTACT MESSAGES
// ==========================================

export async function getAllContactMessages(): Promise<any[]> {
  return apiFetch('/api/contact-messages').catch(() => []);
}

export async function sendContactMessage(msg: any): Promise<void> {
  await apiFetch('/api/contact-messages', {
    method: 'POST',
    body: JSON.stringify(msg)
  });
}

export async function deleteContactMessage(id: string): Promise<void> {
  await apiFetch(`/api/contact-messages/${id}`, {
    method: 'DELETE'
  });
}

export async function updateContactMessage(id: string, updates: any): Promise<void> {
  await apiFetch(`/api/contact-messages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

// ==========================================
// REVIEWS
// ==========================================

export async function getAllReviews(): Promise<any[]> {
  return apiFetch('/api/reviews').catch(() => []);
}

export async function deleteReview(id: string): Promise<void> {
  await apiFetch(`/api/reviews/${id}`, {
    method: 'DELETE'
  });
}
