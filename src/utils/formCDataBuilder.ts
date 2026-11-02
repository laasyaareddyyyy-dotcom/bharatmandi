import { SaleLot, Farmer, MerchantProfile, Expenditures } from '../types';

export interface FormCShopProfileSnapshot {
  shopName: string;
  shopNumber: string;
  marketYardName: string;
  address: string;
  ownerName: string;
  phoneNumber: string;
  licenseNumber?: string;
  gstin?: string;
  logoUrl?: string;
  signatoryLabel?: string;
}

export interface FormCItemData {
  id: string;
  parchiNumber?: string;
  date: string;
  commodity: string;
  flowerVariety: string;
  flowerQuality?: string;
  boxesCount?: number;
  packagingType?: string;
  quantity: number;
  unit: string;
  rate: number;
  grossTotal: number;
  hamali: number;
  transport: number;
  commission: number;
  misc: number;
  farmerNetPayable: number;
}

export interface FormCDeductionItem {
  name: string;
  amount: number;
}

export interface FormCData {
  isPreview: boolean; // Watermark PREVIEW if true
  parchiNumber: string; // SHP-YYYYMMDD-NNN or FC-YYYY-NNNN
  formCNumber: string; // FC-YYYY-NNNN
  date: string;
  time: string;
  
  // Shop profile snapshot
  shopProfile: FormCShopProfileSnapshot;

  // Farmer / Customer Info
  farmer: {
    id: string;
    farmerCode: string;
    name: string;
    village: string;
    phone: string;
  };

  // Line Items
  items: FormCItemData[];

  // Totals & Math
  grossTotal: number;
  transportCharges: number;
  ammaliCharges: number;
  commissionPercent: number;
  commissionAmount: number;
  miscCommissionMode: 'percent' | 'fixed';
  miscCommissionPercent: number;
  miscCommissionAmount: number;
  miscCommissionNote?: string;
  otherDeductions: FormCDeductionItem[];
  totalDeductions: number;
  farmerNetPayable: number;

  // Settlement & Payment
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  amountPaid: number;
  balanceDue: number;
  paymentMode: string;
  paymentReference?: string;
  notes?: string;

  // Formatted Strings for PDF/Print/WhatsApp
  whatsappSummaryText: string;
  pdfFileName: string;
}

export interface BuildFormCOptions {
  lot?: SaleLot | null;
  lots?: SaleLot[] | null;
  draftData?: any | null;
  merchantProfile: MerchantProfile;
  farmer?: Farmer | null;
  farmersList?: Farmer[];
  customSettings?: {
    commissionPercent?: number;
    miscCommissionMode?: 'percent' | 'fixed';
    miscCommissionPercent?: number;
    miscCommissionFixed?: number;
    miscCommissionNote?: string;
    transportCharges?: number;
    ammaliCharges?: number;
    otherDeductions?: FormCDeductionItem[];
    amountPaid?: number;
    paymentStatus?: 'Paid' | 'Partial' | 'Unpaid';
    paymentMode?: string;
    paymentReference?: string;
  };
  isPreview?: boolean;
}

/**
 * Builds a single, unified Form C data snapshot for Canvas, Vector PDF, WhatsApp, and Print.
 */
