import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, ShieldCheck, Check, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

export const TermsGuideModal: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user || user.hasAcceptedTerms) return null;

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/users/${user.uid}/accept-terms`, { method: 'POST' });
      if (!response.ok) {
        throw new Error("Erreur lors de la validation des conditions");
      }
      await refreshProfile();
    } catch (e: any) {
      console.error("Failed to accept terms:", e);
      setError(e.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 pb-10 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[88vh] my-auto sm:my-0"
      >
        <div className="p-6 pb-4 shrink-0 border-b border-slate-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-xl animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3.5 mb-1">
            <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Bienvenue sur ResiFaso</h2>
              <p className="text-xs font-medium text-slate-500">Avant de continuer, veuillez prendre connaissance du guide.</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-slate-700" />
                Guide d'Utilisation
              </h3>
              <div className="text-xs text-slate-600 space-y-3 font-normal leading-relaxed">
                <p>
                  ResiFaso est la plateforme de référence pour la réservation d'hébergements et de résidences meublées au Burkina Faso. 
                  Notre système vous permet de :
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-700 font-medium">
                  <li>Réserver des logements en toute sécurité via Mobile Money (Orange, Moov, Telecel, Coris).</li>
                  <li>Echanger directement avec les hôtes ou contacter notre assistance client.</li>
                  <li>Bénéficier d'une vérification des hébergements pour des séjours en toute quiétude.</li>
                </ul>
                <div className="bg-slate-50 border border-slate-200/80 text-slate-700 p-3.5 rounded-xl flex gap-3 items-start mt-4">
                  <Info size={18} className="shrink-0 mt-0.5 text-slate-500" />
                  <p className="text-xs">
                    <strong className="font-semibold text-slate-900">Assistance support :</strong> Pour toute question, vous pouvez utiliser le bouton de discussion en bas à droite.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Conditions Générales d'Utilisation</h3>
              <div className="text-xs text-slate-600 space-y-3 font-normal leading-relaxed">
                <p>
                  En utilisant ResiFaso, vous vous engagez à respecter les conditions d'utilisation :
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-700 font-medium">
                  <li>Les réservations sont soumises à la confirmation par le propriétaire.</li>
                  <li>Tout manquement aux règles du logement peut entraîner la suspension du compte.</li>
                  <li>Vos données personnelles sont protégées en conformité avec la réglementation en vigueur.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 shrink-0 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-2">
            <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-slate-900' : 'bg-slate-300'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-slate-900' : 'bg-slate-300'}`} />
          </div>

          <div className="flex gap-2.5">
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
              >
                Continuer
              </button>
            )}
            {step === 2 && (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Retour
                </button>
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Check size={15} />
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
