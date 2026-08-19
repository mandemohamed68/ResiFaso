import { formatCurrency } from '../../utils/currency';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getClientBookings, updateBookingStatus, sendNotification, getBackendDbType, getAllResidences } from '../../lib/db';
import { Booking, Residence } from '../../types';
import { MOCK_RESIDENCES } from '../../mockData';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CreditCard, MessageSquare, Compass, Send, CheckCircle2, RefreshCw, X, AlertCircle, Star, Download, ChevronLeft, ChevronRight, Clock, MapPin, User, Check, Building2, Copy, CalendarDays, ShieldCheck } from 'lucide-react';
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
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 pb-10 overflow-y-auto">
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
        className="relative w-full max-w-md my-auto sm:my-0 bg-white rounded-3xl shadow-2xl overflow-hidden"
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
      explanationStr = `Séjour débuté (${nightsSpent} nuit(s) consommée(s)). Votre remboursement est calculé sur le montant versé (${formatCurrency(paidAmount)} F CFA), déduction faite des frais administratifs fixes de l'Hôte (${formatCurrency(hostCancellationFee)} F CFA), du coût des nuitées déjà consommées (${formatCurrency(costOfNightsSpent)} F CFA), et des frais de service de la plateforme (non remboursables).`;
    } else {
      scenarioLabel = "Séjour non commencé";
      calculatedRefund = Math.max(0, paidAmount - hostCancellationFee);
      explanationStr = `Séjour de ${totalNights} nuit(s) non débuté. Vous êtes remboursé du montant versé (${formatCurrency(paidAmount)} F CFA) moins les frais d'annulation fixes de l'Hôte (${formatCurrency(hostCancellationFee)} F CFA) et les frais de service de la plateforme (non remboursables).`;
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
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 pb-10 overflow-y-auto">
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
        className="relative w-full max-w-lg my-auto sm:my-0 bg-white rounded-3xl shadow-2xl overflow-hidden"
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
                    { id: 'orange', label: 'Orange Money' },
                    { id: 'moov', label: 'Moov Money' },
                    { id: 'telecel', label: 'Telecel Money' },
                    { id: 'coris', label: 'Coris Money' }
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
      label: booking.paymentStatus === 'fully_paid'
        ? "Paiement Intégral (100%)"
        : booking.paymentStatus === 'advance_paid'
          ? `Paiement de l'acompte (${(booking.totalPrice > 0 && booking.advancePaid > 0) ? Math.round((booking.advancePaid / booking.totalPrice) * 100) : 30}%)`
          : "Paiement de l'acompte",
      description: booking.paymentStatus === 'pending'
        ? "En attente de paiement. Versez l'acompte requis pour verrouiller définitivement vos dates."
        : booking.paymentStatus === 'fully_paid'
          ? `Totalité du séjour (${formatCurrency(booking.totalPrice)} F CFA) réglée et sécurisée.`
          : `Acompte de ${formatCurrency(booking.advancePaid)} F CFA (${(booking.totalPrice > 0 && booking.advancePaid > 0) ? Math.round((booking.advancePaid / booking.totalPrice) * 100) : 30}%) reçu et sécurisé par l'hôte.`,
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 pb-10 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl border border-slate-200 flex flex-col max-h-[88vh] my-auto sm:my-0"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Suivi & Détails du Séjour</span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{residence.title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Tracking Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock size={15} className="text-slate-600" />
              État d'avancement du séjour
            </h4>

            <div className="relative pl-7 space-y-5">
              {/* Timeline continuous line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200"></div>

              {steps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';
                const isCancelled = step.status === 'cancelled';

                return (
                  <div key={step.id} className="relative">
                    {/* Circle Indicator */}
                    <div className={cn(
                      "absolute -left-7 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border text-xs transition-all",
                      isCompleted 
                        ? "bg-emerald-600 border-emerald-600 text-white" 
                        : isCurrent 
                          ? "bg-amber-600 border-amber-600 text-white"
                          : isCancelled
                            ? "bg-rose-600 border-rose-600 text-white"
                            : "bg-white border-slate-300 text-slate-400"
                    )}>
                      {isCompleted ? (
                        <Check size={12} className="stroke-[2.5]" />
                      ) : isCancelled ? (
                        <X size={12} className="stroke-[2.5]" />
                      ) : (
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step details */}
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn(
                          "text-xs font-bold",
                          isCompleted ? "text-slate-900" : isCurrent ? "text-amber-800" : isCancelled ? "text-rose-800" : "text-slate-500"
                        )}>
                          {step.label}
                        </span>
                        {step.date && (
                          <span className="text-[10px] font-medium text-slate-400">
                            {step.date}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs mt-0.5 leading-relaxed",
                        isCompleted || isCurrent ? "text-slate-600 font-normal" : "text-slate-400 font-normal"
                      )}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Core Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-500" />
                Hébergement
              </h5>
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-800">{residence.title}</p>
                <p className="text-slate-500">{residence.type === 'chambre' ? 'Chambre' : residence.type === 'appartement' ? 'Appartement' : residence.type === 'villa' ? 'Villa' : 'Auberge'}</p>
                <p className="text-slate-500">
                  Secteur {residence.address?.neighborhood || residence.neighborhood}, {residence.address?.city || residence.city}
                </p>
                {residence.ownerName && (
                  <p className="text-slate-700 font-semibold mt-2 pt-2 border-t border-slate-200 flex items-center gap-1">
                    <User size={12} className="text-slate-400" />
                    Hôte: <span className="text-slate-900">{residence.ownerName}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar size={12} className="text-slate-500" />
                Détails du Séjour
              </h5>
              <div className="space-y-1.5 text-xs text-slate-600">
                <p>Du <strong className="text-slate-800 font-bold">{formatDateFr(booking.checkIn)}</strong></p>
                <p>Au <strong className="text-slate-800 font-bold">{formatDateFr(booking.checkOut)}</strong></p>
                <p className="pt-1.5 border-t border-slate-200">Durée : <strong className="text-slate-800 font-bold">{totalNights} nuit(s)</strong></p>
                <p>Voyageurs : <strong className="text-slate-800 font-bold">{booking.guests} personne(s)</strong></p>
              </div>
            </div>
          </div>

          {/* Pricing Harmonization Details */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={13} className="text-slate-600" />
              Détails Financiers & Paiements
            </h5>

            <div className="divide-y divide-slate-200 text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Tarif de la résidence</span>
                <span className="font-bold text-slate-800">{formatCurrency(residence.pricePerNight)} F CFA / nuit</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Montant Total du Séjour</span>
                <span className="font-bold text-slate-900">{formatCurrency(booking.totalPrice)} F CFA</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">
                  {booking.paymentStatus === 'fully_paid' 
                    ? 'Total Payé (100%)' 
                    : booking.paymentStatus === 'advance_paid'
                      ? `Acompte Payé (${(booking.totalPrice > 0 && booking.advancePaid > 0) ? Math.round((booking.advancePaid / booking.totalPrice) * 100) : 30}%)`
                      : 'Acompte Payé (En attente)'}
                </span>
                <span className={cn("font-bold", totalPaid > 0 ? "text-emerald-700" : "text-amber-700")}>
                  {formatCurrency(totalPaid)} F CFA
                </span>
              </div>
              <div className="py-2 flex justify-between items-center bg-white px-2.5 rounded border border-slate-200">
                <span className="text-slate-800 font-semibold">Reste à payer (à l'arrivée)</span>
                <span className="font-bold text-slate-900">{formatCurrency(remainingToPay)} F CFA</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
              {booking.paymentStatus === 'pending' ? (
                <p>
                  <strong>Rappel de paiement :</strong> L'acompte est en attente de versement. Effectuez le paiement de l'acompte requis en ligne pour bloquer vos dates. Le solde de <strong>{formatCurrency(remainingToPay)} F CFA</strong> sera réglé directement à l'hôte à l'arrivée.
                </p>
              ) : booking.paymentStatus === 'advance_paid' ? (
                <p>
                  <strong>Rappel :</strong> L'acompte de <strong>{formatCurrency(booking.advancePaid)} F CFA ({(booking.totalPrice > 0 && booking.advancePaid > 0) ? Math.round((booking.advancePaid / booking.totalPrice) * 100) : 30}%)</strong> a été versé et sécurisé en ligne. Le solde restant de <strong>{formatCurrency(remainingToPay)} F CFA</strong> est à régler directement à l'hôte lors de la remise des clés de la résidence.
                </p>
              ) : (
                <p>
                  <strong>Rappel :</strong> La totalité de votre séjour (<strong>{formatCurrency(booking.totalPrice)} F CFA</strong>) a été réglée et sécurisée en ligne. Aucun solde supplémentaire n'est dû à l'arrivée.
                </p>
              )}
              <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                Politique d'annulation : toute demande d'annulation est soumise aux conditions de l'hôte.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-colors cursor-pointer"
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
  const { lastRefresh, refreshData } = useDataRefresh();
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
                    const sortedList = (list || [])
                      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                      .slice(0, 10);
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
    const todayStr = new Date().toISOString().split('T')[0];
    const checkInStr = bookingObj?.checkIn ? String(bookingObj.checkIn).split('T')[0] : '';
    const checkOutStr = bookingObj?.checkOut ? String(bookingObj.checkOut).split('T')[0] : '';

    const isCheckInPast = checkInStr ? checkInStr < todayStr : false;
    const isCheckOutPast = checkOutStr ? checkOutStr < todayStr : false;

    if (bStatus === 'pending' && (isCheckInPast || isCheckOutPast)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-xs font-bold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Demande expirée
        </span>
      );
    }

    if (bStatus === 'completed' || (isCheckOutPast && (bStatus === 'confirmed' || pStatus === 'fully_paid' || pStatus === 'advance_paid'))) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Séjour terminé
        </span>
      );
    }

    switch (bStatus) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            En attente d'approbation
          </span>
        );
      case 'confirmed':
        const isFullyPaidObj = pStatus === 'fully_paid' || (pStatus === 'advance_paid' && bookingObj && bookingObj.advancePaid >= bookingObj.totalPrice);
        if (isFullyPaidObj) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Séjour confirmé (Payé)
            </span>
          );
        } else if (pStatus === 'advance_paid') {
          const rest = bookingObj ? (bookingObj.totalPrice - bookingObj.advancePaid) : 0;
          if (rest <= 0) {
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Séjour confirmé (Payé)
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-xs font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Acompte payé • Reste : {formatCurrency(rest)} F CFA
            </span>
          );
        } else {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Approuvée • En attente d'acompte
            </span>
          );
        }
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-xs font-bold shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Réservation annulée
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Séjour terminé
          </span>
        );
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              Mes Réservations
            </h2>
            {bookings.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold">
                {bookings.length}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Suivez l'état d'approbation, les acomptes réglés et la logistique de vos séjours.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-extrabold uppercase tracking-wider rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Compass size={15} className="text-red-600 animate-pulse" />
            <span>Guide Voyageur</span>
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200/70 rounded-3xl p-10 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-center text-slate-600 mx-auto mb-4">
            <Compass size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Aucun voyage pour le moment</h3>
          <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
            Explorez notre catalogue de résidences d'exception à Ouagadougou, Bobo-Dioulasso et Koudougou.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3.5 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 cursor-pointer"
          >
            Commencer mes recherches
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.slice((currentPage - 1) * 50, currentPage * 50).map((booking) => {
            const res = residencesMap[booking.residenceId];
            if (!res) return null;

            // Calculate nights
            const getNightsCount = (start: string, end: string) => {
              if (!start || !end) return 1;
              const s = new Date(start).getTime();
              const e = new Date(end).getTime();
              const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
              return diff > 0 ? diff : 1;
            };
            const nights = getNightsCount(booking.checkIn, booking.checkOut);

            const isAdvancePaid = booking.paymentStatus === 'fully_paid' || booking.paymentStatus === 'advance_paid';
            const isFullyPaid = booking.paymentStatus === 'fully_paid' || (isAdvancePaid && booking.advancePaid >= booking.totalPrice);
            const remainingToPay = isFullyPaid ? 0 : (booking.paymentStatus === 'advance_paid' ? Math.max(0, booking.totalPrice - booking.advancePaid) : booking.totalPrice);

            return (
              <motion.div 
                id={`booking-card-${booking.id}`}
                key={booking.id}
                whileHover={{ y: -2 }}
                className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col md:flex-row p-5 sm:p-6 gap-5 sm:gap-6 relative group"
              >
                {/* Residence Image Thumbnail */}
                <div className="w-full md:w-60 aspect-[16/10] md:aspect-[4/3] rounded-2xl overflow-hidden shrink-0 shadow-2xs relative bg-slate-100">
                  <img 
                    src={res.images?.[0] || 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800'} 
                    alt={res.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  
                  {/* Category Chip */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase text-slate-800 shadow-2xs border border-slate-200/40">
                    {res.type === 'chambre' ? "Chambre d'hôte" : res.type === 'appartement' ? 'Appartement' : res.type === 'villa' ? 'Villa' : res.type}
                  </div>

                  {/* Locality Pill */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 text-white text-[11px] font-bold truncate">
                    <MapPin size={12} className="text-red-400 shrink-0" />
                    <span className="truncate">{res.address?.city || res.city || "Burkina Faso"}</span>
                  </div>
                </div>

                {/* Main Details Body */}
                <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    {/* Header line: Status badge + ID tag */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(booking.bookingStatus, booking.paymentStatus, booking)}
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border border-slate-200">
                          #{booking.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      
                      <span className="text-[10px] text-slate-400 font-mono">
                        {booking.createdAt ? `Créé le ${new Date(booking.createdAt).toLocaleDateString('fr-FR')}` : ''}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5 leading-snug group-hover:text-red-600 transition-colors">
                      {res.title}
                    </h3>
                    
                    {/* Address */}
                    <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span>
                        {res.address?.street || res.street ? `${res.address?.street || res.street}, ` : ''}
                        {res.address?.neighborhood || res.neighborhood ? `${res.address?.neighborhood || res.neighborhood}, ` : ''}
                        <strong className="text-slate-700 font-bold">{res.address?.city || res.city}</strong>
                      </span>
                    </p>
                    
                    {/* Host Name Pill */}
                    {res.ownerName && (
                      <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-xs text-slate-600 mb-3.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-700 uppercase">
                          {res.ownerName.charAt(0)}
                        </div>
                        <span>Hôte : <strong className="text-slate-900 font-bold">{res.ownerName}</strong></span>
                      </div>
                    )}

                    {/* Dates Capsule */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl font-medium text-slate-700">
                        <CalendarDays size={14} className="text-red-500 shrink-0" />
                        <span>Du <strong className="text-slate-900 font-extrabold">{formatDateFr(booking.checkIn)}</strong> au <strong className="text-slate-900 font-extrabold">{formatDateFr(booking.checkOut)}</strong></span>
                      </div>
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-black">
                        {nights} {nights > 1 ? 'nuitées' : 'nuitée'}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                        {booking.guests} pers.
                      </span>
                    </div>

                    {/* Cancellation & Refund Alert */}
                    {booking.bookingStatus === 'cancelled' && (
                      <div className="mt-3.5 p-4 rounded-2xl bg-rose-50/90 border border-rose-200 space-y-2">
                        <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs uppercase tracking-wide">
                          <AlertCircle size={15} className="text-rose-600 shrink-0" />
                          <span>Séjour Annulé (par {booking.cancelledBy === 'client' ? 'vous-même' : booking.cancelledBy === 'owner' ? "l'hôte" : "l'administration"})</span>
                        </div>
                        {booking.cancellationReason && (
                          <p className="text-xs text-slate-700 font-medium">
                            Motif : <span className="italic font-bold text-slate-800">"{booking.cancellationReason}"</span>
                          </p>
                        )}
                        {booking.refundStatus && booking.refundStatus !== 'none' && (
                          <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-rose-900">
                              Remboursement ({booking.refundProvider?.toUpperCase()} {booking.refundPhone}) : <strong>{formatCurrency(booking.refundAmount)} F CFA</strong>
                            </span>
                            <span className="px-2.5 py-0.5 bg-rose-200 text-rose-900 rounded-md font-black text-[10px] uppercase">
                              {booking.refundStatus === 'refunded' ? 'Soldé' : 'En traitement'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Financial Stats Ribbon & Action Buttons */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    
                    {/* 4-column Financial Stats Ribbon */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/60">
                      <div className="px-2 py-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Nuitée</span>
                        <span className="text-xs font-black text-slate-900">{formatCurrency(res.pricePerNight)} F</span>
                      </div>
                      <div className="px-2 py-1 border-l border-slate-200/60">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Séjour</span>
                        <span className="text-xs font-black text-slate-900">{formatCurrency(booking.totalPrice)} F</span>
                      </div>
                      <div className="px-2 py-1 border-l border-slate-200/60">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Acompte Versé</span>
                        <span className="text-xs font-black text-emerald-600">
                          {isAdvancePaid ? `${formatCurrency(booking.advancePaid)} F` : '0 F'}
                        </span>
                      </div>
                      <div className="px-2 py-1 border-l border-slate-200/60">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Reste à Payer</span>
                        <span className={cn("text-xs font-black", remainingToPay > 0 ? "text-amber-600" : "text-slate-700")}>
                          {formatCurrency(remainingToPay)} F
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Panel */}
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <button 
                        onClick={() => setSelectedBookingForDetail(booking)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock size={14} className="text-slate-600 shrink-0" />
                        <span>Détails & Suivi</span>
                      </button>

                      <button 
                        onClick={() => onContactHost(booking.ownerId, booking.residenceId)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare size={14} className="text-slate-600 shrink-0" />
                        <span>Discuter</span>
                      </button>

                      {booking.bookingStatus === 'completed' && (
                        <button 
                          onClick={() => setSelectedBookingForReview(booking)}
                          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Star size={14} className="fill-amber-500 text-amber-500 shrink-0" />
                          <span>Avis</span>
                        </button>
                      )}

                      {booking.bookingStatus === 'confirmed' && booking.paymentStatus === 'pending' && (
                        <button 
                          onClick={() => setSelectedBookingForPayment(booking)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <CreditCard size={14} className="shrink-0" />
                          <span>Payer l'acompte</span>
                        </button>
                      )}

                      {booking.paymentStatus === 'advance_paid' && booking.bookingStatus === 'confirmed' && (booking.totalPrice - booking.advancePaid) > 0 && (
                        <button 
                          onClick={() => setSelectedBookingForPayment(booking)}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <CreditCard size={14} className="shrink-0" />
                          <span>Solder le séjour</span>
                        </button>
                      )}

                      {(booking.paymentStatus === 'advance_paid' || booking.paymentStatus === 'fully_paid') && booking.bookingStatus !== 'cancelled' && (
                        <button 
                          onClick={() => setSelectedBookingForInvoice(booking)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Download size={13} className="shrink-0" />
                          <span>Reçu</span>
                        </button>
                      )}

                      {(booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed') && (
                        <button 
                          onClick={() => setSelectedBookingForCancel(booking)}
                          className="px-3 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <X size={13} className="shrink-0" />
                          <span>Annuler</span>
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
            isFinalPayment={selectedBookingForPayment.paymentStatus === 'advance_paid' || selectedBookingForPayment.advancePaid >= selectedBookingForPayment.totalPrice}
            paymentType={selectedBookingForPayment.paymentStatus === 'advance_paid' || selectedBookingForPayment.advancePaid >= selectedBookingForPayment.totalPrice ? 'full' : 'advance'}
            residenceTitle={residencesMap[selectedBookingForPayment.residenceId]?.title || "Hébergement"}
            isTestMode={isTestMode}
            bookingId={selectedBookingForPayment.id}
            onSuccess={async () => {
              try {
                const isFinalPayment = selectedBookingForPayment.paymentStatus === 'advance_paid' || selectedBookingForPayment.advancePaid >= selectedBookingForPayment.totalPrice;
                
                await updateBookingStatus(selectedBookingForPayment.id, {
                  paymentStatus: isFinalPayment ? 'fully_paid' : 'advance_paid'
                });
                
                await sendNotification({
                  userId: selectedBookingForPayment.ownerId,
                  title: isFinalPayment ? "Séjour Solder ! 💰" : "Acompte Reçu ! 💰",
                  message: `La résidence ${residencesMap[selectedBookingForPayment.residenceId]?.title} a reçu un paiement de ${formatCurrency(isFinalPayment ? (selectedBookingForPayment.totalPrice - selectedBookingForPayment.advancePaid) : selectedBookingForPayment.advancePaid)} F CFA.`,
                  type: 'payment'
                });

                addToast(isFinalPayment ? 'Félicitations ! Votre séjour est entièrement payé.' : 'Paiement de l\'acompte enregistré avec succès ! Votre réservation est validée.', "error");
                setSelectedBookingForPayment(null);
                refreshData();
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
              refreshData();
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
              refreshData();
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
