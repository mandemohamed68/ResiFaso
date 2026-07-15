import React from 'react';
import { CheckCircle2, Star, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FeatureProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const Feature = ({ icon: Icon, title, description }: FeatureProps) => (
  <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-red-100 transition-all shadow-sm">
    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
      <Icon size={20} className="stroke-[2.5]" />
    </div>
    <div>
      <h3 className="text-sm font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-[11px] font-medium text-slate-500 leading-tight">{description}</p>
    </div>
  </div>
);

export const Features = () => {
  return (
    <div className="py-8 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Feature 
            icon={CheckCircle2} 
            title="Sécurité Garantie" 
            description="Toutes nos résidences sont vérifiées manuellement par nos équipes." 
          />
          <Feature 
            icon={Star} 
            title="Qualité Premium" 
            description="Nous sélectionnons uniquement les meilleurs logements pour vous." 
          />
          <Feature 
            icon={ShieldCheck} 
            title="Support Local" 
            description="Une équipe sur place à Ouagadougou pour vous accompagner." 
          />
        </div>
      </div>
    </div>
  );
};
