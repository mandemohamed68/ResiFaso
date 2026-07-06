import { formatCurrency } from './utils/currency';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { Navbar } from './components/common/Navbar';
import { Hero } from './components/home/Hero';
import { SearchForm } from './components/search/SearchForm';
import { ResidenceCard } from './components/search/ResidenceCard';
import { PaymentModal } from './components/booking/PaymentModal';
import { MyBookings } from './components/booking/MyBookings';
import { OwnerDashboard } from './components/booking/OwnerDashboard';
import { AuthModal } from './components/common/AuthModal';
import { Residence } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Filter, Map as MapIcon, List, ArrowRight, Star, 
  CheckCircle2, ShieldCheck, RefreshCw, Compass, MessageSquare,
  ChevronLeft, ChevronRight, Phone, Heart, Megaphone, X, Share2, Check, Calendar as CalendarIcon, ShieldAlert
} from 'lucide-react';
import { cn, formatFCFA } from './lib/utils';
import { MapView } from './components/search/MapView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MessagesView } from './components/messaging/MessagesView';
import { 
  seedDatabaseIfNeeded, 
  createBooking, 
  getOrCreateConversation,
  updateBookingStatus,
  sendNotification
} from './lib/db';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { LegalPage } from './components/legal/LegalPage';
import { FAQPage } from './components/legal/FAQPage';
import { ContactPage } from './components/legal/ContactPage';
import { ResetPassword } from './components/auth/ResetPassword';
import { Footer } from './components/common/Footer';
import { BURKINA_LOCATIONS } from './constants/locations';
import { GlobalModal } from './components/common/GlobalModal';

