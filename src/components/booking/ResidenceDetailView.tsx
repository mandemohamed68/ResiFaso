import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Share2, Heart, Star, MapPin, Phone, MessageSquare, 
  Calendar as CalendarIcon, Check, CheckCircle2, ShieldCheck, 
  Droplets, Zap, ChevronRight, ChevronLeft, X, Maximize2, 
  Sparkles, Clock, AlertTriangle, Home, Bed, Bath, Users, 
  Tv, Wifi, Shield, Wind, Coffee, Car, Lock, Waves, 
  CalendarDays, Info, Compass, ExternalLink, HelpCircle, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Residence } from '../../types';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { ReviewsSection } from '../search/ReviewsSection';
import { ResidenceCard } from '../search/ResidenceCard';
import { formatFCFA } from '../../lib/utils';
import { formatCurrency } from '../../utils/currency';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface ResidenceDetailViewProps {
  residence: Residence;
  allResidences: Residence[];
  checkIn: string;
  checkOut: string;
  setCheckIn: (date: string) => void;
  setCheckOut: (date: string) => void;
  onBack: () => void;
  onConfirmBooking: () => void;
  onResidenceClick: (res: Residence) => void;
  onContactHost: (ownerId: string, residenceId?: string) => void;
  selectedResidenceBookings: any[];
  enablePhoneCalls?: boolean;
  enableWhatsApp?: boolean;
  commissionRate?: number;
  clientServiceFeeEnabled?: boolean;
  clientServiceFeePercentage?: number;
  minReservationAmountEnabled?: boolean;
  minReservationAmount?: number;
  isTestMode?: boolean;
  isDarkMode?: boolean;
}

