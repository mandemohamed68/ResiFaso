import React, { useState } from 'react';
import { Star, MapPin, Wifi, AirVent, ShieldCheck, Heart, Phone, MessageCircle, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';
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
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-slate-900 shadow-sm self-start">
            {residence.type}
          </div>
          {!!residence.promoted && (
            <div className="bg-red-600/90 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm self-start border border-red-500/50">
              Coup de coeur Faso ★
            </div>
          )}
          {!!(residence.weeklyDiscount || residence.monthlyDiscount || residence.weekly_discount || residence.monthly_discount) && (
            <div className="bg-green-600/90 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm self-start border border-green-500/50">
              -{residence.monthlyDiscount || residence.weeklyDiscount}% Durée
            </div>
          )}
          {!!(residence.promoPrice || residence.promo_price) && (
            <div className="bg-yellow-400 text-slate-900 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm self-start animate-pulse">
              Promo Flash ⚡
            </div>
          )}
          {!!residence.utilitiesIncluded?.water && (
            <div className="bg-blue-600/90 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm self-start border border-blue-500/50">
              Eau incluse 💧
            </div>
          )}
          {!!residence.utilitiesIncluded?.electricity && (
            <div className="bg-amber-500/90 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm self-start border border-amber-400/50">
              Élec. incluse ⚡
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
      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1 gap-2">
          <h3 className="font-extrabold text-slate-900 leading-tight group-hover:text-red-600 transition-colors uppercase text-[12px] tracking-tight flex-1">{residence.title}</h3>
          <div className="flex items-center gap-1 text-[11px] font-black text-slate-900 shrink-0">
            <Star size={12} className={cn("text-yellow-500", residence.rating ? "fill-yellow-500" : "fill-none")} />
            <span>{residence.rating || "4.8"}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-slate-400 text-[9px] mb-1.5 font-bold uppercase tracking-wider">
          <MapPin size={9} className="text-red-500 shrink-0" />
          <span className="line-clamp-1">{residence.address?.neighborhood || residence.neighborhood}, {residence.address?.city || residence.city}</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1 text-slate-500 text-[9px] font-black uppercase">
            <LayoutGrid size={9} className="text-slate-400" />
            <span>{residence.rooms || 1} Pièces</span>
          </div>
          {residence.ownerName && (
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider border-l border-slate-200 pl-3 line-clamp-1">
              Hôte: <span className="text-slate-600">{residence.ownerName}</span>
            </div>
          )}
        </div>

        {/* Occupied Dates Display - High visibility for user request */}
        <div className="mb-4 bg-red-50/50 p-2.5 rounded-xl border border-red-100">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-600 mb-2">
            <CalendarIcon size={11} className="animate-pulse" />
            <span>Calendrier d'occupation</span>
          </div>
          {residence.occupiedDates && residence.occupiedDates.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {residence.occupiedDates.slice(0, 5).map((date, idx) => {
                const fromDate = new Date(date.from).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const toDate = new Date(date.to).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const isOngoing = todayStr >= date.from && todayStr <= date.to;
                
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-black border transition-all",
                      isOngoing 
                        ? "bg-red-600 text-white border-red-700 shadow-sm scale-[1.02]" 
                        : "bg-white text-slate-700 border-red-100"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isOngoing ? "text-red-100" : "text-slate-400"}>DU</span>
                      <span>{fromDate}</span>
                    </div>
                    <div className={cn("w-4 h-[1px]", isOngoing ? "bg-red-400" : "bg-red-200")} />
                    <div className="flex items-center gap-2">
                      <span className={isOngoing ? "text-red-100" : "text-slate-400"}>AU</span>
                      <span>{toDate}</span>
                    </div>
                  </div>
                );
              })}
              {residence.occupiedDates.length > 5 && (
                <div className="text-center pt-1">
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter bg-red-100 px-2 py-0.5 rounded-full">
                    + {residence.occupiedDates.length - 5} autres réservations
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] font-black text-green-600 bg-green-50 p-2 rounded-lg border border-green-200 flex justify-center items-center">
              LIBRE ACTUELLEMENT (AUCUNE RÉSERVATION)
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3">
          {/* Quick Contact Actions (Mobile focus) */}
          {(enablePhoneCalls || enableWhatsApp) && (
            <div className={cn(
              "grid gap-2",
              enablePhoneCalls && enableWhatsApp ? "grid-cols-2" : "grid-cols-1"
            )}>
              {enablePhoneCalls && (
                <a 
                  href={`tel:${residence.ownerPhone || '70000000'}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest transition-all border border-slate-100"
                >
                  <Phone size={10} />
                  Appeler
                </a>
              )}
              {enableWhatsApp && (
                <a 
                  href={`https://wa.me/${(residence.ownerPhone || '70000000').replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-[9px] font-black text-green-700 uppercase tracking-widest transition-all border border-green-100"
                >
                  <MessageCircle size={10} />
                  WhatsApp
                </a>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-50 pt-3 gap-2">
            <div className="flex flex-col flex-1">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">Par nuit</span>
              <div className="flex items-baseline gap-0.5">
                {(residence.promoPrice || residence.promo_price) ? (
                  <>
                    <span className="text-base font-black text-red-600 whitespace-nowrap">{formatFCFA(residence.promoPrice || residence.promo_price)}</span>
                    <span className="text-[9px] text-slate-400 font-medium line-through shrink-0">{(residence.pricePerNight || residence.price_per_night)}</span>
                  </>
                ) : (
                  <span className="text-base font-black text-slate-900 whitespace-nowrap">{formatFCFA(residence.pricePerNight || residence.price_per_night)}</span>
                )}
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick(residence.id);
              }}
              className="bg-slate-900 text-white px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider hover:bg-red-600 transition-colors shrink-0"
            >
              Détails
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
