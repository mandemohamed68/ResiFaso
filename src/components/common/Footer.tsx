import React, { useEffect, useState } from 'react';
import { apiFetch } from "../../lib/api";

interface FooterProps {
  onNavigate?: (view: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [footerContent, setFooterContent] = useState<string>("© 2026 ResiFaso");

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
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 mt-auto py-8 sm:py-10 text-slate-700 dark:text-slate-300 text-xs font-medium select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Links and copyright row */}
        <div className="flex flex-col items-center justify-center gap-y-4 pb-8 text-center">
          <span className="font-semibold text-slate-900 dark:text-white">
            {footerContent === "© 2026 ResiFaso. Tous droits réservés." ? "© 2026 ResiFaso" : footerContent}
          </span>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a 
              href="/accueil" 
              onClick={(e) => { e.preventDefault(); onNavigate?.('showcase'); }} 
              className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Présentation
            </a>
            <a 
              href="/" 
              onClick={(e) => { e.preventDefault(); onNavigate?.('home'); }} 
              className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Trouver un Logement
            </a>
            <a
              href="/Politique_de_Confidentialite"
              onClick={(e) => { e.preventDefault(); onNavigate?.('privacy'); }}
              className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Politique de Confidentialité
            </a>
            <a
              href="/Conditions_Generales"
              onClick={(e) => { e.preventDefault(); onNavigate?.('tos'); }}
              className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Conditions Générales
            </a>
            <a
              href="/faq"
              onClick={(e) => { e.preventDefault(); onNavigate?.('faq'); }}
              className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </a>
            <a
              href="/contact"
              onClick={(e) => { e.preventDefault(); onNavigate?.('contact'); }}
              className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Contact
            </a>
          </div>
        </div>

        {/* Trust features section as clean plain text without card borders or backgrounds */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-1">
              Sécurité Garantie
            </h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Toutes nos résidences sont vérifiées manuellement par nos équipes.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-1">
              Qualité Premium
            </h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Nous sélectionnons uniquement les meilleurs logements pour vous.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-1">
              Support Local
            </h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Une équipe sur place à Ouagadougou pour vous accompagner.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

