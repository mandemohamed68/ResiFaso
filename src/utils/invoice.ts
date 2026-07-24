import { jsPDF } from 'jspdf';
import { Booking, Residence } from '../types';
import { formatCurrency } from './currency';

const formatDateSafe = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR');
};

export const generateInvoice = (booking: Booking, residence?: Residence | null, clientName?: string, logoBase64?: string) => {
  const doc = new jsPDF();
  
  // 1. Force Solid White Background to prevent totally black document in dark-mode readers
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
  
  // Header with Logo
  if (logoBase64) {
    try {
      // logoresifasoORG has width/height aspect ratio of ~ 2.4 : 1
      doc.addImage(logoBase64, 'PNG', 20, 15, 45, 19);
    } catch (e) {
      console.error("Error drawing logo to pdf invoice:", e);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text("ResiFaso", 20, 25);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text("ResiFaso", 20, 25);
  }
  
  // Invoice Metadata on top-right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("REÇU DE RÉSERVATION", 115, 22);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Référence : ${String(booking.id || '').toUpperCase()}`, 115, 29);
  doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, 115, 35);
  
  // Separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(20, 45, 190, 45);
  
  // Client & Booking info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  
  doc.text("Détails du Client :", 20, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Nom/ID : ${clientName || 'Client'}`, 20, 62);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Détails de l'Hébergement :", 110, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Nom : ${residence?.title || 'Logement non spécifié'}`, 110, 62);
  doc.text(`Type : ${residence?.type || '-'}`, 110, 68);
  doc.text(`Emplacement : ${residence?.address?.city || ''}, ${residence?.address?.neighborhood || ''}`, 110, 74);
  
  // Stay details
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(20, 82, 190, 82);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Détails du Séjour :", 20, 92);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Arrivée : ${formatDateSafe(booking.checkIn)}`, 20, 100);
  doc.text(`Départ : ${formatDateSafe(booking.checkOut)}`, 20, 106);
  doc.text(`Voyageurs : ${booking.guests || 1}`, 20, 112);
  
  // Financial details
  doc.line(20, 120, 190, 120);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Détails Financiers :", 20, 130);
  
  const totalPrice = Number(booking.totalPrice) || 0;
  const advancePaid = Number(booking.advancePaid) || 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Montant Total :", 20, 140);
  doc.text(`${formatCurrency(totalPrice)} F CFA`, 150, 140);
  
  doc.text("Total Payé (Acompte + Solde) :", 20, 148);
  let totalPaid = 0;
  if(booking.paymentStatus === 'fully_paid') {
      totalPaid = totalPrice;
  } else if (booking.paymentStatus === 'advance_paid') {
      totalPaid = advancePaid;
  }
  doc.text(`${formatCurrency(totalPaid)} F CFA`, 150, 148);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text("Reste à payer :", 20, 156);
  const remaining = Math.max(0, totalPrice - totalPaid);
  doc.text(`${formatCurrency(remaining)} F CFA`, 150, 156);
  
  // Footer text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  let footerText = "Merci de votre confiance !";
  if(booking.paymentStatus === 'advance_paid') {
      footerText = `Merci de bien vouloir régler le solde de ${formatCurrency(remaining)} F CFA à votre arrivée.`;
  }
  
  doc.text(footerText, 20, 180);
  
  return doc;
};
