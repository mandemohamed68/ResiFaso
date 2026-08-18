import { CustomDatePicker } from "./components/common/CustomDatePicker";
import { formatCurrency } from './utils/currency';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { DataRefreshProvider, useDataRefresh } from './contexts/DataRefreshContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useResidences, useGlobalSettings, useBrandingSettings } from './hooks/useQueries';
import { Navbar } from './components/common/Navbar';
import { LoadingScreen } from './components/common/LoadingScreen';
import { SnowEffect } from './components/common/SnowEffect';
import { ChristmasLights } from './components/common/ChristmasLights';
import { RainEffect } from './components/common/RainEffect';
import { HarmattanEffect } from './components/common/HarmattanEffect';
import { ConfettiEffect } from './components/common/ConfettiEffect';
import { EventCanvasEffects } from './components/common/EventCanvasEffects';
import { EventOrnaments } from './components/common/EventOrnaments';
import { Hero } from './components/home/Hero';
import { SearchForm } from './components/search/SearchForm';
import { ResidenceCard } from './components/search/ResidenceCard';
import { ResidenceDetailView } from './components/booking/ResidenceDetailView';
import { PaymentModal } from './components/booking/PaymentModal';
import { MyBookings } from './components/booking/MyBookings';
import { OwnerDashboard } from './components/booking/OwnerDashboard';
import { AuthModal } from './components/common/AuthModal';
import { TermsGuideModal } from './components/common/TermsGuideModal';
import { SupportChatWidget } from './components/support/SupportChatWidget';
import { ReviewsSection } from './components/search/ReviewsSection';
import { PromoPopupModal } from './components/common/PromoPopupModal';
import { Residence, PromoPopupConfig } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Filter, Map as MapIcon, List, ArrowRight, Star, 
  CheckCircle2, ShieldCheck, RefreshCw, Compass, MessageSquare,
  ChevronLeft, ChevronRight, Phone, Heart, Megaphone, X, Share2, Check, Calendar as CalendarIcon, ShieldAlert,
  Droplets, Zap
} from 'lucide-react';
import { cn, formatFCFA, formatDateFr } from './lib/utils';
import { MapView } from './components/search/MapView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MessagesView } from './components/messaging/MessagesView';
import { 
  seedDatabaseIfNeeded, 
  createBooking, 
  getOrCreateConversation,
  updateBookingStatus,
  sendNotification,
  getClientBookings
} from './lib/db';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { LegalPage } from './components/legal/LegalPage';
import { FAQPage } from './components/legal/FAQPage';
import { ContactPage } from './components/legal/ContactPage';
import { ResetPassword } from './components/auth/ResetPassword';
import { Footer } from './components/common/Footer';
import { Partners } from './components/home/Partners';
import { Features } from './components/home/Features';
import { ShowcasePage } from './components/home/ShowcasePage';
import { BURKINA_LOCATIONS } from './constants/locations';
import { GlobalModal } from './components/common/GlobalModal';
import { apiFetch } from './lib/api';

function adjustBrightness(hex: string, percent: number) {
  if (!hex || hex.length < 7) return hex;
  try {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt((R * (100 + percent)) / 100 as any);
    G = parseInt((G * (100 + percent)) / 100 as any);
    B = parseInt((B * (100 + percent)) / 100 as any);

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    R = R > 0 ? R : 0;
    G = G > 0 ? G : 0;
    B = B > 0 ? B : 0;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  } catch (e) {
    return hex;
  }
}

// Algorithmic color shade calculator
function darkenColor(hex: string, percent: number = 15): string {
  return adjustBrightness(hex, -Math.abs(percent));
}

