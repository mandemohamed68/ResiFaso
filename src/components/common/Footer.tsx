import { apiFetch } from "../../lib/api";
import React, { useEffect, useState } from 'react';

interface FooterProps {
  onNavigate?: (view: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [footerContent, setFooterContent] = useState<string>("© 2026 ResiFaso. Tous droits réservés.");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiFetch('/api/settings/global');
        if (response.ok) {
          const data = await response.json();
          if (data.footerContent) setFooterContent(data.footerContent);
        }
      } catch (err) {
        console.error("Error fetching footer settings:", err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400 py-6 px-4 text-center border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-3">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          <a 
            href="/accueil" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('showcase'); }} 
            className="hover:text-red-500 transition-colors cursor-pointer text-white font-black"
          >
            Présentation <span className="text-emerald-500">Resi</span><span className="text-red-500">Faso</span>
          </a>
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('home'); }} 
            className="hover:text-red-500 transition-colors cursor-pointer"
          >
            Trouver un Logement
          </a>
          <a 
            href="https://www.resifaso.net/Conditions_Generales" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('tos'); }} 
            className="hover:text-red-500 transition-colors cursor-pointer"
          >
            Conditions Générales
          </a>
          <a 
            href="https://www.resifaso.net/Politique_de_Confidentialite" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('privacy'); }} 
            className="hover:text-red-500 transition-colors cursor-pointer"
          >
            Politique de Confidentialité
          </a>
          <a 
            href="/faq" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('faq'); }} 
            className="hover:text-red-500 transition-colors cursor-pointer"
          >
            FAQ
          </a>
          <a 
            href="/contact" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('contact'); }} 
            className="hover:text-red-500 transition-colors cursor-pointer text-[#EF2B2D] font-extrabold"
          >
            Contact
          </a>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-px bg-slate-800"></span>
            <p className="font-bold text-slate-300 tracking-wide text-xs">
              {footerContent === "© 2026 ResiFaso. Tous droits réservés." ? (
                <>
                  © 2026 <span className="text-emerald-500">Resi</span><span className="text-red-500 font-extrabold">Faso</span>. Tous droits réservés.
                </>
              ) : footerContent}
            </p>
            <span className="w-8 h-px bg-slate-800"></span>
          </div>
          <p className="text-[9px] text-slate-600 font-medium">Plateforme sécurisée pour séjours de courte durée au Burkina Faso</p>
        </div>
      </div>
    </footer>
  );
};
