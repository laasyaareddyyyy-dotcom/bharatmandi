import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormCData } from './formCDataBuilder';
import { FifteenDaySettlement, MerchantProfile } from '../types';

/**
 * Downloads a generated jsPDF document
 */
export function downloadVectorPdf(doc: jsPDF, filename: string): void {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Formats currency to 2 decimal places with Indian locale
 */
export function formatPdfCurrency(amount: number): string {
  const num = Math.abs(Number(amount) || 0);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}₹${formatted}`;
}

/**
 * Generate Vector PDF for OFFICIAL MANDI SALE PARCHI • FORM C
 * Exactly matching the layout, colors, and structure of the Form C PDF.
 */
export function generateVectorParchiPdf(
  data: FormCData,
  options: { autoDownload?: boolean } = { autoDownload: true }
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Draw Watermark if PREVIEW state
  if (data.isPreview) {
    doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(50);
    doc.setTextColor(230, 230, 230);
    doc.text('PREVIEW', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();
  }

  // 1. Header Badges & Shop Info
  // Top left badge: MANDI SALE PARCHI • FORM C
  doc.setFillColor(241, 245, 249); // light grey
  doc.roundedRect(12, 12, 52, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('MANDI SALE PARCHI • FORM C', 14, 16);

  // Top right badge: OFFICIAL MANDI RECEIPT
  doc.setFillColor(230, 244, 234); // light green
  doc.roundedRect(pageWidth - 52, 12, 40, 6, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text('OFFICIAL MANDI RECEIPT', pageWidth - 50, 16);

  // Shop Title & Subtitle
  const { shopProfile } = data;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(shopProfile.shopName, 12, 25);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Shop No. ${shopProfile.shopNumber} • ${shopProfile.marketYardName}`, 12, 30);

  const metaParts: string[] = [`Proprietor: ${shopProfile.ownerName}`, `Contact: ${shopProfile.phoneNumber}`];
  if (shopProfile.licenseNumber) metaParts.push(`Lic: ${shopProfile.licenseNumber}`);
  if (shopProfile.gstin) metaParts.push(`GSTIN: ${shopProfile.gstin}`);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(metaParts.join(' | '), 12, 35);

  // 2. 4-Column Info Card Box
  const cardY = 40;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, cardY, pageWidth - 24, 18, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, cardY, pageWidth - 24, 18, 3, 3, 'D');

  const c1 = 16;
  const c2 = 62;
  const c3 = 110;
  const c4 = 158;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PARCHI / INV NO.', c1, cardY + 5);
  doc.text('DATE & TIME', c2, cardY + 5);
  doc.text('FARMER', c3, cardY + 5);
  doc.text('VILLAGE & CONTACT', c4, cardY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.parchiNumber, c1, cardY + 11);

  doc.setFont('helvetica', 'normal');
  doc.text(`${data.date} • ${data.time}`, c2, cardY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text(data.farmer.name, c3, cardY + 11);

  doc.setFont('helvetica', 'normal');
  doc.text(data.farmer.village || 'Mandi Yard', c4, cardY + 11);

  // 3. Multi-Column Items Table (10 Columns)
  // Columns: PARCHI & DATE | ITEM / CROP | QTY | RATE | GROSS | HAMALI | TRANS | COMM | MISC | NET
  const tableRows = data.items.map((item) => [
    `${item.parchiNumber || data.parchiNumber}\n${item.date || data.date}`,
    item.flowerVariety || 'Standard Variety',
    `${item.quantity} ${item.unit || 'Kgs'}`,
    formatPdfCurrency(item.rate),
    formatPdfCurrency(item.grossTotal),
    formatPdfCurrency(item.hamali),
    formatPdfCurrency(item.transport),
    formatPdfCurrency(item.commission),
    formatPdfCurrency(item.misc),
    formatPdfCurrency(item.farmerNetPayable),
  ]);

  autoTable(doc, {
    startY: cardY + 22,
    margin: { left: 12, right: 12 },
    head: [['PARCHI & DATE', 'ITEM / CROP', 'QTY', 'RATE', 'GROSS', 'HAMALI', 'TRANS', 'COMM', 'MISC', 'NET']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right', textColor: [225, 29, 72] }, // red
      6: { halign: 'right', textColor: [225, 29, 72] }, // red
      7: { halign: 'right', textColor: [225, 29, 72] }, // red
      8: { halign: 'right', textColor: [225, 29, 72] }, // red
      9: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] }, // green
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 5;

  // 4. Gross Total Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, pageWidth - 24, 14, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, pageWidth - 24, 14, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL SALES AMOUNT (GROSS)', 16, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Gross sales turnover before APMC mandi charges and commission', 16, currentY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(data.grossTotal), pageWidth - 16, currentY + 8.5, { align: 'right' });

  currentY += 18;

  // 5. Mandi Charges & Commission Deductions Section (2x2 Grid)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, pageWidth - 24, 42, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, pageWidth - 24, 42, 3, 3, 'D');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MANDI CHARGES & COMMISSION DEDUCTIONS', 16, currentY + 6);

  // Summary badge on top right
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 48, currentY + 2.5, 32, 5, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth - 48, currentY + 2.5, 32, 5, 2, 2, 'D');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('FORM C SUMMARY', pageWidth - 32, currentY + 6, { align: 'center' });

  // Grid row 1
  const boxW = (pageWidth - 40) / 2;

  // Box 1: Freight
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, currentY + 10, boxW, 10, 2, 2, 'F');
  doc.roundedRect(16, currentY + 10, boxW, 10, 2, 2, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Vehicle / Freight', 19, currentY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Transport', 19, currentY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(data.transportCharges), 16 + boxW - 3, currentY + 15.5, { align: 'right' });

  // Box 2: Hamali
  const box2X = 20 + boxW;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, currentY + 10, boxW, 10, 2, 2, 'F');
  doc.roundedRect(box2X, currentY + 10, boxW, 10, 2, 2, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Hamali / Labor', box2X + 3, currentY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Loading & Unloading', box2X + 3, currentY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(data.ammaliCharges), box2X + boxW - 3, currentY + 15.5, { align: 'right' });

  // Grid row 2
  // Box 3: Commission
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, currentY + 22, boxW, 10, 2, 2, 'F');
  doc.roundedRect(16, currentY + 22, boxW, 10, 2, 2, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Mandi Commission', 19, currentY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Standard', 19, currentY + 29.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(225, 29, 72); // red
  doc.text(`-${formatPdfCurrency(data.commissionAmount)}`, 16 + boxW - 3, currentY + 27.5, { align: 'right' });

  // Box 4: Misc
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, currentY + 22, boxW, 10, 2, 2, 'F');
  doc.roundedRect(box2X, currentY + 22, boxW, 10, 2, 2, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Misc Charges', box2X + 3, currentY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Market Fee', box2X + 3, currentY + 29.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(225, 29, 72); // red
  doc.text(`-${formatPdfCurrency(data.miscCommissionAmount)}`, box2X + boxW - 3, currentY + 27.5, { align: 'right' });

  // Highlight bar at bottom of Deductions box
  doc.setFillColor(254, 242, 242); // light pink/rose
  doc.roundedRect(16, currentY + 34, pageWidth - 32, 6, 2, 2, 'F');
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(16, currentY + 34, pageWidth - 32, 6, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL DEDUCTIONS (Freight + Hamali + Comm + Misc):', 19, currentY + 38);

  doc.setTextColor(225, 29, 72);
  doc.text(`-${formatPdfCurrency(data.totalDeductions)}`, pageWidth - 19, currentY + 38, { align: 'right' });

  currentY += 46;

  // 6. Net Payable Banner (Solid Dark Green Box)
  doc.setFillColor(4, 120, 87); // #047857 dark green
  doc.roundedRect(12, currentY, pageWidth - 24, 15, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAYABLE TO FARMER:', 16, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(209, 250, 229); // light green text
  doc.text(
    `Gross Total (${formatPdfCurrency(data.grossTotal)}) - Total Deductions (${formatPdfCurrency(data.totalDeductions)})`,
    16,
    currentY + 10.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(formatPdfCurrency(data.farmerNetPayable), pageWidth - 16, currentY + 9.5, { align: 'right' });

  currentY += 19;

  // 7. Settlement Status & Authorization Cards (Side by Side)
  const cardW = (pageWidth - 28) / 2;

  // Left Card: Settlement Status
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, cardW, 25, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, cardW, 25, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('SETTLEMENT STATUS', 15, currentY + 5);

  // Status Badge
  doc.setFillColor(254, 226, 226); // red tint if unpaid
  doc.roundedRect(12 + cardW - 20, currentY + 2, 16, 4.5, 2, 2, 'F');
  doc.setFontSize(6);
  doc.setTextColor(185, 28, 28);
  doc.text(data.paymentStatus.toUpperCase(), 12 + cardW - 12, currentY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Payments / Advances:', 15, currentY + 11);
  doc.text('Payment Mode:', 15, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(data.amountPaid), 12 + cardW - 4, currentY + 11, { align: 'right' });
  doc.text(data.paymentMode.toUpperCase(), 12 + cardW - 4, currentY + 16, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, currentY + 18.5, 12 + cardW - 4, currentY + 18.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Final Balance Due:', 15, currentY + 22.5);

  doc.setTextColor(4, 120, 87); // green
  doc.text(formatPdfCurrency(data.balanceDue), 12 + cardW - 4, currentY + 22.5, { align: 'right' });

  // Right Card: Authorization & Seal
  const card2X = 16 + cardW;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card2X, currentY, cardW, 25, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card2X, currentY, cardW, 25, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('AUTHORIZATION & SEAL', card2X + cardW - 4, currentY + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(shopProfile.signatoryLabel || `For ${shopProfile.shopName}`, card2X + cardW - 4, currentY + 18, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Authorized Signatory / Mandi Licensee)', card2X + cardW - 4, currentY + 21.5, { align: 'right' });

  // 8. Footer
  currentY += 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL MANDI SALE PARCHI • FORM C •', pageWidth / 2, currentY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via भारत MANDI Software • Valid Settlement Bill', pageWidth / 2, currentY + 3.5, {
    align: 'center',
  });

  if (options.autoDownload) {
    downloadVectorPdf(doc, data.pdfFileName);
  }

  return doc;
}

/**
 * Generate Vector PDF for 15-Day Settlement Statement
 */
export function generateVectorSettlementPdf(
  settlement: FifteenDaySettlement,
  merchant: MerchantProfile,
  options: { autoDownload?: boolean } = { autoDownload: true }
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Box
  doc.setFillColor(239, 246, 255);
  doc.rect(10, 10, pageWidth - 20, 32, 'F');
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, 32, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(29, 78, 216);
  doc.text('OFFICIAL 15-DAY FARMER SETTLEMENT STATEMENT', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(`Period: ${settlement.periodLabel || '15-Day Cycle'}`, pageWidth / 2, 24, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(`${merchant.shopName || 'Mandi Merchant Shop'} • Lic #${merchant.licenseNumber || 'MND-01'}`, pageWidth / 2, 30, { align: 'center' });

  // Meta Info
  const startY = 48;
  doc.setFontSize(10);
  doc.text(`Settlement No: ${settlement.settlementNumber}`, 14, startY);
  doc.text(`Farmer Name: ${settlement.farmerName}`, pageWidth / 2 + 5, startY);

  doc.text(`Village: ${settlement.farmerVillage || 'N/A'}`, 14, startY + 6);
  doc.text(`Phone: +91 ${settlement.farmerPhone || 'N/A'}`, pageWidth / 2 + 5, startY + 6);

  doc.text(`Total Shipments: ${settlement.totalShipmentsCount}`, 14, startY + 12);
  doc.text(`Status: ${(settlement.status || 'PENDING').toUpperCase()}`, pageWidth / 2 + 5, startY + 12);

  // Financial Breakdown
  const tableData = [
    ['Total Gross Sales Volume', formatPdfCurrency(settlement.totalGross)],
    ['Less: Total Transport Charges', `- ${formatPdfCurrency(settlement.totalTransport)}`],
    ['Less: Total Hamali / Loading Charges', `- ${formatPdfCurrency(settlement.totalHamali)}`],
    ['Subtotal After Daily Charges', formatPdfCurrency(settlement.subtotalAfterCharges)],
    [`Less: Mandi Commission (${settlement.commissionPercent}%)`, `- ${formatPdfCurrency(settlement.commissionAmount)}`],
    [`Less: Misc / Cess (${settlement.miscPercent || 0}%)`, `- ${formatPdfCurrency(settlement.miscAmount || 0)}`],
    ['Final Settlement Net Payable', formatPdfCurrency(settlement.finalPayment)],
  ];

  autoTable(doc, {
    startY: startY + 18,
    head: [['Settlement Ledger Item', 'Amount (₹)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  const footerY = (doc as any).lastAutoTable.finalY + 20;

  // Signatures
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Farmer Receipt Acknowledgment', 20, footerY);
  doc.text('Authorized Mandi Adathiya Stamp', pageWidth - 70, footerY);

  doc.setLineWidth(0.3);
  doc.line(20, footerY + 8, 70, footerY + 8);
  doc.line(pageWidth - 70, footerY + 8, pageWidth - 20, footerY + 8);

  const filename = `Settlement-${settlement.settlementNumber}.pdf`;
  if (options.autoDownload) {
    downloadVectorPdf(doc, filename);
  }

  return doc;
}