function AppContent() {
  const { user, profile, loginAsMock, logOut } = useAuth();
  const { currentRole, setCurrentRole } = useRole();
  const { addToast } = useToast();
  const { lastRefresh } = useDataRefresh();
  const queryClient = useQueryClient();

  const { data: resData, isLoading: resLoading } = useResidences();
  const { data: gsData } = useGlobalSettings();
  const { data: bData } = useBrandingSettings();

  const [branding, setBranding] = useState({
    brandNamePart1: 'Resi',
    brandNamePart2: 'Faso',
    brandSlogan: 'La référence de la réservation meublée au Burkina Faso',
    activeTheme: 'default',
    primaryColor: '#10b981',
    secondaryColor: '#ef4444',
    christmasLights: false,
    snowParticles: false,
    rainParticles: false,
    harmattanParticles: false,
    confettiParticles: false,
    heartsParticles: false,
    starsParticles: false,
    petalsParticles: false,
    ornamentsEnabled: true
  });

  useEffect(() => {
    if (bData) {
      setBranding({
        brandNamePart1: bData.brandNamePart1 || 'Resi',
        brandNamePart2: bData.brandNamePart2 || 'Faso',
        brandSlogan: bData.brandSlogan || 'La référence de la réservation meublée au Burkina Faso',
        activeTheme: bData.activeTheme || 'default',
        primaryColor: bData.primaryColor || '#10b981',
        secondaryColor: bData.secondaryColor || '#ef4444',
        christmasLights: !!bData.christmasLights,
        snowParticles: !!bData.snowParticles,
        rainParticles: !!bData.rainParticles,
        harmattanParticles: !!bData.harmattanParticles,
        confettiParticles: !!bData.confettiParticles,
        heartsParticles: !!bData.heartsParticles,
        starsParticles: !!bData.starsParticles,
        petalsParticles: !!bData.petalsParticles,
        ornamentsEnabled: bData.ornamentsEnabled !== undefined ? !!bData.ornamentsEnabled : true
      });
    }
  }, [bData]);

  const [residences, setResidences] = useState<Residence[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('resifaso_cache_/api/residences');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (residences.length > 0) return false;
    return resLoading;
  });

  // Guaranteed safety dismissal: The splash screen will NEVER block the user for more than 1.8s
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1800);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (resData && Array.isArray(resData) && resData.length > 0) {
      setResidences(resData);
      try {
        localStorage.setItem('resifaso_cache_/api/residences', JSON.stringify(resData));
      } catch (e) {}
    }
  }, [resData]);

  useEffect(() => {
    if (resData && resData.length > 0) {
      setLoading(false);
    } else if (residences.length > 0) {
      setLoading(false);
    } else if (!resLoading) {
      setLoading(false);
    }
  }, [resData, resLoading, residences.length]);

  const [clientServiceFeeEnabled, setClientServiceFeeEnabled] = useState(false);
  const [clientServiceFeePercentage, setClientServiceFeePercentage] = useState(5);

  useEffect(() => {
    if (gsData) {
      const gs = gsData as any;
      if (gs.isTestMode !== undefined) setIsTestMode(false);
      if (gs.commissionRate !== undefined) setCommissionRate(gs.commissionRate);
      if (gs.enablePhoneCalls !== undefined) setEnablePhoneCalls(gs.enablePhoneCalls);
      if (gs.enableWhatsApp !== undefined) setEnableWhatsApp(gs.enableWhatsApp);
      if (gs.minReservationAmountEnabled !== undefined) setMinReservationAmountEnabled(gs.minReservationAmountEnabled);
      if (gs.minReservationAmount !== undefined) setMinReservationAmount(gs.minReservationAmount);
      if (gs.maxBookingsWithoutId !== undefined) setMaxBookingsWithoutId(Number(gs.maxBookingsWithoutId));
      if (gs.clientServiceFeeEnabled !== undefined) setClientServiceFeeEnabled(!!gs.clientServiceFeeEnabled);
      if (gs.clientServiceFeePercentage !== undefined) setClientServiceFeePercentage(Number(gs.clientServiceFeePercentage) || 5);
      
      if (gs.announcements && gs.announcements.length > 0) {
        setAnnouncements(gs.announcements);
      }
      
      if (gs.announcement) {
        setGlobalAnnouncement({
          text: gs.announcement.text || '',
          type: gs.announcement.type || 'info',
          active: !!gs.announcement.active
        });
      }
    }
  }, [gsData]);
  
  // URL parser for routes like /Conditions_Générales or /Politique de Confidentialité or /accueil
  const parseViewFromUrl = (): 'home' | 'showcase' | 'search' | 'details' | 'admin' | 'bookings' | 'owner-dashboard' | 'profile' | 'messages' | 'favorites' | 'tos' | 'privacy' | 'faq' | 'contact' | 'guide' | 'reset-password' => {
    if (typeof window === 'undefined') return 'home';

    try {
      const rawPath = window.location.pathname;
      let decodedPath = '';
      try {
        decodedPath = decodeURIComponent(rawPath).toLowerCase();
      } catch (_) {
        decodedPath = rawPath.toLowerCase();
      }

      const searchParams = new URLSearchParams(window.location.search);
      const viewParam = (searchParams.get('view') || searchParams.get('page'))?.toLowerCase();

      // Check query params first
      if (viewParam) {
        if (['accueil', 'showcase', 'presentation', 'vitrine'].includes(viewParam)) return 'showcase';
        if (['tos', 'cgu', 'conditions', 'conditions_générales', 'conditions_generales', 'conditions-generales'].some(k => viewParam.includes(k))) return 'tos';
        if (['privacy', 'confidentialite', 'confidentialité', 'politique', 'politique_de_confidentialité', 'politique-de-confidentialite'].some(k => viewParam.includes(k))) return 'privacy';
        if (viewParam === 'reset-password') return 'reset-password';
        if (viewParam === 'faq') return 'faq';
        if (viewParam === 'contact') return 'contact';
        if (viewParam === 'guide') return 'guide';
        if (viewParam === 'admin') return 'admin';
        if (viewParam === 'bookings') return 'bookings';
        if (viewParam === 'messages') return 'messages';
        if (viewParam === 'favorites') return 'favorites';
        if (viewParam === 'profile') return 'profile';
      }

      // Check path names
      if (
        decodedPath.includes('/accueil') ||
        decodedPath.includes('/presentation') ||
        decodedPath.includes('/showcase') ||
        decodedPath.includes('/vitrine')
      ) {
        return 'showcase';
      }

      if (
        decodedPath.includes('conditions_générales') ||
        decodedPath.includes('conditions_generales') ||
        decodedPath.includes('conditions-generales') ||
        decodedPath.includes('/conditions') ||
        decodedPath.includes('/cgu') ||
        decodedPath.includes('/terms') ||
        decodedPath.includes('/tos')
      ) {
        return 'tos';
      }

      if (
        decodedPath.includes('politique') ||
        decodedPath.includes('confidentialit') ||
        decodedPath.includes('privacy')
      ) {
        return 'privacy';
      }

      if (decodedPath.includes('/faq')) return 'faq';
      if (decodedPath.includes('/contact')) return 'contact';
      if (decodedPath.includes('/guide')) return 'guide';
      if (decodedPath.includes('/reset-password')) return 'reset-password';
      if (decodedPath.includes('/admin')) return 'admin';
      if (decodedPath.includes('/bookings') || decodedPath.includes('/reservations')) return 'bookings';
      if (decodedPath.includes('/messages') || decodedPath.includes('/chat')) return 'messages';
      if (decodedPath.includes('/favorites') || decodedPath.includes('/favoris')) return 'favorites';
      if (decodedPath.includes('/profile') || decodedPath.includes('/profil')) return 'profile';

    } catch (err) {
      console.error("Error parsing URL view:", err);
    }

    return 'home';
  };

  const [view, setView] = useState<'home' | 'showcase' | 'search' | 'details' | 'admin' | 'bookings' | 'owner-dashboard' | 'profile' | 'messages' | 'favorites' | 'tos' | 'privacy' | 'faq' | 'contact' | 'guide' | 'reset-password'>(parseViewFromUrl);
  const [selectedResidence, setSelectedResidence] = useState<Residence | null>(null);

  // URL parsing and popstate sync
  useEffect(() => {
    const handleUrlChange = () => {
      const detectedView = parseViewFromUrl();
      setView(detectedView);
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [viewType, setViewType] = useState<'list' | 'map'>('list');
  const [isTestMode, setIsTestMode] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [isOnline, setIsOnline] = useState(() => typeof window !== 'undefined' ? window.navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  const [wishlistRefresh, setWishlistRefresh] = useState(0);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [globalAnnouncement, setGlobalAnnouncement] = useState<{
    text: string;
    type: 'info' | 'warning' | 'success' | 'danger';
    active: boolean;
  } | null>(null);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [enablePhoneCalls, setEnablePhoneCalls] = useState<boolean>(true);
  const [enableWhatsApp, setEnableWhatsApp] = useState<boolean>(true);
  const [minReservationAmountEnabled, setMinReservationAmountEnabled] = useState<boolean>(false);
  const [minReservationAmount, setMinReservationAmount] = useState<number>(5000);
  const [maxBookingsWithoutId, setMaxBookingsWithoutId] = useState<number>(3);
  const [clientBookingCount, setClientBookingCount] = useState<number>(0);
  const [promoPopupConfig, setPromoPopupConfig] = useState<PromoPopupConfig | null>(null);

  useEffect(() => {
    apiFetch('/api/settings/promo_popup')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setPromoPopupConfig(data as unknown as PromoPopupConfig);
        }
      })
      .catch(err => console.error("Error fetching promo popup settings:", err));
  }, [lastRefresh]);

  const announcementsList = globalAnnouncement && globalAnnouncement.text
    ? globalAnnouncement.text.split('\n').map(t => t.trim()).filter(t => t.length > 0)
    : [];

  // Handle Capacitor back button
  useEffect(() => {
    let backButtonListener: any = null;

    const setupBackButton = async () => {
      try {
        const { App: CapacitorApp } = await import('@capacitor/app');
        backButtonListener = await CapacitorApp.addListener('backButton', () => {
          if (view === 'home') {
            CapacitorApp.exitApp();
          } else if (view === 'details') {
            setView('search');
          } else {
            setView('home');
          }
        });
      } catch (e) {
        // Not in Capacitor environment, ignore
      }
    };

    setupBackButton();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [view]);

  useEffect(() => {
    if (announcementsList.length > 1) {
      const interval = setInterval(() => {
        setCurrentAnnouncementIndex((prev) => (prev + 1) % announcementsList.length);
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setCurrentAnnouncementIndex(0);
    }
  }, [globalAnnouncement?.text]);

  // New Booking date states
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  // Global Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'confirm' | 'info' | 'error';
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const handleNavigate = (v: typeof view) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window !== 'undefined') {
      let targetPath = '/';
      if (v === 'tos') targetPath = '/Conditions_Generales';
      else if (v === 'privacy') targetPath = '/Politique_de_Confidentialite';
      else if (v === 'faq') targetPath = '/faq';
      else if (v === 'contact') targetPath = '/contact';
      else if (v === 'guide') targetPath = '/guide';
      else if (v === 'reset-password') targetPath = '/reset-password';
      else if (v === 'admin') targetPath = '/admin';
      else if (v === 'bookings') targetPath = '/bookings';
      else if (v === 'messages') targetPath = '/messages';
      else if (v === 'favorites') targetPath = '/favorites';
      else if (v === 'profile') targetPath = '/profile';

      try {
        if (decodeURIComponent(window.location.pathname) !== targetPath) {
          window.history.pushState({}, '', targetPath);
        }
      } catch (_) {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  // Database list and loadings - Redundant now
  const [homePage, setHomePage] = useState(1);
  const [commissionRate, setCommissionRate] = useState<number>(8);

  // Search filter options
  const [searchFilters, setSearchFilters] = useState<{
    cityId: string;
    neighborhoodId: string;
    type: string;
    capacity: number;
    amenities: string[];
  } | null>(null);

  useEffect(() => {
    setHomePage(1);
  }, [searchFilters]);

  // Synchroniser le Mode Test avec les Paramètres Globaux (API) - Now handled by React Query GS query
  
  // Fetch client bookings count to enforce the verification limit
  useEffect(() => {
    if (user && profile?.role === 'client') {
      getClientBookings(user.uid).then(list => {
        setClientBookingCount(list ? list.length : 0);
      }).catch(err => {
        console.error("Error fetching client bookings for restriction:", err);
      });
    }
  }, [user, profile, view, lastRefresh]);

  // Fetch residences from API - Now handled by React Query useResidences
  
  const handleResidenceClick = (residence: Residence) => {
    setSelectedResidence(residence);
    handleNavigate('details');
  };

  const [selectedResidenceBookings, setSelectedResidenceBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedResidence) {
      setSelectedResidenceBookings([]);
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (!checkIn || checkIn < todayStr) {
      setCheckIn(todayStr);
    }
    if (!checkOut || checkOut <= (checkIn && checkIn >= todayStr ? checkIn : todayStr)) {
      setCheckOut(tomorrowStr);
    }

    const fetchSelectedBookings = async () => {
      try {
        const response = await apiFetch(`/api/residences/${selectedResidence.id}/bookings`);
        if (response.ok) {
          const data = await response.json();
          setSelectedResidenceBookings(data);
        }
      } catch (err) {
        console.error("Error loading selectedResidence Bookings:", err);
      }
    };
    fetchSelectedBookings();
  }, [selectedResidence]);

  const handleBackToList = () => {
    setSelectedResidence(null);
    setCheckIn('');
    setCheckOut('');
    handleNavigate('home');
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diff = end.getTime() - start.getTime();
    const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const calculateTotal = (res: Residence) => {
    if (!res) return 0;
    const nights = calculateNights();
    
    // Base price per night detection (handles aliased and raw database names)
    const rawPrice = res.promoPrice ?? res.promo_price ?? res.pricePerNight ?? res.price_per_night ?? 0;
    let pricePerNight = Number(rawPrice);
    
    // Check tiered pricing (degressive)
    if (res.pricingTiers && Array.isArray(res.pricingTiers) && res.pricingTiers.length > 0) {
      const applicableTiers = [...res.pricingTiers]
        .filter(tier => nights >= tier.minNights)
        .sort((a, b) => b.minNights - a.minNights);
      
      if (applicableTiers.length > 0) {
        pricePerNight = Number(applicableTiers[0].pricePerNight);
      }
    }
    
    // Apply duration discounts (legacy percentage-based)
    let discount = 0;
    if (nights >= 28 && (res.monthlyDiscount || res.monthly_discount)) {
      discount = Number(res.monthlyDiscount || res.monthly_discount);
    } else if (nights >= 7 && (res.weeklyDiscount || res.weekly_discount)) {
      discount = Number(res.weeklyDiscount || res.weekly_discount);
    }

    const base = (pricePerNight * nights) * (1 - (discount || 0) / 100);
    const cleaning = Number(res.cleaningFee || res.cleaning_fee || 0);
    const extraService = Number(res.serviceFee || res.service_fee || 0);
    
    const clientFee = clientServiceFeeEnabled 
      ? Math.round(base * (clientServiceFeePercentage / 100))
      : 0;

    const total = base + cleaning + extraService + clientFee;
    
    if (isNaN(total) || total < 0) return 0;
    return Math.round(total);
  };

  const calculateClientServiceFeeAmount = (res: Residence) => {
    if (!res || !clientServiceFeeEnabled) return 0;
    const nights = calculateNights();
    const rawPrice = res.promoPrice ?? res.promo_price ?? res.pricePerNight ?? res.price_per_night ?? 0;
    let pricePerNight = Number(rawPrice);
    if (res.pricingTiers && Array.isArray(res.pricingTiers) && res.pricingTiers.length > 0) {
      const applicableTiers = [...res.pricingTiers]
        .filter(tier => nights >= tier.minNights)
        .sort((a, b) => b.minNights - a.minNights);
      if (applicableTiers.length > 0) {
        pricePerNight = Number(applicableTiers[0].pricePerNight);
      }
    }
    let discount = 0;
    if (nights >= 28 && (res.monthlyDiscount || res.monthly_discount)) {
      discount = Number(res.monthlyDiscount || res.monthly_discount);
    } else if (nights >= 7 && (res.weeklyDiscount || res.weekly_discount)) {
      discount = Number(res.weeklyDiscount || res.weekly_discount);
    }
    const base = (pricePerNight * nights) * (1 - (discount || 0) / 100);
    return Math.round(base * (clientServiceFeePercentage / 100));
  };

  const calculateAdvance = (res: Residence) => {
    const total = calculateTotal(res);
    const advancePercent = res.advancePercentage !== undefined && res.advancePercentage !== null 
      ? res.advancePercentage 
      : (res.advance_percentage !== undefined && res.advance_percentage !== null ? res.advance_percentage : 100);
    return Math.round(total * (advancePercent / 100));
  };

  const handleSearchTrigger = (filters: typeof searchFilters) => {
    setSearchFilters(filters);
    window.scrollTo(0, 500); // Smooth scroll to the results area
  };

  // Compute fully filtered listings on the client dynamically
  const filteredResidences = residences.filter(res => {
    if (!searchFilters) return true;

    // 1. City Match
    if (searchFilters.cityId) {
      const city = BURKINA_LOCATIONS.find(c => c.id === searchFilters.cityId);
      const citySearch = (city ? city.name : searchFilters.cityId).toLowerCase().trim();
      const resCity = (res.address.city || '').toLowerCase().trim();
      // Handle fuzzy matching like "Bobo-Dioulasso" vs "Bobo Dioulasso"
      const normalize = (s: string) => s.replace(/-/g, ' ').replace(/\s+/g, ' ');
      const matchesCity = normalize(resCity).includes(normalize(citySearch)) || 
                         normalize(citySearch).includes(normalize(resCity));
      if (!matchesCity) return false;
    }

    // 2. Neighborhood Match
    if (searchFilters.neighborhoodId) {
      // Find the neighborhood name from our locations constant
      let nbName = '';
      for (const city of BURKINA_LOCATIONS) {
        const found = city.neighborhoods.find(n => n.id === searchFilters.neighborhoodId);
        if (found) {
          nbName = found.name.toLowerCase().trim();
          break;
        }
      }
      
      const searchNb = (nbName || searchFilters.neighborhoodId).toLowerCase().trim();
      const resNb = (res.address.neighborhood || '').toLowerCase().trim();
      const normalizeNb = (s: string) => s.replace(/['’]/g, '').replace(/\s+/g, ' ');
      const matchesNb = normalizeNb(resNb).includes(normalizeNb(searchNb)) || 
                       normalizeNb(searchNb).includes(normalizeNb(resNb));
      if (!matchesNb) return false;
    }

    // 3. Housing Type
    if (searchFilters.type && searchFilters.type !== 'Tout type') {
      const resType = (res.type || '').toLowerCase().trim();
      const searchType = searchFilters.type.toLowerCase().trim();
      if (resType !== searchType) return false;
    }

    // 4. Capacity
    if (searchFilters.capacity) {
      const resCap = Number(res.capacity) || 0;
      if (resCap < Number(searchFilters.capacity)) return false;
    }

    // 5. Amenities
    if (searchFilters.amenities && searchFilters.amenities.length > 0) {
      const resAm = res.amenities || [];
      const matchesAllAmenities = searchFilters.amenities.every(am => 
        resAm.includes(am)
      );
      if (!matchesAllAmenities) return false;
    }

    return true;
  });

  // Suggest next available dates if conflict
  const suggestAlternativeDates = (conflicts: any[], checkIn: string, checkOut: string) => {
    const desiredNights = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24);
    
    // Simple logic: sort by end date and find a gap
    const sorted = [...conflicts].sort((a, b) => new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime());
    let nextPossibleStart = new Date(sorted[sorted.length - 1].checkOut);
    // Add 1 day
    nextPossibleStart.setDate(nextPossibleStart.getDate() + 1);
    
    const nextStartStr = nextPossibleStart.toISOString().split('T')[0];
    const nextEnd = new Date(nextPossibleStart);
    nextEnd.setDate(nextEnd.getDate() + desiredNights);
    const nextEndStr = nextEnd.toISOString().split('T')[0];
    
    return { nextStartStr, nextEndStr };
  };

  const getActiveConflicts = () => {
    if (!checkIn || !checkOut || !selectedResidenceBookings.length) return [];
    const dStart = new Date(checkIn);
    const dEnd = new Date(checkOut);
    
    return selectedResidenceBookings.filter((b: any) => {
      const bStart = new Date(b.checkIn);
      const bEnd = new Date(b.checkOut);
      return (dStart <= bEnd && dEnd >= bStart);
    });
  };

  const handleContactHost = async (ownerId: string, residenceId?: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setLoading(true);
    try {
      const convId = await getOrCreateConversation([user.uid, ownerId], residenceId);
      handleNavigate('messages');
      // We'll need a way for MessagesView to auto-select this convId
      // Let's add a state for it
      setInitialConversationId(convId);
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'ouverture de la messagerie.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);

  // Handle Booking creation in Firestore
  const handleConfirmBooking = async () => {
    if (!selectedResidence) return;

    if (!user) {
      addToast("Veuillez d'abord vous connecter pour effectuer une réservation.", 'info');
      setIsAuthOpen(true);
      return;
    }

    if (profile?.isSuspended) {
      addToast("Votre compte est actuellement suspendu par l'administration Faso. Vous ne pouvez pas faire de nouvelle demande de séjour.", 'error');
      return;
    }

    const hasUploadedId = !!(profile?.identityDocumentFront || profile?.idCardUrl || profile?.idNumber);
    if (!hasUploadedId && clientBookingCount >= maxBookingsWithoutId) {
      addToast(`Votre compte est restreint car vous avez atteint la limite de ${maxBookingsWithoutId} réservation(s) sans pièce d'identité. Veuillez ajouter votre pièce d'identité dans les Paramètres du Profil.`, 'error');
      setView('profile');
      return;
    }

    try {
      // 1. Check for availability conflicts
      const response = await apiFetch(`/api/residences/${selectedResidence.id}/bookings`);
      if (!response.ok) throw new Error("Erreur lors de la vérification de disponibilité");
      const confirmedBookings = await response.json();

      const dStart = new Date(checkIn);
      const dEnd = new Date(checkOut);

      const todayStr = new Date().toISOString().split('T')[0];
      if (!checkIn || !checkOut) {
        addToast("Veuillez sélectionner vos dates d'arrivée et de départ.", "error");
        return;
      }
      if (checkIn < todayStr) {
        addToast("Impossible de réserver pour une date passée. La date d'arrivée doit être aujourd'hui ou ultérieure.", "error");
        return;
      }
      if (checkOut <= checkIn) {
        addToast("La date de départ doit être supérieure à la date d'arrivée.", "error");
        return;
      }

      const conflicts = confirmedBookings.filter((b: any) => {
        const bStart = new Date(b.checkIn);
        const bEnd = new Date(b.checkOut);
        return (dStart <= bEnd && dEnd >= bStart);
      });

      if (conflicts.length > 0) {
        const { nextStartStr, nextEndStr } = suggestAlternativeDates(conflicts, checkIn, checkOut);
        
        setModalConfig({
          isOpen: true,
          type: 'confirm',
          title: 'Note de Disponibilité',
          message: `Désolé, cette résidence est déjà occupée ou réservée aux dates choisies.\n\nSouhaitez-vous plutôt envoyer votre demande pour les prochaines dates libres : du ${nextStartStr} au ${nextEndStr} ?`,
          confirmLabel: 'Oui, changer',
          cancelLabel: 'Annuler',
          onConfirm: () => {
            setCheckIn(nextStartStr);
            setCheckOut(nextEndStr);
            addToast("Dates mises à jour ! Veuillez cliquer à nouveau sur 'Confirmer la Réservation' pour envoyer votre demande à l'hôte.", 'info');
          }
        });
        return;
      }

      const totalAmount = calculateTotal(selectedResidence);
      if (minReservationAmountEnabled && totalAmount < minReservationAmount) {
        addToast(`Le montant total du séjour doit être d'au moins ${formatFCFA(minReservationAmount)} pour pouvoir réserver.`, "error");
        return;
      }
      const advanceAmount = calculateAdvance(selectedResidence);
      const clientServiceFeeVal = calculateClientServiceFeeAmount(selectedResidence);
      const nightsVal = calculateNights();
      const platformCommVal = Math.round((totalAmount - clientServiceFeeVal) * (commissionRate / 100));
      
      const netPriceNight = selectedResidence.ownerNetPricePerNight || 0;
      const demFeeNight = selectedResidence.demarcheurFeePerNight || 0;
      const isDem = selectedResidence.isManagedByDemarcheur;
      const payer = selectedResidence.commissionPayer || 'owner';

      let ownerNetVal = 0;
      let demarcheurFeeVal = 0;

      if (isDem && (netPriceNight > 0 || demFeeNight > 0)) {
        const publicStayPrice = totalAmount - clientServiceFeeVal;
        if (payer === 'owner') {
          demarcheurFeeVal = demFeeNight * nightsVal;
          ownerNetVal = Math.max(0, publicStayPrice - platformCommVal - demarcheurFeeVal);
        } else if (payer === 'demarcheur') {
          ownerNetVal = netPriceNight * nightsVal;
          demarcheurFeeVal = Math.max(0, publicStayPrice - platformCommVal - ownerNetVal);
        } else if (payer === 'shared') {
          ownerNetVal = Math.round((netPriceNight * nightsVal) * 0.90);
          demarcheurFeeVal = Math.round((demFeeNight * nightsVal) * 0.90);
        } else {
          demarcheurFeeVal = demFeeNight * nightsVal;
          ownerNetVal = Math.max(0, publicStayPrice - platformCommVal - demarcheurFeeVal);
        }
      } else {
        ownerNetVal = Math.max(0, (totalAmount - clientServiceFeeVal) - platformCommVal);
        demarcheurFeeVal = 0;
      }

      const bookingPayload = {
        residenceId: selectedResidence.id,
        ownerId: selectedResidence.ownerId,
        clientId: user.uid,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: searchFilters?.capacity || 1,
        totalPrice: totalAmount,
        advancePaid: advanceAmount,
        clientServiceFee: clientServiceFeeVal,
        platformCommission: platformCommVal,
        ownerNetEarnings: ownerNetVal,
        demarcheurEarnings: demarcheurFeeVal,
        bookingStatus: 'pending' as const, // En attente d'approbation d'hôte
        paymentStatus: 'pending' as const, // Pay progress starts
        createdAt: new Date().toISOString(),
      };

      const newBookingId = await createBooking(bookingPayload);
      
      // Notify host instantly with detailed info
      await sendNotification({
        userId: selectedResidence.ownerId,
        title: "Nouvelle Demande de Réservation ! 📥",
        message: `La résidence "${selectedResidence.title}" a reçu une demande du ${checkIn} au ${checkOut} (Total: ${formatCurrency(totalAmount)} F CFA, Acompte requis : ${formatCurrency(advanceAmount)} F CFA). Veuillez l'approuver ou la décliner depuis votre Dashboard.`,
        type: 'booking',
        referenceId: newBookingId
      });

      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'Réservation Envoyée !',
        message: "Votre demande de réservation a été envoyée avec succès au propriétaire ! Vous allez être redirigé vers l'onglet 'Mes Réservations' pour suivre son statut.",
        onConfirm: () => {
          setSelectedResidence(null);
          handleNavigate('bookings');
        }
      });
    } catch (err: any) {
      console.error("[Booking Error]:", err);
      const errorMessage = err?.message || "Échec de la soumission de la réservation.";
      addToast(errorMessage, 'error');
    }
  };

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300",
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
    )}>
      {/* Dynamic Branding Stylesheet */}
      <style>{`
        :root {
          --brand-primary: ${branding.primaryColor || '#10b981'};
          --brand-primary-dark: ${darkenColor(branding.primaryColor || '#10b981', 15)};
          --brand-primary-light: ${adjustBrightness(branding.primaryColor || '#10b981', 85)};
          --brand-secondary: ${branding.secondaryColor || '#ef4444'};
          --brand-secondary-dark: ${darkenColor(branding.secondaryColor || '#ef4444', 15)};
          --brand-secondary-light: ${adjustBrightness(branding.secondaryColor || '#ef4444', 85)};
        }
        /* Brand primary & secondary dynamic mappings */
        .text-brand-primary, .text-primary { color: var(--brand-primary) !important; }
        .text-brand-secondary, .text-secondary { color: var(--brand-secondary) !important; }
        .bg-brand-primary, .bg-primary { background-color: var(--brand-primary) !important; }
        .bg-brand-primary-dark, .bg-primary-dark { background-color: var(--brand-primary-dark) !important; }
        .bg-brand-secondary, .bg-secondary { background-color: var(--brand-secondary) !important; }
        .border-brand-primary, .border-primary { border-color: var(--brand-primary) !important; }
        .border-brand-secondary, .border-secondary { border-color: var(--brand-secondary) !important; }

        /* Subtle brand button highlights without hijacking semantic light alerts */
        .btn-brand-primary { background-color: var(--brand-primary) !important; color: #ffffff !important; }
        .btn-brand-primary:hover { background-color: var(--brand-primary-dark) !important; }
        .btn-brand-secondary { background-color: var(--brand-secondary) !important; color: #ffffff !important; }
        .btn-brand-secondary:hover { background-color: var(--brand-secondary-dark) !important; }

        /* Custom branding & algorithmic shade helpers */
        .text-brand-primary, .text-primary { color: var(--brand-primary) !important; }
        .text-brand-secondary, .text-secondary { color: var(--brand-secondary) !important; }
        .bg-brand-primary, .bg-primary { background-color: var(--brand-primary) !important; }
        .bg-brand-primary-dark, .bg-primary-dark { background-color: var(--brand-primary-dark) !important; }
        .bg-brand-secondary, .bg-secondary { background-color: var(--brand-secondary) !important; }
        .border-brand-primary, .border-primary { border-color: var(--brand-primary) !important; }
        .border-brand-secondary, .border-secondary { border-color: var(--brand-secondary) !important; }
        .hover\\:bg-brand-primary-dark:hover, .hover\\:bg-primary-dark:hover {
          background-color: var(--brand-primary-dark) !important;
        }
        .focus\\:ring-brand-primary:focus, .focus\\:ring-primary:focus {
          --tw-ring-color: var(--brand-primary) !important;
        }
      `}</style>

      {/* 60 FPS Event Canvas Engine */}
      <EventCanvasEffects
        snow={branding.snowParticles}
        rain={branding.rainParticles}
        harmattan={branding.harmattanParticles}
        confetti={branding.confettiParticles}
        hearts={branding.heartsParticles}
        stars={branding.starsParticles}
        petals={branding.petalsParticles}
      />

      {/* Seasonal & Holiday Visual Ornaments */}
      <EventOrnaments
        theme={branding.activeTheme}
        enabled={branding.ornamentsEnabled}
      />

      {/* Christmas Lights Garland (Header) */}
      {branding.christmasLights && <ChristmasLights />}

      <AnimatePresence mode="wait">
        {loading && <LoadingScreen key="loading-screen" onDismiss={() => setLoading(false)} />}
      </AnimatePresence>

      {announcements && announcements.filter(a => a.active).length > 0 && !isAnnouncementDismissed && (
        <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 text-white py-2 z-[100] shadow-md flex items-center select-none" id="app-global-announcement-banner">
          {/* Left Megaphone Icon Fixed Overlay with live pulse */}
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-gradient-to-r from-slate-950 via-slate-900 to-transparent flex items-center z-10 gap-2 font-black text-xs uppercase tracking-wider text-red-500">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="hidden md:inline text-white/90">Flash Info</span>
          </div>

          {/* Marquee Wrapper */}
          <div className="w-full overflow-hidden flex items-center h-8 ml-8 md:ml-32 pr-12">
            <div className="animate-marquee hover:[animation-play-state:paused] flex items-center gap-16 py-1">
              {[...announcements.filter(a => a.active), ...announcements.filter(a => a.active)].map((ann, idx) => {
                const badgeColors: Record<string, string> = {
                  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 font-bold animate-pulse'
                };
                return (
                  <div key={`${ann.id}-${idx}`} className="flex items-center gap-2.5 shrink-0">
                    <span className="text-base select-none">{ann.emoji || '📢'}</span>
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider", badgeColors[ann.type || 'info'])}>
                      {ann.type === 'danger' ? 'ALERTE' : 'INFO'}
                    </span>
                    <p className="text-xs md:text-sm font-semibold tracking-wide text-slate-100">
                      {ann.text}
                    </p>
                    <span className="text-slate-600 font-bold mx-2">•</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Close button at the right */}
          <div className="absolute right-0 top-0 bottom-0 px-3 bg-gradient-to-l from-slate-950 via-slate-900 to-transparent flex items-center z-10">
            <button 
              onClick={() => setIsAnnouncementDismissed(true)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Masquer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <Navbar 
        onNavigate={(v) => {
          if (v === 'home' || v === 'search') {
            setSearchFilters(null);
            setSelectedResidence(null);
          }
          handleNavigate(v);
        }} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        activeView={view}
      />
      
      {!!profile?.isSuspended && (
        <div className="bg-red-600 text-white font-black text-center py-4.5 px-6 text-xs uppercase tracking-widest shadow-lg border-b border-red-700 animate-in fade-in slide-in-from-top duration-500 z-50 relative font-sans">
          ⚠️ Attention : Votre compte a été suspendu par l'administration de la plateforme. Toute création de réservation ou d'hébergement est formellement bloquée.
        </div>
      )}

      {!isOnline && (
        <div className="bg-slate-900 text-white font-black text-center py-2.5 px-6 text-xs uppercase tracking-widest shadow-lg border-b border-slate-950 animate-in fade-in slide-in-from-top duration-500 z-50 relative font-sans flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
          <span>🔴 Vous êtes en mode hors ligne</span>
        </div>
      )}

      {user && profile?.role === 'client' && clientBookingCount >= maxBookingsWithoutId && !(profile?.identityDocumentFront || profile?.idCardUrl || profile?.idNumber) && (
        <div className="bg-amber-600 text-white font-black text-center py-4.5 px-6 text-xs uppercase tracking-widest shadow-lg border-b border-amber-700 animate-in fade-in slide-in-from-top duration-500 z-50 relative font-sans">
          ⚠️ Compte Restreint : Vous avez atteint la limite de {maxBookingsWithoutId} réservation(s) sans pièce d'identité. Veuillez <button onClick={() => setView('profile')} className="underline font-black hover:text-slate-100 cursor-pointer">compléter votre dossier en ajoutant votre pièce d'identité</button> pour débloquer votre compte.
        </div>
      )}
      
      <main className="pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Hero />
              
              {/* Connected Search with live filters */}
              <div className="px-4">
                <SearchForm onSearch={handleSearchTrigger} />
              </div>

              {/* Catalog Sections */}
              <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                      {searchFilters ? "Résultats de Recherche" : "Découvrir le Burkina"}
                    </h2>
                    <p className="text-slate-500 font-medium">
                      {searchFilters 
                        ? `${filteredResidences.length} hébergements correspondent bien à vos critères.` 
                        : "Nos résidences de prestige les plus convoitées en ce moment."
                      }
                    </p>
                  </div>
                  
                  {/* List / Map toggle selector */}
                  <div className="flex items-center gap-2 bg-slate-105 p-1 rounded-2xl bg-slate-100 self-start sm:self-auto">
                    <button 
                      onClick={() => setViewType('list')}
                      className={cn("p-2 rounded-xl transition-all font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer", viewType === 'list' ? "bg-white text-red-600 shadow-sm" : "text-slate-400")}
                    >
                      <List size={16} />
                      Liste
                    </button>
                    <button 
                      onClick={() => setViewType('map')}
                      className={cn("p-2 rounded-xl transition-all font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer", viewType === 'map' ? "bg-white text-red-600 shadow-sm" : "text-slate-400")}
                    >
                      <MapIcon size={16} />
                      Carte
                    </button>
                  </div>
                </div>

                {filteredResidences.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center max-w-lg mx-auto">
                    <Compass size={40} className="text-slate-350 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-800 mb-1">Aucune résidence trouvée</h3>
                    <p className="text-slate-400 font-medium text-xs leading-relaxed mb-6">Nous n'avons pas d'hébergements publiées correspondant exactement à ces critères. Réessayez avec une autre zone ou moins de filtres.</p>
                    <button 
                      onClick={() => setSearchFilters(null)}
                      className="px-5 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Effacer les filtres
                    </button>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {viewType === 'list' ? (
                      <div className="flex flex-col gap-8">
                        <motion.div 
                          key="list"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5"
                        >
                          {filteredResidences.slice((homePage - 1) * 50, homePage * 50).map((res) => (
                            <ResidenceCard 
                              key={res.id}
                              residence={res} 
                              onClick={() => handleResidenceClick(res)} 
                              enablePhoneCalls={enablePhoneCalls}
                              enableWhatsApp={enableWhatsApp}
                            />
                          ))}
                        </motion.div>

                        {/* Pagination UI */}
                        {filteredResidences.length > 50 && (
                          <div className="flex items-center justify-between border-t border-slate-100 pt-6 px-2">
                            <div className="flex flex-1 justify-between sm:hidden">
                              <button
                                disabled={homePage === 1}
                                onClick={() => {
                                  setHomePage(prev => Math.max(prev - 1, 1));
                                  window.scrollTo({ top: 500, behavior: 'smooth' });
                                }}
                                className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                              >
                                Précédent
                              </button>
                              <button
                                disabled={homePage === Math.ceil(filteredResidences.length / 50)}
                                onClick={() => {
                                  setHomePage(prev => Math.min(prev + 1, Math.ceil(filteredResidences.length / 50)));
                                  window.scrollTo({ top: 500, behavior: 'smooth' });
                                }}
                                className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                              >
                                Suivant
                              </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs text-slate-500 font-bold">
                                  Affichage de <span className="font-extrabold text-slate-800">{Math.min((homePage - 1) * 50 + 1, filteredResidences.length)}</span> à{' '}
                                  <span className="font-extrabold text-slate-800">{Math.min(homePage * 50, filteredResidences.length)}</span> sur{' '}
                                  <span className="font-extrabold text-slate-800">{filteredResidences.length}</span> résidences
                                </p>
                              </div>
                              <div>
                                <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                                  <button
                                    disabled={homePage === 1}
                                    onClick={() => {
                                      setHomePage(prev => Math.max(prev - 1, 1));
                                      window.scrollTo({ top: 500, behavior: 'smooth' });
                                    }}
                                    className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                  
                                  {Array.from({ length: Math.ceil(filteredResidences.length / 50) }, (_, i) => i + 1).map((p) => (
                                    <button
                                      key={p}
                                      onClick={() => {
                                        setHomePage(p);
                                        window.scrollTo({ top: 500, behavior: 'smooth' });
                                      }}
                                      className={cn(
                                        "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                                        homePage === p
                                          ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                                          : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                                      )}
                                    >
                                      {p}
                                    </button>
                                  ))}

                                  <button
                                    disabled={homePage === Math.ceil(filteredResidences.length / 50)}
                                    onClick={() => {
                                      setHomePage(prev => Math.min(prev + 1, Math.ceil(filteredResidences.length / 50)));
                                      window.scrollTo({ top: 500, behavior: 'smooth' });
                                    }}
                                    className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                </nav>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <motion.div
                        key="map"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                      >
                        <MapView residences={filteredResidences} onResidenceClick={handleResidenceClick} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>

              <Partners />
              <Features />
            </motion.div>
          )}

          {view === 'details' && selectedResidence && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <ResidenceDetailView
                residence={selectedResidence}
                allResidences={residences}
                checkIn={checkIn}
                checkOut={checkOut}
                setCheckIn={setCheckIn}
                setCheckOut={setCheckOut}
                onBack={handleBackToList}
                onConfirmBooking={handleConfirmBooking}
                onResidenceClick={handleResidenceClick}
                onContactHost={handleContactHost}
                selectedResidenceBookings={selectedResidenceBookings}
                enablePhoneCalls={enablePhoneCalls}
                enableWhatsApp={enableWhatsApp}
                commissionRate={commissionRate}
                clientServiceFeeEnabled={clientServiceFeeEnabled}
                clientServiceFeePercentage={clientServiceFeePercentage}
                minReservationAmountEnabled={minReservationAmountEnabled}
                minReservationAmount={minReservationAmount}
                isDarkMode={isDarkMode}
              />
            </motion.div>
          )}

          {/* Guest Account view */}
          {view === 'bookings' && (
            <motion.div 
              key="bookings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <MyBookings onContactHost={handleContactHost} isTestMode={isTestMode} />
            </motion.div>
          )}

          {/* Messages view */}
          {view === 'messages' && (
            <motion.div 
              key="messages"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <MessagesView initialConversationId={initialConversationId} />
            </motion.div>
          )}

          {/* Profile and Settings */}
          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProfileSettings />
            </motion.div>
          )}

          {/* Favorites View */}
          {view === 'favorites' && (
            <motion.div 
              key="favorites"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-7xl mx-auto px-4 py-8"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">MES FAVORIS</h1>
                  <p className="text-slate-500 font-medium text-sm">Retrouvez les résidences que vous avez sauvegardées pour préparer votre séjour au Burkina Faso.</p>
                </div>
                <button
                  onClick={() => handleNavigate('home')}
                  className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-sm self-start cursor-pointer"
                >
                  Découvrir des résidences
                </button>
              </div>

              {residences.filter(r => {
                try {
                  const favs = JSON.parse(localStorage.getItem('resifaso_favorites') || '[]');
                  return Array.isArray(favs) ? favs.includes(r.id) : false;
                } catch (_) {
                  return false;
                }
              }).length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center max-w-xl mx-auto shadow-sm my-12">
                  <div className="inline-flex w-16 h-16 bg-red-50 text-red-600 rounded-3xl items-center justify-center mb-6">
                    <Heart size={28} className="animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Aucun favori pour le moment</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                    Explorez le catalogue des plus beaux appartements, villas et résidences de ResiFaso, puis cliquez sur le bouton coeur pour les ajouter ici.
                  </p>
                  <button
                    onClick={() => handleNavigate('home')}
                    className="bg-red-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition cursor-pointer"
                  >
                    Parcourir les résidences
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {residences
                    .filter(r => {
                      try {
                        const favs = JSON.parse(localStorage.getItem('resifaso_favorites') || '[]');
                        return Array.isArray(favs) ? favs.includes(r.id) : false;
                      } catch (_) {
                        return false;
                      }
                    })
                    .map((item) => (
                      <ResidenceCard 
                        key={`${item.id}-fav-${wishlistRefresh}`} 
                        residence={item} 
                        onClick={() => handleResidenceClick(item)}
                        enablePhoneCalls={enablePhoneCalls}
                        enableWhatsApp={enableWhatsApp}
                        onFavoriteToggle={() => {
                          setWishlistRefresh(prev => prev + 1);
                        }}
                      />
                    ))
                  }
                </div>
              )}
            </motion.div>
          )}

          {/* Owner accounts view */}
          {view === 'owner-dashboard' && (
            <motion.div 
              key="owner-dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <OwnerDashboard isTestMode={isTestMode} onBackToTraveler={() => handleNavigate('home')} />
            </motion.div>
          )}

          {/* Mod Admin view */}
          {view === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-7xl mx-auto px-4 py-8"
            >
              <AdminDashboard onBackToTraveler={() => handleNavigate('home')} />
            </motion.div>
          )}
          {/* Presentation Showcase view / Accueil */}
          {view === 'showcase' && (
            <motion.div key="showcase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ShowcasePage onNavigate={handleNavigate} onOpenAuth={() => setIsAuthOpen(true)} />
            </motion.div>
          )}

          {/* Legal views */}
          {view === 'tos' && (
            <motion.div key="tos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LegalPage type="tos" />
            </motion.div>
          )}
          {view === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LegalPage type="privacy" />
            </motion.div>
          )}
          {view === 'guide' && (
            <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LegalPage type="guide" />
            </motion.div>
          )}
          {view === 'faq' && (
            <motion.div key="faq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FAQPage />
            </motion.div>
          )}
          {view === 'reset-password' && (
            <motion.div key="reset-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResetPassword onNavigate={handleNavigate} />
            </motion.div>
          )}
          {view === 'contact' && (
            <motion.div key="contact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ContactPage onBack={() => handleNavigate('home')} onNavigateToFaq={() => handleNavigate('faq')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <Footer onNavigate={(v) => handleNavigate(v)} />

      {/* Account Login panel triggers */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onNavigate={handleNavigate} />
      
      <GlobalModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
      />
      
      <SupportChatWidget />
      <TermsGuideModal />
      
      {activeBookingForPayment && (
        <PaymentModal 
          isOpen={isPaymentOpen}
          onClose={() => {
            setIsPaymentOpen(false);
            setActiveBookingForPayment(null);
          }}
          amount={activeBookingForPayment.amount}
          isFinalPayment={activeBookingForPayment.amount >= (activeBookingForPayment.totalPrice || activeBookingForPayment.amount)}
          paymentType={activeBookingForPayment.amount >= (activeBookingForPayment.totalPrice || activeBookingForPayment.amount) ? 'full' : 'advance'}
          residenceTitle={activeBookingForPayment.title}
          isTestMode={isTestMode}
          utilitiesIncluded={activeBookingForPayment ? residences.find(r => r.id === activeBookingForPayment.residenceId)?.utilitiesIncluded : undefined}
          bookingId={activeBookingForPayment.id}
          onSuccess={async () => {
            if (activeBookingForPayment?.id) {
              try {
                const isFullyPaid = activeBookingForPayment.amount >= (activeBookingForPayment.totalPrice || activeBookingForPayment.amount);
                await updateBookingStatus(activeBookingForPayment.id, {
                  paymentStatus: isFullyPaid ? 'fully_paid' : 'advance_paid'
                });
                addToast(
                  isFullyPaid 
                    ? "Paiement intégral réussi ! Votre séjour est entièrement réglé et confirmé."
                    : "Paiement de l'acompte réussi ! Votre réservation est maintenant confirmée.", 
                  'success'
                );
              } catch (err) {
                console.error("Failed to update booking status after payment:", err);
              }
            }
          }}
        />
      )}

      {/* Global Promotional Interstitial Popup */}
      <PromoPopupModal 
        config={promoPopupConfig} 
        currentPage={view === 'home' ? 'home' : view === 'search' ? 'search' : 'all'} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <ToastProvider>
          <DataRefreshProvider>
            <AppContent />
          </DataRefreshProvider>
        </ToastProvider>
      </RoleProvider>
    </AuthProvider>
  );
}
