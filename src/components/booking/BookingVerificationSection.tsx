import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, AlertCircle, Eye, FileText } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { VerificationType } from '../../types';
import { cn } from '../../lib/utils';

interface BookingVerificationSectionProps {
  bookingId: string;
  clientId: string;
  isPast: boolean;
  canEdit: boolean;
}

export const BookingVerificationSection: React.FC<BookingVerificationSectionProps> = ({ 
  bookingId, 
  clientId,
  isPast,
  canEdit 
}) => {
  const [types, setTypes] = useState<VerificationType[]>([]);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [showIdDocs, setShowIdDocs] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [verifRes, profileRes] = await Promise.all([
          apiFetch(`/api/reservations/${bookingId}/verifications`),
          apiFetch(`/api/users/${clientId}`)
        ]);

        if (verifRes.ok) {
          const contentType = verifRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await verifRes.json();
            if (data && Array.isArray(data.types)) {
              setTypes(data.types);
            }
            if (data && data.status) {
              setStatus(data.status);
            }
          } else {
            console.warn("Expected JSON from verification endpoint, got:", contentType);
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
    if (!canEdit || isPast || status[id]) return;

    try {
      const response = await apiFetch(`/api/reservations/${bookingId}/verifications`, {
        method: 'PUT',
        body: JSON.stringify({ verificationId: id, status: true })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      }
    } catch (err) {
      console.error("Error updating verification:", err);
      alert("Erreur lors de la mise à jour : " + err.message);
    }
  };

  if (loading) return <div className="animate-pulse h-20 bg-slate-50 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          🛡️ Vérifications du Client
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

      {showIdDocs && clientProfile && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl overflow-hidden"
        >
          <div className="space-y-2">
            <span className="text-[9px] font-black text-slate-400 uppercase">Recto</span>
            <img 
              src={clientProfile.identity_document_front || clientProfile.identityDocumentFront} 
              className="w-full h-32 object-cover rounded-lg border border-slate-200" 
              alt="ID Front" 
            />
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-black text-slate-400 uppercase">Verso</span>
            <img 
              src={clientProfile.identity_document_back || clientProfile.identityDocumentBack} 
              className="w-full h-32 object-cover rounded-lg border border-slate-200" 
              alt="ID Back" 
            />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {types.map((type) => {
          const isVerified = !!status[type.id];
          return (
            <button
              key={type.id}
              onClick={() => toggleVerification(type.id)}
              disabled={!canEdit || isPast || isVerified}
              className={cn(
                "group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 text-left min-h-[90px]",
                isVerified 
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 cursor-default" 
                  : isPast 
                    ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-amber-50/50 border-amber-200 text-amber-900 cursor-pointer hover:bg-amber-100/70 hover:border-amber-300"
              )}
            >
              <div className="flex items-start justify-between w-full gap-2 mb-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-black uppercase tracking-wide leading-tight">{type.label}</span>
                  {type.description && (
                    <span className="text-[9px] font-medium opacity-80 leading-normal line-clamp-2">{type.description}</span>
                  )}
                </div>
                <div className={cn(
                  "shrink-0 p-1.5 rounded-xl border transition-all",
                  isVerified 
                    ? "bg-emerald-500 text-white border-emerald-400" 
                    : isPast 
                      ? "bg-slate-100 text-slate-400 border-slate-200"
                      : "bg-amber-100 text-amber-700 border-amber-200 animate-[pulse_2s_infinite]"
                )}>
                  {isVerified ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <AlertCircle size={12} />
                  )}
                </div>
              </div>

              <div className="w-full flex items-center justify-between border-t border-dashed border-slate-200/60 pt-2 mt-auto">
                <span className="text-[8px] font-mono tracking-wider uppercase opacity-50">Réf: {type.id}</span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-md border border-emerald-200">
                    🔒 Validé & Verrouillé
                  </span>
                ) : isPast ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Non Vérifié
                  </span>
                ) : canEdit ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-750 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/80 hover:bg-amber-200 transition-colors cursor-pointer group-hover:scale-105 transform origin-right duration-200">
                    👉 Cliquer pour valider
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    En attente de validation
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

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
