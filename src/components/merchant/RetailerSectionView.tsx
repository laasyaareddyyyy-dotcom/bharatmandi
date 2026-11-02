import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { Retailer, RetailerSale, RetailerPayment } from '../../types';
import { NewRetailerSaleModal } from './NewRetailerSaleModal';
import { ReceiveRetailerPaymentModal } from './ReceiveRetailerPaymentModal';
import { RetailerLedgerModal } from './RetailerLedgerModal';
import { RetailerPdfModal } from './RetailerPdfModal';
import {
  Store,
  Building2,
  Users,
  Coins,
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Phone,
  MapPin,
  ChevronRight,
  TrendingUp,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const RetailerSectionView: React.FC = () => {
  const {
    merchantSection,
    setMerchantSection,
    setMerchantTab,
    retailers,
    retailerSales,
    retailerPayments,
    addRetailer,
    deleteRetailer,
    deleteRetailerSale,
    deleteRetailerPayment,
    activeSessionDate,
  } = useMandi();

  const [activeSubTab, setActiveSubTab] = useState<'khatas' | 'sales_history' | 'payments_log'>('khatas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState<boolean>(false);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState<boolean>(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState<boolean>(false);
  const [isPdfOpen, setIsPdfOpen] = useState<boolean>(false);

  const [selectedRetailerForModal, setSelectedRetailerForModal] = useState<Retailer | null>(null);
  const [selectedRetailerIdForPayment, setSelectedRetailerIdForPayment] = useState<string>('');
  const [selectedRetailerIdForSale, setSelectedRetailerIdForSale] = useState<string>('');
  const [pdfDateRangeLabel, setPdfDateRangeLabel] = useState<string>('All Time Statement');
  const [pdfStartDate, setPdfStartDate] = useState<string | undefined>();
  const [pdfEndDate, setPdfEndDate] = useState<string | undefined>();

  // Add Retailer Modal Inline State
  const [isAddRetailerOpen, setIsAddRetailerOpen] = useState<boolean>(false);
  const [newRetailerName, setNewRetailerName] = useState<string>('');
  const [newRetailerPhone, setNewRetailerPhone] = useState<string>('');
  const [newRetailerShop, setNewRetailerShop] = useState<string>('');

  // Date Filters for Sales History & Reports
  const [reportDateFilter, setReportDateFilter] = useState<'today' | 'this_month' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Multi-parchi selection in Retail Sales History
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());

  // Calculate Overall Summary Stats
  const totalRetailersCount = retailers.length;

  const totalGrossRetailSales = useMemo(() => {
    return retailerSales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
  }, [retailerSales]);

  const totalPaidAtSales = useMemo(() => {
    return retailerSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  }, [retailerSales]);

  const totalDirectPayments = useMemo(() => {
    return retailerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [retailerPayments]);

  const totalCollectedMoney = totalPaidAtSales + totalDirectPayments;
  const totalOutstandingBalance = Math.max(0, totalGrossRetailSales - totalCollectedMoney);

  // Per Retailer Summary Accounts Data
  const retailerAccountsData = useMemo(() => {
    return retailers.map((r) => {
      const sales = retailerSales.filter((s) => s.retailerId === r.id);
      const payments = retailerPayments.filter((p) => p.retailerId === r.id);

      const grossBilled = sales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
      const paidAtSales = sales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
      const directPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPaid = paidAtSales + directPaid;
      const balanceDue = Math.max(0, grossBilled - totalPaid);
      const totalItemsCount = sales.reduce((sum, s) => sum + s.items.length, 0);

      return {
        retailer: r,
        grossBilled,
        totalPaid,
        balanceDue,
        salesCount: sales.length,
        totalItemsCount,
        lastTransactionDate: sales[0]?.date || r.createdAt,
      };
    });
  }, [retailers, retailerSales, retailerPayments]);

  // Filtered Retailers by Search Query
  const filteredRetailerAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return retailerAccountsData;
    return retailerAccountsData.filter(
      (acc) =>
        acc.retailer.name.toLowerCase().includes(q) ||
        acc.retailer.shopOrMarket.toLowerCase().includes(q) ||
        acc.retailer.phone.includes(q)
    );
  }, [retailerAccountsData, searchQuery]);

  // Filtered Sales History for Reports Tab
  const filteredSalesHistory = useMemo(() => {
    return retailerSales.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.retailerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.parchiNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.items.some((i) => i.varietyName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (reportDateFilter === 'today') {
        const todayStr = activeSessionDate || new Date().toISOString().split('T')[0];
        return s.date === todayStr;
      }
      if (reportDateFilter === 'this_month') {
        const currentMonth = (activeSessionDate || new Date().toISOString().split('T')[0]).slice(0, 7);
        return s.date.startsWith(currentMonth);
      }
      if (reportDateFilter === 'custom' || (customStartDate && customEndDate)) {
        if (customStartDate && customEndDate) {
          return s.date >= customStartDate && s.date <= customEndDate;
        } else if (customStartDate) {
          return s.date >= customStartDate;
        } else if (customEndDate) {
          return s.date <= customEndDate;
        }
      }
      return true;
    });
  }, [retailerSales, searchQuery, reportDateFilter, activeSessionDate, customStartDate, customEndDate]);

  // Toggle selection for sales history
  const toggleSelectSale = (id: string) => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllSales = () => {
    if (selectedSaleIds.size === filteredSalesHistory.length) {
      setSelectedSaleIds(new Set());
    } else {
      setSelectedSaleIds(new Set(filteredSalesHistory.map((s) => s.id)));
    }
  };

  const handleCreateRetailer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRetailerName.trim()) {
      alert('Please enter retailer name');
      return;
    }
    if (!newRetailerPhone.trim() || newRetailerPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    addRetailer({
      name: newRetailerName.trim(),
      phone: newRetailerPhone.replace(/\D/g, '').slice(-10),
      shopOrMarket: newRetailerShop.trim() || 'Retail Market Yard',
    });

    setNewRetailerName('');
    setNewRetailerPhone('');
    setNewRetailerShop('');
    setIsAddRetailerOpen(false);
  };

  const handleOpenLedgerFor = (retailer: Retailer) => {
    setSelectedRetailerForModal(retailer);
    setIsLedgerOpen(true);
  };

  const handleOpenReceivePaymentFor = (retailerId: string) => {
    setSelectedRetailerIdForPayment(retailerId);
    setIsReceivePaymentOpen(true);
  };

  const handleOpenNewSaleFor = (retailerId?: string) => {
    if (retailerId) {
      setSelectedRetailerIdForSale(retailerId);
    }
    setIsNewSaleOpen(true);
  };

  const handleOpenPdfFor = (retailer: Retailer, dateLabel = 'All Time Statement', sDate?: string, eDate?: string) => {
    setSelectedRetailerForModal(retailer);
    setPdfDateRangeLabel(dateLabel);
    setPdfStartDate(sDate);
    setPdfEndDate(eDate);
    setIsPdfOpen(true);
  };

  const exportSalesCsv = () => {
    if (filteredSalesHistory.length === 0) {
      alert('No sales records to export');
      return;
    }

    const headers = ['Date', 'Parchi #', 'Retailer Name', 'Shop / Market', 'Phone', 'Items / Varieties', 'Gross Amount', 'Paid Now', 'Balance Due', 'Status'];
    const rows = filteredSalesHistory.map((s) => [
      s.date,
      s.parchiNumber,
      `"${s.retailerName}"`,
      `"${s.retailerShop}"`,
      s.retailerPhone,
      `"${s.items.map((i) => `${i.varietyName} (${i.quantity}${i.unit})`).join('; ')}"`,
      s.grossTotal,
      s.amountPaid,
      s.balanceDue,
      s.paymentStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BharatMandi-Retail-Sales-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-20 sm:pb-24">
      {/* Top Simple Row */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <Store className="w-6 h-6 text-[#1a3a52]" />
          <span>Customers</span>
        </h1>

        <button
          type="button"
          onClick={() => setIsAddRetailerOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#24485e] text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* 4 Summary Cards - Short labels, no subtext */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
          <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 block">Customers</span>
          <p className="text-xl sm:text-2xl font-black text-[#1a3a52] font-mono">{totalRetailersCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
          <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 block">Sold</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            ₹{totalGrossRetailSales.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
          <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 block">Collected</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            ₹{totalCollectedMoney.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
          <span className="font-extrabold uppercase tracking-wider text-[10px] text-rose-800 block">Due</span>
          <p className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
            ₹{totalOutstandingBalance.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Single Search Bar & Single List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-[#1a3a52] text-xs font-semibold text-[#1e293b] outline-none"
          />
        </div>
      </div>

      {/* Customer Cards List */}
      <div className="space-y-3">
        {filteredRetailerAccounts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <p className="text-xs font-bold text-slate-500">
              {searchQuery.trim() ? `No match found for "${searchQuery}"` : 'No customers yet'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (searchQuery.trim()) {
                  setNewRetailerName(searchQuery.trim());
                }
                setIsAddRetailerOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#1a3a52] hover:bg-[#24485e] text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-blue-300" />
              <span>No match. + Add new</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRetailerAccounts.map(({ retailer, grossBilled, totalPaid, balanceDue }) => (
              <div
                key={retailer.id}
                onClick={() => handleOpenLedgerFor(retailer)}
                className="bg-white border border-slate-200 hover:border-[#1a3a52] rounded-2xl p-4 shadow-2xs transition space-y-3 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h3 className="font-black text-sm text-[#1a3a52] group-hover:text-blue-900 transition">
                        {retailer.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{retailer.shopOrMarket}</span>
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-black text-[11px] whitespace-nowrap ${
                        balanceDue > 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {balanceDue > 0 ? `Due ₹${balanceDue.toLocaleString('en-IN')}` : 'Cleared'}
                    </span>
                  </div>

                  {/* Taken, Paid, Balance */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Taken</span>
                      <span className="font-mono font-bold text-slate-800">₹{grossBilled.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Paid</span>
                      <span className="font-mono font-bold text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance</span>
                      <span className={`font-mono font-black ${balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        ₹{balanceDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div
                  className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenNewSaleFor(retailer.id)}
                    className="flex-1 py-1.5 bg-[#1a3a52] hover:bg-[#24485e] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-300" />
                    <span>+ Sale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReceivePaymentFor(retailer.id)}
                    className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Receive Payment</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inline Add Retailer Modal */}
      {isAddRetailerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1a3a52] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-300" />
                <h3 className="font-black text-base">Add New Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRetailerOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRetailer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Customer / Shop Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sri Lakshmi Flower Decorators"
                  value={newRetailerName}
                  onChange={(e) => setNewRetailerName(e.target.value.replace(/[0-9]/g, ''))}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-bold text-xs text-[#1e293b] outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-bold text-slate-500 text-xs">🇮🇳 +91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9848012345"
                    value={newRetailerPhone}
                    onChange={(e) => setNewRetailerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-16 pr-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-xs text-[#1e293b] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Shop Name / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Market Shop #14"
                  value={newRetailerShop}
                  onChange={(e) => setNewRetailerShop(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#1a3a52] text-xs font-medium text-[#1e293b] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddRetailerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-xs cursor-pointer shadow-md"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals Integration */}
      <NewRetailerSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        preselectedRetailerId={selectedRetailerIdForSale}
      />

      <ReceiveRetailerPaymentModal
        isOpen={isReceivePaymentOpen}
        onClose={() => setIsReceivePaymentOpen(false)}
        preselectedRetailerId={selectedRetailerIdForPayment}
      />

      <RetailerLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        retailer={selectedRetailerForModal}
        onOpenReceivePayment={(id) => handleOpenReceivePaymentFor(id)}
        onOpenNewSale={(id) => handleOpenNewSaleFor(id)}
        onOpenPdfStatement={(r, label, sDate, eDate) => handleOpenPdfFor(r, label, sDate, eDate)}
      />

      <RetailerPdfModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        retailer={selectedRetailerForModal}
        dateRangeLabel={pdfDateRangeLabel}
        startDate={pdfStartDate}
        endDate={pdfEndDate}
      />
    </div>
  );
};
