import React, { useState } from 'react';
import { Star, MapPin, Wifi, AirVent, ShieldCheck, Heart, Phone, MessageCircle, LayoutGrid, Calendar as CalendarIcon, Droplets, Zap, Sparkles } from 'lucide-react';
import { Residence } from '../../types';
import { motion } from 'motion/react';
import { formatFCFA, cn, formatDateFr } from '../../lib/utils';

interface Props {
  residence: Residence;
  onClick: (id: string) => void;
  onFavoriteToggle?: () => void;
  enablePhoneCalls?: boolean;
  enableWhatsApp?: boolean;
}

export const ResidenceCard: React.FC<Props> = ({
  residence,
  onClick,
  onFavoriteToggle,
  enablePhoneCalls = true,
  enableWhatsApp = true
}) => {
  const [isWishlist, setIsWishlist] = useState<boolean>(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('resifaso_favorites') || '[]');
      return Array.isArray(favs) ? favs.includes(residence.id) : false;
    } catch (_) {
      return false;
    }
  });

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const favsRaw = localStorage.getItem('resifaso_favorites') || '[]';
      let favs: string[] = [];
      try {
        favs = JSON.parse(favsRaw);
        if (!Array.isArray(favs)) {
          favs = [];
        }
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
      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
    } catch (err) {
      console.error("Failed to update favoris", err);
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-100 flex flex-col h-full group"
      onClick={() => onClick(residence.id)}
    >
      {/* Image Gallery Mock */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={residence.images[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800"} 
          alt={residence.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[85%] z-10 pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide">
            {residence.type}
          </div>
          {!!residence.promoted && (
            <div className="bg-red-600/90 text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide backdrop-blur-sm flex items-center gap-1 shadow-sm">
              <Sparkles size={9} /> Coup de cœur
            </div>
          )}
          {!!(residence.weeklyDiscount || residence.monthlyDiscount || residence.weekly_discount || residence.monthly_discount) && (
            <div className="bg-emerald-600/90 text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide backdrop-blur-sm shadow-sm whitespace-nowrap">
              -{residence.monthlyDiscount || residence.weeklyDiscount}% Séjour
            </div>
          )}
          {!!(residence.promoPrice || residence.promo_price) && (
            <div className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide flex items-center gap-1 shadow-sm whitespace-nowrap">
              <Zap size={9} /> Offre spéciale
            </div>
          )}
        </div>
        <button 
          type="button"
          onClick={handleWishlist}
          className="absolute top-3 right-3 p-2 bg-white/70 backdrop-blur-md rounded-full text-slate-400 hover:text-red-500 transition-colors z-10 pointer-events-auto"
        >
          <Heart size={18} fill={isWishlist ? "currentColor" : "none"} className={isWishlist ? "text-red-500" : ""} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1 gap-1.5">
          <h3 className="font-extrabold text-slate-900 group-hover:text-red-600 transition-colors uppercase text-[11px] sm:text-[12px] leading-tight flex-1 line-clamp-1">{residence.title}</h3>
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-800 shrink-0">
            <Star size={12} className={cn("text-amber-400", residence.rating ? "fill-amber-400" : "fill-none")} />
            <span>{residence.rating ? residence.rating : "Nouveau"}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-2 font-medium">
          <MapPin size={11} className="text-red-500 shrink-0" />
          <span className="line-clamp-1">{residence.address?.neighborhood || residence.neighborhood}, {residence.address?.city || residence.city}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <div className="flex items-center gap-1 text-slate-600 text-[10px] sm:text-xs font-semibold bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
            <LayoutGrid size={11} className="text-slate-400" />
            <span>{residence.rooms || 1} P.</span>
          </div>
          {(residence.utilitiesIncluded?.water || residence.utilitiesIncluded?.electricity) && (
            <div className="flex items-center gap-1">
              {residence.utilitiesIncluded?.water && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-blue-100">
                  <Droplets size={9} /> Eau
                </span>
              )}
              {residence.utilitiesIncluded?.electricity && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-amber-100">
                  <Zap size={9} /> Élec.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Availability 14-Day Numbered Matrix */}
        <div className="mb-2.5 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center justify-between mb-1 px-0.5">
            <span className="text-[8px] sm:text-[9px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <CalendarIcon size={10} className="text-slate-400" /> DISPO. (14J)
            </span>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const dayNum = d.getDate();
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const isBooked = residence.occupiedDates?.some((occ: any) => {
                const status = (occ.status || occ.bookingStatus || occ.booking_status || '').toLowerCase();
                const payStatus = (occ.paymentStatus || occ.payment_status || '').toLowerCase();
                if (['cancelled', 'declined', 'annulee', 'annulé', 'refusee', 'refusé', 'expired', 'canceled'].includes(status)) {
                  return false;
                }
                if (payStatus && !['paid', 'advance_paid', 'partial_paid', 'partiel', 'fully_paid', 'paye', 'payé'].includes(payStatus)) {
                  return false;
                }
                const dFrom = (occ.from || occ.check_in || '').split('T')[0];
                const dTo = (occ.to || occ.check_out || '').split('T')[0];
                return dFrom && dTo && dateStr >= dFrom && dateStr <= dTo;
              });

              return (
                <div 
                  key={dateStr}
                  title={`${formatDateFr(dateStr)}: ${isBooked ? "Occupé" : "Disponible"}`}
                  className={cn(
                    "text-[9px] font-black py-0.5 rounded border transition-all select-none cursor-help",
                    isBooked 
                      ? "bg-red-50 text-red-600 border-red-200 line-through" 
                      : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                  )}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-auto space-y-2">
          {/* Quick Contact Actions (Mobile focus) */}
          {(enablePhoneCalls || enableWhatsApp) && (
            <div className={cn(
              "grid gap-1.5",
              enablePhoneCalls && enableWhatsApp ? "grid-cols-2" : "grid-cols-1"
            )}>
              {enablePhoneCalls && (
                <a 
                  href={`tel:${residence.ownerPhone || '70000000'}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-700 transition-all border border-slate-200/80"
                >
                  <Phone size={11} className="text-slate-500" />
                  Appeler
                </a>
              )}
              {enableWhatsApp && (
                <a 
                  href={`https://wa.me/${(residence.ownerPhone || '70000000').replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1 py-1 bg-emerald-50 hover:bg-emerald-100/80 rounded-lg text-[10px] font-bold text-emerald-800 transition-all border border-emerald-200/80"
                >
                  <MessageCircle size={11} className="text-emerald-600" />
                  WhatsApp
                </a>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 gap-1 min-w-0">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-extrabold uppercase tracking-wider truncate">Par nuit</span>
              <div className="flex items-baseline gap-0.5 min-w-0 flex-wrap">
                {(residence.promoPrice || residence.promo_price) ? (
                  <>
                    <span className="text-[11px] sm:text-xs xl:text-[11px] 2xl:text-xs font-black text-slate-900 whitespace-nowrap">{formatFCFA(residence.promoPrice || residence.promo_price)}</span>
                    <span className="text-[8px] text-slate-400 font-medium line-through shrink-0">{(residence.pricePerNight || residence.price_per_night)}</span>
                  </>
                ) : (
                  <span className="text-[11px] sm:text-xs xl:text-[11px] 2xl:text-xs font-black text-slate-900 whitespace-nowrap">{formatFCFA(residence.pricePerNight || residence.price_per_night)}</span>
                )}
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick(residence.id);
              }}
              className="bg-slate-900 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer shadow-sm whitespace-nowrap"
            >
              DÉTAILS
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
