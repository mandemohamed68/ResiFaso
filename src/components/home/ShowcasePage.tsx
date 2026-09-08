import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBrandingSettings } from '../../hooks/useQueries';
import { 
  Search, ShieldCheck, Smartphone, Home, MapPin, Calendar, CheckCircle2, 
  ArrowRight, Users, Zap, Droplets, CreditCard, Star, Clock, Lock, 
  ChevronDown, HelpCircle, Phone, MessageSquare, Building2,
  Check, Award, Heart, RefreshCw, FileText, Sparkles, Compass, Shield, KeyRound, Headphones
} from 'lucide-react';

interface ShowcasePageProps {
  onNavigate: (view: 'home' | 'search' | 'admin' | 'bookings' | 'owner-dashboard' | 'profile' | 'messages' | 'favorites' | 'tos' | 'privacy' | 'faq' | 'contact' | 'guide') => void;
  onOpenAuth?: () => void;
}

export const ShowcasePage: React.FC<ShowcasePageProps> = ({ onNavigate, onOpenAuth }) => {
  const { data: branding } = useBrandingSettings();
  const bName1 = branding?.brandNamePart1 || 'Resi';
  const bName2 = branding?.brandNamePart2 || 'Faso';

  const [activeTab, setActiveTab] = useState<'traveler' | 'host'>('traveler');
  const [selectedCity, setSelectedCity] = useState<string>('Ouagadougou');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const cities = [
    {
      id: "ouaga",
      name: "Ouagadougou",
      tagline: "Capitale & Cœur des affaires",
      description: "Appartements de haut standing à Ouaga 2000, villas familiales sécurisées et studios calmes pour missions professionnelles.",
      districts: ["Ouaga 2000", "Patte d'Oie", "Koulouba", "Zogona", "Dassasgho", "Zone du Bois"],
      image: "/src/assets/images/ouagadougou_city_1788876678363.jpg",
      count: "120+ résidences"
    },
    {
      id: "bobo",
      name: "Bobo-Dioulasso",
      tagline: "Capitale culturelle & économique",
      description: "Demeures de charme au cœur de la ville de Sya, appartements spacieux avec cours arborées pour vos séjours détendus.",
      districts: ["Sya", "Accart-Ville", "Sarfalao", "Koko", "Colma", "Belle-Ville"],
      image: "/src/assets/images/bobo_dioulasso_1788876693516.jpg",
      count: "45+ résidences"
    },
    {
      id: "koudougou",
      name: "Koudougou",
      tagline: "Cité du Cavalier Rouge",
      description: "Logements confortables et équipés pour missions universitaires, séminaires régionaux et haltes conviviales.",
      districts: ["Secteur 1", "Secteur 3", "Palogo", "Nayalgué"],
      image: "/src/assets/images/koudougou_city_1788876707852.jpg",
      count: "18+ résidences"
    },
    {
      id: "banfora",
      name: "Banfora",
      tagline: "Joyau touristique des Cascades",
      description: "Villas et résidences paisibles au milieu d'une nature généreuse, idéales pour les escapades touristiques et le ressourcement.",
      districts: ["Secteur 2", "Secteur 5", "Karfiguéla", "Bérégadougou"],
      image: "/src/assets/images/banfora_cascades_1788876721680.jpg",
      count: "15+ résidences"
    }
  ];

  const travelerPillars = [
    {
      icon: ShieldCheck,
      title: "Logements rigoureusement vérifiés",
      desc: "Chaque appartement et villa fait l'objet d'un audit de conformité : literie soignée, propreté, climatisation et équipements fonctionnels avant mise en ligne."
    },
    {
      icon: Zap,
      title: "Transparence Énergie & Eau",
      desc: "Aucune surprise sur place. Les fiches indiquent clairement le régime Cash Power (inclus ou compteur) et les garanties d'eau continue (ONEA / Forage)."
    },
    {
      icon: CreditCard,
      title: "Paiements Mobile Money officiels",
      desc: "Réglez votre acompte de réservation en toute confiance via la passerelle SapPay : Orange Money, Moov Money, Telecel Money ou Coris Money."
    },
    {
      icon: Headphones,
      title: "Conciergerie locale & Accueil",
      desc: "Une équipe sur place à Ouagadougou et Bobo disponible 7j/7 pour faciliter votre arrivée, la remise des clés et répondre à vos requêtes de séjour."
    }
  ];

  const hostPillars = [
    {
      icon: Building2,
      title: "Valorisation de votre patrimoine",
      desc: "Présentez vos résidences sous leur meilleur jour auprès d'une clientèle ciblée : expatriés, délégations d'affaires, familles et touristes."
    },
    {
      icon: KeyRound,
      title: "Maîtrise totale de vos tarifs & dates",
      desc: "Gérez votre calendrier en temps réel, appliquez des remises dégressives pour la semaine ou le mois, et gardez la liberté d'accepter chaque demande."
    },
    {
      icon: Smartphone,
      title: "Revenus sécurisés & virements directs",
      desc: "Les acomptes collectés sont sécurisés et reversés automatiquement sur votre compte Mobile Money dès confirmation du séjour."
    },
    {
      icon: Shield,
      title: "Filtrage et respect des lieux",
      desc: "Profils vérifiés, règlement intérieur personnalisé et accompagnement pour protéger la tranquillité de votre bien."
    }
  ];

  const bookingSteps = [
    {
      number: "01",
      title: "Explorez & Choisissez",
      detail: "Parcourez les résidences géolocalisées avec photos haute définition, équipements certifiés et disponibilités en temps réel."
    },
    {
      number: "02",
      title: "Sécurisez l'Acompte",
      detail: "Validez vos dates en effectuant le versement d'acompte directement via Orange Money, Moov Money, Telecel Money ou Coris Money."
    },
    {
      number: "03",
      title: "Arrivez en Sérénité",
      detail: "Recevez les coordonnées directes de votre hôte et notre conciergerie locale pour organiser un accueil sur mesure."
    }
  ];

  const faqItems = [
    {
      q: `Qu'est-ce que ${bName1}${bName2} ?`,
      a: `${bName1}${bName2} est la plateforme de référence pour réserver des résidences meublées, appartements et villas de standing au Burkina Faso. Éditée par SAPPAY TECHNOLOGIE, elle offre une expérience sécurisée, fluide et transparente tant pour les voyageurs que pour les propriétaires bailleurs.`
    },
    {
      q: "Quels sont les moyens de paiement acceptés pour l'acompte ?",
      a: "Toutes les transactions financières de la plateforme s'effectuent par Mobile Money officiel via la passerelle certifiée SapPay. Sont pris en charge : Orange Money, Moov Money, Telecel Money et Coris Money."
    },
    {
      q: "Comment fonctionne la gestion des charges (Électricité & Eau) ?",
      a: "Pour garantir une totale transparence, chaque fiche de résidence précise son mode de gestion : soit les charges sont incluses dans le tarif à la nuitée, soit un relevé de compteur Cash Power / ONEA est effectué à l'entrée et à la sortie."
    },
    {
      q: "Je suis propriétaire : comment publier mon hébergement ?",
      a: "La démarche est simple et rapide : créez votre compte, basculez vers l'Espace Hôte, et déposez les détails et photos de votre bien. Notre équipe contrôle la conformité des informations avant publication officielle."
    },
    {
      q: "Existe-t-il une assistance en cas de besoin pendant le séjour ?",
      a: "Oui, notre service de conciergerie et support local reste joignable 7j/7 pour vous assister, vous conseiller sur les commodités du quartier ou faciliter la communication avec votre hôte."
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      
      {/* Top Subtle Status Bar */}
      <div className="border-b border-stone-200/80 bg-white py-2 px-4 text-[11px]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span className="font-semibold text-slate-800">Résidences Meublées au Burkina Faso</span>
            <span className="text-stone-300">·</span>
            <span>Ouagadougou · Bobo-Dioulasso · Koudougou · Banfora</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-700">
              <ShieldCheck size={13} className="text-emerald-600" />
              Paiements SapPay certifiés
            </span>
            <span className="text-stone-300">|</span>
            <button 
              onClick={() => onNavigate('contact')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Assistance & Conciergerie
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section - Clean, Human & Warm Editorial */}
      <header className="relative bg-white border-b border-stone-200/80 pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          {/* Brand pill */}
          <div className="inline-flex items-center gap-2 bg-stone-100/90 border border-stone-200 px-3.5 py-1.5 rounded-full text-slate-700 text-xs font-medium">
            <div className="w-4 h-4 rounded-full bg-white p-0.5 border border-stone-300 flex items-center justify-center shrink-0">
              <img src="/LOGO%20RESIFASO.png" alt="ResiFaso" className="w-full h-full object-contain" />
            </div>
            <span>L'hospitalité burkinabè en toute confiance</span>
          </div>

          {/* Editorial Headline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Trouvez votre résidence meublée de standing au Burkina Faso.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
              Des appartements, studios et villas soigneusement audités pour vos missions professionnelles, séjours diplomatiques et vacances en famille.
            </p>
          </div>

          {/* Main Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm tracking-wide px-7 py-3.5 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <Search size={16} />
              <span>Explorer les logements</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('owner-dashboard')}
              className="bg-white hover:bg-stone-50 text-slate-800 border border-stone-300 font-semibold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Home size={16} />
              <span>Espace Propriétaires</span>
            </button>
          </div>

          {/* Payment Methods Banner */}
          <div className="pt-8 border-t border-stone-100 max-w-xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Règlement sécurisé de l'acompte par Mobile Money
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-700">
              <span className="bg-stone-50 border border-stone-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF6600]"></span>
                Orange Money
              </span>
              <span className="bg-stone-50 border border-stone-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0055A5]"></span>
                Moov Money
              </span>
              <span className="bg-stone-50 border border-stone-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E20074]"></span>
                Telecel Money
              </span>
              <span className="bg-stone-50 border border-stone-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#008751]"></span>
                Coris Money
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">

        {/* SECTION 1: CITIES DESTINATION GUIDE */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Destinations</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Principales villes couvertes
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md">
              Des hébergements disponibles dans les grands pôles économiques, administratifs et touristiques du pays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {cities.map((city) => {
              const isSelected = selectedCity === city.name;
              return (
                <div
                  key={city.id}
                  onClick={() => {
                    setSelectedCity(city.name);
                    onNavigate('home');
                  }}
                  className="group bg-white border border-stone-200/90 rounded-2xl overflow-hidden hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                    <img 
                      src={city.image} 
                      alt={city.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-200 block">
                        {city.count}
                      </span>
                      <h3 className="text-lg font-bold text-white leading-snug">
                        {city.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-800">{city.tagline}</p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">{city.description}</p>
                    </div>

                    <div className="pt-2 border-t border-stone-100">
                      <div className="flex flex-wrap gap-1">
                        {city.districts.slice(0, 3).map((d) => (
                          <span key={d} className="bg-stone-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            {d}
                          </span>
                        ))}
                        {city.districts.length > 3 && (
                          <span className="text-slate-400 text-[10px] font-semibold self-center px-1">
                            +{city.districts.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: HUMAN PILLARS & VALUE PROPOSITION */}
        <section className="bg-white border border-stone-200/80 rounded-3xl p-8 sm:p-12 space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-stone-100">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nos engagements</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Une expérience pensée pour votre sérénité
              </h2>
            </div>

            {/* Subtle Interactive Tab Selector */}
            <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('traveler')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'traveler'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users size={14} />
                <span>Voyageurs & Professionnels</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('host')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'host'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Home size={14} />
                <span>Hôtes & Propriétaires</span>
              </button>
            </div>
          </div>

          {/* Pillars Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {(activeTab === 'traveler' ? travelerPillars : hostPillars).map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-slate-800 shrink-0 mt-0.5">
                    <Icon size={18} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              {activeTab === 'traveler' 
                ? "Besoin d'un accompagnement personnalisé pour votre arrivée ?" 
                : "Vous possédez une résidence de qualité à Ouagadougou ou Bobo ?"}
            </span>
            <button
              type="button"
              onClick={() => onNavigate(activeTab === 'traveler' ? 'home' : 'owner-dashboard')}
              className="text-xs font-bold text-slate-900 hover:text-slate-700 inline-flex items-center gap-1.5 cursor-pointer underline underline-offset-4"
            >
              <span>{activeTab === 'traveler' ? 'Consulter le catalogue complet' : 'Déposer une annonce'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

        </section>

        {/* SECTION 3: SIMPLE 3-STEP JOURNEY */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fonctionnement</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Réserver en trois étapes claires
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {bookingSteps.map((step) => (
              <div 
                key={step.number}
                className="bg-white p-6 sm:p-7 rounded-2xl border border-stone-200/90 space-y-3 relative"
              >
                <span className="text-2xl font-black text-stone-300 block font-mono">
                  {step.number}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: TRUST, REGULATION & LOCAL CONCIERGERIE */}
        <section className="bg-stone-900 text-white rounded-3xl p-8 sm:p-12 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 bg-stone-800 border border-stone-700 text-stone-300 px-3 py-1 rounded-full text-xs font-semibold">
                <Shield size={12} className="text-emerald-400" />
                <span>Sécurité & Cadre Juridique</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Une infrastructure locale de confiance
              </h2>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
                Éditée et exploitée au Burkina Faso par la société <strong>SAPPAY TECHNOLOGIE</strong>, la plateforme ResiFaso garantit une conformité rigoureuse avec les règles nationales de protection des données, le contrôle des identités et la sécurité intégrale des transactions locatives.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>Traçabilité et reçus officiels</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>Vérification d'identité des hôtes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>Passerelle Mobile Money SapPay</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>Assistance conciergerie 7j/7</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-stone-800/80 border border-stone-700/80 p-6 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-stone-700/60 flex items-center justify-center text-emerald-400 mx-auto">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Transparence & Règles</h4>
                <p className="text-xs text-stone-400">Conditions générales et cadre d'annulation</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tos')}
                className="w-full bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-colors cursor-pointer"
              >
                Lire les conditions
              </button>
            </div>

          </div>
        </section>

        {/* SECTION 5: QUESTIONS FRÉQUENTES */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">FAQ</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Questions fréquemment posées
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  className="bg-white border border-stone-200/90 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-slate-900' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-stone-100 font-normal">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => onNavigate('faq')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Consulter toutes les réponses dans la FAQ</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </section>

        {/* SECTION 6: INVITATION / FINAL CTA */}
        <section className="border-t border-stone-200 pt-16 text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Prêt pour votre prochain séjour ?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Explorez nos annonces de résidences meublées et profitez d'un confort authentique au Burkina Faso.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-7 py-3.5 rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer"
            >
              Découvrir les résidences
            </button>
            
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="bg-white hover:bg-stone-50 text-slate-800 border border-stone-300 font-semibold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              Contacter notre équipe
            </button>
          </div>
        </section>

      </main>
    </div>
  );
};
