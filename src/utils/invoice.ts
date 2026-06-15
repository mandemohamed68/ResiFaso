import { jsPDF } from 'jspdf';
import { Booking, Residence } from '../types';
import { formatCurrency } from './currency';

export const generateInvoice = (booking: Booking, residence?: Residence | null, clientName?: string) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(220, 38, 38); // red-600
  doc.text("ResiFaso", 20, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Reçu de Réservation", 20, 28);
  doc.text(`Identifiant de réservation: ${booking.id.toUpperCase()}`, 20, 34);
  doc.text(`Date d'émission: ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);
  
  // Separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 45, 190, 45);
  
  // Client & Booking info
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  
  doc.text("Détails du Client :", 20, 55);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Nom/ID : ${clientName || 'Client'}`, 20, 62);
  
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Détails de l'Hébergement :", 110, 55);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Nom : ${residence?.title || 'Logement non spécifié'}`, 110, 62);
  doc.text(`Type : ${residence?.type || '-'}`, 110, 68);
  doc.text(`Emplacement : ${residence?.address?.city || ''}, ${residence?.address?.neighborhood || ''}`, 110, 74);
  
  // Stay details
  doc.line(20, 82, 190, 82);
  
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Détails du Séjour :", 20, 92);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Arrivée : ${new Date(booking.checkIn).toLocaleDateString('fr-FR')}`, 20, 100);
  doc.text(`Départ : ${new Date(booking.checkOut).toLocaleDateString('fr-FR')}`, 20, 106);
  doc.text(`Voyageurs : ${booking.guests}`, 20, 112);
  
  // Financial details
  doc.line(20, 120, 190, 120);
  
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Détails Financiers :", 20, 130);
  
  doc.setFontSize(11);
  doc.text("Montant Total :", 20, 140);
  doc.text(`${formatCurrency(booking.totalPrice)} F CFA`, 150, 140);
  
  doc.text("Total Payé (Acompte + Solde) :", 20, 148);
  let totalPaid = 0;
  if(booking.paymentStatus === 'fully_paid') {
      totalPaid = booking.totalPrice;
  } else if (booking.paymentStatus === 'advance_paid') {
      totalPaid = booking.advancePaid;
  }
  doc.text(`${formatCurrency(totalPaid)} F CFA`, 150, 148);
  
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text("Reste à payer :", 20, 156);
  const remaining = booking.totalPrice - totalPaid;
  doc.text(`${formatCurrency(remaining)} F CFA`, 150, 156);
  
  // Footer text
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  let footerText = "Merci de votre confiance !";
  if(booking.paymentStatus === 'advance_paid') {
      footerText = `Merci de bien vouloir régler le solde de ${formatCurrency(remaining)} F CFA à votre arrivée.`;
  }
  
  doc.text(footerText, 20, 180);
  
  return doc;
};
