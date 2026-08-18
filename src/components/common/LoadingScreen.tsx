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
      <div className="relative">
        {/* Soft Multi-color Rainbow Ambient Backlight Glow */}
        <div
          className="absolute -inset-3 sm:-inset-4 rounded-[38px] sm:rounded-[42px] bg-gradient-to-tr from-red-500 via-amber-400 to-emerald-500 blur-2xl opacity-60 pointer-events-none"
        />

        {/* White Rounded App Icon Box */}
        <div
          className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-[32px] sm:rounded-[36px] bg-white p-6 sm:p-8 shadow-2xl shadow-slate-300/60 border border-slate-100 flex items-center justify-center"
        >
          <img 
            src="/logoresifasoORG.png" 
            alt="ResiFaso Logo" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </motion.div>
  );
};

