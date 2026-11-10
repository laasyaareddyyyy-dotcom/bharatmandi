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
 * Formats currency to 2 decimal places with Indian locale grouping (WinAnsi / ASCII safe)
 * e.g. 1,25,000.00 (NEVER outputs raw Unicode '₹' character inside jsPDF to avoid string encoding corruption)
 */
export function formatRs(amount: number): string {
  const num = Math.abs(Number(amount) || 0);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${formatted}`;
}

/**
 * Legacy alias for backwards compatibility
 */
export const formatPdfCurrency = formatRs;

/**
 * Helper to draw standard A4 document canvas chrome border (radius 3.5mm)
 */
function drawPageChrome(doc: jsPDF): void {
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.setLineWidth(0.35);
  doc.roundedRect(6, 6, 198, 285, 3.5, 3.5, 'D');
}

/**
 * Helper to draw standard document header (Top Banner Y: 10mm to 29mm)
 */
function drawDocumentHeader(
  doc: jsPDF,
  data: FormCData,
  docTypeTitle: string = 'MANDI SALE PARCHI • FORM C',
  topRightBadgeText: string = 'OFFICIAL MANDI RECEIPT'
): void {
  const { shopProfile } = data;

  // Draw Trader Logo Avatar / Icon Canvas at (x: 12, y: 11)
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.circle(18, 17, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('BM', 18, 19.5, { align: 'center' });

  // Top sub-pill badge: e.g. MANDI SALE PARCHI • FORM C
  doc.setFillColor(226, 232, 240); // #E2E8F0
  doc.roundedRect(27, 11, 56, 4.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105); // #475569
  doc.text(docTypeTitle, 29, 14.2);

  // Top right status pill: OFFICIAL MANDI RECEIPT
  doc.setFillColor(236, 253, 245); // #ECFDF5 soft green
  doc.roundedRect(148, 11, 48, 6, 2.5, 2.5, 'F');
  doc.setDrawColor(134, 239, 172); // #86EFAC
  doc.setLineWidth(0.3);
  doc.roundedRect(148, 11, 48, 6, 2.5, 2.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(11, 107, 71); // #0B6B47 forest green
  doc.text(topRightBadgeText, 172, 15, { align: 'center' });

  // Business/Trader Title
  const shopNameStr = (shopProfile.shopName || 'BHARAT MANDI').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(shopNameStr, 27, 19.5);

  // Mandi Address & Contact
  const line1 = shopProfile.address || (shopProfile.marketYardName ? `Shop No. ${shopProfile.shopNumber || '1'} • ${shopProfile.marketYardName}` : `Shop No. ${shopProfile.shopNumber || '1'} • APMC Market Yard`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139); // #64748B
  doc.text(line1, 27, 24);

  const metaParts: string[] = [];
  if (shopProfile.ownerName) metaParts.push(`Prop: ${shopProfile.ownerName}`);
  metaParts.push(`Ph: ${shopProfile.phoneNumber || '+91 9849012345'}`);
  if (shopProfile.licenseNumber) metaParts.push(`Lic: ${shopProfile.licenseNumber}`);
  if (shopProfile.gstin) metaParts.push(`GSTIN: ${shopProfile.gstin}`);
  doc.text(metaParts.join(' | '), 27, 28);

  // Horizontal Divider Line at y = 29.5mm
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.line(12, 29.5, 198, 29.5);
}

/**
 * Draw 4-Column Metadata Card (Y: 32mm to 45mm)
 */
function drawInfoCard(doc: jsPDF, data: FormCData): void {
  const cardY = 32;
  const cardH = 13;
  const cardW = 186;

  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.roundedRect(12, cardY, cardW, cardH, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, cardY, cardW, cardH, 2.5, 2.5, 'D');

  const c1 = 16;
  const c2 = 62;
  const c3 = 110;
  const c4 = 158;

  // Column Labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('PARCHI / INV NO.', c1, cardY + 4.5);
  doc.text('DATE & TIME', c2, cardY + 4.5);
  doc.text('FARMER NAME', c3, cardY + 4.5);
  doc.text('VILLAGE & CONTACT', c4, cardY + 4.5);

  // Column Values
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.parchiNumber, c1, cardY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${data.date} • ${data.time}`, c2, cardY + 9.5);

  doc.setFont('helvetica', 'bold');
  const farmerCodeTag = data.farmer.farmerCode ? ` (${data.farmer.farmerCode})` : '';
  doc.text(`${data.farmer.name}${farmerCodeTag}`, c3, cardY + 9.5);

  doc.setFont('helvetica', 'normal');
  const villageContact = `${data.farmer.village || 'Mandi Yard'}${data.farmer.phone ? ' • ' + data.farmer.phone : ''}`;
  doc.text(villageContact, c4, cardY + 9.5);
}

