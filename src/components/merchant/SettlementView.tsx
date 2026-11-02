import React, { useState, useMemo, useRef } from 'react';
import {
  Calculator,
  ArrowLeft,
  X,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Coins,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Truck,
  Layers,
  User,
  Phone,
  FileText,
  Share2,
  Copy,
  Check,
  FileSpreadsheet,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { FifteenDaySettlement, PaymentMode, Shipment } from '../../types';
import { formatDisplayDate, formatDateDMY, getTodayDateString, getPastDateString } from '../../data/initialData';
import { sounds } from '../../utils/audio';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { exportElementToPdf, printHtmlViaIframe } from '../../utils/pdfExport';

export const SettlementView: React.FC = () => {
  const {
    shipments,
    farmers,
    merchantProfile,
    settlements,
    lots,
    openPdfModalForLot,
    openPdfModalForShipment,
    calculate15DaySettlement,
    confirmSettlement,
    deleteShipment,
    deleteSettlement,
    activeSessionDate,
  } = useMandi();

  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<string | null>(null);

  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    itemName?: string;
    itemDetails?: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Period Presets: Only Default Session Date & Custom Range
  const [periodPreset, setPeriodPreset] = useState<'single-day' | 'custom'>('single-day');
  const [startDate, setStartDate] = useState<string>(() => activeSessionDate || getTodayDateString());
  const [endDate, setEndDate] = useState<string>(() => activeSessionDate || getTodayDateString());
  const [commissionRate, setCommissionRate] = useState<number>(
    merchantProfile.defaultCommissionRate ?? 4
  );
  const [miscRate, setMiscRate] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFarmerId, setExpandedFarmerId] = useState<string | null>(null);

  // Settlement Payment Modal State
  const [activeSettlingItem, setActiveSettlingItem] = useState<FifteenDaySettlement | null>(null);
  const [payMode, setPayMode] = useState<PaymentMode>('Cash');
  const [payRef, setPayRef] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [lastSettledReceipt, setLastSettledReceipt] = useState<FifteenDaySettlement | null>(null);

  // Printable Statement Modal & Copy State
  const [printStatement, setPrintStatement] = useState<FifteenDaySettlement | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string>('');
  const settlementDocRef = useRef<HTMLDivElement>(null);

  // Quick preset selector
  const handlePresetChange = (preset: 'single-day' | 'custom') => {
    setPeriodPreset(preset);
    if (preset === 'single-day') {
      const today = activeSessionDate || getTodayDateString();
      setStartDate(today);
      setEndDate(today);
    }
  };

  // Calculate settlements for all farmers in the current period
  const calculatedSettlements = useMemo(() => {
    return farmers
      .map((farmer) => {
        // Check if already settled in this period
        const existingSettled = settlements.find(
          (s) =>
            s.farmerId === farmer.id &&
            s.periodStart === startDate &&
            s.periodEnd === endDate &&
            s.status === 'settled'
        );

        if (existingSettled) {
          return existingSettled;
        }

        return calculate15DaySettlement(farmer.id, startDate, endDate, commissionRate, miscRate);
      })
      .filter((s) => {
        // Filter by search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.farmerName.toLowerCase().includes(q) ||
          s.farmerVillage.toLowerCase().includes(q) ||
          (s.farmerPhone && s.farmerPhone.includes(q))
        );
      });
  }, [farmers, startDate, endDate, commissionRate, miscRate, settlements, calculate15DaySettlement, searchQuery]);

  // High-level Fortnight summary metrics
  const totals = useMemo(() => {
    const totalShipments = calculatedSettlements.reduce((sum, s) => sum + s.totalShipmentsCount, 0);
    const totalGross = calculatedSettlements.reduce((sum, s) => sum + s.totalGross, 0);
    const totalTransport = calculatedSettlements.reduce((sum, s) => sum + s.totalTransport, 0);
    const totalHamali = calculatedSettlements.reduce((sum, s) => sum + s.totalHamali, 0);
    const totalPendingAfterDailyCuts = calculatedSettlements.reduce(
      (sum, s) => sum + s.pendingAmountAfterDailyCuts,
      0
    );
    const totalCommission = calculatedSettlements.reduce((sum, s) => sum + s.commissionAmount, 0);
    const totalMisc = calculatedSettlements.reduce((sum, s) => sum + (s.miscAmount || 0), 0);
    const totalFinalPayment = calculatedSettlements.reduce((sum, s) => sum + s.finalPayment, 0);

    return {
      totalShipments,
      totalGross,
      totalTransport,
      totalHamali,
      totalPendingAfterDailyCuts,
      totalCommission,
      totalMisc,
      totalFinalPayment,
    };
  }, [calculatedSettlements]);

  // Execute Settlement
  const handleConfirmPay = () => {
    if (!activeSettlingItem) return;
    confirmSettlement(activeSettlingItem, payMode, payRef);
    sounds.playCashChime();
    setLastSettledReceipt(activeSettlingItem);
    setActiveSettlingItem(null);
    setIsSuccessModalOpen(true);
    setPayRef('');
  };

  // Format short date (e.g. Sep 1)
  const formatShortDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${monthNames[monthIdx] || 'Sep'} ${day}`;
    }
    return dateStr;
  };

  // Generate CSV matching exact user settlement specification
  const generateSettlementCSV = (statement: FifteenDaySettlement): string => {
    const farmerShipments = shipments
      .filter((s) => s.farmerId === statement.farmerId && s.date >= statement.periodStart && s.date <= statement.periodEnd)
      .sort((a, b) => a.date.localeCompare(b.date));

    const periodLabel = statement.periodStart === '2024-09-01' && statement.periodEnd === '2024-09-15'
      ? 'Sep 1-15, 2024'
      : `${formatShortDate(statement.periodStart)}-${formatShortDate(statement.periodEnd).split(' ')[1] || statement.periodEnd.split('-')[2]}, ${statement.periodStart.split('-')[0]}`;

    const farmerDisplayName = statement.farmerName.split('(')[0].trim().toUpperCase() || statement.farmerName.toUpperCase();

    const transactionsRows = farmerShipments.map((s) => {
      const d = formatShortDate(s.date);
      const varieties = s.items.map((i) => i.flowerVariety.replace(/\s*\([^)]*\)/g, '').trim()).join(' + ');
      const totalQty = s.items.reduce((sum, i) => sum + i.quantity, 0);
      return `${d},${varieties},${totalQty}kg,${s.grossTotal}`;
    }).join('\n');

    const totalSales = statement.totalGross;
    const totalHamali = statement.totalHamali;
    const totalTransport = statement.totalTransport;
    const commPercent = statement.commissionPercent ?? 4;
    const commAmount = statement.commissionAmount ?? Math.round(totalSales * (commPercent / 100));
    const mPercent = statement.miscPercent ?? miscRate;
    const mAmount = statement.miscAmount ?? Math.round(totalSales * (mPercent / 100));
    const farmerNet = statement.finalPayment ?? Math.max(0, totalSales - totalHamali - totalTransport - commAmount - mAmount);
    const totalCut = statement.totalDeductionsCut ?? (totalHamali + totalTransport + commAmount + mAmount);

    const statusLabel = statement.status === 'settled' ? 'FULLY SETTLED' : 'PENDING PAYOUT';

    return `SETTLEMENT REPORT - ${farmerDisplayName}
