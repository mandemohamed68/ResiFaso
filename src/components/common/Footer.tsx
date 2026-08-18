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
    <footer className="bg-slate-950 text-white py-8 px-4 text-center border-t border-slate-800/80 mt-auto select-none">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4">
        {/* Navigation Links - Unified Pure White */}
        <div className="flex flex-wrap justify-center items-center gap-x-6 sm:gap-x-8 gap-y-2.5 text-xs font-bold uppercase tracking-wider text-white">
          <a 
            href="/accueil" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('showcase'); }} 
            className="text-white hover:text-white/75 transition-colors cursor-pointer"
          >
            Présentation ResiFaso
          </a>
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('home'); }} 
            className="text-white hover:text-white/75 transition-colors cursor-pointer"
          >
            Trouver un Logement
          </a>
          <a 
            href="https://www.resifaso.net/Conditions_Generales" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('tos'); }} 
            className="text-white hover:text-white/75 transition-colors cursor-pointer"
          >
            Conditions Générales
          </a>
          <a 
            href="https://www.resifaso.net/Politique_de_Confidentialite" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('privacy'); }} 
            className="text-white hover:text-white/75 transition-colors cursor-pointer"
          >
            Politique de Confidentialité
          </a>
          <a 
            href="/faq" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('faq'); }} 
            className="text-white hover:text-white/75 transition-colors cursor-pointer"
          >
            FAQ
          </a>
          <a 
            href="/contact" 
            onClick={(e) => { e.preventDefault(); onNavigate?.('contact'); }} 
            className="text-white hover:text-white/75 transition-colors cursor-pointer"
          >
            Contact
          </a>
        </div>
        
        {/* Divider & Copyright */}
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-800/60 w-full max-w-2xl">
          <p className="font-semibold text-white tracking-wide text-xs sm:text-sm">
            {footerContent === "© 2026 ResiFaso. Tous droits réservés." ? (
              "© 2026 ResiFaso. Tous droits réservés."
            ) : footerContent}
          </p>
          <p className="text-[11px] sm:text-xs text-white/80 font-normal">
            Plateforme sécurisée pour séjours et résidences meublées au Burkina Faso
          </p>
        </div>
      </div>
    </footer>
  );
};
