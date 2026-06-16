import { UserProfile, Residence, Booking, Conversation, Message } from '../types';

async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('resifaso_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...((options.headers || {}) as any)
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  return res.json();
}

// ==========================================
// RESIDENCES COLLECTION CLIENT (MariaDB)
// ==========================================

export async function getPublishedResidences(): Promise<Residence[]> {
  try {
    const data = await apiFetch('/api/residences');
    return data.residences || [];
  } catch (error) {
    console.error('Error fetching published residences:', error);
    return [];
  }
}

export async function getAllResidences(): Promise<Residence[]> {
  try {
    const data = await apiFetch('/api/admin/residences');
    return data.residences || [];
  } catch (error) {
    console.error('Error fetching all residences:', error);
    return [];
  }
}

export async function getOwnerResidences(ownerId: string): Promise<Residence[]> {
  try {
    const data = await apiFetch('/api/owner/residences');
    return data.residences || [];
  } catch (error) {
    console.error('Error fetching owner residences:', error);
    return [];
  }
}

export async function addResidence(resData: Omit<Residence, 'id'>): Promise<string> {
  try {
    const data = await apiFetch('/api/owner/residences', {
      method: 'POST',
      body: JSON.stringify(resData)
    });
    return data.id;
  } catch (error) {
    console.error('Error adding residence:', error);
    return '';
  }
}

export async function updateResidence(id: string, updates: Partial<Residence>): Promise<void> {
  try {
    await apiFetch(`/api/owner/residences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating residence:', error);
  }
}

export async function deleteResidence(id: string): Promise<void> {
  try {
    await apiFetch(`/api/owner/residences/${id}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting residence:', error);
  }
}

// ==========================================
// BOOKINGS MANAGEMENT (MariaDB)
// ==========================================

export async function createBooking(bookingData: Omit<Booking, 'id'>): Promise<string> {
  try {
    const data = await apiFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
    return data.bookingId;
  } catch (error) {
    console.error('Error creating booking:', error);
    return '';
  }
}

export async function getClientBookings(clientId: string): Promise<Booking[]> {
  try {
    const data = await apiFetch('/api/bookings');
    return data.bookings || [];
  } catch (error) {
    console.error('Error fetching client bookings:', error);
    return [];
  }
}

export async function getOwnerBookings(ownerId: string): Promise<Booking[]> {
  try {
    const data = await apiFetch('/api/bookings');
    return data.bookings || [];
  } catch (error) {
    console.error('Error fetching owner bookings:', error);
    return [];
  }
}

export async function getAllBookings(): Promise<Booking[]> {
  try {
    const data = await apiFetch('/api/bookings');
    return data.bookings || [];
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    return [];
  }
}

export async function updateBookingStatus(id: string, updates: Partial<Booking>): Promise<void> {
  try {
    await apiFetch(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: updates.bookingStatus || updates.paymentStatus }) 
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
  }
}

// ==========================================
// USER PROFILES (MariaDB)
// ==========================================

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const data = await apiFetch('/api/admin/users');
    return data.users || [];
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    await apiFetch(`/api/admin/users/${uid}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}

export async function deleteUser(uid: string): Promise<void> {
  try {
    await apiFetch(`/api/admin/users/${uid}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}

// ==========================================
// SYSTEM LOGS & NOTIFICATIONS
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

export async function sendNotification(notif: any): Promise<void> {
  // Placeholder
}

// ==========================================
// MESSAGING
// ==========================================

export async function getOrCreateConversation(participants: string[], relatedId?: string): Promise<string> {
  return '';
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
  // Placeholder
}

// ==========================================
// WITHDRAWALS & ADMIN (MariaDB)
// ==========================================
import { WithdrawalRequest, WithdrawalStatus, Advertisement } from '../types';

export async function createWithdrawalRequest(data: Omit<WithdrawalRequest, 'id'>): Promise<string> {
  // Placeholder, need owner endpoint
  return 'mock_w_id';
}

export async function getOwnerWithdrawals(ownerId: string): Promise<WithdrawalRequest[]> {
  return [];
}

export async function getAllWithdrawals(): Promise<WithdrawalRequest[]> {
  try {
    const data = await apiFetch('/api/admin/withdrawals');
    return data.withdrawals || [];
  } catch (error) {
    console.error('Error fetching all withdrawals:', error);
    return [];
  }
}

export async function updateWithdrawalStatus(id: string, status: WithdrawalStatus, approvedAt?: string): Promise<void> {
  try {
    await apiFetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, approvedAt })
    });
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
  }
}

// ==========================================
// SYSTEM SETTINGS & ADS
// ==========================================

export async function getGlobalSettings(id: string = 'global'): Promise<any> {
  try {
    return await apiFetch(`/api/admin/settings/${id}`);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {};
  }
}

export async function saveGlobalSettings(data: any, id: string = 'global'): Promise<void> {
  try {
    await apiFetch(`/api/admin/settings/${id}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export async function getAllAds(): Promise<Advertisement[]> {
  try {
    const data = await apiFetch('/api/admin/ads');
    return data.ads || [];
  } catch (error) {
    console.error('Error fetching ads:', error);
    return [];
  }
}

export async function saveAd(ad: any): Promise<string> {
  try {
    const data = await apiFetch('/api/admin/ads', {
      method: 'POST',
      body: JSON.stringify(ad)
    });
    return data.id;
  } catch (error) {
    console.error('Error saving ad:', error);
    return '';
  }
}

export async function deleteAd(id: string): Promise<void> {
  try {
    await apiFetch(`/api/admin/ads/${id}`, { method: 'DELETE' });
  } catch (error) { console.error('Error deleting ad:', error); }
}

export async function hardResetDatabase() {
  // Safety: Admin only
  console.warn("Hard reset requested via API");
}


