import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, AlertTriangle, Zap, Droplets, Wind, ShieldCheck, 
  Wifi, Car, Tv, Users, Bed, Bath, ArrowRight, Trash2, 
  Maximize2, Star, Sparkles, Scale, ExternalLink 
} from 'lucide-react';
import { Residence } from '../../types';
import { useComparison } from '../../contexts/ComparisonContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useGlobalSettings } from '../../hooks/useQueries';
import { cn } from '../../lib/utils';

interface ResidenceComparatorModalProps {
  onSelectResidence: (residence: Residence) => void;
}

export const ResidenceComparatorModal: React.FC<ResidenceComparatorModalProps> = ({ onSelectResidence }) => {
  const { 
    comparedResidences, 
    removeFromCompare, 
    clearComparison, 
    isComparatorOpen, 
    setIsComparatorOpen 
  } = useComparison();
  const { formatPrice } = useCurrency();
  const { data: gsData } = useGlobalSettings();
  const comparatorEnabled = gsData?.comparatorEnabled !== false;

  if (!comparatorEnabled || comparedResidences.length === 0) return null;

  return (
    <>
      {/* Floating Bottom Dock */}
      {!isComparatorOpen && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-3 sm:gap-4 max-w-[95vw] sm:max-w-xl"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 shrink-0">
              <Scale size={16} />
            </div>
            <div className="flex -space-x-2 overflow-hidden py-0.5">
              {comparedResidences.map((res) => (
                <img
                  key={res.id}
                  src={res.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=200'}
                  alt={res.title}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover"
                />
              ))}
            </div>
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold tracking-wide">
              {comparedResidences.length} {comparedResidences.length > 1 ? 'résidences à comparer' : 'résidence sélectionnée'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {comparedResidences.length < 3 ? `Ajoutez jusqu'à ${3 - comparedResidences.length} de plus` : 'Maximum de 3 atteint'}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setIsComparatorOpen(true)}
              className="bg-slate-100 hover:bg-white text-slate-900 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Comparer</span>
              <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {comparedResidences.length}/3
              </span>
            </button>

            <button
              type="button"
              onClick={clearComparison}
              title="Vider la sélection"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Full Screen Comparison Modal */}
      <AnimatePresence>
        {isComparatorOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setIsComparatorOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] z-10"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <Scale size={18} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                      <span>Comparateur de résidences</span>
                      <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-md">
                        {comparedResidences.length} {comparedResidences.length > 1 ? 'résidences' : 'résidence'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Comparez les tarifs, services et équipements côte à côte.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearComparison}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:block cursor-pointer"
                  >
                    Effacer tout
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsComparatorOpen(false)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Comparison Table Body (Horizontal scroll on mobile) */}
              <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6">
                <div className={cn(
                  "grid gap-4 sm:gap-6 min-w-[550px]",
                  comparedResidences.length === 1 && "grid-cols-1 max-w-md mx-auto",
                  comparedResidences.length === 2 && "grid-cols-2",
                  comparedResidences.length === 3 && "grid-cols-3"
                )}>
                  {comparedResidences.map((res) => {
                    const price = res.promoPrice || res.pricePerNight || 0;
                    const hasGenerator = res.amenities?.some(a => 
                      a.toLowerCase().includes('groupe') || a.toLowerCase().includes('générateur') || a.toLowerCase().includes('solaire')
                    ) || (res as any).hasGenerator;
                    const hasWater = res.utilitiesIncluded?.water || res.amenities?.some(a => 
                      a.toLowerCase().includes('eau') || a.toLowerCase().includes('forage') || a.toLowerCase().includes('surpresseur')
                    ) || (res as any).hasBorehole;
                    const hasAc = res.amenities?.some(a => 
                      a.toLowerCase().includes('clim') || a.toLowerCase().includes('air conditioning')
                    );
                    const hasWifi = res.amenities?.some(a => 
                      a.toLowerCase().includes('wifi') || a.toLowerCase().includes('wi-fi') || a.toLowerCase().includes('internet')
                    );

                    return (
                      <div 
                        key={res.id} 
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between overflow-hidden"
                      >
                        {/* Residence Card Top Image & Action */}
                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-900 group">
                          <img
                            src={res.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600'}
                            alt={res.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeFromCompare(res.id)}
                            title="Retirer de la comparaison"
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-slate-900/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                          <div className="absolute bottom-2 left-2">
                            <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                              {res.type || 'Résidence'}
                            </span>
                          </div>
                        </div>

                        {/* Residence Info & Highlights */}
                        <div className="p-4 flex-1 flex flex-col gap-3">
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                              <span>{res.address?.neighborhood || res.neighborhood || 'Ouagadougou'}, {res.address?.city || res.city || 'Burkina'}</span>
                              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                                <Star size={12} className="text-amber-500 fill-amber-500" />
                                {res.rating ? Number(res.rating).toFixed(1) : '4.8'}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                              {res.title}
                            </h3>
                          </div>

                          {/* Price Tag with Multi-Currency */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Tarif</span>
                            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                              {formatPrice(price, { showEquivalent: true })}
                            </span>
                            <span className="text-[10px] text-slate-500 block">/ nuitée</span>
                          </div>

                          {/* Key Specs Breakdown */}
                          <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-700/60 pt-1">
                            {/* Autonomie Électrique */}
                            <div className="flex items-center justify-between py-1.5">
                              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                <Zap size={14} className="text-amber-500" />
                                <span>Électricité</span>
                              </span>
                              <span className={cn(
                                "font-semibold text-[11px] px-2 py-0.5 rounded-md",
                                hasGenerator ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              )}>
                                {hasGenerator ? "Groupe / Solaire" : "Réseau"}
                              </span>
                            </div>

                            {/* Autonomie Eau */}
                            <div className="flex items-center justify-between py-1.5">
                              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                <Droplets size={14} className="text-blue-500" />
                                <span>Eau</span>
                              </span>
                              <span className={cn(
                                "font-semibold text-[11px] px-2 py-0.5 rounded-md",
                                hasWater ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              )}>
                                {hasWater ? "Forage / Réserve" : "ONEA"}
                              </span>
                            </div>

                            {/* Climatisation */}
                            <div className="flex items-center justify-between py-1.5">
                              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                <Wind size={14} className="text-slate-500" />
                                <span>Climatisation</span>
                              </span>
                              <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">
                                {hasAc ? "Climatisé" : "Ventilé"}
                              </span>
                            </div>

                            {/* Wi-Fi */}
                            <div className="flex items-center justify-between py-1.5">
                              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                <Wifi size={14} className="text-slate-500" />
                                <span>Wi-Fi</span>
                              </span>
                              <span className="font-semibold text-[11px]">
                                {hasWifi ? <span className="text-slate-900 dark:text-white font-medium">Inclus</span> : <span className="text-slate-400">Non inclus</span>}
                              </span>
                            </div>

                            {/* Pièces */}
                            <div className="flex items-center justify-between py-1.5">
                              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                <Bed size={14} className="text-slate-500" />
                                <span>Pièces & Lits</span>
                              </span>
                              <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">
                                {res.rooms || 1} p. • {res.bedrooms || res.rooms || 1} ch.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Button: Book / Details */}
                        <div className="p-4 pt-0">
                          <button
                            type="button"
                            onClick={() => {
                              setIsComparatorOpen(false);
                              onSelectResidence(res);
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <span>Voir le logement</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
