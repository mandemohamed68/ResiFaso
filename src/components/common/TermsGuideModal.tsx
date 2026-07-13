import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, ShieldCheck, Check, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

export const TermsGuideModal: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!user || user.hasAcceptedTerms) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await apiFetch(`/api/users/${user.uid}/accept-terms`, { method: 'POST' });
      await refreshProfile();
    } catch (e) {
      console.error("Failed to accept terms:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 pb-4 shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">Bienvenue sur ResiFaso</h2>
              <p className="text-sm font-medium text-slate-500">Avant de continuer, veuillez lire notre guide.</p>
            </div>
          </div>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={20} className="text-red-600" />
                Guide d'Utilisation
              </h3>
              <div className="text-sm text-slate-600 space-y-4 font-medium leading-relaxed">
                <p>
                  ResiFaso est la plateforme de référence pour la réservation d'hébergements et de résidences meublées au Burkina Faso. 
                  Notre système sécurisé vous permet de :
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-700">
                  <li>Réserver des logements en toute sécurité grâce à notre intégration Mobile Money (Moov, Coris).</li>
                  <li>Communiquer directement avec les hôtes, ou avec le support pour toute demande d'assistance.</li>
                  <li>Profiter d'une vérification stricte de tous les hôtes pour garantir des séjours en toute sérénité.</li>
                </ul>
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 items-start mt-6">
                  <Info size={20} className="shrink-0 mt-0.5" />
                  <p>
                    <strong>Bon à savoir :</strong> Si vous rencontrez un problème, cliquez sur l'icône de chat en bas à droite pour parler à notre équipe support.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800">Conditions Générales d'Utilisation</h3>
              <div className="text-sm text-slate-600 space-y-4 font-medium leading-relaxed">
                <p>
                  En utilisant ResiFaso, vous acceptez de respecter nos règles de conduite :
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-700">
                  <li>Les réservations sont soumises à la disponibilité confirmée par le système.</li>
                  <li>Tout comportement inapproprié ou dommage dans une résidence entraînera des sanctions et une suspension du compte.</li>
                  <li>Le traitement de vos données personnelles (pièces d'identité, historique) est géré conformément à notre politique de stricte confidentialité.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 shrink-0 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-2">
            <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-red-600' : 'bg-slate-300'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-red-600' : 'bg-slate-300'}`} />
          </div>

          <div className="flex gap-3">
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition"
              >
                Continuer
              </button>
            )}
            {step === 2 && (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl transition"
                >
                  Retour
                </button>
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                >
                  <Check size={16} />
                  {loading ? 'Validation...' : 'J\'accepte'}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
