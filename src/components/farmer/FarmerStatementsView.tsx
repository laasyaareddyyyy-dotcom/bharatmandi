import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Store,
  Phone,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  ShieldCheck,
  Trash2,
  Receipt,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { SyncedFarmerStatement, CommodityCategory } from '../../types';
import { FormCInvoiceCanvas, FormCInvoiceData } from '../common/FormCInvoiceCanvas';
import { exportElementToPdf, printHtmlViaIframe } from '../../utils/pdfExport';
import { sounds } from '../../utils/audio';

interface FarmerStatementsViewProps {
  farmerPhone: string;
  farmerName: string;
  selectedCategory?: CommodityCategory;
}

export const FarmerStatementsView: React.FC<FarmerStatementsViewProps> = ({
  farmerPhone,
  farmerName,
  selectedCategory,
}) => {
  const {
    getSyncedStatementsForFarmer,
    deleteSyncedStatement,
    language,
    t,
  } = useMandi();

  const cleanPhone = farmerPhone ? farmerPhone.replace(/\D/g, '').slice(-10) : '';
  const statements = useMemo(() => {
    return getSyncedStatementsForFarmer(cleanPhone);
  }, [getSyncedStatementsForFarmer, cleanPhone]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<SyncedFarmerStatement | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [expandedStatementId, setExpandedStatementId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Filtered statements per selected category and search query
  const filteredStatements = useMemo(() => {
    let list = statements;
    if (selectedCategory) {
      list = list.filter((s) => (s.commodityCategory || 'flowers') === selectedCategory);
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((s) => {
      const matchMerchant = s.merchantName.toLowerCase().includes(q) || (s.merchantShopNumber && s.merchantShopNumber.toLowerCase().includes(q));
      const matchNumber = s.statementNumber.toLowerCase().includes(q);
      const matchDate = (s.periodLabel || s.date || '').toLowerCase().includes(q);
      const matchCrops = s.items ? s.items.some((it) => (it.flowerVariety || it.cropVariety || '').toLowerCase().includes(q)) : false;
      return matchMerchant || matchNumber || matchDate || matchCrops;
    });
  }, [statements, searchQuery, selectedCategory]);

  // Aggregate stats
  const totalReceived = statements.length;
  const totalNetReceivable = statements.reduce((acc, s) => acc + (s.farmerNetPayable || 0), 0);
  const totalBalancePending = statements.reduce((acc, s) => acc + (s.balanceDue || 0), 0);
  const totalPaid = statements.reduce((acc, s) => acc + (s.amountPaid || 0), 0);

  // Open full Form C modal
  const handleOpenStatementModal = (statement: SyncedFarmerStatement) => {
    setSelectedStatement(statement);
    setIsPdfModalOpen(true);
  };

  // Convert SyncedFarmerStatement to FormCInvoiceData
  const activeFormCData = useMemo<FormCInvoiceData | null>(() => {
    if (!selectedStatement || !Array.isArray(selectedStatement.items)) return null;

    const items = selectedStatement.items.map((it, idx) => ({
      id: `it-${idx}`,
      flowerVariety: it.flowerVariety || it.cropVariety || 'Parchi Item',
      flowerQuality: it.quality || 'Good',
      quantity: it.quantity,
      unit: it.unit || 'Kgs',
      boxesCount: it.boxesCount || 0,
      packagingType: it.boxesCount ? 'Boxes' : 'Direct arrival',
      rate: it.rate,
      grossTotal: it.grossTotal,
    }));

    return {
      parchiNumber: selectedStatement.statementNumber,
      date: selectedStatement.dateRange || selectedStatement.date,
      time: selectedStatement.generatedAt,
      farmerName: selectedStatement.farmerName || farmerName,
      farmerVillage: 'Mandi Grower Belt',
      farmerPhone: selectedStatement.farmerPhone,
      items: items.length > 0 ? items : [
        {
          id: 'placeholder',
          flowerVariety: 'Parchi Item',
          flowerQuality: 'Standard',
          quantity: 1,
          unit: 'Kgs',
          boxesCount: 0,
          rate: selectedStatement.grossTotal,
          grossTotal: selectedStatement.grossTotal,
        },
      ],
      grossTotal: selectedStatement.grossTotal,
      transportCharges: selectedStatement.transportCharges || 0,
      ammaliCharges: selectedStatement.hamaliCharges || 0,
      commissionPercent: selectedStatement.grossTotal > 0
        ? Math.round((selectedStatement.commissionAmount / selectedStatement.grossTotal) * 100)
        : 4,
      commissionAmount: selectedStatement.commissionAmount,
      farmerNetPayable: selectedStatement.farmerNetPayable,
      amountPaid: selectedStatement.amountPaid,
      balanceDue: selectedStatement.balanceDue,
      paymentMode: 'Bank Transfer / Cash',
      paymentStatus: selectedStatement.paymentStatus,
      notes: `Synced from ${selectedStatement.merchantName} via BharatMandi Mutual Connect`,
    };
  }, [selectedStatement, farmerName]);

  // Handle Download PDF
  const handleDownloadPdf = async () => {
    if (!canvasRef.current || !selectedStatement) return;
    setIsDownloading(true);
    setStatusMsg('Generating official Form C PDF...');
    try {
      const cleanNum = selectedStatement.statementNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `BharatMandi_Statement_${cleanNum}.pdf`;
      const result = await exportElementToPdf(canvasRef.current, {
        filename,
        format: 'a4',
        orientation: 'portrait',
        marginMm: 6,
        scale: 2,
        fitToPage: true,
        autoDownload: true,
      });
      if (result.success) {
        setStatusMsg('✓ Form C PDF downloaded successfully!');
      } else {
        setStatusMsg(`Failed: ${result.error || 'PDF Generation Error'}`);
      }
    } catch (err) {
      console.error('Download error:', err);
      setStatusMsg('Error downloading PDF');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{statusMsg}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-white/80 hover:text-white text-xs uppercase px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Metrics Dashboard */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1a3a52] text-white flex items-center justify-center font-black shadow-sm">
              <FileText className="w-6 h-6 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {language === 'te' ? 'వ్యాపారుల నుండి అందిన ఫారమ్ C స్టేట్‌మెంట్లు' : 'Received Form C Mandi Statements'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'te'
                  ? 'కనెక్ట్ అయిన వ్యాపారులు జారీ చేసిన అధికారిక బిల్లులు & ఖాతా స్టేట్‌మెంట్లు'
                  : 'Official statements automatically synced from your connected merchants'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Auto-Sync Verified</span>
            </span>
          </div>
        </div>

        {/* 4 Financial Summary Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Statements</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">{totalReceived}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase block">Total Net Receivable</span>
            <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
              ₹{totalNetReceivable.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-800 uppercase block">Amount Received</span>
            <span className="text-lg sm:text-xl font-black text-blue-700 font-mono">
              ₹{totalPaid.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase block">Pending Balance Due</span>
            <span className="text-lg sm:text-xl font-black text-amber-700 font-mono">
              ₹{totalBalancePending.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative pt-2">
          <Search className="w-4 h-4 absolute left-3 top-5 text-slate-400" />
          <input
            id="farmer-statement-search-input"
            type="text"
            placeholder="Search statements by merchant name, statement ID, crop variety, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1a3a52] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Statements List */}
      {filteredStatements.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-2xl">
            📜
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-black text-base text-slate-900">
              {statements.length === 0 ? 'No Statements Received Yet' : 'No Matching Statements Found'}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {statements.length === 0
                ? 'When a connected merchant generates an official Form C PDF or Katha Statement for you, it will automatically sync and appear right here in real time.'
                : 'Try adjusting your search query above.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStatements.map((stmt) => {
            const isExpanded = expandedStatementId === stmt.id;
            const isPaid = stmt.paymentStatus === 'PAID' || stmt.balanceDue === 0;
            const isPartial = stmt.paymentStatus === 'PARTIAL' || (stmt.amountPaid > 0 && stmt.balanceDue > 0);

            return (
              <div
                key={stmt.id}
                id={`synced-statement-${stmt.id}`}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#1a3a52] text-[#d4af37]">
                        {stmt.statementNumber}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isPartial
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-red-100 text-red-900 border-red-300'
                        }`}
                      >
                        {isPaid ? '✓ PAID IN FULL' : isPartial ? '⚡ PARTIAL PAID' : '⏳ PAYMENT PENDING'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{stmt.dateRange || stmt.date}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <Store className="w-4 h-4 text-[#1a3a52]" />
                      <span className="font-bold text-sm text-slate-900">{stmt.merchantName}</span>
                      {stmt.merchantShopNumber && (
                        <span className="text-xs text-slate-500">• Shop #{stmt.merchantShopNumber}</span>
                      )}
                      {stmt.merchantPhone && (
                        <span className="text-xs font-mono text-[#1a3a52] font-semibold">
                          (📞 +91 {stmt.merchantPhone})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side summary values & primary actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Net Receivable</span>
                      <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                        ₹{stmt.farmerNetPayable.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenStatementModal(stmt)}
                        className="px-3.5 py-2 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 min-touch-target"
                        title="View Official Form C PDF"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>View Form C</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedStatementId(isExpanded ? null : stmt.id)}
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                        title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Waterfall Summary Row */}
                <div className="px-4 sm:px-5 py-3 bg-white grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Gross Sales Value:</span>
                    <span className="font-bold text-slate-800 font-mono">₹{stmt.grossTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mandi Commission:</span>
                    <span className="font-bold text-rose-700 font-mono">
                      - ₹{stmt.commissionAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Amount Paid:</span>
                    <span className="font-bold text-blue-700 font-mono">₹{stmt.amountPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Balance Due:</span>
                    <span
                      className={`font-bold font-mono ${stmt.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}
                    >
                      ₹{stmt.balanceDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Expanded Item Breakdown */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-slate-50 space-y-3 animate-in fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                        Sales Items Breakdown ({stmt.items.length} lots)
                      </h5>
                      <span className="text-[10px] text-slate-500">Generated: {stmt.generatedAt}</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-2.5">Crop / Variety</th>
                            <th className="p-2.5">Quality</th>
                            <th className="p-2.5 text-right">Quantity</th>
                            <th className="p-2.5 text-right">Rate / Unit</th>
                            <th className="p-2.5 text-right">Gross Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {stmt.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{it.flowerVariety || it.cropVariety || 'Parchi Item'}</td>
                              <td className="p-2.5 text-slate-500">{it.quality || 'Good'}</td>
                              <td className="p-2.5 text-right font-mono">
                                {it.quantity} {it.unit}
                              </td>
                              <td className="p-2.5 text-right font-mono">₹{it.rate}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                ₹{it.grossTotal.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTrashSound?.();
                          deleteSyncedStatement(stmt.id);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove from my archive</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenStatementModal(stmt)}
                        className="px-3 py-1.5 rounded-lg bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Open Form C Official Invoice Canvas</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form C Official PDF Modal */}
      {isPdfModalOpen && selectedStatement && activeFormCData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-100 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300 my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#1a3a52] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#d4af37]" />
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    Official Form C Statement • {selectedStatement.statementNumber}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Issued by: {selectedStatement.merchantName} (Shop #{selectedStatement.merchantShopNumber || '—'})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Format: Official A4 Portrait</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 min-touch-target"
                >
                  <Download className="w-4 h-4 text-[#d4af37]" />
                  <span>{isDownloading ? 'Downloading...' : 'Download Form C PDF'}</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Rendered Form C Invoice Canvas */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <FormCInvoiceCanvas
                ref={canvasRef}
                data={activeFormCData}
                format="a4"
                merchantOverride={{
                  shopName: selectedStatement.merchantName,
                  shopNumber: selectedStatement.merchantShopNumber || 'Shop 1',
                  marketYardName: 'Gudimalkapur Market Yard',
                  ownerName: selectedStatement.merchantName,
                  phoneNumber: selectedStatement.merchantPhone ? `+91 ${selectedStatement.merchantPhone}` : '+91 9999999999',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
