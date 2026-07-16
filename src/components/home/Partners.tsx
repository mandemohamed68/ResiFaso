import React from 'react';
import { motion } from 'motion/react';
import { usePartners } from '../../hooks/useQueries';

export const Partners = () => {
  const { data: partners = [] } = usePartners();
  const activePartners = partners.filter(p => p.isActive);

  if (activePartners.length === 0) return null;

  return (
    <div className="py-12 bg-slate-50/50 border-t border-slate-100 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 mb-8 text-center">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ils nous font confiance</h2>
      </div>
      
      <div className="flex overflow-hidden">
        <motion.div 
          className="flex items-center gap-16 whitespace-nowrap px-4"
          animate={{ x: [0, -1000] }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {[...activePartners, ...activePartners, ...activePartners].map((partner, idx) => {
            const hasWebsite = !!partner.websiteUrl;
            const content = (
              <>
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center p-1.5 border border-slate-100">
                  <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{partner.name}</span>
              </>
            );

            const className = "flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300 " + (hasWebsite ? "cursor-pointer" : "");

            if (hasWebsite) {
              return (
                <a 
                  key={`${partner.id}-${idx}`}
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {content}
                </a>
              );
            }

            return (
              <div key={`${partner.id}-${idx}`} className={className}>
                {content}
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
