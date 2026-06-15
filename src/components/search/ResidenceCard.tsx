import React, { useState } from 'react';
import { Star, MapPin, Wifi, AirVent, ShieldCheck, Heart, Phone, MessageCircle, LayoutGrid } from 'lucide-react';
import { Residence } from '../../types';
import { motion } from 'motion/react';
import { formatFCFA, cn } from '../../lib/utils';

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
          {residence.promoted && (
            <div className="bg-red-600/90 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm self-start border border-red-500/50">
              Coup de coeur Faso ★
            </div>
          )}
          {(residence.weeklyDiscount || residence.monthlyDiscount) && (
            <div className="bg-green-600/90 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm self-start border border-green-500/50">
              -{residence.monthlyDiscount || residence.weeklyDiscount}% Durée
            </div>
          )}
          {residence.promoPrice && (
            <div className="bg-yellow-400 text-slate-900 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm self-start animate-pulse">
              Promo Flash ⚡
            </div>
          )}
        </div>
        <button 
          onClick={handleWishlist}
          className="absolute top-3 right-3 p-2 bg-white/70 backdrop-blur-md rounded-full text-slate-400 hover:text-red-500 transition-colors z-10"
        >
          <Heart size={18} fill={isWishlist ? "currentColor" : "none"} className={isWishlist ? "text-red-500" : ""} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-slate-900 leading-tight line-clamp-1 group-hover:text-red-600 transition-colors uppercase text-sm tracking-tight">{residence.title}</h3>
          <div className="flex items-center gap-1 text-sm font-black text-slate-900 shrink-0">
            <Star size={14} className={cn("text-yellow-500", residence.rating ? "fill-yellow-500" : "fill-none")} />
            <span>{residence.rating || "4.8"}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-slate-400 text-[10px] mb-1 font-bold uppercase tracking-wider">
          <MapPin size={10} className="text-red-500" />
          <span className="line-clamp-1">{residence.address.neighborhood}, {residence.address.city}</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-slate-500 text-[10px] font-black uppercase">
            <LayoutGrid size={10} className="text-slate-400" />
            <span>{residence.rooms || 1} Pièces</span>
          </div>
          {residence.ownerName && (
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-l border-slate-200 pl-3">
              Hôte: <span className="text-slate-600">{residence.ownerName}</span>
            </div>
          )}
        </div>

        <div className="mt-auto">
          {/* Quick Contact Actions (Mobile focus) */}
          {(enablePhoneCalls || enableWhatsApp) && (
            <div className={cn(
              "grid gap-2 mb-4",
              enablePhoneCalls && enableWhatsApp ? "grid-cols-2" : "grid-cols-1"
            )}>
              {enablePhoneCalls && (
                <a 
                  href={`tel:${residence.ownerPhone || '70000000'}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all border border-slate-100"
                >
                  <Phone size={12} />
                  Appeler
                </a>
              )}
              {enableWhatsApp && (
                <a 
                  href={`https://wa.me/${(residence.ownerPhone || '70000000').replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-2 py-2 bg-green-50 hover:bg-green-100 rounded-xl text-[10px] font-black text-green-700 uppercase tracking-widest transition-all border border-green-100"
                >
                  <MessageCircle size={12} />
                  WhatsApp
                </a>
              )}
            </div>
          )}

          <div className="flex items-baseline justify-between border-t border-slate-50 pt-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">À partir de</span>
              <div className="flex items-baseline gap-1">
                {residence.promoPrice ? (
                  <>
                    <span className="text-lg font-black text-red-600">{formatFCFA(residence.promoPrice)}</span>
                    <span className="text-[10px] text-slate-400 font-medium line-through">{formatFCFA(residence.pricePerNight)}</span>
                  </>
                ) : (
                  <span className="text-lg font-black text-slate-900">{formatFCFA(residence.pricePerNight)}</span>
                )}
                <span className="text-[10px] text-slate-500 font-medium lowercase">/ nuit</span>
              </div>
            </div>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-600 transition-colors">
              Détails
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
