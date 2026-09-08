import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plane, UtensilsCrossed, Car, 
  ShoppingBag, Shield, Check, MessageSquare, 
  Calendar, User, Phone, CheckCircle2, Clock
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../utils/currency';
import { useGlobalSettings } from '../../hooks/useQueries';

interface ConciergeService {
  id: string;
  title: string;
  tagline: string;
  category: 'transport' | 'gastronomie' | 'confort' | 'logistique';
  priceStartingAt: number;
  unit: string;
  icon: React.ElementType;
  description: string;
  features: string[];
}

const CONCIERGE_SERVICES: ConciergeService[] = [
  {
    id: 'airport-transfer',
    title: 'Transfert Aéroport',
    tagline: 'Accueil et prise en charge à l\'arrivée',
    category: 'transport',
    priceStartingAt: 15000,
    unit: 'par trajet',
    icon: Plane,
    description: 'Chauffeur privé avec pancarte d\'accueil à l\'aéroport de Ouagadougou ou Bobo-Dioulasso. Véhicule climatisé et assistance avec vos bagages.',
    features: ['Accueil personnalisé au terminal', 'Véhicule climatisé et confortable', 'Bouteilles d\'eau à bord', 'Service disponible jour et nuit']
  },
  {
    id: 'private-chef',
    title: 'Chef Cuisinier à Domicile',
    tagline: 'Cuisine locale et internationale préparée sur place',
    category: 'gastronomie',
    priceStartingAt: 12000,
    unit: 'par repas',
    icon: UtensilsCrossed,
    description: 'Un cuisinier expérimenté prépare vos repas directement dans votre résidence : spécialités locales burkinabè, grillades ou plats continentaux.',
    features: ['Achat des ingrédients frais au marché', 'Préparation soignée dans votre cuisine', 'Service à table', 'Nettoyage complet de la cuisine']
  },
  {
    id: 'car-rental',
    title: 'Véhicule avec Chauffeur',
    tagline: 'Déplacements sécurisés en ville et régions',
    category: 'transport',
    priceStartingAt: 25000,
    unit: 'par jour',
    icon: Car,
    description: 'Berlines et 4x4 conduits par des chauffeurs professionnels connaissant parfaitement le réseau routier du Burkina Faso.',
    features: ['Chauffeur professionnel dédié', 'Véhicule climatisé et entretenu', 'Carburant et assurance inclus', 'Idéal pour missions et rendez-vous']
  },
  {
    id: 'express-cleaning',
    title: 'Ménage & Blanchisserie',
    tagline: 'Entretien du logement et soin du linge',
    category: 'confort',
    priceStartingAt: 6000,
    unit: 'par passage',
    icon: Clock,
    description: 'Nettoyage approfondi de la résidence, changement des draps et serviettes, et lavage-repassage de vos effets personnels sous 24h.',
    features: ['Nettoyage soigné des pièces de vie', 'Entretien et repassage du linge', 'Produits écologiques respectueux', 'Service discret et ponctuel']
  },
  {
    id: 'welcome-pack',
    title: 'Approvisionnement & Frigo Plein',
    tagline: 'Courses et rafraîchissements prêts à votre arrivée',
    category: 'logistique',
    priceStartingAt: 15000,
    unit: 'par panier',
    icon: ShoppingBag,
    description: 'Arrivez l\'esprit tranquille avec des provisions prêtes : eau minérale fraîche Lafi, jus de fruits locaux, café, thé, fruits frais et en-cas.',
    features: ['Eau minérale fraîche et boissons locales', 'Fruits frais de saison', 'Sélection petit-déjeuner', 'Personnalisable selon vos souhaits']
  },
  {
    id: 'security-escort',
    title: 'Sécurité & Gardiennage Renforcé',
    tagline: 'Tranquillité et assistance continue',
    category: 'confort',
    priceStartingAt: 20000,
    unit: 'par vacation',
    icon: Shield,
    description: 'Agents qualifiés pour la surveillance continue de la résidence ou pour vous accompagner lors de vos déplacements officiels.',
    features: ['Agents de sécurité qualifiés', 'Surveillance jour et nuit', 'Discrétion et rigueur', 'Assistance réactive']
  }
];