function AppContent() {
  const { user, profile, loginAsMock, logOut } = useAuth();
  const { currentRole, setCurrentRole } = useRole();
  const { addToast } = useToast();
  
  const [view, setView] = useState<'home' | 'search' | 'details' | 'admin' | 'bookings' | 'owner-dashboard' | 'profile' | 'messages' | 'favorites' | 'tos' | 'privacy' | 'faq' | 'contact' | 'guide' | 'reset-password'>('home');
  const [selectedResidence, setSelectedResidence] = useState<Residence | null>(null);

  // URL parsing for views (like reset-password)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'reset-password') {
      setView('reset-password');
    }
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
  const [globalAnnouncement, setGlobalAnnouncement] = useState<{
    text: string;
    type: 'info' | 'warning' | 'success' | 'danger';
    active: boolean;
  } | null>(null);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);
  const [enablePhoneCalls, setEnablePhoneCalls] = useState<boolean>(true);
  const [enableWhatsApp, setEnableWhatsApp] = useState<boolean>(true);

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
  };

  // Database list and loadings
  const [residences, setResidences] = useState<Residence[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState<number>(8);

  // Search filter options
  const [searchFilters, setSearchFilters] = useState<{
    cityId: string;
    neighborhoodId: string;
    type: string;
    capacity: number;
    amenities: string[];
  } | null>(null);

  // Synchroniser le Mode Test avec les Paramètres Globaux (API)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/global');
        if (response.ok) {
          const data = await response.json();
          if (data.isTestMode !== undefined) setIsTestMode(data.isTestMode);
          if (data.commissionRate !== undefined) setCommissionRate(data.commissionRate);
          if (data.enablePhoneCalls !== undefined) setEnablePhoneCalls(data.enablePhoneCalls);
          if (data.enableWhatsApp !== undefined) setEnableWhatsApp(data.enableWhatsApp);
          if (data.announcement) {
            setGlobalAnnouncement({
              text: data.announcement.text || '',
              type: data.announcement.type || 'info',
              active: !!data.announcement.active
            });
            setIsAnnouncementDismissed(false);
          }
        }
      } catch (err) {
        console.error("Error fetching global settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Fetch residences from API
  useEffect(() => {
    const fetchResidences = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/residences');
        if (response.ok) {
          const data = await response.json();
          // Filter published only if needed (backend should ideally handle this)
          const published = data.filter((r: any) => r.status === 'published');
          setResidences(published);
        }
      } catch (err) {
        console.error("Error loading residences:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResidences();
  }, []);

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
    const fetchSelectedBookings = async () => {
      try {
        const response = await fetch(`/api/residences/${selectedResidence.id}/bookings`);
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
    const currentCommission = Number(commissionRate ?? 8);
    const platformService = base * (currentCommission / 100);
    const extraService = Number(res.serviceFee || res.service_fee || 0);
    
    const total = base + cleaning + platformService + extraService;
    
    if (isNaN(total) || total < 0) return 0;
    return Math.round(total);
  };

  const calculateAdvance = (res: Residence) => {
    const total = calculateTotal(res);
    const advancePercent = res.advancePercentage || 30;
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
      return (dStart < bEnd && dEnd > bStart);
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

    try {
      // 1. Check for availability conflicts
      const response = await fetch(`/api/residences/${selectedResidence.id}/bookings`);
      if (!response.ok) throw new Error("Erreur lors de la vérification de disponibilité");
      const confirmedBookings = await response.json();

      const dStart = new Date(checkIn);
      const dEnd = new Date(checkOut);

      const conflicts = confirmedBookings.filter((b: any) => {
        const bStart = new Date(b.checkIn);
        const bEnd = new Date(b.checkOut);
        return (dStart < bEnd && dEnd > bStart);
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
      const advanceAmount = calculateAdvance(selectedResidence);

      const bookingPayload = {
        residenceId: selectedResidence.id,
        ownerId: selectedResidence.ownerId,
        clientId: user.uid,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: 2,
        totalPrice: totalAmount,
        advancePaid: advanceAmount,
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
    } catch (err) {
      console.error(err);
      addToast("Échec de la soumission de la réservation.", 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 font-sans">

      {globalAnnouncement && globalAnnouncement.active && !isAnnouncementDismissed && (
        <div className={cn(
          "relative overflow-hidden border-b transition-all duration-500 animate-in fade-in slide-in-from-top-full z-[100] shadow-lg",
          globalAnnouncement.type === 'info' && "bg-slate-900 text-white border-slate-800",
          globalAnnouncement.type === 'warning' && "bg-amber-400 text-slate-950 border-amber-500 shadow-amber-100/20",
          globalAnnouncement.type === 'success' && "bg-emerald-600 text-white border-emerald-700",
          globalAnnouncement.type === 'danger' && "bg-red-600 text-white border-red-700 font-extrabold"
        )} id="app-global-announcement-banner">
          {/* Decorative background pulse */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse scale-150"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 py-3.5 sm:py-4 pr-14 flex items-center justify-center gap-4 relative">
            <div className={cn(
              "p-2 rounded-full flex-shrink-0 animate-bounce shadow-inner",
              globalAnnouncement.type === 'warning' ? "bg-amber-500 text-slate-950" : "bg-white/10 text-white"
            )}>
              <Megaphone size={16} className="stroke-[3]" />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
              <span className={cn(
                "text-[10px] uppercase font-black tracking-[0.2em] opacity-80",
                globalAnnouncement.type === 'warning' ? "text-slate-900" : "text-white/80"
              )}>
                {globalAnnouncement.type === 'danger' ? 'Alerte Critique' : 'Flash Info'}
              </span>
              <p className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                {globalAnnouncement.text}
              </p>
            </div>

            <button 
              onClick={() => setIsAnnouncementDismissed(true)}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-black/10 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-current group",
                globalAnnouncement.type === 'warning' ? "text-slate-900" : "text-white"
              )}
              title="Masquer l'annonce"
            >
              <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
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
      />
      
      {profile?.isSuspended && (
        <div className="bg-red-600 text-white font-black text-center py-4.5 px-6 text-xs uppercase tracking-widest shadow-lg border-b border-red-700 animate-in fade-in slide-in-from-top duration-500 z-50 relative">
          ⚠️ Attention : Votre compte a été suspendu par l'administration de la plateforme. Toute création de réservation ou d'hébergement est formellement bloquée.
        </div>
      )}
      
      <main>
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <RefreshCw size={36} className="text-red-600 animate-spin mb-3" />
                    <p className="text-slate-500 font-bold text-sm">Chargement du catalogue live...</p>
                  </div>
                ) : filteredResidences.length === 0 ? (
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
                      <motion.div 
                        key="list"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                      >
                        {filteredResidences.map((res) => (
                          <div key={res.id} className="relative">
                            {res.recommended && (
                              <span className="absolute top-3 left-3 bg-red-600 text-yellow-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md z-10 shadow-sm border border-red-500">
                                Recommended Faso ★
                              </span>
                            )}
                            <ResidenceCard 
                              residence={res} 
                              onClick={() => handleResidenceClick(res)} 
                              enablePhoneCalls={enablePhoneCalls}
                              enableWhatsApp={enableWhatsApp}
                            />
                          </div>
                        ))}
                      </motion.div>
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

              {/* Service Trust Cards Section */}
              <div className="bg-white py-16 mb-16 border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="group flex flex-col items-center justify-center p-12 bg-white border border-slate-100 hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 rounded-[2rem] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 relative z-10 shadow-sm">
                        <CheckCircle2 size={32} className="stroke-[2]" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4 text-center tracking-tight relative z-10">Sécurité Garantie</h3>
                      <p className="text-slate-500 text-sm text-center leading-relaxed max-w-[250px] relative z-10">Toutes nos résidences sont vérifiées manuellement par nos équipes.</p>
                    </div>
                    <div className="group flex flex-col items-center justify-center p-12 bg-white border border-slate-100 hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 rounded-[2rem] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 relative z-10 shadow-sm">
                        <Star size={32} className="stroke-[2]" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4 text-center tracking-tight relative z-10">Qualité Premium</h3>
                      <p className="text-slate-500 text-sm text-center leading-relaxed max-w-[250px] relative z-10">Nous sélectionnons uniquement les meilleurs logements pour vous.</p>
                    </div>
                    <div className="group flex flex-col items-center justify-center p-12 bg-white border border-slate-100 hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 rounded-[2rem] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 relative z-10 shadow-sm">
                        <ShieldCheck size={32} className="stroke-[2]" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4 text-center tracking-tight relative z-10">Support Local</h3>
                      <p className="text-slate-500 text-sm text-center leading-relaxed max-w-[250px] relative z-10">Une équipe sur place à Ouagadougou pour vous accompagner.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'details' && selectedResidence && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-7xl mx-auto px-4 py-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleBackToList}
                    className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-slate-50 px-4 py-2 rounded-xl shadow-sm"
                  >
                    <ArrowRight size={16} className="rotate-180" />
                    Retour à la Liste
                  </button>
                  <button 
                    onClick={() => {
                      const shareUrl = `${window.location.origin}?residence=${selectedResidence.id}`;
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        setIsLinkCopied(true);
                        setTimeout(() => setIsLinkCopied(false), 2000);
                      });
                    }}
                    className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-slate-50 px-4 py-2 rounded-xl relative overflow-hidden"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {isLinkCopied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="flex items-center gap-2 text-green-600"
                        >
                          <Check size={16} />
                          Copié
                        </motion.div>
                      ) : (
                        <motion.div
                          key="share"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Share2 size={16} />
                          Partager
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <div className="rounded-3xl overflow-hidden mb-8 shadow-lg relative group bg-slate-200">
                    {selectedResidence.images.length > 1 ? (
                      <div className="relative overflow-hidden group">
                        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar scroll-smooth" id="gallery-container">
                          {selectedResidence.images.map((img, idx) => (
                            <div key={idx} className="w-full shrink-0 snap-center relative">
                              <img 
                                src={img} 
                                alt={`${selectedResidence.title} - Photo ${idx + 1}`}
                                className="w-full aspect-[16/9] object-cover"
                              />
                              {/* Photo counter */}
                              <div className="absolute bottom-4 right-4 bg-slate-900/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-widest z-10">
                                {idx + 1} / {selectedResidence.images.length}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Navigation Arrows */}
                        <button 
                          onClick={() => {
                            const el = document.getElementById('gallery-container');
                            if (el) el.scrollBy({ left: -el.offsetWidth, behavior: 'smooth' });
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-sm rounded-full text-slate-800 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white"
                        >
                          <ChevronRight size={20} className="rotate-180" />
                        </button>
                        <button 
                          onClick={() => {
                            const el = document.getElementById('gallery-container');
                            if (el) el.scrollBy({ left: el.offsetWidth, behavior: 'smooth' });
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-sm rounded-full text-slate-800 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    ) : (
                      <img 
                        src={selectedResidence.images[0]} 
                        alt={selectedResidence.title}
                        className="w-full aspect-[16/9] object-cover"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-4 font-bold">
                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest leading-none">
                      {selectedResidence.type}
                    </span>
                    <div className="flex items-center gap-1 text-sm bg-white border border-slate-100 px-3 py-1 rounded-xl shadow-sm">
                      <Star size={16} className={cn("text-yellow-500", selectedResidence.rating ? "fill-yellow-500" : "")} />
                      <span className="font-black">{selectedResidence.rating || "4.8"} <span className="text-slate-400 font-bold">({selectedResidence.reviewCount || 24} avis)</span></span>
                    </div>
                    {selectedResidence.rooms && (
                      <div className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-xl">
                        {selectedResidence.rooms} Pièces
                      </div>
                    )}
                    {selectedResidence.utilitiesIncluded && (
                      <div className="flex gap-2">
                        {selectedResidence.utilitiesIncluded.water && (
                          <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-xl border border-blue-100">
                            Eau incluse
                          </div>
                        )}
                        {selectedResidence.utilitiesIncluded.electricity && (
                          <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-xl border border-amber-100">
                            Élec. incluse
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                      {selectedResidence.title}
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {enablePhoneCalls && (
                        <a 
                          href={`tel:${selectedResidence.ownerPhone || '70000000'}`}
                          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                        >
                          <Phone size={14} />
                          Appeler
                        </a>
                      )}
                      {enableWhatsApp && (
                        <a 
                          href={`https://wa.me/${(selectedResidence.ownerPhone || '70000000').replace(/\s+/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-green-600 transition-colors shadow-sm"
                        >
                          <MessageSquare size={14} />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-500 font-medium text-lg mb-8">
                    <span>{selectedResidence.address?.street || selectedResidence.street}, {selectedResidence.address?.neighborhood || selectedResidence.neighborhood}, {selectedResidence.address?.city || selectedResidence.city}</span>
                  </div>

                  <hr className="border-slate-100 mb-8" />

                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-4">Description</h2>
                    <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-red-500 relative">
                      <p className={cn("text-slate-600 leading-relaxed text-lg italic transition-all duration-300 overflow-hidden", !isDescriptionExpanded ? "max-h-32 sm:max-h-none" : "max-h-[1000px]")}>
                        {selectedResidence.description}
                      </p>
                      {!isDescriptionExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent sm:hidden flex items-end justify-center pb-2">
                          <button 
                            onClick={() => setIsDescriptionExpanded(true)}
                            className="bg-white px-4 py-1.5 rounded-full text-xs font-bold text-red-600 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            Lire la suite
                          </button>
                        </div>
                      )}
                      {isDescriptionExpanded && (
                        <div className="sm:hidden mt-4 text-center">
                          <button 
                            onClick={() => setIsDescriptionExpanded(false)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700 underline underline-offset-2"
                          >
                            Réduire
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-4">Charges & Services</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={`p-5 rounded-2xl border-2 ${selectedResidence.utilitiesIncluded?.water ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">Consommation Eau</span>
                          {selectedResidence.utilitiesIncluded?.water ? (
                            <CheckCircle2 size={16} className="text-blue-600" />
                          ) : (
                            <X size={16} className="text-slate-400" />
                          )}
                        </div>
                        <p className={`text-sm font-black ${selectedResidence.utilitiesIncluded?.water ? 'text-blue-900' : 'text-slate-600'}`}>
                          {selectedResidence.utilitiesIncluded?.water ? '✅ À LA CHARGE DE L\'HÔTE (INCLUS)' : '❌ À LA CHARGE DU CLIENT (NON INCLUS)'}
                        </p>
                      </div>
                      <div className={`p-5 rounded-2xl border-2 ${selectedResidence.utilitiesIncluded?.electricity ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">Consommation Électricité</span>
                          {selectedResidence.utilitiesIncluded?.electricity ? (
                            <CheckCircle2 size={16} className="text-amber-600" />
                          ) : (
                            <X size={16} className="text-slate-400" />
                          )}
                        </div>
                        <p className={`text-sm font-black ${selectedResidence.utilitiesIncluded?.electricity ? 'text-amber-900' : 'text-slate-600'}`}>
                          {selectedResidence.utilitiesIncluded?.electricity ? '✅ À LA CHARGE DE L\'HÔTE (INCLUS)' : '❌ À LA CHARGE DU CLIENT (NON INCLUS)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Équipements</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedResidence.amenities.map(item => (
                        <div key={item} className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl">
                          <CheckCircle2 size={20} className="text-green-600" />
                          <span className="font-semibold text-slate-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions Section */}
                  <div className="mt-16 pt-16 border-t border-slate-100">
                    <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                      <Compass className="text-red-600" size={24} />
                      Logements recommandés pour vous
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {residences
                        .filter(r => r.id !== selectedResidence.id && (r.type === selectedResidence.type || (r.address?.city || r.city) === (selectedResidence.address?.city || selectedResidence.city)))
                        .slice(0, 3)
                        .map(res => (
                          <ResidenceCard 
                            key={res.id} 
                            residence={res} 
                            onClick={() => handleResidenceClick(res)} 
                            enablePhoneCalls={enablePhoneCalls}
                            enableWhatsApp={enableWhatsApp}
                          />
                        ))
                      }
                      {residences.filter(r => r.id !== selectedResidence.id && (r.type === selectedResidence.type || (r.address?.city || r.city) === (selectedResidence.address?.city || selectedResidence.city))).length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                           <p className="text-slate-400 font-bold text-sm">Découvrez d'autres pépites burkinabè sur l'accueil.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-start-3">
                  <div className="sticky top-28 bg-white p-6 rounded-3xl border-2 border-red-100 shadow-2xl">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                      Finaliser la Réservation
                    </h2>

                          {/* Quick Utility Summary */}
                          <div className="flex flex-col gap-1.5 mb-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Inclus dans le séjour :</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedResidence.utilitiesIncluded?.water ? (
                                <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100 uppercase tracking-tight flex items-center gap-1.5">
                                  💧 EAU INCLUSE
                                </span>
                              ) : (
                                <span className="text-[10px] font-black bg-slate-50 text-slate-500 px-3 py-1.5 rounded-xl border border-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                                  💧 EAU NON INCLUSE
                                </span>
                              )}
                              {selectedResidence.utilitiesIncluded?.electricity ? (
                                <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100 uppercase tracking-tight flex items-center gap-1.5">
                                  ⚡ ÉLEC. INCLUSE
                                </span>
                              ) : (
                                <span className="text-[10px] font-black bg-slate-50 text-slate-500 px-3 py-1.5 rounded-xl border border-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                                  ⚡ ÉLEC. NON INCLUSE
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-baseline gap-1 mb-6">
                        {(selectedResidence.promoPrice || selectedResidence.promo_price) ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl font-black text-red-600 italic">{formatCurrency(selectedResidence.promoPrice || selectedResidence.promo_price)}</span>
                              <span className="text-sm font-bold text-slate-400 line-through">{formatCurrency(selectedResidence.pricePerNight || selectedResidence.price_per_night)} FCFA</span>
                            </div>
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 w-fit px-2 py-0.5 rounded mt-1">Offre Spéciale Faso</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(selectedResidence.pricePerNight || selectedResidence.price_per_night)}</span>
                            <span className="text-sm font-bold text-slate-900 uppercase">FCFA</span>
                          </>
                        )}
                        <span className="text-slate-500 font-medium">/ nuit</span>
                      </div>

                    <div className="space-y-4 mb-6">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><CalendarIcon size={12} /> Disponibilité (14 prochains jours)</label>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 14 }).map((_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() + i);
                            const dateStr = d.toISOString().split('T')[0];
                            const isBooked = selectedResidenceBookings.some((b: any) => 
                              b.bookingStatus === 'confirmed' && dateStr >= b.checkIn && dateStr < b.checkOut
                            );
                            const isToday = i === 0;
                            return (
                              <div 
                                key={dateStr}
                                title={isBooked ? "Occupé" : "Disponible"}
                                className={cn(
                                  "aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] border transition-colors relative cursor-help",
                                  isToday ? "border-slate-400 font-black" : "border-transparent text-slate-600 font-bold",
                                  isBooked ? "bg-red-50 text-red-400 line-through decoration-red-300" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                )}
                              >
                                <span>{d.getDate()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 p-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus-within:border-red-500 focus-within:bg-white transition-all">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Arrivée</label>
                          <input 
                            type="date" 
                            value={checkIn}
                            onChange={(e) => setCheckIn(e.target.value)}
                            className="bg-transparent border-none outline-none w-full font-bold text-slate-900 text-sm p-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 p-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus-within:border-red-500 focus-within:bg-white transition-all">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Départ</label>
                          <input 
                            type="date" 
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                            className="bg-transparent border-none outline-none w-full font-bold text-slate-900 text-sm p-0 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Durée du séjour</label>
                        <p className="font-bold text-slate-900 italic">{calculateNights()} nuit{calculateNights() > 1 ? 's' : ''}</p>
                      </div>

                      {(() => {
                        const conflicts = getActiveConflicts();
                        if (conflicts.length > 0) {
                          const suggestion = suggestAlternativeDates(conflicts, checkIn, checkOut);
                          return (
                            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                              <div className="flex items-start gap-2">
                                <span className="text-base">⚠️</span>
                                <div>
                                  <p className="text-xs font-black text-red-800 uppercase tracking-wide">Période non disponible !</p>
                                  <p className="text-xs font-medium text-red-600 leading-snug mt-1">
                                    Cette résidence est déjà réservée/occupée du <strong className="font-extrabold">{conflicts[0].checkIn}</strong> au <strong className="font-extrabold">{conflicts[0].checkOut}</strong>.
                                  </p>
                                </div>
                              </div>
                              
                              {suggestion && (
                                <div className="pt-2.5 border-t border-red-100 space-y-1.5">
                                  <p className="text-[10px] font-black uppercase text-red-700 tracking-wider">💡 Suggestion de dates libres :</p>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-700">Du {suggestion.nextStartStr} au {suggestion.nextEndStr}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCheckIn(suggestion.nextStartStr);
                                        setCheckOut(suggestion.nextEndStr);
                                      }}
                                      className="bg-red-605 bg-red-600 hover:bg-black text-white font-black text-[9px] uppercase px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                                    >
                                      Appliquer
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              <div className="pt-2.5 border-t border-red-100 space-y-2">
                                <p className="text-[10px] font-black uppercase text-red-700 tracking-wider">🏠 Explorer ailleurs aux mêmes dates :</p>
                                <p className="text-[9px] text-slate-400 italic mb-2">* Note: Vérifiez si l'eau et l'électricité sont incluses pour ces alternatives.</p>
                                <div className="space-y-1">
                                  {residences
                                    .filter(r => r.id !== selectedResidence.id && (r.address?.city || r.city) === (selectedResidence.address?.city || selectedResidence.city))
                                    .slice(0, 2)
                                    .map(alt => (
                                      <button 
                                        key={alt.id}
                                        type="button"
                                        onClick={() => handleResidenceClick(alt)}
                                        className="w-full text-left bg-white px-3 py-2 border border-red-100 rounded-lg flex items-center justify-between hover:border-red-300 transition-all cursor-pointer"
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-900 line-clamp-1">{alt.title}</span>
                                          <span className="text-[9px] font-bold text-slate-500">{(alt.promoPrice || alt.promo_price) ? (alt.promoPrice || alt.promo_price) : (alt.pricePerNight || alt.price_per_night)} F CFA/nuit</span>
                                        </div>
                                        <ArrowRight size={14} className="text-red-500" />
                                      </button>
                                    ))
                                  }
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="space-y-3 mb-6 text-sm">
                      {(() => {
                        const nights = calculateNights();
                        let pPerNight = Number(selectedResidence.promoPrice ?? selectedResidence.promo_price ?? selectedResidence.pricePerNight ?? selectedResidence.price_per_night ?? 0);
                        let isTierApplied = false;

                        if (selectedResidence.pricingTiers && Array.isArray(selectedResidence.pricingTiers) && selectedResidence.pricingTiers.length > 0) {
                          const tiers = [...selectedResidence.pricingTiers]
                            .filter(t => nights >= t.minNights)
                            .sort((a, b) => b.minNights - a.minNights);
                          if (tiers.length > 0) {
                            pPerNight = Number(tiers[0].pricePerNight);
                            isTierApplied = true;
                          }
                        }

                        const baseBeforeDiscount = pPerNight * nights;

                        // Apply duration discounts (percentage based)
                        let discountPercent = 0;
                        if (nights >= 28 && selectedResidence.monthlyDiscount) {
                          discountPercent = selectedResidence.monthlyDiscount;
                        } else if (nights >= 7 && selectedResidence.weeklyDiscount) {
                          discountPercent = selectedResidence.weeklyDiscount;
                        }
                        const discountAmount = baseBeforeDiscount * (discountPercent / 100);
                        const baseAfterDiscount = baseBeforeDiscount - discountAmount;
                        
                        const platformService = baseAfterDiscount * (commissionRate / 100);

                        return (
                          <>
                            {/* Note détaillée sur les charges */}
                            <div className="p-4 bg-slate-900 rounded-2xl mb-6 border-l-4 border-red-500 shadow-lg">
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ShieldAlert size={12} />
                                Récapitulatif des charges :
                              </p>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg">
                                  <span className="text-xs text-slate-300 font-bold">Eau courante :</span>
                                  <span className={`text-xs font-black px-2 py-0.5 rounded ${selectedResidence.utilitiesIncluded?.water ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                    {selectedResidence.utilitiesIncluded?.water ? '✅ INCLUS (À LA CHARGE DE L\'HÔTE)' : '❌ NON INCLUS (À VOTRE CHARGE)'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg">
                                  <span className="text-xs text-slate-300 font-bold">Électricité :</span>
                                  <span className={`text-xs font-black px-2 py-0.5 rounded ${selectedResidence.utilitiesIncluded?.electricity ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                    {selectedResidence.utilitiesIncluded?.electricity ? '✅ INCLUS (À LA CHARGE DE L\'HÔTE)' : '❌ NON INCLUS (À VOTRE CHARGE)'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-2 italic font-medium">* Veuillez noter que si les charges ne sont pas incluses, vous devrez payer votre consommation directement sur place (compteur ou forfait).</p>
                            </div>

                            <div className="flex justify-between text-slate-600">
                              <span>
                                {formatFCFA(pPerNight)} x {nights} nuits
                                {isTierApplied && (
                                  <span className="ml-2 text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black border border-blue-100 uppercase tracking-tighter">
                                    Tarif Dégressif
                                  </span>
                                )}
                              </span>
                              <span className="font-medium">{formatFCFA(baseBeforeDiscount)}</span>
                            </div>
                            
                            {discountPercent > 0 && (
                              <div className="flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded-lg">
                                <span>Remise durée ({discountPercent}%)</span>
                                <span>- {formatFCFA(discountAmount)}</span>
                              </div>
                            )}

                            <div className="flex justify-between text-slate-600">
                              <span>Frais de ménage</span>
                              <span className="font-medium">{formatFCFA(selectedResidence.cleaningFee || selectedResidence.cleaning_fee)}</span>
                            </div>
                            {commissionRate > 0 && (
                              <div className="flex justify-between text-slate-600">
                                <span>Frais de service ({commissionRate}%)</span>
                                <span className="font-medium">{formatFCFA(platformService)}</span>
                              </div>
                            )}
                            {(selectedResidence.serviceFee > 0 || selectedResidence.service_fee > 0) && (
                              <div className="flex justify-between text-slate-600">
                                <span>Frais de service Additionnel</span>
                                <span className="font-medium">{formatFCFA(selectedResidence.serviceFee || selectedResidence.service_fee)}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <div className="flex justify-between text-lg font-black text-slate-900 border-t border-slate-100 pt-4">
                        <span className="flex flex-col">
                          Total du séjour
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Net à payer (FCFA)</span>
                        </span>
                        <span className="font-black text-2xl text-red-600">{formatFCFA(calculateTotal(selectedResidence))}</span>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-orange-800 uppercase tracking-tighter">Avance requise ({selectedResidence.advancePercentage || selectedResidence.advance_percentage || 100}%)</span>
                        <span className="text-lg font-black text-orange-900 underline underline-offset-4">{formatFCFA(calculateAdvance(selectedResidence))}</span>
                      </div>
                      <p className="text-[11px] text-orange-700 leading-tight italic">Cette avance sera payée via Mobile Money une fois que l'hôte aura approuvé vos dates.</p>
                    </div>

                    <button 
                      onClick={handleConfirmBooking}
                      className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-50 active:scale-95 transition-transform cursor-pointer"
                    >
                      CONFIRMER LA DEMANDE
                    </button>
                    
                    <p className="text-center text-[10px] text-slate-400 mt-4 leading-tight font-medium">
                      Paiement sécurisé déclenché après confirmation.<br />
                      Intégration Orange Money & Moov Money Burkina.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Guest Account view */}
          {view === 'bookings' && (
            <motion.div 
              key="bookings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MyBookings onContactHost={handleContactHost} isTestMode={isTestMode} />
            </motion.div>
          )}

          {/* Messages view */}
          {view === 'messages' && (
            <motion.div 
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MessagesView initialConversationId={initialConversationId} />
            </motion.div>
          )}

          {/* Profile and Settings */}
          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProfileSettings />
            </motion.div>
          )}

          {/* Favorites View */}
          {view === 'favorites' && (
            <motion.div 
              key="favorites"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <OwnerDashboard isTestMode={isTestMode} onBackToTraveler={() => handleNavigate('home')} />
            </motion.div>
          )}

          {/* Mod Admin view */}
          {view === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-7xl mx-auto px-4 py-8"
            >
              <AdminDashboard onBackToTraveler={() => handleNavigate('home')} />
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
      
      {activeBookingForPayment && (
        <PaymentModal 
          isOpen={isPaymentOpen}
          onClose={() => {
            setIsPaymentOpen(false);
            setActiveBookingForPayment(null);
          }}
          amount={activeBookingForPayment.amount}
          residenceTitle={activeBookingForPayment.title}
          isTestMode={isTestMode}
          utilitiesIncluded={residences.find(r => r.id === activeBookingForPayment.residenceId)?.utilitiesIncluded}
          onSuccess={async () => {
            if (activeBookingForPayment?.id) {
              try {
                await updateBookingStatus(activeBookingForPayment.id, {
                  paymentStatus: 'advance_paid'
                });
                addToast("Paiement de l'acompte réussi ! Votre réservation est maintenant confirmée.", 'success');
              } catch (err) {
                console.error("Failed to update booking status after payment:", err);
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </RoleProvider>
    </AuthProvider>
  );
}
