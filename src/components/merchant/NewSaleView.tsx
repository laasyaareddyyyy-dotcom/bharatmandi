import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Receipt,
  Search,
  UserPlus,
  Coins,
  CheckCircle2,
  Printer,
  Plus,
  Calendar,
  Trash2,
  RotateCcw,
  CreditCard,
  FileText,
  Layers,
  Store,
  X,
  User,
  Phone,
  MapPin,
  AlertCircle,
  Percent,
  Check,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import {
  WeightUnit,
  PaymentStatus,
  PaymentMode,
  FlowerQuality,
  SaleLot,
  CommodityCategory,
  Farmer,
  Retailer,
  RetailerSaleItem,
} from '../../types';
import {
  formatDisplayDate,
  formatDateDMY,
  getTodayDateString,
  COMMODITY_CONFIGS,
} from '../../data/initialData';
import { PhotoUploadPicker } from '../common/PhotoUploadPicker';
import { GeneratePdfModal } from '../common/GeneratePdfModal';
import { RetailerPdfModal } from './RetailerPdfModal';
import { CustomVarietyInput } from '../common/CustomVarietyInput';
import { NewFarmerRegistrationModal } from './NewFarmerRegistrationModal';
import { sounds } from '../../utils/audio';
import { generateVectorParchiPdf } from '../../utils/vectorPdf';
import { buildFormCData } from '../../utils/formCDataBuilder';

export interface ConsignmentVarietyRow {
  id: string;
  commodityCategory: CommodityCategory;
  flowerVariety: string;
  customVariety: string;
  quantity: number | '';
  unit: WeightUnit;
  boxesCount: number | '';
  packagingType?: string;
  flowerQuality: FlowerQuality;
  rate: number | '';
}

interface NewSaleViewProps {
  mode?: 'wholesaler' | 'retailer';
  targetMerchantId?: string;
}

const getSafeCommodityConfig = (cat?: string) => {
  if (cat && COMMODITY_CONFIGS[cat as CommodityCategory]) {
    return COMMODITY_CONFIGS[cat as CommodityCategory];
  }
  return COMMODITY_CONFIGS.flowers;
};

