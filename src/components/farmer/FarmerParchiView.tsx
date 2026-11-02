import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Store,
  Layers,
  ChevronLeft,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { SaleLot } from '../../types';
import { formatDisplayDate, getTodayDateString, getPastDateString } from '../../data/initialData';
import { sounds } from '../../utils/audio';
import { getFarmerParchiApi, FarmerParchiResponse } from '../../services/mandiApi';

interface FarmerParchiViewProps {
  farmerId?: string;
  farmerPhone: string;
  farmerName: string;
  farmerLots: SaleLot[];
}

export const FarmerParchiView: React.FC<FarmerParchiViewProps> = ({
  farmerId,
  farmerPhone,
  farmerName,
  farmerLots,
}) => {
  const { setSelectedParchiLot, activeSessionDate, language, t } = useMandi();

  const todayStr = activeSessionDate || getTodayDateString();
  const currentMonthStr = todayStr.slice(0, 7);

  // View toggle: Daily vs Monthly vs All
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'all'>('daily');

  // Daily view controls
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    if (activeSessionDate) {
      setSelectedDate(activeSessionDate);
    }
  }, [activeSessionDate]);

  // Monthly view controls
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Filters
  const [merchantFilter, setMerchantFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Partial' | 'Unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // API State
  const [apiData, setApiData] = useState<FarmerParchiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Extract distinct merchants who have dealt with this farmer
  const connectedMerchants = useMemo(() => {
    const map = new Map<string, string>();
    farmerLots.forEach((lot) => {
      if (lot.merchantId || lot.merchantName) {
        const id = lot.merchantId || lot.merchantName || 'unknown';
        const name = lot.merchantName || lot.merchantId || 'Mandi Merchant';
        map.set(id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [farmerLots]);

  // Fetch / compute data via mandiApi service
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getFarmerParchiApi({
      view: viewMode === 'all' ? 'daily' : viewMode,
      date: viewMode === 'daily' ? selectedDate : undefined,
      month: viewMode === 'monthly' ? selectedMonth : undefined,
      farmerId,
      farmerPhone,
      farmerName,
      lots: farmerLots,
    })
      .then((res) => {
        if (isMounted) {
          setApiData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [viewMode, selectedDate, selectedMonth, farmerId, farmerPhone, farmerName, farmerLots]);

  // Filter parchi list according to user's local search, merchant, and payment status filters
  const filteredParchis = useMemo(() => {
    let rawList = farmerLots;
    if (viewMode === 'daily') {
      rawList = farmerLots.filter((lot) => lot.date === selectedDate);
    } else if (viewMode === 'monthly') {
      rawList = farmerLots.filter((lot) => lot.date && lot.date.startsWith(selectedMonth));
    }

    return rawList.filter((lot) => {
      // 1. Merchant filter
      if (merchantFilter !== 'all') {
        const matchesMerchant =
          lot.merchantId === merchantFilter ||
          (lot.merchantName && lot.merchantName.toLowerCase() === merchantFilter.toLowerCase());
        if (!matchesMerchant) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'Paid' && !(lot.paymentStatus === 'Paid' || lot.balanceDue <= 0)) return false;
        if (statusFilter === 'Partial' && !(lot.paymentStatus === 'Partial' || (lot.amountPaid > 0 && lot.balanceDue > 0))) return false;
        if (statusFilter === 'Unpaid' && !(lot.paymentStatus === 'Unpaid' && lot.amountPaid === 0)) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          lot.parchiNumber.toLowerCase().includes(q) ||
          lot.flowerVariety.toLowerCase().includes(q) ||
          (lot.merchantName && lot.merchantName.toLowerCase().includes(q)) ||
          lot.paymentStatus.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [apiData, farmerLots, viewMode, selectedDate, selectedMonth, merchantFilter, statusFilter, searchQuery]);

  // Aggregated totals for the current filtered list
  const totals = useMemo(() => {
    return filteredParchis.reduce(
      (acc, lot) => {
        acc.volume += lot.quantity || 0;
        acc.gross += lot.grossTotal || 0;
        acc.commission += lot.commissionAmount || 0;
        acc.expenditures += lot.totalOtherExpenditures || 0;
        acc.netPayable += lot.farmerNetPayable || 0;
        acc.amountPaid += lot.amountPaid || 0;
        acc.balanceDue += lot.balanceDue || 0;
        return acc;
      },
      {
        volume: 0,
        gross: 0,
        commission: 0,
        expenditures: 0,
        netPayable: 0,
        amountPaid: 0,
        balanceDue: 0,
      }
    );
  }, [filteredParchis]);

  // Month navigation helper
  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    const nextY = d.getFullYear();
    const nextM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  // Month formatted label
  const formattedMonthLabel = useMemo(() => {
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredParchis.length === 0) {
      alert('No parchi records to export.');
      return;
    }

    const headers = [
      'Parchi Number',
      'Date',
      'Time',
      'Merchant Shop Name',
      'Flower Variety',
      'Quality of Flower',
      'No. of Boxes',
      'Quantity',
      'Unit',
      'Rate per Unit (INR)',
      'Gross Total (INR)',
      'Ammali Charges (INR)',
      'Transport Charges (INR)',
      'Other Deductions (INR)',
      "Farmer's Net Money (INR)",
      'Amount Received (INR)',
      'Balance Due (INR)',
      'Payment Status',
    ];

    const rows = filteredParchis.map((l) => [
      `"${l.parchiNumber}"`,
      `"${l.date}"`,
      `"${l.time}"`,
      `"${l.merchantName || 'Mandi Merchant'}"`,
      `"${l.flowerVariety}"`,
      `"${l.flowerQuality || 'Good'}"`,
      l.boxesCount || 0,
      l.quantity,
      `"${l.unit}"`,
      l.rate,
      l.grossTotal,
      l.ammaliCharges || l.otherExpenditures?.hamali || 0,
      l.transportCharges || l.otherExpenditures?.transport || 0,
      l.otherExpenditures?.misc || 0,
      l.farmerNetPayable,
      l.amountPaid,
      l.balanceDue,
      `"${l.paymentStatus}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Farmer_Parchi_Report_${viewMode}_${farmerName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card with View Switcher (Daily vs Monthly) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#1e293b] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#1a3a52]" />
              <span>{language === 'te' ? 'రైతు మండి రసీదులు' : 'Farmer Mandi Parchi Slips'}</span>
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Transparent digital receipts of flower sales, weighing rates, and payment settlements.
            </p>
          </div>

          {/* View Mode Toggle Button: Daily vs Monthly vs All */}
          <div className="flex items-center bg-[#f1f5f9] p-1 rounded-xl border border-[#e2e8f0] flex-wrap sm:flex-nowrap gap-1">
            <button
              type="button"
              id="farmer-parchi-view-daily-btn"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-[#1a3a52] text-white shadow-xs'
                  : 'text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'రోజువారీ' : 'Daily View'}</span>
            </button>

            <button
              type="button"
              id="farmer-parchi-view-monthly-btn"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-[#1a3a52] text-white shadow-xs'
                  : 'text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'నెలవారీ' : 'Monthly'}</span>
            </button>

            <button
              type="button"
              id="farmer-parchi-view-all-btn"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-[#1a3a52] text-white shadow-xs'
                  : 'text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>All ({farmerLots.length})</span>
            </button>
          </div>
        </div>

        {/* Date / Month Selector Controls matching merchant portal UX */}
        <div className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
          {viewMode === 'daily' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor="farmer-parchi-date-input" className="text-xs font-bold text-[#1e293b] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#1a3a52]" />
                <span>Selected Date:</span>
              </label>
              <input
                id="farmer-parchi-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-xs font-bold text-[#1e293b] focus:outline-hidden focus:border-[#1a3a52]"
              />

              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-[#1a3a52] text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getPastDateString(1))}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedDate === getPastDateString(1)
                    ? 'bg-[#1a3a52] text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                Yesterday
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1e293b] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#1a3a52]" />
                <span>Month:</span>
              </span>

              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="p-1 text-[#64748b] hover:text-[#1e293b] transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-xs text-[#1e293b] px-2 min-w-[110px] text-center">
                  {formattedMonthLabel}
                </span>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="p-1 text-[#64748b] hover:text-[#1e293b] transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#e2e8f0] text-xs font-bold text-[#1e293b] focus:outline-hidden focus:border-[#1a3a52]"
              />
            </div>
          )}

          {/* Quick CSV Export */}
          <button
            type="button"
            id="farmer-parchi-export-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-[#e2e8f0] text-xs font-bold text-[#1a3a52] hover:bg-[#eef3f7] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter Bar: Merchant Dropdown, Payment Status, and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Merchant Dropdown */}
          <div>
            <label className="text-[11px] font-bold text-[#64748b] block mb-1">
              Filter by Merchant:
            </label>
            <select
              id="farmer-parchi-merchant-filter"
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-medium text-[#1e293b] focus:outline-hidden focus:border-[#1a3a52]"
            >
              <option value="all">All Connected Merchants</option>
              {connectedMerchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="text-[11px] font-bold text-[#64748b] block mb-1">
              Payment Status:
            </label>
            <select
              id="farmer-parchi-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-medium text-[#1e293b] focus:outline-hidden focus:border-[#1a3a52]"
            >
              <option value="all">All Settlements</option>
              <option value="Paid">Settled (Fully Paid)</option>
              <option value="Partial">Partially Paid</option>
              <option value="Unpaid">Unpaid / Outstanding</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="text-[11px] font-bold text-[#64748b] block mb-1">
              Search Slips:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748b]" />
              <input
                id="farmer-parchi-search-input"
                type="text"
                placeholder="Search variety, parchi #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#1e293b] focus:outline-hidden focus:border-[#1a3a52]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary matching merchant portal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider block">
            Parchi Slips
          </span>
          <div className="text-xl font-black text-[#1e293b] mt-1">
            {filteredParchis.length}
          </div>
          <span className="text-[11px] text-[#64748b] font-medium block mt-0.5">
            {viewMode === 'daily' ? 'On selected day' : 'In selected month'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider block">
            Total Volume
          </span>
          <div className="text-xl font-black text-[#1a3a52] mt-1">
            {totals.volume.toLocaleString('en-IN')} <span className="text-xs font-semibold text-[#64748b]">units</span>
          </div>
          <span className="text-[11px] text-[#64748b] font-medium block mt-0.5">
            Consigned flowers
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider block">
            Net Farmer Amount
          </span>
          <div className="text-xl font-black text-[#1e293b] mt-1">
            ₹{totals.netPayable.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#64748b] block mt-0.5">
            Gross: ₹{totals.gross.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
            Amount Received
          </span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            ₹{totals.amountPaid.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-800/80 font-medium block mt-0.5">
            Settled by merchants
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold tracking-wider block text-red-800">
            Pending Balance
          </span>
          <div
            className={`text-xl font-black mt-1 ${
              totals.balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            ₹{totals.balanceDue.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#64748b] font-medium block mt-0.5">
            {totals.balanceDue > 0 ? 'To be collected' : 'All cleared ✓'}
          </span>
        </div>
      </div>

      {/* Parchi Table & Slips List */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#f1f5f9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#1a3a52]" />
            <h4 className="font-bold text-base text-[#1e293b]">
              {viewMode === 'daily'
                ? `Daily Parchi Slips (${filteredParchis.length}) — ${formatDisplayDate(selectedDate)}`
                : `Monthly Parchi Archive (${filteredParchis.length}) — ${formattedMonthLabel}`}
            </h4>
          </div>

          <span className="text-xs font-mono font-bold text-[#1a3a52] bg-[#eef3f7] px-2.5 py-1 rounded-full">
            {filteredParchis.length} Records
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#64748b]">
            <div className="w-6 h-6 border-2 border-[#1a3a52] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading Mandi Parchi records...</span>
          </div>
        ) : filteredParchis.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748b] space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#eef3f7] text-[#1a3a52] flex items-center justify-center mx-auto text-xl">
              📄
            </div>
            <h5 className="font-bold text-sm text-[#1e293b]">No Parchi Slips Found</h5>
            <p className="max-w-md mx-auto">
              No flower sales or receipts matched your selected {viewMode === 'daily' ? 'date' : 'month'} and filters.
              {viewMode === 'daily' && selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="mt-2 block mx-auto text-[#1a3a52] font-bold underline cursor-pointer"
                >
                  Switch to Today&apos;s Trading
                </button>
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-[#64748b] border-b border-[#e2e8f0] font-bold">
                  <th className="py-3 px-4">Parchi # / Time</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Flower Variety</th>
                  <th className="py-3 px-4 text-center">No. of Boxes</th>
                  <th className="py-3 px-4 text-right">Qty &amp; Rate</th>
                  <th className="py-3 px-4 text-right">Farmer Net (₹)</th>
                  <th className="py-3 px-4 text-right">Paid (₹)</th>
                  <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Receipt Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {filteredParchis.map((lot) => {
                  const isSettled = lot.paymentStatus === 'Paid' || lot.balanceDue <= 0;
                  const isPartial = lot.paymentStatus === 'Partial' || (lot.amountPaid > 0 && lot.balanceDue > 0);

                  return (
                    <tr
                      key={lot.id}
                      className="hover:bg-[#f8fafc] transition"
                    >
                      {/* Parchi Number & Date/Time */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#1a3a52] bg-white px-2 py-0.5 rounded border border-[#e2e8f0] block w-fit">
                          {lot.parchiNumber}
                        </span>
                        <span className="text-[11px] text-[#64748b] mt-1 block">
                          {lot.date} • {lot.time}
                        </span>
                      </td>

                      {/* Merchant */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#1a3a52] shrink-0" />
                          <span className="font-bold text-[#1e293b]">
                            {lot.merchantName || 'Mandi Merchant'}
                          </span>
                        </div>
                        {lot.merchantId && (
                          <span className="text-[10px] text-[#64748b] font-mono block">
                            ID: {lot.merchantId}
                          </span>
                        )}
                      </td>

                      {/* Flower Variety & Quality */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1e293b] block">
                          🌸 {lot.flowerVariety}
                        </span>
                        {lot.flowerQuality && (
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${
                              lot.flowerQuality === 'Good'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : lot.flowerQuality === 'Average'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            {lot.flowerQuality} Quality
                          </span>
                        )}
                      </td>

                      {/* No. of Boxes */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#1e293b]">
                        {lot.boxesCount ? `${lot.boxesCount} ${lot.packagingType || 'Boxes'}` : '0 Boxes'}
                      </td>

                      {/* Quantity & Rate */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-[#1e293b] block">
                          {lot.quantity} {lot.unit}
                        </span>
                        <span className="text-[11px] text-[#64748b] block mt-0.5">
                          @ ₹{lot.rate}/{lot.unit}
                        </span>
                      </td>

                      {/* Farmer Net Amount */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-black text-sm text-[#1e293b] block">
                          ₹{lot.farmerNetPayable.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#64748b] block">
                          Gross: ₹{lot.grossTotal}
                        </span>
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-emerald-700 block">
                          ₹{lot.amountPaid.toLocaleString('en-IN')}
                        </span>
                        {lot.paymentMode && (
                           <span className="text-[10px] text-[#64748b] block">
                            via {lot.paymentMode}
                          </span>
                        )}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-mono font-bold block ${
                            lot.balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{lot.balanceDue.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Settlement Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                            isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isSettled ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Settled
                            </>
                          ) : isPartial ? (
                            <>
                              <Clock className="w-3 h-3" /> Partial
                            </>
                          ) : (
                            'Unpaid'
                          )}
                        </span>
                      </td>

                      {/* Actions: View Parchi modal */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            id={`farmer-view-parchi-btn-${lot.id}`}
                            onClick={() => {
                              sounds.playParchiPrint();
                              setSelectedParchiLot(lot);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#1a3a52] text-white hover:bg-[#122839] text-[11px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#d4af37]" />
                            <span>View Parchi</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
