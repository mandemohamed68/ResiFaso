import React from 'react';
import { CheckCircle2, Star, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FeatureProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const Feature = ({ title, description }: { title: string; description: string }) => (
  <div className="p-4 sm:p-5 bg-slate-50/80 border border-slate-200/70 rounded-2xl transition-all shadow-2xs">
    <h3 className="text-sm font-black text-slate-900 tracking-tight mb-1">{title}</h3>
    <p className="text-xs font-medium text-slate-500 leading-relaxed">{description}</p>
  </div>
);

export const Features = () => {
  return (
    <div className="py-6 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Feature 
            title="Sécurité Garantie" 
            description="Toutes nos résidences sont vérifiées manuellement par nos équipes." 
          />
          <Feature 
            title="Qualité Premium" 
            description="Nous sélectionnons uniquement les meilleurs logements pour vous." 
          />
          <Feature 
            title="Support Local" 
            description="Une équipe sur place à Ouagadougou pour vous accompagner." 
          />
        </div>
      </div>
    </div>
  );
};
