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
    if (!config?.linkUrl) return;

    if (config.linkUrl.startsWith('http://') || config.linkUrl.startsWith('https://')) {
      window.open(config.linkUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = config.linkUrl;
    }

    handleClose();
  };

  if (!isOpen || !config) return null;

  const badgeText = config.badgeText || (config.title ? '' : 'OFFRE SPÉCIALE');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
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
          className="relative w-full max-w-[440px] bg-white rounded-[32px] shadow-2xl overflow-visible border border-slate-100 z-10 my-auto"
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

          {/* Main Visual Image Banner */}
          <div className="relative w-full rounded-t-[32px] overflow-hidden bg-slate-900 aspect-[4/3] sm:aspect-[16/11]">
            <img
              src={config.imageUrl}
              alt={config.title || 'Publicité promotionnelle'}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />

            {/* Top Badge Overlay */}
            {badgeText && (
              <div className="absolute top-4 left-4 z-20">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur-md border border-white/20"
                  style={{ backgroundColor: config.badgeColor || '#EF2B2D' }}
                >
                  <Sparkles size={12} className="animate-pulse" />
                  {badgeText}
                </span>
              </div>
            )}

            {/* Gradient overlay at bottom of image if text exists */}
            {(config.title || config.description) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-5 text-white pt-12">
                {config.title && (
                  <h3 className="font-black text-lg sm:text-xl leading-tight text-white drop-shadow-md">
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
            {config.description && (
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
                {config.description}
              </p>
            )}

            {/* Action CTA Button */}
            {config.linkUrl ? (
              <button
                type="button"
                onClick={handleActionClick}
                className="w-full bg-[#EF2B2D] hover:bg-red-700 text-white py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-xl shadow-red-200 hover:shadow-red-300 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span>{config.buttonText || "Profiter de l'offre"}</span>
                <ExternalLink size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                Compris
              </button>
            )}

            {/* Footer option: Don't show again today */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
              <label className="flex items-center gap-2 text-slate-400 font-medium hover:text-slate-600 cursor-pointer select-none">
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
                className="text-slate-400 font-bold hover:text-slate-700 transition"
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