interface ConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  residenceTitle?: string;
  residenceCity?: string;
}

export const ConciergeModal: React.FC<ConciergeModalProps> = ({
  isOpen,
  onClose,
  residenceTitle,
  residenceCity = 'Ouagadougou'
}) => {
  const { addToast } = useToast();
  const { data: gsData } = useGlobalSettings();
  const isEnabled = gsData?.conciergeEnabled !== false;

  const [selectedService, setSelectedService] = useState<ConciergeService>(CONCIERGE_SERVICES[0]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !isEnabled) return null;

  const handleWhatsAppContact = () => {
    const lines = [
      `*Demande de Conciergerie ResiFaso*`,
      `Service : ${selectedService.title}`,
      residenceTitle ? `Résidence : ${residenceTitle}` : `Ville : ${residenceCity}`,
      desiredDate ? `Date souhaitée : ${desiredDate}` : '',
      guestName ? `Nom : ${guestName}` : '',
      guestPhone ? `Téléphone : ${guestPhone}` : '',
      notes ? `Précisions : ${notes}` : '',
      `\nMerci de me recontacter pour confirmer la prise en charge.`
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/22670000000?text=${encodeURIComponent(lines)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    addToast("Ouverture de WhatsApp...", "info");
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    addToast("Votre demande a été enregistrée. Nous vous contacterons rapidement.", "success");
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header sobre, humain et épuré */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-4 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Services aux voyageurs
                </span>
                {residenceTitle && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">
                      {residenceTitle}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Conciergerie & Services Privés
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left: Services List */}
            <div className="lg:col-span-7 space-y-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                1. Choisissez une prestation
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CONCIERGE_SERVICES.map((serv) => {
                  const isSelected = selectedService.id === serv.id;
                  const IconComp = serv.icon;
                  return (
                    <button
                      key={serv.id}
                      type="button"
                      onClick={() => setSelectedService(serv)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between select-none relative",
                        isSelected
                          ? "bg-slate-100/90 dark:bg-slate-800 border-slate-900 dark:border-white shadow-2xs"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                            isSelected 
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          )}>
                            <IconComp size={16} />
                          </div>
                          {isSelected && (
                            <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              <Check size={14} className="stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {serv.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {serv.tagline}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-150 dark:border-slate-800 flex items-baseline justify-between text-xs">
                        <span className="text-[10px] text-slate-400">À partir de</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(serv.priceStartingAt)} F
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Service description details */}
              {selectedService && (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 mt-3">
                  <div className="flex items-center gap-2">
                    <selectedService.icon size={15} className="text-slate-700 dark:text-slate-300" />
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Ce qui est inclus : {selectedService.title}
                    </h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedService.description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {selectedService.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <Check size={12} className="text-slate-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Request Form */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              {isSubmitted ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Demande envoyée
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    Nous avons bien reçu votre demande. Un agent prendra contact avec vous dans les plus brefs délais.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      2. Vos coordonnées
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Remplissez ces informations pour confirmer votre besoin.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nom & Prénom
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Ibrahim Ouédraogo"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Téléphone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: +226 70 00 00 00"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date souhaitée
                    </label>
                    <input
                      type="date"
                      value={desiredDate}
                      onChange={(e) => setDesiredDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Précisions ou instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Heure d'arrivée, vol, préférences alimentaires..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Valider la demande ({selectedService.title})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsAppContact}
                      className="w-full py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={14} className="text-emerald-600" />
                      <span>Échanger directement sur WhatsApp</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5">
                <Shield size={12} className="text-slate-500" />
                <span>Prestataires vérifiés et accompagnés par ResiFaso</span>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
