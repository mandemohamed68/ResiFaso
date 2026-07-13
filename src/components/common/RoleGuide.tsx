import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, HelpCircle, Compass, CreditCard, MessageSquare, Star, 
  PlusCircle, CheckSquare, Wallet, ShieldCheck, Users, 
  Settings, Check, ArrowRight, ShieldAlert, Award, FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface GuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface RoleGuideProps {
  role: 'client' | 'owner' | 'admin';
  isOpen: boolean;
  onClose: () => void;
}

export const RoleGuide: React.FC<RoleGuideProps> = ({ role, isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  // Define guide content for each role
  const clientSteps: GuideStep[] = [
    {
      title: "1. Recherche de Résidences d'Exception",
      description: "Utilisez notre moteur de recherche pour filtrer les résidences par ville (Ouagadougou, Bobo-Dioulasso, Koudougou), secteur, budget et équipements. Les dates déjà réservées s'affichent en temps réel pour vous éviter les déceptions.",
      icon: <Compass className="text-red-600" size={24} />
    },
    {
      title: "2. Réservation & Acompte Sécurisé",
      description: "Lancez votre demande de réservation. Pour confirmer définitivement votre séjour, réglez l'acompte demandé (50%) en toute sécurité directement sur l'application via Orange Money, Moov Money, Telecel Cash ou Coris Money.",
      icon: <CreditCard className="text-emerald-600" size={24} />
    },
    {
      title: "3. Messagerie & Organisation",
      description: "Une fois pré-réservé ou confirmé, communiquez directement avec votre hôte via notre chat sécurisé. Organisez ensemble votre heure d'arrivée et la remise des clés sans intermédiaire.",
      icon: <MessageSquare className="text-blue-600" size={24} />
    },
    {
      title: "4. Suivi, Facture & Séjour",
      description: "Suivez le statut de vos réservations, téléchargez des factures PDF professionnelles pour vos notes de frais, et profitez d'une assistance réactive de l'équipe de support en un clic.",
      icon: <FileText className="text-indigo-600" size={24} />
    },
    {
      title: "5. Laissez votre Avis",
      description: "Après votre départ, partagez votre avis et attribuez une note étoilée. Vos retours aident les autres voyageurs à faire le meilleur choix et encouragent les hôtes à maintenir un service d'excellence.",
      icon: <Star className="text-yellow-500 fill-yellow-400" size={24} />
    }
  ];

  const ownerSteps: GuideStep[] = [
    {
      title: "1. Publication de vos Biens",
      description: "Ajoutez vos résidences meublées avec des titres accrocheurs, des descriptions détaillées, la localisation exacte sur la carte interactive, les équipements disponibles (Climatisation, Wifi, etc.) et de superbes photos.",
      icon: <PlusCircle className="text-red-600" size={24} />
    },
    {
      title: "2. Gestion Intelligente des Réservations",
      description: "Suivez les demandes de réservation des voyageurs, acceptez ou refusez-les. Notre système automatise le calendrier d'occupation et gère le statut des séjours (En cours, Terminé) de manière transparente.",
      icon: <CheckSquare className="text-indigo-600" size={24} />
    },
    {
      title: "3. Messagerie Instantanée",
      description: "Échangez en temps réel avec vos futurs locataires directement dans votre espace hôte. Soyez prévenu par des notifications dynamiques dès qu'un nouveau message ou une nouvelle réservation arrive.",
      icon: <MessageSquare className="text-blue-600" size={24} />
    },
    {
      title: "4. Suivi des Revenus & Commissions",
      description: "Accédez à un tableau de bord financier complet. Suivez vos gains cumulés nets de commission (8%) et votre solde disponible. Modifiez votre politique d'annulation personnalisée pour sécuriser vos revenus.",
      icon: <Wallet className="text-emerald-600" size={24} />
    },
    {
      title: "5. Demande de Retrait de Fonds",
      description: "Retirez vos gains accumulés en toute simplicité. Soumettez une demande de retrait vers votre numéro Orange Money, Moov Money ou virement bancaire et suivez l'avancement du traitement par l'administration.",
      icon: <Award className="text-yellow-600" size={24} />
    }
  ];

  const adminSteps: GuideStep[] = [
    {
      title: "1. Supervision Globale de l'Activité",
      description: "Pilotez la plateforme grâce à des indicateurs clés : chiffre d'affaires global, volume de commissions collectées, taux d'occupation des résidences et statistiques de réservations actives.",
      icon: <ShieldCheck className="text-red-600" size={24} />
    },
    {
      title: "2. Vérifications d'Identité (KYC)",
      description: "Sécurisez la communauté en analysant et en validant (ou rejetant) les pièces d'identité (cartes d'identité, passeports) chargées par les propriétaires de résidences avant de les autoriser à publier.",
      icon: <Users className="text-blue-600" size={24} />
    },
    {
      title: "3. Validation des Retraits Propriétaires",
      description: "Traitez les demandes de versement de gains soumises par les hôtes. Après transfert Mobile Money/Bancaire, marquez la demande comme payée ou rejetez-la avec un motif clair si nécessaire.",
      icon: <Wallet className="text-emerald-600" size={24} />
    },
    {
      title: "4. Modération & Gestion des Contenus",
      description: "Gérez l'ensemble des annonces de résidences meublées du Burkina. Modérez les avis inappropriés, configurez les bannières d'alertes globales ('Flash Info') et les rubriques de la FAQ.",
      icon: <Settings className="text-slate-600" size={24} />
    },
    {
      title: "5. Support Client en Direct",
      description: "Répondez aux demandes d'assistance des voyageurs et des propriétaires. Prenez le relais sur les fils de discussion de support pour garantir une expérience fluide et rassurante.",
      icon: <ShieldAlert className="text-amber-600" size={24} />
    }
  ];

  const getGuideDetails = () => {
    switch (role) {
      case 'owner':
        return {
          title: "Guide de l'Hôte & Propriétaire",
          subtitle: "Optimisez vos locations de résidences meublées au Burkina Faso",
          steps: ownerSteps,
          colorClass: "from-indigo-500 to-red-600",
          accentColor: "bg-indigo-50 text-indigo-600"
        };
      case 'admin':
        return {
          title: "Guide de l'Administrateur ResiFaso",
          subtitle: "Supervisez l'activité, gérez les verifications et les flux financiers",
          steps: adminSteps,
          colorClass: "from-slate-800 to-red-700",
          accentColor: "bg-slate-100 text-slate-800"
        };
      case 'client':
      default:
        return {
          title: "Guide du Voyageur & Résident",
          subtitle: "Trouvez et réservez votre logement idéal en toute sérénité",
          steps: clientSteps,
          colorClass: "from-red-500 to-red-700",
          accentColor: "bg-red-50 text-red-600"
        };
    }
  };

  const details = getGuideDetails();
  const currentStepData = details.steps[activeStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        >
          {/* Left Sidebar - Navigation steps */}
          <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${details.accentColor}`}>
                  <HelpCircle size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">GUIDE DE PRISE EN MAIN</span>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{details.title}</h3>
              <p className="text-xs text-slate-500 font-medium mb-6">{details.subtitle}</p>

              <div className="space-y-2">
                {details.steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all font-bold text-xs uppercase tracking-wider",
                      activeStep === index 
                        ? "bg-white text-red-600 shadow-sm border border-slate-100" 
                        : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-900"
                    )}
                  >
                    <span className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                      activeStep === index ? "bg-red-50 text-red-600" : "bg-slate-200/60 text-slate-600"
                    )}>
                      {index + 1}
                    </span>
                    <span className="truncate">{step.title.split('. ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200/60">
              <div className="flex items-center gap-3 bg-red-50/50 p-3 rounded-2xl border border-red-100/40">
                <ShieldCheck className="text-red-600 shrink-0" size={18} />
                <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                  Notre équipe support est disponible 24/7 via le chat en direct pour vous accompagner.
                </p>
              </div>
            </div>
          </div>

          {/* Right Area - Content details */}
          <div className="flex-1 flex flex-col min-h-[400px]">
            {/* Header image/banner area */}
            <div className={`h-40 bg-gradient-to-r ${details.colorClass} p-8 flex flex-col justify-end relative overflow-hidden`}>
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={onClose}
                  className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              {/* Pattern overlays */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              
              <div className="relative">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">Étape {activeStep + 1} sur {details.steps.length}</span>
                <h4 className="text-2xl font-black text-white mt-3 tracking-tight">{currentStepData.title}</h4>
              </div>
            </div>

            {/* Step Body */}
            <div className="p-8 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100/80 shadow-inner">
                    {currentStepData.icon}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">Fonctionnalité clé ResiFaso</h5>
                    <p className="text-xs text-slate-400 font-medium">Découvrez comment ça marche</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6">
                  <p className="text-slate-600 font-medium text-sm leading-relaxed whitespace-pre-line">
                    {currentStepData.description}
                  </p>
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                  disabled={activeStep === 0}
                  className="px-5 py-3 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  Précédent
                </button>

                {activeStep < details.steps.length - 1 ? (
                  <button
                    onClick={() => setActiveStep(prev => prev + 1)}
                    className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-50/80 transition-all hover:scale-[1.01]"
                  >
                    Suivant
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-50 transition-all hover:scale-[1.01]"
                  >
                    J'ai compris !
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
