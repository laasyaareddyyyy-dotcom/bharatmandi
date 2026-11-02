import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Store,
  Users,
  Coins,
  Receipt,
  Printer,
  ChevronRight,
  Package,
  Calendar,
  Layers,
  Phone,
  Truck,
  FileText,
  Trash2,
  CheckCircle,
  Search,
  Filter,
  X,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  MapPin,
  Settings,
  Headphones,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  ArrowRight,
  Eye,
  Edit3,
  CreditCard,
  UserCheck,
  PlusCircle,
  Check,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { SaleLot, Shipment, CommodityCategory, RetailerSale, RetailerPayment } from '../../types';
import { COMMODITY_CONFIGS, formatDisplayDate, getTodayDateString } from '../../data/initialData';
import { sounds } from '../../utils/audio';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { ConsignmentDetailModal } from './ConsignmentDetailModal';
import { SalesReportPdfModal } from './SalesReportPdfModal';

export const DashboardView: React.FC = () => {
  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isSalesReportModalOpen, setIsSalesReportModalOpen] = useState<boolean>(false);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // Consignment Details Modal state
  const [selectedConsignmentForModal, setSelectedConsignmentForModal] = useState<{
    type: 'shipment' | 'lot' | 'retailSale';
    shipment?: Shipment;
    lot?: SaleLot;
    retailSale?: RetailerSale;
  } | null>(null);

  // Filters State
  const [filterCommodity, setFilterCommodity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');

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

  const {
    merchantProfile,
    activeSessionDate,
    todayLots,
    todayShipments,
    shipments,
    deleteShipment,
    deleteSaleLot,
    deleteRetailerSale,
    todayTurnover,
    todayLotsCount,
    todayFarmersServed,
    todayTotalVolume,
    todayCommissionEarned,
    todayTransportTotal,
    todayHamaliTotal,
    todayFarmerNetTotal,
    totalOutstandingDues,
    setMerchantTab,
    dashboardTab,
    setDashboardTab,
    consignmentSearchQuery,
    setConsignmentSearchQuery,
    setSelectedParchiLot,
    openEditParchiModal,
    openPdfModalForLot,
    openPdfModalForShipment,
    openParchiSlipForShipment,
    setIsDateSwitcherOpen,
    setIsSettingsOpen,
    setIsAuditTrailOpen,
    openHelpDesk,
    merchantSection,
    setMerchantSection,
    retailerSales,
    retailerPayments,
    retailers,
    farmers,
    userCommodities,
  } = useMandi();

  const isRetailerMode = merchantSection === 'retailer';

  // Toggle card expansion
  const toggleCardExpansion = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // ==========================================
  // RETAILER MODE DYNAMIC METRICS & PARCHIS
  // ==========================================
  const todayRetailSales = useMemo(() => {
    const targetDate = activeSessionDate || getTodayDateString();
    return retailerSales.filter((s) => {
      const saleDate = s.createdAt ? s.createdAt.slice(0, 10) : targetDate;
      return saleDate === targetDate;
    });
  }, [retailerSales, activeSessionDate]);

  const todayRetailPayments = useMemo(() => {
    const targetDate = activeSessionDate || getTodayDateString();
    return retailerPayments.filter((p) => {
      const payDate = p.time ? p.time.slice(0, 10) : targetDate;
      return payDate === targetDate;
    });
  }, [retailerPayments, activeSessionDate]);

  const retailerTodayTotalSold = useMemo(() => {
    return todayRetailSales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
  }, [todayRetailSales]);

  const retailerTodayMoneyCollected = useMemo(() => {
    const paidInTodaySales = todayRetailSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const directTodayPayments = todayRetailPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return paidInTodaySales + directTodayPayments;
  }, [todayRetailSales, todayRetailPayments]);

  const retailerTodayBalanceDue = Math.max(0, retailerTodayTotalSold - retailerTodayMoneyCollected);

  // All-time total due from all retail customers
  const retailerAllTimeTotalDue = useMemo(() => {
    const totalSoldAllTime = retailerSales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
    const totalPaidInSalesAllTime = retailerSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const totalDirectPaymentsAllTime = retailerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return Math.max(0, totalSoldAllTime - totalPaidInSalesAllTime - totalDirectPaymentsAllTime);
  }, [retailerSales, retailerPayments]);

  // Trading Today metrics for Retailer
  const retailerTodayLotsSold = todayRetailSales.length;
  const retailerTodayVolumeSold = useMemo(() => {
    return todayRetailSales.reduce((sum, s) => {
      const qtySum = s.items?.reduce((iSum, item) => iSum + (item.quantity || 0), 0) || 0;
      return sum + qtySum;
    }, 0);
  }, [todayRetailSales]);

  const retailerTodayCustomersServed = useMemo(() => {
    const setOfCustomers = new Set<string>();
    todayRetailSales.forEach((s) => {
      if (s.retailerId) setOfCustomers.add(s.retailerId);
      else if (s.retailerName) setOfCustomers.add(s.retailerName);
    });
    return setOfCustomers.size;
  }, [todayRetailSales]);

  // Filtered Retailer Parchis
  const filteredRetailSales = useMemo(() => {
    return todayRetailSales.filter((sale) => {
      if (consignmentSearchQuery.trim()) {
        const q = consignmentSearchQuery.toLowerCase().trim();
        const matchesParchi = sale.parchiNumber.toLowerCase().includes(q);
        const matchesCustomer = sale.retailerName.toLowerCase().includes(q);
        const matchesShop = sale.retailerShop?.toLowerCase().includes(q) || false;
        const matchesVariety = sale.items?.some(
          (i) => i.varietyName.toLowerCase().includes(q)
        ) || false;
        if (!matchesParchi && !matchesCustomer && !matchesShop && !matchesVariety) return false;
      }

      if (filterStatus !== 'all') {
        if (filterStatus === 'Paid' && sale.balanceDue > 0) return false;
        if (filterStatus === 'Due' && sale.balanceDue <= 0) return false;
      }

      if (filterMinAmount) {
        const min = Number(filterMinAmount);
        if (!isNaN(min) && sale.grossTotal < min) return false;
      }

      if (filterMaxAmount) {
        const max = Number(filterMaxAmount);
        if (!isNaN(max) && sale.grossTotal > max) return false;
      }

      return true;
    });
  }, [todayRetailSales, consignmentSearchQuery, filterStatus, filterMinAmount, filterMaxAmount]);

  // ==========================================
  // WHOLESALER MODE DYNAMIC METRICS & PARCHIS
  // ==========================================
  const filteredShipments = useMemo(() => {
    return todayShipments.filter((shipment) => {
      if (consignmentSearchQuery.trim()) {
        const q = consignmentSearchQuery.toLowerCase().trim();
        const matchesId = shipment.shipmentNumber.toLowerCase().includes(q);
        const matchesFarmer = shipment.farmerName.toLowerCase().includes(q);
        const matchesVillage = shipment.farmerVillage?.toLowerCase().includes(q) || false;
        const matchesCommodity = shipment.items.some(
          (i) =>
            i.flowerVariety.toLowerCase().includes(q) ||
            (i.commodityCategory && i.commodityCategory.toLowerCase().includes(q))
        );
        if (!matchesId && !matchesFarmer && !matchesVillage && !matchesCommodity) return false;
      }

      if (filterCommodity !== 'all') {
        const matches = shipment.items.some(
          (i) => (i.commodityCategory || 'flowers') === filterCommodity
        );
        if (!matches) return false;
      }

      if (filterLocation !== 'all') {
        if (shipment.farmerVillage !== filterLocation) return false;
      }

      if (filterMinAmount) {
        const min = Number(filterMinAmount);
        if (!isNaN(min) && shipment.grossTotal < min) return false;
      }

      if (filterMaxAmount) {
        const max = Number(filterMaxAmount);
        if (!isNaN(max) && shipment.grossTotal > max) return false;
      }

      return true;
    });
  }, [
    todayShipments,
    consignmentSearchQuery,
    filterCommodity,
    filterLocation,
    filterMinAmount,
    filterMaxAmount,
  ]);

  const uniqueVillages = useMemo(() => {
    const list = new Set<string>();
    todayShipments.forEach((s) => {
      if (s.farmerVillage) list.add(s.farmerVillage);
    });
    return Array.from(list);
  }, [todayShipments]);

  // Handle Delete Shipment / Parchi
  const handleDeleteShipmentConfirm = (shipment: Shipment) => {
    setDeleteModalConfig({
      isOpen: true,
      title: 'Delete Consignment Record',
      itemName: `Parchi #${shipment.shipmentNumber}`,
      itemDetails: `Farmer: ${shipment.farmerName} • Gross Value: ₹${shipment.grossTotal.toLocaleString('en-IN')}`,
      message: 'Are you sure you want to permanently delete this consignment entry? This action cannot be undone.',
      onConfirm: () => {
        deleteShipment(shipment.id);
        sounds.playTrashSound?.();
        setActionFeedbackMsg(`Consignment record #${shipment.shipmentNumber} deleted successfully.`);
        setTimeout(() => setActionFeedbackMsg(null), 3000);
      },
    });
  };

  const handleDeleteRetailSaleConfirm = (sale: RetailerSale) => {
    setDeleteModalConfig({
      isOpen: true,
      title: 'Delete Retail Sale Parchi',
      itemName: `Retail Parchi #${sale.parchiNumber}`,
      itemDetails: `Customer: ${sale.retailerName} • Amount: ₹${sale.grossTotal.toLocaleString('en-IN')}`,
      message: 'Are you sure you want to delete this retail sale entry?',
      onConfirm: () => {
        deleteRetailerSale(sale.id);
        sounds.playTrashSound?.();
        setActionFeedbackMsg(`Retail Parchi #${sale.parchiNumber} deleted successfully.`);
        setTimeout(() => setActionFeedbackMsg(null), 3000);
      },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 select-none pb-8">
      {/* Action feedback toast */}
      {actionFeedbackMsg && (
        <div className="fixed top-20 right-4 z-50 bg-[#1a3a52] text-white text-xs sm:text-sm font-bold px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedbackMsg}</span>
        </div>
      )}

      {/* Mode Indicator & Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a3a52] text-white flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#1e293b]">
                {isRetailerMode ? 'Retail Sales Dashboard' : 'Wholesale Mandi Dashboard'}
              </h2>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                isRetailerMode ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              }`}>
                {isRetailerMode ? 'Retail Mode' : 'Wholesaler Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isRetailerMode
                ? 'Track retail customer sales, daily collection, and outstanding customer dues'
                : 'Form C Adathiya Commission & Farmer Settlement Summary'}
            </p>
          </div>
        </div>

      </div>

      {/* =========================================================================
          1. DASHBOARD METRICS CARDS
         ========================================================================= */}
      {isRetailerMode ? (
        /* RETAILER MODE DASHBOARD CARDS (NO HAMALI, NO COMMISSION, NO FARMER TERMS) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Today's Total Sold */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Total Sold Today</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-[#1e293b]">
              ₹{retailerTodayTotalSold.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 font-medium">Gross value of retail sales today</p>
          </div>

          {/* Card 2: Today's Money Collected */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Money Collected Today</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-700">
              ₹{retailerTodayMoneyCollected.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 font-medium">Direct cash &amp; UPI collections today</p>
          </div>

          {/* Card 3: Today's Balance Due */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Balance Due Today</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center">
                <Clock className="w-4 h-4 text-rose-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-rose-600">
              ₹{retailerTodayBalanceDue.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 font-medium">Credit balance from today's sales</p>
          </div>

          {/* Card 4: ALL TIME Customer Dues (RED) */}
          <div className="bg-rose-50/80 rounded-2xl border-2 border-rose-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-900 tracking-wider">Total Due From Customers</span>
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black">
                ₹
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-rose-700">
              ₹{retailerAllTimeTotalDue.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-rose-800 font-bold">Outstanding across all customer khatas</p>
          </div>
        </div>
      ) : (
        /* WHOLESALER MODE DASHBOARD CARDS (NO YELLOW / NO GOLD STYLING) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Net Payable to Farmers */}
          <div className="bg-emerald-50/80 rounded-2xl border-2 border-emerald-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">Net Payable to Farmers</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                ₹
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-800">
              ₹{todayFarmerNetTotal.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-emerald-900 font-medium">Net amount after freight, hamali &amp; commission</p>
          </div>

          {/* Card 2: Gross Sales Turnover */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Gross Sales Turnover</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-[#1e293b]">
              ₹{todayTurnover.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 font-medium">Total gross auction turnover today</p>
          </div>

          {/* Card 3: Mandi Commission */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Mandi Commission</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-900">
              ₹{todayCommissionEarned.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 font-medium">Adathiya commission earned today</p>
          </div>

          {/* Card 4: Freight & Hamali Deductions (NO YELLOW / CLEAN SLATE STYLE) */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Freight &amp; Hamali</span>
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Vehicle Freight</span>
                <span className="text-base font-black font-mono text-slate-900">₹{todayTransportTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 block">Hamali / Labor</span>
                <span className="text-base font-black font-mono text-slate-900">₹{todayHamaliTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. TRADING TODAY SUMMARY ROW (NO YELLOW / CLEAN BLUE & NAVY ACCENTS)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1a3a52] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#1a3a52]">
              Trading Today • {formatDisplayDate(activeSessionDate)}
            </h3>
          </div>
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
            {isRetailerMode ? `${retailerTodayLotsSold} Retail Entries` : `${todayLotsCount} Wholesale Consignments`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Lots Sold</span>
            <span className="text-lg sm:text-xl font-black text-[#1e293b] font-mono">
              {isRetailerMode ? retailerTodayLotsSold : todayLotsCount}
            </span>
          </div>

          <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Volume Sold (Kgs)</span>
            <span className="text-lg sm:text-xl font-black text-[#1e293b] font-mono">
              {isRetailerMode ? retailerTodayVolumeSold.toLocaleString('en-IN') : todayTotalVolume.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">
              {isRetailerMode ? 'Customers Served' : 'Farmers Served'}
            </span>
            <span className="text-lg sm:text-xl font-black text-[#1e293b] font-mono">
              {isRetailerMode ? retailerTodayCustomersServed : todayFarmersServed}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. PARCHI RECORDS SECTION (REACTIVE REALTIME LIST)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#1a3a52]" />
              <h3 className="text-sm sm:text-base font-black text-[#1e293b]">
                {isRetailerMode ? 'Retail Parchi Records' : 'Wholesale Consignment Records'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Showing {isRetailerMode ? filteredRetailSales.length : filteredShipments.length} parchi entries for {formatDisplayDate(activeSessionDate)}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Cards vs Table View Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'cards' ? 'bg-white text-[#1a3a52] shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'table' ? 'bg-white text-[#1a3a52] shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playBidTick();
                setMerchantTab('new-sale');
              }}
              className="px-3.5 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-black hover:bg-[#122839] transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ New Sale</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={consignmentSearchQuery}
              onChange={(e) => setConsignmentSearchQuery(e.target.value)}
              placeholder={isRetailerMode ? "Search customer, shop, variety, parchi #..." : "Search farmer, village, variety, parchi #..."}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold outline-none focus:border-[#1a3a52]"
            />
            {consignmentSearchQuery && (
              <button
                type="button"
                onClick={() => setConsignmentSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            PARCHI ENTRIES RENDER (RETAILER VS WHOLESALER)
           ========================================================================= */}
        {isRetailerMode ? (
          /* RETAILER PARCHI LIST (NO FARMER WORDS, NO HAMALI, NO COMMISSION) */
          filteredRetailSales.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
              <Receipt className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No retail parchis recorded for today</p>
              <p className="text-xs text-slate-500">Tap "+ New Sale" above to log a retail customer entry.</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredRetailSales.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#1e293b]">#{sale.parchiNumber}</span>
                        <span className="text-xs text-slate-500 font-mono">{sale.time}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {sale.retailerName} {sale.retailerShop ? `• ${sale.retailerShop}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black font-mono text-[#1e293b] block">
                        ₹{sale.grossTotal.toLocaleString('en-IN')}
                      </span>
                      {sale.balanceDue <= 0 ? (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Cleared ✓
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Due ₹{sale.balanceDue.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 font-medium">
                    <span className="font-bold text-slate-900">Items: </span>
                    {sale.items && sale.items.length > 0
                      ? sale.items.map((i) => `${i.varietyName} (${i.quantity} ${i.unit} @ ₹${i.rate})`).join(', ')
                      : 'N/A'}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="text-slate-500 font-medium">
                      Paid: <strong className="text-emerald-700 font-mono">₹{sale.amountPaid.toLocaleString('en-IN')}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRetailSaleConfirm(sale)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Retail Table View */
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs font-semibold text-slate-800">
                <thead className="bg-[#1a3a52] text-white uppercase text-[11px] font-bold">
                  <tr>
                    <th className="p-3">Parchi #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items / Variety</th>
                    <th className="p-3 text-right">Total Sold (₹)</th>
                    <th className="p-3 text-right">Paid (₹)</th>
                    <th className="p-3 text-right">Due (₹)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredRetailSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-[#1a3a52]">{sale.parchiNumber}</td>
                      <td className="p-3">
                        <span className="font-black text-[#1e293b] block">{sale.retailerName}</span>
                        <span className="text-[11px] text-slate-500">{sale.retailerShop || 'Retailer'}</span>
                      </td>
                      <td className="p-3 text-slate-700 max-w-xs truncate">
                        {sale.items && sale.items.length > 0
                          ? sale.items.map((i) => `${i.varietyName} (${i.quantity}${i.unit})`).join(', ')
                          : 'N/A'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-sm">
                        ₹{sale.grossTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                        ₹{sale.amountPaid.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {sale.balanceDue <= 0 ? (
                          <span className="text-emerald-700 font-black">0 ✓</span>
                        ) : (
                          <span className="text-rose-600 font-black">₹{sale.balanceDue.toLocaleString('en-IN')}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRetailSaleConfirm(sale)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* WHOLESALER PARCHI LIST (FORM C ADATHIYA) */
          filteredShipments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
              <Receipt className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No wholesaler consignments recorded for today</p>
              <p className="text-xs text-slate-500">Tap "+ New Sale" above to log a farmer arrival entry.</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#1e293b]">#{shipment.shipmentNumber}</span>
                        <span className="text-xs text-slate-500 font-mono">{shipment.time}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        Farmer: {shipment.farmerName} {shipment.farmerVillage ? `• ${shipment.farmerVillage}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block font-medium">Farmer Net Payable</span>
                      <span className="text-base font-black font-mono text-emerald-800">
                        ₹{shipment.netAmountAfterDailyCuts.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 font-medium">
                    <span className="font-bold text-slate-900">Varieties: </span>
                    {shipment.items?.map((i) => `${i.flowerVariety} (${i.quantity} ${i.unit} @ ₹${i.rate})`).join(', ')}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 font-medium">
                      <span>Gross: <strong className="text-slate-900 font-mono">₹{shipment.grossTotal.toLocaleString('en-IN')}</strong></span>
                      <span>Comm: <strong className="text-slate-900 font-mono">₹{shipment.commissionAmount || 0}</strong></span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openPdfModalForShipment(shipment)}
                        className="px-2.5 py-1 text-xs font-black rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteShipmentConfirm(shipment)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Wholesaler Table View */
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs font-semibold text-slate-800">
                <thead className="bg-[#1a3a52] text-white uppercase text-[11px] font-bold">
                  <tr>
                    <th className="p-3">Parchi #</th>
                    <th className="p-3">Farmer</th>
                    <th className="p-3">Varieties</th>
                    <th className="p-3 text-right">Gross (₹)</th>
                    <th className="p-3 text-right">Comm (₹)</th>
                    <th className="p-3 text-right">Net Payable (₹)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-[#1a3a52]">{shipment.shipmentNumber}</td>
                      <td className="p-3">
                        <span className="font-black text-[#1e293b] block">{shipment.farmerName}</span>
                        <span className="text-[11px] text-slate-500">{shipment.farmerVillage || 'Village'}</span>
                      </td>
                      <td className="p-3 text-slate-700 max-w-xs truncate">
                        {shipment.items?.map((i) => `${i.flowerVariety} (${i.quantity}${i.unit})`).join(', ')}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ₹{shipment.grossTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        ₹{shipment.commissionAmount || 0}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-sm text-emerald-800">
                        ₹{shipment.netAmountAfterDailyCuts.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openPdfModalForShipment(shipment)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteShipmentConfirm(shipment)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title={deleteModalConfig.title}
        itemName={deleteModalConfig.itemName}
        itemDetails={deleteModalConfig.itemDetails}
        message={deleteModalConfig.message}
        onClose={() => setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModalConfig.onConfirm}
      />
    </div>
  );
};