Period: ${periodLabel}
Status: ${statusLabel}

TRANSACTIONS
Date,Varieties,Qty,Amount
${transactionsRows}

CALCULATION BREAKDOWN
Particulars,Amount
Gross Total Sales,${totalSales}
Less: Hamali Charges,-${totalHamali}
Less: Transport Charges,-${totalTransport}
Less: Commission (${commPercent}%),-${commAmount}
Less: Misc Expenses (${mPercent}%),-${mAmount}
________________________________
NET FARMER AMOUNT,${farmerNet}

MERCHANT DEDUCTIONS SUMMARY
Hamali Charges,${totalHamali}
Transport Charges,${totalTransport}
Commission (${commPercent}%),${commAmount}
Miscellaneous (${mPercent}%),${mAmount}
Total Cut,${totalCut}
Settlement Status,${statusLabel}
`;
  };

  const handleDownloadCSV = (statement: FifteenDaySettlement) => {
    const csvContent = generateSettlementCSV(statement);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = statement.farmerName.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `Settlement_Report_${cleanName}_${statement.periodStart}_to_${statement.periodEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    sounds.playCashChime();
  };

  const handleDownloadSettlementPdf = async (statement: FifteenDaySettlement) => {
    if (!settlementDocRef.current) return;
    setIsGeneratingPdf(true);
    setPdfStatusMessage('Saving settlement record & rendering Ledger PDF...');
    try {
      // 1. Auto-save / confirm settlement record in database (MandiContext & Firestore)
      confirmSettlement(statement);

      const cleanName = statement.farmerName.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Settlement_Report_${cleanName}_${statement.periodStart}_to_${statement.periodEnd}.pdf`;
      const result = await exportElementToPdf(settlementDocRef.current, {
        filename,
        format: 'a4',
        orientation: 'portrait',
        marginMm: 6,
        scale: 2,
        fitToPage: true,
        autoDownload: true,
      });
      if (result.success) {
        sounds.playCashChime();
        setPdfStatusMessage('✓ Settlement record saved & PDF downloaded successfully!');
      } else {
        setPdfStatusMessage('✓ Settlement record saved to app! (PDF generation issue, please retry)');
      }
    } catch (err: any) {
      console.error('[Settlement PDF Error]', err);
      setPdfStatusMessage('✓ Settlement record saved in app!');
    } finally {
      setTimeout(() => {
        setIsGeneratingPdf(false);
        setPdfStatusMessage('');
      }, 3000);
    }
  };

  // Generate ASCII / Text Report identical to specified PDF format
  const generateSettlementTextReport = (statement: FifteenDaySettlement): string => {
    const farmerShipments = shipments
      .filter((s) => s.farmerId === statement.farmerId && s.date >= statement.periodStart && s.date <= statement.periodEnd)
      .sort((a, b) => a.date.localeCompare(b.date));

    const periodLabel = statement.periodStart === '2024-09-01' && statement.periodEnd === '2024-09-15'
      ? 'Sep 1-15, 2024'
      : `${formatShortDate(statement.periodStart)}-${formatShortDate(statement.periodEnd).split(' ')[1] || statement.periodEnd.split('-')[2]}, ${statement.periodStart.split('-')[0]}`;

    const farmerDisplayName = statement.farmerName.split('(')[0].trim().toUpperCase() || statement.farmerName.toUpperCase();
    const statusLabel = statement.status === 'settled' ? 'FULLY SETTLED' : 'PENDING PAYOUT';

    const txLines = farmerShipments.map((s) => {
      const d = formatShortDate(s.date).padEnd(8, ' ');
      const varieties = s.items.map((i) => i.flowerVariety.replace(/\s*\([^)]*\)/g, '').trim()).join(' + ').padEnd(18, ' ');
      const qty = (s.items.reduce((sum, i) => sum + i.quantity, 0) + 'kg').padEnd(5, ' ');
      const amt = `₹${s.grossTotal.toLocaleString('en-IN')}`;
      return `${d} | ${varieties} | ${qty} | ${amt}`;
    }).join('\n');

    const hamaliLines = farmerShipments.map((s) => `   ${formatShortDate(s.date)}: ₹${s.hamaliCharge}`).join('\n');
    const transportLines = farmerShipments.map((s) => `   ${formatShortDate(s.date)}: ₹${s.transportCharge}`).join('\n');

    const totalSales = statement.totalGross;
    const totalHamali = statement.totalHamali;
    const totalTransport = statement.totalTransport;
    const commPercent = statement.commissionPercent ?? 4;
    const commAmount = statement.commissionAmount ?? Math.round(totalSales * (commPercent / 100));
    const mPercent = statement.miscPercent ?? miscRate;
    const mAmount = statement.miscAmount ?? Math.round(totalSales * (mPercent / 100));
    const farmerNet = statement.finalPayment ?? Math.max(0, totalSales - totalHamali - totalTransport - commAmount - mAmount);
    const totalCut = statement.totalDeductionsCut ?? (totalHamali + totalTransport + commAmount + mAmount);

    return `═══════════════════════════════════════════════════════════════
SETTLEMENT REPORT - ${farmerDisplayName}
Period: ${periodLabel}
Status: ${statusLabel}
═══════════════════════════════════════════════════════════════

TRANSACTIONS
─────────────────────────────────────────────────────────────
Date     | Varieties          | Qty   | Amount
─────────────────────────────────────────────────────────────
${txLines}

═══════════════════════════════════════════════════════════════

NET AMOUNT CALCULATION BREAKDOWN
─────────────────────────────────────────────────────────────

Gross Total Sales:                           ₹${totalSales.toLocaleString('en-IN')}

Less: Hamali Charges (already recorded):
${hamaliLines}
   ─────────────────────────────────────
   Total Hamali Charges:                    -₹${totalHamali.toLocaleString('en-IN')}

Less: Transport Charges (already recorded):
${transportLines}
   ─────────────────────────────────────
   Total Transport Charges:                 -₹${totalTransport.toLocaleString('en-IN')}

Less: Commission (${commPercent}% of Gross Total):
   ₹${totalSales.toLocaleString('en-IN')} × ${commPercent}%                       -₹${commAmount.toLocaleString('en-IN')}

Less: Misc Expenses (${mPercent}% of Gross Total):
   ₹${totalSales.toLocaleString('en-IN')} × ${mPercent}%                       -₹${mAmount.toLocaleString('en-IN')}

═══════════════════════════════════════════════════════════════

NET FARMER AMOUNT:
   ₹${totalSales.toLocaleString('en-IN')} - ₹${totalHamali.toLocaleString('en-IN')} - ₹${totalTransport.toLocaleString('en-IN')} - ₹${commAmount.toLocaleString('en-IN')} - ₹${mAmount.toLocaleString('en-IN')}
   = ₹${farmerNet.toLocaleString('en-IN')}

═══════════════════════════════════════════════════════════════

MERCHANT'S DEDUCTIONS SUMMARY (from Farmer's Total)
   Hamali Charges:       ₹${totalHamali.toLocaleString('en-IN')}
   Transport Charges:    ₹${totalTransport.toLocaleString('en-IN')}
   Commission (${commPercent}%):      ₹${commAmount.toLocaleString('en-IN')}
   Miscellaneous (${mPercent}%):   ₹${mAmount.toLocaleString('en-IN')}
   ──────────────────────────
   TOTAL CUT:            ₹${totalCut.toLocaleString('en-IN')}

═══════════════════════════════════════════════════════════════`;
  };

  const handleCopyReport = (statement: FifteenDaySettlement) => {
    const text = generateSettlementTextReport(statement);
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    sounds.playScaleBeep();
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Get individual shipments for an expanded farmer
  const getFarmerShipmentsForPeriod = (farmerId: string): Shipment[] => {
    return shipments.filter((s) => {
      if (s.farmerId !== farmerId) return false;
      return s.date >= startDate && s.date <= endDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: 15-Day Settlement Engine */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e2e8f0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1a3a52] tracking-wider uppercase">
            <Calculator className="w-4 h-4 text-[#1a3a52]" />
            <span>Mandi Settlement &amp; Parchi Generation</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#1a3a52]">
            Farmer Settlement Ledger (Parchi)
          </h2>
          <p className="text-xs text-[#64748b] max-w-xl">
            Select a date range (Single Day, 15 Days, 1 Month, or Custom). Vehicle/Transport and Hamali charges recorded during sales, plus Commission ({commissionRate}%) &amp; Misc ({miscRate}%) are calculated and deducted across the selected period to give the Net Farmer Amount.
          </p>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#f8fafc] p-1.5 rounded-xl border border-[#e2e8f0]">
          <button
            type="button"
            id="preset-single-day"
            onClick={() => handlePresetChange('single-day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              periodPreset === 'single-day'
                ? 'bg-[#1a3a52] text-white shadow-xs'
                : 'text-[#1e293b] hover:bg-slate-200/60'
            }`}
          >
            Default Date ({activeSessionDate || getTodayDateString()})
          </button>
          <button
            type="button"
            id="preset-custom"
            onClick={() => handlePresetChange('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              periodPreset === 'custom'
                ? 'bg-[#1a3a52] text-white shadow-xs'
                : 'text-[#1e293b] hover:bg-slate-200/60'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Control Bar: Custom Date Pickers, Commission %, Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#64748b]">Period:</span>
            <input
              type="date"
              id="settlement-start-date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2.5 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-medium text-[#1e293b] focus:ring-2 focus:ring-[#1a3a52] focus:outline-none"
            />
            <span className="text-xs text-[#64748b]">to</span>
            <input
              type="date"
              id="settlement-end-date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2.5 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-medium text-[#1e293b] focus:ring-2 focus:ring-[#1a3a52] focus:outline-none"
            />
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-mono border border-emerald-200">
              {formatDateDMY(startDate)} – {formatDateDMY(endDate)}
            </span>
          </div>

          {/* Commission rate adjustment */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#e2e8f0]">
            <span className="text-xs font-bold text-[#64748b]">Comm:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                id="settlement-commission-input"
                min="0"
                max="20"
                step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value) || 0)}
                className="w-13 px-1.5 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-bold text-[#1a3a52] text-center focus:ring-2 focus:ring-[#1a3a52] focus:outline-none"
              />
              <span className="text-xs font-bold text-[#1e293b]">%</span>
            </div>
          </div>

          {/* Misc rate adjustment */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#e2e8f0]">
            <span className="text-xs font-bold text-[#64748b]">Misc:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                id="settlement-misc-input"
                min="0"
                max="10"
                step="0.5"
                value={miscRate}
                onChange={(e) => setMiscRate(Number(e.target.value) || 0)}
                className="w-13 px-1.5 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-bold text-[#1a3a52] text-center focus:ring-2 focus:ring-[#1a3a52] focus:outline-none"
              />
              <span className="text-xs font-bold text-[#1e293b]">%</span>
            </div>
          </div>
        </div>

        {/* Farmer Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5" />
          <input
            type="text"
            id="settlement-farmer-search"
            placeholder="Search farmer name, village..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#e2e8f0] text-xs text-[#1e293b] focus:ring-2 focus:ring-[#1a3a52] focus:outline-none"
          />
        </div>
      </div>

      {/* Fortnight Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Shipments */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Fortnight Shipments
          </span>
          <div className="text-2xl font-black text-[#1e293b]">
            {totals.totalShipments}{' '}
            <span className="text-xs font-normal text-[#64748b]">shipments</span>
          </div>
          <span className="text-[11px] text-[#64748b] block">
            Across {calculatedSettlements.length} active farmers
          </span>
        </div>

        {/* Total Deductions (Once per shipment) */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Shipment Deductions
          </span>
          <div className="text-2xl font-black text-[#B24C27]">
            ₹{(totals.totalTransport + totals.totalHamali).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#64748b] block">
            Transport ₹{totals.totalTransport.toLocaleString('en-IN')} + Hamali ₹{totals.totalHamali.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Total Pending After Daily Cuts */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
            Net After Daily Cuts
          </span>
          <div className="text-2xl font-black text-[#1a3a52]">
            ₹{totals.totalPendingAfterDailyCuts.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#64748b] block">
            Before commission deduction
          </span>
        </div>

        {/* Total Final Fortnight Payout */}
        <div className="bg-[#FEF8ED] p-4 rounded-2xl border border-[#d4af37]/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#8C6218] uppercase tracking-wider block">
            Final Fortnight Payout
          </span>
          <div className="text-2xl font-black text-[#1e293b]">
            ₹{totals.totalFinalPayment.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#8C6218] block font-semibold">
            Less Comm ₹{totals.totalCommission.toLocaleString('en-IN')} + Misc ₹{totals.totalMisc.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Farmers 15-Day Settlement Cards / Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1e293b] flex items-center gap-2">
            <User className="w-4 h-4 text-[#1a3a52]" />
            <span>Farmer Settlement Accounts ({calculatedSettlements.length})</span>
          </h3>
          <span className="text-xs text-[#64748b]">
            Showing Fortnight: <strong className="text-[#1a3a52]">{startDate} to {endDate}</strong>
          </span>
        </div>

        {calculatedSettlements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-8 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-[#d4af37] mx-auto" />
            <h4 className="font-bold text-[#1e293b]">No shipments found for this period</h4>
            <p className="text-xs text-[#64748b]">
              No parchi records or sales recorded for this selected date range. Try selecting a different date range or create a new sale.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {calculatedSettlements.map((item) => {
              const isExpanded = expandedFarmerId === item.farmerId;
              const farmerShipments = isExpanded ? getFarmerShipmentsForPeriod(item.farmerId) : [];

              return (
                <div
                  key={item.id}
                  id={`settlement-card-${item.farmerId}`}
                  className={`bg-white rounded-2xl border transition shadow-2xs overflow-hidden ${
                    item.status === 'settled'
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-[#e2e8f0] hover:border-[#1a3a52]/40'
                  }`}
                >
                  {/* Card Header & High-level calculation row */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Left: Farmer Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#1e293b]">
                          {item.farmerName}
                        </span>
                        {item.status === 'settled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Settled / Paid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Settlement</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-[#64748b]">
                        <span>📍 {item.farmerVillage}</span>
                        <span>•</span>
                        <span>📞 {item.farmerPhone || 'N/A'}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#1a3a52]">
                          {item.totalShipmentsCount} Shipments in Fortnight
                        </span>
                      </div>
                    </div>

                    {/* Middle: Exact Calculation Breakdown */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0] text-xs">
                      {/* Gross */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                          Total Gross
                        </span>
                        <span className="font-bold text-[#1e293b]">
                          ₹{item.totalGross.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Daily Cuts (Transport + Hamali) */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#B24C27] block">
                          Daily Cuts (T+H)
                        </span>
                        <span className="font-bold text-[#B24C27]">
                          -₹{(item.totalTransport + item.totalHamali).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Pending After Daily Cuts */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#1a3a52] block">
                          Pending (After Cuts)
                        </span>
                        <span className="font-extrabold text-[#1a3a52]">
                          ₹{item.pendingAmountAfterDailyCuts.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Commission */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#8C6218] block">
                          Comm ({item.commissionPercent}%)
                        </span>
                        <span className="font-bold text-[#8C6218]">
                          -₹{item.commissionAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Misc Expenses */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-700 block">
                          Misc ({item.miscPercent}%)
                        </span>
                        <span className="font-bold text-purple-700">
                          -₹{item.miscAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* FINAL PAYMENT */}
                      <div className="pl-3 border-l border-[#e2e8f0]">
                        <span className="text-[10px] uppercase font-black text-[#1a3a52] block">
                          Final Payment
                        </span>
                        <span className="text-base font-black text-[#1a3a52]">
                          ₹{item.finalPayment.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                      {item.status !== 'settled' && (
                        <button
                          type="button"
                          id={`pay-btn-${item.farmerId}`}
                          onClick={() => setActiveSettlingItem(item)}
                          className="px-3.5 py-2 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>Record Settlement Pay</span>
                        </button>
                      )}

                       {/* Form C PDF Disabled */}

                      <button
                        type="button"
                        id={`pdf-btn-${item.farmerId}`}
                        onClick={() => setPrintStatement(item)}
                        className="px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] text-xs font-bold hover:bg-[#f1f5f9] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="View Fortnight Settlement Ledger Statement"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#1a3a52]" />
                        <span>Statement</span>
                      </button>

                      <button
                        type="button"
                        id={`csv-btn-${item.farmerId}`}
                        onClick={() => handleDownloadCSV(item)}
                        className="px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] text-xs font-bold hover:bg-[#f1f5f9] transition flex items-center gap-1.5 shadow-2xs"
                        title="Download CSV Settlement Report"
                      >
                        <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>CSV</span>
                      </button>

                      <button
                        type="button"
                        id={`toggle-expand-${item.farmerId}`}
                        onClick={() => setExpandedFarmerId(isExpanded ? null : item.farmerId)}
                        className="p-2 rounded-xl border border-[#e2e8f0] hover:bg-[#f1f5f9] text-[#64748b] transition"
                        title="View Shipments Breakdown"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Shipment by Shipment Breakdown with Varieties */}
                  {isExpanded && (
                    <div className="bg-[#f8fafc] border-t border-[#e2e8f0] p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1e293b] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#1a3a52]" />
                          <span>Fortnight Shipments Included in this Settlement</span>
                        </span>
                        <span className="text-[11px] text-[#64748b]">
                          Hamali & Transport deducted once per shipment
                        </span>
                      </div>

                      {farmerShipments.length === 0 ? (
                        <div className="text-xs text-[#64748b] py-2">
                          No shipments found in this date range.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {farmerShipments.map((shp) => (
                            <div
                              key={shp.id}
                              className="bg-white rounded-xl p-3 sm:p-4 border border-[#e2e8f0] shadow-2xs space-y-2.5 text-xs"
                            >
                              {/* Shipment Meta */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#1a3a52] bg-[#eef3f7] px-2 py-0.5 rounded">
                                    {shp.shipmentNumber}
                                  </span>
                                  <span className="text-[#1e293b] font-semibold">
                                    📅 {formatDisplayDate(shp.date)}
                                  </span>
                                  <span className="text-[#64748b]">⏰ {shp.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {shp.notes && <span className="text-[#64748b]">💬 {shp.notes}</span>}
                                  <button
                                    type="button"
                                    id={`delete-shipment-btn-${shp.id}`}
                                    onClick={() => {
                                      setDeleteModalConfig({
                                        isOpen: true,
                                        title: 'Delete Shipment Record',
                                        itemName: `Shipment: ${shp.shipmentNumber}`,
                                        itemDetails: `Farmer: ${shp.farmerName} • Varieties: ${shp.items?.length || 0} • Gross Amount: ₹${(shp.grossTotal || 0).toLocaleString('en-IN')}`,
                                        message: `Are you sure you want to delete this shipment? This will permanently remove all flower items and deduction charges for this shipment from the settlement calculation.`,
                                        onConfirm: () => {
                                          deleteShipment(shp.id);
                                          sounds.playTrashSound?.();
                                          setActionFeedbackMsg(`✓ Shipment ${shp.shipmentNumber} deleted successfully.`);
                                          setTimeout(() => setActionFeedbackMsg(null), 3500);
                                          setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }));
                                        },
                                      });
                                    }}
                                    className="p-1 rounded text-[#9E3A24] hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
                                    title="Delete this shipment record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Flower Items Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="text-[10px] uppercase font-bold text-[#64748b] border-b border-[#f1f5f9]">
                                      <th className="pb-1">Variety</th>
                                      <th className="pb-1 text-center">No. of Boxes</th>
                                      <th className="pb-1 text-right">Quantity</th>
                                      <th className="pb-1 text-right">Rate</th>
                                      <th className="pb-1 text-right">Gross Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#f1f5f9]">
                                    {shp.items.map((item) => (
                                      <tr key={item.id} className="text-xs">
                                        <td className="py-1.5 font-bold text-[#1e293b]">
                                          {item.flowerVariety}
                                        </td>
                                        <td className="py-1.5 text-center font-mono font-bold text-[#1e293b]">
                                          {item.boxesCount ? `${item.boxesCount} Boxes` : '0 Boxes'}
                                        </td>
                                        <td className="py-1.5 text-right text-[#64748b]">
                                          {item.quantity} {item.unit}
                                        </td>
                                        <td className="py-1.5 text-right text-[#64748b]">
                                          ₹{item.rate}/{item.unit}
                                        </td>
                                        <td className="py-1.5 text-right font-bold text-[#1e293b]">
                                          ₹{item.grossTotal.toLocaleString('en-IN')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Deductions applied ONCE for this shipment */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9] bg-[#f8fafc] p-2 rounded-lg font-mono text-xs">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span>
                                    Shipment Gross: <strong>₹{shp.grossTotal.toLocaleString('en-IN')}</strong>
                                  </span>
                                  <span>•</span>
                                  <span className="text-[#B24C27]">
                                    Hamali (one worker/trip): <strong>-₹{shp.hamaliCharge}</strong>
                                  </span>
                                  <span>•</span>
                                  <span className="text-[#B24C27]">
                                    Transport (one truck/trip): <strong>-₹{shp.transportCharge}</strong>
                                  </span>
                                </div>
                                <div className="text-[#1a3a52] font-bold">
                                  Net After Daily Cuts: ₹{shp.netAmountAfterDailyCuts.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Settle & Pay */}
      {activeSettlingItem && (
        <div
          id="settle-pay-modal-overlay"
          onClick={() => setActiveSettlingItem(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            id="settle-pay-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSettlingItem(null)}
                  aria-label="Go Back"
                  className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-[#eef3f7] text-[#1a3a52] hidden sm:flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5 text-[#d4af37]" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#1e293b] leading-tight">
                    Confirm 15-Day Payout
                  </h4>
                  <span className="text-xs text-[#64748b]">{activeSettlingItem.periodLabel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSettlingItem(null)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Farmer summary */}
            <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Farmer:</span>
                <span className="font-bold text-[#1e293b]">{activeSettlingItem.farmerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Village:</span>
                <span>{activeSettlingItem.farmerVillage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Pending Amount (after daily cuts):</span>
                <span className="font-bold">₹{activeSettlingItem.pendingAmountAfterDailyCuts.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#8C6218]">
                <span>Less Commission ({activeSettlingItem.commissionPercent}%):</span>
                <span className="font-bold">-₹{activeSettlingItem.commissionAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-purple-700">
                <span>Less Misc Expenses ({activeSettlingItem.miscPercent}%):</span>
                <span className="font-bold">-₹{(activeSettlingItem.miscAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-[#e2e8f0] pt-1.5 flex justify-between text-sm">
                <span className="font-extrabold text-[#1e293b]">Final Payout Amount:</span>
                <span className="font-black text-lg text-[#1a3a52]">
                  ₹{activeSettlingItem.finalPayment.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1e293b] block">
                Select Payment Mode:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'UPI', 'Bank Transfer'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPayMode(mode)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      payMode === mode
                        ? 'border-[#1a3a52] bg-[#eef3f7] text-[#1a3a52]'
                        : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference # */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1e293b] block">
                Reference / UTR / Voucher # (Optional):
              </label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. UTR-98481234, Cash Receipt #12"
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs focus:ring-2 focus:ring-[#1a3a52] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSettlingItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="submit-confirm-payout-btn"
                onClick={handleConfirmPay}
                className="flex-1 py-2.5 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition shadow-xs"
              >
                Confirm & Mark Settled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Success Receipt */}
      {isSuccessModalOpen && lastSettledReceipt && (
        <div
          id="settle-success-modal-overlay"
          onClick={() => setIsSuccessModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="settle-success-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl border border-[#e2e8f0] relative animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              aria-label="Go Back"
              className="absolute top-4 left-4 w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#1a3a52] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-[#1e293b]">
                Settlement Completed Successfully!
              </h4>
              <p className="text-xs text-[#64748b]">
                Fortnight settlement for <strong>{lastSettledReceipt.farmerName}</strong> has been recorded and marked as Settled.
              </p>
            </div>
            <div className="bg-[#eef3f7] p-3 rounded-xl text-center">
              <span className="text-xs text-[#1a3a52] font-bold block">Paid Amount</span>
              <span className="text-2xl font-black text-[#1a3a52]">
                ₹{lastSettledReceipt.finalPayment.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  setPrintStatement(lastSettledReceipt);
                }}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition"
              >
                Voucher Statement
              </button>
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable 15-Day Settlement Voucher / PDF View */}
      {printStatement && (() => {
        const farmerShipments = shipments
          .filter((s) => s.farmerId === printStatement.farmerId && s.date >= printStatement.periodStart && s.date <= printStatement.periodEnd)
          .sort((a, b) => a.date.localeCompare(b.date));

        const periodLabel = printStatement.periodStart === '2024-09-01' && printStatement.periodEnd === '2024-09-15'
          ? 'Sep 1-15, 2024'
          : `${formatShortDate(printStatement.periodStart)}-${formatShortDate(printStatement.periodEnd).split(' ')[1] || printStatement.periodEnd.split('-')[2]}, ${printStatement.periodStart.split('-')[0]}`;

        const farmerDisplayName = printStatement.farmerName.split('(')[0].trim().toUpperCase() || printStatement.farmerName.toUpperCase();

        const totalSales = printStatement.totalGross;
        const totalHamali = printStatement.totalHamali;
        const totalTransport = printStatement.totalTransport;
        const commPercent = printStatement.commissionPercent ?? 4;
        const commAmount = printStatement.commissionAmount ?? Math.round(totalSales * (commPercent / 100));
        const mPercent = printStatement.miscPercent ?? miscRate;
        const mAmount = printStatement.miscAmount ?? Math.round(totalSales * (mPercent / 100));
        const farmerNet = printStatement.finalPayment ?? Math.max(0, totalSales - totalHamali - totalTransport - commAmount - mAmount);
        const totalCut = printStatement.totalDeductionsCut ?? (totalHamali + totalTransport + commAmount + mAmount);

        return (
          <div
            id="settlement-print-modal-overlay"
            onClick={() => setPrintStatement(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div
              id="settlement-print-modal-dialog"
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#e2e8f0] my-6 max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Top Action Toolbar */}
              <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setPrintStatement(null)}
                    aria-label="Go Back"
                    className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
                    title="Go Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-[#1a3a52]/10 hidden sm:flex items-center justify-center text-[#1a3a52] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#1e293b]">भारत MANDI - Settlement Report</h3>
                    <p className="text-[11px] text-[#64748b]">{farmerDisplayName} • {periodLabel}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Download PDF */}
                  <button
                    type="button"
                    id="download-settlement-pdf-btn"
                    disabled={isGeneratingPdf}
                    onClick={() => handleDownloadSettlementPdf(printStatement)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
                    title="Generate and Download PDF file"
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#d4af37] animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                    )}
                    <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Form C PDF'}</span>
                  </button>

                  {/* Download CSV */}
                  <button
                    type="button"
                    id="download-settlement-csv-btn"
                    onClick={() => handleDownloadCSV(printStatement)}
                    className="px-3 py-1.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-bold text-[#1e293b] hover:bg-[#f1f5f9] flex items-center gap-1.5 shadow-2xs transition"
                    title="Download identical CSV Report"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#1a3a52]" />
                    <span>CSV</span>
                  </button>

                  {/* Copy Report */}
                  <button
                    type="button"
                    id="copy-settlement-report-btn"
                    onClick={() => handleCopyReport(printStatement)}
                    className="px-3 py-1.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-bold text-[#1e293b] hover:bg-[#f1f5f9] flex items-center gap-1.5 shadow-2xs transition"
                    title="Copy Formatted Report Text"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#1a3a52]" />
                        <span className="text-[#1a3a52]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#64748b]" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>

                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => setPrintStatement(null)}
                    className="px-3 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] transition"
                  >
                    Close
                  </button>
                </div>
              </div>

              {pdfStatusMessage && (
                <div className="no-print p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{pdfStatusMessage}</span>
                </div>
              )}

              {/* Printable Area - Formatted with exact specification */}
              <div className="overflow-y-auto flex-1 pr-1 print:overflow-visible">
                <div
                  ref={settlementDocRef}
                  id="settlement-printable-doc-canvas"
                  className="border-2 border-black p-5 sm:p-7 bg-white text-black font-mono text-xs leading-relaxed space-y-5 rounded-lg"
                >
                  {/* Top Double Line Header */}
                  <div className="border-y-4 border-double border-black py-2.5 text-center font-bold tracking-tight">
                    <div className="text-sm font-black uppercase">
                      SETTLEMENT REPORT - {farmerDisplayName}
                    </div>
                    <div className="text-xs text-gray-800 pt-0.5">
                      Period: {periodLabel}
                    </div>
                    <div className="text-[11px] font-bold pt-1">
                      Status:{' '}
                      <span className={printStatement.status === 'settled' ? 'text-emerald-800 uppercase' : 'text-amber-800 uppercase'}>
                        {printStatement.status === 'settled' ? 'FULLY SETTLED' : 'PENDING PAYOUT'}
                      </span>
                    </div>
                  </div>

                  {/* TRANSACTIONS TABLE */}
                  <div className="space-y-1.5">
                    <div className="font-bold text-xs tracking-wider uppercase">
                      TRANSACTIONS
                    </div>
                    <div className="border-t border-black pt-1">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-black">
                            <th className="py-1.5 pr-2 font-bold w-20">Date</th>
                            <th className="py-1.5 px-2 font-bold">Varieties</th>
                            <th className="py-1.5 px-2 font-bold text-center w-20">No. of Boxes</th>
                            <th className="py-1.5 px-2 font-bold text-right w-16">Qty</th>
                            <th className="py-1.5 pl-2 font-bold text-right w-24">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {farmerShipments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-3 text-center text-gray-500 italic">
                                No transactions recorded for this period.
                              </td>
                            </tr>
                          ) : (
                            farmerShipments.map((s) => {
                              const varieties = s.items
                                .map((i) => i.flowerVariety.replace(/\s*\([^)]*\)/g, '').trim())
                                .join(' + ');
                              const totalBoxes = s.items.reduce((sum, i) => sum + (i.boxesCount || 0), 0);
                              const totalQty = s.items.reduce((sum, i) => sum + i.quantity, 0);
                              return (
                                <tr key={s.id}>
                                  <td className="py-1.5 pr-2 font-semibold">{formatShortDate(s.date)}</td>
                                  <td className="py-1.5 px-2 text-gray-800">{varieties}</td>
                                  <td className="py-1.5 px-2 text-center text-gray-800 font-bold">{totalBoxes} Boxes</td>
                                  <td className="py-1.5 px-2 text-right text-gray-700">{totalQty}kg</td>
                                  <td className="py-1.5 pl-2 text-right font-bold">₹{s.grossTotal.toLocaleString('en-IN')}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DOUBLE DIVIDER */}
                  <div className="border-b-4 border-double border-black my-3"></div>

                  {/* CALCULATION BREAKDOWN */}
                  <div className="space-y-3">
                    <div className="font-bold text-xs tracking-wider uppercase border-b border-black pb-1">
                      CALCULATION BREAKDOWN
                    </div>

                    {/* 1. TOTAL SALES */}
                    <div className="flex items-center justify-between font-bold py-1">
                      <span>1. TOTAL SALES:</span>
                      <span className="text-sm">₹{totalSales.toLocaleString('en-IN')}</span>
                    </div>

                    {/* 2. HAMALI CHARGES */}
                    <div className="space-y-1 pt-1">
                      <div className="font-semibold text-gray-800">
                        2. HAMALI CHARGES (Merchant's Cost):
                      </div>
                      <div className="pl-4 space-y-0.5 text-gray-700">
                        {farmerShipments.map((s) => (
                          <div key={`h-${s.id}`} className="flex justify-between">
                            <span>{formatShortDate(s.date)}:</span>
                            <span>₹{s.hamaliCharge.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-400 pt-1 flex justify-between font-bold pl-4 text-red-700">
                        <span>TOTAL HAMALI:</span>
                        <span>-₹{totalHamali.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* 3. TRANSPORT/VEHICLE CHARGES */}
                    <div className="space-y-1 pt-1">
                      <div className="font-semibold text-gray-800">
                        3. TRANSPORT/VEHICLE CHARGES (Merchant's Cost):
                      </div>
                      <div className="pl-4 space-y-0.5 text-gray-700">
                        {farmerShipments.map((s) => (
                          <div key={`t-${s.id}`} className="flex justify-between">
                            <span>{formatShortDate(s.date)}:</span>
                            <span>₹{s.transportCharge.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-400 pt-1 flex justify-between font-bold pl-4 text-red-700">
                        <span>TOTAL TRANSPORT:</span>
                        <span>-₹{totalTransport.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* DOUBLE DIVIDER */}
                    <div className="border-b-4 border-double border-black my-2"></div>

                    {/* 4 & 5. MANDI COMMISSION & MISCELLANEOUS CHARGES (SIDE-BY-SIDE) */}
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-gray-50 border border-gray-300 rounded">
                      {/* Mandi Commission */}
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-900 text-xs">
                          4. MANDI COMMISSION ({commPercent}%)
                        </div>
                        <div className="text-[11px] text-gray-600">Rate: {commPercent}% on Gross Total</div>
                        <div className="flex justify-between font-bold text-red-700 text-xs pt-0.5">
                          <span>Amount:</span>
                          <span>-₹{commAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Miscellaneous Charges */}
                      <div className="space-y-0.5 border-l border-gray-300 pl-3">
                        <div className="font-semibold text-gray-900 text-xs">
                          5. MISCELLANEOUS CHARGES ({mPercent}%)
                        </div>
                        <div className="text-[11px] text-gray-600">Rate: {mPercent}% on Gross Total</div>
                        <div className="flex justify-between font-bold text-red-700 text-xs pt-0.5">
                          <span>Amount:</span>
                          <span>-₹{mAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* DOUBLE DIVIDER */}
                    <div className="border-b-4 border-double border-black my-2"></div>

                    {/* FARMER'S NET TOTAL */}
                    <div className="space-y-1 py-1">
                      <div className="font-black text-xs sm:text-sm uppercase">
                        NET FARMER AMOUNT:
                      </div>
                      <div className="flex justify-between items-center font-black text-sm sm:text-base pl-4 text-[#1a3a52] bg-emerald-50 p-2 rounded">
                        <span className="text-xs text-black font-normal">
                          ₹{totalSales.toLocaleString('en-IN')} - ₹{totalHamali.toLocaleString('en-IN')} - ₹{totalTransport.toLocaleString('en-IN')} - ₹{commAmount.toLocaleString('en-IN')} - ₹{mAmount.toLocaleString('en-IN')}
                        </span>
                        <span>= ₹{farmerNet.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* DOUBLE DIVIDER */}
                    <div className="border-b-4 border-double border-black my-2"></div>

                    {/* MERCHANT'S DEDUCTIONS SUMMARY */}
                    <div className="space-y-1 pt-1">
                      <div className="font-bold text-xs uppercase">
                        MERCHANT'S DEDUCTIONS SUMMARY (from Farmer's Total)
                      </div>
                      <div className="pl-4 space-y-0.5 text-gray-800">
                        <div className="flex justify-between">
                          <span>Hamali Charges:</span>
                          <span>₹{totalHamali.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transport Charges:</span>
                          <span>₹{totalTransport.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex justify-between">
                            <span>Mandi Comm ({commPercent}%):</span>
                            <span>₹{commAmount.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between border-l border-gray-300 pl-2">
                            <span>Misc Charges ({mPercent}%):</span>
                            <span>₹{mAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <div className="border-t border-black pt-1 flex justify-between font-black text-xs">
                          <span>TOTAL CUT:</span>
                          <span>₹{totalCut.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM DOUBLE BORDER */}
                    <div className="border-b-4 border-double border-black my-4"></div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 pt-6 text-xs text-center">
                      <div>
                        <div className="border-t border-dashed border-gray-400 w-36 mx-auto mb-1"></div>
                        <span className="font-sans text-[11px] text-gray-700">Farmer Signature / Thumb</span>
                      </div>
                      <div>
                        <div className="border-t border-dashed border-gray-400 w-36 mx-auto mb-1"></div>
                        <span className="font-sans text-[11px] text-gray-700">Adathiya Commission Agent</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Action Feedback Notification */}
      {actionFeedbackMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#1e293b] text-white px-4 py-2.5 rounded-xl shadow-xl border border-white/20 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-[#d4af37]" />
          <span>{actionFeedbackMsg}</span>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title={deleteModalConfig.title}
        itemName={deleteModalConfig.itemName}
        itemDetails={deleteModalConfig.itemDetails}
        message={deleteModalConfig.message}
        confirmText="CONFIRM DELETE"
        cancelText="CANCEL"
        onConfirm={deleteModalConfig.onConfirm}
        onCancel={() => setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
