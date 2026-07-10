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

    const newStatus = !status[id];
    try {
      const response = await apiFetch(`/api/reservations/${bookingId}/verifications`, {
        method: 'PUT',
        body: JSON.stringify({ verificationId: id, status: newStatus })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      }
    } catch (err) {
      console.error("Error updating verification:", err);
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
                "group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 text-left",
                isVerified 
                  ? "bg-green-50 border-green-200 text-green-800 cursor-default" 
                  : isPast 
                    ? "bg-red-50 border-red-100 text-red-700 cursor-not-allowed"
                    : "bg-amber-50 border-amber-200 text-amber-800 animate-[blink_2s_infinite] cursor-pointer hover:bg-amber-100"
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-black uppercase leading-tight">{type.label}</span>
                {type.description && (
                  <span className="text-[9px] font-medium opacity-70 line-clamp-1">{type.description}</span>
                )}
              </div>
              <div className={cn(
                "shrink-0 p-1 rounded-full",
                isVerified ? "bg-green-500 text-white" : "bg-white/50"
              )}>
                {isVerified ? <Check size={12} strokeWidth={4} /> : <AlertCircle size={12} />}
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
