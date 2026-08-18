import React, { useState } from 'react';
import { Star, MapPin, Heart, Sparkles, Droplets, Zap } from 'lucide-react';
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
  onFavoriteToggle
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

  const discount = residence.monthlyDiscount || residence.weeklyDiscount || residence.weekly_discount || residence.monthly_discount;
  const currentPrice = residence.promoPrice || residence.promo_price || residence.pricePerNight || residence.price_per_night;
  const originalPrice = (residence.promoPrice || residence.promo_price) ? (residence.pricePerNight || residence.price_per_night) : null;

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-white rounded-2xl overflow-hidden border border-slate-150/80 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-col h-full group"
      onClick={() => onClick(residence.id)}
    >
      {/* Photo Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img 
          src={residence.images[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800"} 
          alt={residence.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10 pointer-events-none">
          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
            {residence.type || 'Résidence'}
          </span>

          {!!residence.promoted && (
            <span className="bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Sparkles size={11} className="text-amber-300" />
              Coup de cœur
            </span>
          )}

          {!!discount && (
            <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
              -{discount}% Séjour
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button 
          type="button"
          onClick={handleWishlist}
          className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white backdrop-blur-md rounded-full text-slate-500 hover:text-red-500 shadow-sm transition-all duration-200 z-10 cursor-pointer active:scale-90"
          title={isWishlist ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart 
            size={18} 
            fill={isWishlist ? "currentColor" : "none"} 
            className={cn("transition-colors", isWishlist ? "text-red-500" : "")} 
          />
        </button>

        {/* Subtle Bottom Availability Pill */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Disponible</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div className="space-y-1.5">
          {/* Location & Rating Header */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1 line-clamp-1">
              <MapPin size={13} className="text-red-600 shrink-0" />
              <span className="truncate">{residence.address?.neighborhood || residence.neighborhood || "Ouaga"}, {residence.address?.city || residence.city || "Burkina"}</span>
            </div>

            <div className="flex items-center gap-1 text-slate-800 font-bold shrink-0 ml-2">
              <Star size={13} className="text-amber-500 fill-amber-500" />
              <span>{residence.rating ? Number(residence.rating).toFixed(1) : "Nouveau"}</span>
            </div>
          </div>

          {/* Residence Title */}
          <h3 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors text-sm sm:text-base leading-snug line-clamp-1">
            {residence.title}
          </h3>

          {/* Amenities & Utilities */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-600 font-medium">
            <span className="bg-slate-100/80 px-2 py-0.5 rounded-md text-slate-700">
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

        {/* Price & Action Row */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Tarif</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-slate-900">
                {formatFCFA(currentPrice)}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ nuit</span>
              {originalPrice && (
                <span className="text-xs text-slate-400 line-through ml-1">
                  {formatFCFA(originalPrice)}
                </span>
              )}
            </div>
          </div>

          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick(residence.id);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            Réserver
          </button>
        </div>
      </div>
    </motion.div>
  );
};
