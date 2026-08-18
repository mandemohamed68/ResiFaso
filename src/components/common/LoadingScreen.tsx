import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

interface LoadingScreenProps {
  onDismiss?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onDismiss }) => {
  const [progress, setProgress] = useState(15);
  const [statusIndex, setStatusIndex] = useState(0);
  const [showDirectAccess, setShowDirectAccess] = useState(false);

  const statusMessages = [
    "Initialisation sécurisée...",
    "Recherche des meilleures résidences...",
    "Optimisation de votre expérience...",
    "Bienvenue sur ResiFaso !"
  ];

  useEffect(() => {
    // Smooth progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const step = Math.floor(Math.random() * 18) + 12;
        const next = Math.min(100, prev + step);
        return next;
      });
    }, 280);

    // Dynamic status text transition
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 600);

    // If still showing after 2.2 seconds, automatically trigger onDismiss if provided
    const autoDismissTimer = setTimeout(() => {
      if (onDismiss) {
        onDismiss();
      }
    }, 2400);

    // Fallback emergency button if network is slow (> 1.8 seconds)
    const fallbackTimer = setTimeout(() => {
      setShowDirectAccess(true);
    }, 1800);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
      clearTimeout(autoDismissTimer);
      clearTimeout(fallbackTimer);
    };
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.35, ease: "easeInOut" } }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-6 sm:p-10 bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 select-none overflow-hidden"
    >
      {/* Background Decorative Ambient Soft Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-red-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-emerald-500/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Top Header Badge */}
      <div className="relative z-10 pt-4 flex items-center justify-center">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-slate-200/80 shadow-sm backdrop-blur-md text-[11px] font-bold text-slate-700 tracking-wider"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span>Plateforme Officielle • Burkina Faso</span>
        </motion.div>
      </div>

      {/* Center Hero Identity Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center my-auto">
        {/* Logo Container with Ambient Ring */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          {/* Outer glowing pulsing aura */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.45, 0.2],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-4 bg-gradient-to-tr from-red-500 via-amber-400 to-emerald-500 rounded-3xl blur-xl opacity-30"
          />

          {/* Logo Card */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-4 shadow-xl shadow-slate-200/70 flex items-center justify-center border border-slate-100">
            <img 
              src="/logoresifasoORG.png" 
              alt="ResiFaso Logo" 
              className="w-full h-full object-contain"
            />
            {/* Spinning accent border */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1 border-2 border-transparent border-t-red-600 border-r-emerald-500 rounded-3xl pointer-events-none"
            />
          </div>
        </motion.div>

        {/* Brand Name & Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-2.5"
        >
          <div className="inline-flex items-center justify-center gap-1.5">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Resi<span className="text-red-600">Faso</span>
            </h1>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>

          <p className="text-sm font-medium text-slate-600 leading-relaxed px-4">
            La référence de la réservation de logements et résidences meublées au Burkina Faso
          </p>

          <div className="flex items-center justify-center gap-2 pt-1 text-slate-500 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sécurisé • Garanti • Sans frais cachés</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Progress & Action Section */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center space-y-3.5 pb-4">
        {/* Dynamic Status Text */}
        <div className="h-6 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-xs font-semibold text-slate-600 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-600 animate-spin" />
              <span>{statusMessages[statusIndex]}</span>
            </motion.p>
          </AnimatePresence>
        </div>

        {/* High-Tech Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-2 p-0.5 border border-slate-300/40 overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Burkina Faso National Accent Bar */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <div className="w-5 h-1 rounded-full bg-red-600" />
          <div className="w-1.5 h-1.5 rotate-45 bg-amber-500" />
          <div className="w-5 h-1 rounded-full bg-emerald-600" />
        </div>

        {/* Emergency Fast-Access Button (Appears if loading takes > 1.8s) */}
        {showDirectAccess && onDismiss && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onDismiss}
            className="mt-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all cursor-pointer"
          >
            <span>Accéder directement</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
