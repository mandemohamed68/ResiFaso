import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import { PromoPopupConfig } from '../../types';

interface PromoPopupModalProps {
  config?: PromoPopupConfig | null;
  isPreview?: boolean;
  onClosePreview?: () => void;
  currentPage?: 'home' | 'search' | 'all';
}

export const PromoPopupModal: React.FC<PromoPopupModalProps> = ({
  config,
  isPreview = false,
  onClosePreview,
  currentPage = 'home'
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dontShowAgainToday, setDontShowAgainToday] = useState<boolean>(false);

  useEffect(() => {
    if (isPreview) {
      setIsOpen(true);
      return;
    }

    if (!config || !config.isActive || !config.imageUrl) {
      setIsOpen(false);
      return;
    }

    // Check target page filter
    if (config.targetPage && config.targetPage !== 'all' && config.targetPage !== currentPage) {
      setIsOpen(false);
      return;
    }

    // Check Start / End Date schedule
    const now = new Date().getTime();
    if (config.startAt) {
      const startTime = new Date(config.startAt).getTime();
      if (!isNaN(startTime) && now < startTime) {
        setIsOpen(false);
        return;
      }
    }

    if (config.endAt) {
      const endTime = new Date(config.endAt).getTime();
      if (!isNaN(endTime) && now > endTime) {
        setIsOpen(false);
        return;
      }
    }

    // Check Frequency Rules
    const popupId = config.id || 'promo_default';
    const frequency = config.frequency || 'always';

    if (frequency === 'once_per_session') {
      const sessionSeen = sessionStorage.getItem(`resifaso_popup_seen_${popupId}`);
      if (sessionSeen) return;
    } else if (frequency === 'once_per_day') {
      const lastSeenStr = localStorage.getItem(`resifaso_popup_day_${popupId}`);
      if (lastSeenStr) {
        const lastSeen = parseInt(lastSeenStr, 10);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (now - lastSeen < twentyFourHours) return;
      }
    } else if (frequency === 'interval' && config.intervalMinutes) {
      const lastSeenStr = localStorage.getItem(`resifaso_popup_interval_${popupId}`);
      if (lastSeenStr) {
        const lastSeen = parseInt(lastSeenStr, 10);
        const intervalMs = config.intervalMinutes * 60 * 1000;
        if (now - lastSeen < intervalMs) return;
      }
    }

    // Schedule popup display after delaySeconds
    const delayMs = Math.max(0, (config.delaySeconds || 1) * 1000);
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [config, isPreview, currentPage]);

  const handleClose = () => {
    setIsOpen(false);
    if (isPreview && onClosePreview) {
      onClosePreview();
      return;
    }

    if (!config) return;

    const popupId = config.id || 'promo_default';
    const now = new Date().getTime();

    // Mark as seen based on rules
    if (dontShowAgainToday || config.frequency === 'once_per_day') {
      localStorage.setItem(`resifaso_popup_day_${popupId}`, now.toString());
    }

    if (config.frequency === 'once_per_session') {
      sessionStorage.setItem(`resifaso_popup_seen_${popupId}`, 'true');
    }

    if (config.frequency === 'interval') {
      localStorage.setItem(`resifaso_popup_interval_${popupId}`, now.toString());
    }
  };

  const handleActionClick = () => {
    if (!config?.linkUrl) {
      handleClose();
      return;
    }

    if (config.linkUrl.startsWith('http://') || config.linkUrl.startsWith('https://')) {
      window.open(config.linkUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = config.linkUrl;
    }

    handleClose();
  };

  if (!isOpen || !config) return null;

  const badgeText = config.badgeText || '100% DE BONUS';
  const imageFit = config.imageFit || 'contain';
  const showOverlay = !!config.showTitleOnOverlay;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity cursor-pointer"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-[460px] bg-white rounded-[36px] shadow-[0_32px_64px_-12px_rgba(15,23,42,0.25)] overflow-hidden border border-slate-100/60 z-10 my-auto"
        >
          {/* Prominent Circular Floating Close Button */}
          <button
            onClick={handleClose}
            type="button"
            aria-label="Fermer la publicité"
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer z-50 group"
          >
            <X size={18} className="stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Main Visual Image Banner Container */}
          <div className="relative w-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 flex items-center justify-center min-h-[260px] overflow-hidden">
            {/* Ambient dynamic radial lights behind the logo card */}
            <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.15)_0,transparent_60%)] pointer-events-none animate-pulse duration-5000" />
            
            {imageFit === 'contain' ? (
              /* Contain Mode: Full image is 100% visible inside a tactile card frame */
              <div className="relative w-full max-w-[280px] sm:max-w-[310px] aspect-[1/1] bg-white rounded-3xl p-5 flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] border border-white/10 relative transition-transform duration-500 hover:scale-[1.03]">
                {/* Top Floating Badge overlaying the logo card beautifully */}
                {badgeText && (
                  <div className="absolute -top-3.5 left-6 z-30">
                    <span
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/30 border border-red-500/10 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                      style={{ backgroundColor: config.badgeColor || '#EF2B2D' }}
                    >
                      <Sparkles size={11} className="animate-pulse" />
                      {badgeText}
                    </span>
                  </div>
                )}

                {/* Main Intact Poster Image */}
                <img
                  src={config.imageUrl}
                  alt={config.title || 'Publicité promotionnelle'}
                  className="max-h-full max-w-full object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              /* Cover Mode: Crops image to fill fixed aspect ratio with organic border radius */
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-slate-900 rounded-3xl overflow-hidden shadow-xl">
                <img
                  src={config.imageUrl}
                  alt={config.title || 'Publicité promotionnelle'}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Top Badge Overlay */}
                {badgeText && (
                  <div className="absolute top-3.5 left-3.5 z-20">
                    <span
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-md border border-white/20"
                      style={{ backgroundColor: config.badgeColor || '#EF2B2D' }}
                    >
                      <Sparkles size={11} className="animate-pulse" />
                      {badgeText}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Optional Overlay Text (Only if specifically requested) */}
            {showOverlay && (config.title || config.subtitle) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent p-6 text-white pt-12 z-20">
                {config.subtitle && (
                  <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest mb-1.5">
                    {config.subtitle}
                  </p>
                )}
                {config.title && (
                  <h3 className="font-black text-lg sm:text-xl leading-tight text-white drop-shadow-md">
                    {config.title}
                  </h3>
                )}
              </div>
            )}
          </div>

          {/* Content Body & CTA Button */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Title & Subtitle in Clean Body Section (Avoids text overlap on image) */}
            {!showOverlay && (config.title || config.subtitle) && (
              <div className="space-y-2">
                {config.subtitle ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#EF2B2D] block leading-none">
                    {config.subtitle}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#EF2B2D] block leading-none">
                    PROFITEZ DES RÉDUCTIONS EXCLUSIVES DU FASO
                  </span>
                )}
                {config.title && (
                  <h3 className="font-black text-slate-950 text-xl sm:text-2xl leading-tight tracking-tight">
                    {config.title}
                  </h3>
                )}
              </div>
            )}

            {config.description && (
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
                {config.description}
              </p>
            )}

            {/* Action CTA Button */}
            <button
              type="button"
              onClick={handleActionClick}
              className="w-full bg-gradient-to-r from-[#EF2B2D] via-orange-500 to-amber-500 hover:brightness-105 active:scale-[0.98] text-white py-4 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_12px_32px_rgba(249,115,22,0.25)] hover:shadow-[0_16px_36px_rgba(249,115,22,0.35)] transition-all cursor-pointer group"
            >
              <span>{config.buttonText || (config.linkUrl ? "Profiter de l'offre" : "J'en profite")}</span>
              <ExternalLink size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            {/* Footer option: Don't show again today */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              <label className="flex items-center gap-2 font-semibold hover:text-slate-800 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={dontShowAgainToday}
                  onChange={(e) => setDontShowAgainToday(e.target.checked)}
                  className="rounded border-slate-300 text-[#EF2B2D] focus:ring-[#EF2B2D] w-4 h-4 transition cursor-pointer"
                />
                <span className="group-hover:translate-x-0.5 transition-transform">Ne plus afficher aujourd'hui</span>
              </label>

              <button
                type="button"
                onClick={handleClose}
                className="font-bold hover:text-slate-800 transition cursor-pointer py-1 px-2 hover:bg-slate-100 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
