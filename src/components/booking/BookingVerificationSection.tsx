import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, AlertCircle, Eye, FileText, Loader2, ShieldCheck, Info } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { VerificationType } from '../../types';
import { cn } from '../../lib/utils';

interface BookingVerificationSectionProps {
  bookingId: string;
  clientId: string;
  isPast: boolean;
  canEdit: boolean;
  onStatusChange?: (newStatus: Record<string, boolean>) => void;
}

export const BookingVerificationSection: React.FC<BookingVerificationSectionProps> = ({ 
  bookingId, 
  clientId,
  isPast,
  canEdit,
  onStatusChange
}) => {
  const [types, setTypes] = useState<VerificationType[]>([]);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [showIdDocs, setShowIdDocs] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) return;
      setLoading(true);
      try {
        const [verifRes, profileRes] = await Promise.all([
          apiFetch(`/api/reservations/${bookingId}/verifications`),
          clientId ? apiFetch(`/api/users/${clientId}`) : Promise.resolve({ ok: false } as any)
        ]);

        if (verifRes.ok) {
          const data = await verifRes.json();
          if (data && Array.isArray(data.types)) {
            setTypes(data.types);
          }
          if (data && data.status) {
            // Handle both object and string (if DB returns string)
            const verifStatus = typeof data.status === 'string' ? JSON.parse(data.status) : data.status;
            setStatus(verifStatus || {});
          }
        }

        if (profileRes.ok) {
          setClientProfile(await profileRes.json());
        }
      } catch (err) {
        console.error("Error fetching verification data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookingId, clientId]);

  const toggleVerification = async (id: string) => {
    if (!canEdit || isPast || status[id] || updatingId) return;

    setUpdatingId(id);
    try {
      const response = await apiFetch(`/api/reservations/${bookingId}/verifications`, {
        method: 'PUT',
        body: JSON.stringify({ verificationId: id, status: true })
      });

      if (response.ok) {
        const data = await response.json();
        const newStatus = typeof data.status === 'string' ? JSON.parse(data.status) : data.status;
        setStatus(newStatus || {});
        setSuccessMsg("Élément vérifié avec succès");
        if (onStatusChange) {
          onStatusChange(newStatus || {});
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        alert("Erreur: " + (errData.error || response.statusText));
      }
    } catch (err: any) {
      console.error("Error updating verification:", err);
      alert("Erreur lors de la mise à jour : " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className="animate-pulse h-20 bg-slate-50 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          🛡️ Vérifications de : <span className="text-slate-900">{clientProfile?.display_name || clientProfile?.displayName || 'Voyageur'}</span>
        </span>
        {clientProfile && (clientProfile.identity_document_front || clientProfile.identityDocumentFront) && (
          <button 
            onClick={() => setShowIdDocs(!showIdDocs)}
            className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase hover:underline"
          >
            <Eye size={12} />
            {showIdDocs ? "Masquer les pièces" : "Voir les pièces d'identité"}
          </button>
        )}
      </div>

      {showIdDocs && clientProfile && (clientProfile.identity_document_front || clientProfile.identityDocumentFront || clientProfile.idNumber) ? (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-50 p-4 rounded-2xl overflow-hidden space-y-4"
        >
          {/* Document metadata info table */}
          {(clientProfile.idNumber || clientProfile.idType) && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Type de pièce</span>
                <span className="text-slate-900 font-extrabold">{clientProfile.idType || "Non spécifié"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">N° de document</span>
                <span className="text-slate-900 font-extrabold">{clientProfile.idNumber || "Non spécifié"}</span>
              </div>
              {clientProfile.idExpiry && (
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Date d'expiration</span>
                  <span className="text-slate-900 font-extrabold">{clientProfile.idExpiry}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Recto</span>
              {clientProfile.identity_document_front || clientProfile.identityDocumentFront ? (
                <img 
                  src={clientProfile.identity_document_front || clientProfile.identityDocumentFront} 
                  className="w-full h-32 object-cover rounded-lg border border-slate-200" 
                  alt="ID Front" 
                />
              ) : (
                <div className="w-full h-32 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                  Aucun recto
                </div>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Verso</span>
              {clientProfile.identity_document_back || clientProfile.identityDocumentBack ? (
                <img 
                  src={clientProfile.identity_document_back || clientProfile.identityDocumentBack} 
                  className="w-full h-32 object-cover rounded-lg border border-slate-200" 
                  alt="ID Back" 
                />
              ) : (
                <div className="w-full h-32 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                  Aucun verso
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : showIdDocs && clientProfile ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center text-xs text-amber-900 font-bold">
          ⚠️ Le voyageur n'a pas encore téléversé sa pièce d'identité sur son compte. Veuillez impérativement exiger sa pièce d'identité physique originale au moment de la remise des clés.
        </div>
      ) : null}

      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-900 font-bold flex items-start gap-2">
        <span className="text-sm">🛑</span>
        <p className="leading-normal">
          <strong>Rappel réglementaire :</strong> Vous devez impérativement faire les vérifications physiques en vigueur demandées par l'État (vérifier et valider la pièce d'identité physique du voyageur) <strong>avant de lui remettre formellement les clés</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {types.map((type) => {
          const isVerified = !!status[type.id];
          const isItemUpdating = updatingId === type.id;
          
          return (
            <div
              key={type.id}
              onClick={() => !isVerified && toggleVerification(type.id)}
              className={cn(
                "group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 text-left min-h-[100px] select-none",
                isVerified 
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 cursor-default" 
                  : isPast 
                    ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                    : !canEdit
                      ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-amber-50/50 border-amber-200 text-amber-900 cursor-pointer hover:bg-amber-100/70 hover:border-amber-300 active:scale-[0.98]"
              )}
            >
              <div className="flex items-start justify-between w-full gap-3 mb-2">
                <div className="flex flex-col gap-0.5 pr-2">
                  <span className={cn(
                    "text-[11px] font-black uppercase tracking-wide leading-tight",
                    isVerified ? "text-emerald-700" : "text-slate-900"
                  )}>
                    {type.label}
                  </span>
                  {type.description && (
                    <span className="text-[9px] font-bold text-slate-500 leading-normal line-clamp-2 opacity-80 italic">
                      {type.description}
                    </span>
                  )}
                </div>
                <div className={cn(
                  "shrink-0 p-2 rounded-xl border transition-all duration-500",
                  isVerified 
                    ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                    : isItemUpdating
                      ? "bg-amber-500 text-white border-amber-400 animate-spin"
                      : isPast 
                        ? "bg-slate-100 text-slate-400 border-slate-200"
                        : "bg-amber-100 text-amber-700 border-amber-200 animate-[pulse_2s_infinite]"
                )}>
                  {isVerified ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isItemUpdating ? (
                    <Loader2 size={14} strokeWidth={3} />
                  ) : (
                    <AlertCircle size={14} strokeWidth={2.5} />
                  )}
                </div>
              </div>

              <div className="w-full flex items-center justify-between border-t border-dashed border-slate-200/60 pt-2 mt-auto">
                <span className="text-[8px] font-mono tracking-wider uppercase opacity-50 font-bold">Réf: {type.id}</span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck size={10} />
                    Vérifié & Validé
                  </span>
                ) : isPast ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Expiré
                  </span>
                ) : canEdit ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200/80 group-hover:bg-amber-200 transition-all duration-200 shadow-sm transform group-hover:translate-x-0.5">
                    {isItemUpdating ? "Validation..." : "👉 Valider ici"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md italic">
                    <Info size={10} />
                    En attente
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-black animate-in fade-in slide-in-from-bottom-6 duration-300 z-[200] flex items-center gap-2 border border-emerald-400/30">
          <Check size={18} strokeWidth={3} />
          {successMsg}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blink {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.98); background-color: rgba(251, 191, 36, 0.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
};
