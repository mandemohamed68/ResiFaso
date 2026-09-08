import React, { useState, useMemo } from 'react';
import { Star, MapPin, Heart, Droplets, Zap, Calendar, ChevronDown, Phone, MessageSquare, ShieldCheck, Scale, Check, Sparkles } from 'lucide-react';
import { Residence } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatFCFA, cn } from '../../lib/utils';
import { useComparison } from '../../contexts/ComparisonContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useGlobalSettings } from '../../hooks/useQueries';

interface Props {
  residence: Residence;
  onClick: (residence: any) => void;
  onFavoriteToggle?: () => void;
  enablePhoneCalls?: boolean;
  enableWhatsApp?: boolean;
}

export const ResidenceCard: React.FC<Props> = ({
  residence,
  onClick,
  onFavoriteToggle,
  enablePhoneCalls = true,
  enableWhatsApp = true,
}) => {
  const { data: gsData } = useGlobalSettings();
  const autonomyFilterEnabled = gsData?.autonomyFilterEnabled !== false;
  const comparatorEnabled = gsData?.comparatorEnabled !== false;

  const [isWishlist, setIsWishlist] = useState<boolean>(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('resifaso_favorites') || '[]');
      return Array.isArray(favs) ? favs.includes(residence.id) : false;
    } catch (_) {
      return false;
    }
  });

  const [show14DayMatrix, setShow14DayMatrix] = useState(false);
  const { toggleCompare, isInComparison } = useComparison();
  const { formatPrice, currency } = useCurrency();
  const isCompared = isInComparison(residence.id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const favsRaw = localStorage.getItem('resifaso_favorites') || '[]';
      let favs: string[] = [];
      try {
        favs = JSON.parse(favsRaw);
        if (!Array.isArray(favs)) favs = [];
      } catch (_) {
        favs = [];
      }
      
      let nextFavs: string[];
      if (favs.includes(residence.id)) {
        nextFavs = favs.filter((id) => id !== residence.id);
        setIsWishlist(false);
      } else {
        nextFavs = [...favs, residence.id];
        setIsWishlist(true);
      }
      localStorage.setItem('resifaso_favorites', JSON.stringify(nextFavs));
      if (onFavoriteToggle) onFavoriteToggle();
    } catch (err) {
      console.error("Failed to update favorites", err);
    }
  };

  // 14-Day Calendar Matrix Calculation
  const days14 = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = [];
    const occupied = residence.occupiedDates || [];
    const dayShortNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthShortNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const isOccupied = occupied.some(range => {
        if (!range.from || !range.to) return false;
        return dateStr >= range.from && dateStr <= range.to;
      });

      const isAvailable = !isOccupied && residence.availabilityStatus !== 'occupied' && residence.availabilityStatus !== 'maintenance';

      list.push({
        date: d,
        dateStr,
        dayName: dayShortNames[d.getDay()],
        dayNum: d.getDate(),
        monthName: monthShortNames[d.getMonth()],
        isAvailable,
        isToday: i === 0
      });
    }
    return list;
  }, [residence.occupiedDates, residence.availabilityStatus]);

  const freeDaysCount = days14.filter(d => d.isAvailable).length;
  const isTodayAvailable = days14.length > 0 ? days14[0].isAvailable : true;

  const discount = residence.monthlyDiscount || residence.weeklyDiscount || residence.weekly_discount || residence.monthly_discount;
  const currentPrice = residence.promoPrice || residence.promo_price || residence.pricePerNight || residence.price_per_night;
  const originalPrice = (residence.promoPrice || residence.promo_price) ? (residence.pricePerNight || residence.price_per_night) : null;
  const ownerPhone = residence.ownerPhone || (residence as any).phone || '70000000';

  const am = (residence.amenities || []).map(a => a.toLowerCase());
  const hasPower = am.some(a => a.includes('groupe') || a.includes('solaire') || a.includes('générateur'));
  const hasWater = am.some(a => a.includes('forage') || a.includes('citerne') || a.includes('surpresseur') || a.includes('eau'));
  const is100Autonomous = hasPower && hasWater;

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-white rounded-xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-col h-full group w-full min-w-0"
      onClick={() => onClick(residence)}
    >
      {/* Photo Container */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-slate-100">
        <img 
          src={residence.images?.[0] || "/cities/ouaga.png"} 
          alt={residence.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.indexOf('/cities/ouaga.png') === -1) {
              target.src = '/cities/ouaga.png';
            }
          }}
        />

        {/* Top Badges (Contained and wrapped to prevent overlap with heart button) */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10 pointer-events-none max-w-[calc(100%-54px)]">
          <span className="bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm truncate">
            {residence.type || 'Résidence'}
          </span>

          {!!residence.recommended && (
            <span className="bg-red-600 text-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm border border-red-500/50 shrink-0">
              ★ Recommandé
            </span>
          )}

          {!!residence.promoted && !residence.recommended && (
            <span className="bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm shrink-0">
              <Sparkles size={11} className="text-amber-300" />
              Coup de cœur
            </span>
          )}

          {!!discount && (
            <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm shrink-0">
              -{discount}% Séjour
            </span>
          )}

          {is100Autonomous && autonomyFilterEnabled && (
            <span 
              className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs shrink-0 border border-slate-700"
              title="Groupe électrogène/Solaire & Forage garantis (zéro coupure)"
            >
              <Zap size={10} className="text-amber-400 fill-amber-400" />
              <span>Autonome</span>
            </span>
          )}
        </div>

        {/* Top Right Action Buttons: Compare & Favorite */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
          {comparatorEnabled && (
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCompare(residence);
              }}
              className={cn(
                "p-2 rounded-lg backdrop-blur-md shadow-xs transition-all duration-200 cursor-pointer active:scale-90 flex items-center justify-center",
                isCompared 
                  ? "bg-slate-900 text-white ring-1 ring-slate-700" 
                  : "bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900"
              )}
              title={isCompared ? "Retirer du comparateur" : "Comparer avec d'autres résidences"}
            >
              {isCompared ? <Check size={14} className="stroke-[3]" /> : <Scale size={14} />}
            </button>
          )}

          <button 
            type="button"
            onClick={handleWishlist}
            className="p-2 bg-white/90 hover:bg-white backdrop-blur-md rounded-lg text-slate-500 hover:text-red-500 shadow-xs transition-all duration-200 cursor-pointer active:scale-90"
            title={isWishlist ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart 
              size={16} 
              fill={isWishlist ? "currentColor" : "none"} 
              className={cn("transition-colors", isWishlist ? "text-red-500" : "")} 
            />
          </button>
        </div>

        {/* Bottom Availability Badge */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md backdrop-blur-md text-white text-[10px] font-bold shadow-sm",
            isTodayAvailable ? "bg-slate-900/85" : "bg-red-950/85"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isTodayAvailable ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
            <span>{isTodayAvailable ? 'Disponible aujourd\'hui' : 'Occupé ce jour'}</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-4.5 flex flex-col flex-1 justify-between gap-3 min-w-0">
        <div className="space-y-2 min-w-0">
          {/* Location & Rating Header */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold gap-2">
            <div className="flex items-center gap-1 truncate min-w-0">
              <MapPin size={13} className="text-red-600 shrink-0" />
              <span className="truncate">
                {residence.address?.neighborhood || residence.neighborhood || "Ouaga"}, {residence.address?.city || residence.city || "Burkina"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-800 font-black shrink-0">
              <Star size={13} className="text-amber-500 fill-amber-500" />
              <span>{residence.rating ? Number(residence.rating).toFixed(1) : "Nouveau"}</span>
            </div>
          </div>

          {/* Residence Title */}
          <h3 className="font-black text-slate-900 group-hover:text-red-600 transition-colors text-sm sm:text-base leading-snug truncate">
            {residence.title}
          </h3>

          {/* Amenities & Utilities */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
              {residence.rooms || 1} {Number(residence.rooms) > 1 ? 'pièces' : 'pièce'}
            </span>

            {residence.utilitiesIncluded?.water && (
              <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-sky-100">
                <Droplets size={11} className="text-sky-600" />
                Eau incluse
              </span>
            )}

            {residence.utilitiesIncluded?.electricity && (
              <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-100">
                <Zap size={11} className="text-amber-600" />
                Élec. incluse
              </span>
            )}
          </div>
        </div>

        {/* 14-Day Calendar Matrix Section (Clean & Optional Dropdown) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {/* 14-Day Toggle Header */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShow14DayMatrix(!show14DayMatrix);
              }}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-red-600 transition-colors cursor-pointer group/cal"
              title="Afficher/Masquer le calendrier des 14 prochains jours"
            >
              <Calendar size={13} className="text-red-600 shrink-0" />
              <span>Planning 14 jours</span>
              <ChevronDown size={13} className={cn("transition-transform duration-200 text-slate-400 group-hover/cal:text-red-600", show14DayMatrix ? "rotate-180" : "")} />
            </button>

            <span className={cn(
              "text-[10px] font-extrabold px-2 py-0.5 rounded-md",
              freeDaysCount > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
            )}>
              {freeDaysCount}/14j libres
            </span>
          </div>

          {/* Detailed 14-Day Calendar Matrix Dropdown */}
          <AnimatePresence>
            {show14DayMatrix && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 mt-1">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {days14.map((day, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex flex-col items-center justify-center p-1 rounded-sm text-[10px] transition-all",
                          day.isAvailable
                            ? "bg-emerald-50 border border-emerald-200/80 text-emerald-900 font-bold"
                            : "bg-red-50 border border-red-200/80 text-red-700 font-medium"
                        )}
                        title={`${day.dayName} ${day.dayNum} ${day.monthName} : ${day.isAvailable ? 'Disponible' : 'Réservé'}`}
                      >
                        <span className="text-[8px] text-slate-500 uppercase leading-none">{day.dayName}</span>
                        <span className="text-[10px] font-black leading-tight">{day.dayNum}</span>
                        <span className={cn("w-1.5 h-1.5 rounded-full mt-0.5", day.isAvailable ? "bg-emerald-500" : "bg-red-500")} />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium pt-1 border-t border-slate-200/60 px-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Disponible
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                      Occupé
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 min-w-0">
          {/* Price */}
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none mb-0.5">Tarif</span>
            <div className="flex items-baseline gap-1 truncate">
              <span className="text-sm sm:text-base font-black text-slate-900 whitespace-nowrap">
                {currency === 'XOF' ? formatFCFA(currentPrice) : formatPrice(currentPrice, { showEquivalent: false })}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">/ nuit</span>
            </div>
            {currency !== 'XOF' ? (
              <span className="text-[9px] text-slate-400 font-medium block leading-tight">
                ~{formatFCFA(currentPrice)}
              </span>
            ) : originalPrice ? (
              <span className="text-[10px] text-slate-400 line-through block leading-none">
                {formatFCFA(originalPrice)}
              </span>
            ) : null}
          </div>

          {/* Action Buttons: Phone, WhatsApp, and Reserve */}
          <div className="flex items-center gap-1 shrink-0">
            {enablePhoneCalls && (
              <a 
                href={`tel:${ownerPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200/80 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                title={`Appeler (${ownerPhone})`}
              >
                <Phone size={13} />
              </a>
            )}

            {enableWhatsApp && (
              <a 
                href={`https://wa.me/${ownerPhone.replace(/\s+/g, '').replace('+', '')}?text=${encodeURIComponent(`Bonjour, je vous contacte à propos de votre résidence "${residence.title}" sur ResiFaso.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                title={`WhatsApp (${ownerPhone})`}
              >
                <MessageSquare size={13} />
              </a>
            )}

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick(residence);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
            >
              Réserver
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

