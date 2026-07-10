export type UserRole = "client" | "owner" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  photoUrl?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  isSuspended?: boolean;
  phone?: string;
  verificationStatus?: 'pending' | 'verified' | 'unverified' | 'rejected' | 'none';
  idNumber?: string;
  idType?: string;
  idExpiry?: string;
  idCardUrl?: string;
  notifications?: any;
  privacy?: any;
  paymentPreferences?: any;
  hostCancellationFee?: number;
  hostCancellationRulesText?: string;
  identityDocumentFront?: string;
  identityDocumentBack?: string;
}

export interface VerificationType {
  id: string;
  label: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ResidenceType = "appartement" | "chambre" | "villa" | "auberge";
export type ResidenceStatus = "draft" | "pending" | "published" | "suspended" | "hidden";

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
    cityId?: string;
    neighborhood: string;
    neighborhoodId?: string;
    street: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  utilitiesIncluded: {
    water: boolean;
    electricity: boolean;
  };
  pricingTiers: {
    minNights: number;
    pricePerNight: number;
  }[];
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
  recommended?: boolean;
  price?: number;
  city?: string;
  neighborhood?: string;
  price_per_night?: number;
  weekly_discount?: number;
  monthly_discount?: number;
  promo_price?: number;
  cleaning_fee?: number;
  service_fee?: number;
  advance_percentage?: number;
  street?: string;
  lat?: number;
  lng?: number;
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
  travelerId?: string;
  totalAmount?: number;
  status?: string;
  clientPhone?: string;
  verificationsStatus?: string; // JSON string
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

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'booking' | 'payment' | 'host';
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'unread' | 'read' | 'replied';
  adminNotes?: string;
  repliedAt?: string;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
}

export interface ContactSettings {
  title: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
  facebookUrl?: string;
  whatsappNumber?: string;
  isEmailEnabled?: boolean;
  isPhoneEnabled?: boolean;
  isWhatsappEnabled?: boolean;
  isFacebookEnabled?: boolean;
  isAddressEnabled?: boolean;
}