/**
 * Generate Vector PDF for OFFICIAL MANDI SALE PARCHI • FORM C
 * Exactly matching the layout, colors, geometry, and structure of Form C PDF.
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

  // Draw Watermark if PREVIEW state
  if (data.isPreview) {
    doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(50);
    doc.setTextColor(230, 230, 230);
    doc.text('PREVIEW', pageWidth / 2, 140, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();
  }

  // 1. Draw Page Outer Chrome Border
  drawPageChrome(doc);

  // 2. Draw Top Header Banner
  drawDocumentHeader(doc, data, 'MANDI SALE PARCHI • FORM C', 'OFFICIAL MANDI RECEIPT');

  // 3. Draw 4-Column Farmer Metadata Card
  drawInfoCard(doc, data);

  // 4. Draw 8-Column Commodity Table using jspdf-autotable
  // Columns: PARCHI & DATE | ITEM / CROP | BOXES | QTY (KGS) | RATE | GROSS (INR) | COMM (INR) | NET (INR)
  const rowCount = data.items.length;

  // Dynamic font and cell padding scaling based on row count
  let fontSz = 7.2;
  let cellPad = 1.4;
  if (rowCount >= 15) {
    fontSz = 5.6;
    cellPad = 0.55;
  } else if (rowCount >= 8) {
    fontSz = 6.4;
    cellPad = 0.9;
  }

  const tableRows = data.items.map((item) => [
    `${item.parchiNumber || data.parchiNumber}\n${item.date || data.date}`,
    `${item.flowerVariety || 'Standard Variety'}${item.flowerQuality ? ' (' + item.flowerQuality + ')' : ''}`,
    item.boxesCount !== undefined && item.boxesCount !== null ? String(item.boxesCount) : '—',
    `${item.quantity} ${item.unit || 'Kgs'}`,
    formatRs(item.rate),
    formatRs(item.grossTotal),
    item.commission > 0 ? `-${formatRs(item.commission)}` : '0.00',
    formatRs(item.farmerNetPayable || (item.grossTotal - (item.commission + item.hamali + item.transport + item.misc))),
  ]);

  autoTable(doc, {
    startY: 47,
    margin: { left: 12, right: 12 },
    head: [['PARCHI & DATE', 'ITEM / CROP', 'BOXES', 'QTY (KGS)', 'RATE', 'GROSS (INR)', 'COMM (INR)', 'NET (INR)']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: fontSz,
      cellPadding: cellPad + 0.4,
    },
    styles: {
      fontSize: fontSz,
      cellPadding: cellPad,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      6: { cellWidth: 14, halign: 'right', textColor: [196, 0, 0] }, // crimson red
      7: { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [11, 107, 71] }, // forest green
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 4;

  // Multi-page Safety Check:
  // Check if financial summary cards (total ~93mm) will overflow standard A4 printable area (280mm)
  if (currentY + 93 > 280) {
    doc.addPage();
    drawPageChrome(doc);
    currentY = 24;
  }

  // 5. Total Gross Sales Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, 186, 11.5, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, 186, 11.5, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL SALES AMOUNT (GROSS)', 16, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Gross sales turnover before APMC mandi charges and commission', 16, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRs(data.grossTotal), 194, currentY + 8, { align: 'right' });

  currentY += 15.5;

  // 6. Mandi Charges & Commission Deductions Section (2x2 Grid + Pink Callout Bar)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, 186, 42, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, 186, 42, 2.5, 2.5, 'D');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MANDI CHARGES & COMMISSION DEDUCTIONS', 16, currentY + 6);

  // Summary badge on top right
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(154, currentY + 2.5, 40, 5, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(154, currentY + 2.5, 40, 5, 1.5, 1.5, 'D');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('FORM C DEDUCTIONS', 174, currentY + 6, { align: 'center' });

  // Grid Row 1 (y: currentY + 10, h: 10mm)
  const boxW = 88;

  // Box 1: Freight / Vehicle
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, currentY + 10, boxW, 10, 1.5, 1.5, 'F');
  doc.roundedRect(16, currentY + 10, boxW, 10, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Vehicle / Freight', 19, currentY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Transport Charges', 19, currentY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRs(data.transportCharges), 16 + boxW - 3, currentY + 15.5, { align: 'right' });

  // Box 2: Hamali / Labor
  const box2X = 106;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, currentY + 10, boxW, 10, 1.5, 1.5, 'F');
  doc.roundedRect(box2X, currentY + 10, boxW, 10, 1.5, 1.5, 'D');
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
  doc.text(formatRs(data.ammaliCharges), box2X + boxW - 3, currentY + 15.5, { align: 'right' });

  // Grid Row 2 (y: currentY + 22, h: 10mm)
  // Box 3: Commission
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, currentY + 22, boxW, 10, 1.5, 1.5, 'F');
  doc.roundedRect(16, currentY + 22, boxW, 10, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Mandi Commission', 19, currentY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.commissionPercent}% Gross Sales`, 19, currentY + 29.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(196, 0, 0); // crimson red
  doc.text(`-${formatRs(data.commissionAmount)}`, 16 + boxW - 3, currentY + 27.5, { align: 'right' });

  // Box 4: Misc
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, currentY + 22, boxW, 10, 1.5, 1.5, 'F');
  doc.roundedRect(box2X, currentY + 22, boxW, 10, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Misc Charges', box2X + 3, currentY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(data.miscCommissionMode === 'percent' ? `${data.miscCommissionPercent || 0}% Cess` : 'Fixed Misc', box2X + 3, currentY + 29.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(196, 0, 0); // crimson red
  doc.text(`-${formatRs(data.miscCommissionAmount)}`, box2X + boxW - 3, currentY + 27.5, { align: 'right' });

  // Pink Highlight Bar at bottom of Deductions box
  doc.setFillColor(254, 242, 242); // #FEF2F2 light pink/rose
  doc.roundedRect(16, currentY + 34, 178, 6, 1.5, 1.5, 'F');
  doc.setDrawColor(254, 205, 211); // #FECDD3
  doc.roundedRect(16, currentY + 34, 178, 6, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL DEDUCTIONS (Freight + Hamali + Comm + Misc):', 19, currentY + 38);

  doc.setTextColor(196, 0, 0);
  doc.text(`-${formatRs(data.totalDeductions)}`, 191, currentY + 38, { align: 'right' });

  currentY += 46;

  // 7. Hero Net Payable Banner (Solid Forest Green Box #0B6B47)
  doc.setFillColor(11, 107, 71); // #0B6B47
  doc.roundedRect(12, currentY, 186, 12.5, 2.5, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAYABLE TO FARMER:', 16, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(209, 250, 229); // #D1FAE5 light green subtitle
  doc.text(
    `Gross Total (${formatRs(data.grossTotal)}) - Total Deductions (${formatRs(data.totalDeductions)})`,
    16,
    currentY + 9.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(formatRs(data.farmerNetPayable), 194, currentY + 8.5, { align: 'right' });

  currentY += 16.5;

  // 8. Settlement Status & Authorization Cards (Side by Side)
  const cardW = 91;

  // Left Card: Settlement Status
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, cardW, 22, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, cardW, 22, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('SETTLEMENT STATUS', 15, currentY + 5);

  // Status Badge
  const isPaid = data.paymentStatus === 'Paid';
  const isPartial = data.paymentStatus === 'Partial';
  const badgeBg = isPaid ? [236, 253, 245] : isPartial ? [255, 251, 235] : [254, 242, 242];
  const badgeTxt = isPaid ? [11, 107, 71] : isPartial ? [180, 83, 9] : [196, 0, 0];

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(12 + cardW - 25, currentY + 2, 21, 4.5, 1.5, 1.5, 'F');
  doc.setFontSize(6);
  doc.setTextColor(badgeTxt[0], badgeTxt[1], badgeTxt[2]);
  doc.text(data.paymentStatus.toUpperCase(), 12 + cardW - 14.5, currentY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Payments / Advances:', 15, currentY + 10);
  doc.text('Payment Mode:', 15, currentY + 14.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatRs(data.amountPaid), 12 + cardW - 4, currentY + 10, { align: 'right' });
  doc.text(data.paymentMode.toUpperCase(), 12 + cardW - 4, currentY + 14.5, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, currentY + 16.5, 12 + cardW - 4, currentY + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Final Balance Due:', 15, currentY + 20);

  doc.setTextColor(data.balanceDue === 0 ? 11 : 196, data.balanceDue === 0 ? 107 : 0, data.balanceDue === 0 ? 71 : 0);
  doc.text(formatRs(data.balanceDue), 12 + cardW - 4, currentY + 20, { align: 'right' });

  // Right Card: Authorization & Seal
  const card2X = 107;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card2X, currentY, cardW, 22, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card2X, currentY, cardW, 22, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('AUTHORIZATION & SEAL', card2X + cardW - 4, currentY + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(data.shopProfile.signatoryLabel || `For ${data.shopProfile.shopName}`, card2X + cardW - 4, currentY + 15.5, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Authorized Signatory / Mandi Licensee)', card2X + cardW - 4, currentY + 19, { align: 'right' });

  // 9. Fixed Footer at bottom (Y = 284mm)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(12, 282, 198, 282);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL MANDI SALE PARCHI • FORM C •', pageWidth / 2, 285.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via Bharat MANDI Software • Valid Settlement Bill', pageWidth / 2, 289, {
    align: 'center',
  });

  if (options.autoDownload) {
    downloadVectorPdf(doc, data.pdfFileName);
  }

  return doc;
}

/**
 * Generate Vector PDF for Farmer Khata Ledger Statement using exact same Form C geometry
 */
