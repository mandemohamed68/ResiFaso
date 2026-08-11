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

  const badgeText = config.badgeText || (config.title ? '' : 'OFFRE SPÉCIALE');
  const imageFit = config.imageFit || 'contain'; // Default to 'contain' so full image is always visible
  const showOverlay = !!config.showTitleOnOverlay;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity cursor-pointer"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[460px] bg-white rounded-[32px] shadow-2xl overflow-visible border border-slate-100 z-10 my-auto"
        >
          {/* Prominent Circular Floating Close Button (Orange/Red Max-It Style) */}
          <button
            onClick={handleClose}
            type="button"
            aria-label="Fermer la publicité"
            className="absolute -top-3.5 -right-3.5 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white rounded-full flex items-center justify-center shadow-xl ring-4 ring-white hover:scale-110 active:scale-95 transition-all cursor-pointer z-50 group"
          >
            <X size={20} className="stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Main Visual Image Banner Container */}
          <div className="relative w-full rounded-t-[32px] overflow-hidden bg-slate-950 flex items-center justify-center">
            {imageFit === 'contain' ? (
              /* Contain Mode: Full image is 100% visible without cropping + Blurred background fill */
              <div className="relative w-full min-h-[220px] max-h-[380px] flex items-center justify-center p-2 bg-slate-950">
                {/* Soft Blurred Backdrop matching image colors */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-125 pointer-events-none"
                  style={{ backgroundImage: `url(${config.imageUrl})` }}
                />

                {/* Main Intact Poster Image */}
                <img
                  src={config.imageUrl}
                  alt={config.title || 'Publicité promotionnelle'}
                  className="relative z-10 max-h-[360px] w-auto max-w-full object-contain rounded-xl shadow-lg transition-transform duration-500 hover:scale-[1.02]"
                />
              </div>
            ) : (
              /* Cover Mode: Crops image to fill fixed aspect ratio */
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-slate-900">
                <img
                  src={config.imageUrl}
                  alt={config.title || 'Publicité promotionnelle'}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            )}

            {/* Top Badge Overlay */}
            {badgeText && (
              <div className="absolute top-3.5 left-3.5 z-20">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-md border border-white/20"
                  style={{ backgroundColor: config.badgeColor || '#EF2B2D' }}
                >
                  <Sparkles size={12} className="animate-pulse" />
                  {badgeText}
                </span>
              </div>
            )}

            {/* Optional Overlay Text (Only if specifically requested) */}
            {showOverlay && (config.title || config.subtitle) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 text-white pt-10 z-20">
                {config.title && (
                  <h3 className="font-black text-base sm:text-lg leading-tight text-white drop-shadow-md">
                    {config.title}
                  </h3>
                )}
                {config.subtitle && (
                  <p className="text-xs font-bold text-amber-300 mt-0.5">
                    {config.subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Content Body & CTA Button */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Title & Subtitle in Clean Body Section (Avoids text overlap on image) */}
            {!showOverlay && (config.title || config.subtitle) && (
              <div className="space-y-1">
                {config.subtitle && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#EF2B2D] block">
                    {config.subtitle}
                  </span>
                )}
                {config.title && (
                  <h3 className="font-black text-slate-900 text-lg sm:text-xl leading-tight">
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
              className="w-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-700 hover:to-orange-600 text-white py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-orange-500/20 hover:shadow-orange-500/35 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <span>{config.buttonText || (config.linkUrl ? "Profiter de l'offre" : "J'en profite")}</span>
              <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Footer option: Don't show again today */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
              <label className="flex items-center gap-2 text-slate-500 font-semibold hover:text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgainToday}
                  onChange={(e) => setDontShowAgainToday(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                />
                <span>Ne plus afficher aujourd'hui</span>
              </label>

              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 font-bold hover:text-slate-700 transition cursor-pointer"
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
