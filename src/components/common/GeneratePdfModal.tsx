import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  ArrowLeft,
  Printer,
  Download,
  Share2,
  Copy,
  CheckCircle,
  Calculator,
  Percent,
  Receipt,
  FileText,
  Sliders,
  ShieldCheck,
  Building,
  User,
  Phone,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  CreditCard,
  Check,
  Clock,
  Package,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { SaleLot, Expenditures, ShipmentItem, WeightUnit, FlowerQuality, CommodityCategory } from '../../types';
import {
  exportElementToPdf,
  printHtmlViaIframe,
  sharePdfFile,
  createPdfFile,
  canSharePdfFile,
  acquireGlobalShareLock,
  releaseGlobalShareLock,
} from '../../utils/pdfExport';
import { FormCInvoiceCanvas, FormCInvoiceData } from './FormCInvoiceCanvas';
import { buildFormCData, FormCData } from '../../utils/formCDataBuilder';
import { generateVectorParchiPdf } from '../../utils/vectorPdf';

export interface FormCItemRow {
  id?: string;
  commodityCategory?: CommodityCategory;
  flowerVariety: string;
  flowerQuality?: string;
  quantity: number;
  unit: string;
  boxesCount?: number;
  packagingType?: string;
  rate: number;
  grossTotal: number;
}

interface GeneratePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  lot?: SaleLot | null;
  lots?: SaleLot[] | null;
  draftData?: {
    farmerName?: string;
    farmerVillage?: string;
    farmerPhone?: string;
    flowerVariety?: string;
    flowerQuality?: string;
    quantity?: number;
    unit?: string;
    boxesCount?: number;
    packagingType?: string;
    rate?: number;
    grossTotal?: number;
    transportCharges?: number;
    ammaliCharges?: number;
    commissionPercent?: number;
    commissionAmount?: number;
    miscCommissionPercent?: number;
    miscCommissionAmount?: number;
    date?: string;
    time?: string;
    parchiNumber?: string;
    amountPaid?: number;
    paymentMode?: string;
    paymentStatus?: string;
    notes?: string;
    items?: FormCItemRow[];
  } | null;
  onFinalize?: (calculatedLot: Partial<SaleLot>) => void;
}

interface StandardDeductionOption {
  id: string;
  name: string;
  nameTe: string;
  defaultAmount: number;
  selected: boolean;
  amount: number;
}

