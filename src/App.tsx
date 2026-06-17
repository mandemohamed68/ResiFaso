import { formatCurrency } from './utils/currency';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RoleProvider, useRole } from './contexts/RoleContext';
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
  ChevronLeft, ChevronRight, Phone, Heart, Megaphone, X, Share2, Check, Calendar as CalendarIcon
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
import { db } from './lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { Footer } from './components/common/Footer';
import { BURKINA_LOCATIONS } from './constants/locations';

function AppContent() {
  const { user, profile, loginAsMock, logOut } = useAuth();
  const { currentRole, setCurrentRole } = useRole();
  
  const [view, setView] = useState<'home' | 'search' | 'details' | 'admin' | 'bookings' | 'owner-dashboard' | 'profile' | 'messages' | 'favorites'>('home');
  const [selectedResidence, setSelectedResidence] = useState<Residence | null>(null);
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

  // Database list and loadings
  const [residences, setResidences] = useState<Residence[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter options
  const [searchFilters, setSearchFilters] = useState<{
    cityId: string;
    neighborhoodId: string;
    type: string;
    capacity: number;
    amenities: string[];
  } | null>(null);

  // Synchroniser le Mode Test avec les Paramètres Globaux (Firestore)
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isTestMode !== undefined) {
          setIsTestMode(data.isTestMode);
        }
        if (data.enablePhoneCalls !== undefined) {
          setEnablePhoneCalls(data.enablePhoneCalls);
        } else {
          setEnablePhoneCalls(true);
        }
        if (data.enableWhatsApp !== undefined) {
          setEnableWhatsApp(data.enableWhatsApp);
        } else {
          setEnableWhatsApp(true);
        }
        if (data.announcement) {
          setGlobalAnnouncement({
            text: data.announcement.text || '',
            type: data.announcement.type || 'info',
            active: !!data.announcement.active
          });
          // Si le message change ou est réactivé, on réinitialise l'état masqué
          setIsAnnouncementDismissed(false);
        } else {
          setGlobalAnnouncement(null);
        }
      }
    }, (err) => console.error("Error subscribing to global testMode in App.tsx:", err));
    return () => unsubSettings();
  }, []);

  // Auto-seed and monitor published residences in real-time
  useEffect(() => {
    let unsubscribe: () => void;

    async function initAndListen() {
      try {
        setLoading(true);
        // Ensure standard sample residences exist on pristine databases
        await seedDatabaseIfNeeded();

        // Listen for all published residences in real-time
        const q = query(collection(db, 'residences'), where('status', '==', 'published'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const list: Residence[] = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Residence);
          });
          setResidences(list);
          setLoading(false);
        }, (error) => {
          console.error("SNAPSHOT_ERROR residences in App.tsx:", error.code, error.message);
          setLoading(false);
        });
      } catch (err) {
        console.error("Database initialization failed:", err);
        setLoading(false);
      }
    }

    initAndListen();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleResidenceClick = (residence: Residence) => {
    setSelectedResidence(residence);
    setView('details');
    window.scrollTo(0, 0);
  };

  const [selectedResidenceBookings, setSelectedResidenceBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedResidence) {
      setSelectedResidenceBookings([]);
      return;
    }
    const q = query(
      collection(db, 'bookings'),
      where('residenceId', '==', selectedResidence.id),
      where('bookingStatus', 'in', ['confirmed', 'pending'])
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSelectedResidenceBookings(list);
    }, (err) => console.log("Error loading selectedResidence Bookings:", err));

    return () => unsub();
  }, [selectedResidence]);

  const calculateNights = () => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();
    const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const calculateTotal = (res: Residence) => {
    const nights = calculateNights();
    const pricePerNight = res.promoPrice || res.pricePerNight;
    
    // Apply duration discounts
    let discount = 0;
    if (nights >= 28 && res.monthlyDiscount) {
      discount = res.monthlyDiscount;
    } else if (nights >= 7 && res.weeklyDiscount) {
      discount = res.weeklyDiscount;
    }

    const base = (pricePerNight * nights) * (1 - discount / 100);
    const cleaning = res.cleaningFee;
    const platformService = base * 0.08; // Platform commission
    const extraService = res.serviceFee || 0; // Host controlled service fee
    return Math.round(base + cleaning + platformService + extraService);
  };

  const calculateAdvance = (res: Residence) => {
    return Math.round(calculateTotal(res) * (res.advancePercentage / 100));
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
      if (city) {
        const citySearch = city.name.toLowerCase().trim();
        const resCity = (res.address.city || '').toLowerCase().trim();
        // Handle fuzzy matching like "Bobo-Dioulasso" vs "Bobo Dioulasso"
        const normalize = (s: string) => s.replace(/-/g, ' ').replace(/\s+/g, ' ');
        const matchesCity = normalize(resCity).includes(normalize(citySearch)) || 
                           normalize(citySearch).includes(normalize(resCity));
        if (!matchesCity) return false;
      }
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
      
      if (nbName) {
        const resNb = (res.address.neighborhood || '').toLowerCase().trim();
        const normalizeNb = (s: string) => s.replace(/['’]/g, '').replace(/\s+/g, ' ');
        const matchesNb = normalizeNb(resNb).includes(normalizeNb(nbName)) || 
                         normalizeNb(nbName).includes(normalizeNb(resNb));
        if (!matchesNb) return false;
      }
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
      setView('messages');
      // We'll need a way for MessagesView to auto-select this convId
      // Let's add a state for it
      setInitialConversationId(convId);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ouverture de la messagerie.");
    } finally {
      setLoading(false);
    }
  };

  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);

  // Handle Booking creation in Firestore
  const handleConfirmBooking = async () => {
    if (!selectedResidence) return;

    if (!user) {
      alert("Veuillez d'abord vous connecter pour effectuer une réservation.");
      setIsAuthOpen(true);
      return;
    }

    if (profile?.isSuspended) {
      alert("Votre compte est actuellement suspendu par l'administration Faso. Vous ne pouvez pas faire de nouvelle demande de séjour.");
      return;
    }

    try {
      // 1. Check for availability conflicts
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef, 
        where('residenceId', '==', selectedResidence.id),
        where('bookingStatus', '==', 'confirmed')
      );
      const snapshot = await getDocs(q);
      const confirmedBookings = snapshot.docs.map(d => d.data());

      const dStart = new Date(checkIn);
      const dEnd = new Date(checkOut);

      const conflicts = confirmedBookings.filter((b: any) => {
        const bStart = new Date(b.checkIn);
        const bEnd = new Date(b.checkOut);
        return (dStart < bEnd && dEnd > bStart);
      });

      if (conflicts.length > 0) {
        const { nextStartStr, nextEndStr } = suggestAlternativeDates(conflicts, checkIn, checkOut);
        if (confirm(`🇧🇫 NOTE DE DISPONIBILITÉ :\n\nDésolé, cette résidence est déjà occupée ou réservée aux dates choisies.\n\nSouhaitez-vous plutôt envoyer votre demande pour les prochaines dates libres : du ${nextStartStr} au ${nextEndStr} ?`)) {
          setCheckIn(nextStartStr);
          setCheckOut(nextEndStr);
          alert("Dates mises à jour ! Veuillez cliquer à nouveau sur 'Confirmer la Réservation' pour envoyer votre demande à l'hôte.");
        }
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

      alert("Votre demande de réservation a été envoyée avec succès au propriétaire ! Vous allez être redirigé vers l'onglet 'Mes Réservations' pour suivre son statut.");
      
      setSelectedResidence(null);
      // Directly redirect them to guest bookings lists page
      setView('bookings');
    } catch (err) {
      console.error(err);
      alert("Échec de la soumission de la réservation.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 font-sans">

      {globalAnnouncement && globalAnnouncement.active && !isAnnouncementDismissed && (
        <div className={cn(
          "relative overflow-hidden border-b transition-all duration-300 animate-in fade-in slide-in-from-top-4 z-[100]",
          globalAnnouncement.type === 'info' && "bg-blue-600 text-white border-blue-700",
          globalAnnouncement.type === 'warning' && "bg-amber-500 text-slate-900 border-amber-600 shadow-sm",
          globalAnnouncement.type === 'success' && "bg-emerald-600 text-white border-emerald-700",
          globalAnnouncement.type === 'danger' && "bg-red-600 text-white border-red-700 font-extrabold"
        )} id="app-global-announcement-banner">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 pr-12 flex items-center justify-center gap-3 relative">
            <Megaphone className={cn(
              "flex-shrink-0 animate-bounce",
              globalAnnouncement.type === 'warning' ? "text-slate-900" : "text-white"
            )} size={18} />
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-center">
              {globalAnnouncement.text}
            </span>
            <button 
              onClick={() => setIsAnnouncementDismissed(true)}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-black/10 transition cursor-pointer outline-none focus:ring-1 focus:ring-current",
                globalAnnouncement.type === 'warning' ? "text-slate-900" : "text-white"
              )}
              title="Masquer l'annonce temporairement"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <Navbar 
        onNavigate={setView} 
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 size={32} />
      </div>
      <h3 className="text-xl font-bold mb-2">Sécurité Garantie</h3>
      <p className="text-slate-500 text-sm">Toutes nos résidences sont vérifiées manuellement par nos équipes.</p>
    </div>
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
        <Star size={32} />
      </div>
      <h3 className="text-xl font-bold mb-2">Qualité Premium</h3>
      <p className="text-slate-500 text-sm">Nous sélectionnons uniquement les meilleurs logements pour vous.</p>
    </div>
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
        <ShieldCheck size={32} />
      </div>
      <h3 className="text-xl font-bold mb-2">Support Local</h3>
      <p className="text-slate-500 text-sm">Une équipe sur place à Ouagadougou pour vous accompagner.</p>
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
                    onClick={() => setView('home')}
                    className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-slate-50 px-4 py-2 rounded-xl"
                  >
                    <ArrowRight size={16} className="rotate-180" />
                    Liste des Hébergements
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
                    <span>{selectedResidence.address.street}, {selectedResidence.address.neighborhood}, {selectedResidence.address.city}</span>
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
                        .filter(r => r.id !== selectedResidence.id && (r.type === selectedResidence.type || r.address.city === selectedResidence.address.city))
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
                      {residences.filter(r => r.id !== selectedResidence.id && (r.type === selectedResidence.type || r.address.city === selectedResidence.address.city)).length === 0 && (
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

                      <div className="flex items-baseline gap-1 mb-6">
                        {selectedResidence.promoPrice ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl font-black text-red-600 italic">{formatCurrency(selectedResidence.promoPrice)}</span>
                              <span className="text-sm font-bold text-slate-400 line-through">{formatCurrency(selectedResidence.pricePerNight)} FCFA</span>
                            </div>
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 w-fit px-2 py-0.5 rounded mt-1">Offre Spéciale Faso</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(selectedResidence.pricePerNight)}</span>
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
                                <div className="space-y-1">
                                  {residences
                                    .filter(r => r.id !== selectedResidence.id && r.address.city === selectedResidence.address.city)
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
                                          <span className="text-[9px] font-bold text-slate-500">{alt.promoPrice ? alt.promoPrice : alt.pricePerNight} F CFA/nuit</span>
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
                      <div className="flex justify-between text-slate-600">
                        <span>{selectedResidence.promoPrice ? formatCurrency(selectedResidence.promoPrice) : formatCurrency(selectedResidence.pricePerNight)} FCFA x {calculateNights()} nuits</span>
                        <span className="font-medium">{formatCurrency((selectedResidence.promoPrice || selectedResidence.pricePerNight) * calculateNights())} FCFA</span>
                      </div>
                      
                      {calculateNights() >= 7 && (selectedResidence.weeklyDiscount || selectedResidence.monthlyDiscount) && (
                        <div className="flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded-lg">
                          <span>Remise durée ({calculateNights() >= 28 ? (selectedResidence.monthlyDiscount || selectedResidence.weeklyDiscount) : selectedResidence.weeklyDiscount}%)</span>
                          <span>- {formatCurrency((selectedResidence.promoPrice || selectedResidence.pricePerNight) * calculateNights() * ((calculateNights() >= 28 ? (selectedResidence.monthlyDiscount || selectedResidence.weeklyDiscount) : selectedResidence.weeklyDiscount) || 0) / 100)} FCFA</span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-600">
                        <span>Frais de ménage</span>
                        <span className="font-medium">{formatCurrency(selectedResidence.cleaningFee)} FCFA</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Frais de service (8%)</span>
                        <span className="font-medium">{formatCurrency(selectedResidence.pricePerNight * calculateNights() * 0.08)} FCFA</span>
                      </div>
                      {selectedResidence.serviceFee > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Frais de service Additionnel</span>
                          <span className="font-medium">{formatCurrency(selectedResidence.serviceFee)} FCFA</span>
                        </div>
                      )}
                      <hr className="border-slate-50" />
                      <div className="flex justify-between text-lg font-black text-slate-900">
                        <span>Total du séjour</span>
                        <span className="font-black text-xl">{formatCurrency(calculateTotal(selectedResidence))} FCFA</span>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-105 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-orange-800 uppercase tracking-tighter">Avance requise ({selectedResidence.advancePercentage}%)</span>
                        <span className="text-lg font-black text-orange-900 underline underline-offset-4">{formatCurrency(calculateAdvance(selectedResidence))} FCFA</span>
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
                  onClick={() => setView('home')}
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
                    onClick={() => setView('home')}
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
              <OwnerDashboard isTestMode={isTestMode} onBackToTraveler={() => setView('home')} />
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
              <AdminDashboard onBackToTraveler={() => setView('home')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <Footer />

      {/* Account Login panel triggers */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      
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
          onSuccess={async () => {
            if (activeBookingForPayment?.id) {
              try {
                await updateBookingStatus(activeBookingForPayment.id, {
                  paymentStatus: 'advance_paid'
                });
                alert("Paiement de l'acompte réussi ! Votre réservation est maintenant confirmée.");
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
        <AppContent />
      </RoleProvider>
    </AuthProvider>
  );
}