export const NewSaleView: React.FC<NewSaleViewProps> = ({ mode, targetMerchantId }) => {
  const {
    merchantSection,
    farmers,
    addFarmer,
    updateFarmer,
    addSaleLot,
    addShipment,
    lots,
    shipments,
    setSelectedParchiLot,
    merchantProfile,
    registeredAccounts,
    activeSessionDate,
    setActiveSessionDate,
    setMerchantTab,
    openPdfModalForLot,
    userCommodities,
    activeCommodityFilter,
    addCustomVarietyName,
    language,
    t,
    retailers,
    addRetailer,
    addRetailerSale,
    retailerSales,
    retailerPayments,
    stocks,
    updateStockItem,
    getFarmerStats,
    setIsOwnerSignUpOpen,
  } = useMandi();

  const activeMode = mode || merchantSection || 'wholesaler';
  const isRetailerMode = activeMode === 'retailer';

  // Trading Date for this consignment entry
  const [saleDate, setSaleDate] = useState<string>(activeSessionDate || getTodayDateString());

  useEffect(() => {
    setSaleDate(activeSessionDate || getTodayDateString());
  }, [activeSessionDate]);

  // Ref for farmer section scrolling
  const farmerSectionRef = useRef<HTMLDivElement>(null);

  // Wholesaler Farmer Selection State (Starts empty on every new entry)
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
  const [farmerSearch, setFarmerSearch] = useState<string>('');
  const [isFarmerDropdownOpen, setIsFarmerDropdownOpen] = useState(false);
  const [showInlineAddFarmer, setShowInlineAddFarmer] = useState(false);
  const [isFarmerModalOpen, setIsFarmerModalOpen] = useState(false);
  const [farmerFieldError, setFarmerFieldError] = useState<string | null>(null);
  const [isChangeFarmerConfirmOpen, setIsChangeFarmerConfirmOpen] = useState<boolean>(false);

  // Instant Registration Panel State
  const [isRegistrationPanelOpen, setIsRegistrationPanelOpen] = useState<boolean>(false);
  const [regFarmerName, setRegFarmerName] = useState<string>('');
  const [regFarmerPhone, setRegFarmerPhone] = useState<string>('');
  const [regFarmerVillage, setRegFarmerVillage] = useState<string>('');
  const [regFarmerPhotoUrl, setRegFarmerPhotoUrl] = useState<string>('');
  const [duplicateFoundFarmer, setDuplicateFoundFarmer] = useState<Farmer | null>(null);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);

  // Inline Farmer Form State
  const [newFarmerName, setNewFarmerName] = useState('');
  const [newFarmerPhone, setNewFarmerPhone] = useState('');
  const [newFarmerVillage, setNewFarmerVillage] = useState('');
  const [newFarmerPhotoUrl, setNewFarmerPhotoUrl] = useState('');

  // Retailer Customer Selection State (Starts empty on every new entry)
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [showInlineAddCustomer, setShowInlineAddCustomer] = useState(false);
  const [customerFieldError, setCustomerFieldError] = useState<string | null>(null);

  // Inline Retail Customer Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerShop, setNewCustomerShop] = useState('');

  // Primary commodity for initial variety row
  const initialCategory: CommodityCategory = (
    activeCommodityFilter && activeCommodityFilter !== 'all'
      ? activeCommodityFilter
      : userCommodities[0] || 'flowers'
  ) as CommodityCategory;
  const initialConfig = getSafeCommodityConfig(initialCategory);
  const initialUnit = (initialConfig.allowedUnits[0] as WeightUnit) || 'Kgs';

  // Load saved draft so item entries are never lost when adding farmers or switching tabs
  const loadDraftObj = () => {
    try {
      const saved = localStorage.getItem(`bharatmandi_draft_sale_${activeMode}_v1`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.varietyRows) && parsed.varietyRows.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return null;
  };

  const initialDraft = useMemo(() => loadDraftObj(), [activeMode]);

  // Multi-Variety Rows
  const [varietyRows, setVarietyRows] = useState<ConsignmentVarietyRow[]>(() => {
    if (initialDraft?.varietyRows && Array.isArray(initialDraft.varietyRows) && initialDraft.varietyRows.length > 0) {
      return initialDraft.varietyRows;
    }
    return [
      {
        id: 'var-1',
        commodityCategory: initialCategory,
        flowerVariety: '',
        customVariety: '',
        quantity: '',
        unit: initialUnit,
        boxesCount: '',
        packagingType: initialCategory === 'grains' ? 'Bags' : 'Boxes',
        flowerQuality: 'Good',
        rate: '',
      },
    ];
  });

  // Wholesaler Charges State (Deductions)
  const [ammaliCharge, setAmmaliCharge] = useState<number | ''>(() => initialDraft?.ammaliCharge ?? '');
  const [transportCharge, setTransportCharge] = useState<number | ''>(() => initialDraft?.transportCharge ?? '');
  const [commissionRate, setCommissionRate] = useState<number | ''>(() => initialDraft?.commissionRate ?? '');
  const [miscCommissionRate, setMiscCommissionRate] = useState<number | ''>(() => initialDraft?.miscCommissionRate ?? '');

  // Retailer Payment & Advance State
  const [amountPaidNow, setAmountPaidNow] = useState<string>(() => initialDraft?.amountPaidNow ?? '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(() => initialDraft?.paymentMode ?? 'Cash');
  const [notes, setNotes] = useState<string>(() => initialDraft?.notes ?? '');
  const [deductStock, setDeductStock] = useState<boolean>(true);
  const [allowAdvance, setAllowAdvance] = useState<boolean>(false);
  const [showDueDetailsModal, setShowDueDetailsModal] = useState<boolean>(false);

  // Auto-persist draft so typed items are never lost on adding farmer or navigating
  useEffect(() => {
    try {
      const draftObj = {
        varietyRows,
        ammaliCharge,
        transportCharge,
        commissionRate,
        miscCommissionRate,
        amountPaidNow,
        paymentMode,
        notes,
        selectedFarmerId,
        selectedRetailerId,
      };
      localStorage.setItem(`bharatmandi_draft_sale_${activeMode}_v1`, JSON.stringify(draftObj));
    } catch {}
  }, [
    varietyRows,
    ammaliCharge,
    transportCharge,
    commissionRate,
    miscCommissionRate,
    amountPaidNow,
    paymentMode,
    notes,
    selectedFarmerId,
    selectedRetailerId,
    activeMode,
  ]);

  // Wholesaler PDF Modal State
  const [isWholesalerPdfOpen, setIsWholesalerPdfOpen] = useState<boolean>(false);
  const [wholesalerPdfLot, setWholesalerPdfLot] = useState<SaleLot | null>(null);

  // Retailer PDF Modal State
  const [isRetailerPdfOpen, setIsRetailerPdfOpen] = useState<boolean>(false);
  const [selectedRetailerForPdf, setSelectedRetailerForPdf] = useState<Retailer | null>(null);

  // Action Notification Feedback
  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPdfPreparing, setIsPdfPreparing] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Selected Farmer (returns null if selectedFarmerId is empty)
  const selectedFarmer = useMemo(() => {
    if (!selectedFarmerId) return null;
    const cleanSel = selectedFarmerId.trim().toLowerCase();
    return (
      farmers.find(
        (f) =>
          f &&
          f.id &&
          (f.id === selectedFarmerId || f.id.trim().toLowerCase() === cleanSel)
      ) || null
    );
  }, [farmers, selectedFarmerId]);

  // Selected Farmer Current Dues (total across all commodities)
  const selectedFarmerDues = useMemo(() => {
    if (!selectedFarmer) return 0;
    const stats = getFarmerStats(selectedFarmer.id, undefined, undefined, 'all');
    return stats?.pendingDues || 0;
  }, [selectedFarmer, getFarmerStats]);

  // 5 Most Recently Created/Used Farmers for quick chips (sorted by creation timestamp descending)
  const recentFarmers = useMemo(() => {
    return farmers
      .filter((f) => !f.isArchived)
      .slice()
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [farmers]);

  // Check if item entries are filled
  const hasFilledItemEntries = useMemo(() => {
    return varietyRows.some(
      (r) =>
        r.quantity !== '' ||
        r.rate !== '' ||
        (r.customVariety && r.customVariety.trim() !== '') ||
        (r.flowerVariety && r.flowerVariety.trim() !== '')
    );
  }, [varietyRows]);

  const clearFarmerSelection = () => {
    setSelectedFarmerId('');
    setFarmerSearch('');
    setIsFarmerDropdownOpen(false);
    setIsChangeFarmerConfirmOpen(false);
    setFarmerFieldError(null);
  };

  const handleRequestChangeFarmer = () => {
    if (hasFilledItemEntries) {
      setIsChangeFarmerConfirmOpen(true);
    } else {
      clearFarmerSelection();
    }
  };

  // Selected Retailer (returns null if selectedRetailerId is empty)
  const selectedRetailer = useMemo(() => {
    if (!selectedRetailerId) return null;
    return retailers.find((r) => r.id === selectedRetailerId) || null;
  }, [retailers, selectedRetailerId]);

  // Retailer Previous Due (Carry-forward balance prior to this sale)
  const previousDue = useMemo(() => {
    if (!selectedRetailer || !isRetailerMode) return 0;
    const sales = retailerSales.filter((s) => s.retailerId === selectedRetailer.id);
    const payments = retailerPayments.filter((p) => p.retailerId === selectedRetailer.id);
    const totalBilled = sales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
    const paidAtSales = sales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const directPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return Math.max(0, totalBilled - (paidAtSales + directPaid));
  }, [selectedRetailer, retailerSales, retailerPayments, isRetailerMode]);

  // Row Manipulation Handlers
  const handleAddVarietyRow = () => {
    sounds.playBidTick?.();
    const lastRow = varietyRows[varietyRows.length - 1];
    const cat = lastRow ? lastRow.commodityCategory : initialCategory;
    const cfg = getSafeCommodityConfig(cat);
    const newRow: ConsignmentVarietyRow = {
      id: `var-${Date.now()}-${varietyRows.length + 1}`,
      commodityCategory: cat,
      flowerVariety: '',
      customVariety: '',
      quantity: '',
      unit: (cfg.allowedUnits[0] as WeightUnit) || 'Kgs',
      boxesCount: '',
      packagingType: cat === 'grains' ? 'Bags' : 'Boxes',
      flowerQuality: 'Good',
      rate: '',
    };
    setVarietyRows([...varietyRows, newRow]);
  };

  const handleRemoveVarietyRow = (id: string) => {
    if (varietyRows.length === 1) {
      alert('At least one item line is required.');
      return;
    }
    sounds.playBidTick?.();
    setVarietyRows(varietyRows.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof ConsignmentVarietyRow, value: any) => {
    setVarietyRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'commodityCategory') {
          const cfg = getSafeCommodityConfig(value as CommodityCategory);
          return {
            ...row,
            commodityCategory: value as CommodityCategory,
            flowerVariety: '',
            customVariety: '',
            unit: (cfg.allowedUnits[0] as WeightUnit) || 'Kgs',
            packagingType: value === 'grains' ? 'Bags' : 'Boxes',
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  // Calculated Row Totals
  const calculatedRows = useMemo(() => {
    return varietyRows.map((row) => {
      const q = typeof row.quantity === 'number' ? row.quantity : parseFloat(row.quantity) || 0;
      const r = typeof row.rate === 'number' ? row.rate : parseFloat(row.rate) || 0;
      const resolvedVariety = row.customVariety.trim() || row.flowerVariety || 'Standard Quality';
      const lineTotal = q * r;
      return {
        ...row,
        numQuantity: q,
        numRate: r,
        resolvedVariety,
        lineTotal,
      };
    });
  }, [varietyRows]);

  const totalGrossAmount = useMemo(() => {
    return calculatedRows.reduce((sum, r) => sum + r.lineTotal, 0);
  }, [calculatedRows]);

  // Wholesaler Deductions Calculation
  const numericAmmali = typeof ammaliCharge === 'number' ? ammaliCharge : parseFloat(ammaliCharge) || 0;
  const numericTransport = typeof transportCharge === 'number' ? transportCharge : parseFloat(transportCharge) || 0;
  const numericCommissionRate = typeof commissionRate === 'number' ? commissionRate : parseFloat(commissionRate) || 0;
  const numericMiscRate = typeof miscCommissionRate === 'number' ? miscCommissionRate : parseFloat(miscCommissionRate) || 0;

  const commissionAmount = Math.round(totalGrossAmount * (numericCommissionRate / 100));
  const miscCommissionAmount = Math.round(totalGrossAmount * (numericMiscRate / 100));
  const totalDeductions = numericAmmali + numericTransport + commissionAmount + miscCommissionAmount;
  const farmerNetPayable = Math.max(0, totalGrossAmount - totalDeductions);

  // Retailer Balance & Grand Total Calculation
  const grandTotalPayable = totalGrossAmount + previousDue;
  const numAmountPaid = parseFloat(amountPaidNow) || 0;
  const remainingBalance = grandTotalPayable - numAmountPaid;

  const isPaymentOverLimit = isRetailerMode && numAmountPaid > grandTotalPayable && !allowAdvance;
  const isPaymentNegative = numAmountPaid < 0;
  const paymentValidationError = isPaymentNegative
    ? 'Amount paid cannot be negative.'
    : isPaymentOverLimit
    ? `Amount paid cannot exceed Grand Total Payable (₹${grandTotalPayable.toLocaleString('en-IN')}) unless advance payment is enabled.`
    : null;

  // Preset Handlers
  const payableBase = isRetailerMode ? grandTotalPayable : farmerNetPayable;
  const handlePresetPayFull = () => setAmountPaidNow(String(payableBase));
  const handlePresetPayHalf = () => setAmountPaidNow(String(Math.round(payableBase / 2)));
  const handlePresetPayTodaysOnly = () => setAmountPaidNow(String(totalGrossAmount));
  const handlePresetCustom = () => setAmountPaidNow('');

  const resetForm = () => {
    try {
      localStorage.removeItem(`bharatmandi_draft_sale_${activeMode}_v1`);
    } catch {}
    setVarietyRows([
      {
        id: `var-${Date.now()}`,
        commodityCategory: initialCategory,
        flowerVariety: '',
        customVariety: '',
        quantity: '',
        unit: initialUnit,
        boxesCount: '',
        packagingType: initialCategory === 'grains' ? 'Bags' : 'Boxes',
        flowerQuality: 'Good',
        rate: '',
      },
    ]);
    setSelectedFarmerId('');
    setFarmerSearch('');
    setSelectedRetailerId('');
    setCustomerSearch('');
    setFarmerFieldError(null);
    setCustomerFieldError(null);
    setAmmaliCharge('');
    setTransportCharge('');
    setCommissionRate('');
    setMiscCommissionRate('');
    setAmountPaidNow('');
    setPaymentMode('Cash');
    setNotes('');
    setAllowAdvance(false);
  };

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Save & Select Farmer Handler (Registration Panel)
  const handleSaveAndSelectFarmer = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = regFarmerName.trim();
    if (!cleanName) {
      alert('Please enter farmer name');
      return;
    }

    const cleanPhone = regFarmerPhone.replace(/\D/g, '').slice(-10);
    const cleanVillage = regFarmerVillage.trim();

    // Check duplicate in farmers list
    const existing = farmers.find((f) => {
      if (f.isArchived) return false;
      const fPhone = f.phone ? f.phone.replace(/\D/g, '').slice(-10) : '';
      if (cleanPhone && cleanPhone.length === 10 && fPhone === cleanPhone) {
        return true;
      }
      if (
        cleanVillage &&
        f.name.toLowerCase().trim() === cleanName.toLowerCase() &&
        (f.village || '').toLowerCase().trim() === cleanVillage.toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (existing) {
      setDuplicateFoundFarmer(existing);
      return;
    }

    const created = addFarmer({
      name: cleanName,
      phone: cleanPhone,
      village: cleanVillage || 'Mandi Grower Belt',
      primaryCrops: userCommodities,
      connectedMerchantIds: [merchantProfile.merchantId],
      photoUrl: regFarmerPhotoUrl.trim(),
    });

    setSelectedFarmerId(created.id);
    setIsRegistrationPanelOpen(false);
    setRegFarmerName('');
    setRegFarmerPhone('');
    setRegFarmerVillage('');
    setRegFarmerPhotoUrl('');
    setDuplicateFoundFarmer(null);
    setRegistrationSuccessMsg(`✓ Registered & Selected ${created.name} (${created.id})`);
    setTimeout(() => setRegistrationSuccessMsg(null), 3500);
  };

  // Add Inline Farmer Handler
  const handleSaveInlineFarmer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newFarmerName.trim();
    if (!trimmedName) {
      alert('Please enter farmer name');
      return;
    }
    const created = addFarmer({
      name: trimmedName,
      phone: newFarmerPhone.replace(/\D/g, '').slice(-10),
      village: newFarmerVillage.trim(),
      primaryCrops: userCommodities,
      connectedMerchantIds: [merchantProfile.merchantId],
      photoUrl: newFarmerPhotoUrl.trim(),
    });
    setSelectedFarmerId(created.id);
    setShowInlineAddFarmer(false);
    setNewFarmerName('');
    setNewFarmerPhone('');
    setNewFarmerVillage('');
    setNewFarmerPhotoUrl('');
    setActionFeedbackMsg({
      type: 'success',
      text: `Farmer saved ✓ ${created.name}`,
    });
    setTimeout(() => setActionFeedbackMsg(null), 3000);
  };

  // Add Inline Retailer Handler
  const handleSaveInlineCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCustomerName.trim();
    if (!trimmedName) {
      alert('Please enter retail customer name');
      return;
    }
    const created = addRetailer({
      name: trimmedName,
      phone: newCustomerPhone.replace(/\D/g, '').slice(-10),
      shopOrMarket: newCustomerShop.trim(),
    });
    setSelectedRetailerId(created.id);
    setShowInlineAddCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerShop('');
    setActionFeedbackMsg({
      type: 'success',
      text: `Customer saved ✓ ${created.name}`,
    });
    setTimeout(() => setActionFeedbackMsg(null), 3000);
  };

  // Search Input Keyboard Navigation Handler (Enter, Up, Down, Esc)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRetailerMode) {
      const query = farmerSearch.trim().toLowerCase();
      const filtered = farmers
        .filter((f) => {
          if (f.isArchived) return false;
          if (!query) return true;
          const nameMatch = (f.name || '').toLowerCase().includes(query);
          const villageMatch = (f.village || '').toLowerCase().includes(query);
          const phoneMatch = (f.phone || '').includes(query);
          const idMatch = (f.id || '').toLowerCase().includes(query);
          return nameMatch || villageMatch || phoneMatch || idMatch;
        })
        .sort((a, b) => {
          if (!query) {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          }
          return 0;
        });

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsFarmerDropdownOpen(true);
        if (filtered.length > 0) {
          setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsFarmerDropdownOpen(true);
        if (filtered.length > 0) {
          setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsFarmerDropdownOpen(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered.length > 0) {
          const selected = filtered[highlightedIndex] || filtered[0];
          if (selected) {
            setSelectedFarmerId(selected.id);
            setIsFarmerDropdownOpen(false);
            setFarmerSearch('');
            setFarmerFieldError(null);
          }
        } else {
          setIsFarmerModalOpen(true);
          setIsFarmerDropdownOpen(false);
        }
      }
    } else {
      const filtered = retailers.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
          (r.shopOrMarket || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
          (r.phone || '').includes(customerSearch)
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsCustomerDropdownOpen(true);
        if (filtered.length > 0) {
          setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsCustomerDropdownOpen(true);
        if (filtered.length > 0) {
          setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsCustomerDropdownOpen(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered.length > 0) {
          const selected = filtered[highlightedIndex] || filtered[0];
          if (selected) {
            setSelectedRetailerId(selected.id);
            setIsCustomerDropdownOpen(false);
            setCustomerSearch('');
          }
        } else {
          setNewCustomerName(customerSearch);
          setShowInlineAddCustomer(true);
          setIsCustomerDropdownOpen(false);
        }
      }
    }
  };

  // MAIN SAVE HANDLER (supports "Save Parchi" and "Save & Generate Form C PDF")
  const handleSaveSale = (andPrintPdf: boolean = false) => {
    // 0. Profile validation for PDF generation
    if (andPrintPdf) {
      if (!merchantProfile.shopName?.trim() || !merchantProfile.ownerName?.trim() || !merchantProfile.address?.trim()) {
        setActionFeedbackMsg({
          type: 'error',
          text: 'Please fill your shop details first',
        });
        setIsOwnerSignUpOpen(true);
        return;
      }
    }

    // 1. Validation
    if (calculatedRows.length === 0) {
      alert('Please add at least one line item.');
      setIsPdfPreparing(false);
      return;
    }

    if (calculatedRows.some((r) => !r.numQuantity || r.numQuantity <= 0 || !r.numRate || r.numRate <= 0)) {
      alert('Please enter a valid quantity (> 0) and rate (> 0) for all item rows.');
      setIsPdfPreparing(false);
      return;
    }

    if (isRetailerMode && paymentValidationError) {
      alert(paymentValidationError);
      setIsPdfPreparing(false);
      return;
    }

    setIsPdfPreparing(true);
    setPdfError(null);

    // Save custom variety names
    calculatedRows.forEach((r) => {
      if (r.resolvedVariety.trim()) {
        addCustomVarietyName(r.resolvedVariety.trim(), r.commodityCategory);
      }
    });

    if (isRetailerMode) {
      // --- RETAILER MODE SAVE ---
      let activeCustomerToUse = selectedRetailer;
      const trimmedCustomerSearch = customerSearch.trim();
      if (trimmedCustomerSearch) {
        const found = retailers.find(
          (r) =>
            r.name.toLowerCase() === trimmedCustomerSearch.toLowerCase() ||
            (r.phone && r.phone.includes(trimmedCustomerSearch))
        );
        if (found) {
          activeCustomerToUse = found;
          setSelectedRetailerId(found.id);
        } else {
          const newCreated = addRetailer({
            name: trimmedCustomerSearch,
            phone: '9876543210',
            shopOrMarket: 'Retail Market',
          });
          activeCustomerToUse = newCreated;
          setSelectedRetailerId(newCreated.id);
        }
      }

      if (!activeCustomerToUse) {
        alert('Please select or type a retail customer name.');
        setIsPdfPreparing(false);
        return;
      }

      const saleItems: RetailerSaleItem[] = calculatedRows.map((r) => ({
        id: `item-${Date.now()}-${Math.random()}`,
        commodityCategory: r.commodityCategory,
        varietyName: r.resolvedVariety,
        quantity: r.numQuantity,
        unit: r.unit,
        rate: r.numRate,
        amount: r.lineTotal,
        packagingType: r.packagingType,
        packagingCount: typeof r.boxesCount === 'number' ? r.boxesCount : parseInt(String(r.boxesCount), 10) || 0,
      }));

      // Stock Subtraction
      if (deductStock && stocks && stocks.length > 0) {
        saleItems.forEach((item) => {
          const matchingStock = stocks.find(
            (s) => s.name.toLowerCase().trim() === item.varietyName.toLowerCase().trim()
          );
          if (matchingStock) {
            const newQty = Math.max(0, matchingStock.quantityOnHand - item.quantity);
            updateStockItem(matchingStock.id, {
              quantityOnHand: newQty,
              lastUpdated: new Date().toISOString(),
            });
          }
        });
      }

      const createdSale = addRetailerSale({
        date: saleDate,
        retailerId: activeCustomerToUse.id,
        retailerName: activeCustomerToUse.name,
        retailerPhone: activeCustomerToUse.phone,
        retailerShop: activeCustomerToUse.shopOrMarket,
        items: saleItems,
        grossTotal: totalGrossAmount,
        previousDue,
        grandTotalPayable,
        amountPaid: numAmountPaid,
        balanceDue: remainingBalance,
        paymentStatus: remainingBalance <= 0 ? 'Paid' : numAmountPaid > 0 ? 'Partial' : 'Unpaid',
        paymentMode,
        notes: notes.trim() || undefined,
      });

      sounds.playScaleBeep?.();

      if (andPrintPdf) {
        setSelectedRetailerForPdf(activeCustomerToUse);
        setIsRetailerPdfOpen(true);
        setActionFeedbackMsg({
          type: 'success',
          text: `✓ Retail Parchi ${createdSale.parchiNumber} saved & PDF generated!`,
        });
      } else {
        setActionFeedbackMsg({
          type: 'success',
          text: `✓ Retail Parchi ${createdSale.parchiNumber} saved successfully for ${activeCustomerToUse.name}!`,
        });
      }

      setCustomerSearch('');
      resetForm();
      setIsPdfPreparing(false);
      setTimeout(() => setActionFeedbackMsg(null), 3000);
    } else {
      // --- WHOLESALER MODE SAVE ---
      let activeFarmerToUse = selectedFarmer;
      if (!activeFarmerToUse) {
        const general = farmers.find((f) => f.name.toLowerCase().includes('general mandi farmer')) || {
          id: 'FRM-0001',
          farmerCode: 'FRM-0001',
          name: 'General Mandi Farmer',
          village: 'Mandi Yard',
          phone: merchantProfile.phoneNumber || '9849012345',
        };
        activeFarmerToUse = general as Farmer;
      }

      const newShipment = addShipment({
        date: saleDate,
        farmerId: activeFarmerToUse.id,
        farmerName: activeFarmerToUse.name,
        farmerVillage: activeFarmerToUse.village,
        farmerPhone: activeFarmerToUse.phone,
        merchantId: merchantProfile.merchantId,
        merchantName: merchantProfile.shopName || 'Produce Mandi',
        items: calculatedRows.map((r) => ({
          id: r.id,
          commodityCategory: r.commodityCategory,
          flowerVariety: r.resolvedVariety,
          quantity: r.numQuantity,
          unit: r.unit,
          rate: r.numRate,
          grossTotal: r.lineTotal,
          boxesCount: typeof r.boxesCount === 'number' ? r.boxesCount : undefined,
          packagingType: r.packagingType,
          flowerQuality: r.flowerQuality,
        })),
        grossTotal: totalGrossAmount,
        transportCharge: numericTransport,
        hamaliCharge: numericAmmali,
        commissionPercent: numericCommissionRate,
        commissionAmount,
        netAmountAfterDailyCuts: farmerNetPayable,
        paymentStatus: 'Unpaid',
        amountPaid: 0,
        balanceDue: farmerNetPayable,
        notes: notes.trim() || undefined,
      });

      const totalQty = calculatedRows.reduce((sum, r) => sum + r.numQuantity, 0);
      const parchiLot: SaleLot = {
        id: newShipment.id,
        commodityCategory: calculatedRows[0]?.commodityCategory || 'flowers',
        parchiNumber: newShipment.shipmentNumber,
        date: newShipment.date,
        time: newShipment.time,
        farmerId: newShipment.farmerId,
        farmerName: newShipment.farmerName,
        farmerVillage: newShipment.farmerVillage,
        farmerPhone: newShipment.farmerPhone,
        flowerVariety: calculatedRows.map((r) => `${r.resolvedVariety} (${r.numQuantity} ${r.unit})`).join(', '),
        quantity: totalQty,
        unit: calculatedRows[0]?.unit || 'Kgs',
        rate: totalQty > 0 ? Math.round(totalGrossAmount / totalQty) : 0,
        grossTotal: totalGrossAmount,
        commissionPercent: numericCommissionRate,
        commissionAmount,
        transportCharges: numericTransport,
        ammaliCharges: numericAmmali,
        otherExpenditures: {
          transport: numericTransport,
          hamali: numericAmmali,
          misc: miscCommissionAmount,
          miscPercent: numericMiscRate,
        },
        totalOtherExpenditures: totalDeductions,
        farmerNetPayable,
        paymentStatus: 'Unpaid',
        amountPaid: 0,
        balanceDue: farmerNetPayable,
        notes: notes.trim() || undefined,
        shipmentId: newShipment.id,
      };

      sounds.playScaleBeep?.();

      if (andPrintPdf) {
        try {
          const formCData = buildFormCData({ lot: parchiLot, merchantProfile, farmersList: farmers });
          generateVectorParchiPdf(formCData, { autoDownload: true });
        } catch (e) {
          console.error('[Vector PDF Download Error]', e);
        }
        setWholesalerPdfLot(parchiLot);
        setIsWholesalerPdfOpen(true);
        setSelectedParchiLot(parchiLot);
        setActionFeedbackMsg({
          type: 'success',
          text: `✓ Form C Wholesaler Parchi ${newShipment.shipmentNumber} saved & PDF generated!`,
        });
      } else {
        setSelectedParchiLot(parchiLot);
        setActionFeedbackMsg({
          type: 'success',
          text: `✓ Form C Wholesaler Parchi ${newShipment.shipmentNumber} saved for ${activeFarmerToUse.name}!`,
        });
      }

      setFarmerSearch('');
      resetForm();
      setIsPdfPreparing(false);
      setTimeout(() => setActionFeedbackMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-28 sm:pb-32">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#1a3a52]" />
          <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
            {isRetailerMode ? 'Fast Retailer Sale Entry' : 'Fast Lot Entry & Mandi Parchi Generator'}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Mandi Trading Date: {formatDisplayDate(saleDate)}</span>
        </div>
      </div>

      {actionFeedbackMsg && (
        <div
          className={`p-3.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 animate-in slide-in-from-top-2 ${
            actionFeedbackMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>{actionFeedbackMsg.text}</span>
        </div>
      )}

      {/* CARD 1: SELECT FARMER OR CUSTOMER */}
      <div
        ref={farmerSectionRef}
        className={`bg-white rounded-2xl border transition-all ${
          !isRetailerMode && farmerFieldError
            ? 'border-rose-500 ring-2 ring-rose-200'
            : isRetailerMode && customerFieldError
            ? 'border-rose-500 ring-2 ring-rose-200'
            : 'border-slate-200'
        } shadow-sm p-3.5 sm:p-4 space-y-3`}
      >
        <div className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
            1. {isRetailerMode ? 'SELECT REGISTERED CUSTOMER' : 'SELECT REGISTERED FARMER'}
          </h2>

          {isRetailerMode && (
            <button
              type="button"
              onClick={() => setShowInlineAddCustomer(!showInlineAddCustomer)}
              className="text-xs font-bold text-[#1a3a52] hover:text-[#24485e] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showInlineAddCustomer ? '- Close' : '+ Add New Customer'}</span>
            </button>
          )}
        </div>

        {/* Selected Farmer Card (When selectedFarmer exists in Wholesaler Mode) */}
        {!isRetailerMode && selectedFarmer ? (
          <div className="bg-[#f0f7ff] border-2 border-[#1a3a52] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-[#1a3a52]">{selectedFarmer.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-[#1a3a52] text-white text-[10px] font-bold font-mono">
                  {selectedFarmer.id}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>📍 {selectedFarmer.village && selectedFarmer.village.trim() ? selectedFarmer.village : '—'}</span>
                <span>📱 {selectedFarmer.phone && selectedFarmer.phone.trim() ? `+91 ${selectedFarmer.phone}` : '—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Balance</span>
                <span
                  className={`text-xs font-black font-mono ${
                    selectedFarmerDues > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {selectedFarmerDues > 0
                    ? `₹${selectedFarmerDues.toLocaleString('en-IN')} Dues`
                    : '₹0.00 Balance'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-300 pl-3">
                <button
                  type="button"
                  onClick={handleRequestChangeFarmer}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-[#1a3a52] hover:bg-slate-100 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>Change</span>
                </button>
                <button
                  type="button"
                  onClick={handleRequestChangeFarmer}
                  className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition shadow-xs cursor-pointer"
                  title="Clear Farmer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : !isRetailerMode ? (
          /* Farmer Search Input Box & Dropdown (When no farmer selected) */
          <div className="space-y-2">
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Farmer Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Type farmer name, ID, phone, or village..."
                  value={farmerSearch}
                  onKeyDown={handleSearchKeyDown}
                  onChange={(e) => {
                    setHighlightedIndex(0);
                    setFarmerSearch(e.target.value);
                    setIsFarmerDropdownOpen(true);
                    setFarmerFieldError(null);
                  }}
                  onFocus={() => {
                    setHighlightedIndex(0);
                    setIsFarmerDropdownOpen(true);
                  }}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border font-bold text-xs outline-none bg-slate-50 ${
                    farmerFieldError
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/50'
                      : 'border-slate-300 focus:ring-2 focus:ring-[#1a3a52]'
                  }`}
                />
              </div>

              {farmerFieldError && (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {farmerFieldError}
                </p>
              )}

              {/* Farmer Dropdown List */}
              {isFarmerDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {(() => {
                    const query = farmerSearch.trim().toLowerCase();
                    const filtered = farmers
                      .filter((f) => {
                        if (f.isArchived) return false;
                        if (!query) return true;
                        const nameMatch = (f.name || '').toLowerCase().includes(query);
                        const villageMatch = (f.village || '').toLowerCase().includes(query);
                        const phoneMatch = (f.phone || '').includes(query);
                        const idMatch = (f.id || '').toLowerCase().includes(query);
                        return nameMatch || villageMatch || phoneMatch || idMatch;
                      })
                      .sort((a, b) => {
                        if (!query) {
                          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                          return timeB - timeA;
                        }
                        return 0;
                      });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-4 text-center">
                          <p className="text-xs text-slate-600 font-bold">
                            {farmerSearch.trim() !== '' ? (
                              <>No matching farmers found for &lsquo;<span className="text-slate-900">{farmerSearch}</span>&rsquo;</>
                            ) : (
                              <>No farmers registered yet.</>
                            )}
                          </p>
                        </div>
                      );
                    }

                    return filtered.map((f, idx) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFarmerId(f.id);
                          setIsFarmerDropdownOpen(false);
                          setFarmerSearch('');
                          setFarmerFieldError(null);
                        }}
                        className={`w-full text-left p-3 hover:bg-blue-50 flex items-center justify-between transition cursor-pointer ${
                          highlightedIndex === idx ? 'bg-blue-100 font-black' : ''
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#1a3a52]">{f.name}</span>
                            <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-600">
                              {f.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                            <span>📍 {f.village && f.village.trim() ? f.village : '—'}</span>
                            <span>•</span>
                            <span>📱 {f.phone && f.phone.trim() ? `+91 ${f.phone}` : '—'}</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#1a3a52] hover:underline">Select</span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Recent Farmers Chips (shown when search is empty) */}
            {farmerSearch === '' && recentFarmers.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Recent Farmers:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recentFarmers.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFarmerId(f.id);
                        setFarmerFieldError(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:border-blue-300 text-slate-800 font-bold text-xs border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{f.name}</span>
                      {f.village && <span className="text-[10px] text-slate-500">({f.village})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Customer Selection for Retailer Mode */}
        {isRetailerMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Customer
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer name, shop, phone..."
                  value={customerSearch}
                  onKeyDown={handleSearchKeyDown}
                  onChange={(e) => {
                    setHighlightedIndex(0);
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setHighlightedIndex(0);
                    setIsCustomerDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none bg-slate-50"
                />
              </div>

              {/* Retailer Customer Dropdown */}
              {isCustomerDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {(() => {
                    const filtered = retailers.filter(
                      (r) =>
                        (r.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
                        (r.shopOrMarket || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
                        (r.phone || '').includes(customerSearch)
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="p-3 text-center flex flex-col items-center justify-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">No customer found</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewCustomerName(customerSearch);
                              setShowInlineAddCustomer(true);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#1a3a52] hover:bg-[#24485e] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Add Customer</span>
                          </button>
                        </div>
                      );
                    }

                    return filtered.map((r, idx) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedRetailerId(r.id);
                          setIsCustomerDropdownOpen(false);
                          setCustomerSearch('');
                        }}
                        className={`w-full text-left p-2.5 hover:bg-slate-100 flex items-center justify-between transition cursor-pointer ${
                          highlightedIndex === idx
                            ? 'bg-blue-100 font-black'
                            : selectedRetailerId === r.id
                            ? 'bg-blue-50 font-bold'
                            : ''
                        }`}
                      >
                        <div>
                          <div className="text-xs font-black text-[#1a3a52]">{r.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {r.shopOrMarket && r.shopOrMarket.trim() ? r.shopOrMarket : '—'} • {r.phone && r.phone.trim() ? r.phone : '—'}
                          </div>
                        </div>
                        {selectedRetailerId === r.id && <CheckCircle2 className="w-4 h-4 text-[#1a3a52]" />}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            {selectedRetailer && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Selected Customer</span>
                  <span className="text-xs font-black text-[#1a3a52] block">{selectedRetailer.name}</span>
                  <span className="text-[11px] text-slate-600 font-medium block">
                    {selectedRetailer.shopOrMarket && selectedRetailer.shopOrMarket.trim() ? selectedRetailer.shopOrMarket : '—'} • Ph: {selectedRetailer.phone && selectedRetailer.phone.trim() ? selectedRetailer.phone : '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Old Due</span>
                  <span className={`text-xs font-black font-mono ${previousDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{previousDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD 2: GOODS & VARIETY ITEMS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1a3a52] text-white flex items-center justify-center font-black text-xs">
              2
            </div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
              2. Items
            </h2>
          </div>
        </div>

        {/* Variety Rows */}
        <div className="space-y-2.5">
          {calculatedRows.map((row, index) => {
            const config = getSafeCommodityConfig(row.commodityCategory);
            return (
              <div
                key={row.id}
                className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 sm:p-3 space-y-2 transition hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1a3a52] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#1a3a52] text-white text-[9px] flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span>Item #{index + 1}</span>
                  </span>

                  {varietyRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVarietyRow(row.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {/* Category */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Category
                    </label>
                    <select
                      value={row.commodityCategory}
                      onChange={(e) =>
                        handleRowChange(row.id, 'commodityCategory', e.target.value as CommodityCategory)
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none bg-white"
                    >
                      {userCommodities.map((cat) => (
                        <option key={cat} value={cat}>
                          {COMMODITY_CONFIGS[cat]?.icon} {COMMODITY_CONFIGS[cat]?.name || cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Variety / Item Name */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Item Name *
                    </label>
                    <CustomVarietyInput
                      category={row.commodityCategory}
                      value={row.customVariety || row.flowerVariety}
                      onChange={(val) => {
                        handleRowChange(row.id, 'flowerVariety', val);
                        handleRowChange(row.id, 'customVariety', val);
                      }}
                      placeholder="Select or enter item name..."
                    />
                  </div>

                  {/* Quality Grade */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Quality
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['Good', 'Average', 'Bad'] as FlowerQuality[]).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleRowChange(row.id, 'flowerQuality', q)}
                          className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                            row.flowerQuality === q
                              ? q === 'Good'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : q === 'Average'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {q === 'Good' ? 'Good' : q === 'Average' ? 'Avg' : 'Bad'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Packaging Count + Type (Single Row) */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Packaging &amp; Type
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Count"
                        value={row.boxesCount}
                        onChange={(e) => handleRowChange(row.id, 'boxesCount', e.target.value)}
                        className="w-1/2 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none bg-white"
                      />
                      <select
                        value={row.packagingType || 'Boxes'}
                        onChange={(e) => handleRowChange(row.id, 'packagingType', e.target.value)}
                        className="w-1/2 px-1.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none bg-white"
                      >
                        <option value="Boxes">Boxes</option>
                        <option value="Bags">Bags</option>
                        <option value="Crates">Crates</option>
                        <option value="Baskets">Baskets</option>
                        <option value="Bunches">Bunches</option>
                      </select>
                    </div>
                  </div>

                  {/* Quantity + Unit (Single Row) */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Quantity &amp; Unit *
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                        className="w-1/2 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none bg-white"
                      />
                      <select
                        value={row.unit}
                        onChange={(e) => handleRowChange(row.id, 'unit', e.target.value as WeightUnit)}
                        className="w-1/2 px-1.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none bg-white"
                      >
                        {config.allowedUnits.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Rate per Unit */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Rate per {row.unit} (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 90"
                      value={row.rate}
                      onChange={(e) => handleRowChange(row.id, 'rate', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none bg-white font-mono"
                    />
                  </div>

                  {/* Small right-aligned Item Total */}
                  <div className="flex items-end justify-end py-1">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total</span>
                      <span className="text-xs font-black font-mono text-[#1a3a52]">
                        ₹{row.lineTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ONE full-width outlined navy button placed BELOW the last item card */}
        <button
          type="button"
          onClick={handleAddVarietyRow}
          className="w-full py-2.5 rounded-xl border-2 border-[#1a3a52] text-[#1a3a52] hover:bg-blue-50 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          <Plus className="w-4 h-4 text-[#1a3a52]" />
          <span>+ Add Item</span>
        </button>
      </div>

      {/* CARD 3: CHARGES (ONLY SHOWN IN WHOLESALER MODE) */}
      {!isRetailerMode && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1a3a52] text-white flex items-center justify-center font-black text-xs">
                3
              </div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                3. Charges
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Deductions
              </span>
              <span className="text-sm font-black font-mono text-rose-700">
                ₹{totalDeductions.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Hamali (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 50"
                value={ammaliCharge}
                onChange={(e) => setAmmaliCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Transport (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={transportCharge}
                onChange={(e) => setTransportCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Mandi Comm. (%)
              </label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Misc. Comm. (%)
              </label>
              <input
                type="number"
                placeholder="e.g. 2"
                value={miscCommissionRate}
                onChange={(e) => setMiscCommissionRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#1a3a52] outline-none font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* SINGLE SUMMARY CARD FOR WHOLESALER */}
      {!isRetailerMode && (
        <div className="bg-[#f8fafc] rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-black text-[#1a3a52] uppercase tracking-wider">
              Farmer Payment Summary
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Live Summary</span>
          </div>

          <div className="space-y-1.5 text-xs font-bold">
            <div className="flex justify-between items-center text-slate-800">
              <span>Total Amount:</span>
              <span className="font-mono text-slate-900 font-black">₹{totalGrossAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-rose-700">
              <span>Total Deductions:</span>
              <span className="font-mono font-black">-₹{totalDeductions.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-800 border-t border-slate-200 pt-2 text-sm sm:text-base">
              <span>Net Farmer Payable:</span>
              <span className="font-mono font-black text-lg sm:text-2xl text-emerald-700">
                ₹{farmerNetPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CARD 4: PAYMENT SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1a3a52] text-white flex items-center justify-center font-black text-xs">
            {isRetailerMode ? 3 : 4}
          </div>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
            {isRetailerMode ? '3. Payment' : '5. Payment'}
          </h2>
        </div>

        {/* Rows for Retailer Mode */}
        {isRetailerMode && (
          <div className="space-y-2 font-bold">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs sm:text-sm">
              <div>
                <span className="block font-black">Today's Goods</span>
              </div>
              <span className="font-mono font-black text-base sm:text-lg">₹{totalGrossAmount.toLocaleString('en-IN')}</span>
            </div>

            {previousDue > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm">
                <div>
                  <span className="block font-black">Old Due</span>
                </div>
                <span className="font-mono font-black text-base sm:text-lg">₹{previousDue.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1a3a52] text-white text-sm sm:text-base font-black">
              <div>
                <span className="block">Total To Pay</span>
              </div>
              <span className="font-mono text-xl sm:text-2xl">
                ₹{grandTotalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Question: How much paid? */}
        <div className="space-y-2">
          <div>
            <span className="text-xs font-black text-slate-900 block">How much paid?</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePresetPayFull}
              className={`p-3 rounded-xl font-black text-xs sm:text-sm transition border text-center cursor-pointer ${
                numAmountPaid === payableBase && payableBase > 0
                  ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                  : 'bg-white text-[#1a3a52] border-slate-300 hover:bg-slate-50'
              }`}
            >
              Full ₹{payableBase.toLocaleString('en-IN')}
            </button>

            <button
              type="button"
              onClick={handlePresetPayHalf}
              className={`p-3 rounded-xl font-black text-xs sm:text-sm transition border text-center cursor-pointer ${
                numAmountPaid === Math.round(payableBase / 2) && numAmountPaid > 0
                  ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                  : 'bg-white text-[#1a3a52] border-slate-300 hover:bg-slate-50'
              }`}
            >
              Half ₹{Math.round(payableBase / 2).toLocaleString('en-IN')}
            </button>

            {isRetailerMode && previousDue > 0 && (
              <button
                type="button"
                onClick={handlePresetPayTodaysOnly}
                className={`p-3 rounded-xl font-black text-xs sm:text-sm transition border text-center cursor-pointer ${
                  numAmountPaid === totalGrossAmount && totalGrossAmount > 0
                    ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                    : 'bg-white text-[#1a3a52] border-slate-300 hover:bg-slate-50'
                }`}
              >
                Only Today's ₹{totalGrossAmount.toLocaleString('en-IN')}
              </button>
            )}

            <button
              type="button"
              onClick={handlePresetCustom}
              className={`p-3 rounded-xl font-black text-xs sm:text-sm transition border text-center cursor-pointer ${
                amountPaidNow !== '' &&
                numAmountPaid !== payableBase &&
                numAmountPaid !== Math.round(payableBase / 2) &&
                (!isRetailerMode || numAmountPaid !== totalGrossAmount)
                  ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Type Amount
            </button>
          </div>

          {/* Custom Amount Input */}
          <div className="pt-1">
            <input
              type="number"
              step="any"
              placeholder="Type amount paid (₹)..."
              value={amountPaidNow}
              onChange={(e) => setAmountPaidNow(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono focus:ring-2 focus:ring-[#1a3a52] outline-none"
            />
          </div>
        </div>

        {/* Big Result Box */}
        <div className="pt-1">
          {numAmountPaid < payableBase ? (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-black flex items-center justify-between">
              <div>
                <span className="block">Balance Due</span>
              </div>
              <span className="font-mono text-base sm:text-lg font-black">₹{(payableBase - numAmountPaid).toLocaleString('en-IN')}</span>
            </div>
          ) : numAmountPaid === payableBase ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>No Due ✓</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-black flex items-center justify-between">
              <div>
                <span className="block">Advance</span>
              </div>
              <span className="font-mono text-base sm:text-lg font-black">₹{(numAmountPaid - payableBase).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Question: How paid? (3 big icon buttons) */}
        <div className="space-y-2 pt-1">
          <div>
            <span className="text-xs font-black text-slate-900 block">How paid?</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMode('Cash')}
              className={`py-3 px-2 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                paymentMode === 'Cash'
                  ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span className="font-black">Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('UPI')}
              className={`py-3 px-2 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                paymentMode === 'UPI' || paymentMode === 'PhonePe' || paymentMode === 'Paytm' || paymentMode === 'Google Pay'
                  ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="font-black">UPI / PhonePe</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('Bank Transfer')}
              className={`py-3 px-2 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                paymentMode === 'Bank Transfer'
                  ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="font-black">Bank</span>
            </button>
          </div>
        </div>
      </div>

      {/* END-OF-FORM ACTION CARD: Normal white card in page flow */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 space-y-3.5 shadow-xs">
        {pdfError && (
          <div className="p-3.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-between gap-2 shadow-md">
            <span>{pdfError}</span>
            <button
              type="button"
              onClick={() => handleSaveSale(true)}
              className="px-3 py-1 bg-white text-rose-700 hover:bg-slate-100 rounded-lg text-xs font-black cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              {isRetailerMode ? 'Total Payable:' : 'Total Amount:'}
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-[#1a3a52]">
              ₹{(isRetailerMode ? grandTotalPayable : totalGrossAmount).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              {isRetailerMode ? 'Remaining Balance:' : 'Net Farmer Payable:'}
            </span>
            <span
              className={`text-base sm:text-lg font-black font-mono ${
                isRetailerMode && remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              ₹
              {(isRetailerMode
                ? Math.max(0, remainingBalance)
                : farmerNetPayable
              ).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          {/* Button 1: Save Parchi (No PDF download) */}
          <button
            type="button"
            id="save-parchi-btn"
            disabled={isPdfPreparing}
            onClick={() => handleSaveSale(false)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#24485e] text-white font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-blue-900/20 disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Save Parchi</span>
          </button>

          {/* Button 2: Save & Generate Form C PDF */}
          <button
            type="button"
            id="save-generate-pdf-btn"
            disabled={isPdfPreparing}
            onClick={() => handleSaveSale(true)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#24485e] text-white font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-blue-900/20 disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-blue-300" />
            <span>{isPdfPreparing ? 'Preparing PDF…' : 'Save & Generate Form C PDF'}</span>
          </button>
        </div>
      </div>

      {/* Retailer Previous Due Details Modal */}
      {showDueDetailsModal && selectedRetailer && isRetailerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="bg-[#1a3a52] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Previous Due Breakdown</h3>
                <p className="text-xs text-slate-300 font-medium">
                  {selectedRetailer.name} • {selectedRetailer.shopOrMarket}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDueDetailsModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                <span className="font-bold text-slate-700">Total Outstanding Previous Due:</span>
                <span className="font-mono font-black text-rose-700 text-base">
                  ₹{previousDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDueDetailsModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white font-bold text-xs cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wholesaler Form C PDF Modal */}
      {isWholesalerPdfOpen && wholesalerPdfLot && (
        <GeneratePdfModal
          isOpen={isWholesalerPdfOpen}
          onClose={() => {
            setIsWholesalerPdfOpen(false);
            setWholesalerPdfLot(null);
          }}
          lot={wholesalerPdfLot}
        />
      )}

      {/* Retailer Form C PDF Modal */}
      {isRetailerPdfOpen && selectedRetailerForPdf && (
        <RetailerPdfModal
          isOpen={isRetailerPdfOpen}
          onClose={() => {
            setIsRetailerPdfOpen(false);
            setSelectedRetailerForPdf(null);
          }}
          retailer={selectedRetailerForPdf}
          dateRangeLabel="New Retail Parchi Statement"
        />
      )}

      {/* New Farmer Registration Modal */}
      <NewFarmerRegistrationModal
        isOpen={isFarmerModalOpen}
        onClose={() => setIsFarmerModalOpen(false)}
        initialNameQuery={farmerSearch}
        onFarmerSaved={(savedFarmer) => {
          setSelectedFarmerId(savedFarmer.id);
          setFarmerSearch('');
          setIsFarmerDropdownOpen(false);
          setFarmerFieldError(null);
          setActionFeedbackMsg({
            type: 'success',
            text: `✓ Registered & Selected ${savedFarmer.name} (${savedFarmer.id})`,
          });
          setTimeout(() => setActionFeedbackMsg(null), 4000);
        }}
      />

      {/* Change Farmer Confirmation Modal */}
      {isChangeFarmerConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Change farmer?</h3>
              <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                Change farmer? Item entries will stay the same.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsChangeFarmerConfirmOpen(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-extrabold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearFarmerSelection}
                className="py-2.5 px-3 rounded-xl bg-[#1a3a52] hover:bg-[#24485e] text-white font-black text-xs transition cursor-pointer shadow-xs"
              >
                Change Farmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

