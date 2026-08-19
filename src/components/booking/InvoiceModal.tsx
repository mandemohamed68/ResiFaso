import { formatCurrency } from '../../utils/currency';
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Download, Printer, Building2, User, Calendar, MapPin, 
  ShieldCheck, CheckCircle2, CreditCard, Copy, FileText, 
  Sparkles, Clock, Check, Phone, Mail, Globe, AlertCircle
} from 'lucide-react';
import { Booking, Residence } from '../../types';
import { generateInvoice } from '../../utils/invoice';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';

const formatDateSafe = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  residence?: Residence | null;
  clientName?: string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ 
  isOpen, 
  onClose, 
  booking, 
  residence, 
  clientName 
}) => {
  const { addToast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchFallback = async () => {
      try {
        const response = await fetch('/logoresifasoORG.png');
        if (!response.ok) throw new Error("Status " + response.status);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active) {
            setLogoBase64(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn("Fallback fetch failed too", err);
      }
    };

    const loadLogo = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx && active) {
              ctx.drawImage(img, 0, 0);
              setLogoBase64(canvas.toDataURL('image/png'));
            }
          } catch (e) {
            console.warn("Canvas logo conversion failed, trying fetch", e);
            fetchFallback();
          }
        };
        img.onerror = () => {
          fetchFallback();
        };
        img.src = '/logoresifasoORG.png';
      } catch (error) {
        console.error("Failed to load logo", error);
      }
    };

    loadLogo();
    return () => {
      active = false;
    };
  }, []);

  if (!booking) return null;

  const isFullyPaid = booking.paymentStatus === 'fully_paid';
  const totalPaid = isFullyPaid 
    ? Number(booking.totalPrice || 0) 
    : (booking.paymentStatus === 'advance_paid' ? Number(booking.advancePaid || 0) : 0);
    
  const remaining = Math.max(0, Number(booking.totalPrice || 0) - totalPaid);

  // Calculate nights
  const checkInDate = new Date(booking.checkIn || Date.now());
  const checkOutDate = new Date(booking.checkOut || Date.now());
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const nights = isNaN(calculatedNights) || calculatedNights < 1 ? 1 : calculatedNights;
  const pricePerNight = Math.round(Number(booking.totalPrice || 0) / nights);

  const invoiceNumber = `FAC-${String(booking.id || '').slice(0, 8).toUpperCase()}`;

  const handleCopyId = () => {
    navigator.clipboard?.writeText(booking.id || '');
    setCopied(true);
    addToast("Numéro de facture copié !", "info");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = () => {
    const doc = generateInvoice(booking, residence, clientName, logoBase64);
    doc.save(`Recu_${booking.id}_ResiFaso.pdf`);
    addToast("Téléchargement du reçu PDF lancé.", "info");
  };

  const handlePrint = () => {
    try {
      const doc = generateInvoice(booking, residence, clientName, logoBase64);
      doc.save(`Recu_${booking.id}_ResiFaso_Impression.pdf`);
      addToast("Le reçu a été préparé au format PDF prêt à imprimer.", "info");
    } catch (e) {
      console.error("Erreur lors de l'impression:", e);
      addToast("Une erreur s'est produite lors de la préparation de l'impression.", "error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-6 pb-10 overflow-y-auto print:p-0 print:block">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-3xl my-auto sm:my-0 bg-white rounded-xl shadow-xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none max-h-[90vh] flex flex-col border border-slate-200"
          >
            {/* Top Toolbar (Hidden in print) */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight leading-none">
                    Aperçu officiel du reçu
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Réf. <span className="font-mono font-bold text-slate-800">{invoiceNumber}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} className="text-slate-600" />
                  <span className="hidden sm:inline">Imprimer</span>
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Télécharger PDF</span>
                </button>
                <button 
                  onClick={onClose} 
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors ml-1 cursor-pointer"
                  title="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Document Scroll Area */}
            <div className="p-4 sm:p-6 overflow-y-auto print:max-h-none print:overflow-visible print:p-0 bg-slate-100/50">
              <div 
                ref={invoiceRef} 
                className="bg-white p-6 sm:p-8 shadow-xs border border-slate-200 rounded-xl print:border-none print:shadow-none print:p-0 relative max-w-2xl mx-auto"
              >
                
                {/* Header: Logo + Invoice Stamp */}
                <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b border-slate-200 gap-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/logoresifasoORG.png" 
                      alt="ResiFaso Logo" 
                      className="h-10 w-auto object-contain" 
                      referrerPolicy="no-referrer" 
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">ResiFaso</h1>
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 text-[9px] font-bold uppercase rounded tracking-wider">
                          Officiel
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1">
                        Plateforme de Résidence • Burkina Faso
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2">
                      {isFullyPaid ? (
                        <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Facture Soldée (100%)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                          <Clock size={13} className="text-blue-600" />
                          <span>Reçu d'Acompte Validé</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center sm:justify-end gap-1.5 text-xs text-slate-600 font-medium">
                      <span>Facture N°</span>
                      <strong className="font-mono text-slate-900 font-bold">{invoiceNumber}</strong>
                      <button
                        onClick={handleCopyId}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 transition-colors"
                        title="Copier le numéro"
                      >
                        {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Date d'émission : <strong className="text-slate-900">{new Date().toLocaleDateString('fr-FR')}</strong>
                    </p>
                  </div>
                </div>

                {/* Company (Émetteur) & Client (Facturé à) Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-5 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      <Building2 size={12} className="text-slate-600" />
                      <span>Émetteur</span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">ResiFaso S.A.</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Secteur 15, Ouagadougou<br />
                      Burkina Faso<br />
                      Email : <span className="font-medium text-slate-800">contact@resifaso.com</span><br />
                      Web : <span className="font-medium text-slate-800">www.resifaso.com</span>
                    </p>
                  </div>
                  
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      <User size={12} className="text-slate-600" />
                      <span>Facturé à</span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{clientName || 'Voyageur ResiFaso'}</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Client Voyageur Particulier<br />
                      Plateforme ResiFaso Burkina<br />
                      Paiement vérifié par Mobile Money
                    </p>
                  </div>
                </div>

                {/* Itemized Services Table */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Description des Prestations
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      Devise : <strong className="text-slate-800">Franc CFA (XOF)</strong>
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                        <tr>
                          <th className="p-3">Désignation</th>
                          <th className="p-3 text-center">Nuitées</th>
                          <th className="p-3 text-right">Prix Unitaire</th>
                          <th className="p-3 text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        <tr>
                          <td className="p-3">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">
                              {residence?.title || 'Séjour en résidence'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                              <span className="inline-flex items-center gap-1">
                                <Calendar size={11} className="text-slate-400" />
                                Du <strong>{formatDateSafe(booking.checkIn)}</strong> au <strong>{formatDateSafe(booking.checkOut)}</strong>
                              </span>
                              <span>•</span>
                              <span>{booking.guests || 1} pers.</span>
                            </div>
                            {(() => {
                              const rCity = residence?.city || residence?.address?.city;
                              const rNeigh = residence?.neighborhood || residence?.address?.neighborhood;
                              if (!rCity) return null;
                              return (
                                <p className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-1">
                                  <MapPin size={10} />
                                  <span>{rCity} {rNeigh ? `- ${rNeigh}` : ''}</span>
                                </p>
                              );
                            })()}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-900">
                            {nights}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">
                            {formatCurrency(pricePerNight)} F
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(Number(booking.totalPrice || 0))} F
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-t border-slate-200 pt-5 gap-4 text-xs">
                  <div className="space-y-1.5 max-w-xs text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                      <span>Garantie Réservation ResiFaso</span>
                    </div>
                    <p className="leading-relaxed text-[10px] text-slate-500">
                      Tous les paiements en ligne sont sécurisés et certifiés par la passerelle de paiement Mobile Money au Burkina Faso.
                    </p>
                  </div>

                  <div className="w-full sm:w-72 bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-slate-600 font-medium">
                      <span>Total du Séjour :</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(Number(booking.totalPrice || 0))} F CFA
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600 font-medium">
                      <span>Acompte Réglé en Ligne :</span>
                      <span className="font-mono font-bold text-emerald-700">
                        - {formatCurrency(totalPaid)} F CFA
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                      {remaining > 0 ? (
                        <>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-tight">
                              Solde à régler à l'arrivée :
                            </span>
                            <span className="text-[9px] text-slate-500">
                              À verser à l'hôte lors des clés
                            </span>
                          </div>
                          <span className="font-mono font-bold text-sm text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-md">
                            {formatCurrency(remaining)} F
                          </span>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-tight">
                              Solde Restant :
                            </span>
                            <span className="text-[9px] text-emerald-600 font-medium">
                              Séjour 100% Soldé
                            </span>
                          </div>
                          <span className="font-mono font-bold text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                            0 F CFA
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Notes & Legal Stamp */}
                <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[10px] text-slate-500">
                  <p className="max-w-md leading-relaxed">
                    {remaining > 0
                      ? `Rappel : Le solde restant de ${formatCurrency(remaining)} F CFA devra être réglé auprès de l'hôte à la remise des clés.`
                      : 'Ce séjour a été intégralement réglé par Mobile Money. Document électronique officiel valant reçu de paiement.'}
                  </p>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="font-mono font-bold text-slate-600 uppercase tracking-wider block">
                      RESIFASO • BURKINA FASO
                    </span>
                    <span className="text-slate-400 text-[9px]">Document officiel vérifié</span>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
