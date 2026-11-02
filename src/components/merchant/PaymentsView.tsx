import React, { useState, useMemo } from 'react';
import {
  Coins,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  Filter,
  CreditCard,
  Building,
  Banknote,
  X,
  History,
  Smartphone,
  QrCode,
  Receipt,
  Printer,
  Calendar,
  Wallet,
  Trash2,
  FileText,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { Farmer, PaymentMode, SaleLot } from '../../types';
import { getTodayDateString, formatDisplayDate } from '../../data/initialData';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { sounds } from '../../utils/audio';

export const PaymentsView: React.FC = () => {
  const {
    farmers,
    getFarmerStats,
    recordPayment,
    deletePayment,
    deleteSaleLot,
    payments,
    lots,
    setSelectedParchiLot,
    openPdfModalForLot,
    activeCommodityFilter,
    totalOutstandingDues,
    totalPaidToDate,
    language,
    t,
  } = useMandi();

  const [activeMainTab, setActiveMainTab] = useState<'farmers' | 'consignments'>('farmers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('pending');
  const [consignmentFilter, setConsignmentFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedFarmerForPayment, setSelectedFarmerForPayment] = useState<Farmer | null>(null);
  const [selectedLotIdForPayment, setSelectedLotIdForPayment] = useState<string | null>(null);

  // Payment Modal Form State
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMode, setPayMode] = useState<PaymentMode>('Cash');
  const [payDate, setPayDate] = useState<string>(getTodayDateString());
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<string | null>(null);

  // Duplicate Payment Confirmation State
  const [duplicatePaymentWarning, setDuplicatePaymentWarning] = useState<{
    isOpen: boolean;
    paymentData: {
      date: string;
      farmerId: string;
      farmerName: string;
      amount: number;
      paymentMode: PaymentMode;
      referenceNumber?: string;
      notes?: string;
      lotId?: string;
    };
    duplicateInfo: string;
  } | null>(null);

  // Delete Confirmation State
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    type: 'lot' | 'payment';
    lot?: SaleLot;
    payment?: any;
  }>({
    isOpen: false,
    type: 'lot',
  });

  const handleDeleteLotClick = (lot: SaleLot) => {
    setDeleteModalConfig({
      isOpen: true,
      type: 'lot',
      lot,
    });
  };

  const handleDeletePaymentClick = (payment: any) => {
    setDeleteModalConfig({
      isOpen: true,
      type: 'payment',
      payment,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModalConfig.type === 'lot' && deleteModalConfig.lot) {
      const pNum = deleteModalConfig.lot.parchiNumber;
      deleteSaleLot(deleteModalConfig.lot.id);
      sounds.playTrashSound?.();
      setActionFeedbackMsg(`✓ Consignment record ${pNum} deleted successfully.`);
      setTimeout(() => setActionFeedbackMsg(null), 3500);
    } else if (deleteModalConfig.type === 'payment' && deleteModalConfig.payment) {
      const amt = deleteModalConfig.payment.amount;
      deletePayment(deleteModalConfig.payment.id);
      sounds.playTrashSound?.();
      setActionFeedbackMsg(`✓ Payment transaction of ₹${amt?.toLocaleString('en-IN')} deleted successfully.`);
      setTimeout(() => setActionFeedbackMsg(null), 3500);
    }
    setDeleteModalConfig({ isOpen: false, type: 'lot' });
  };

  // Dynamically compute summary metrics scoped to active commodity and date range [fromDate, toDate]
  const scopedLots = useMemo(() => {
    return lots.filter((l) => {
      if (activeCommodityFilter !== 'all') {
        const lotCat = l.commodityCategory || 'flowers';
        if (lotCat !== activeCommodityFilter) return false;
      }
      if (fromDate && l.date < fromDate) return false;
      if (toDate && l.date > toDate) return false;
      return true;
    });
  }, [lots, activeCommodityFilter, fromDate, toDate]);

  const scopedPayments = useMemo(() => {
    return payments.filter((p) => {
      if (fromDate && p.date < fromDate) return false;
      if (toDate && p.date > toDate) return false;
      return true;
    });
  }, [payments, fromDate, toDate]);

  const displayUnpaidBalance = useMemo(() => {
    return scopedLots.reduce((acc, l) => acc + (l.balanceDue || 0), 0);
  }, [scopedLots]);

  const displayPaidToDate = useMemo(() => {
    return scopedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [scopedPayments]);

  const farmersWithDuesCount = useMemo(() => {
    const farmerDuesMap = new Map<string, number>();
    scopedLots.forEach((l) => {
      const fId = l.farmerId || l.farmerName;
      const due = l.balanceDue || 0;
      farmerDuesMap.set(fId, (farmerDuesMap.get(fId) || 0) + due);
    });
    let count = 0;
    farmerDuesMap.forEach((due) => {
      if (due > 0) count++;
    });
    return count;
  }, [scopedLots]);

  // Filtered farmers list
  const filteredFarmers = farmers.filter((f) => {
    const stats = getFarmerStats(f.id, fromDate, toDate);
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return stats.pendingDues > 0;
    if (statusFilter === 'settled') return stats.pendingDues === 0 && stats.totalPaid > 0;
    return true;
  });

  // Filtered Consignments list (Every lot: Paid, Partial, and Unpaid)
  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      if (activeCommodityFilter !== 'all') {
        const lotCat = lot.commodityCategory || 'flowers';
        if (lotCat !== activeCommodityFilter) return false;
      }

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        lot.farmerName.toLowerCase().includes(q) ||
        lot.farmerVillage.toLowerCase().includes(q) ||
        lot.flowerVariety.toLowerCase().includes(q) ||
        lot.parchiNumber.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (fromDate && lot.date < fromDate) return false;
      if (toDate && lot.date > toDate) return false;

      if (consignmentFilter === 'unpaid') return lot.paymentStatus === 'Unpaid' || lot.amountPaid === 0;
      if (consignmentFilter === 'partial') return lot.paymentStatus === 'Partial' || (lot.amountPaid > 0 && lot.balanceDue > 0);
      if (consignmentFilter === 'paid') return lot.paymentStatus === 'Paid' && lot.balanceDue === 0;
      return true;
    });
  }, [lots, searchQuery, consignmentFilter, fromDate, toDate, activeCommodityFilter]);

  const unpaidLotsCount = useMemo(() => {
    return lots.filter((l) => {
      if (activeCommodityFilter !== 'all') {
        const lotCat = l.commodityCategory || 'flowers';
        if (lotCat !== activeCommodityFilter) return false;
      }
      return l.paymentStatus === 'Unpaid' || l.amountPaid === 0;
    }).length;
  }, [lots, activeCommodityFilter]);

  const partialLotsCount = useMemo(() => {
    return lots.filter((l) => {
      if (activeCommodityFilter !== 'all') {
        const lotCat = l.commodityCategory || 'flowers';
        if (lotCat !== activeCommodityFilter) return false;
      }
      return l.paymentStatus === 'Partial' || (l.amountPaid > 0 && l.balanceDue > 0);
    }).length;
  }, [lots, activeCommodityFilter]);

  const paidLotsCount = useMemo(() => {
    return lots.filter((l) => {
      if (activeCommodityFilter !== 'all') {
        const lotCat = l.commodityCategory || 'flowers';
        if (lotCat !== activeCommodityFilter) return false;
      }
      return l.paymentStatus === 'Paid' && l.balanceDue === 0;
    }).length;
  }, [lots, activeCommodityFilter]);

  const openPaymentModal = (farmer: Farmer, targetLotId?: string, targetAmount?: number) => {
    const stats = getFarmerStats(farmer.id);
    setSelectedFarmerForPayment(farmer);
    setSelectedLotIdForPayment(targetLotId || null);
    setPayAmount(typeof targetAmount === 'number' ? targetAmount : stats.pendingDues);
    setPayMode('PhonePe');
    setPayDate(getTodayDateString());
    setPayRef('');
    setPayNotes(targetLotId ? `Payment for consignment lot #${targetLotId}` : `Dues settlement for ${farmer.name}`);
  };

  const savePaymentRecord = (data: {
    date: string;
    farmerId: string;
    farmerName: string;
    amount: number;
    paymentMode: PaymentMode;
    referenceNumber?: string;
    notes?: string;
    lotId?: string;
  }) => {
    recordPayment(data);
    alert(t('paymentSuccess'));
    setSelectedFarmerForPayment(null);
    setSelectedLotIdForPayment(null);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmerForPayment) return;

    const numericAmount = typeof payAmount === 'number' ? payAmount : 0;
    if (numericAmount <= 0) {
      alert('Please enter a valid payment amount (> 0).');
      return;
    }

    // Check for duplicate payment (same farmer, amount, date and mode)
    const isDuplicate = payments.some(
      (p) =>
        (p.farmerId === selectedFarmerForPayment.id ||
          p.farmerName.trim().toLowerCase() === selectedFarmerForPayment.name.trim().toLowerCase()) &&
        p.date === payDate &&
        Number(p.amount) === numericAmount &&
        p.paymentMode === payMode
    );

    if (isDuplicate) {
      setDuplicatePaymentWarning({
        isOpen: true,
        paymentData: {
          date: payDate,
          farmerId: selectedFarmerForPayment.id,
          farmerName: selectedFarmerForPayment.name,
          amount: numericAmount,
          paymentMode: payMode,
          referenceNumber: payRef.trim() || '',
          notes: payNotes.trim() || '',
          lotId: selectedLotIdForPayment || '',
        },
        duplicateInfo: `A payment of ₹${numericAmount.toLocaleString('en-IN')} for ${selectedFarmerForPayment.name} on ${payDate} via ${payMode} is already recorded in the database.`,
      });
      return;
    }

    savePaymentRecord({
      date: payDate,
      farmerId: selectedFarmerForPayment.id,
      farmerName: selectedFarmerForPayment.name,
      amount: numericAmount,
      paymentMode: payMode,
      referenceNumber: payRef.trim() || '',
      notes: payNotes.trim() || '',
      lotId: selectedLotIdForPayment || '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#1a3a52] flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#1a3a52]" />
              <span>{t('paymentsTitle')}</span>
            </h2>
            <p className="text-xs text-[#64748b]">{t('paymentsSubtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="view-payments-history-btn"
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] text-xs font-bold hover:bg-[#f1f5f9] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <History className="w-4 h-4 text-[#1a3a52]" />
              <span>{t('paymentHistory')} ({payments.length})</span>
            </button>
          </div>
        </div>

        {/* 3 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-800 block">
              {t('totalPendingDues')}
            </span>
            <span className="text-2xl font-black font-mono text-red-700 mt-1 block">
              ₹{displayUnpaidBalance.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-red-600 font-medium">Unpaid balance to growers</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1a3a52] block">
              {t('totalSettledPaid')}
            </span>
            <span className="text-2xl font-black font-mono text-[#1a3a52] mt-1 block">
              ₹{displayPaidToDate.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-[#1a3a52]/80 font-medium">Instant payouts settled</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FEF8ED] border border-[#d4af37]/30">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309] block">
              {t('farmersWithDues')}
            </span>
            <span className="text-2xl font-black font-mono text-[#1e293b] mt-1 block">
              {farmersWithDuesCount} <span className="text-sm font-semibold text-[#64748b]">farmers</span>
            </span>
            <span className="text-[11px] text-[#B45309] font-medium">Awaiting morning disbursement</span>
          </div>
        </div>

        {/* Primary View Toggle: Farmer Payments vs Settlement Ledger */}
        <div className="flex border-b border-[#e2e8f0] pt-1">
          <button
            type="button"
            id="tab-btn-farmer-khatas"
            onClick={() => setActiveMainTab('farmers')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'farmers'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-[#eef3f7]/50 rounded-t-xl'
                : 'border-transparent text-[#64748b] hover:text-[#1a3a52]'
            }`}
          >
            <Wallet className="w-4 h-4 text-[#1a3a52]" />
            <span>Farmer Payments</span>
            {farmersWithDuesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#1a3a52] text-white text-[10px] font-mono">
                {farmersWithDuesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-btn-consignment-ledger"
            onClick={() => setActiveMainTab('consignments')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'consignments'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-[#eef3f7]/50 rounded-t-xl'
                : 'border-transparent text-[#64748b] hover:text-[#1a3a52]'
            }`}
          >
            <Receipt className="w-4 h-4 text-[#1a3a52]" />
            <span>Settlement Ledger</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#1a3a52] text-white text-[10px] font-mono">
              {lots.length}
            </span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748b]" />
            <input
              id="payments-search-input"
              type="text"
              placeholder={
                activeMainTab === 'farmers'
                  ? 'Search farmer name, village, or phone...'
                  : 'Search by farmer, variety, parchi #, or village...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e2e8f0] text-xs bg-[#f8fafc] focus:outline-hidden focus:border-[#1a3a52]"
            />
          </div>

          {/* Filter Pills based on active tab */}
          {activeMainTab === 'farmers' ? (
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <button
                id="filter-status-all"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  statusFilter === 'all'
                    ? 'bg-[#1a3a52] text-white border-[#1a3a52]'
                    : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                {t('allFarmers')}
              </button>
              <button
                id="filter-status-pending"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  statusFilter === 'pending'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                {t('pendingOnly')} ({farmersWithDuesCount})
              </button>
              <button
                id="filter-status-settled"
                onClick={() => setStatusFilter('settled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  statusFilter === 'settled'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                {t('settledOnly')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <button
                id="filter-consignment-all"
                onClick={() => setConsignmentFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                  consignmentFilter === 'all'
                    ? 'bg-[#1a3a52] text-white border-[#1a3a52]'
                    : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                All Lots ({lots.length})
              </button>
              <button
                id="filter-consignment-unpaid"
                onClick={() => setConsignmentFilter('unpaid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                  consignmentFilter === 'unpaid'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                Unpaid / Pay Later ({unpaidLotsCount})
              </button>
              <button
                id="filter-consignment-partial"
                onClick={() => setConsignmentFilter('partial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                  consignmentFilter === 'partial'
                    ? 'bg-[#1a3a52] text-white border-[#1a3a52]'
                    : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                Partially Paid ({partialLotsCount})
              </button>
              <button
                id="filter-consignment-paid"
                onClick={() => setConsignmentFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                  consignmentFilter === 'paid'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                }`}
              >
                Settled ({paidLotsCount})
              </button>
            </div>
          )}

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 outline-none"
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
              <span>To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 outline-none"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition"
                title="Clear date range"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Farmers Tab OR Consignments Ledger Tab */}
      {activeMainTab === 'farmers' ? (
        /* Farmers Settlement Cards Grid */
        filteredFarmers.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#e2e8f0] text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-[#1a3a52] flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-[#1e293b]">
              {farmers.length === 0
                ? 'No Farmers Registered Yet'
                : statusFilter === 'pending'
                ? 'All Farmer Accounts Fully Settled!'
                : 'No Farmer Khatas Found'}
            </h4>
            <p className="text-xs text-[#64748b] max-w-md mx-auto">
              {farmers.length === 0
                ? 'Register farmers in your yard or create new flower sale parchis to track payments and pending balances.'
                : statusFilter === 'pending'
                ? 'There are zero pending balances due to farmers right now. Switch filter to "All Accounts" to view history.'
                : 'Try changing your search or switching filter tabs above.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFarmers.map((farmer) => {
              const stats = getFarmerStats(farmer.id);
              const hasDues = stats.pendingDues > 0;

              return (
                <div
                  key={farmer.id}
                  id={`settlement-card-${farmer.id}`}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-2xs transition flex flex-col justify-between space-y-4 ${
                    hasDues
                      ? 'border-red-300 hover:border-red-400'
                      : 'border-[#e2e8f0] hover:border-emerald-300'
                  }`}
                >
                  <div>
                    {/* Farmer Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-[#1e293b]">
                          {farmer.name}
                        </h4>
                        <p className="text-xs text-[#64748b]">
                          📍 {farmer.village} • Ph: {farmer.phone}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          hasDues
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {hasDues ? 'Pending Dues' : 'Settled'}
                      </span>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="mt-4 p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#64748b]">
                        <span>Total Net Payable:</span>
                        <span className="font-mono">₹{stats.totalNetPayable.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[#64748b]">
                        <span>Total Paid to Date:</span>
                        <span className="font-mono text-emerald-700">
                          ₹{stats.totalPaid.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-[#e2e8f0] font-bold text-sm">
                        <span className={hasDues ? 'text-red-900' : 'text-emerald-900'}>
                          Current Balance Due:
                        </span>
                        <span
                          className={`font-mono font-black ${
                            hasDues ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{stats.pendingDues.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Settle Dues Action */}
                  <div className="flex items-center gap-2">
                    <button
                      id={`settle-dues-btn-${farmer.id}`}
                      onClick={() => openPaymentModal(farmer)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                        hasDues
                          ? 'bg-[#C2255C] text-white hover:bg-[#a61c4c]'
                          : 'bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] hover:bg-[#f1f5f9]'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>{hasDues ? t('settleDuesBtn') : 'Record Advance / Payment'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Consignment Bills & Payouts Ledger View */
        filteredLots.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#e2e8f0] text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-[#1a3a52] flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-[#1e293b]">
              No Settlement Bills Found
            </h4>
            <p className="text-xs text-[#64748b] max-w-md mx-auto">
              No flower sales match your search or filter. All sales recorded from New Sale (whether Paid, Partial, or Unpaid Pay Later) appear directly here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLots.map((lot) => {
              const matchedFarmer = farmers.find((f) => f.id === lot.farmerId) || {
                id: lot.farmerId,
                name: lot.farmerName,
                village: lot.farmerVillage,
                phone: lot.farmerPhone,
                primaryCrops: [],
                connectedMerchantIds: [],
                createdAt: '',
              };

              const isUnpaid = lot.paymentStatus === 'Unpaid' || lot.amountPaid === 0;
              const isPartial = lot.paymentStatus === 'Partial' || (lot.amountPaid > 0 && lot.balanceDue > 0);
              const isPaid = lot.paymentStatus === 'Paid' && lot.balanceDue === 0;

              return (
                <div
                  key={lot.id}
                  id={`consignment-item-${lot.id}`}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition shadow-2xs hover:shadow-sm space-y-3 ${
                    isUnpaid
                      ? 'border-red-300'
                      : isPartial
                      ? 'border-amber-300'
                      : 'border-[#e2e8f0]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#1a3a52] bg-[#eef3f7] px-2.5 py-1 rounded-lg">
                        {lot.parchiNumber}
                      </span>
                      <span className="text-xs text-[#64748b] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDisplayDate(lot.date)} • {lot.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPaid && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Settled
                        </span>
                      )}
                      {isPartial && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Partially Paid
                        </span>
                      )}
                      {isUnpaid && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Unpaid / Pay Later
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lot Details Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[#64748b] block">Farmer</span>
                      <span className="font-bold text-sm text-[#1e293b] block">{lot.farmerName}</span>
                      <span className="text-[11px] text-[#64748b]">📍 {lot.farmerVillage}</span>
                    </div>

                    <div>
                      <span className="text-[#64748b] block">Crop &amp; Auction</span>
                      <span className="font-semibold text-[#1e293b] block">{lot.flowerVariety}</span>
                      <span className="text-[11px] font-mono text-[#64748b]">
                        {lot.quantity} {lot.unit || 'kg'} @ ₹{lot.rate}/{lot.unit || 'kg'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#64748b] block">Net Farmer Amount</span>
                      <span className="font-mono font-bold text-sm text-[#1e293b] block">
                        ₹{lot.farmerNetPayable.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-[#64748b]">
                        Paid: <strong className="text-emerald-700 font-mono">₹{lot.amountPaid.toLocaleString('en-IN')}</strong> ({lot.paymentMode})
                      </span>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-[#64748b] block">Balance Due</span>
                      <span
                        className={`font-mono font-black text-base block ${
                          lot.balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        ₹{lot.balanceDue.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#64748b]">
                        {lot.balanceDue > 0 ? 'Pending Settlement' : 'Settled in full'}
                      </span>
                    </div>
                  </div>

                  {/* Lot Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e2e8f0]/80">
                    <div className="text-[11px] text-[#64748b]">
                      {lot.notes && <span>Note: {lot.notes}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedParchiLot(lot)}
                        className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#f1f5f9] text-xs font-semibold text-[#1e293b] flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>View Parchi</span>
                      </button>

                      {lot.balanceDue > 0 && (
                        <button
                          type="button"
                          onClick={() => openPaymentModal(matchedFarmer, lot.id, lot.balanceDue)}
                          className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Settle Dues (₹{lot.balanceDue.toLocaleString('en-IN')})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        id={`delete-payment-lot-btn-${lot.id}`}
                        onClick={() => handleDeleteLotClick(lot)}
                        className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#9E3A24] hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                        title="Delete this consignment lot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Settle Dues Modal */}
      {selectedFarmerForPayment && (
        <div
          id="settle-dues-modal-overlay"
          onClick={() => setSelectedFarmerForPayment(null)}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            id="settle-dues-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFFFF] rounded-2xl max-w-md w-full shadow-2xl border border-[#e2e8f0] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-3 sm:p-4 bg-[#1a3a52] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFarmerForPayment(null)}
                  aria-label="Go Back"
                  className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-[#d4af37] shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    {t('recordPaymentTitle')}
                  </h3>
                  <p className="text-[11px] text-white/80">{selectedFarmerForPayment.name} ({selectedFarmerForPayment.village})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFarmerForPayment(null)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 space-y-4 bg-[#f8fafc]">
              {/* Outstanding Balance Banner */}
              {(() => {
                const currentPending = getFarmerStats(selectedFarmerForPayment.id).pendingDues;
                return (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs">
                    <span className="text-red-900 font-semibold">Outstanding Farmer Dues:</span>
                    <span className="font-mono font-black text-sm text-red-700">
                      ₹{currentPending.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })()}

              {/* Amount to Pay */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#1e293b]">
                    {t('amountToPay')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const full = getFarmerStats(selectedFarmerForPayment.id).pendingDues;
                      setPayAmount(full);
                    }}
                    className="text-[11px] font-bold text-[#1a3a52] hover:underline"
                  >
                    {t('fullClearance')}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-bold">₹</span>
                  <input
                    id="settlement-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={payAmount}
                    onChange={(e) =>
                      setPayAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#e2e8f0] text-sm font-bold bg-white focus:outline-hidden focus:border-[#1a3a52]"
                  />
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1.5">
                  {t('paymentModeLabel')} <span className="text-gray-500 font-normal">(PhonePe, online, or cash)</span>:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPayMode('Cash')}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-1 cursor-pointer ${
                      payMode === 'Cash'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMode('PhonePe')}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-1 cursor-pointer ${
                      payMode === 'PhonePe'
                        ? 'bg-[#5f259f] text-white border-[#5f259f] shadow-2xs'
                        : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-purple-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>PhonePe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMode('Google Pay')}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-1 cursor-pointer ${
                      payMode === 'Google Pay'
                        ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-2xs'
                        : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-blue-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>GPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMode('Paytm')}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-1 cursor-pointer ${
                      payMode === 'Paytm' || payMode === 'UPI'
                        ? 'bg-[#002e6e] text-white border-[#002e6e] shadow-2xs'
                        : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-cyan-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Paytm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMode('Bank Transfer')}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-1 cursor-pointer ${
                      payMode === 'Bank Transfer'
                        ? 'bg-[#334155] text-white border-[#334155] shadow-2xs'
                        : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Bank</span>
                  </button>
                </div>
              </div>

              {/* Reference & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                    {t('paymentDate')}
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                    {t('referenceNumber')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR / Receipt #"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs bg-white font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  Settlement Note (Optional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs bg-white"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setSelectedFarmerForPayment(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#e2e8f0] text-xs font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  id="confirm-payment-submit-btn"
                  className="px-5 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] shadow-xs"
                >
                  {t('confirmPayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showHistoryModal && (
        <div
          id="payment-history-modal-overlay"
          onClick={() => setShowHistoryModal(false)}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            id="payment-history-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFFFF] rounded-2xl max-w-2xl w-full shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-3 sm:p-4 bg-[#1a3a52] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  aria-label="Go Back"
                  className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-[#d4af37] shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm sm:text-base">Mandi Payouts &amp; Settlement History</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2 bg-[#f8fafc]">
              {payments.length === 0 ? (
                <p className="text-center text-xs text-[#64748b] py-8">
                  No payment disbursements recorded yet.
                </p>
              ) : (
                [...payments].reverse().map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-sm text-[#1e293b] block">{p.farmerName}</span>
                      <span className="text-[11px] text-[#64748b]">
                        {p.date} • {p.time} • Mode: <span className="font-semibold">{p.paymentMode}</span>
                      </span>
                      {p.referenceNumber && (
                        <span className="text-[10px] text-[#64748b] block font-mono">
                          Ref: {p.referenceNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-black font-mono text-emerald-700 block">
                          + ₹{p.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#64748b]">{p.notes || 'Settlement'}</span>
                      </div>
                      <button
                        type="button"
                        id={`delete-payment-receipt-btn-${p.id}`}
                        onClick={() => handleDeletePaymentClick(p)}
                        className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#9E3A24] hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                        title="Delete this payment record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-white border-t border-[#e2e8f0] flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-semibold cursor-pointer"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Notification */}
      {actionFeedbackMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#1e293b] text-white px-4 py-2.5 rounded-xl shadow-xl border border-white/20 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-4 h-4 text-[#d4af37]" />
          <span>{actionFeedbackMsg}</span>
        </div>
      )}

      {/* Duplicate Payment Warning Confirmation Dialog */}
      {duplicatePaymentWarning && duplicatePaymentWarning.isOpen && (
        <div
          id="duplicate-payment-warning-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setDuplicatePaymentWarning(null)}
        >
          <div
            id="duplicate-payment-warning-dialog"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-4 py-3.5 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-200 shrink-0" />
                <h3 className="font-bold text-sm text-white">Possible Duplicate Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setDuplicatePaymentWarning(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 bg-white">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
                {duplicatePaymentWarning.duplicateInfo}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                An identical payment record (same farmer, amount, date, and mode) is already stored in the system. Are you sure you want to record this duplicate transaction?
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicatePaymentWarning(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white text-xs font-bold hover:bg-slate-100 transition cursor-pointer min-touch-target"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (duplicatePaymentWarning.paymentData) {
                    savePaymentRecord(duplicatePaymentWarning.paymentData);
                  }
                  setDuplicatePaymentWarning(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shadow-xs min-touch-target"
              >
                Confirm Duplicate Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title={deleteModalConfig.type === 'lot' ? 'Delete Parchi Lot' : 'Delete Payment Transaction'}
        itemName={
          deleteModalConfig.type === 'lot' && deleteModalConfig.lot
            ? `Parchi Lot: ${deleteModalConfig.lot.parchiNumber}`
            : deleteModalConfig.payment
            ? `Payment Receipt: ₹${deleteModalConfig.payment.amount?.toLocaleString('en-IN')}`
            : undefined
        }
        itemDetails={
          deleteModalConfig.type === 'lot' && deleteModalConfig.lot
            ? `Farmer: ${deleteModalConfig.lot.farmerName} • Net Payable: ₹${deleteModalConfig.lot.farmerNetPayable?.toLocaleString('en-IN')} • Status: ${deleteModalConfig.lot.paymentStatus}`
            : deleteModalConfig.payment
            ? `Farmer: ${deleteModalConfig.payment.farmerName} • Mode: ${deleteModalConfig.payment.paymentMode || deleteModalConfig.payment.mode || 'Cash'} • Date: ${deleteModalConfig.payment.date}`
            : undefined
        }
        message={
          deleteModalConfig.type === 'lot'
            ? 'Are you sure you want to delete this parchi record? This will permanently remove the lot and update the farmer balance.'
            : 'Are you sure you want to delete this payment record? The farmer dues balance will be recalculated accordingly.'
        }
        confirmText="CONFIRM DELETE"
        cancelText="CANCEL"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalConfig({ isOpen: false, type: 'lot' })}
      />
    </div>
  );
};
