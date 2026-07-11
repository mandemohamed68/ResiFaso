import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
    >
      <div className="relative">
        {/* Animated Background Ring */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -inset-8 bg-red-500 rounded-full blur-3xl"
        />

        {/* Logo / Icon Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-24 h-24 mb-6 relative">
            <img 
              src="/logoresifasoORG.png" 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
            {/* Soft Spinner Border */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-2 border-2 border-transparent border-t-red-600 rounded-full"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">
              ResiFaso
            </h2>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
              <ShieldCheck size={12} className="text-red-500" />
              <span>Sécurisé & Garanti</span>
            </div>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.15em] opacity-60 max-w-[200px] mx-auto leading-relaxed">
              Le Pays des Hommes Intègres vous accueille avec excellence
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Loading Progress Bar (Purely Visual for Style) */}
      <div className="absolute bottom-12 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="h-full w-1/2 bg-red-600 rounded-full"
        />
      </div>
    </motion.div>
  );
};
