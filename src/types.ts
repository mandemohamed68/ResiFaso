export type UserRole = "client" | "owner" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  isSuspended?: boolean;
}

export type ResidenceType = "appartement" | "chambre" | "villa" | "auberge";
export type ResidenceStatus = "draft" | "pending" | "published" | "suspended";

export interface Residence {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  type: ResidenceType;
  pricePerNight: number;
  advancePercentage: number;
  cleaningFee: number;
  serviceFee: number;
  address: {
    city: string;
    neighborhood: string;
    street: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  amenities: string[];
  images: string[];
  capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rooms: number;
  rating?: number;
  reviewCount?: number;
  ownerPhone?: string;
  status: ResidenceStatus;
  availabilityStatus?: 'available' | 'occupied' | 'maintenance';
  ownerName?: string;
  createdAt: string;
  promoted?: boolean;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  promoPrice?: number;
  rejectionReason?: string;
}

export type PaymentStatus = "pending" | "advance_paid" | "fully_paid" | "failed";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: string;
  residenceId: string;
  clientId: string;
  ownerId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  advancePaid: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  transactionId?: string;
  createdAt: string;
  // Cancellation details
  cancelledBy?: 'client' | 'owner' | 'admin';
  cancellationReason?: string;
  cancelledAt?: string;
  refundStatus?: 'none' | 'pending' | 'refunded';
  refundAmount?: number;
  refundPhone?: string;
  refundProvider?: string;
  refundProcessedAt?: string;
  stayStatus?: 'pending' | 'ongoing' | 'completed';
  checkedInAt?: string;
  checkedOutAt?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  residenceId: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: string;
  relatedId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isRead?: boolean;
}

export interface Advertisement {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  linkUrl?: string;
  isActive: boolean;
  frequencySeconds: number;
  createdAt: string;
  startAt?: string;
  endAt?: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';
export type MobileMoneyProvider = 'orange' | 'moov' | 'telecel' | 'coris';

export interface WithdrawalRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  amount: number;
  phone: string;
  provider: MobileMoneyProvider;
  status: WithdrawalStatus;
  createdAt: string;
  approvedAt?: string;
}


