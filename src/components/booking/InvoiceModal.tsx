import { formatCurrency } from '../../utils/currency';
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Printer } from 'lucide-react';
import { Booking, Residence } from '../../types';
import { generateInvoice } from '../../utils/invoice';
import { useToast } from '../../contexts/ToastContext';

const formatDateSafe = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR');
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

  const totalPaid = booking.paymentStatus === 'fully_paid' 
    ? Number(booking.totalPrice || 0) 
    : (booking.paymentStatus === 'advance_paid' ? Number(booking.advancePaid || 0) : 0);
    
  const remaining = Number(booking.totalPrice || 0) - totalPaid;

  const handleDownloadPDF = () => {
    const doc = generateInvoice(booking, residence, clientName, logoBase64);
    doc.save(`Recu_${booking.id}_ResiFaso.pdf`);
  };

  const handlePrint = () => {
    try {
      const doc = generateInvoice(booking, residence, clientName, logoBase64);
      doc.save(`Recu_${booking.id}_ResiFaso_Impression.pdf`);
      addToast("Le reçu a été téléchargé au format PDF. Veuillez l'ouvrir pour l'imprimer.", "info");
    } catch (e) {
      console.error("Erreur lors de l'impression:", e);
      addToast("Une erreur s'est produite lors de la préparation de l'impression.", "error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:p-0 print:block">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none"
          >
            {/* Header actions (hidden in print) */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 print:hidden hidden sm:flex">
              <h3 className="font-bold text-slate-800">Aperçu du reçu</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Printer size={16} />
                  Imprimer
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md shadow-red-200 flex items-center gap-2 transition-colors"
                >
                  <Download size={16} />
                  Télécharger PDF
                </button>
                <button 
                  onClick={onClose} 
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Mobile actions */}
            <div className="sm:hidden flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 print:hidden">
              <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex gap-2">
                <button onClick={handleDownloadPDF} className="p-2 bg-red-600 text-white rounded-lg shadow-sm">
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="p-6 sm:p-10 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-8 bg-slate-50">
              <div ref={invoiceRef} className="bg-white p-6 sm:p-10 shadow-sm border border-slate-150 rounded-2xl print:border-none print:shadow-none print:p-0 relative">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start mb-10 border-b border-slate-150 pb-8 gap-4">
                  <div className="flex items-center gap-3">
                    <img src="/logoresifasoORG.png" alt="ResiFaso Logo" className="h-12 object-contain" referrerPolicy="no-referrer" />
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">ResiFaso</h1>
                      <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">Burkina Faso</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 ${
                      booking.paymentStatus === 'fully_paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {booking.paymentStatus === 'fully_paid' ? 'Facture Soldée' : 'Acompte Payé'}
                    </span>
                    <p className="text-xs text-slate-500 font-medium">Facture N° <span className="font-mono font-bold text-slate-900">{String(booking.id || '').slice(0, 10).toUpperCase()}</span></p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Date d'émission : <span className="font-bold text-slate-950">{new Date().toLocaleDateString('fr-FR')}</span></p>
                  </div>
                </div>

                {/* Company & Client Addresses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10 text-xs">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Émetteur</h3>
                    <p className="font-extrabold text-slate-900 text-sm">ResiFaso S.A.</p>
                    <p className="text-slate-500 mt-1 leading-relaxed">
                      Secteur 15, Ouagadougou<br />
                      Burkina Faso<br />
                      Email : contact@resifaso.com<br />
                      Web : www.resifaso.com
                    </p>
                  </div>
                  
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Facturé à</h3>
                    <p className="font-extrabold text-slate-900 text-sm">{clientName || 'Voyageur ResiFaso'}</p>
                    <p className="text-slate-500 mt-1 leading-relaxed">
                      Client Voyageur<br />
                      Plateforme ResiFaso<br />
                      Burkina Faso
                    </p>
                  </div>
                </div>

                {/* Stay Table (Professional itemized) */}
                <div className="mb-8">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Description des Prestations</h3>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                        <tr>
                          <th className="p-4">Désignation</th>
                          <th className="p-4 text-center">Nuits</th>
                          <th className="p-4 text-right">Prix Unitaire (F CFA)</th>
                          <th className="p-4 text-right">Montant (F CFA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-4">
                            <p className="font-extrabold text-slate-900">{residence?.title || 'Séjour en résidence'}</p>
                            <p className="text-slate-500 mt-0.5 text-[11px]">
                              Du {formatDateSafe(booking.checkIn)} au {formatDateSafe(booking.checkOut)} ({booking.guests || 1} voyageur(s))
                            </p>
                            {(() => {
                              const rCity = residence?.city || residence?.address?.city;
                              const rNeigh = residence?.neighborhood || residence?.address?.neighborhood;
                              if (!rCity) return null;
                              return (
                                <p className="text-slate-400 text-[10px] italic">
                                  {rCity} {rNeigh ? `- ${rNeigh}` : ''}
                                </p>
                              );
                            })()}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-900">
                            {(() => {
                              const checkInDate = new Date(booking.checkIn || Date.now());
                              const checkOutDate = new Date(booking.checkOut || Date.now());
                              const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
                              const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return isNaN(calculatedNights) ? 1 : (calculatedNights || 1);
                            })()}
                          </td>
                          <td className="p-4 text-right font-bold text-slate-900">
                            {(() => {
                              const checkInDate = new Date(booking.checkIn || Date.now());
                              const checkOutDate = new Date(booking.checkOut || Date.now());
                              const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
                              const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              const n = isNaN(calculatedNights) ? 1 : (calculatedNights || 1);
                              return formatCurrency(Math.round(Number(booking.totalPrice || 0) / n));
                            })()}
                          </td>
                          <td className="p-4 text-right font-black text-slate-900">{formatCurrency(Number(booking.totalPrice || 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex flex-col sm:flex-row justify-end border-t border-slate-100 pt-8 mt-4 text-xs">
                  <div className="w-full sm:w-1/2 space-y-3.5">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-bold">Total Brut</span>
                      <span className="font-bold text-slate-950">{formatCurrency(Number(booking.totalPrice || 0))} F CFA</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-3">
                      <span className="font-bold">Acompte Payé en Ligne</span>
                      <span className="font-extrabold text-green-600">
                        - {formatCurrency(totalPaid)} F CFA
                      </span>
                    </div>
                    {booking.paymentStatus === 'advance_paid' ? (
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-black text-slate-900 uppercase text-xs tracking-wider">Reste à payer à l'arrivée</span>
                        <span className="text-lg font-black text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl">{formatCurrency(remaining)} F CFA</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-black text-slate-900 uppercase text-xs tracking-wider">Solde Restant</span>
                        <span className="text-lg font-black text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-xl">0 F CFA (Réglé)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer notes */}
                <div className="mt-12 pt-8 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-slate-400 font-medium">
                  <div className="max-w-md">
                    {booking.paymentStatus === 'advance_paid' 
                      ? `Note réglementaire : Le solde de ${formatCurrency(remaining)} F CFA doit être réglé directement auprès de l'hôte au moment de la remise des clés de l'appartement.`
                      : 'Ce séjour a été intégralement réglé par Mobile Money. Merci pour votre réservation sur la plateforme ResiFaso.'}
                  </div>
                  <div className="text-slate-400 text-[10px] uppercase font-black tracking-widest text-right">
                    Document officiel ResiFaso
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