export function buildFormCData(options: BuildFormCOptions): FormCData {
  const {
    lot,
    lots,
    draftData,
    merchantProfile,
    farmer: inputFarmer,
    farmersList = [],
    customSettings = {},
    isPreview = false,
  } = options;

  // 1. Resolve Shop Profile
  const resolvedYard = merchantProfile.marketYardName?.trim() || 'Wholesale Market Yard';
  const resolvedAddress =
    merchantProfile.address?.trim() ||
    `${merchantProfile.shopNumber ? `Shop No. ${merchantProfile.shopNumber} • ` : ''}${resolvedYard}`;

  const shopSnapshot: FormCShopProfileSnapshot = {
    shopName: (merchantProfile.shopName || 'MANDI WHOLESALE MERCHANT').toUpperCase(),
    shopNumber: merchantProfile.shopNumber || '1',
    marketYardName: resolvedYard,
    address: resolvedAddress,
    ownerName: merchantProfile.ownerName || 'Mandi Trader',
    phoneNumber: merchantProfile.phoneNumber || '+91 9849012345',
    licenseNumber: merchantProfile.licenseNumber?.trim() || undefined,
    gstin: merchantProfile.gstin?.trim() || undefined,
    logoUrl: merchantProfile.logoUrl?.trim() || undefined,
    signatoryLabel: merchantProfile.signatoryLabel?.trim() || `For ${merchantProfile.shopName || 'Mandi Merchant'}`,
  };

  // 2. Resolve Farmer Info
  const sourceName =
    inputFarmer?.name ||
    lot?.farmerName ||
    draftData?.farmerName ||
    (lots && lots[0]?.farmerName) ||
    'General Mandi Farmer';

  const sourcePhone =
    inputFarmer?.phone ||
    lot?.farmerPhone ||
    draftData?.farmerPhone ||
    (lots && lots[0]?.farmerPhone) ||
    '';

  const sourceVillage =
    inputFarmer?.village ||
    lot?.farmerVillage ||
    draftData?.farmerVillage ||
    (lots && lots[0]?.farmerVillage) ||
    'Mandi Catchment';

  // Find farmer match in farmersList if code/id missing
  const matchedFarmer = farmersList.find(
    (f) =>
      (sourcePhone && f.phone.replace(/\D/g, '').slice(-10) === sourcePhone.replace(/\D/g, '').slice(-10)) ||
      f.name.toLowerCase().trim() === sourceName.toLowerCase().trim()
  );

  const farmerCode =
    inputFarmer?.farmerCode ||
    inputFarmer?.id ||
    matchedFarmer?.farmerCode ||
    matchedFarmer?.id ||
    lot?.farmerId ||
    'FRM-0001';

  const farmerData = {
    id: matchedFarmer?.id || inputFarmer?.id || lot?.farmerId || 'FRM-0001',
    farmerCode: farmerCode,
    name: sourceName,
    village: sourceVillage,
    phone: sourcePhone,
  };

  // 3. Resolve Date, Time, and Invoice Numbers
  const today = new Date().toISOString().split('T')[0];
  const dateStr = lot?.date || draftData?.date || (lots && lots[0]?.date) || today;
  const timeStr = lot?.time || draftData?.time || (lots && lots[0]?.time) || 'Morning Auction';

  const rawParchiNumber =
    lot?.parchiNumber ||
    draftData?.parchiNumber ||
    (lots && lots[0]?.parchiNumber) ||
    `SHP-${dateStr.replace(/-/g, '')}-001`;

  const formCNumber = `FC-${dateStr.substring(0, 4)}-${rawParchiNumber.split('-').pop() || '0001'}`;

  // 4. Resolve Line Items
  let itemsData: FormCItemData[] = [];

  if (draftData?.items && draftData.items.length > 0) {
    itemsData = draftData.items.map((it: any, index: number) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      const g = Number(it.grossTotal) || Math.round(q * r);
      return {
        id: it.id || `item-${index + 1}`,
        parchiNumber: rawParchiNumber,
        date: dateStr,
        commodity: it.commodityCategory ? String(it.commodityCategory) : (it.flowerVariety?.toLowerCase().includes('wheat') ? 'Grain' : 'Flower'),
        flowerVariety: it.flowerVariety || 'Standard Variety',
        flowerQuality: it.flowerQuality || 'Good',
        boxesCount: it.boxesCount !== undefined ? Number(it.boxesCount) : undefined,
        packagingType: it.packagingType || 'Boxes',
        quantity: q,
        unit: it.unit || 'Kgs',
        rate: r,
        grossTotal: g,
        hamali: index === 0 ? Number(draftData.ammaliCharges || 0) : 0,
        transport: index === 0 ? Number(draftData.transportCharges || 0) : 0,
        commission: 0,
        misc: 0,
        farmerNetPayable: 0,
      };
    });
  } else if (lots && lots.length > 0) {
    itemsData = lots.map((l, index) => {
      const q = Number(l.quantity) || 0;
      const r = Number(l.rate) || 0;
      const g = Number(l.grossTotal) || Math.round(q * r);
      return {
        id: l.id || `item-${index + 1}`,
        parchiNumber: l.parchiNumber || rawParchiNumber,
        date: l.date || dateStr,
        commodity: l.commodityCategory || (l.flowerVariety?.toLowerCase().includes('wheat') ? 'Grain' : 'Flower'),
        flowerVariety: l.flowerVariety || 'Standard Variety',
        flowerQuality: l.flowerQuality || 'Good',
        boxesCount: l.boxesCount,
        packagingType: l.packagingType || 'Boxes',
        quantity: q,
        unit: l.unit || 'Kgs',
        rate: r,
        grossTotal: g,
        hamali: Number(l.ammaliCharges || 0),
        transport: Number(l.transportCharges || 0),
        commission: Number(l.commissionAmount || 0),
        misc: Number(l.otherExpenditures?.misc || 0),
        farmerNetPayable: Number(l.farmerNetPayable || 0),
      };
    });
  } else {
    const q = Number(lot?.quantity ?? draftData?.quantity ?? 0);
    const r = Number(lot?.rate ?? draftData?.rate ?? 0);
    const g = Number(lot?.grossTotal ?? draftData?.grossTotal ?? Math.round(q * r));
    const variety = lot?.flowerVariety || draftData?.flowerVariety || 'Standard Variety';

    itemsData = [
      {
        id: lot?.id || 'item-1',
        parchiNumber: rawParchiNumber,
        date: dateStr,
        commodity: lot?.commodityCategory || (variety.toLowerCase().includes('wheat') ? 'Grain' : 'Flower'),
        flowerVariety: variety,
        flowerQuality: lot?.flowerQuality || draftData?.flowerQuality || 'Good',
        boxesCount: lot?.boxesCount ?? draftData?.boxesCount,
        packagingType: lot?.packagingType || draftData?.packagingType || 'Boxes',
        quantity: q,
        unit: lot?.unit || draftData?.unit || 'Kgs',
        rate: r,
        grossTotal: g,
        hamali: Number(lot?.ammaliCharges ?? draftData?.ammaliCharges ?? 0),
        transport: Number(lot?.transportCharges ?? draftData?.transportCharges ?? 0),
        commission: Number(lot?.commissionAmount ?? 0),
        misc: Number(lot?.otherExpenditures?.misc ?? 0),
        farmerNetPayable: Number(lot?.farmerNetPayable ?? 0),
      },
    ];
  }

  // 5. Aggregate Financials
  const grossTotal = itemsData.reduce((acc, it) => acc + it.grossTotal, 0);

  const transportCharges =
    customSettings.transportCharges !== undefined
      ? customSettings.transportCharges
      : draftData?.transportCharges !== undefined
      ? Number(draftData.transportCharges)
      : lot?.transportCharges ?? itemsData.reduce((acc, it) => acc + (it.transport || 0), 0);

  const ammaliCharges =
    customSettings.ammaliCharges !== undefined
      ? customSettings.ammaliCharges
      : draftData?.ammaliCharges !== undefined
      ? Number(draftData.ammaliCharges)
      : lot?.ammaliCharges ?? itemsData.reduce((acc, it) => acc + (it.hamali || 0), 0);

  const commissionPercent =
    customSettings.commissionPercent !== undefined
      ? customSettings.commissionPercent
      : draftData?.commissionPercent !== undefined
      ? Number(draftData.commissionPercent)
      : lot?.commissionPercent ?? merchantProfile.defaultCommissionRate ?? 4;

  const commissionAmount = Math.round((grossTotal * commissionPercent) / 100);

  const miscCommissionMode = customSettings.miscCommissionMode || 'percent';
  const miscCommissionPercent =
    customSettings.miscCommissionPercent !== undefined
      ? customSettings.miscCommissionPercent
      : draftData?.miscCommissionPercent ?? lot?.otherExpenditures?.miscPercent ?? 0;

  const miscCommissionFixed =
    customSettings.miscCommissionFixed !== undefined
      ? customSettings.miscCommissionFixed
      : draftData?.miscCommissionAmount ?? lot?.otherExpenditures?.misc ?? 0;

  const miscCommissionAmount =
    miscCommissionMode === 'percent'
      ? Math.round((grossTotal * miscCommissionPercent) / 100)
      : Number(miscCommissionFixed || 0);

  const otherDeductions: FormCDeductionItem[] = customSettings.otherDeductions || [];

  const otherDeductionsSum = otherDeductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const totalDeductions =
    transportCharges + ammaliCharges + commissionAmount + miscCommissionAmount + otherDeductionsSum;

  const farmerNetPayable = Math.max(0, grossTotal - totalDeductions);

  // 6. Payment & Settlement
  const rawStatus = customSettings.paymentStatus || lot?.paymentStatus || draftData?.paymentStatus || 'Paid';
  const rawAmountPaid =
    customSettings.amountPaid !== undefined
      ? customSettings.amountPaid
      : lot?.amountPaid !== undefined
      ? lot.amountPaid
      : draftData?.amountPaid !== undefined
      ? Number(draftData.amountPaid)
      : rawStatus === 'Paid'
      ? farmerNetPayable
      : 0;

  const amountPaid = Math.min(farmerNetPayable, Math.max(0, rawAmountPaid));
  const balanceDue = Math.max(0, farmerNetPayable - amountPaid);

  const paymentStatus: 'Paid' | 'Partial' | 'Unpaid' =
    balanceDue === 0 && amountPaid > 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid';

  const paymentMode = customSettings.paymentMode || lot?.paymentMode || draftData?.paymentMode || 'Cash';
  const paymentReference = customSettings.paymentReference || lot?.paymentReference || '';

  // 7. Clean Filename Format: BharatMandi-FormC-{InvoiceNo}-{FarmerName}.pdf
  const safeFarmerName = sourceName.replace(/[^a-zA-Z0-9]/g, '_');
  const pdfFileName = `BharatMandi-FormC-${rawParchiNumber}-${safeFarmerName}.pdf`;

  // 8. Dynamic WhatsApp Text Summary
  const formattedGross = `₹${grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedNet = `₹${farmerNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const whatsappSummaryText = `FORM C MANDI SALE PARCHI | ${shopSnapshot.shopName}\nInvoice: ${rawParchiNumber}\nFarmer: ${farmerData.name} (${farmerData.farmerCode})\nDate: ${dateStr}\nGross Total: ${formattedGross}\nTotal Deductions: ₹${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nNet Payable: ${formattedNet}\nStatus: ${paymentStatus.toUpperCase()}`;

  return {
    isPreview,
    parchiNumber: rawParchiNumber,
    formCNumber,
    date: dateStr,
    time: timeStr,
    shopProfile: shopSnapshot,
    farmer: farmerData,
    items: itemsData,
    grossTotal,
    transportCharges,
    ammaliCharges,
    commissionPercent,
    commissionAmount,
    miscCommissionMode,
    miscCommissionPercent,
    miscCommissionAmount,
    miscCommissionNote: customSettings.miscCommissionNote || 'Miscellaneous Charges',
    otherDeductions,
    totalDeductions,
    farmerNetPayable,
    paymentStatus,
    amountPaid,
    balanceDue,
    paymentMode,
    paymentReference,
    notes: lot?.notes || draftData?.notes || '',
    whatsappSummaryText,
    pdfFileName,
  };
}
