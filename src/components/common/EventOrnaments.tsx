import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart, Star, Moon } from 'lucide-react';

interface EventOrnamentsProps {
  theme: string;
  enabled: boolean;
}

export const EventOrnaments: React.FC<EventOrnamentsProps> = ({ theme, enabled }) => {
  if (!enabled) return null;

  if (theme === 'christmas') {
    return (
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9990] overflow-visible">
        {/* Left Christmas Baubles */}
        <div className="absolute top-0 left-6 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [-6, 6, -6] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-12 bg-amber-400/80 shadow-sm" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-lg border border-amber-300 flex items-center justify-center relative">
              <span className="text-[9px] text-amber-200">❄️</span>
              <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-white/40 blur-[0.5px]" />
            </div>
          </motion.div>

          <motion.div
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-8 bg-amber-400/80 shadow-sm" />
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 shadow-md border border-amber-300 flex items-center justify-center relative">
              <div className="absolute top-0.5 left-1 w-1.5 h-1.5 rounded-full bg-white/40 blur-[0.5px]" />
            </div>
          </motion.div>
        </div>

        {/* Right Christmas Baubles */}
        <div className="absolute top-0 right-6 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-10 bg-amber-400/80 shadow-sm" />
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-md border border-amber-200 flex items-center justify-center relative">
              <span className="text-[8px] text-amber-100">✨</span>
              <div className="absolute top-1 left-1.5 w-2 h-2 rounded-full bg-white/40 blur-[0.5px]" />
            </div>
          </motion.div>

          <motion.div
            animate={{ rotate: [6, -6, 6] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-14 bg-amber-400/80 shadow-sm" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-lg border border-amber-300 flex items-center justify-center relative">
              <span className="text-[9px] text-amber-200">⭐</span>
              <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-white/40 blur-[0.5px]" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (theme === 'newyear') {
    return (
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9990] flex justify-center">
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mt-2 px-4 py-1 rounded-full bg-slate-900/90 text-amber-300 border border-amber-400/40 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-black tracking-wide"
        >
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          <span>✨ Bonne Année 2026 ! ✨</span>
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
        </motion.div>
      </div>
    );
  }

  if (theme === 'valentines') {
    return (
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9990] overflow-visible">
        {/* Left Hanging Hearts */}
        <div className="absolute top-0 left-8 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [-6, 6, -6], y: [0, 4, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-10 bg-pink-300/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-pink-500 text-white shadow-lg border border-pink-200">
              <Heart size={16} fill="currentColor" />
            </div>
          </motion.div>
        </div>

        {/* Right Hanging Hearts */}
        <div className="absolute top-0 right-8 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [6, -6, 6], y: [0, 4, 0] }}
            transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-12 bg-rose-300/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-rose-600 text-white shadow-lg border border-rose-200">
              <Heart size={18} fill="currentColor" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (theme === 'ramadan') {
    return (
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9990] overflow-visible">
        <div className="absolute top-0 left-8 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-11 bg-amber-400/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-emerald-700 text-amber-300 shadow-md border border-amber-400">
              <Moon size={16} fill="currentColor" />
            </div>
          </motion.div>
        </div>

        <div className="absolute top-0 right-8 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-9 bg-amber-400/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-emerald-800 text-amber-300 shadow-md border border-amber-400">
              <Star size={16} fill="currentColor" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (theme === 'burkina' || theme === 'celebration') {
    return (
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9990] overflow-visible">
        {/* Left Burkina National Ribbon */}
        <div className="absolute top-0 left-6">
          <div className="flex flex-col items-center">
            <div className="w-6 h-8 bg-red-600 border-x border-slate-900/10 relative shadow-sm">
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-emerald-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] text-amber-300 font-bold">★</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Burkina National Ribbon */}
        <div className="absolute top-0 right-6">
          <div className="flex flex-col items-center">
            <div className="w-6 h-8 bg-red-600 border-x border-slate-900/10 relative shadow-sm">
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-emerald-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] text-amber-300 font-bold">★</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (theme === 'rainy') {
    return (
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9990] overflow-visible">
        <div className="absolute top-0 left-8 flex items-start gap-4">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-9 bg-sky-300/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-sky-600 text-white shadow-md border border-sky-300 text-[11px]">
              💧
            </div>
          </motion.div>
        </div>
        <div className="absolute top-0 right-8 flex items-start gap-4">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-11 bg-sky-300/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-sky-700 text-white shadow-md border border-sky-200 text-[11px]">
              🌧️
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (theme === 'harmattan') {
    return (
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9990] overflow-visible">
        <div className="absolute top-0 left-8 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [-4, 4, -4] }}
            transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-10 bg-amber-400/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-amber-600 text-amber-100 shadow-md border border-amber-300 text-[11px]">
              🏜️
            </div>
          </motion.div>
        </div>
        <div className="absolute top-0 right-8 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [4, -4, 4] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-12 bg-amber-400/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-amber-700 text-amber-200 shadow-md border border-amber-300 text-[11px]">
              ✨
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (theme === 'spring') {
    return (
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9990] overflow-visible">
        <div className="absolute top-0 left-8 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [-6, 6, -6], y: [0, 4, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-10 bg-pink-300/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-pink-500 text-white shadow-md border border-pink-200 text-[11px]">
              🌸
            </div>
          </motion.div>
        </div>
        <div className="absolute top-0 right-8 flex items-start gap-4">
          <motion.div
            animate={{ rotate: [6, -6, 6], y: [0, 4, 0] }}
            transition={{ duration: 3.9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{ transformOrigin: 'top center' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1.5px] h-12 bg-emerald-300/80 shadow-sm" />
            <div className="p-1.5 rounded-full bg-emerald-600 text-white shadow-md border border-emerald-200 text-[11px]">
              🌿
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
};
