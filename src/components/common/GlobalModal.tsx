import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, HelpCircle, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type: 'success' | 'confirm' | 'info' | 'error';
  confirmLabel?: string;
  cancelLabel?: string;
}

export const GlobalModal: React.FC<GlobalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type,
  confirmLabel = 'OK',
  cancelLabel = 'Annuler'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 transition"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mb-6",
                type === 'success' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500",
                type === 'confirm' && "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500",
                type === 'error' && "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500",
                type === 'info' && "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-500"
              )}>
                {type === 'success' && <CheckCircle2 size={32} />}
                {type === 'confirm' && <HelpCircle size={32} />}
                {type === 'error' && <AlertCircle size={32} />}
                {type === 'info' && <Info size={32} />}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Globe size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notification Système</span>
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-3">
                {title}
              </h3>
              
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                {message}
              </div>

              <div className="flex items-center gap-3 w-full mt-8">
                {type === 'confirm' && (
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition cursor-pointer"
                  >
                    {cancelLabel}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "flex-1 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-lg",
                    type === 'success' && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50 dark:shadow-none",
                    type === 'error' && "bg-red-600 hover:bg-red-700 text-white shadow-red-200/50 dark:shadow-none",
                    "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200/50 dark:shadow-none"
                  )}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
