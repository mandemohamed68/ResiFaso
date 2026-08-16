import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBrandingSettings } from '../../hooks/useQueries';
import { 
  Search, ShieldCheck, Smartphone, Home, MapPin, Calendar, CheckCircle2, 
  ArrowRight, Users, Zap, Droplets, CreditCard, Star, Clock, Lock, 
  ChevronDown, HelpCircle, Phone, MessageSquare, Building2,
  Check, Award, Heart, RefreshCw, FileText
} from 'lucide-react';

interface ShowcasePageProps {
  onNavigate: (view: 'home' | 'search' | 'admin' | 'bookings' | 'owner-dashboard' | 'profile' | 'messages' | 'favorites' | 'tos' | 'privacy' | 'faq' | 'contact' | 'guide') => void;
  onOpenAuth?: () => void;
}

export const ShowcasePage: React.FC<ShowcasePageProps> = ({ onNavigate, onOpenAuth }) => {
  const { data: branding } = useBrandingSettings();
  const bName1 = branding?.brandNamePart1 || 'Resi';
  const bName2 = branding?.brandNamePart2 || 'Faso';
  const bSlogan = branding?.brandSlogan || "La référence de la réservation meublée au Burkina Faso";

  const [activeRoleTab, setActiveRoleTab] = useState<'traveler' | 'host'>('traveler');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const popularCities = [
    {
      name: "Ouagadougou",
      tagline: "Capitale politique & Centre des affaires",
      districts: ["Ouaga 2000", "Patte d'Oie", "Koulouba", "Zogona", "Dassasgho", "Wayalghin"],
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
      residenceCount: "120+ résidences meublées"
    },
    {
      name: "Bobo-Dioulasso",
      tagline: "Capitale culturelle & économique",
      districts: ["Sya", "Accart-Ville", "Sarfalao", "Koko", "Colma"],
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      residenceCount: "45+ résidences meublées"
    },
    {
      name: "Koudougou",
      tagline: "Centre universitaire & économique de l'Ouest",
      districts: ["Secteur 1", "Secteur 3", "Palogo"],
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
      residenceCount: "18+ résidences meublées"
    },
    {
      name: "Banfora",
      tagline: "Cité touristique de la région des Cascades",
      districts: ["Secteur 2", "Secteur 5"],
      image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
      residenceCount: "15+ résidences meublées"
    }
  ];

  const travelerFeatures = [
    {
      icon: Search,
      title: "Recherche par Ville et Quartier",
      description: "Localisez précisément votre hébergement à Ouagadougou, Bobo-Dioulasso et dans les principales villes avec fiches détaillées et géolocalisation."
    },
    {
      icon: Zap,
      title: "Gestion Transparente des Charges",
      description: "Prise en charge clairement affichée pour l'eau ONEA et l'électricité Cash Power SONABEL (incluses ou au compteur) sur chaque annonce."
    },
    {
      icon: CreditCard,
      title: "Paiement Sécurisé Mobile Money",
      description: "Règlement des acomptes de réservation via la passerelle certifiée SapPay (Orange Money, Moov Money, Telecel Cash, Coris Money)."
    },
    {
      icon: MessageSquare,
      title: "Messagerie Intégrée",
      description: "Communication directe et sécurisée entre le voyageur et le propriétaire pour l'organisation de l'arrivée et de la remise des clés."
    },
    {
      icon: Calendar,
      title: "Suivi des Réservations & Annulations",
      description: "Espace client dédié pour la gestion de l'historique de vos séjours, le téléchargement des reçus et l'application des politiques d'annulation."
    },
    {
      icon: Star,
      title: "Avis & Évaluations Vérifiés",
      description: "Consultez les retours authentiques rédigés exclusivement par des voyageurs ayant effectué un séjour confirmé."
    }
  ];

  const hostFeatures = [
    {
      icon: Building2,
      title: "Gestion Simplifiée des Annonces",
      description: "Mise en ligne rapide de vos studios, appartements et villas avec photos HD, tarifs préférentiels et règlement intérieur personnalisé."
    },
    {
      icon: ShieldCheck,
      title: "Vérification des Voyageurs (KYC)",
      description: "Système de contrôle d'identité conforme aux exigences de sécurité locales pour garantir la tranquillité des bailleurs."
    },
    {
      icon: Calendar,
      title: "Planning & Gestion des Disponibilités",
      description: "Calendrier synchronisé en temps réel pour éviter les doublons de réservation et bloquer des dates d'entretien."
    },
    {
      icon: Smartphone,
      title: "Reversement Direct sur Mobile Money",
      description: "Transfert sécurisé de vos revenus locatifs directement sur votre compte Mobile Money dès la confirmation de réservation."
    },
    {
      icon: Award,
      title: "Tarification Flexibles & Longs Séjours",
      description: "Définissez des réductions automatiques à la semaine ou au mois pour maximiser le taux d'occupation de vos biens."
    },
    {
      icon: FileText,
      title: "Rapports & Statistiques Financières",
      description: "Tableau de bord d'analyse de vos revenus, du taux d'occupation et du suivi comptable de vos résidences."
    }
  ];

  const faqItems = [
    {
      q: `Qu'est-ce que la plateforme ${bName1}${bName2} ?`,
      a: `${bName1}${bName2} est un service d'intermédiation technique édité et exploité par la société SAPPAY TECHNOLOGIE. Il permet la mise en relation sécurisée entre propriétaires d'hébergements meublés et voyageurs pour des séjours temporaires au Burkina Faso.`
    },
    {
      q: "Quels sont les modes de paiement acceptés ?",
      a: "Toutes les transactions financières s'effectuent par Mobile Money via le processeur SapPay. Sont acceptés : Orange Money (*144#), Moov Money / Flooz (*160#), Telecel Cash et Coris Money."
    },
    {
      q: "Comment sont régies les charges d'électricité (Cash Power) et d'eau (ONEA) ?",
      a: "Chaque annonce spécifie clairement les conditions : soit les charges sont entièrement incluses dans le prix de la nuitée, soit elles font l'objet d'un forfait ou d'un relevé de compteur au départ du locataire."
    },
    {
      q: "Quelle est la procédure pour publier une résidence meublée ?",
      a: "Il suffit de créer un compte utilisateur, de basculer sur l'Espace Hôte et de renseigner la fiche descriptive de votre logement. Après vérification par nos services, votre annonce est publiée."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      
      {/* Institutional Top Bar */}
      <div className="bg-slate-100 border-b border-slate-200/90 py-2.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded tracking-wider">
              RÉPUBLIQUE DU BURKINA FASO
            </span>
            <span className="hidden sm:inline font-semibold text-slate-700">
              Plateforme éditée par <strong>SAPPAY TECHNOLOGIE</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck size={14} className="text-emerald-600" />
              Paiements Mobile Money Sécurisés (SapPay)
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <button 
              onClick={() => onNavigate('contact')}
              className="hidden md:inline hover:text-red-600 font-semibold transition-colors"
            >
              Assistance & Support 24h/7
            </button>
          </div>
        </div>
      </div>

      {/* Main Light Hero Header */}
      <header className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200/80 pt-12 pb-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Main Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-lg text-slate-800 text-xs font-bold tracking-wide">
                <Building2 size={15} className="text-red-600" />
                <span>Service National de Réservation de Résidences Meublées</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                {bSlogan}
              </h1>

              <p className="text-slate-600 text-base sm:text-lg font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                <span className="font-extrabold"><span className="text-brand-primary">{bName1}</span><span className="text-brand-secondary">{bName2}</span></span> simplifie la recherche et la réservation d'appartements, studios et villas meublés pour vos déplacements professionnels et séjours en famille à Ouagadougou, Bobo-Dioulasso, Koudougou et Banfora.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => onNavigate('home')}
                  className="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Search size={16} />
                  <span>Trouver un hébergement</span>
                </button>

                <button
                  onClick={() => onNavigate('owner-dashboard')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <Home size={16} />
                  <span>Espace Hôte & Bailleurs</span>
                </button>
              </div>

              {/* Supported Payment Channels */}
              <div className="pt-6 border-t border-slate-200/80 max-w-xl mx-auto lg:mx-0 space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 text-center lg:text-left">
                  Modes de règlement acceptés par la passerelle SapPay :
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-bold text-slate-800">
                  <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Orange Money (*144#)
                  </span>
                  <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Moov Money / Flooz (*160#)
                  </span>
                  <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    Telecel Cash
                  </span>
                  <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Coris Money
                  </span>
                </div>
              </div>

            </div>

            {/* Practical Overview Card */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg space-y-5">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-black text-xs select-none">
                      <span className="text-emerald-600">R</span><span className="text-red-600">F</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Résidence Meublée de Standing</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={12} className="text-red-600" /> Ouaga 2000, Ouagadougou
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                    Vérifié
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="block font-bold text-slate-900 flex items-center gap-1">
                      <Zap size={14} className="text-amber-500" /> Électricité
                    </span>
                    <span className="text-[11px] text-slate-600">Compteur Cash Power</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="block font-bold text-slate-900 flex items-center gap-1">
                      <Droplets size={14} className="text-blue-500" /> Eau Potable
                    </span>
                    <span className="text-[11px] text-slate-600">Réseau ONEA continu</span>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Garantie d'Acompte</span>
                    <span className="text-lg font-black text-white">Réservation Instantanée</span>
                  </div>
                  <button
                    onClick={() => onNavigate('home')}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Voir l'Annonce
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
                  <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-600" /> Traçabilité des paiements</span>
                  <span className="flex items-center gap-1"><Lock size={14} className="text-slate-700" /> Protocole SapPay</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 pt-12">

        {/* Section 1: Popular Regions & Towns */}
        <section className="space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-md border border-red-100">
              Périmètre d'Intervention
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Principales villes couvertes au Burkina Faso
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-normal">
              Des logements contrôlés disponibles dans les grands centres urbains et administratifs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularCities.map((city) => (
              <div 
                key={city.name}
                onClick={() => onNavigate('home')}
                className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="h-40 overflow-hidden relative bg-slate-100">
                  <img 
                    src={city.image} 
                    alt={city.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 right-3 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                    {city.residenceCount}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">
                      {city.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">{city.tagline}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {city.districts.slice(0, 4).map((d) => (
                      <span key={d} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                        {d}
                      </span>
                    ))}
                    {city.districts.length > 4 && (
                      <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        +{city.districts.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Complete Functional Ecosystem */}
        <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-10 space-y-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 bg-white px-3 py-1 rounded-md border border-slate-200">
              Fonctionnalités Intégrées
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Une plateforme complète pour voyageurs et hôtes
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Découvrez l'ensemble des outils mis à disposition pour faciliter vos transactions locatives.
            </p>

            {/* Role Switcher Tabs */}
            <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 mt-2 shadow-2xs">
              <button
                onClick={() => setActiveRoleTab('traveler')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeRoleTab === 'traveler'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={14} />
                <span>Pour les Voyageurs</span>
              </button>

              <button
                onClick={() => setActiveRoleTab('host')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeRoleTab === 'host'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home size={14} />
                <span>Pour les Hôtes & Bailleurs</span>
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <AnimatePresence mode="wait">
            {activeRoleTab === 'traveler' ? (
              <motion.div 
                key="travelers-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {travelerFeatures.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div key={feat.title} className="p-5 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
                      <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                        <Icon size={18} />
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900">{feat.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">{feat.description}</p>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                key="hosts-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {hostFeatures.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div key={feat.title} className="p-5 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                        <Icon size={18} />
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900">{feat.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">{feat.description}</p>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center pt-2">
            <button
              onClick={() => onNavigate(activeRoleTab === 'traveler' ? 'home' : 'owner-dashboard')}
              className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>{activeRoleTab === 'traveler' ? 'Rechercher un logement' : 'Accéder au Tableau de Bord Hôte'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* Section 3: Process Steps */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-md border border-red-100">
              Processus de Réservation
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              3 étapes pour valider votre hébergement
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-black text-red-600 uppercase tracking-widest block">Étape 01</span>
              <h3 className="text-base font-extrabold text-slate-900">Sélection de l'hébergement</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recherchez par ville, dates et équipements souhaités (climatisation, groupe électrogène, piscine, etc.). Consultez les fiches techniques et conditions d'occupation.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest block">Étape 02</span>
              <h3 className="text-base font-extrabold text-slate-900">Règlement de l'acompte</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirmez vos dates de séjour en effectuant le règlement sécurisé de l'acompte par Mobile Money via la passerelle SapPay.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest block">Étape 03</span>
              <h3 className="text-base font-extrabold text-slate-900">Remise des clés & Installation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recevez la confirmation officielle et les coordonnées directes du propriétaire pour planifier l'état des lieux d'entrée et la remise des clés.
              </p>
            </div>

          </div>
        </section>

        {/* Section 4: Security & Regulatory Framework */}
        <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 border border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
                Cadre Légal & Réglementaire
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Engagement de conformité et protection des usagers
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                La plateforme <span className="font-extrabold"><span className="text-brand-primary">{bName1}</span><span className="text-brand-secondary">{bName2}</span></span>, développée et gérée par <strong>SAPPAY TECHNOLOGIE</strong>, opère dans le strict respect de la réglementation burkinabè sur l'intermédiation numérique, le traitement des données à caractère personnel (CIL) et la sécurisation des flux financiers par Mobile Money.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs font-medium text-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  <span>Contrôle d'identité KYC des hôtes et voyageurs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  <span>Passerelle de paiement sécurisée SapPay</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  <span>Assistance client et conciergerie locale</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  <span>Conditions d'annulation et de remboursement encadrées</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-800 p-6 rounded-xl border border-slate-700 text-center space-y-3">
              <ShieldCheck size={36} className="text-emerald-400 mx-auto" />
              <div>
                <h4 className="font-extrabold text-sm text-white">Documents Officiels</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Conditions Générales d'Utilisation</p>
              </div>
              <button
                onClick={() => onNavigate('tos')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Consulter les Textes Légaux
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: FAQ Section */}
        <section className="space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
              Foire Aux Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Questions fréquemment posées
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqItems.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-extrabold text-slate-900 text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${openFaqIndex === idx ? 'rotate-180 text-red-600' : ''}`} />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center pt-1">
            <button
              onClick={() => onNavigate('faq')}
              className="text-xs font-bold text-red-600 uppercase tracking-wider hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Accéder à la Foire Aux Questions complète</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* Section 6: Final Corporate Call to Action */}
        <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Réservez dès maintenant votre résidence meublée au Burkina Faso
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mx-auto font-normal leading-relaxed">
            Trouvez un hébergement de qualité adapté à votre budget et vos besoins professionnels.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('home')}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest px-7 py-3.5 rounded-xl shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              Accéder au Catalogue
            </button>
            
            <button
              onClick={() => onNavigate('contact')}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              Contacter le Support Client
            </button>
          </div>
        </section>

      </main>
    </div>
  );
};
