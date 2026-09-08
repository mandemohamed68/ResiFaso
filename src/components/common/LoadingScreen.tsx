import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  onDismiss?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onDismiss }) => {
  useEffect(() => {
    // Automatically trigger onDismiss after 600ms so platform appears quickly
    const timer = setTimeout(() => {
      if (onDismiss) {
        onDismiss();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25, ease: "easeOut" } }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-white select-none overflow-hidden"
    >
      {/* Center Squircle Logo Card */}
      <div className="relative flex flex-col items-center">
        {/* Soft Burkina Colors Ambient Backlight Glow */}
        <div
          className="absolute -inset-3 sm:-inset-4 rounded-[42px] sm:rounded-[46px] bg-gradient-to-tr from-[#EF2B2D] via-[#FCD116] to-[#009E49] blur-2xl opacity-50 pointer-events-none"
        />

        {/* White Rounded App Icon Box */}
        <div
          className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-[36px] sm:rounded-[40px] bg-white p-3 sm:p-4 shadow-2xl shadow-slate-300/70 border border-slate-100 flex items-center justify-center ring-4 ring-red-500/10"
        >
          <img 
            src="/LOGO%20RESIFASO.png" 
            alt="ResiFaso Logo" 
            className="w-full h-full object-contain filter drop-shadow-sm"
          />
        </div>

        {/* Brand title & loading indicator */}
        <div className="mt-5 flex flex-col items-center">
          <span className="text-xl sm:text-2xl font-black tracking-tight leading-none flex items-center">
            <span className="text-[#EF2B2D]">Resi</span>
            <span className="text-[#009E49]">Faso</span>
            <span className="text-[#FCD116] ml-1 text-sm animate-pulse">★</span>
          </span>
          <div className="w-32 h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#EF2B2D] via-[#FCD116] to-[#009E49] w-full animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

