import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface FooterProps {
  onNavigate?: (view: 'tos' | 'privacy' | 'home' | 'faq' | 'contact') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [footerContent, setFooterContent] = useState<string>("© 2026 ResiFaso. Tous droits réservés.");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().footerContent) {
        setFooterContent(docSnap.data().footerContent);
      }
    });
    return () => unsub();
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400 py-[8vh] px-4 text-center border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-6">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
          <button onClick={() => onNavigate?.('home')} className="hover:text-red-500 transition-colors cursor-pointer">Accueil</button>
          <button onClick={() => onNavigate?.('tos')} className="hover:text-red-500 transition-colors cursor-pointer">Conditions d'utilisation</button>
          <button onClick={() => onNavigate?.('privacy')} className="hover:text-red-500 transition-colors cursor-pointer">Confidentialité</button>
          <button onClick={() => onNavigate?.('faq')} className="hover:text-red-500 transition-colors cursor-pointer">FAQ</button>
          <button onClick={() => onNavigate?.('contact')} className="hover:text-red-500 transition-colors cursor-pointer text-[#EF2B2D] font-extrabold">Contact</button>
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-px bg-slate-800"></span>
            <p className="font-bold text-slate-300 tracking-wide text-xs">{footerContent}</p>
            <span className="w-8 h-px bg-slate-800"></span>
          </div>
          <p className="text-[9px] text-slate-600 font-medium">Plateforme sécurisée pour séjours de courte durée au Burkina Faso</p>
        </div>
      </div>
    </footer>
  );
};