export function generateVectorKathaPdf(
  data: FormCData,
  options: { autoDownload?: boolean } = { autoDownload: true }
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Watermark if preview
  if (data.isPreview) {
    doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(50);
    doc.setTextColor(230, 230, 230);
    doc.text('PREVIEW', pageWidth / 2, 140, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  // Chrome, Header, Info Card
  drawPageChrome(doc);
  drawDocumentHeader(doc, data, 'FARMER KHATA LEDGER STATEMENT', 'OFFICIAL KHATA LEDGER');
  drawInfoCard(doc, data);

  // 8-Column Table
  const rowCount = data.items.length;
  let fontSz = 7.2;
  let cellPad = 1.4;
  if (rowCount >= 15) {
    fontSz = 5.6;
    cellPad = 0.55;
  } else if (rowCount >= 8) {
    fontSz = 6.4;
    cellPad = 0.9;
  }

  const tableRows = data.items.map((item) => [
    `${item.parchiNumber || data.parchiNumber}\n${item.date || data.date}`,
    `${item.flowerVariety || 'Standard Variety'}${item.flowerQuality ? ' (' + item.flowerQuality + ')' : ''}`,
    item.boxesCount !== undefined && item.boxesCount !== null ? String(item.boxesCount) : '—',
    `${item.quantity} ${item.unit || 'Kgs'}`,
    formatRs(item.rate),
    formatRs(item.grossTotal),
    item.commission > 0 ? `-${formatRs(item.commission)}` : '0.00',
    formatRs(item.farmerNetPayable || (item.grossTotal - (item.commission + item.hamali + item.transport + item.misc))),
  ]);

  autoTable(doc, {
    startY: 47,
    margin: { left: 12, right: 12 },
    head: [['PARCHI & DATE', 'ITEM / CROP', 'BOXES', 'QTY (KGS)', 'RATE', 'GROSS (INR)', 'COMM (INR)', 'NET (INR)']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: fontSz,
      cellPadding: cellPad + 0.4,
    },
    styles: {
      fontSize: fontSz,
      cellPadding: cellPad,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      6: { cellWidth: 14, halign: 'right', textColor: [196, 0, 0] },
      7: { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [11, 107, 71] },
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 4;

  if (currentY + 93 > 280) {
    doc.addPage();
    drawPageChrome(doc);
    currentY = 24;
  }

  // Gross Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, 186, 11.5, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, 186, 11.5, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL STATEMENT SALES (GROSS)', 16, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Gross sales turnover accumulated for farmer account', 16, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRs(data.grossTotal), 194, currentY + 8, { align: 'right' });

  currentY += 15.5;

  // Deductions Grid
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, 186, 42, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, 186, 42, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MANDI DEDUCTIONS SUMMARY', 16, currentY + 6);

  const boxW = 88;
  const box2X = 106;

  // Row 1
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, currentY + 10, boxW, 10, 1.5, 1.5, 'F');
  doc.roundedRect(16, currentY + 10, boxW, 10, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Freight / Vehicle', 19, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(formatRs(data.transportCharges), 16 + boxW - 3, currentY + 15.5, { align: 'right' });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, currentY + 10, boxW, 10, 1.5, 1.5, 'F');
  doc.roundedRect(box2X, currentY + 10, boxW, 10, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Hamali / Labor', box2X + 3, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(formatRs(data.ammaliCharges), box2X + boxW - 3, currentY + 15.5, { align: 'right' });

  // Row 2
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, currentY + 22, boxW, 10, 1.5, 1.5, 'F');
  doc.roundedRect(16, currentY + 22, boxW, 10, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Mandi Commission', 19, currentY + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(196, 0, 0);
  doc.text(`-${formatRs(data.commissionAmount)}`, 16 + boxW - 3, currentY + 27.5, { align: 'right' });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, currentY + 22, boxW, 10, 1.5, 1.5, 'F');
  doc.roundedRect(box2X, currentY + 22, boxW, 10, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Misc Charges', box2X + 3, currentY + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(196, 0, 0);
  doc.text(`-${formatRs(data.miscCommissionAmount)}`, box2X + boxW - 3, currentY + 27.5, { align: 'right' });

  // Callout
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(16, currentY + 34, 178, 6, 1.5, 1.5, 'F');
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(16, currentY + 34, 178, 6, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL DEDUCTIONS ACCUMULATED:', 19, currentY + 38);
  doc.setTextColor(196, 0, 0);
  doc.text(`-${formatRs(data.totalDeductions)}`, 191, currentY + 38, { align: 'right' });

  currentY += 46;

  // Hero Banner
  doc.setFillColor(11, 107, 71);
  doc.roundedRect(12, currentY, 186, 12.5, 2.5, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET ACCUMULATED FARMER PAYABLE:', 16, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(209, 250, 229);
  doc.text(`Statement Gross Total (${formatRs(data.grossTotal)}) - Deductions (${formatRs(data.totalDeductions)})`, 16, currentY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(formatRs(data.farmerNetPayable), 194, currentY + 8.5, { align: 'right' });

  currentY += 16.5;

  // Split Cards
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, currentY, 91, 22, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, currentY, 91, 22, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('ACCOUNT BALANCE SUMMARY', 15, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Paid / Disbursed:', 15, currentY + 10);
  doc.text('Current Account Status:', 15, currentY + 14.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatRs(data.amountPaid), 99, currentY + 10, { align: 'right' });
  doc.text(data.paymentStatus.toUpperCase(), 99, currentY + 14.5, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, currentY + 16.5, 99, currentY + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Net Balance Outstanding:', 15, currentY + 20);

  doc.setTextColor(data.balanceDue === 0 ? 11 : 196, data.balanceDue === 0 ? 107 : 0, data.balanceDue === 0 ? 71 : 0);
  doc.text(formatRs(data.balanceDue), 99, currentY + 20, { align: 'right' });

  const card2X = 107;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card2X, currentY, 91, 22, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card2X, currentY, 91, 22, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('TRADER ACKNOWLEDGMENT', card2X + 87, currentY + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(data.shopProfile.signatoryLabel || `For ${data.shopProfile.shopName}`, card2X + 87, currentY + 15.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Authorized Mandi Trader Signature)', card2X + 87, currentY + 19, { align: 'right' });

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(12, 282, 198, 282);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('FARMER KHATA LEDGER STATEMENT • BHARAT MANDI •', pageWidth / 2, 285.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via Bharat MANDI Software • Official Account Summary', pageWidth / 2, 289, { align: 'center' });

  const filename = data.pdfFileName.replace(/^FormC-/, 'Khata-Statement-');
  if (options.autoDownload) {
    downloadVectorPdf(doc, filename);
  }

  return doc;
}

/**
 * Generate Vector PDF for 15-Day Settlement Statement (Legacy support wrapper)
 */
export function generateVectorSettlementPdf(
  settlement: FifteenDaySettlement,
  merchant: MerchantProfile,
  options: { autoDownload?: boolean } = { autoDownload: true }
): jsPDF {
  const formCData: FormCData = {
    isPreview: false,
    parchiNumber: settlement.settlementNumber,
    formCNumber: settlement.settlementNumber,
    date: settlement.periodLabel || new Date().toISOString().split('T')[0],
    time: 'Cycle Summary',
    shopProfile: {
      shopName: (merchant.shopName || 'BHARAT MANDI').toUpperCase(),
      shopNumber: merchant.shopNumber || '1',
      marketYardName: merchant.marketYardName || 'APMC Yard',
      address: merchant.address || '',
      ownerName: merchant.ownerName || '',
      phoneNumber: merchant.phoneNumber || '+91 9849012345',
      licenseNumber: merchant.licenseNumber,
      gstin: merchant.gstin,
      signatoryLabel: `For ${merchant.shopName || 'BHARAT MANDI'}`,
    },
    farmer: {
      id: settlement.farmerId || 'FRM-01',
      farmerCode: settlement.farmerId || 'FRM-01',
      name: settlement.farmerName,
      village: settlement.farmerVillage || 'Mandi Yard',
      phone: settlement.farmerPhone || '',
    },
    items: [
      {
        id: '1',
        parchiNumber: settlement.settlementNumber,
        date: settlement.periodLabel || '15-Day Cycle',
        commodity: 'Flower',
        flowerVariety: `Consignment Shipments (${settlement.totalShipmentsCount || 1} lots)`,
        quantity: settlement.totalGross || 0,
        unit: 'Units',
        rate: 1,
        grossTotal: settlement.totalGross,
        hamali: settlement.totalHamali,
        transport: settlement.totalTransport,
        commission: settlement.commissionAmount,
        misc: settlement.miscAmount || 0,
        farmerNetPayable: settlement.finalPayment,
      },
    ],
    grossTotal: settlement.totalGross,
    transportCharges: settlement.totalTransport,
    ammaliCharges: settlement.totalHamali,
    commissionPercent: settlement.commissionPercent,
    commissionAmount: settlement.commissionAmount,
    miscCommissionMode: 'percent',
    miscCommissionPercent: settlement.miscPercent || 0,
    miscCommissionAmount: settlement.miscAmount || 0,
    otherDeductions: [],
    totalDeductions: settlement.totalTransport + settlement.totalHamali + settlement.commissionAmount + (settlement.miscAmount || 0),
    farmerNetPayable: settlement.finalPayment,
    paymentStatus: (settlement.status === 'settled' ? 'Paid' : 'Unpaid'),
    amountPaid: settlement.status === 'settled' ? settlement.finalPayment : 0,
    balanceDue: settlement.status === 'settled' ? 0 : settlement.finalPayment,
    paymentMode: 'Bank Transfer',
    whatsappSummaryText: `SETTLEMENT ${settlement.settlementNumber} | ${settlement.farmerName}`,
    pdfFileName: `Settlement-${settlement.settlementNumber}.pdf`,
  };

  return generateVectorKathaPdf(formCData, options);
}