export const GeneratePdfModal: React.FC<GeneratePdfModalProps> = ({
  isOpen,
  onClose,
  lot,
  lots,
  draftData,
  onFinalize,
}) => {
  const { merchantProfile, updateSaleLot, t, shipments, farmers, language, addFarmer, addShipment, userCommodities } = useMandi();
  const pdfPrintAreaRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string>('');
  const [pdfLayoutFormat, setPdfLayoutFormat] = useState<'a4' | 'thermal-80mm'>('a4');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Check if this lot is part of or synthesized from a multi-variety sale/shipment
  const linkedShipment = lot?.shipmentId ? shipments.find((s) => s.id === lot.shipmentId) : null;

  // Resolve ALL saved records / items
  const resolvedItems: FormCItemRow[] = useMemo(() => {
    // 1. If draftData contains item rows (e.g. from NewSaleView with multiple varieties)
    if (draftData?.items && draftData.items.length > 0) {
      return draftData.items.map((it) => ({
        id: it.id || `item-${Math.random()}`,
        flowerVariety: it.flowerVariety || 'Standard Variety',
        flowerQuality: it.flowerQuality || 'Good',
        quantity: Number(it.quantity) || 0,
        unit: it.unit || 'Kgs',
        boxesCount: it.boxesCount !== undefined && it.boxesCount !== null
          ? Number(it.boxesCount)
          : ((it as any).packagingCount !== undefined && (it as any).packagingCount !== null ? Number((it as any).packagingCount) : undefined),
        packagingType: it.packagingType || 'Boxes',
        rate: Number(it.rate) || 0,
        grossTotal: Number(it.grossTotal) || Math.round((Number(it.quantity) || 0) * (Number(it.rate) || 0)),
      }));
    }

    // 2. If lot is linked to a multi-variety sale/shipment
    if (linkedShipment && linkedShipment.items && linkedShipment.items.length > 0) {
      return linkedShipment.items.map((it) => ({
        id: it.id,
        flowerVariety: it.flowerVariety,
        flowerQuality: it.flowerQuality || 'Good',
        quantity: Number(it.quantity) || 0,
        unit: it.unit || 'Kgs',
        boxesCount: it.boxesCount !== undefined && it.boxesCount !== null
          ? Number(it.boxesCount)
          : ((it as any).packagingCount !== undefined && (it as any).packagingCount !== null ? Number((it as any).packagingCount) : undefined),
        packagingType: it.packagingType || 'Boxes',
        rate: Number(it.rate) || 0,
        grossTotal: Number(it.grossTotal) || Math.round(Number(it.quantity) * Number(it.rate)),
      }));
    }

    // 3. If an array of lots was passed (e.g., all lots for this farmer/session)
    if (lots && lots.length > 0) {
      return lots.map((l) => ({
        id: l.id,
        parchiNumber: l.parchiNumber,
        date: l.date,
        flowerVariety: l.flowerVariety,
        flowerQuality: l.flowerQuality || 'Good',
        quantity: Number(l.quantity) || 0,
        unit: l.unit || 'Kgs',
        boxesCount: l.boxesCount !== undefined && l.boxesCount !== null
          ? Number(l.boxesCount)
          : ((l as any).packagingCount !== undefined && (l as any).packagingCount !== null ? Number((l as any).packagingCount) : undefined),
        packagingType: l.packagingType || 'Boxes',
        rate: Number(l.rate) || 0,
        grossTotal: Number(l.grossTotal) || Math.round(Number(l.quantity) * Number(l.rate)),
        workerName: l.workerName,
      }));
    }

    // 4. Fallback to single lot or draftData
    const q = lot?.quantity ?? draftData?.quantity ?? 0;
    const r = lot?.rate ?? draftData?.rate ?? 0;
    const g = lot?.grossTotal ?? draftData?.grossTotal ?? Math.round(q * r);
    const boxCount = lot?.boxesCount ?? draftData?.boxesCount ?? (lot as any)?.packagingCount ?? (draftData as any)?.packagingCount ?? undefined;
    return [
      {
        id: lot?.id || 'item-1',
        parchiNumber: lot?.parchiNumber || draftData?.parchiNumber,
        date: lot?.date || draftData?.date,
        flowerVariety: lot?.flowerVariety || draftData?.flowerVariety || 'Mixed Flowers',
        flowerQuality: lot?.flowerQuality || draftData?.flowerQuality || 'Good',
        quantity: q,
        unit: lot?.unit || draftData?.unit || 'Kgs',
        boxesCount: boxCount !== undefined && boxCount !== null ? Number(boxCount) : undefined,
        packagingType: lot?.packagingType || draftData?.packagingType || 'Boxes',
        rate: r,
        grossTotal: g,
        workerName: lot?.workerName,
      },
    ];
  }, [draftData, linkedShipment, lots, lot]);

  // Derive source metadata
  const sourceFarmerName =
    lot?.farmerName ||
    draftData?.farmerName ||
    (lots && lots[0]?.farmerName) ||
    linkedShipment?.farmerName ||
    'Farmer';
  const sourceFarmerVillage =
    lot?.farmerVillage ||
    draftData?.farmerVillage ||
    (lots && lots[0]?.farmerVillage) ||
    linkedShipment?.farmerVillage ||
    '';
  const sourceFarmerPhone =
    lot?.farmerPhone ||
    draftData?.farmerPhone ||
    (lots && lots[0]?.farmerPhone) ||
    linkedShipment?.farmerPhone ||
    '';
  const matchedFarmer = farmers.find(
    (f) => f.name.toLowerCase() === sourceFarmerName.toLowerCase() || (sourceFarmerPhone && f.phone === sourceFarmerPhone)
  );
  const farmerPhoto = matchedFarmer?.photoUrl;

  const sourceParchiNumber =
    lot?.parchiNumber ||
    draftData?.parchiNumber ||
    (lots && lots[0]?.parchiNumber) ||
    linkedShipment?.shipmentNumber ||
    'FC-2026-0001';
  const sourceDate =
    lot?.date ||
    draftData?.date ||
    (lots && lots[0]?.date) ||
    linkedShipment?.date ||
    new Date().toISOString().split('T')[0];
  const sourceTime =
    lot?.time ||
    draftData?.time ||
    (lots && lots[0]?.time) ||
    linkedShipment?.time ||
    'Morning Auction';

  // Aggregate item math across ALL saved records
  const totalQuantity = useMemo(() => {
    return resolvedItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  }, [resolvedItems]);

  const totalBoxes = useMemo(() => {
    return resolvedItems.reduce((acc, it) => acc + (Number(it.boxesCount) || 0), 0);
  }, [resolvedItems]);

  const primaryPackaging = resolvedItems[0]?.packagingType || lot?.packagingType || 'Boxes';

  const sourceGross = useMemo(() => {
    if (linkedShipment && linkedShipment.grossTotal > 0) return linkedShipment.grossTotal;
    const computedSum = resolvedItems.reduce((acc, it) => acc + (Number(it.grossTotal) || 0), 0);
    if (computedSum > 0) return computedSum;
    return lot?.grossTotal ?? draftData?.grossTotal ?? 0;
  }, [linkedShipment, resolvedItems, lot, draftData]);

  const sourceTransport = useMemo(() => {
    if (linkedShipment && linkedShipment.transportCharge !== undefined) return linkedShipment.transportCharge;
    if (draftData?.transportCharges !== undefined) return draftData.transportCharges;
    if (lots && lots.length > 0) return lots.reduce((acc, l) => acc + (l.transportCharges || 0), 0);
    return lot?.transportCharges ?? (lot?.otherExpenditures?.transport || 0);
  }, [linkedShipment, draftData, lots, lot]);

  const sourceHamali = useMemo(() => {
    if (linkedShipment && linkedShipment.hamaliCharge !== undefined) return linkedShipment.hamaliCharge;
    if (draftData?.ammaliCharges !== undefined) return draftData.ammaliCharges;
    if (lots && lots.length > 0) return lots.reduce((acc, l) => acc + (l.ammaliCharges || 0), 0);
    return lot?.ammaliCharges ?? (lot?.otherExpenditures?.hamali || 0);
  }, [linkedShipment, draftData, lots, lot]);

  // Step 3 Configuration States:
  // 1. Mandi Commission rate (%) - Default from draft, lot, linkedShipment, or merchant profile
  const [commissionPercent, setCommissionPercent] = useState<number>(
    draftData?.commissionPercent !== undefined
      ? draftData.commissionPercent
      : lot?.commissionPercent !== undefined
      ? lot.commissionPercent
      : linkedShipment?.commissionPercent !== undefined
      ? linkedShipment.commissionPercent
      : (merchantProfile.defaultCommissionRate ?? 0)
  );

  // 2. Deduction types and amounts
  const [deductionsList, setDeductionsList] = useState<StandardDeductionOption[]>([
    {
      id: 'mandiCess',
      name: 'Mandi Tax / Cess',
      nameTe: 'మార్కెట్ ఫీజు',
      defaultAmount: 30,
      selected: false,
      amount: 30,
    },
    {
      id: 'kanta',
      name: 'Weighing / Kanta Charge',
      nameTe: 'తూకం ఖర్చు',
      defaultAmount: 40,
      selected: false,
      amount: 40,
    },
    {
      id: 'packing',
      name: 'Packing / Crate Deposit',
      nameTe: 'ప్యాకింగ్ / బాక్స్ డిపాజిట్',
      defaultAmount: 50,
      selected: false,
      amount: 50,
    },
    {
      id: 'association',
      name: 'Market Association Cess',
      nameTe: 'సంఘం రుసుము',
      defaultAmount: 20,
      selected: false,
      amount: 20,
    },
  ]);

  // Custom extra deduction
  const [customDeductionName, setCustomDeductionName] = useState('');
  const [customDeductionAmount, setCustomDeductionAmount] = useState<number | ''>('');
  const [customDeductionActive, setCustomDeductionActive] = useState(false);

  // 3. Miscellaneous Charges - Percent (%) or fixed (₹)
  const initialMiscPercent =
    draftData?.miscCommissionPercent !== undefined
      ? draftData.miscCommissionPercent
      : lot?.otherExpenditures?.miscPercent !== undefined
      ? lot.otherExpenditures.miscPercent
      : 0;

  const initialMiscFixed =
    draftData?.miscCommissionAmount !== undefined && !draftData?.miscCommissionPercent
      ? draftData.miscCommissionAmount
      : (lot?.otherExpenditures?.misc && !lot?.otherExpenditures?.miscPercent ? lot.otherExpenditures.misc : '');

  const [miscCommissionPercent, setMiscCommissionPercent] = useState<number>(initialMiscPercent);
  const [miscCommissionFixed, setMiscCommissionFixed] = useState<number | ''>(initialMiscFixed);
  const [miscCommissionMode, setMiscCommissionMode] = useState<'percent' | 'fixed'>(
    initialMiscPercent > 0 || initialMiscFixed === '' ? 'percent' : 'fixed'
  );
  const [miscCommissionNote, setMiscCommissionNote] = useState<string>(
    lot?.otherExpenditures?.miscNote || 'Miscellaneous Charges'
  );

  // Calculations
  const calculatedCommissionAmount = useMemo(() => {
    return Math.round((sourceGross * commissionPercent) / 100);
  }, [sourceGross, commissionPercent]);

  const calculatedMiscCommissionAmount = useMemo(() => {
    if (miscCommissionMode === 'percent') {
      return Math.round((sourceGross * (miscCommissionPercent || 0)) / 100);
    }
    return typeof miscCommissionFixed === 'number' ? miscCommissionFixed : 0;
  }, [sourceGross, miscCommissionMode, miscCommissionPercent, miscCommissionFixed]);

  const selectedDeductionsTotal = useMemo(() => {
    let total = deductionsList
      .filter((d) => d.selected)
      .reduce((acc, d) => acc + (d.amount || 0), 0);

    if (customDeductionActive && typeof customDeductionAmount === 'number' && customDeductionAmount > 0) {
      total += customDeductionAmount;
    }
    return total;
  }, [deductionsList, customDeductionActive, customDeductionAmount]);

  // Total deductions breakdown: Transport + Hamali + Mandi Commission + Misleene Commission + Selected Deductions
  const totalAllDeductions = useMemo(() => {
    return (
      sourceTransport +
      sourceHamali +
      calculatedCommissionAmount +
      calculatedMiscCommissionAmount +
      selectedDeductionsTotal
    );
  }, [
    sourceTransport,
    sourceHamali,
    calculatedCommissionAmount,
    calculatedMiscCommissionAmount,
    selectedDeductionsTotal,
  ]);

  // Final Net Amount to Farmer
  const finalFarmerNet = useMemo(() => {
    return Math.max(0, sourceGross - totalAllDeductions);
  }, [sourceGross, totalAllDeductions]);

  // Payment Settlement Options in Form C PDF
  const [customPaymentStatus, setCustomPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>(
    lot?.paymentStatus || linkedShipment?.paymentStatus || 'Paid'
  );
  const [customAmountPaid, setCustomAmountPaid] = useState<number | ''>(
    lot?.amountPaid || linkedShipment?.amountPaid || ''
  );
  const [customPaymentMode, setCustomPaymentMode] = useState<
    'Cash' | 'UPI' | 'Bank Transfer' | 'PhonePe' | 'Google Pay' | 'Paytm' | 'Online'
  >(lot?.paymentMode || 'Cash');
  const [customPaymentRef, setCustomPaymentRef] = useState<string>(lot?.paymentReference || '');

  // Effective payment calculation
  const amountPaid = useMemo(() => {
    if (customPaymentStatus === 'Unpaid') return 0;
    if (customPaymentStatus === 'Paid') return finalFarmerNet;
    if (typeof customAmountPaid === 'number') return Math.min(finalFarmerNet, Math.max(0, customAmountPaid));
    return 0;
  }, [customPaymentStatus, customAmountPaid, finalFarmerNet]);

  const balanceDue = Math.max(0, finalFarmerNet - amountPaid);
  const paymentStatus = balanceDue === 0 && amountPaid > 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid';
  const paymentMode = customPaymentMode;

  const toggleDeduction = (id: string) => {
    setDeductionsList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const updateDeductionAmount = (id: string, newAmt: number) => {
    setDeductionsList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, amount: Math.max(0, newAmt) } : d))
    );
  };

  // Unified FormCData Snapshot Builder
  const formCData: FormCData = useMemo(() => {
    return buildFormCData({
      lot,
      lots,
      draftData,
      merchantProfile,
      farmersList: farmers,
      customSettings: {
        commissionPercent,
        miscCommissionMode,
        miscCommissionPercent,
        miscCommissionFixed: typeof miscCommissionFixed === 'number' ? miscCommissionFixed : 0,
        miscCommissionNote,
        transportCharges: sourceTransport,
        ammaliCharges: sourceHamali,
        otherDeductions: [
          ...deductionsList.filter((d) => d.selected).map((d) => ({ name: d.name, amount: d.amount })),
          ...(customDeductionActive && customDeductionName
            ? [{ name: customDeductionName, amount: Number(customDeductionAmount || 0) }]
            : []),
        ],
        amountPaid,
        paymentStatus,
        paymentMode: customPaymentMode,
        paymentReference: customPaymentRef,
      },
      isPreview: !lot?.id && !linkedShipment?.id,
    });
  }, [
    lot,
    lots,
    draftData,
    merchantProfile,
    farmers,
    commissionPercent,
    miscCommissionMode,
    miscCommissionPercent,
    miscCommissionFixed,
    miscCommissionNote,
    sourceTransport,
    sourceHamali,
    deductionsList,
    customDeductionActive,
    customDeductionName,
    customDeductionAmount,
    amountPaid,
    paymentStatus,
    customPaymentMode,
    customPaymentRef,
    linkedShipment,
  ]);

  // Helper function to auto-save source record to database (MandiContext & Firestore)
  const performAutoSaveRecord = (): Partial<SaleLot> => {
    const expendituresData: Expenditures = {
      transport: sourceTransport,
      hamali: sourceHamali,
      mandiCess: deductionsList.find((d) => d.id === 'mandiCess')?.selected
        ? deductionsList.find((d) => d.id === 'mandiCess')?.amount
        : 0,
      kanta: deductionsList.find((d) => d.id === 'kanta')?.selected
        ? deductionsList.find((d) => d.id === 'kanta')?.amount
        : 0,
      packingCharges: deductionsList.find((d) => d.id === 'packing')?.selected
        ? deductionsList.find((d) => d.id === 'packing')?.amount
        : 0,
      misc: calculatedMiscCommissionAmount,
      miscPercent: miscCommissionMode === 'percent' ? miscCommissionPercent : undefined,
      miscNote: miscCommissionNote,
    };

    const finalPayload: Partial<SaleLot> = {
      commissionPercent,
      commissionAmount: calculatedCommissionAmount,
      ammaliCharges: sourceHamali,
      transportCharges: sourceTransport,
      otherExpenditures: expendituresData,
      totalOtherExpenditures: totalAllDeductions - calculatedCommissionAmount,
      farmerNetPayable: finalFarmerNet,
      amountPaid,
      balanceDue,
      paymentStatus,
      paymentMode,
      paymentReference: customPaymentRef.trim() || '',
    };

    if (lot && lot.id) {
      updateSaleLot(lot.id, finalPayload);
    } else if (draftData && resolvedItems.length > 0) {
      const targetPhone = (sourceFarmerPhone || '').replace(/\D/g, '').slice(-10);
      let targetFarmerObj = matchedFarmer;

      if (!targetFarmerObj && targetPhone) {
        targetFarmerObj = addFarmer({
          name: sourceFarmerName,
          phone: targetPhone,
          village: sourceFarmerVillage || 'Mandi Catchment',
          primaryCrops: userCommodities,
          connectedMerchantIds: [merchantProfile.merchantId],
        });
      }

      addShipment({
        date: sourceDate,
        farmerId: targetFarmerObj?.id || `FM-${targetPhone.slice(-4)}`,
        farmerName: sourceFarmerName,
        farmerVillage: sourceFarmerVillage,
        farmerPhone: targetPhone,
        items: resolvedItems.map((it) => ({
          id: it.id,
          commodityCategory: it.commodityCategory || userCommodities[0] || 'flowers',
          flowerVariety: it.flowerVariety,
          quantity: it.quantity,
          unit: (it.unit as WeightUnit) || 'Kgs',
          rate: it.rate,
          grossTotal: it.grossTotal,
          boxesCount: it.boxesCount,
          packagingType: it.packagingType,
          flowerQuality: (it.flowerQuality as FlowerQuality) || 'Good',
        })),
        grossTotal: sourceGross,
        transportCharge: sourceTransport,
        hamaliCharge: sourceHamali,
        commissionPercent,
        commissionAmount: calculatedCommissionAmount,
        netAmountAfterDailyCuts: finalFarmerNet,
        paymentStatus,
        amountPaid,
        balanceDue,
        notes: draftData.notes,
      });
    }

    if (onFinalize) {
      onFinalize(finalPayload);
    }

    return finalPayload;
  };

  // Direct High-Resolution Vector PDF Download Handler
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    setPdfStatusMessage('Saving record & generating Form C Vector PDF...');
    try {
      performAutoSaveRecord();
      generateVectorParchiPdf(formCData, { autoDownload: true });
      setPdfStatusMessage('✓ Record saved & Form C PDF downloaded successfully!');
    } catch (err: any) {
      console.error('[PDF Download Error in GeneratePdfModal]', err);
      setPdfStatusMessage('✓ Record saved in app. (Browser blocked automatic PDF download)');
    } finally {
      setTimeout(() => {
        setIsGeneratingPdf(false);
        setPdfStatusMessage('');
      }, 3000);
    }
  };

  const [isSharingPdf, setIsSharingPdf] = useState<boolean>(false);

  // WhatsApp / Native Share with PDF file attachment via Web Share API
  const handleShareWhatsApp = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSharingPdf) return;

    if (!acquireGlobalShareLock()) {
      return;
    }

    setIsSharingPdf(true);
    setPdfStatusMessage('Saving record & generating Form C PDF for sharing...');

    try {
      performAutoSaveRecord();

      const doc = generateVectorParchiPdf(formCData, { autoDownload: false });
      const blob = doc.output('blob');

      const shareRes = await sharePdfFile({
        blob,
        filename: formCData.pdfFileName,
        title: `Form C Invoice - ${formCData.parchiNumber}`,
        fallbackToDownload: true,
      });

      if (shareRes.shared) {
        setPdfStatusMessage('✓ Record saved & Form C PDF shared successfully!');
      } else if (shareRes.downloaded) {
        setPdfStatusMessage(
          '✓ Record saved in app! The Form C PDF has been downloaded so you can attach it in WhatsApp.'
        );
      }
    } catch (err: any) {
      console.error('[Form C Share Fatal Error]', err);
      setPdfStatusMessage('✓ Record saved in app! Use Download Form C PDF button.');
    } finally {
      setIsSharingPdf(false);
      releaseGlobalShareLock(2500);
      setTimeout(() => setPdfStatusMessage(''), 6000);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(formCData.whatsappSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAndFinalize = async () => {
    performAutoSaveRecord();

    if (pdfPrintAreaRef.current) {
      try {
        const cleanFarmer = sourceFarmerName.replace(/[^a-zA-Z0-9]/g, '_');
        await exportElementToPdf(pdfPrintAreaRef.current, {
          filename: `BharatMandi-FormC-Invoice-${sourceParchiNumber}-${cleanFarmer}.pdf`,
          format: pdfLayoutFormat,
          orientation: 'portrait',
          marginMm: pdfLayoutFormat === 'thermal-80mm' ? 4 : 6,
          scale: 2,
          autoDownload: true,
        });
      } catch (e) {
        console.error('Auto download on finalize error', e);
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="generate-pdf-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-x-hidden overflow-y-auto w-full max-w-[100vw]"
    >
      <div
        id="generate-pdf-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] md:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-w-[100vw]"
      >
        {/* FIXED HEADER */}
        <div className="no-print flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              id="back-pdf-modal-btn"
              onClick={onClose}
              aria-label="Go Back"
              className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-blue-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded">
                  Form C Official Invoice
                </span>
                <span className="text-xs text-white/70 font-mono">
                  {sourceParchiNumber} • {resolvedItems.length} Record{resolvedItems.length > 1 ? 's' : ''}
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-black tracking-tight text-white leading-tight">
                Generate Form C PDF &amp; Deductions
              </h2>
            </div>
          </div>

          <button
            type="button"
            id="close-pdf-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc] w-full min-w-0">
          {/* Step 3: Commission & Deduction Options Panel */}
          <div className="no-print bg-white p-3.5 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4 sm:space-y-5 w-full min-w-0">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1a3a52]" />
                <h4 className="font-black text-xs sm:text-sm text-[#1e293b] uppercase tracking-wider">
                  Commission &amp; Deduction Settings
                </h4>
              </div>
              <span className="text-[11px] text-[#64748b]">
                {resolvedItems.length} saved record{resolvedItems.length > 1 ? 's' : ''} included
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
              {/* 1. Mandi Commission Percent Setting */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 min-w-0 w-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1e293b] flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-[#1a3a52]" />
                    <span>Mandi Commission</span>
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-700">
                    -₹{calculatedCommissionAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 w-full">
                  {[0, 2, 4, 5, 6].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setCommissionPercent(pct)}
                      className={`py-1.5 px-0.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        commissionPercent === pct
                          ? 'bg-[#1a3a52] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] text-slate-500">Custom:</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Math.max(0, Number(e.target.value) || 0))}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center"
                  />
                  <span className="text-xs font-bold text-slate-700">%</span>
                </div>
              </div>

              {/* 2. Miscellaneous Charges Setting - Placed directly beside Mandi Commission */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2 min-w-0 w-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1e293b] flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-600" />
                    <span>{language === 'te' ? 'ఇతర ఖర్చులు' : 'Miscellaneous Charges'}</span>
                  </span>
                  <span className="font-mono font-bold text-xs text-amber-800">
                    -₹{calculatedMiscCommissionAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 w-full">
                  {[0, 0.5, 1, 1.5, 2].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setMiscCommissionMode('percent');
                        setMiscCommissionPercent(pct);
                      }}
                      className={`py-1.5 px-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer text-center ${
                        miscCommissionMode === 'percent' && miscCommissionPercent === pct
                          ? 'bg-amber-700 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <div className="flex rounded-md border border-slate-300 overflow-hidden text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setMiscCommissionMode('percent')}
                      className={`px-1.5 py-0.5 cursor-pointer ${miscCommissionMode === 'percent' ? 'bg-[#1a3a52] text-white' : 'bg-white text-slate-600'}`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setMiscCommissionMode('fixed')}
                      className={`px-1.5 py-0.5 cursor-pointer ${miscCommissionMode === 'fixed' ? 'bg-[#1a3a52] text-white' : 'bg-white text-slate-600'}`}
                    >
                      ₹
                    </button>
                  </div>
                  {miscCommissionMode === 'percent' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="15"
                        step="0.5"
                        value={miscCommissionPercent}
                        onChange={(e) => setMiscCommissionPercent(Math.max(0, Number(e.target.value) || 0))}
                        className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center"
                      />
                      <span className="text-xs font-bold text-slate-700">%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={miscCommissionFixed}
                        placeholder="0"
                        onChange={(e) => setMiscCommissionFixed(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                        className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Recorded Freight & Hamali */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 min-w-0 w-full overflow-hidden">
                <span className="text-xs font-bold text-[#1e293b] block">
                  Recorded Freight &amp; Labor
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Vehicle / Freight:</span>
                    <strong className="font-mono text-slate-900">₹{sourceTransport.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Hamali / Loading:</span>
                    <strong className="font-mono text-slate-900">₹{sourceHamali.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-200 font-bold">
                    <span>Total Direct Cuts:</span>
                    <span className="font-mono text-red-700">-₹{(sourceTransport + sourceHamali).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* 4. Additional Deductions */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 min-w-0 w-full overflow-hidden">
                <span className="text-xs font-bold text-[#1e293b] block">
                  Itemized Mandi Deductions
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 min-w-0">
                  {deductionsList.map((ded) => (
                    <label
                      key={ded.id}
                      className="flex items-center justify-between gap-2 text-xs cursor-pointer p-1 rounded hover:bg-slate-100/80"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <input
                          type="checkbox"
                          checked={ded.selected}
                          onChange={() => toggleDeduction(ded.id)}
                          className="w-3.5 h-3.5 rounded text-[#1a3a52] focus:ring-[#1a3a52] shrink-0"
                        />
                        <span className="text-slate-700 truncate">{ded.name}</span>
                      </div>
                      {ded.selected && (
                        <input
                          type="number"
                          value={ded.amount}
                          onChange={(e) => updateDeductionAmount(ded.id, Number(e.target.value) || 0)}
                          className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-right text-xs font-mono font-bold shrink-0"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Summary Bar */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs w-full min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-slate-600">Turnover: </span>
                <strong className="font-mono text-slate-900">₹{sourceGross.toLocaleString('en-IN')}</strong>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">Mandi Comm: </span>
                <strong className="font-mono text-emerald-800">-₹{calculatedCommissionAmount.toLocaleString('en-IN')} ({commissionPercent}%)</strong>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">Misc Charges: </span>
                <strong className="font-mono text-amber-800">-₹{calculatedMiscCommissionAmount.toLocaleString('en-IN')} ({miscCommissionMode === 'percent' ? `${miscCommissionPercent}%` : 'Fixed'})</strong>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">Deductions: </span>
                <strong className="font-mono text-red-700">-₹{totalAllDeductions.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-emerald-200">
                <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                  Final Net To Farmer:
                </span>
                <span className="font-mono font-black text-base text-[#1a3a52]">
                  ₹{finalFarmerNet.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* PDF Invoice Canvas Header Tools */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                Form C Invoice Preview
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs">
                Official Form C Format
              </span>
            </div>
          </div>

          {/* Printable PDF Canvas (Consignment PDF Format & Authentic Mandi Parchi Styling) */}
          <div className="w-full overflow-x-auto p-1 flex justify-center">
            <div className="w-full max-w-full overflow-x-auto">
              <FormCInvoiceCanvas
                ref={pdfPrintAreaRef}
                data={{
                  parchiNumber: sourceParchiNumber,
                  date: sourceDate,
                  time: sourceTime,
                  farmerName: sourceFarmerName,
                  farmerVillage: sourceFarmerVillage,
                  farmerPhone: sourceFarmerPhone,
                  items: resolvedItems.map((item) => ({
                    flowerVariety: item.flowerVariety,
                    flowerQuality: item.flowerQuality,
                    quantity: item.quantity,
                    unit: item.unit,
                    boxesCount: item.boxesCount,
                    packagingType: item.packagingType,
                    rate: item.rate,
                    grossTotal: item.grossTotal,
                  })),
                  grossTotal: sourceGross,
                  transportCharges: sourceTransport,
                  ammaliCharges: sourceHamali,
                  commissionPercent: commissionPercent,
                  commissionAmount: calculatedCommissionAmount,
                  miscCommissionMode: miscCommissionMode,
                  miscCommissionPercent: miscCommissionPercent,
                  miscCommissionAmount: calculatedMiscCommissionAmount,
                  otherDeductions: [
                    ...deductionsList
                      .filter((d) => d.selected)
                      .map((d) => ({ name: d.name, amount: d.amount })),
                    ...(customDeductionActive && customDeductionName
                      ? [{ name: customDeductionName, amount: Number(customDeductionAmount || 0) }]
                      : []),
                  ],
                  farmerNetPayable: finalFarmerNet,
                  amountPaid: amountPaid,
                  balanceDue: balanceDue,
                  paymentMode: paymentMode,
                  paymentStatus: paymentStatus,
                  notes: draftData?.notes || '',
                }}
                format={pdfLayoutFormat}
              />
            </div>
          </div>
        </div>

        {/* Status Message Notification */}
        {pdfStatusMessage && (
          <div className="no-print mx-3 sm:mx-6 mb-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 text-[#1a3a52] animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              )}
              <span>{pdfStatusMessage}</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-mono">{pdfLayoutFormat.toUpperCase()}</span>
          </div>
        )}

        {/* FIXED FOOTER */}
        <div className="no-print flex-shrink-0 bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              id="pdf-modal-whatsapp-share-btn"
              onClick={handleShareWhatsApp}
              disabled={isSharingPdf || isGeneratingPdf}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs min-h-[42px] disabled:opacity-60"
              title="Share Form C PDF via WhatsApp / Native Share Sheet"
            >
              {isSharingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Share2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{isSharingPdf ? 'Sharing...' : 'WhatsApp'}</span>
            </button>

            <button
              type="button"
              id="pdf-modal-copy-summary-btn"
              onClick={handleCopyText}
              className="px-3 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px]"
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              id="pdf-modal-download-btn"
              onClick={() => handleDownloadPDF()}
              disabled={isGeneratingPdf}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#1a3a52] hover:bg-[#122839] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50 min-h-[42px]"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d4af37] shrink-0" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
              )}
              <span>{isGeneratingPdf ? 'Rendering PDF...' : 'Download Form C PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
