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
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 pb-10 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 my-auto sm:my-0 max-h-[88vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
                type === 'success' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                type === 'confirm' && "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
                type === 'error' && "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
                type === 'info' && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              )}>
                {type === 'success' && <CheckCircle2 size={24} />}
                {type === 'confirm' && <HelpCircle size={24} />}
                {type === 'error' && <AlertCircle size={24} />}
                {type === 'info' && <Info size={24} />}
              </div>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Notification
              </span>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2">
                {title}
              </h3>
              
              <div className="text-slate-600 dark:text-slate-400 text-sm font-normal leading-relaxed whitespace-pre-wrap">
                {message}
              </div>

              <div className="flex items-center gap-3 w-full mt-6">
                {type === 'confirm' && (
                  <button
                    onClick={onClose}
                    className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
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
                    "flex-1 px-5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm",
                    type === 'success' && "bg-emerald-700 hover:bg-emerald-800 text-white",
                    type === 'error' && "bg-red-600 hover:bg-red-700 text-white",
                    type === 'confirm' && "bg-slate-900 hover:bg-slate-800 text-white",
                    type === 'info' && "bg-slate-900 hover:bg-slate-800 text-white"
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
