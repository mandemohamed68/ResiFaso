import React from 'react';
import { Shield, Lock, FileText, Scale, UserCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface LegalSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const LegalSection: React.FC<LegalSectionProps> = ({ title, icon: Icon, children }) => (
  <section className="mb-12">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
        <Icon size={20} />
      </div>
      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
    </div>
    <div className="text-slate-600 leading-relaxed space-y-4 font-medium text-sm">
      {children}
    </div>
  </section>
);

export const LegalPage: React.FC<{ type: 'tos' | 'privacy' }> = ({ type }) => {
  if (type === 'tos') {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="mb-16 text-center">
            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Conditions Générales d'Utilisation (CGU)</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Dernière mise à jour : 1er Juillet 2026</p>
          </header>

          <LegalSection title="1. Objet et Acceptation" icon={FileText}>
            <p>
              Les présentes Conditions Générales d'Utilisation régissent l'utilisation de la plateforme **ResiFaso**, 
              un service de mise en relation entre propriétaires (Hôtes) et locataires (Voyageurs) pour des séjours de courte et moyenne durée au Burkina Faso.
            </p>
            <p>
              L'accès et l'utilisation de la plateforme impliquent l'acceptation intégrale et sans réserve des présentes CGU. 
              Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser nos services.
            </p>
          </LegalSection>

          <LegalSection title="2. Rôle de la Plateforme" icon={Shield}>
            <p>
              ResiFaso agit exclusivement en tant qu'intermédiaire technique. Nous ne sommes ni propriétaires, 
              ni gestionnaires des logements listés, et nous n'agissons pas en tant qu'agent immobilier.
            </p>
            <p>
              Le contrat de location est conclu directement entre l'Hôte et le Voyageur. ResiFaso ne peut être tenu responsable 
              des litiges, dégradations ou comportements survenant durant le séjour.
            </p>
          </LegalSection>

          <LegalSection title="3. Obligations des Hôtes" icon={UserCheck}>
            <ul className="list-disc pl-5 space-y-2">
              <li>Fournir des informations exactes et des photos fidèles à la réalité.</li>
              <li>Maintenir le logement dans un état de propreté et de sécurité optimal.</li>
              <li>Respecter les réservations confirmées et honorer les services inclus (eau, électricité, wifi, etc.).</li>
              <li>Se conformer aux réglementations fiscales et juridiques locales en vigueur au Burkina Faso.</li>
            </ul>
          </LegalSection>

          <LegalSection title="4. Obligations des Voyageurs" icon={UserCheck}>
            <ul className="list-disc pl-5 space-y-2">
              <li>Utiliser le logement en "bon père de famille" et respecter le voisinage.</li>
              <li>Payer l'intégralité du séjour selon les modalités convenues.</li>
              <li>Respecter le nombre maximum d'occupants déclaré lors de la réservation.</li>
              <li>Signaler immédiatement tout dommage ou problème technique à l'Hôte.</li>
            </ul>
          </LegalSection>

          <LegalSection title="5. Clause de Confidentialité Professionnelle" icon={Lock}>
            <p>
              Toutes les parties (Hôtes, Voyageurs et ResiFaso) s'engagent à respecter une confidentialité stricte 
              concernant les informations personnelles, financières et privées échangées durant le processus de réservation et le séjour.
            </p>
            <p>
              Les Hôtes ne doivent en aucun cas divulguer les informations de leurs clients à des tiers non autorisés. 
              De même, les Voyageurs s'engagent à respecter l'intimité et la propriété intellectuelle de l'Hôte.
            </p>
          </LegalSection>

          <LegalSection title="6. Paiements et Commissions" icon={Scale}>
            <p>
              ResiFaso prélève une commission de service sur chaque transaction pour assurer le fonctionnement de la plateforme, 
              la sécurisation des paiements et le support client.
            </p>
            <p>
              Les modalités d'annulation et de remboursement sont définies spécifiquement pour chaque logement par l'Hôte, 
              dans le cadre des options proposées par la plateforme.
            </p>
          </LegalSection>

          <LegalSection title="7. Limitation de Responsabilité" icon={AlertTriangle}>
            <p>
              ResiFaso ne saurait être tenu responsable en cas de force majeure, d'interruption technique du service, 
              ou de comportements frauduleux d'utilisateurs. Nous nous réservons le droit de suspendre tout compte 
              ne respectant pas les présentes CGU ou portant atteinte à l'image de la plateforme.
            </p>
          </LegalSection>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Politique de Confidentialité</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Protection de vos données au Burkina Faso</p>
        </header>

        <LegalSection title="1. Collecte des Données" icon={FileText}>
          <p>
            Nous collectons les informations nécessaires au bon fonctionnement du service : nom, prénom, numéro de téléphone, 
            adresse email, et informations relatives aux logements pour les Hôtes.
          </p>
        </LegalSection>

        <LegalSection title="2. Utilisation des Données" icon={Shield}>
          <p>Vos données sont utilisées exclusivement pour :</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Gérer vos réservations et communications.</li>
            <li>Sécuriser les transactions financières.</li>
            <li>Améliorer l'expérience utilisateur sur ResiFaso.</li>
            <li>Respecter nos obligations légales et réglementaires.</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Partage des Données" icon={Lock}>
          <p>
            Vos informations de contact ne sont partagées avec l'autre partie (Hôte/Voyageur) qu'une fois la réservation 
            confirmée ou pour faciliter une demande de renseignements. Nous ne vendons jamais vos données à des tiers.
          </p>
        </LegalSection>

        <LegalSection title="4. Sécurité" icon={Shield}>
          <p>
            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles robustes pour protéger 
            vos données contre tout accès non autorisé, perte ou altération.
          </p>
        </LegalSection>

        <LegalSection title="5. Vos Droits" icon={Scale}>
          <p>
            Conformément à la législation sur la protection des données, vous disposez d'un droit d'accès, 
            de rectification et de suppression de vos données personnelles. Vous pouvez exercer ces droits 
            depuis vos paramètres de profil ou en nous contactant.
          </p>
        </LegalSection>
      </motion.div>
    </div>
  );
};
