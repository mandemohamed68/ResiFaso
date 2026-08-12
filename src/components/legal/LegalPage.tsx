import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, FileText, Scale, UserCheck, AlertTriangle, 
  Check, Copy, Printer, Search, Globe, Building, 
  CreditCard, BookOpen, ArrowRight, HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface LegalPageProps {
  type?: 'tos' | 'privacy' | 'guide';
}

export const LegalPage: React.FC<LegalPageProps> = ({ type: initialType = 'tos' }) => {
  const [activeTab, setActiveTab] = useState<'tos' | 'privacy' | 'guide'>(initialType);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('');

  useEffect(() => {
    setActiveTab(initialType);
  }, [initialType]);

  const tosUrl = 'https://www.resifaso.net/Conditions_Generales';
  const privacyUrl = 'https://www.resifaso.net/Politique_de_Confidentialite';
  const currentUrl = activeTab === 'privacy' ? privacyUrl : tosUrl;

  const handleCopyLink = (urlToCopy: string) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(urlToCopy);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const tosSections = [
    { id: 'tos-art1', title: 'Art 1. Mentions Légales & Définitions' },
    { id: 'tos-art2', title: 'Art 2. Champ d\'Application & Territorialité' },
    { id: 'tos-art3', title: 'Art 3. Inscription & Vérification (KYC)' },
    { id: 'tos-art4', title: 'Art 4. Engagement & Responsabilités des Hôtes' },
    { id: 'tos-art5', title: 'Art 5. Réservation & Paiements Mobile Money' },
    { id: 'tos-art6', title: 'Art 6. Commission de Service ResiFaso' },
    { id: 'tos-art7', title: 'Art 7. Politique d\'Annulation & Remboursements' },
    { id: 'tos-art8', title: 'Art 8. Règlement Intérieur & Caution' },
    { id: 'tos-art9', title: 'Art 9. Responsabilités & Tiers de Confiance' },
    { id: 'tos-art10', title: 'Art 10. Droit Applicable & Juridiction' },
  ];

  const privacySections = [
    { id: 'priv-art1', title: 'Art 1. Cadre Réglementaire & CIL Burkina' },
    { id: 'priv-art2', title: 'Art 2. Nature des Données Collectées' },
    { id: 'priv-art3', title: 'Art 3. Finalités du Traitement' },
    { id: 'priv-art4', title: 'Art 4. Partage & Destinataires' },
    { id: 'priv-art5', title: 'Art 5. Durée & Chiffrement Securisé' },
    { id: 'priv-art6', title: 'Art 6. Vos Droits (Accès & Suppression)' },
    { id: 'priv-art7', title: 'Art 7. Cookies & Stockage Local' },
  ];

  const guideSections = [
    { id: 'guide-voyageur', title: '1. Guide pour les Voyageurs' },
    { id: 'guide-hote', title: '2. Guide pour les Hôtes & Bailleurs' },
    { id: 'guide-paiement', title: '3. Sécurité des Paiements Mobile' },
    { id: 'guide-faq', title: '4. Questions Fréquentes' },
  ];

  const activeSectionsList = activeTab === 'tos' ? tosSections : activeTab === 'privacy' ? privacySections : guideSections;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* CLEAN SOBRE HEADER BANNER */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                ResiFaso — Document Juridique Officiel
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-mono text-[11px]">
                Mise à jour : 12 Août 2026
              </span>
              <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-mono text-[11px]">
                Conforme CIL Burkina Faso
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'tos' && "Conditions Générales d'Utilisation (CGU / CGV)"}
              {activeTab === 'privacy' && "Politique de Confidentialité & Protection des Données"}
              {activeTab === 'guide' && "Guide d'Utilisation & Support Juridique"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Dispositions légales régissant la réservation de logements meublés, les transactions Mobile Money 
              et la protection des données sur la plateforme ResiFaso au Burkina Faso.
            </p>
          </div>

          {/* TAB SELECTOR & TOOLBAR */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('tos')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'tos'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FileText size={14} />
                <span>Conditions Générales</span>
              </button>

              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Lock size={14} />
                <span>Confidentialité</span>
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <BookOpen size={14} />
                <span>Guide & FAQ</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyLink(currentUrl)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copiedUrl === currentUrl ? (
                  <>
                    <Check size={14} className="text-slate-900" />
                    <span className="text-slate-900">Lien copié</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copier le lien</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={14} />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        </div>

        {/* CANONICAL LINK BOX */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <Globe size={15} className="text-slate-400 shrink-0" />
            <span className="font-medium">URL officielle :</span>
            <a 
              href={currentUrl} 
              target="_blank" 
              rel="noreferrer"
              className="font-mono font-bold text-slate-900 hover:underline break-all"
            >
              {currentUrl}
            </a>
          </div>

          <button
            onClick={() => handleCopyLink(currentUrl)}
            className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition cursor-pointer shrink-0"
          >
            {copiedUrl === currentUrl ? 'Copié' : 'Copier l\'adresse'}
          </button>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* SIDEBAR TOC */}
          <div className="lg:col-span-1 space-y-4">
            <div className="sticky top-6 space-y-4">
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Rechercher une clause
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: acompte, annulation..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition"
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Sommaire</span>
                  <span className="text-[10px] text-slate-400 font-normal">{activeSectionsList.length} articles</span>
                </div>

                <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
                  {activeSectionsList.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                        activeSectionId === item.id
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate pr-1">{item.title}</span>
                      <ArrowRight size={11} className="shrink-0 opacity-40" />
                    </button>
                  ))}
                </nav>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <HelpCircle size={15} className="text-slate-300" />
                  <h4 className="font-bold text-xs">Support Juridique</h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                  Pour toute demande concernant vos contrats ou litiges, contactez directement l'équipe ResiFaso.
                </p>
                <a
                  href="/contact"
                  className="block text-center bg-white hover:bg-slate-100 text-slate-900 font-bold text-[11px] py-2 rounded-lg transition"
                >
                  Contacter l'assistance
                </a>
              </div>

            </div>
          </div>

          {/* MAIN LEGAL CONTENT */}
          <div className="lg:col-span-3 space-y-6">

            {/* TAB 1: TERMS OF SERVICE */}
            {activeTab === 'tos' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* PREAMBLE */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                    <Shield size={18} className="text-slate-700" />
                    <h2 className="text-base uppercase tracking-wide">Préambule</h2>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Le présent document régit l'utilisation de la plateforme numérique **ResiFaso** (accessible sur <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">www.resifaso.net</code>) dédiée à la réservation de logements meublés, appartements et résidences au Burkina Faso.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Toute utilisation des services implique l'acceptation pleine et entière des présentes conditions par les Utilisateurs (Voyageurs et Hôtes).
                  </p>
                </div>

                {/* ART 1 */}
                <div id="tos-art1" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building size={16} className="text-slate-700" />
                      <span>Art 1. Mentions Légales & Définitions</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 1</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>Dans le cadre des présentes conditions :</p>
                    <ul className="space-y-2 pl-1">
                      <li className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <strong className="text-slate-900 block font-semibold mb-0.5">● ResiFaso ("la Plateforme") :</strong> 
                        Service d'intermédiation technique permettant la mise en relation entre propriétaires et locataires temporaires.
                      </li>
                      <li className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <strong className="text-slate-900 block font-semibold mb-0.5">● Voyageur / Client :</strong> 
                        Toute personne physique majeure ou personne morale effectuant une réservation de logement meublé.
                      </li>
                      <li className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <strong className="text-slate-900 block font-semibold mb-0.5">● Hôte / Propriétaire :</strong> 
                        Personne physique ou morale proposant un logement à la location temporaire.
                      </li>
                      <li className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <strong className="text-slate-900 block font-semibold mb-0.5">● Acompte de Réservation :</strong> 
                        Montant réglé en ligne via Mobile Money pour verrouiller les dates de séjour.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* ART 2 */}
                <div id="tos-art2" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Globe size={16} className="text-slate-700" />
                      <span>Art 2. Champ d'Application & Territorialité</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 2</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      Les présentes conditions s'appliquent à l'ensemble des logements répertoriés au **Burkina Faso** (Ouagadougou, Bobo-Dioulasso, Koudougou, etc.). L'utilisateur déclare être âgé d'au moins 18 ans et disposer de sa pleine capacité juridique.
                    </p>
                  </div>
                </div>

                {/* ART 3 */}
                <div id="tos-art3" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <UserCheck size={16} className="text-slate-700" />
                      <span>Art 3. Inscription & Vérification d'Identité (KYC)</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 3</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      Chaque utilisateur fournit un nom exact, une adresse e-mail valide et un numéro de téléphone vérifié. ResiFaso se réserve le droit de réclamer une copie de la CNIB ou du passeport valide pour la confirmation des comptes Hôtes.
                    </p>
                  </div>
                </div>

                {/* ART 4 */}
                <div id="tos-art4" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building size={16} className="text-slate-700" />
                      <span>Art 4. Engagement & Responsabilités des Hôtes</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 4</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>Tout Hôte s'engage à :</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                      <li>Publier des photos conformes à l'état réel du logement.</li>
                      <li>Préciser les modalités de gestion de l'électricité (compteur Cash Power) et de l'eau.</li>
                      <li>Garantir la propreté, l'hygiène et la sécurité des lieux mis en location.</li>
                      <li>Honorer les réservations confirmées par le paiement d'un acompte.</li>
                    </ul>
                  </div>
                </div>

                {/* ART 5 */}
                <div id="tos-art5" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard size={16} className="text-slate-700" />
                      <span>Art 5. Modalités de Réservation & Paiements Mobile Money</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 5</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      Les paiements d'acomptes s'effectuent via les services Mobile Money partenaires (Orange Money, Moov Money, Telecel Cash, Coris Money). Le paiement sécurise la réservation et bloque les dates sélectionnées.
                    </p>
                  </div>
                </div>

                {/* ART 6 */}
                <div id="tos-art6" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Scale size={16} className="text-slate-700" />
                      <span>Art 6. Commission de Service ResiFaso & Non-Remboursement</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 6</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      ResiFaso perçoit une commission sur chaque réservation validée. Cette commission couvre les frais de fonctionnement de la plateforme et les coûts de transaction bancaires.
                    </p>
                    <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-[11px]">
                      <strong>Règle de Gestion :</strong> La commission de service de la plateforme est non remboursable en cas d'annulation à l'initiative du voyageur.
                    </div>
                  </div>
                </div>

                {/* ART 7 */}
                <div id="tos-art7" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Scale size={16} className="text-slate-700" />
                      <span>Art 7. Politique d'Annulation & Modalités de Remboursement</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 7</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>Les conditions d'annulation sont définies selon l'option choisie par l'Hôte :</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-2">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px]">
                        <span className="font-bold block mb-0.5">Souple</span>
                        <span>Annulation sans frais au moins 24h avant le check-in.</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px]">
                        <span className="font-bold block mb-0.5">Modérée</span>
                        <span>Annulation sans frais jusqu'à 5 jours avant la date d'arrivée.</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px]">
                        <span className="font-bold block mb-0.5">Stricte</span>
                        <span>Préavis d'annulation de 14 jours requis.</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-[11px]">
                      Calcul : Remboursement = Montant Versé - Commission Plateforme - Nuits Consommées
                    </div>
                  </div>
                </div>

                {/* ART 8 */}
                <div id="tos-art8" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Lock size={16} className="text-slate-700" />
                      <span>Art 8. Règlement Intérieur, Dégradations & Caution</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 8</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      Le Voyageur s'engage à respecter les règles du logement et à restituer les lieux dans un état propre. Toute dégradation fera l'objet d'un prélèvement sur la caution ou d'une facturation complémentaire.
                    </p>
                  </div>
                </div>

                {/* ART 9 */}
                <div id="tos-art9" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-slate-700" />
                      <span>Art 9. Responsabilités & Tiers de Confiance</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 9</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      ResiFaso agit exclusivement en qualité d'intermédiaire technique et décline toute responsabilité pour les interruptions de services d'utilité publique (eau ONEA, électricité SONABEL) ou cas de force majeure.
                    </p>
                  </div>
                </div>

                {/* ART 10 */}
                <div id="tos-art10" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Scale size={16} className="text-slate-700" />
                      <span>Art 10. Droit Applicable & Juridiction</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Section 10</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      Les présentes conditions sont régies par le Droit du Burkina Faso. Tout litige non résolu à l'amiable relèvera de la compétence exclusive des tribunaux de Ouagadougou.
                    </p>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 2: PRIVACY POLICY */}
            {activeTab === 'privacy' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                    <Lock size={18} className="text-slate-700" />
                    <h2 className="text-base uppercase tracking-wide">Protection des Données Personnelles</h2>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Conformément à la Loi n°010-2004/AN du Burkina Faso et aux dispositions de la Commission de l'Informatique et des Libertés (CIL), ResiFaso garantit la confidentialité de vos données personnelles.
                  </p>
                </div>

                <div id="priv-art1" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Shield size={16} className="text-slate-700" />
                    <span>Art 1. Cadre Réglementaire & CIL Burkina</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Les données collectées sur <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">www.resifaso.net</code> sont traitées dans le strict respect de la réglementation locale.
                  </p>
                </div>

                <div id="priv-art2" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <FileText size={16} className="text-slate-700" />
                    <span>Art 2. Nature des Données Collectées</span>
                  </h3>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                    <li>Nom, prénom, pièce d'identité (CNIB/Passeport).</li>
                    <li>Numéro de téléphone Mobile Money et adresse e-mail.</li>
                    <li>Historique des réservations et transactions.</li>
                  </ul>
                </div>

                <div id="priv-art3" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Check size={16} className="text-slate-700" />
                    <span>Art 3. Finalités du Traitement</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Les données sont utilisées exclusivement pour l'exécution des réservations, les confirmations par SMS/e-mail et la prévention de la fraude.
                  </p>
                </div>

                <div id="priv-art4" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Building size={16} className="text-slate-700" />
                    <span>Art 4. Partage & Destinataires</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Aucune donnée n'est cédée à des tiers à des fins commercialisables. Les coordonnées utiles ne sont partagées qu'entre l'Hôte et le Voyageur concernés par une réservation confirmée.
                  </p>
                </div>

                <div id="priv-art5" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Lock size={16} className="text-slate-700" />
                    <span>Art 5. Durée de Conservation & Chiffrement Securisé</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Les données sont chiffrées selon les standards industriels SSL/TLS et conservées pendant la durée d'activité du compte.
                  </p>
                </div>

                <div id="priv-art6" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <UserCheck size={16} className="text-slate-700" />
                    <span>Art 6. Vos Droits (Accès & Suppression)</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Chaque utilisateur peut demander l'accès, la rectification ou la suppression de ses données à tout moment depuis son espace profil ou via <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">contact@resifaso.net</code>.
                  </p>
                </div>

                <div id="priv-art7" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Globe size={16} className="text-slate-700" />
                    <span>Art 7. Cookies & Stockage Local</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Les cookies utilisés sont uniquement fonctionnels pour le maintien des sessions de connexion sécurisées.
                  </p>
                </div>

              </motion.div>
            )}

            {/* TAB 3: GUIDE & FAQ */}
            {activeTab === 'guide' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div id="guide-voyageur" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <UserCheck size={16} className="text-slate-700" />
                    <span>1. Guide Voyageurs</span>
                  </h3>
                  <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                    <li>Recherchez votre résidence par ville et date.</li>
                    <li>Consultez la fiche détaillée et les tarifs.</li>
                    <li>Réglez l'acompte de réservation via Mobile Money.</li>
                    <li>Effectuez votre check-in avec l'Hôte.</li>
                  </ol>
                </div>

                <div id="guide-hote" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Building size={16} className="text-slate-700" />
                    <span>2. Guide Hôtes & Bailleurs</span>
                  </h3>
                  <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                    <li>Publiez les caractéristiques et photos de votre bien.</li>
                    <li>Gérez la disponibilité de votre calendrier.</li>
                    <li>Recevez le virement de vos revenus vers votre compte Mobile Money.</li>
                  </ol>
                </div>

                <div id="guide-paiement" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <CreditCard size={16} className="text-slate-700" />
                    <span>3. Sécurité des Paiements</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Toutes les transactions sont soumises à la validation par code PIN Mobile Money sur le téléphone de l'utilisateur.
                  </p>
                </div>

                <div id="guide-faq" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 scroll-mt-6">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <HelpCircle size={16} className="text-slate-700" />
                    <span>4. Foire Aux Questions</span>
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                      <strong className="text-slate-900 block font-semibold mb-0.5">Q : Comment annuler une réservation ?</strong>
                      <p>R : Rendez-vous dans votre espace Réservations et sélectionnez "Annuler".</p>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
