import React, { useEffect, useState } from 'react';
import { getGlobalSettings } from '../../lib/db';

export const Footer: React.FC = () => {
  const [footerContent, setFooterContent] = useState<string>("© 2026 ResiFaso. Tous droits réservés.");

  useEffect(() => {
    async function loadFooter() {
      try {
        const settings = await getGlobalSettings('global');
        if (settings && settings.footerContent) {
          setFooterContent(settings.footerContent);
        }
      } catch (err) {
        console.error("Error loading footer settings:", err);
      }
    }
    loadFooter();
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400 py-[6vh] px-4 text-center text-sm border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-2">
        <p className="font-bold text-slate-300 tracking-wide">{footerContent}</p>
      </div>
    </footer>
  );
};
