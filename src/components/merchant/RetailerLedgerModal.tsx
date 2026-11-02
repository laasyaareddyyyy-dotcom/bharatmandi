import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { Retailer } from '../../types';
import {
  X,
  Store,
  Phone,
  Filter,
  Download,
  FileText,
  Coins,
  Receipt,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { computeRetailerStatement } from '../../utils/retailerStatement';

interface RetailerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailer: Retailer | null;
  onOpenReceivePayment?: (retailerId: string) => void;
  onOpenNewSale?: (retailerId: string) => void;
  onOpenPdfStatement?: (
    retailer: Retailer,
    dateRangeLabel: string,
    startDate?: string,
    endDate?: string
  ) => void;
}

export const RetailerLedgerModal: React.FC<RetailerLedgerModalProps> = ({
  isOpen,
  onClose,
  retailer,
  onOpenReceivePayment,
  onOpenNewSale,
  onOpenPdfStatement,
}) => {
  const { retailerSales, retailerPayments, activeSessionDate } = useMandi();

  const [dateQuickFilter, setDateQuickFilter] = useState<'today' | 'this_week' | 'this_month' | 'last_month' | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filter sales and payments for this specific retailer
  const allRetailerSales = useMemo(() => {
    if (!retailer) return [];
    return retailerSales.filter((s) => s.retailerId === retailer.id);
  }, [retailerSales, retailer?.id]);

  const allRetailerPayments = useMemo(() => {
    if (!retailer) return [];
    return retailerPayments.filter((p) => p.retailerId === retailer.id);
  }, [retailerPayments, retailer?.id]);

  // Compute Statement Data (Opening Balance, Running Balances, Totals, Closing Balance)
  const statement = useMemo(() => {
    return computeRetailerStatement({
      allSales: allRetailerSales,
      allPayments: allRetailerPayments,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [allRetailerSales, allRetailerPayments, startDate, endDate]);

  const getTodayStr = () => activeSessionDate || new Date().toISOString().split('T')[0];

  const handleQuickFilter = (type: 'today' | 'this_week' | 'this_month' | 'last_month' | 'all') => {
    setDateQuickFilter(type);
    const todayStr = getTodayStr();
    const todayObj = new Date(todayStr);

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'this_week') {
      const day = todayObj.getDay();
      const diff = todayObj.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(todayObj.setDate(diff));
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'this_month') {
      const firstDay = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'last_month') {
      const firstDayPrev = new Date(todayObj.getFullYear(), todayObj.getMonth() - 1, 1);
      const lastDayPrev = new Date(todayObj.getFullYear(), todayObj.getMonth(), 0);
      setStartDate(firstDayPrev.toISOString().split('T')[0]);
      setEndDate(lastDayPrev.toISOString().split('T')[0]);
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setDateQuickFilter('all');
  };

  const dateRangeLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) return `Date: ${startDate}`;
      return `${startDate} to ${endDate}`;
    }
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Up to ${endDate}`;
    return 'All Time Statement';
  }, [startDate, endDate]);

  const handleDownloadCsv = () => {
    if (!retailer || statement.isInvalidDateRange) return;

    const headers = ['Date', 'Type / Ref #', 'Details / Items', 'Taken (₹)', 'Paid (₹)', 'Running Balance (₹)'];
    const dataRows = statement.rowsWithSubtotals.map((row) => [
      row.date,
      row.parchiNumber,
      `"${row.itemsSummary.replace(/"/g, '""')}"`,
      row.takenAmount > 0 ? row.takenAmount : 0,
      row.paidAmount > 0 ? row.paidAmount : 0,
      row.runningBalance,
    ]);

    const summaryRows = [
      [],
      ['RETAIL KHATA STATEMENT SUMMARY'],
      ['Opening Balance', statement.openingBalance],
      ['Total Taken (Sales in Range)', statement.totalTaken],
      ['Total Paid (Payments in Range)', statement.totalPaid],
      ['Closing Balance', statement.closingBalance],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `Customer: ${retailer.name} (${retailer.shopOrMarket}) - Phone: ${retailer.phone}`,
        `Statement Period: ${dateRangeLabel}`,
        '',
        headers.join(','),
        ...dataRows.map((e) => e.join(',')),
        ...summaryRows.map((e) => e.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const cleanName = retailer.name.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `BharatMandi-Retail-Statement-${cleanName}-${startDate || 'all'}-to-${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !retailer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Modal Header */}
        <div className="bg-[#1a3a52] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-black text-lg">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">{retailer.name}</h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-200 font-bold px-2 py-0.5 rounded-md uppercase">
                  Retail Statement
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium flex items-center gap-2 mt-0.5">
                <span>{retailer.shopOrMarket}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-blue-300" />
                  +91 {retailer.phone}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions & Actions Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {onOpenReceivePayment && (
              <button
                onClick={() => onOpenReceivePayment(retailer.id)}
                className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Receive Payment</span>
              </button>
            )}
            {onOpenNewSale && (
              <button
                onClick={() => onOpenNewSale(retailer.id)}
                className="py-1.5 px-3 bg-[#1a3a52] hover:bg-[#122839] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Retail Parchi</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              disabled={statement.isInvalidDateRange}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>

            {onOpenPdfStatement && (
              <button
                onClick={() => onOpenPdfStatement(retailer, dateRangeLabel, startDate || undefined, endDate || undefined)}
                disabled={statement.isInvalidDateRange}
                className="px-3.5 py-1.5 rounded-xl bg-[#1a3a52] hover:bg-[#24485e] text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-blue-400/30 disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-blue-300" />
                <span>Statement PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[#1a3a52]" />
            <span className="font-bold text-slate-700">Range:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg font-bold text-[11px] flex-wrap">
              <button
                onClick={() => handleQuickFilter('today')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  dateQuickFilter === 'today' ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleQuickFilter('this_week')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  dateQuickFilter === 'this_week' ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => handleQuickFilter('this_month')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  dateQuickFilter === 'this_month' ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => handleQuickFilter('last_month')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  dateQuickFilter === 'last_month' ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last Month
              </button>
              <button
                onClick={() => handleQuickFilter('all')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  dateQuickFilter === 'all' && !startDate && !endDate ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold text-[11px]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-slate-500 font-bold text-[11px]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Invalid Date Range Warning */}
        {statement.isInvalidDateRange ? (
          <div className="p-6 bg-rose-50 border-b border-rose-200 text-rose-800 text-center flex items-center justify-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Invalid date range: "From Date" cannot be after "To Date".</span>
          </div>
        ) : (
          <>
            {/* Opening Balance Card */}
            <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  OPENING BALANCE
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  Due prior to {startDate || 'start date'} (sum of earlier sales − sum of earlier payments)
                </span>
              </div>
              <span className="font-mono font-black text-[#1a3a52] text-base sm:text-lg">
                ₹{statement.openingBalance.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Chronological Statement Table */}
            <div className="p-3 sm:p-4 max-h-[45vh] overflow-y-auto">
              {statement.rows.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Receipt className="w-10 h-10 mx-auto stroke-1" />
                  <p className="font-bold text-sm text-slate-600">No entries in this range</p>
                  <p className="text-xs max-w-xs mx-auto text-slate-400">
                    Opening Balance: ₹{statement.openingBalance.toLocaleString('en-IN')} • Closing Balance: ₹{statement.closingBalance.toLocaleString('en-IN')}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1a3a52] text-white font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-2.5">Date &amp; Time</th>
                        <th className="p-2.5">Type / Ref #</th>
                        <th className="p-2.5">Items / Details</th>
                        <th className="p-2.5 text-right">Taken (₹)</th>
                        <th className="p-2.5 text-right">Paid (₹)</th>
                        <th className="p-2.5 text-right">Balance After (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {statement.rowsWithSubtotals.map((row) => {
                        if (row.isDaySubtotal) {
                          return (
                            <tr key={row.id} className="bg-slate-100 font-bold text-slate-900">
                              <td colSpan={3} className="p-2 font-mono text-[11px] text-slate-700">
                                {row.parchiNumber} ({row.date})
                              </td>
                              <td className="p-2 text-right font-mono text-slate-900">
                                {row.takenAmount > 0 ? `₹${row.takenAmount.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="p-2 text-right font-mono text-emerald-800">
                                {row.paidAmount > 0 ? `₹${row.paidAmount.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="p-2 text-right font-mono text-[#1a3a52]">
                                ₹{row.runningBalance.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-slate-50 font-medium transition ${
                              row.type === 'payment' ? 'bg-emerald-50/40' : ''
                            }`}
                          >
                            <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{row.date}</div>
                              <div className="text-[10px] text-slate-400">{row.time}</div>
                            </td>

                            <td className="p-2.5 font-mono text-xs">
                              {row.type === 'sale' ? (
                                <span className="font-bold text-[#1a3a52]">{row.parchiNumber}</span>
                              ) : (
                                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px]">
                                  {row.parchiNumber}
                                </span>
                              )}
                            </td>

                            <td className="p-2.5">
                              <div className="text-slate-800 font-semibold">{row.itemsSummary}</div>
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {row.takenAmount > 0 ? `₹${row.takenAmount.toLocaleString('en-IN')}` : '-'}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                              {row.paidAmount > 0 ? `₹${row.paidAmount.toLocaleString('en-IN')}` : '-'}
                            </td>

                            <td className="p-2.5 text-right font-mono font-black text-[#1a3a52]">
                              ₹{row.runningBalance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Statement Totals & Closing Balance Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Total Taken (Sales in Range)
                  </span>
                  <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                    ₹{statement.totalTaken.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Total Paid (Payments in Range)
                  </span>
                  <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                    ₹{statement.totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Closing Balance Bar */}
              <div
                className={`p-3.5 sm:p-4 rounded-xl text-white flex items-center justify-between gap-3 shadow-xs border ${
                  statement.closingBalance === 0
                    ? 'bg-[#047857] border-emerald-800'
                    : 'bg-rose-700 border-rose-800'
                }`}
              >
                <div>
                  <span className="block text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                    CLOSING BALANCE:
                  </span>
                  <span className="text-[10px] text-white/90 font-medium block mt-0.5">
                    Opening (₹{statement.openingBalance.toLocaleString('en-IN')}) + Total Taken (₹{statement.totalTaken.toLocaleString('en-IN')}) − Total Paid (₹{statement.totalPaid.toLocaleString('en-IN')})
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl sm:text-2xl font-black font-mono text-white block">
                    {statement.closingBalance === 0 ? 'No Due ✓' : `₹${statement.closingBalance.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-medium">
            Retail Bank Statement Ledger • BharatMandi
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 transition cursor-pointer"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
};
