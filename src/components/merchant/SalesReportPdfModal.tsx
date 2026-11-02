import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  Calendar,
  FileText,
  Sparkles,
  ArrowLeft,
  Check,
  Building,
  User,
  Phone,
  Clock,
  Coins,
  TrendingUp,
  Filter,
  Loader2,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { CommodityCategory } from '../../types';
import {
  getTodayDateString,
  getPastDateString,
  COMMODITY_CONFIGS,
} from '../../data/initialData';
import {
  exportElementToPdf,
  printHtmlViaIframe,
  sharePdfFile,
  canSharePdfFile,
  acquireGlobalShareLock,
  releaseGlobalShareLock,
} from '../../utils/pdfExport';
import { sounds } from '../../utils/audio';

interface SalesReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export const SalesReportPdfModal: React.FC<SalesReportPdfModalProps> = ({
  isOpen,
  onClose,
  initialStartDate,
  initialEndDate,
}) => {
  const {
    merchantProfile,
    currentUserPhone,
    lots,
    shipments,
    farmers,
    userCommodities,
    activeCommodityFilter,
    t,
  } = useMandi();

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Date Range State
  const todayStr = getTodayDateString();
  const fifteenDaysAgoStr = getPastDateString(14); // 15 days total inclusive

  const [startDate, setStartDate] = useState<string>(initialStartDate || fifteenDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(initialEndDate || todayStr);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityCategory | 'all'>('all');

  const selectedFarmer = useMemo(() => {
    if (selectedFarmerId === 'all') return null;
    return farmers.find((f) => f.id === selectedFarmerId) || null;
  }, [farmers, selectedFarmerId]);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

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

  // Format date helper (e.g. "2026-09-16" -> "16/09/2026")
  const formatDateSlash = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parts[2].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[0];
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Quick Date Presets
  const applyPreset = (daysAgo: number) => {
    sounds.playBidTick?.();
    setEndDate(todayStr);
    setStartDate(getPastDateString(daysAgo - 1));
  };

  const applyThisMonthPreset = () => {
    sounds.playBidTick?.();
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    setStartDate(firstDay);
    setEndDate(todayStr);
  };

  // Helper dates for preset dynamic active state checking
  const last7DaysStart = getPastDateString(6);
  const last15DaysStart = getPastDateString(14);
  const last30DaysStart = getPastDateString(29);
  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);

  const activePreset = useMemo(() => {
    if (endDate === todayStr) {
      if (startDate === last7DaysStart) return '7';
      if (startDate === last15DaysStart) return '15';
      if (startDate === last30DaysStart) return '30';
      if (startDate === currentMonthStart) return 'month';
    }
    return 'custom';
  }, [startDate, endDate, todayStr, last7DaysStart, last15DaysStart, last30DaysStart, currentMonthStart]);

  const getPresetBtnClass = (presetKey: '7' | '15' | '30' | 'month') => {
    const isActive = activePreset === presetKey;
    return isActive
      ? 'px-2.5 py-1 text-xs font-bold rounded-lg bg-[#1a3a52] text-white border border-[#1a3a52] transition cursor-pointer shadow-2xs'
      : 'px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:border-[#1a3a52] hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs';
  };

  // Generate continuous list of dates from startDate to endDate
  const dateList = useMemo(() => {
    const list: string[] = [];
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return [startDate];
      }

      const current = new Date(start);
      while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        list.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 1);
      }
    } catch {
      list.push(startDate);
    }
    return list;
  }, [startDate, endDate]);

  const totalDaysCount = dateList.length;

  // Aggregate daily sales breakdown for each date in dateList
  const dailySalesData = useMemo(() => {
    return dateList.map((dStr, index) => {
      // Find lots for this date
      let dateLots = lots.filter((l) => l.date === dStr);
      // Find shipments for this date
      let dateShipments = shipments.filter((s) => s.date === dStr);

      // Filter by selected farmer if specified
      if (selectedFarmerId !== 'all') {
        dateLots = dateLots.filter((l) => l.farmerId === selectedFarmerId);
        dateShipments = dateShipments.filter((s) => s.farmerId === selectedFarmerId);
      }

      // Filter by selected commodity if specified
      let filteredLots = dateLots;
      let filteredShipments = dateShipments;

      if (selectedCommodity !== 'all') {
        filteredLots = dateLots.filter((l) => (l.commodityCategory || 'flowers') === selectedCommodity);
        filteredShipments = dateShipments.filter((s) =>
          s.items?.some((item) => (item.commodityCategory || 'flowers') === selectedCommodity)
        );
      }

      // Calculate total daily gross sales
      const lotsTotal = filteredLots.reduce((sum, l) => sum + (Number(l.grossTotal) || 0), 0);
      const shipmentsTotal = filteredShipments.reduce((sum, s) => sum + (Number(s.grossTotal) || 0), 0);

      // Note: Standalone lots without shipmentId + shipments grossTotal
      const standaloneLots = filteredLots.filter((l) => !l.shipmentId || filteredShipments.length === 0);
      const standaloneLotsTotal = standaloneLots.reduce((sum, l) => sum + (Number(l.grossTotal) || 0), 0);

      const dailySaleAmount = filteredShipments.length > 0
        ? shipmentsTotal + standaloneLotsTotal
        : lotsTotal;

      return {
        sNo: index + 1,
        rawDate: dStr,
        displayDate: formatDateSlash(dStr),
        saleAmount: dailySaleAmount,
        lotCount: filteredLots.length,
        shipmentCount: filteredShipments.length,
      };
    });
  }, [dateList, lots, shipments, selectedFarmerId, selectedCommodity]);

  // Total sales across the date range
  const grandTotalSales = useMemo(() => {
    return dailySalesData.reduce((sum, item) => sum + item.saleAmount, 0);
  }, [dailySalesData]);

  // Handle PDF Export
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    sounds.playBidTick?.();
    setIsExporting(true);
    setStatusMsg('Generating Sales Report PDF...');

    try {
      const filename = `Sales_Report_${startDate}_to_${endDate}.pdf`;
      const res = await exportElementToPdf(printAreaRef.current, {
        filename,
        title: `${merchantProfile.shopName || 'Mandi'} Sales Report`,
        format: 'a4',
        orientation: 'portrait',
        marginMm: 6,
        fitToPage: false,
        autoDownload: true,
      });

      if (res.success) {
        setStatusMsg('✓ Sales Report PDF downloaded successfully!');
        sounds.playCashChime?.();
      } else {
        setStatusMsg('Failed to generate PDF. Trying direct print...');
        printHtmlViaIframe(printAreaRef.current, 'Sales Report');
      }
    } catch (e) {
      console.error(e);
      setStatusMsg('Printing report...');
      printHtmlViaIframe(printAreaRef.current, 'Sales Report');
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handlePrint = () => {
    if (!printAreaRef.current) return;
    sounds.playBidTick?.();
    printHtmlViaIframe(printAreaRef.current, `Sales Report ${startDate} to ${endDate}`);
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isExporting || !printAreaRef.current) return;

    // Acquire global share lock synchronously BEFORE PDF rendering starts
    if (!acquireGlobalShareLock()) {
      return;
    }

    sounds.playBidTick?.();
    setIsExporting(true);
    setStatusMsg('Preparing PDF for sharing...');

    try {
      const filename = `Sales_Report_${startDate}_to_${endDate}.pdf`;
      const res = await exportElementToPdf(printAreaRef.current, {
        filename,
        title: `Sales Report (${startDate} - ${endDate})`,
        format: 'a4',
        marginMm: 6,
        fitToPage: false,
        autoDownload: false,
      });

      if (res.blob) {
        const shareRes = await sharePdfFile({
          blob: res.blob,
          filename,
          title: `Daily Sales Report (${formatDateSlash(startDate)} - ${formatDateSlash(endDate)})`,
        });

        if (shareRes.shared) {
          setStatusMsg('✓ Sales Report PDF shared successfully!');
          sounds.playCashChime?.();
        } else {
          setStatusMsg('✓ PDF downloaded.');
        }
      }
    } catch {
      handleDownloadPdf();
    } finally {
      setIsExporting(false);
      releaseGlobalShareLock(2500);
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* MODAL HEADER */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Go Back"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/20 hidden sm:flex items-center justify-center text-white shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                Daily Sales Report PDF (Custom Range)
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-200/80 leading-none mt-0.5">
                Generate official daily sales statement for any custom date range
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DATE RANGE FILTER CONTROLS */}
        <div className="bg-[#f8fafc] border-b border-slate-200 p-4 space-y-3 shrink-0">
          {/* Quick Date Range Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#1a3a52]" />
              Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className={getPresetBtnClass('7')}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(15)}
              className={getPresetBtnClass('15')}
            >
              Last 15 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className={getPresetBtnClass('30')}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={applyThisMonthPreset}
              className={getPresetBtnClass('month')}
            >
              This Month
            </button>
          </div>

          {/* Custom Date Pickers, Farmer Selector & Commodity Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="sales-report-start-date" className="block text-[11px] font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                Start Date *
              </label>
              <input
                id="sales-report-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#1a3a52] font-semibold text-xs text-slate-800 outline-none bg-white"
              />
            </div>

            <div>
              <label htmlFor="sales-report-end-date" className="block text-[11px] font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                End Date *
              </label>
              <input
                id="sales-report-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#1a3a52] font-semibold text-xs text-slate-800 outline-none bg-white"
              />
            </div>

            <div>
              <label htmlFor="sales-report-farmer" className="block text-[11px] font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                Farmer Filter
              </label>
              <select
                id="sales-report-farmer"
                value={selectedFarmerId}
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#1a3a52] font-semibold text-xs text-slate-800 outline-none bg-white font-bold"
              >
                <option value="all">All Farmers</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.village ? `(${f.village})` : ''}
                  </option>
                ))}
              </select>
            </div>



            <div>
              <label htmlFor="sales-report-commodity" className="block text-[11px] font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                Commodity Filter
              </label>
              <select
                id="sales-report-commodity"
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value as CommodityCategory | 'all')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#1a3a52] font-semibold text-xs text-slate-800 outline-none bg-white"
              >
                <option value="all">All Commodities</option>
                {userCommodities.map((cat) => (
                  <option key={cat} value={cat}>
                    {COMMODITY_CONFIGS[cat]?.name || cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* FEEDBACK STATUS TOAST */}
        {statusMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-extrabold text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{statusMsg}</span>
            </div>
          </div>
        )}

        {/* SCROLLABLE PDF PREVIEW CANVAS */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-slate-100 min-h-0">
          <div className="max-w-[780px] mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md">
            {/* TARGET PRINT AREA - Standardized A4 PDF Template matching user layout */}
            <div
              ref={printAreaRef}
              id="sales-report-pdf-area"
              className="bg-white text-slate-900 font-sans p-2 sm:p-4 space-y-6 print-no-break"
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              {/* TOP BADGE HEADER */}
              <div className="flex items-center justify-between pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-[#f1f5f9] px-3.5 py-1 rounded-full border border-slate-200/80">
                  MANDI DAILY SALES REPORT
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#137333] bg-[#e6f4ea] px-3.5 py-1 rounded-full border border-[#ceead6]">
                  OFFICIAL SALES REPORT
                </span>
              </div>

              {/* SHOP & MERCHANT IDENTITY */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight uppercase leading-tight">
                  {merchantProfile.shopName || 'MANDI TRADING CO.'}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-700">
                  {merchantProfile.shopNumber ? `Shop No. ${merchantProfile.shopNumber}` : ''}
                  {merchantProfile.shopNumber && (merchantProfile.marketYardName || merchantProfile.address) ? ' • ' : ''}
                  {merchantProfile.marketYardName || merchantProfile.address || 'Wholesale Market Yard'}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Proprietor: <strong className="text-slate-800 font-semibold">{merchantProfile.ownerName || 'Merchant Trader'}</strong>
                  {(merchantProfile.phoneNumber || currentUserPhone) && (
                    <> | Contact: <strong className="text-slate-800 font-semibold">{merchantProfile.phoneNumber || currentUserPhone}</strong></>
                  )}
                </p>
              </div>

              {/* REPORT SUMMARY BOX (4 COLUMNS) */}
              <div className="bg-[#f8fafc] rounded-2xl border border-slate-200/80 p-4 sm:p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    REPORT
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#1e293b] block mt-1">
                    Daily Sales Report
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    FARMER FILTER
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#1e293b] block mt-1 truncate">
                    {selectedFarmer ? `${selectedFarmer.name} ${selectedFarmer.village ? `(${selectedFarmer.village})` : ''}` : 'All Farmers'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    DATE RANGE
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#1e293b] block mt-1">
                    {formatDateSlash(startDate)} – {formatDateSlash(endDate)}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    TOTAL DAYS
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#1e293b] block mt-1">
                    {totalDaysCount} Days
                  </span>
                </div>
              </div>

              {/* DAILY SALES BREAKDOWN TABLE */}
              <div className="overflow-hidden border border-slate-200/80 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#edf2f7] text-[#1e293b] text-xs font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-5 w-20">S.NO</th>
                      <th className="py-3.5 px-5">DATE</th>
                      <th className="py-3.5 px-5 text-right">SALE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-semibold">
                    {dailySalesData.map((row) => (
                      <tr key={row.rawDate} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-5 font-mono text-slate-400 font-medium">{row.sNo}</td>
                        <td className="py-3 px-5 font-bold text-slate-900">{row.displayDate}</td>
                        <td className="py-3 px-5 text-right font-mono font-black text-slate-900">
                          ₹{row.saleAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTAL SALES AMOUNT BANNER */}
              <div className="bg-[#0b5e39] text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-200 block">
                    TOTAL SALES AMOUNT
                  </span>
                  <span className="text-xs text-emerald-100/90 font-medium mt-0.5 block">
                    Total sale for {formatDateSlash(startDate)} to {formatDateSlash(endDate)}{selectedFarmer ? ` (${selectedFarmer.name})` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-white block">
                    ₹{grandTotalSales.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* AUTHORIZED SIGNATURE & FOOTER */}
              <div className="pt-6 space-y-6">
                <div className="text-right space-y-0.5">
                  <p className="text-xs font-bold text-slate-700">
                    For {merchantProfile.shopName || 'Mandi Trading Co.'}
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    (Authorized Signatory / Mandi Licensee)
                  </p>
                </div>

                <div className="text-center pt-4 border-t border-slate-200">
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
                    DAILY SALES REPORT • {merchantProfile.shopName || 'MANDI TRADER'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS BAR */}
        <div className="bg-white border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{totalDaysCount} days</strong> ({formatDateSlash(startDate)} to {formatDateSlash(endDate)}){selectedFarmer ? ` • Farmer: ${selectedFarmer.name}` : ''} • Total: <strong className="text-emerald-700 font-bold">₹{grandTotalSales.toLocaleString('en-IN')}</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              id="sales-report-print-btn"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print</span>
            </button>

            {canSharePdfFile() && (
              <button
                type="button"
                id="sales-report-share-btn"
                onClick={handleShare}
                disabled={isExporting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Share2 className="w-4 h-4 text-slate-800" />
                <span>Share PDF</span>
              </button>
            )}

            <button
              type="button"
              id="sales-report-download-btn"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>Download Sales Report PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
