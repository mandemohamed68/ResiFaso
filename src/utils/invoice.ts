import { jsPDF } from 'jspdf';
import { Booking, Residence } from '../types';
import { formatCurrency } from './currency';

const formatDateSafe = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const generateInvoice = (booking: Booking, residence?: Residence | null, clientName?: string, logoBase64?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // 1. Solid White Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

  // Top Red Accent Line
  doc.setFillColor(220, 38, 38); // Brand Red
  doc.rect(0, 0, pageWidth, 4, 'F');
  
  // 2. Header with Logo & Brand
  let startY = 16;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 18, startY, 44, 18);
    } catch (e) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(220, 38, 38);
      doc.text("ResiFaso", 18, startY + 12);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38);
    doc.text("ResiFaso", 18, startY + 12);
  }
  
  // Invoice Title & Meta on top-right
  const isFullyPaid = booking.paymentStatus === 'fully_paid';
  const invoiceNum = `FAC-${String(booking.id || '').slice(0, 8).toUpperCase()}`;

  // Status Badge on Right
  if (isFullyPaid) {
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.setDrawColor(167, 243, 208); // Emerald 200
    doc.roundedRect(128, startY, 64, 8, 2, 2, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text("FACTURE SOLDÉE (100%)", 135, startY + 5.5);
  } else {
    doc.setFillColor(239, 246, 255); // Blue 50
    doc.setDrawColor(191, 219, 254); // Blue 200
    doc.roundedRect(128, startY, 64, 8, 2, 2, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(29, 78, 216); // Blue 700
    doc.text("REÇU D'ACOMPTE VALIDÉ", 133, startY + 5.5);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Facture N° : ${invoiceNum}`, 130, startY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Émise le : ${new Date().toLocaleDateString('fr-FR')}`, 130, startY + 19);

  // Separator
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.line(18, 42, 192, 42);

  // 3. Sender & Client Bento Boxes
  // Box 1: Émetteur
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, 48, 83, 34, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("ÉMETTEUR / PLATEFORME", 23, 54);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("ResiFaso S.A.", 23, 61);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Secteur 15, Ouagadougou • Burkina Faso", 23, 67);
  doc.text("Email : contact@resifaso.com", 23, 73);
  doc.text("Site : www.resifaso.com", 23, 78);

  // Box 2: Client
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(107, 48, 85, 34, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("FACTURÉ À / CLIENT", 112, 54);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(clientName || "Client Voyageur ResiFaso", 112, 61);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Client Particulier • Réservation directe", 112, 67);
  doc.text("Paiement certifié par Mobile Money", 112, 73);
  doc.text("Plateforme Officielle ResiFaso BF", 112, 78);

  // 4. Description des Prestations Table
  const tableY = 90;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DESCRIPTION DES PRESTATIONS", 18, tableY);

  // Table Header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(18, tableY + 3, 174, 8, 1, 1, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text("Désignation du Séjour", 22, tableY + 8.5);
  doc.text("Nuitées", 110, tableY + 8.5);
  doc.text("Prix / Nuit", 135, tableY + 8.5);
  doc.text("Montant (F CFA)", 165, tableY + 8.5);

  // Table Row
  const checkInDate = new Date(booking.checkIn || Date.now());
  const checkOutDate = new Date(booking.checkOut || Date.now());
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const nights = isNaN(calculatedNights) || calculatedNights < 1 ? 1 : calculatedNights;
  const totalPrice = Number(booking.totalPrice) || 0;
  const pricePerNight = Math.round(totalPrice / nights);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(residence?.title || "Séjour en résidence privée", 22, tableY + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Du ${formatDateSafe(booking.checkIn)} au ${formatDateSafe(booking.checkOut)} (${booking.guests || 1} personne(s))`, 22, tableY + 23);

  const loc = `${residence?.address?.city || residence?.city || ''} ${residence?.address?.neighborhood || residence?.neighborhood || ''}`.trim();
  if (loc) {
    doc.text(`Emplacement : ${loc}`, 22, tableY + 28);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${nights}`, 115, tableY + 19);
  doc.text(`${formatCurrency(pricePerNight)} F`, 135, tableY + 19);
  doc.text(`${formatCurrency(totalPrice)} F`, 165, tableY + 19);

  // Row separator
  doc.setDrawColor(226, 232, 240);
  doc.line(18, tableY + 33, 192, tableY + 33);

  // 5. Financial Summary Box
  const summaryY = tableY + 42;
  
  // Left: Reassurance note
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Garantie Sécurisée ResiFaso", 18, summaryY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Paiement protégé par la passerelle officielle Mobile Money.", 18, summaryY + 11);
  doc.text("Validation instantanée & assistance client 7j/7.", 18, summaryY + 16);

  // Right Summary Container
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(107, summaryY, 85, 34, 2, 2, 'FD');

  const advancePaid = Number(booking.advancePaid) || 0;
  const totalPaid = isFullyPaid ? totalPrice : advancePaid;
  const remaining = Math.max(0, totalPrice - totalPaid);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Montant Total Brut :", 112, summaryY + 7);
  doc.setFont("helvetica", "bold");
  doc.text(`${formatCurrency(totalPrice)} F CFA`, 162, summaryY + 7);

  doc.setFont("helvetica", "normal");
  doc.text("Acompte Réglé en Ligne :", 112, summaryY + 14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105); // emerald
  doc.text(`- ${formatCurrency(totalPaid)} F CFA`, 162, summaryY + 14);

  // Line inside summary
  doc.setDrawColor(203, 213, 225);
  doc.line(112, summaryY + 19, 187, summaryY + 19);

  if (remaining > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text("Reste à payer à l'arrivée :", 112, summaryY + 26);
    doc.setFontSize(10.5);
    doc.text(`${formatCurrency(remaining)} F CFA`, 155, summaryY + 26);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105); // emerald
    doc.text("Solde Restant :", 112, summaryY + 26);
    doc.setFontSize(10.5);
    doc.text("0 F CFA (Réglé)", 155, summaryY + 26);
  }

  // 6. Regulatory Footer
  const footerY = 245;
  doc.setDrawColor(226, 232, 240);
  doc.line(18, footerY, 192, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const footerText = remaining > 0
    ? `Note réglementaire : Le solde restant de ${formatCurrency(remaining)} F CFA doit être réglé directement à l'hôte lors de la remise des clés.`
    : "Ce séjour a été intégralement soldé par Mobile Money. Ce document électronique certifié vaut facture et reçu officiel.";
  
  doc.text(footerText, 18, footerY + 6);
  doc.text("ResiFaso S.A. • RCCM BF OUA 2026 • Plateforme Numérique Immobilière du Burkina Faso", 18, footerY + 12);

  return doc;
};
