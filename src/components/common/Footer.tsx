import React, { useEffect, useState } from 'react';
import { ShieldCheck, Headphones, Lock, MapPin, Mail, Phone, ArrowUpRight } from 'lucide-react';
import { apiFetch } from "../../lib/api";
import { useBrandingSettings } from '../../hooks/useQueries';

interface FooterProps {
  onNavigate?: (view: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [footerContent, setFooterContent] = useState<string>("© 2026 ResiFaso. Tous droits réservés.");
  const [contactPhone, setContactPhone] = useState<string>("+226 70 12 34 56");
  const [contactEmail, setContactEmail] = useState<string>("support@resifaso.com");
  const { data: branding } = useBrandingSettings();

  const bName1 = branding?.brandNamePart1 || 'Resi';
  const bName2 = branding?.brandNamePart2 || 'Faso';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [globalRes, contactRes] = await Promise.all([
          apiFetch('/api/settings/global'),
          apiFetch('/api/settings/contactSettings')
        ]);
        
        if (globalRes.ok) {
          const data = await globalRes.json();
          if (data.footerContent) setFooterContent(data.footerContent);
        }

        if (contactRes.ok) {
          const contactData = await contactRes.json();
          if (contactData.phone || contactData.whatsappNumber) {
            setContactPhone(contactData.phone || contactData.whatsappNumber);
          }
          if (contactData.email) {
            setContactEmail(contactData.email);
          }
        }
      } catch (err) {
        console.error("Error fetching footer settings:", err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto text-xs font-normal select-none">
      {/* Top Value Propositions */}
      <div className="border-b border-slate-800/80 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Logements vérifiés</h4>
                <p className="text-[11px] text-slate-400">Contrôle de conformité et d'équipements</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400 shrink-0">
                <Headphones size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Support & Conciergerie</h4>
                <p className="text-[11px] text-slate-400">Équipe locale dédiée à votre séjour</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-sky-400 shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Réservation sécurisée</h4>
                <p className="text-[11px] text-slate-400">Paiements fiables (Mobile Money & Carte)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Directory Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 space-y-4">
            <div 
              onClick={() => onNavigate?.('home')}
              className="inline-flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-white p-0.5 border border-slate-700 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                <img src="/LOGO%20RESIFASO.png" alt="ResiFaso" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-lg font-black tracking-tight text-white flex items-center leading-none">
                  <span className="text-[#EF2B2D]">{bName1}</span>
                  <span className="text-[#009E49]">{bName2}</span>
                  <span className="text-[#FCD116] ml-1 text-sm">★</span>
                </span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                  Résidences Meublées au Faso
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              La plateforme de référence pour réserver des résidences meublées, appartements et villas de standing sécurisés à Ouagadougou, Bobo-Dioulasso et dans tout le Burkina Faso.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
              <MapPin size={13} className="text-[#EF2B2D] shrink-0" />
              <span>Ouagadougou • Bobo-Dioulasso • Koudougou</span>
            </div>
          </div>

          {/* Navigation Links Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Découvrir
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('home')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>Trouver un logement</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('showcase')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>Présentation & Services</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('faq')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>Questions fréquentes (FAQ)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Safety Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Cadre & Confiance
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('tos')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>Conditions Générales</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('privacy')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>Politique de Confidentialité</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('guide')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>Guide de réservation</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Support & Contact Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Assistance & Contact
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a 
                  href={`tel:${contactPhone.replace(/\s+/g, '')}`} 
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs"
                >
                  <Phone size={13} className="text-emerald-400 shrink-0" />
                  <span>{contactPhone}</span>
                </a>
              </li>
              <li>
                <a 
                  href={`mailto:${contactEmail}`} 
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs truncate"
                >
                  <Mail size={13} className="text-sky-400 shrink-0" />
                  <span className="truncate">{contactEmail}</span>
                </a>
              </li>
              <li className="pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate?.('contact')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <span>Nous écrire</span>
                  <ArrowUpRight size={13} />
                </button>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Sub-Footer Copyright Bar */}
      <div className="border-t border-slate-800/80 bg-slate-950 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px] text-slate-500">
          <div>
            {footerContent}
          </div>
          <div className="flex items-center gap-2">
            <span>Hospitalité & Confort au Burkina Faso</span>
            <span>🇧🇫</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
