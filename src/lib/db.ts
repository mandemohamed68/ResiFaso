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
    const data = await apiFetch('/api/residences'); // In generic app, this returns all published. 
    // In admin view, we might need a specific admin endpoint, but for now this works.
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
// USER PROFILES
// ==========================================

export async function getAllUsers(): Promise<UserProfile[]> {
  return []; // Placeholder for now or add endpoint
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  // Placeholder
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
// WITHDRAWALS & ADMIN (MariaDB placeholders)
// ==========================================
import { WithdrawalRequest, WithdrawalStatus } from '../types';

export async function createWithdrawalRequest(data: Omit<WithdrawalRequest, 'id'>): Promise<string> {
  return 'mock_w_id';
}

export async function getOwnerWithdrawals(ownerId: string): Promise<WithdrawalRequest[]> {
  return [];
}

export async function updateWithdrawalStatus(id: string, status: WithdrawalStatus, approvedAt?: string): Promise<void> {
  // Placeholder
}

export async function hardResetDatabase() {
  // Placeholder
}


