import { formatCurrency } from '../../utils/currency';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getClientBookings, updateBookingStatus, sendNotification, getBackendDbType, getAllResidences } from '../../lib/db';
import { Booking, Residence } from '../../types';
import { MOCK_RESIDENCES } from '../../mockData';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CreditCard, MessageSquare, Compass, Send, CheckCircle2, RefreshCw, X, AlertCircle, Star, Download, ChevronLeft, ChevronRight, Clock, MapPin, User, Check } from 'lucide-react';
import { cn, formatDateFr } from '../../lib/utils';
import { PaymentModal } from './PaymentModal';
import { apiFetch } from '../../lib/api';
import { InvoiceModal } from './InvoiceModal';
import { useDataRefresh } from '../../contexts/DataRefreshContext';
import { useToast } from '../../contexts/ToastContext';
import { RoleGuide } from '../common/RoleGuide';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  residence: Residence;
  onSuccess: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, booking, residence, onSuccess }) => {
  const { addToast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Voulez-vous envoyer cet avis ?")) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiFetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          residenceId: residence.id,
          clientId: booking.clientId,
          rating,
          comment
        })
      });

      if (!response.ok) throw new Error("Failed to submit review");

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'enregistrement de l'avis.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Donnez votre avis</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="p-6 space-y-6"
        >
          <div>
            <p className="text-sm font-bold text-slate-600 mb-4 text-center">Comment s'est passé votre séjour à {residence.title} ?</p>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform active:scale-95"
                >
                  <Star 
                    size={32} 
                    className={cn(
                      "transition-colors",
                      star <= rating ? "text-yellow-500 fill-yellow-500" : "text-slate-200"
                    )} 
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {rating === 5 ? 'Excellent' : rating === 4 ? 'Très Bien' : rating === 3 ? 'Bien' : rating === 2 ? 'Moyen' : 'Déçu'}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Votre commentaire (optionnel)</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white focus:border-red-500 transition-all resize-none"
              rows={4}
              placeholder="Ex: Hôte très accueillant, le forage était un vrai plus pendant les coupures..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : 'Envoyer mon avis'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  residence: Residence;
  onSuccess: () => void;
}

