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
      {/* Compact Main Footer Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-2.5">
            <div 
              onClick={() => onNavigate?.('home')}
              className="inline-flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-md bg-white p-0.5 border border-slate-700 shadow-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                <img src="/LOGO%20RESIFASO.png" alt="ResiFaso" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-base font-black tracking-tight text-white flex items-center leading-none">
                  <span className="text-[#EF2B2D]">{bName1}</span>
                  <span className="text-[#009E49]">{bName2}</span>
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">
                  Résidences Meublées
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Plateforme de réservation de résidences meublées et villas de standing sécurisées au Burkina Faso.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span>Ouagadougou • Bobo-Dioulasso • Koudougou</span>
            </div>
          </div>

          {/* Navigation Links Column */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
              Découvrir
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('home')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Trouver un logement
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('showcase')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Services & Atouts
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('faq')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
              Cadre légal
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('tos')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Conditions Générales
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('privacy')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Confidentialité
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('guide')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Guide voyageur
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Support & Contact Column */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
              Contact
            </h4>
            <ul className="space-y-1.5">
              <li>
                <a 
                  href={`tel:${contactPhone.replace(/\s+/g, '')}`} 
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
                >
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  <span>{contactPhone}</span>
                </a>
              </li>
              <li>
                <a 
                  href={`mailto:${contactEmail}`} 
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs truncate"
                >
                  <Mail size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">{contactEmail}</span>
                </a>
              </li>
              <li className="pt-0.5">
                <button
                  type="button"
                  onClick={() => onNavigate?.('contact')}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <span>Nous écrire</span>
                  <ArrowUpRight size={11} />
                </button>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Sub-Footer Copyright Bar */}
      <div className="border-t border-slate-800/60 bg-slate-950/80 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[11px] text-slate-500">
          <div>
            {footerContent}
          </div>
          <div className="text-slate-500">
            Séjours & Résidences au Burkina Faso
          </div>
        </div>
      </div>
    </footer>
  );
};