export const ResidenceDetailView: React.FC<ResidenceDetailViewProps> = ({
  residence,
  allResidences,
  checkIn,
  checkOut,
  setCheckIn,
  setCheckOut,
  onBack,
  onConfirmBooking,
  onResidenceClick,
  onContactHost,
  selectedResidenceBookings,
  enablePhoneCalls = true,
  enableWhatsApp = true,
  commissionRate = 8,
  clientServiceFeeEnabled = false,
  clientServiceFeePercentage = 5,
  minReservationAmountEnabled = false,
  minReservationAmount = 5000,
  isDarkMode = false,
}) => {
  const { user } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'compact' | 'full'>('compact');

  const images = residence.images && residence.images.length > 0 
    ? residence.images 
    : ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80'];

  // Check favorites from local state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_favorites');
      if (saved) {
        const favIds = JSON.parse(saved);
        setIsFavorite(favIds.includes(residence.id));
      }
    } catch (_) {}
  }, [residence.id]);

  const toggleFavorite = () => {
    try {
      const saved = localStorage.getItem('user_favorites');
      let favIds: string[] = saved ? JSON.parse(saved) : [];
      if (isFavorite) {
        favIds = favIds.filter(id => id !== residence.id);
        setIsFavorite(false);
      } else {
        favIds.push(residence.id);
        setIsFavorite(true);
      }
      localStorage.setItem('user_favorites', JSON.stringify(favIds));
    } catch (_) {
      setIsFavorite(!isFavorite);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}?residence=${residence.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      });
    }
  };

  // Calculate nights
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diff = end.getTime() - start.getTime();
    const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const nights = calculateNights();

  // Price calculations
  const rawPrice = residence.promoPrice ?? residence.promo_price ?? residence.pricePerNight ?? residence.price_per_night ?? 0;
  let currentPricePerNight = Number(rawPrice);
  let isDegressiveApplied = false;

  if (residence.pricingTiers && Array.isArray(residence.pricingTiers) && residence.pricingTiers.length > 0) {
    const applicableTiers = [...residence.pricingTiers]
      .filter(tier => nights >= tier.minNights)
      .sort((a, b) => b.minNights - a.minNights);
    if (applicableTiers.length > 0) {
      currentPricePerNight = Number(applicableTiers[0].pricePerNight);
      isDegressiveApplied = true;
    }
  }

  let discountPercent = 0;
  if (nights >= 28 && (residence.monthlyDiscount || residence.monthly_discount)) {
    discountPercent = Number(residence.monthlyDiscount || residence.monthly_discount);
  } else if (nights >= 7 && (residence.weeklyDiscount || residence.weekly_discount)) {
    discountPercent = Number(residence.weeklyDiscount || residence.weekly_discount);
  }

  const baseBeforeDiscount = currentPricePerNight * nights;
  const discountAmount = baseBeforeDiscount * (discountPercent / 100);
  const baseAfterDiscount = baseBeforeDiscount - discountAmount;
  const cleaningFee = Number(residence.cleaningFee || residence.cleaning_fee || 0);
  const serviceFee = Number(residence.serviceFee || residence.service_fee || 0);
  const clientServiceFee = clientServiceFeeEnabled 
    ? Math.round(baseAfterDiscount * (clientServiceFeePercentage / 100))
    : 0;

  const totalAmount = Math.round(baseAfterDiscount + cleaningFee + serviceFee + clientServiceFee);
  
  const advancePercent = residence.advancePercentage !== undefined && residence.advancePercentage !== null 
    ? residence.advancePercentage 
    : (residence.advance_percentage !== undefined && residence.advance_percentage !== null ? residence.advance_percentage : 100);
  const advanceAmount = Math.round(totalAmount * (advancePercent / 100));

  // Date conflict logic
  const isDateBooked = (dateStr: string) => {
    const isBookedInConfirmed = selectedResidenceBookings.some((b: any) => {
      const bCheckIn = (b.checkIn || b.check_in || '').split('T')[0];
      const bCheckOut = (b.checkOut || b.check_out || '').split('T')[0];
      const bStatus = (b.bookingStatus || b.booking_status || b.status || '').toLowerCase();
      const bPayStatus = (b.paymentStatus || b.payment_status || '').toLowerCase();
      if (['cancelled', 'declined', 'annulee', 'annulé', 'refusee', 'refusé', 'expired', 'canceled'].includes(bStatus)) {
        return false;
      }
      const isPaid = ['paid', 'advance_paid', 'partial_paid', 'partiel', 'fully_paid', 'paye', 'payé'].includes(bPayStatus);
      return isPaid && dateStr >= bCheckIn && dateStr <= bCheckOut;
    });

    const isBookedInOccupied = (residence.occupiedDates || []).some((d: any) => {
      const dStatus = (d.status || d.bookingStatus || d.booking_status || '').toLowerCase();
      const dPayStatus = (d.paymentStatus || d.payment_status || '').toLowerCase();
      if (['cancelled', 'declined', 'annulee', 'annulé', 'refusee', 'refusé', 'expired', 'canceled'].includes(dStatus)) {
        return false;
      }
      if (dPayStatus && !['paid', 'advance_paid', 'partial_paid', 'partiel', 'fully_paid', 'paye', 'payé'].includes(dPayStatus)) {
        return false;
      }
      const dFrom = (d.from || d.check_in || '').split('T')[0];
      const dTo = (d.to || d.check_out || '').split('T')[0];
      return dFrom && dTo && dateStr >= dFrom && dateStr <= dTo;
    });

    return isBookedInConfirmed || isBookedInOccupied;
  };

  const getActiveConflicts = () => {
    if (!checkIn || !checkOut || !selectedResidenceBookings.length) return [];
    const dStart = new Date(checkIn);
    const dEnd = new Date(checkOut);
    return selectedResidenceBookings.filter((b: any) => {
      const bStart = new Date(b.checkIn);
      const bEnd = new Date(b.checkOut);
      const bStatus = (b.bookingStatus || b.booking_status || b.status || '').toLowerCase();
      const isCancelled = ['cancelled', 'declined', 'annulee', 'annulé', 'refusee', 'refusé', 'expired', 'canceled'].includes(bStatus);
      return !isCancelled && (dStart <= bEnd && dEnd >= bStart);
    });
  };

  const conflicts = getActiveConflicts();

  // Smart Alternative Dates
  const suggestAlternativeDates = () => {
    if (!conflicts.length) return null;
    const sorted = [...conflicts].sort((a, b) => new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime());
    const nextPossibleStart = new Date(sorted[sorted.length - 1].checkOut);
    nextPossibleStart.setDate(nextPossibleStart.getDate() + 1);
    const nextStartStr = nextPossibleStart.toISOString().split('T')[0];
    const nextEnd = new Date(nextPossibleStart);
    nextEnd.setDate(nextEnd.getDate() + nights);
    const nextEndStr = nextEnd.toISOString().split('T')[0];
    return { nextStartStr, nextEndStr };
  };

  const altDates = suggestAlternativeDates();

  const formatDateFr = (dStr: string) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  // Amenities Icon Map
  const getAmenityIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('clim') || lower.includes('air')) return <Wind size={18} className="text-sky-500" />;
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi size={18} className="text-indigo-500" />;
    if (lower.includes('tv') || lower.includes('canal') || lower.includes('télé')) return <Tv size={18} className="text-violet-500" />;
    if (lower.includes('park') || lower.includes('garage')) return <Car size={18} className="text-emerald-500" />;
    if (lower.includes('sécu') || lower.includes('gard') || lower.includes('surveill')) return <Shield size={18} className="text-teal-500" />;
    if (lower.includes('piscine') || lower.includes('pool')) return <Waves size={18} className="text-cyan-500" />;
    if (lower.includes('eau') || lower.includes('citerne') || lower.includes('surpresseur')) return <Droplets size={18} className="text-blue-500" />;
    if (lower.includes('élec') || lower.includes('groupe') || lower.includes('solaire')) return <Zap size={18} className="text-amber-500" />;
    if (lower.includes('cuis') || lower.includes('gaz') || lower.includes('repas')) return <Coffee size={18} className="text-orange-500" />;
    return <CheckCircle2 size={18} className="text-green-600" />;
  };

  // 14-day days array
  const next14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
    const isBooked = isDateBooked(dateStr);
    const isSelected = (checkIn && checkOut && dateStr >= checkIn && dateStr < checkOut);
    return { date: d, dateStr, dayName, dayNum: d.getDate(), isBooked, isSelected };
  });

  const availableDaysCount = next14Days.filter(d => !d.isBooked).length;

  const handleDayClick = (dayStr: string, isBooked: boolean) => {
    if (isBooked) return;
    if (!checkIn || (checkIn && checkOut && checkIn !== checkOut)) {
      setCheckIn(dayStr);
      const nextDay = new Date(dayStr);
      nextDay.setDate(nextDay.getDate() + 1);
      setCheckOut(nextDay.toISOString().split('T')[0]);
    } else if (checkIn && !checkOut) {
      if (dayStr > checkIn) {
        setCheckOut(dayStr);
      } else {
        setCheckIn(dayStr);
        const nextDay = new Date(dayStr);
        nextDay.setDate(nextDay.getDate() + 1);
        setCheckOut(nextDay.toISOString().split('T')[0]);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 font-sans">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={15} />
            <span>Retour aux résidences</span>
          </button>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="hidden sm:inline text-slate-600 dark:text-slate-300 font-medium">
            {residence.address?.city || residence.city || 'Burkina Faso'}
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-900 dark:text-white font-bold truncate max-w-[200px] sm:max-w-[300px]">
            {residence.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs relative"
            title="Partager le lien de cette résidence"
          >
            {isCopied ? (
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check size={14} /> Lien copié !
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Share2 size={14} /> Partager
              </span>
            )}
          </button>

          {/* Favorite Toggle */}
          <button 
            onClick={toggleFavorite}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs",
              isFavorite 
                ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400" 
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            )}
            title={isFavorite ? "Retirer des favoris" : "Enregistrer dans mes favoris"}
          >
            <Heart size={14} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
            <span className="hidden sm:inline">{isFavorite ? "Enregistré" : "Favoris"}</span>
          </button>
        </div>
      </div>

      {/* Main Title & Key Badges Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-brand-primary/10 text-brand-primary dark:bg-emerald-950/60 dark:text-emerald-400 border border-brand-primary/20">
            {residence.type || 'Résidence Meublée'}
          </span>

          {!!residence.recommended && (
            <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-red-600 text-yellow-300 border border-red-500 shadow-xs flex items-center gap-1">
              ★ Recommandé Faso
            </span>
          )}

          {!!residence.promoted && !residence.recommended && (
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Sparkles size={13} className="text-amber-500" /> Coup de cœur
            </span>
          )}

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold">
            <Star size={14} className="text-amber-500 fill-amber-500" />
            <span>{residence.rating ? Number(residence.rating).toFixed(1) : 'Nouveau'}</span>
            <span className="text-slate-400 font-medium">({residence.reviewCount || 0} avis)</span>
          </div>

          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/60 flex items-center gap-1">
            <ShieldCheck size={13} /> Logement Certifié ResiFaso
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
          {residence.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-3 text-slate-600 dark:text-slate-400 text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <MapPin size={16} className="text-red-500 shrink-0" />
            <span>
              {((residence.address?.street || residence.street) === 'Secteur non configuré' ? 'Secteur non précisé' : (residence.address?.street || residence.street || 'Secteur non précisé'))}
              {', '}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">{residence.address?.neighborhood || residence.neighborhood || ''}</strong>
              {', '}
              <strong className="text-slate-900 dark:text-white font-bold">{residence.address?.city || residence.city || 'Burkina Faso'}</strong>
            </span>
          </div>

          {/* Quick Contact buttons for desktop */}
          <div className="flex items-center gap-2">
            {enablePhoneCalls && (
              <a 
                href={`tel:${residence.ownerPhone || '70000000'}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs"
              >
                <Phone size={13} className="text-brand-primary" />
                <span>Appeler</span>
              </a>
            )}
            {enableWhatsApp && (
              <a 
                href={`https://wa.me/${(residence.ownerPhone || '70000000').replace(/\s+/g, '')}?text=${encodeURIComponent(`Bonjour, je vous contacte à propos de votre résidence "${residence.title}" sur ResiFaso.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all shadow-2xs"
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 5-Photo Luxury Gallery (Desktop Bento / Mobile Slider) */}
      <div className="relative mb-8 rounded-xl overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800">
        {/* Desktop Bento Grid (lg+) */}
        <div className="hidden lg:grid grid-cols-4 gap-2 h-[420px]">
          {/* Main Large Photo */}
          <div 
            onClick={() => { setActiveImageIndex(0); setIsLightboxOpen(true); }}
            className="col-span-2 relative overflow-hidden group cursor-pointer"
          >
            <img 
              src={images[0]} 
              alt={residence.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
          </div>

          {/* Sub Photos Right Columns */}
          <div className="col-span-1 grid grid-rows-2 gap-2">
            <div 
              onClick={() => { setActiveImageIndex(1 % images.length); setIsLightboxOpen(true); }}
              className="relative overflow-hidden group cursor-pointer"
            >
              <img 
                src={images[1] || images[0]} 
                alt={`${residence.title} - vue 2`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            <div 
              onClick={() => { setActiveImageIndex(2 % images.length); setIsLightboxOpen(true); }}
              className="relative overflow-hidden group cursor-pointer"
            >
              <img 
                src={images[2] || images[0]} 
                alt={`${residence.title} - vue 3`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="col-span-1 grid grid-rows-2 gap-2">
            <div 
              onClick={() => { setActiveImageIndex(3 % images.length); setIsLightboxOpen(true); }}
              className="relative overflow-hidden group cursor-pointer"
            >
              <img 
                src={images[3] || images[0]} 
                alt={`${residence.title} - vue 4`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            <div 
              onClick={() => { setActiveImageIndex(4 % images.length); setIsLightboxOpen(true); }}
              className="relative overflow-hidden group cursor-pointer"
            >
              <img 
                src={images[4] || images[0]} 
                alt={`${residence.title} - vue 5`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              {/* Show All Photos Button Badge */}
              <div className="absolute inset-0 bg-slate-950/40 hover:bg-slate-950/30 transition-colors flex flex-col items-center justify-center text-white p-2 text-center">
                <Maximize2 size={20} className="mb-1" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Toutes les photos ({images.length})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Carousel (< lg) */}
        <div className="lg:hidden relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden group">
          <img 
            src={images[activeImageIndex]} 
            alt={`${residence.title} - ${activeImageIndex + 1}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />

          {images.length > 1 && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white flex items-center justify-center shadow-md active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white flex items-center justify-center shadow-md active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Photo Counter Badge */}
          <div 
            onClick={() => setIsLightboxOpen(true)}
            className="absolute bottom-3 right-3 bg-slate-950/75 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Maximize2 size={13} />
            <span>{activeImageIndex + 1} / {images.length} photos</span>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6"
          >
            <div className="flex items-center justify-between text-white z-10">
              <div className="text-sm font-bold">
                {residence.title} • <span className="text-slate-400">{activeImageIndex + 1} / {images.length}</span>
              </div>
              <button 
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
              >
                <X size={22} />
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
              <img 
                src={images[activeImageIndex]} 
                alt={`${residence.title} full view`}
                className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
                referrerPolicy="no-referrer"
              />

              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-2 sm:left-6 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md cursor-pointer transition shadow-lg"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 sm:right-6 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md cursor-pointer transition shadow-lg"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
              {images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={cn(
                    "w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer",
                    activeImageIndex === idx ? "border-brand-primary scale-105" : "border-transparent opacity-50 hover:opacity-100"
                  )}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Content (2 cols) + Booking Widget (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
        
        {/* LEFT COLUMN: Residence Information & Features */}
        <div className="lg:col-span-2 space-y-8">

          {/* Quick Specifications Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-primary">
                <Home size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Pièces</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{residence.rooms || 1} Pièce{Number(residence.rooms || 1) > 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-500">
                <Users size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Capacité</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{residence.capacity || 2} Personnes</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-500">
                <Droplets size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Eau</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  {residence.utilitiesIncluded?.water ? 'Incluse' : 'Sur place'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-red-500">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Électricité</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  {residence.utilitiesIncluded?.electricity ? 'Incluse' : 'Sur place'}
                </p>
              </div>
            </div>
          </div>

          {/* Host Card Section */}
          <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-brand-primary to-emerald-400 text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0">
                {residence.ownerName ? residence.ownerName.charAt(0).toUpperCase() : 'H'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Hôte : {residence.ownerName || 'Hôte Partenaire ResiFaso'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                    Vérifié
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gestionnaire certifié • Réponse moyenne en moins de 15 minutes
                </p>
              </div>
            </div>

            <button 
              onClick={() => onContactHost(residence.ownerId, residence.id)}
              className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs self-stretch sm:self-auto flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} />
              <span>Envoyer un message</span>
            </button>
          </div>

          {/* Description Section */}
          <div className="space-y-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>À propos de cette résidence</span>
            </h2>
            
            <div className="p-5 sm:p-6 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <p className={cn(
                "text-slate-700 dark:text-slate-300 text-base leading-relaxed whitespace-pre-line transition-all duration-300",
                !isDescriptionExpanded ? "line-clamp-4" : ""
              )}>
                {residence.description || "Résidence meublée de haut standing idéalement située au Burkina Faso, offrant tout le confort nécessaire pour vos séjours professionnels ou de détente."}
              </p>
              
              {residence.description && residence.description.length > 220 && (
                <button 
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="mt-3 text-xs font-black text-brand-primary hover:underline uppercase tracking-wider cursor-pointer"
                >
                  {isDescriptionExpanded ? 'Afficher moins' : 'Lire la description complète →'}
                </button>
              )}
            </div>
          </div>

          {/* Utilities & Charges Transparency Box */}
          <div className="space-y-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-brand-primary" size={22} />
              <span>Transparence des Charges & Services</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Eau */}
              <div className={cn(
                "p-4 sm:p-5 rounded-xl border transition-all",
                residence.utilitiesIncluded?.water 
                  ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/50" 
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Droplets size={16} className="text-blue-500" />
                    Eau (ONEA / Forage)
                  </span>
                  {residence.utilitiesIncluded?.water ? (
                    <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Check size={12} /> Incluse
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      À la charge du voyageur
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {residence.utilitiesIncluded?.water 
                    ? "Inclus sans supplément dans le tarif de la nuitée (prise en charge intégrale par le propriétaire)."
                    : "Facturation réelle à la consommation sur relevé ou forfait journalier à régler directement sur place."}
                </p>
              </div>

              {/* Électricité */}
              <div className={cn(
                "p-4 sm:p-5 rounded-xl border transition-all",
                residence.utilitiesIncluded?.electricity 
                  ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50" 
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Zap size={16} className="text-amber-500" />
                    Élec. (SONABEL / Solaire)
                  </span>
                  {residence.utilitiesIncluded?.electricity ? (
                    <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Check size={12} /> Incluse
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      À la charge du voyageur
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {residence.utilitiesIncluded?.electricity 
                    ? "Inclus dans le prix de la réservation (prise en charge par l'hôte)."
                    : "Recharge compteur prépayé (Cash Power) ou forfait à régulariser auprès de l'hôte à l'arrivée."}
                </p>
              </div>
            </div>
          </div>

          {/* Amenities & Equipments Grid */}
          <div className="space-y-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Équipements & Prestations incluses
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(residence.amenities && residence.amenities.length > 0 
                ? residence.amenities 
                : ['Climatisation', 'Wi-Fi Fibre', 'Parking sécurisé', 'Télévision Canal+', 'Cuisine équipée', 'Gardiennage 24/7']
              ).map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
                >
                  <div className="shrink-0">{getAmenityIcon(item)}</div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* House Rules & Policies */}
          <div className="p-5 sm:p-6 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-brand-primary" />
              Conditions d'accueil & Règles du séjour
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">IN</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Arrivée (Check-in)</p>
                  <p className="text-slate-500">À partir de 14h00</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="w-8 h-8 rounded-md bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300 flex items-center justify-center font-bold">OUT</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Départ (Check-out)</p>
                  <p className="text-slate-500">Jusqu'à 12h00</p>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <p>• Présentation obligatoire d'une pièce d'identité valide (CNIB ou Passeport) à l'arrivée.</p>
              <p>• Les fêtes et nuisances sonores excessives ne sont pas autorisées pour le respect du voisinage.</p>
              <p>• Annulation sans frais jusqu'à 48h avant la date d'arrivée.</p>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <ReviewsSection residenceId={residence.id} />
          </div>

          {/* Recommended Similar Residences */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Compass className="text-brand-secondary" size={22} />
              <span>Autres logements recommandés à {residence.address?.city || residence.city || 'proximité'}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {allResidences
                .filter(r => r.id !== residence.id && (r.type === residence.type || (r.address?.city || r.city) === (residence.address?.city || residence.city)))
                .slice(0, 3)
                .map(res => (
                  <ResidenceCard 
                    key={res.id} 
                    residence={res} 
                    onClick={() => onResidenceClick(res)} 
                    enablePhoneCalls={enablePhoneCalls}
                    enableWhatsApp={enableWhatsApp}
                  />
                ))
              }
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Professional Booking Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
            
            {/* Header: Price Tag & Badge */}
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  {(residence.promoPrice || residence.promo_price) ? (
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-red-600 tracking-tight">
                          {formatFCFA(residence.promoPrice || residence.promo_price)}
                        </span>
                        <span className="text-xs font-bold text-slate-400 line-through">
                          {formatFCFA(residence.pricePerNight || residence.price_per_night)}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded-md w-fit uppercase mt-1">
                        Offre Promo Spéciale
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {formatFCFA(currentPricePerNight)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ nuit</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md text-xs font-black">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  <span>{residence.rating ? Number(residence.rating).toFixed(1) : '5.0'}</span>
                </div>
              </div>

              {isDegressiveApplied && (
                <div className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md">
                  ✓ Tarif dégressif appliqué pour {nights} nuits
                </div>
              )}
            </div>

            {/* 14-Day Live Availability Matrix with Quick Click */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-brand-primary" />
                  Disponibilité (14 jours)
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                  {availableDaysCount}/14 libres
                </span>
              </div>

              {/* 14-Day Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {next14Days.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDayClick(item.dateStr, item.isBooked)}
                    disabled={item.isBooked}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center p-0.5 text-[10px] font-bold transition-all border cursor-pointer",
                      item.isBooked 
                        ? "bg-red-50 dark:bg-red-950/40 text-red-400 border-red-200/50 dark:border-red-900/50 line-through opacity-70 cursor-not-allowed" 
                        : item.isSelected
                          ? "bg-brand-primary text-white border-brand-primary shadow-xs font-black scale-105"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-primary hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    )}
                    title={item.isBooked ? `Réservé (${item.dateStr})` : `Disponible (${item.dateStr}) - Cliquer pour sélectionner`}
                  >
                    <span className="text-[8px] uppercase tracking-tighter opacity-70 leading-none">{item.dayName}</span>
                    <span className="leading-tight">{item.dayNum}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-2 px-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Vert = Disponible</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Rouge = Occupé</span>
              </div>
            </div>

            {/* Date Pickers (Arrivée & Départ) */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-all">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Arrivée
                  </label>
                  <CustomDatePicker
                    value={checkIn}
                    onChange={(val) => setCheckIn(val)}
                    minDate={new Date()}
                    className="bg-transparent border-none outline-none w-full font-bold text-slate-900 dark:text-white text-xs p-0 cursor-pointer"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-all">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Départ
                  </label>
                  <CustomDatePicker
                    value={checkOut}
                    onChange={(val) => setCheckOut(val)}
                    minDate={checkIn ? new Date(checkIn) : new Date()}
                    className="bg-transparent border-none outline-none w-full font-bold text-slate-900 dark:text-white text-xs p-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Durée du séjour :</span>
                <span className="font-black text-slate-900 dark:text-white">
                  {nights} nuit{nights > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Date Conflicts Alert & Suggestion */}
            {conflicts.length > 0 && (
              <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-red-800 dark:text-red-300 uppercase tracking-tight">
                      Dates Indisponibles
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 leading-snug mt-0.5">
                      Cette résidence est déjà réservée du <strong>{formatDateFr(conflicts[0].checkIn)}</strong> au <strong>{formatDateFr(conflicts[0].checkOut)}</strong>.
                    </p>
                  </div>
                </div>

                {altDates && (
                  <div className="pt-2 border-t border-red-200/60 dark:border-red-800/60">
                    <p className="text-[10px] font-black text-red-700 dark:text-red-300 uppercase mb-1">
                      💡 Prochaines dates libres :
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Du {formatDateFr(altDates.nextStartStr)} au {formatDateFr(altDates.nextEndStr)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckIn(altDates.nextStartStr);
                          setCheckOut(altDates.nextEndStr);
                        }}
                        className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase transition cursor-pointer"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transparent Cost Breakdown */}
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span>{formatFCFA(currentPricePerNight)} × {nights} nuits</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatFCFA(baseBeforeDiscount)}</span>
              </div>

              {discountPercent > 0 && (
                <div className="flex items-center justify-between text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/40 p-2 rounded-lg">
                  <span>Remise séjour ({discountPercent}%)</span>
                  <span>- {formatFCFA(discountAmount)}</span>
                </div>
              )}

              {cleaningFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>Frais de ménage</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatFCFA(cleaningFee)}</span>
                </div>
              )}

              {clientServiceFeeEnabled && clientServiceFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>Frais de service plateforme ({clientServiceFeePercentage}%)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">+{formatFCFA(clientServiceFee)}</span>
                </div>
              )}

              {/* Total Stay Price Card */}
              <div className="p-3.5 rounded-lg bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-between mt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total du Séjour</p>
                  <p className="text-xs text-slate-300 font-medium">Net à payer (TTC)</p>
                </div>
                <span className="text-2xl font-black text-brand-primary tracking-tight">
                  {formatFCFA(totalAmount)}
                </span>
              </div>
            </div>

            {/* Deposit Box (Acompte requis) */}
            <div className="p-3.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-tight">
                  Acompte Requis ({advancePercent}%)
                </span>
                <span className="text-base font-black text-amber-900 dark:text-amber-200">
                  {formatFCFA(advanceAmount)}
                </span>
              </div>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight">
                Paiement sécurisé via Mobile Money après acceptation de votre demande par l'hôte.
              </p>
            </div>

            {/* Mobile Money Badges */}
            <div className="pt-2 pb-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} className="text-brand-secondary" />
                  Moyens de paiement acceptés
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                  100% Sécurisé
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'Orange Money', logo: '/orange.png', bg: 'hover:border-orange-300' },
                  { name: 'Moov Money', logo: '/moov-1.png', bg: 'hover:border-blue-300' },
                  { name: 'Telecel', logo: '/telecel.png', bg: 'hover:border-red-300' },
                  { name: 'Coris Money', logo: '/coris.png', bg: 'hover:border-emerald-300' }
                ].map((prov) => (
                  <div 
                    key={prov.name}
                    className={cn(
                      "p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col items-center justify-center gap-1.5 transition-all group",
                      prov.bg
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50">
                      <img 
                        src={prov.logo} 
                        alt={prov.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                      />
                    </div>
                    <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300 text-center leading-tight truncate w-full">
                      {prov.name}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center leading-tight">
                Paiement instantané par Mobile Money avec confirmation par code OTP sécurisé.
              </p>
            </div>

            {/* Confirmation CTA Button */}
            <button
              type="button"
              onClick={onConfirmBooking}
              disabled={minReservationAmountEnabled && totalAmount < minReservationAmount}
              className="w-full py-3.5 rounded-lg bg-brand-secondary hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>Confirmer la réservation</span>
            </button>

            {/* Trust Badges */}
            <div className="text-center space-y-1 text-[10px] text-slate-400">
              <p className="flex items-center justify-center gap-1 font-semibold">
                <ShieldCheck size={13} className="text-brand-primary" />
                Garantie Réservation Sécurisée ResiFaso
              </p>
              <p>Assistance & Service Client 7j/7 au Burkina Faso</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