const CancellationModal: React.FC<CancellationModalProps> = ({ isOpen, onClose, booking, residence, onSuccess }) => {
  const { addToast } = useToast();
  const [reason, setReason] = useState('');
  const [refundPhone, setRefundPhone] = useState('');
  const [refundProvider, setRefundProvider] = useState<'orange' | 'moov' | 'telecel' | 'coris'>('orange');
  const [loading, setLoading] = useState(false);

  // Home policy parameters fetched from the owner profile
  const [hostCancellationFee, setHostCancellationFee] = useState<number>(1000);
  const [hostCancellationRulesText, setHostCancellationRulesText] = useState<string>('');

  useEffect(() => {
    let active = true;
    async function fetchHostPolicy() {
      try {
        const response = await apiFetch(`/api/users/${booking.ownerId}`);
        if (response.ok && active) {
          const data = await response.json();
          if (data.hostCancellationFee !== undefined) {
            setHostCancellationFee(Number(data.hostCancellationFee));
          }
          if (data.hostCancellationRulesText !== undefined) {
            setHostCancellationRulesText(data.hostCancellationRulesText);
          }
        }
      } catch (err) {
        console.error("Error loading host cancellation parameters in MyBookings.tsx: ", err);
      }
    }
    if (isOpen) {
      fetchHostPolicy();
    }
    return () => { active = false; };
  }, [booking.ownerId, isOpen]);

  // Helper to calculate nights between two dates
  const getNights = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const totalNights = getNights(booking.checkIn, booking.checkOut);
  
  // Calculate nights spent if checkout logic or stay logic dictates
  const checkInDate = new Date(booking.checkIn);
  const today = new Date();
  checkInDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = today.getTime() - checkInDate.getTime();
  const daysSpent = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const nightsSpent = booking.stayStatus === 'ongoing' 
    ? Math.min(totalNights, Math.max(1, daysSpent)) 
    : 0;

  const isStayStarted = booking.stayStatus === 'ongoing' || nightsSpent > 0;
  
  // Base cost computations
  const totalAmount = booking.totalPrice || 0;
  const isFullyPaid = booking.paymentStatus === 'fully_paid';
  const isAdvancePaid = booking.paymentStatus === 'advance_paid';
  const paidAmount = isFullyPaid ? totalAmount : (isAdvancePaid ? (booking.advancePaid || 0) : 0);

  const pricePerNight = totalAmount / totalNights;
  const costOfNightsSpent = nightsSpent * pricePerNight;

  // Prorated refund engine
  let calculatedRefund = 0;
  let scenarioLabel = "Acompte payé, séjour non commencé";
  let explanationStr = "";

  if (paidAmount > 0) {
    if (isStayStarted) {
      scenarioLabel = "Séjour commencé et interrompu";
      calculatedRefund = Math.max(0, paidAmount - (costOfNightsSpent + hostCancellationFee));
      explanationStr = `Séjour débuté (${nightsSpent} nuit(s) consommée(s)). Votre remboursement est calculé sur le montant versé (${formatCurrency(paidAmount)} F CFA), déduction faite des frais administratifs fixes de l'Hôte (${formatCurrency(hostCancellationFee)} F CFA) et du coût des nuitées déjà consommées (${formatCurrency(costOfNightsSpent)} F CFA).`;
    } else {
      scenarioLabel = "Séjour non commencé";
      calculatedRefund = Math.max(0, paidAmount - hostCancellationFee);
      explanationStr = `Séjour de ${totalNights} nuit(s) non débuté. Vous êtes remboursé du montant versé (${formatCurrency(paidAmount)} F CFA) moins les frais d'annulation fixes de l'Hôte (${formatCurrency(hostCancellationFee)} F CFA).`;
    }
  }

  const refundAmount = paidAmount > 0 ? calculatedRefund : 0;

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      addToast("Veuillez indiquer le motif de votre annulation.", "error");
      return;
    }
    if (paidAmount > 0 && (!refundPhone || refundPhone.trim().length < 8)) {
      addToast("Veuillez entrer un numéro de téléphone Mobile Money burkinabè valide (8 chiffres) pour recevoir votre remboursement.", "error");
      return;
    }

    setLoading(true);
    try {
      await updateBookingStatus(booking.id, {
        bookingStatus: 'cancelled',
        cancelledBy: 'client',
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        refundStatus: paidAmount > 0 ? 'pending' : 'none',
        refundAmount: refundAmount,
        refundPhone: refundPhone ? refundPhone.trim() : '',
        refundProvider: refundProvider,
        hostCancellationFee: hostCancellationFee,
        nightsConsumed: nightsSpent,
        costOfNightsSpent: costOfNightsSpent
      });

      // Send host notification
      await sendNotification({
        userId: booking.ownerId,
        title: "Séjour Annulé par le Voyageur ❌",
        message: `La réservation pour ${residence.title} (${scenarioLabel}) a été annulée. Motif : ${reason}. Remboursement calculé automatiquement : ${formatCurrency(refundAmount)} F CFA.`,
        type: 'booking'
      });

      // Send client notification
      await sendNotification({
        userId: booking.clientId,
        title: "Séjour Annulé avec succès ❌",
        message: paidAmount > 0 
          ? `Votre séjour chez ${residence.title} a été annulé (${scenarioLabel}). Un remboursement de ${formatCurrency(refundAmount)} F CFA est en cours vers votre compte Mobile Money.`
          : `Votre réservation pour ${residence.title} a été annulée de manière immédiate (aucun paiement n'avait été effectué).`,
        type: 'booking'
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      addToast("Une erreur est survenue lors de l'annulation de la réservation.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-150 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight">Annuler ma réservation</h3>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">Traitement de l'annulation et du remboursement</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCancelSubmit} className="p-6 space-y-5">
          {paidAmount > 0 ? (
            <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-3">
              <span className="text-[10px] font-black uppercase text-orange-900 tracking-wider block">🛡️ Charte de Remboursement Faso</span>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-orange-100 pb-1.5">
                  <span className="text-[10px] font-bold text-orange-800 uppercase">Scénario détecté</span>
                  <span className="bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {booking.stayStatus === 'ongoing' ? 'Interruption' : isFullyPaid ? 'Soldé' : 'Acompte seul'}
                  </span>
                </div>
                
                <p className="text-xs text-orange-850 leading-relaxed font-semibold">
                  {explanationStr}
                </p>

                <div className="mt-2 pt-2 border-t border-orange-150/50 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total déjà réglé :</span>
                    <span className="font-bold">{formatCurrency(paidAmount)} F CFA</span>
                  </div>
                  {nightsSpent > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Nuits consommées ({nightsSpent}/{totalNights}) :</span>
                      <span className="font-bold">-{formatCurrency(costOfNightsSpent)} F CFA</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Frais administratifs fixes retenus :</span>
                    <span className="font-bold text-red-600">-{formatCurrency(hostCancellationFee)} F CFA</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-extrabold border-t border-dashed border-orange-200 pt-1.5 text-sm">
                    <span className="text-orange-950">Remboursement Net transféré :</span>
                    <span className="text-orange-950 underline">{formatCurrency(refundAmount)} F CFA</span>
                  </div>
                </div>
              </div>

              {hostCancellationRulesText && (
                <div className="mt-2.5 p-2 bg-white/80 border border-orange-100 rounded-xl">
                  <span className="text-[9px] font-black text-orange-800 uppercase tracking-widest block mb-1">📝 Conditions spécifiques de l'Hôte :</span>
                  <p className="text-[10px] text-slate-600 italic leading-snug">{hostCancellationRulesText}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <p className="text-xs text-slate-500 leading-normal font-medium">
                Cette réservation n'ayant pas encore fait l'objet d'un paiement d'acompte, l'annulation est immédiate et sans aucuns frais retenus.
              </p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motif d'annulation *</label>
            <textarea
              required
              rows={3}
              placeholder="Expliquez brièvement les raisons de votre annulation (Ex: Changement de plan de voyage...)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:bg-white focus:border-red-500 transition-all resize-none"
            />
          </div>

          {paidAmount > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Opérateur de Remboursement</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'orange', label: 'Orange' },
                    { id: 'moov', label: 'Moov' },
                    { id: 'telecel', label: 'Telecel' },
                    { id: 'coris', label: 'Coris' }
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setRefundProvider(prov.id as any)}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col items-center justify-center bg-white transition-all cursor-pointer text-xs font-bold",
                        refundProvider === prov.id 
                          ? "border-red-510 border-red-500 text-red-600 shadow-sm ring-2 ring-red-500/10 scale-105" 
                          : "border-slate-200 hover:bg-slate-50 text-slate-650"
                      )}
                    >
                      {prov.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Numéro de téléphone de Remboursement</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 70000000"
                  value={refundPhone}
                  onChange={(e) => setRefundPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-650 bg-red-650 bg-red-600 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-50 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : 'CONFIRMER L\'ANNULATION'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

interface SuiviReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  residence: Residence;
}

const SuiviReservationModal: React.FC<SuiviReservationModalProps> = ({ isOpen, onClose, booking, residence }) => {
  if (!isOpen) return null;

  const getNights = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const totalNights = getNights(booking.checkIn, booking.checkOut);

  // Define booking timeline steps
  const steps = [
    {
      id: 'creation',
      label: 'Demande créée',
      description: 'Votre demande de séjour a été enregistrée avec succès sur ResiFaso.',
      date: formatDateFr(booking.createdAt),
      status: 'completed', // always completed if booking exists
    },
    {
      id: 'validation',
      label: "Validation par l'hôte",
      description: booking.bookingStatus === 'cancelled' 
        ? 'La réservation a été annulée.' 
        : booking.bookingStatus === 'pending'
          ? "L'hôte examine actuellement votre demande."
          : 'Votre réservation a été acceptée et confirmée par l\'hôte.',
      date: booking.bookingStatus !== 'pending' && booking.createdAt ? formatDateFr(booking.createdAt) : undefined, // fallback date
      status: booking.bookingStatus === 'cancelled' 
        ? 'cancelled' 
        : booking.bookingStatus === 'pending' 
          ? 'current' 
          : 'completed',
    },
    {
      id: 'payment',
      label: "Paiement de l'acompte (30%)",
      description: booking.paymentStatus === 'pending'
        ? "Versez l'acompte requis de 30% pour verrouiller définitivement vos dates."
        : booking.paymentStatus === 'advance_paid' || booking.paymentStatus === 'fully_paid'
          ? `Acompte de ${formatCurrency(booking.advancePaid)} F CFA reçu par l'hôte.`
          : "Paiement en attente.",
      date: (booking.paymentStatus === 'advance_paid' || booking.paymentStatus === 'fully_paid') ? formatDateFr(booking.createdAt) : undefined,
      status: (booking.paymentStatus === 'advance_paid' || booking.paymentStatus === 'fully_paid')
        ? 'completed'
        : booking.bookingStatus === 'confirmed'
          ? 'current'
          : 'pending',
    },
    {
      id: 'checkin',
      label: "Arrivée & Remise des clés",
      description: booking.stayStatus === 'completed' || booking.stayStatus === 'ongoing'
        ? "Vous êtes installé dans la résidence. Bienvenue !"
        : `Présentez-vous le ${formatDateFr(booking.checkIn)} pour la remise des clés et réglez le solde restant.`,
      date: booking.checkedInAt ? formatDateFr(booking.checkedInAt) : undefined,
      status: booking.stayStatus === 'completed' || booking.stayStatus === 'ongoing'
        ? 'completed'
        : (booking.paymentStatus === 'advance_paid' || booking.paymentStatus === 'fully_paid') && booking.bookingStatus === 'confirmed'
          ? 'current'
          : 'pending',
    },
    {
      id: 'checkout',
      label: "Départ & Libération",
      description: booking.stayStatus === 'completed'
        ? "Votre séjour est terminé. Merci pour votre confiance !"
        : `Libération de la résidence prévue le ${formatDateFr(booking.checkOut)}.`,
      date: booking.checkedOutAt ? formatDateFr(booking.checkedOutAt) : undefined,
      status: booking.stayStatus === 'completed'
        ? 'completed'
        : booking.stayStatus === 'ongoing'
          ? 'current'
          : 'pending',
    },
  ];

  const totalPaid = booking.paymentStatus === 'fully_paid' 
    ? booking.totalPrice 
    : (booking.paymentStatus === 'advance_paid' ? booking.advancePaid : 0);

  const remainingToPay = booking.paymentStatus === 'fully_paid' 
    ? 0 
    : (booking.paymentStatus === 'advance_paid' ? (booking.totalPrice - booking.advancePaid) : booking.totalPrice);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">Suivi & Détails du Séjour</span>
            <h3 className="text-xl font-black tracking-tight">{residence.title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          {/* Tracking Timeline */}
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock size={16} className="text-red-600" />
              État d'avancement du séjour
            </h4>

            <div className="relative pl-8 space-y-6">
              {/* Timeline continuous line */}
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>

              {steps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';
                const isCancelled = step.status === 'cancelled';

                return (
                  <div key={step.id} className="relative">
                    {/* Circle Indicator */}
                    <div className={cn(
                      "absolute -left-8 top-1 w-7.5 h-7.5 rounded-full flex items-center justify-center border-2 transition-all",
                      isCompleted 
                        ? "bg-green-500 border-green-500 text-white" 
                        : isCurrent 
                          ? "bg-amber-500 border-amber-500 text-white animate-pulse"
                          : isCancelled
                            ? "bg-red-500 border-red-500 text-white"
                            : "bg-white border-slate-200 text-slate-400"
                    )}>
                      {isCompleted ? (
                        <Check size={14} className="stroke-[3]" />
                      ) : isCancelled ? (
                        <X size={14} className="stroke-[3]" />
                      ) : (
                        <span className="text-xs font-black">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step details */}
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn(
                          "text-sm font-black",
                          isCompleted ? "text-slate-900" : isCurrent ? "text-amber-600" : isCancelled ? "text-red-600" : "text-slate-400"
                        )}>
                          {step.label}
                        </span>
                        {step.date && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {step.date}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs mt-1 leading-relaxed",
                        isCompleted || isCurrent ? "text-slate-600 font-medium" : "text-slate-400 font-normal"
                      )}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Core Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <MapPin size={12} className="text-red-500" />
                Hébergement
              </h5>
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-800">{residence.title}</p>
                <p className="text-slate-500 font-medium">{residence.type === 'chambre' ? 'Chambre' : residence.type === 'appartement' ? 'Appartement' : residence.type === 'villa' ? 'Villa' : 'Auberge'}</p>
                <p className="text-slate-500 font-medium">
                  Secteur {residence.address?.neighborhood || residence.neighborhood}, {residence.address?.city || residence.city}
                </p>
                {residence.ownerName && (
                  <p className="text-slate-600 font-bold mt-2 pt-2 border-t border-slate-200/50 flex items-center gap-1">
                    <User size={12} className="text-slate-400" />
                    Hôte: <span className="text-slate-900">{residence.ownerName}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Calendar size={12} className="text-red-500" />
                Détails du Séjour
              </h5>
              <div className="space-y-2 text-xs font-medium text-slate-600">
                <p>Du <strong className="text-slate-800 font-bold">{formatDateFr(booking.checkIn)}</strong></p>
                <p>Au <strong className="text-slate-800 font-bold">{formatDateFr(booking.checkOut)}</strong></p>
                <p className="pt-2 border-t border-slate-200/50">Durée : <strong className="text-slate-800 font-bold">{totalNights} nuit(s)</strong></p>
                <p>Voyageurs : <strong className="text-slate-800 font-bold">{booking.guests} personne(s)</strong></p>
              </div>
            </div>
          </div>

          {/* Pricing Harmonization Details */}
          <div className="bg-red-50/30 border border-red-100/50 p-6 rounded-2xl space-y-4">
            <h5 className="text-xs font-black text-red-800 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={14} />
              Détails Financiers & Paiements
            </h5>

            <div className="divide-y divide-red-100/40 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Tarif de la résidence</span>
                <span className="font-black text-slate-800">{formatCurrency(residence.pricePerNight)} F CFA / nuit</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Montant Total du Séjour</span>
                <span className="font-black text-slate-950 text-sm">{formatCurrency(booking.totalPrice)} F CFA</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Acompte Payé (30%)</span>
                <span className="font-black text-green-600">{formatCurrency(totalPaid)} F CFA</span>
              </div>
              <div className="py-2.5 flex justify-between items-center bg-red-100/10 px-2 -mx-2 rounded-lg">
                <span className="text-red-800 font-bold">Reste à payer (à l'arrivée)</span>
                <span className="font-black text-red-600 text-sm">{formatCurrency(remainingToPay)} F CFA</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 leading-relaxed font-medium bg-white p-3 rounded-xl border border-slate-100">
              💡 <strong>Rappel crucial :</strong> L'acompte de 30% a été versé et sécurisé en ligne. Le solde restant de <strong>{formatCurrency(remainingToPay)} F CFA</strong> est à régler directement à l'hôte lors de la remise des clés de la résidence (en espèces ou par Mobile Money local).
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-850 transition-colors cursor-pointer"
          >
            Fermer le suivi
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const MyBookings: React.FC<{ onContactHost: (ownerId: string, resId: string) => void, isTestMode?: boolean }> = ({ onContactHost, isTestMode }) => {
  const { user } = useAuth();
  const { lastRefresh } = useDataRefresh();
  const { addToast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Reset pagination on list updates
  useEffect(() => {
    setCurrentPage(1);
  }, [bookings.length]);
  const [residencesMap, setResidencesMap] = useState<Record<string, Residence>>({});
  const [loading, setLoading] = useState(true);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<Booking | null>(null);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);

  // Load residences map from MOCK and Firestore
  useEffect(() => {
    const handleOpenBooking = (e: Event) => {
      const customEvent = e as CustomEvent;
      const bookingId = customEvent.detail;
      const targetElement = document.getElementById(`booking-card-${bookingId}`);
      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetElement.classList.add('ring-4', 'ring-red-500', 'ring-opacity-50');
          setTimeout(() => {
            targetElement.classList.remove('ring-4', 'ring-red-500', 'ring-opacity-50');
          }, 3000);
        }, 100);
      }
    };

    window.addEventListener('openBookingDetails', handleOpenBooking);
    return () => window.removeEventListener('openBookingDetails', handleOpenBooking);
  }, []);

  // Load residences map
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dbType = await getBackendDbType();
        const rMap: Record<string, Residence> = {};
        MOCK_RESIDENCES.forEach(res => {
          rMap[res.id] = res;
        });

        // SQL / API
                    const list = await getAllResidences();
                    list.forEach(res => {
                      rMap[res.id] = res;
                    });
                    setResidencesMap({ ...rMap });
      } catch (err) {
        console.error("Error loading residences map:", err);
      }
    };
    fetchData();
  }, []);

  // Fetch guest's bookings
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      const isInitial = bookings.length === 0;
      if (isInitial) setLoading(true);
      try {
        const dbType = await getBackendDbType();
        // SQL / API
                    const list = await getClientBookings(user.uid);
                    const sortedList = (list || []).sort((a, b) => 
                      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                    );
                    setBookings(sortedList);
      } catch (err) {
        console.error("Error fetching bookings:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchBookings();
  }, [user, lastRefresh]);

  const calculateDaysLeft = (checkInStr: string) => {
    const diff = new Date(checkInStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getStatusBadge = (bStatus: string, pStatus: string, bookingObj?: any) => {
    switch (bStatus) {
      case 'pending':
        return <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider">En Attente d'Approbation</span>;
      case 'confirmed':
        if (pStatus === 'advance_paid') {
          const rest = bookingObj ? (bookingObj.totalPrice - bookingObj.advancePaid) : 0;
          return <span className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider">Paiement partiel – Solde restant : {formatCurrency(rest > 0 ? rest : 0)} F CFA</span>;
        } else if (pStatus === 'fully_paid') {
          return <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider">Séjour Validé (Entièrement Payé)</span>;
        } else {
          return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">Approuvée, En Attente d'Avance</span>;
        }
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider">Annulée</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">Terminée</span>;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Accès à vos réservations</h2>
        <p className="text-slate-500 font-bold text-sm">Veuillez vous connecter pour consulter vos réservations.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw size={40} className="text-red-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold text-sm">Chargement de vos réservations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <RoleGuide role="client" isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Mes Réservations</h2>
          <p className="text-slate-500 text-sm font-medium">Consultez, payez vos avances et discutez en direct avec vos hôtes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <Compass size={16} className="text-red-600 animate-pulse" />
            Guide de Prise en Main
          </button>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-6">
            <Compass size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Aucun voyage pour le moment</h3>
          <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">Explorez notre catalogue de résidences d'exception à Ouagadougou, Bobo-Dioulasso et Koudougou.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg shadow-red-50"
          >
            Commencez mes recherches
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bookings.slice((currentPage - 1) * 50, currentPage * 50).map((booking) => {
            const res = residencesMap[booking.residenceId];
            if (!res) return null;

            return (
              <motion.div 
                id={`booking-card-${booking.id}`}
                key={booking.id}
                whileHover={{ y: -2 }}
                className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm flex flex-col md:flex-row p-6 gap-6 relative group"
              >
                {/* Residence Image */}
                <div className="w-full md:w-56 aspect-[4/3] rounded-2xl overflow-hidden shrink-0 shadow-sm relative">
                  <img 
                    src={res.images?.[0] || 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800'} 
                    alt={res.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 px-2 py-0.5 rounded text-[9px] font-black uppercase text-slate-800">
                    {res.type}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      {getStatusBadge(booking.bookingStatus, booking.paymentStatus, booking)}
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {booking.id.slice(0, 8)}</span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mb-2 leading-none group-hover:text-red-600 transition-colors">
                      {res.title}
                    </h3>
                    
                    <p className="text-xs text-slate-400 font-bold mb-1">
                      {res.address?.street || res.street}, {res.address?.neighborhood || res.neighborhood}, {res.address?.city || res.city}
                    </p>
                    
                    {res.ownerName && (
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4 border-l-2 border-red-500 pl-2 py-0.5">
                        Hôte: <span className="text-slate-600">{res.ownerName}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-600 text-xs">
                      <div>Du <strong className="text-slate-900 font-bold">{formatDateFr(booking.checkIn)}</strong> au <strong className="text-slate-900 font-bold">{formatDateFr(booking.checkOut)}</strong></div>
                      <div className="w-1 h-1 bg-slate-300 rounded-full self-center hidden md:block"></div>
                      <div>Voyageurs : <strong className="text-slate-900 font-bold">{booking.guests} pers.</strong></div>
                    </div>

                    {booking.bookingStatus === 'cancelled' && (
                      <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200/60 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-red-700 font-black text-xs uppercase tracking-wide">
                          <span>❌ Séjour Annulé</span>
                          <span className="normal-case font-bold text-red-600">(par {booking.cancelledBy === 'client' ? 'vous-même' : booking.cancelledBy === 'owner' ? "l'hôte" : "l'administration"})</span>
                        </div>
                        {booking.cancellationReason && (
                          <p className="text-xs text-slate-700 font-bold">
                            Motif : <span className="italic font-medium text-slate-605 text-slate-500">"{booking.cancellationReason}"</span>
                          </p>
                        )}
                        {booking.refundStatus && booking.refundStatus !== 'none' && (
                          <div className="pt-2 border-t border-red-100 space-y-2">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Suivi de Remboursement & Politique</span>
                            
                            {/* Breakdown summary */}
                            <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100/50 space-y-1">
                               <p className="text-[10px] text-red-800 font-bold leading-tight">
                                 💰 {booking.refundAmount > 0 
                                   ? `Remboursement de ${formatCurrency(booking.refundAmount)} F CFA calculé selon la politique d'annulation.`
                                   : "Aucun remboursement applicable selon la politique d'annulation."}
                               </p>
                               <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] text-slate-500 font-medium italic">
                                 {(booking.hostCancellationFee !== undefined || booking.refundAmount !== undefined) && (
                                   <p>• Frais administratifs : <span className="text-red-600">-{formatCurrency(booking.hostCancellationFee || 0)} F</span></p>
                                 )}
                                 {booking.nightsConsumed !== undefined && booking.nightsConsumed > 0 && (
                                   <p>• Nuitées consommées : <span className="text-red-600">-{formatCurrency(booking.costOfNightsSpent || 0)} F</span></p>
                                 )}
                               </div>
                            </div>

                            {booking.refundStatus === 'pending' && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-bold bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 w-fit">
                                <span className="animate-pulse">⏳</span>
                                <span>Remboursement de {formatCurrency(booking.refundAmount)} F CFA en cours via {booking.refundProvider?.toUpperCase()} (+226 {booking.refundPhone})</span>
                              </div>
                            )}
                            {booking.refundStatus === 'refunded' && (
                              <div className="flex items-center gap-1.5 text-xs text-green-700 font-bold bg-green-50 px-3 py-2 rounded-xl border border-green-200 w-fit">
                                <span>✅</span>
                                <span>Remboursement de {formatCurrency(booking.refundAmount)} F CFA crédité le {booking.refundProcessedAt ? formatDateFr(booking.refundProcessedAt) : ''} via {booking.refundProvider?.toUpperCase()} (+226 {booking.refundPhone})</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-50">
                    {/* Price structure */}
                    <div className="grid grid-cols-2 md:flex md:flex-wrap gap-x-6 gap-y-4">
                      <div>
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Nuitée Résidence</span>
                        <span className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(res.pricePerNight)} F CFA</span>
                      </div>
                      <div className="border-l border-slate-100 pl-4">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Montant Total</span>
                        <span className="text-sm font-black text-slate-950 tracking-tight">{formatCurrency(booking.totalPrice)} F CFA</span>
                      </div>
                      <div className="border-l border-slate-100 pl-4">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Acompte Payé</span>
                        <span className="text-sm font-black text-green-600 tracking-tight">
                          {booking.paymentStatus === 'fully_paid' || booking.paymentStatus === 'advance_paid' 
                            ? `${formatCurrency(booking.advancePaid)} F CFA` 
                            : '0 F CFA'}
                        </span>
                      </div>
                      <div className="border-l border-slate-100 pl-4">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Reste à Payer</span>
                        <span className="text-sm font-black text-red-650 text-red-650 text-red-600 tracking-tight">
                          {booking.paymentStatus === 'fully_paid' 
                            ? '0 F CFA' 
                            : `${formatCurrency(booking.totalPrice - (booking.paymentStatus === 'advance_paid' ? booking.advancePaid : 0))} F CFA`}
                        </span>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedBookingForDetail(booking)}
                        className="px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock size={14} className="text-red-600" />
                        Détails & Suivi
                      </button>

                      <button 
                        onClick={() => onContactHost(booking.ownerId, booking.residenceId)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare size={14} className="text-red-600" />
                        Discuter avec l'hôte
                      </button>

                      {booking.bookingStatus === 'completed' && (
                        <button 
                          onClick={() => setSelectedBookingForReview(booking)}
                          className="px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl font-bold text-xs text-yellow-700 hover:bg-yellow-100 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Star size={14} className="fill-yellow-500 text-yellow-500" />
                          Laisser un avis
                        </button>
                      )}

                      {booking.bookingStatus === 'confirmed' && booking.paymentStatus === 'pending' && (
                        <button 
                          onClick={() => setSelectedBookingForPayment(booking)}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md shadow-red-50 flex items-center gap-2 animate-pulse"
                        >
                          <CreditCard size={14} />
                          Payer l'Avance
                        </button>
                      )}

                      {booking.paymentStatus === 'advance_paid' && booking.bookingStatus === 'confirmed' && (
                        <button 
                          onClick={() => setSelectedBookingForPayment(booking)}
                          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-md shadow-green-50 flex items-center gap-2"
                        >
                          <CreditCard size={14} />
                          Solder le séjour
                        </button>
                      )}

                      {(booking.paymentStatus === 'advance_paid' || booking.paymentStatus === 'fully_paid') && booking.bookingStatus !== 'cancelled' && (
                        <button 
                          onClick={() => setSelectedBookingForInvoice(booking)}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2"
                        >
                          <Download size={14} />
                          Télécharger Reçu
                        </button>
                      )}

                      {(booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed') && (
                        <button 
                          onClick={() => setSelectedBookingForCancel(booking)}
                          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <X size={14} className="text-red-650" />
                          Annuler Séjour
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Pagination UI */}
          {bookings.length > 50 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-6 px-2 mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                  >
                    Précédent
                  </button>
                  <button
                    disabled={currentPage === Math.ceil(bookings.length / 50)}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, Math.ceil(bookings.length / 50)));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                  >
                    Suivant
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-bold">
                      Affichage de <span className="font-extrabold text-slate-800">{Math.min((currentPage - 1) * 50 + 1, bookings.length)}</span> à{' '}
                      <span className="font-extrabold text-slate-800">{Math.min(currentPage * 50, bookings.length)}</span> sur{' '}
                      <span className="font-extrabold text-slate-800">{bookings.length}</span> réservations
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => {
                          setCurrentPage(prev => Math.max(prev - 1, 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      {Array.from({ length: Math.ceil(bookings.length / 50) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={cn(
                            "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                            currentPage === p
                              ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                          )}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        disabled={currentPage === Math.ceil(bookings.length / 50)}
                        onClick={() => {
                          setCurrentPage(prev => Math.min(prev + 1, Math.ceil(bookings.length / 50)));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      <AnimatePresence>
        {selectedBookingForPayment && (
          <PaymentModal 
            isOpen={!!selectedBookingForPayment}
            onClose={() => setSelectedBookingForPayment(null)}
            amount={selectedBookingForPayment.paymentStatus === 'advance_paid' ? (selectedBookingForPayment.totalPrice - selectedBookingForPayment.advancePaid) : selectedBookingForPayment.advancePaid}
            residenceTitle={residencesMap[selectedBookingForPayment.residenceId]?.title || "Hébergement"}
            isTestMode={isTestMode}
            onSuccess={async () => {
              try {
                const isFinalPayment = selectedBookingForPayment.paymentStatus === 'advance_paid';
                
                await updateBookingStatus(selectedBookingForPayment.id, {
                  paymentStatus: isFinalPayment ? 'fully_paid' : 'advance_paid'
                });
                
                await sendNotification({
                  userId: selectedBookingForPayment.ownerId,
                  title: isFinalPayment ? "Séjour Solder ! 💰" : "Acompte Reçu ! 💰",
                  message: `La résidence ${residencesMap[selectedBookingForPayment.residenceId]?.title} a reçu un paiement de ${formatCurrency(isFinalPayment ? (selectedBookingForPayment.totalPrice - selectedBookingForPayment.advancePaid) : selectedBookingForPayment.advancePaid)} F CFA.`,
                  type: 'payment'
                });

                addToast(isFinalPayment ? 'Félicitations ! Votre séjour est entièrement payé.' : 'Paiement de l\'avance enregistré avec succès ! Votre réservation est validée.', "error");
                setSelectedBookingForPayment(null);
              } catch (err) {
                console.error(err);
                addToast('Erreur lors de la validation du paiement.', "error");
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBookingForReview && residencesMap[selectedBookingForReview.residenceId] && (
          <ReviewModal
            isOpen={!!selectedBookingForReview}
            onClose={() => setSelectedBookingForReview(null)}
            booking={selectedBookingForReview}
            residence={residencesMap[selectedBookingForReview.residenceId]}
            onSuccess={() => {
              addToast("Merci pour votre avis !", "error");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBookingForCancel && residencesMap[selectedBookingForCancel.residenceId] && (
          <CancellationModal
            isOpen={!!selectedBookingForCancel}
            onClose={() => setSelectedBookingForCancel(null)}
            booking={selectedBookingForCancel}
            residence={residencesMap[selectedBookingForCancel.residenceId]}
            onSuccess={() => {
              addToast("Réservation annulée avec succès et demande de remboursement enregistrée !", "error");
              setSelectedBookingForCancel(null);
            }}
          />
        )}
      </AnimatePresence>

      <InvoiceModal
        isOpen={!!selectedBookingForInvoice}
        onClose={() => setSelectedBookingForInvoice(null)}
        booking={selectedBookingForInvoice}
        residence={selectedBookingForInvoice ? residencesMap[selectedBookingForInvoice.residenceId] : null}
        clientName={user?.displayName || user?.email || undefined}
      />

      <AnimatePresence>
        {selectedBookingForDetail && residencesMap[selectedBookingForDetail.residenceId] && (
          <SuiviReservationModal
            isOpen={!!selectedBookingForDetail}
            onClose={() => setSelectedBookingForDetail(null)}
            booking={selectedBookingForDetail}
            residence={residencesMap[selectedBookingForDetail.residenceId]}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
