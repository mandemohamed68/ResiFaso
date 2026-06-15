import { formatCurrency } from '../../utils/currency';
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Printer } from 'lucide-react';
import { Booking, Residence } from '../../types';
import { generateInvoice } from '../../utils/invoice';

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
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!booking) return null;

  const totalPaid = booking.paymentStatus === 'fully_paid' 
    ? booking.totalPrice 
    : (booking.paymentStatus === 'advance_paid' ? booking.advancePaid : 0);
    
  const remaining = booking.totalPrice - totalPaid;

  const handleDownloadPDF = () => {
    const doc = generateInvoice(booking, residence, clientName);
    doc.save(`Recu_${booking.id}_ResiFaso.pdf`);
  };

  const handlePrint = () => {
    try {
      const doc = generateInvoice(booking, residence, clientName);
      doc.save(`Recu_${booking.id}_ResiFaso_Impression.pdf`);
      alert("Le reçu a été téléchargé au format PDF. Veuillez l'ouvrir pour l'imprimer.");
    } catch (e) {
      console.error("Erreur lors de l'impression:", e);
      alert("Une erreur s'est produite lors de la préparation de l'impression.");
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
            <div className="p-6 sm:p-10 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-8 bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              <div ref={invoiceRef} className="bg-white p-6 sm:p-10 shadow-sm border border-slate-100 rounded-2xl print:border-none print:shadow-none print:p-0 relative">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-10 border-b border-slate-100 pb-8">
                  <div>
                    <h1 className="text-3xl font-black text-red-600 tracking-tight">RESIFASO</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Reçu de réservation</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Facture N°</p>
                    <p className="font-mono font-bold text-slate-900">{booking.id.slice(0, 10).toUpperCase()}</p>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Date d'émission</p>
                    <p className="font-bold text-slate-900">{new Date().toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {/* Info blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/60">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Facturé à</h3>
                    <p className="font-bold text-slate-900">{clientName || 'Client ResiFaso'}</p>
                    <p className="text-sm text-slate-500 mt-1">Voyageur</p>
                  </div>
                  
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/60">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Détails de l'hébergement</h3>
                    <p className="font-bold text-slate-900">{residence?.title || 'Logement non spécifié'}</p>
                    <p className="text-sm text-slate-500 mt-1">{residence?.type || '-'}</p>
                    {residence?.address && (
                      <p className="text-sm text-slate-500">{residence.address.city}, {residence.address.neighborhood}</p>
                    )}
                  </div>
                </div>

                {/* Stay Table */}
                <div className="mb-8">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Détails du Séjour</h3>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-4 text-xs font-bold text-slate-600">Arrivée</th>
                          <th className="p-4 text-xs font-bold text-slate-600">Départ</th>
                          <th className="p-4 text-xs font-bold text-slate-600 text-right">Voyageurs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-4 font-bold text-slate-900">{new Date(booking.checkIn).toLocaleDateString('fr-FR')}</td>
                          <td className="p-4 font-bold text-slate-900">{new Date(booking.checkOut).toLocaleDateString('fr-FR')}</td>
                          <td className="p-4 font-bold text-slate-900 text-right">{booking.guests}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex flex-col sm:flex-row justify-end border-t border-slate-100 pt-8 mt-4">
                  <div className="w-full sm:w-1/2 space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                      <span>Montant Total</span>
                      <span className="font-bold text-slate-900">{formatCurrency(booking.totalPrice)} F CFA</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                      <span>Total Payé</span>
                      <span className="font-bold text-green-600">
                        - {formatCurrency(totalPaid)} F CFA
                      </span>
                    </div>
                    {booking.paymentStatus === 'advance_paid' && (
                      <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-2">
                        <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">Reste à payer à l'arrivée</span>
                        <span className="text-xl font-black text-red-600">{formatCurrency(remaining)} F CFA</span>
                      </div>
                    )}
                    {booking.paymentStatus === 'fully_paid' && (
                      <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-2">
                        <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">Solde Restant</span>
                        <span className="text-xl font-black text-slate-400">0 F CFA</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Stamp */}
                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                  <div className="text-xs text-slate-400 font-medium max-w-[250px]">
                    {booking.paymentStatus === 'advance_paid' 
                      ? `Le solde de ${formatCurrency(remaining)} F CFA doit être réglé au moment de la remise des clés.`
                      : 'Ce séjour a été entièrement réglé. Merci de votre confiance.'}
                  </div>
                  
                  <div className="flex items-center justify-center p-3 border-2 border-red-600/30 rounded-full w-24 h-24 rotate-[-15deg] opacity-70">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-black text-red-600/80 tracking-widest leading-none mb-1">Status</p>
                      <p className="text-base uppercase font-black text-red-600 leading-none">
                        {booking.paymentStatus === 'fully_paid' ? 'SOLDÉ' : 'PAYÉ'}
                      </p>
                    </div>
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
