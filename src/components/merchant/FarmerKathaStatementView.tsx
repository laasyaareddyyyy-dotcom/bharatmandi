import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Calendar,
  User,
  Phone,
  MapPin,
  Printer,
  Share2,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Receipt,
  Layers,
  ArrowDown,
  Sparkles,
  Store,
  ChevronRight,
  Trash2,
  Loader2,
  FileText,
  Sliders,
  Check,
  Filter,
  ArrowLeft,
  X,
  Eye,
  Link2,
  Link2Off,
  Send,
  Clock,
  ShieldCheck,
  Plus,
  Edit3,
  Users,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { SaleLot, Farmer } from '../../types';
import { formatDisplayDate, formatDateDMY, getTodayDateString, getPastDateString } from '../../data/initialData';
import {
  exportElementToPdf,
  sharePdfFile,
  acquireGlobalShareLock,
  releaseGlobalShareLock,
} from '../../utils/pdfExport';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { FormCInvoiceCanvas, FormCInvoiceData } from '../common/FormCInvoiceCanvas';
import { GeneratePdfModal } from '../common/GeneratePdfModal';
import { validateIndianMobile } from '../../utils/phoneValidation';
import { sounds } from '../../utils/audio';

interface FarmerKathaStatementViewProps {
  initialFarmer?: Farmer | null;
  onSelectParchiLot?: (lot: SaleLot) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const FarmerKathaStatementView: React.FC<FarmerKathaStatementViewProps> = ({
  initialFarmer,
  onSelectParchiLot,
  onClose,
  isModal = false,
}) => {
  const {
    lots,
    farmers,
    updateFarmer,
    merchantProfile,
    setSelectedParchiLot,
    openPdfModalForLot,
    deleteSaleLot,
    deleteFarmer,
    addSaleLot,
    getConnectionStatus,
    disconnectFarmerAndMerchant,
    sendConnectionRequest,
    acceptConnectionRequest,
    declineConnectionRequest,
    syncStatementToFarmer,
    connectionRequests,
    activeCommodityFilter,
    language,
    t,
  } = useMandi();

  const todayStr = getTodayDateString();

  // Top view mode: Single Farmer Statement vs All Farmers Date Range Overview
  const [viewMode, setViewMode] = useState<'single_farmer' | 'all_farmers_overview'>('single_farmer');

  // Search state for single farmer
  const [searchNameQuery, setSearchNameQuery] = useState<string>(initialFarmer ? initialFarmer.name : '');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(
    initialFarmer ? initialFarmer.id : farmers[0]?.id || ''
  );

  // Search state for Overview tab
  const [overviewSearchQuery, setOverviewSearchQuery] = useState<string>('');

  // Edit Farmer Details Modal State
  const [isEditFarmerModalOpen, setIsEditFarmerModalOpen] = useState(false);
  const [editFarmerName, setEditFarmerName] = useState('');
  const [editFarmerPhone, setEditFarmerPhone] = useState('');
  const [editFarmerVillage, setEditFarmerVillage] = useState('');
  const [editFarmerPhotoUrl, setEditFarmerPhotoUrl] = useState('');
  const [editFarmerCrops, setEditFarmerCrops] = useState<string[]>([]);
  const [editFarmerError, setEditFarmerError] = useState<string | null>(null);

  useEffect(() => {
    if (initialFarmer) {
      setSelectedFarmerId(initialFarmer.id);
      setSearchNameQuery(initialFarmer.name);
    }
  }, [initialFarmer]);

  // Date filters: Start Date and End Date - DEFAULT TO "All Time" (empty strings)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCustomDatePickers, setShowCustomDatePickers] = useState<boolean>(false);

  const [isCustomFormCModalOpen, setIsCustomFormCModalOpen] = useState(false);

  // Notification state
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState('');
  const formCPdfRef = useRef<HTMLDivElement>(null);

  // Delete Consignment Lot State
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    lot: SaleLot | null;
  }>({
    isOpen: false,
    lot: null,
  });

  // Delete Farmer State
  const [deleteFarmerModalConfig, setDeleteFarmerModalConfig] = useState<{
    isOpen: boolean;
    farmer: Farmer | null;
  }>({
    isOpen: false,
    farmer: null,
  });

  const handleDeleteLotClick = (lot: SaleLot) => {
    setDeleteModalConfig({
      isOpen: true,
      lot,
    });
  };

  const handleConfirmDeleteLot = () => {
    if (deleteModalConfig.lot) {
      const pNum = deleteModalConfig.lot.parchiNumber;
      deleteSaleLot(deleteModalConfig.lot.id);
      sounds.playTrashSound?.();
      setNotificationMsg(`✓ Consignment record ${pNum} deleted successfully.`);
      setTimeout(() => setNotificationMsg(null), 3500);
    }
    setDeleteModalConfig({ isOpen: false, lot: null });
  };

  const handleDeleteFarmerClick = (farmer: Farmer) => {
    setDeleteFarmerModalConfig({
      isOpen: true,
      farmer,
    });
  };

  const handleConfirmDeleteFarmer = () => {
    if (deleteFarmerModalConfig.farmer) {
      const targetName = deleteFarmerModalConfig.farmer.name;
      const targetId = deleteFarmerModalConfig.farmer.id;
      deleteFarmer(targetId);
      sounds.playTrashSound?.();
      setNotificationMsg(`✓ Farmer ${targetName} and all linked records deleted permanently.`);
      setTimeout(() => setNotificationMsg(null), 4500);

      const remaining = farmers.filter((f) => f.id !== targetId);
      if (remaining.length > 0) {
        setSelectedFarmerId(remaining[0].id);
        setSearchNameQuery(remaining[0].name);
      } else {
        setSelectedFarmerId('');
        setSearchNameQuery('');
      }
    }
    setDeleteFarmerModalConfig({ isOpen: false, farmer: null });
  };

  const handleOpenEditFarmerModal = () => {
    if (!currentFarmer) return;
    setEditFarmerName(currentFarmer.name);
    setEditFarmerPhone(currentFarmer.phone || '');
    setEditFarmerVillage(currentFarmer.village || '');
    setEditFarmerPhotoUrl(currentFarmer.photoUrl || '');
    setEditFarmerCrops(Array.isArray(currentFarmer.primaryCrops) ? currentFarmer.primaryCrops : ['Flowers']);
    setEditFarmerError(null);
    setIsEditFarmerModalOpen(true);
  };

  const handleSaveEditedFarmer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFarmer) return;
    setEditFarmerError(null);

    const trimmedName = editFarmerName.replace(/[0-9]/g, '').trim();
    if (!trimmedName) {
      setEditFarmerError('Please enter a valid farmer name');
      return;
    }

    const phoneVal = validateIndianMobile(editFarmerPhone);
    if (!phoneVal.isValid) {
      setEditFarmerError(phoneVal.error || 'Enter a valid 10-digit Indian mobile number');
      return;
    }
    const cleanPhone = phoneVal.cleanNumber;

    updateFarmer(currentFarmer.id, {
      name: trimmedName,
      phone: cleanPhone,
      village: editFarmerVillage.trim() || 'Local Grower Belt',
      primaryCrops: editFarmerCrops.length > 0 ? editFarmerCrops : ['Flowers'],
      photoUrl: editFarmerPhotoUrl.trim() || '',
    });

    sounds.success?.();
    setNotificationMsg(`✓ Farmer details updated for ${trimmedName}!`);
    setTimeout(() => setNotificationMsg(null), 3500);
    setIsEditFarmerModalOpen(false);
  };

  // Active farmer resolution
  const currentFarmer = useMemo(() => {
    return farmers.find((f) => f.id === selectedFarmerId) || initialFarmer || farmers[0] || null;
  }, [farmers, selectedFarmerId, initialFarmer]);

  const cleanFarmerPhone = useMemo(() => {
    return currentFarmer?.phone ? currentFarmer.phone.replace(/\D/g, '').slice(-10) : '';
  }, [currentFarmer]);

  // Connection Status with current farmer
  const connectionStatus = useMemo(() => {
    if (!cleanFarmerPhone || !merchantProfile.merchantId) return 'not_connected';
    return getConnectionStatus(cleanFarmerPhone, merchantProfile.merchantId);
  }, [cleanFarmerPhone, merchantProfile.merchantId, getConnectionStatus]);

  const currentConnRequest = useMemo(() => {
    if (!cleanFarmerPhone) return null;
    const cleanMerchantPhone = (merchantProfile.phoneNumber || '').replace(/\D/g, '').slice(-10);
    return connectionRequests.find(
      (r) =>
        r.farmerPhone.replace(/\D/g, '').slice(-10) === cleanFarmerPhone &&
        (r.merchantId === merchantProfile.merchantId ||
          (r.merchantPhone && r.merchantPhone.replace(/\D/g, '').slice(-10) === cleanMerchantPhone))
    );
  }, [connectionRequests, cleanFarmerPhone, merchantProfile]);

  // Connection Request Handlers
  const handleSendConnectRequestToFarmer = () => {
    if (!currentFarmer || !cleanFarmerPhone) return;
    sendConnectionRequest({
      senderRole: 'merchant',
      merchantId: merchantProfile.merchantId,
      merchantName: merchantProfile.shopName || 'Mandi Commission Agent',
      merchantPhone: merchantProfile.phoneNumber || '',
      merchantOwnerName: merchantProfile.ownerName || '',
      farmerId: currentFarmer.id,
      farmerName: currentFarmer.name,
      farmerPhone: cleanFarmerPhone,
      farmerVillage: currentFarmer.village,
    });
    setNotificationMsg(`✓ Connection invitation sent to ${currentFarmer.name}!`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleAcceptFarmerRequest = () => {
    if (!currentConnRequest) return;
    acceptConnectionRequest(currentConnRequest.id);
    setNotificationMsg(`✓ Mutual connection active with ${currentFarmer?.name}!`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleDeclineFarmerRequest = () => {
    if (!currentConnRequest) return;
    declineConnectionRequest(currentConnRequest.id);
    setNotificationMsg('Connection request declined.');
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleDisconnectFarmer = () => {
    if (!currentFarmer || !cleanFarmerPhone) return;
    sounds.playTrashSound?.();
    disconnectFarmerAndMerchant(cleanFarmerPhone, merchantProfile.merchantId);
    setNotificationMsg(`Disconnected from ${currentFarmer.name}.`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  // Filtered farmers list for search autocomplete
  const matchedFarmers = useMemo(() => {
    const q = searchNameQuery.toLowerCase().trim();
    if (!q) return farmers;
    return farmers.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.village.toLowerCase().includes(q) ||
        f.phone.includes(q)
    );
  }, [farmers, searchNameQuery]);

  // All lots for this specific farmer, deduplicated by unique ID and sorted oldest first
  const farmerAllLots = useMemo(() => {
    if (!currentFarmer) return [];
    const cleanPhone = currentFarmer.phone ? currentFarmer.phone.replace(/\D/g, '').slice(-10) : '';
    const matched = lots.filter((l) => {
      if (activeCommodityFilter !== 'all') {
        const lotCat = l.commodityCategory || 'flowers';
        if (lotCat !== activeCommodityFilter) return false;
      }
      const lotPhone = l.farmerPhone ? l.farmerPhone.replace(/\D/g, '').slice(-10) : '';
      return (
        l.farmerId === currentFarmer.id ||
        (cleanPhone && lotPhone === cleanPhone) ||
        (l.farmerName && l.farmerName.trim().toLowerCase() === currentFarmer.name.trim().toLowerCase())
      );
    });

    const uniqueMap = new Map<string, SaleLot>();
    matched.forEach((item) => {
      if (item.id && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  }, [lots, currentFarmer, activeCommodityFilter]);

  // Opening Balance calculation for custom date range (records before startDate)
  const openingBalance = useMemo(() => {
    if (!startDate) return 0;
    const priorLots = farmerAllLots.filter((lot) => lot.date && lot.date < startDate);
    return priorLots.reduce((acc, lot) => acc + (lot.balanceDue || 0), 0);
  }, [farmerAllLots, startDate]);

  // Filter lots according to date range [startDate, endDate]
  const dateFilteredLots = useMemo(() => {
    if (!startDate && !endDate) return farmerAllLots;
    return farmerAllLots.filter((lot) => {
      if (!lot.date) return false;
      if (startDate && endDate) {
        return lot.date >= startDate && lot.date <= endDate;
      }
      if (startDate) return lot.date >= startDate;
      if (endDate) return lot.date <= endDate;
      return true;
    });
  }, [farmerAllLots, startDate, endDate]);

  // Checkbox Selection for Multi-Parchi Form C combining
  const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set());

  // Auto-select all date-filtered lots when date range or farmer changes
  useEffect(() => {
    setSelectedLotIds(new Set(dateFilteredLots.map((l) => l.id)));
  }, [dateFilteredLots]);

  const toggleSelectLot = (id: string) => {
    setSelectedLotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllLots = () => {
    if (selectedLotIds.size === dateFilteredLots.length) {
      setSelectedLotIds(new Set());
    } else {
      setSelectedLotIds(new Set(dateFilteredLots.map((l) => l.id)));
    }
  };

  // Selected lots array
  const selectedLots = useMemo(() => {
    return dateFilteredLots.filter((l) => selectedLotIds.has(l.id));
  }, [dateFilteredLots, selectedLotIds]);

  // Is Single Day Mode?
  const isSingleDay = Boolean(startDate && endDate && startDate === endDate);

  // Calculations for Katha Statement Waterfall based on SELECTED lots
  const statementMetrics = useMemo(() => {
    const lotsCount = selectedLots.length;
    const totalVolume = selectedLots.reduce((acc, l) => acc + (l.quantity || 0), 0);
    const totalBoxes = selectedLots.reduce((acc, l) => acc + (l.boxesCount || 0), 0);
    const grossTotal = selectedLots.reduce((acc, l) => acc + (l.grossTotal || 0), 0);
    const commissionAmount = selectedLots.reduce((acc, l) => acc + (l.commissionAmount || 0), 0);

    const hamaliAmount = selectedLots.reduce(
      (acc, l) => acc + (l.ammaliCharges || l.otherExpenditures?.hamali || 0),
      0
    );

    const transportAmount = selectedLots.reduce(
      (acc, l) => acc + (l.transportCharges || l.otherExpenditures?.transport || 0),
      0
    );

    const miscAmount = selectedLots.reduce(
      (acc, l) => acc + (l.otherExpenditures?.misc || 0),
      0
    );

    const totalDeductions = hamaliAmount + transportAmount + commissionAmount + miscAmount;
    const farmerNetMoney = Math.max(0, grossTotal - totalDeductions);
    const amountPaid = selectedLots.reduce((acc, l) => acc + (l.amountPaid || 0), 0);
    const balanceDue = Math.max(0, farmerNetMoney - amountPaid);

    return {
      lotsCount,
      totalVolume,
      totalBoxes,
      grossTotal,
      commissionAmount,
      hamaliAmount,
      transportAmount,
      miscAmount,
      totalDeductions,
      farmerNetMoney,
      amountPaid,
      balanceDue,
    };
  }, [selectedLots]);

  // Quick date shortcuts
  const handleSetQuickDate = (type: 'all' | 'today' | 'last7' | 'thisMonth' | 'yesterday') => {
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'yesterday') {
      const y = getPastDateString(1);
      setStartDate(y);
      setEndDate(y);
    } else if (type === 'last7') {
      setStartDate(getPastDateString(7));
      setEndDate(todayStr);
    } else if (type === 'thisMonth') {
      const monthStart = `${todayStr.slice(0, 7)}-01`;
      setStartDate(monthStart);
      setEndDate(todayStr);
    }
  };

  // Prepared Data for Combined Single PDF / Form C Canvas based on SELECTED lots
  const kathaFormCData = useMemo<FormCInvoiceData | null>(() => {
    if (!currentFarmer) return null;

    const isCombined = selectedLots.length > 1 || !isSingleDay;

    const itemRows = selectedLots.map((l) => {
      const hamali = l.ammaliCharges || l.otherExpenditures?.hamali || 0;
      const trans = l.transportCharges || l.otherExpenditures?.transport || 0;
      const comm = l.commissionAmount || 0;
      const misc = l.otherExpenditures?.misc || 0;

      return {
        id: l.id,
        parchiNumber: l.parchiNumber,
        date: l.date,
        flowerVariety: l.flowerVariety,
        flowerQuality: l.flowerQuality || 'Good',
        quantity: l.quantity,
        unit: l.unit || 'Kgs',
        boxesCount: l.boxesCount,
        packagingType: l.packagingType || (l.boxesCount ? 'Boxes' : 'Direct arrival'),
        rate: l.rate,
        grossTotal: l.grossTotal,
        hamali,
        transport: trans,
        commission: comm,
        misc,
        farmerNetPayable: l.farmerNetPayable,
      };
    });

    const finalItems = itemRows.length > 0 ? itemRows : [
      {
        id: 'placeholder',
        parchiNumber: '—',
        date: startDate || todayStr,
        flowerVariety: 'No Selected Consignments',
        flowerQuality: 'Good',
        quantity: 0,
        unit: 'Kgs',
        boxesCount: 0,
        packagingType: 'Direct arrival',
        rate: 0,
        grossTotal: 0,
        hamali: 0,
        transport: 0,
        commission: 0,
        misc: 0,
        farmerNetPayable: 0,
      },
    ];

    const parchiNo = isSingleDay && selectedLots[0]
      ? selectedLots[0].parchiNumber
      : `FC-KATHA-${(currentFarmer.name || 'FARMER').slice(0, 3).toUpperCase()}-${(startDate || 'ALL').replace(/-/g, '')}`;

    const dateRangeLabel = !startDate && !endDate
      ? 'All Time Records'
      : isSingleDay
      ? `Date: ${startDate}`
      : `Period: ${startDate || 'Start'} to ${endDate || 'Latest'}`;

    return {
      parchiNumber: parchiNo,
      date: isSingleDay ? startDate : dateRangeLabel,
      time: isSingleDay && selectedLots[0]?.time ? selectedLots[0].time : 'Combined Statement',
      farmerName: currentFarmer.name,
      farmerVillage: currentFarmer.village || 'Market Yard',
      farmerPhone: currentFarmer.phone,
      farmerPhotoUrl: currentFarmer.photoUrl,
      isCombinedStatement: isCombined,
      dateRangeLabel,
      items: finalItems,
      grossTotal: statementMetrics.grossTotal,
      transportCharges: statementMetrics.transportAmount,
      ammaliCharges: statementMetrics.hamaliAmount,
      commissionPercent: statementMetrics.grossTotal > 0
        ? Math.round((statementMetrics.commissionAmount / statementMetrics.grossTotal) * 100)
        : (merchantProfile.defaultCommissionRate || 0),
      commissionAmount: statementMetrics.commissionAmount,
      miscCommissionMode: 'fixed',
      miscCommissionAmount: statementMetrics.miscAmount,
      farmerNetPayable: statementMetrics.farmerNetMoney,
      amountPaid: statementMetrics.amountPaid,
      balanceDue: statementMetrics.balanceDue,
      openingBalance: openingBalance,
      paymentMode: 'Cash / Direct Mandi Settlement',
      paymentStatus: statementMetrics.balanceDue === 0 && statementMetrics.grossTotal > 0
        ? 'SETTLED'
        : statementMetrics.amountPaid > 0
        ? 'PARTIAL'
        : 'PENDING',
    };
  }, [currentFarmer, selectedLots, isSingleDay, startDate, endDate, statementMetrics, merchantProfile, todayStr, openingBalance]);

  // Download Form C Combined PDF
  const handleDownloadKathaPdf = async () => {
    const targetEl = formCPdfRef.current;
    if (!targetEl || !currentFarmer) return;
    setIsGeneratingPdf(true);
    setPdfStatusMessage('Preparing PDF…');
    try {
      const cleanName = currentFarmer.name.replace(/[^a-zA-Z0-9]/g, '_');
      const periodTag = !startDate && !endDate ? 'AllTime' : (startDate || 'All');
      const filename = `BharatMandi_Statement_${cleanName}_${periodTag}.pdf`;
      const result = await exportElementToPdf(targetEl, {
        filename,
        format: 'a4',
        orientation: 'portrait',
        marginMm: 6,
        scale: 2,
        fitToPage: false,
        autoDownload: true,
      });
      if (result.success) {
        setPdfStatusMessage('✓ Combined Form C Statement PDF downloaded successfully!');
      } else {
        setPdfStatusMessage(`PDF could not be created: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('[Katha PDF Error]', err);
      setPdfStatusMessage(`PDF could not be created: ${err?.message || 'Error generating Statement PDF'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const [isSharingPdf, setIsSharingPdf] = useState<boolean>(false);

  // WhatsApp Share Statement
  const handleShareWhatsApp = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentFarmer || isSharingPdf) return;

    if (!acquireGlobalShareLock()) {
      return;
    }

    setIsSharingPdf(true);
    setPdfStatusMessage('Rendering Combined Statement PDF for sharing...');

    try {
      const targetEl = formCPdfRef.current;
      if (!targetEl) {
        throw new Error('Please select a farmer and view their statement before sharing.');
      }

      const cleanName = currentFarmer.name.replace(/[^a-zA-Z0-9]/g, '_');
      const periodTag = !startDate && !endDate ? 'AllTime' : (startDate || 'All');
      const filename = `BharatMandi_Statement_${cleanName}_${periodTag}.pdf`;

      const result = await exportElementToPdf(targetEl, {
        filename,
        title: `Farmer Statement - ${currentFarmer.name}`,
        format: 'a4',
        orientation: 'portrait',
        marginMm: 6,
        scale: 2,
        fitToPage: false,
        autoDownload: false,
      });

      if (!result.success || !result.blob) {
        throw new Error(result.error || 'Failed to render statement PDF');
      }

      const shareRes = await sharePdfFile({
        blob: result.blob,
        filename,
        title: `Farmer Khata Statement - ${currentFarmer.name}`,
        fallbackToDownload: true,
      });

      if (shareRes.shared) {
        setPdfStatusMessage('Statement PDF shared successfully!');
      } else if (shareRes.downloaded) {
        setPdfStatusMessage('PDF downloaded so you can attach it in WhatsApp.');
      }
    } catch (err: any) {
      console.error('[Katha Share Error]', err);
      setPdfStatusMessage('Could not share PDF. Please use Download PDF button.');
    } finally {
      setIsSharingPdf(false);
      releaseGlobalShareLock(2500);
      setTimeout(() => setPdfStatusMessage(''), 6000);
    }
  };

  // Export CSV Statement for current farmer
  const handleExportCSV = () => {
    if (!currentFarmer) {
      setNotificationMsg('Please select a farmer to export statement.');
      return;
    }

    if (selectedLots.length === 0) {
      setNotificationMsg('No consignment transactions selected to export.');
      return;
    }

    const escapeVal = (v: any) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headerMetadata = [
      ['PHOOLMITRA FLOWER MANDI LEDGER - FARMER KHATA STATEMENT'],
      ['Shop Name', escapeVal(merchantProfile.shopName || 'Wholesale Flower Mandi')],
      ['Market License / Market', escapeVal(merchantProfile.licenseNumber || merchantProfile.marketYardName || 'MND-GDR-2026')],
      ['Farmer Name', escapeVal(currentFarmer.name)],
      ['Farmer Village', escapeVal(currentFarmer.village || 'N/A')],
      ['Farmer Phone', escapeVal(currentFarmer.phone || 'N/A')],
      ['Statement Period', escapeVal(`${startDate || 'All Time'} to ${endDate || 'Latest'}`)],
      ['Generated On', escapeVal(new Date().toLocaleString('en-IN'))],
      [],
    ];

    const columnHeaders = [
      'Parchi Number',
      'Date',
      'Flower Variety',
      'Quality',
      'No. of Boxes',
      'Quantity',
      'Unit',
      'Rate per Unit (INR)',
      'Gross Amount (INR)',
      'Hamali / Ammali (INR)',
      'Transport / Freight (INR)',
      'Mandi Commission (INR)',
      'Misc Charges (INR)',
      'Total Deductions (INR)',
      "Farmer's Net Payable (INR)",
      'Amount Paid (INR)',
      'Balance Due (INR)',
      'Payment Status',
    ];

    const rows = selectedLots.map((l) => {
      const gross = Number(l.grossTotal) || 0;
      const comm = Number(l.commissionAmount) || 0;
      const hamali = Number(l.ammaliCharges || l.otherExpenditures?.hamali) || 0;
      const trans = Number(l.transportCharges || l.otherExpenditures?.transport) || 0;
      const misc = Number(l.otherExpenditures?.misc) || 0;
      const totalDed = comm + hamali + trans + misc;
      const net = Number(l.farmerNetPayable) || 0;
      const paid = Number(l.amountPaid) || 0;
      const due = Number(l.balanceDue) || 0;

      return [
        escapeVal(l.parchiNumber),
        escapeVal(l.date),
        escapeVal(l.flowerVariety),
        escapeVal(l.flowerQuality || 'Good'),
        l.boxesCount || 0,
        l.quantity,
        escapeVal(l.unit || 'Kgs'),
        l.rate.toFixed(2),
        gross.toFixed(2),
        hamali.toFixed(2),
        trans.toFixed(2),
        comm.toFixed(2),
        misc.toFixed(2),
        totalDed.toFixed(2),
        net.toFixed(2),
        paid.toFixed(2),
        due.toFixed(2),
        escapeVal(l.paymentStatus || 'pending'),
      ];
    });

    const totalsRow = [
      escapeVal('TOTALS / SUMMARY'),
      escapeVal(`${selectedLots.length} Lots Selected`),
      '""',
      '""',
      statementMetrics.totalBoxes,
      statementMetrics.totalVolume,
      escapeVal('Kgs/Units'),
      '""',
      statementMetrics.grossTotal.toFixed(2),
      statementMetrics.hamaliAmount.toFixed(2),
      statementMetrics.transportAmount.toFixed(2),
      statementMetrics.commissionAmount.toFixed(2),
      statementMetrics.miscAmount.toFixed(2),
      statementMetrics.totalDeductions.toFixed(2),
      statementMetrics.farmerNetMoney.toFixed(2),
      statementMetrics.amountPaid.toFixed(2),
      statementMetrics.balanceDue.toFixed(2),
      '""',
    ];

    const allLines = [
      ...headerMetadata.map((line) => line.join(',')),
      columnHeaders.join(','),
      ...rows.map((r) => r.join(',')),
      totalsRow.join(','),
    ];

    const csvString = allLines.join('\r\n');
    const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const sanitizedFarmerName = (currentFarmer.name || 'Farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const startStr = startDate ? startDate : 'AllTime';
    const endStr = endDate ? endDate : 'Latest';
    link.setAttribute('download', `Farmer_Statement_${sanitizedFarmerName}_${startStr}_to_${endStr}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotificationMsg(`✓ Exported ${selectedLots.length} selected transaction records to CSV!`);
    sounds.playCashChime?.();
  };

  // ALL FARMERS DATE RANGE OVERVIEW DATA
  const overviewFilteredLots = useMemo(() => {
    return lots.filter((lot) => {
      if (activeCommodityFilter !== 'all') {
        if ((lot.commodityCategory || 'flowers') !== activeCommodityFilter) return false;
      }
      if (startDate && endDate) {
        if (!lot.date || lot.date < startDate || lot.date > endDate) return false;
      } else if (startDate) {
        if (!lot.date || lot.date < startDate) return false;
      } else if (endDate) {
        if (!lot.date || lot.date > endDate) return false;
      }

      if (overviewSearchQuery.trim()) {
        const q = overviewSearchQuery.toLowerCase().trim();
        const fName = (lot.farmerName || '').toLowerCase();
        const fVillage = (lot.farmerVillage || '').toLowerCase();
        const fPhone = (lot.farmerPhone || '').toLowerCase();
        const pNum = (lot.parchiNumber || '').toLowerCase();
        const variety = (lot.flowerVariety || '').toLowerCase();

        return (
          fName.includes(q) ||
          fVillage.includes(q) ||
          fPhone.includes(q) ||
          pNum.includes(q) ||
          variety.includes(q)
        );
      }

      return true;
    }).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [lots, startDate, endDate, overviewSearchQuery, activeCommodityFilter]);

  // Overview metrics
  const overviewMetrics = useMemo(() => {
    const totalCount = overviewFilteredLots.length;
    const totalVolume = overviewFilteredLots.reduce((acc, l) => acc + (l.quantity || 0), 0);
    const grossTotal = overviewFilteredLots.reduce((acc, l) => acc + (l.grossTotal || 0), 0);
    const hamali = overviewFilteredLots.reduce((acc, l) => acc + (l.ammaliCharges || l.otherExpenditures?.hamali || 0), 0);
    const transport = overviewFilteredLots.reduce((acc, l) => acc + (l.transportCharges || l.otherExpenditures?.transport || 0), 0);
    const commission = overviewFilteredLots.reduce((acc, l) => acc + (l.commissionAmount || 0), 0);
    const totalDeductions = hamali + transport + commission;
    const farmerNetTotal = overviewFilteredLots.reduce((acc, l) => acc + (l.farmerNetPayable || 0), 0);
    const uniqueFarmers = new Set(overviewFilteredLots.map((l) => l.farmerId || l.farmerName)).size;

    return {
      totalCount,
      totalVolume,
      grossTotal,
      hamali,
      transport,
      commission,
      totalDeductions,
      farmerNetTotal,
      uniqueFarmers,
    };
  }, [overviewFilteredLots]);

  // Export Overview CSV
  const handleExportOverviewCSV = () => {
    if (overviewFilteredLots.length === 0) {
      alert('No records to export in Date Range Overview');
      return;
    }

    const headers = [
      'Date',
      'Parchi #',
      'Farmer Name',
      'Village',
      'Phone',
      'Variety',
      'Quantity',
      'Unit',
      'Rate',
      'Gross Total (₹)',
      'Hamali (₹)',
      'Transport (₹)',
      'Commission (₹)',
      'Farmer Net (₹)',
    ];

    const rows = overviewFilteredLots.map((l) => [
      l.date,
      l.parchiNumber,
      `"${l.farmerName}"`,
      `"${l.farmerVillage}"`,
      l.farmerPhone,
      `"${l.flowerVariety}"`,
      l.quantity,
      l.unit,
      l.rate,
      l.grossTotal,
      l.ammaliCharges || 0,
      l.transportCharges || 0,
      l.commissionAmount || 0,
      l.farmerNetPayable,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BharatMandi_Date_Range_Overview_${startDate || 'All'}_to_${endDate || 'Latest'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28 sm:pb-32">
      {/* Modal Top Navigation Header Bar */}
      {isModal && onClose && (
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#1a3a52] text-white rounded-2xl shadow-sm">
          <button
            type="button"
            id="katha-modal-back-btn"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-xs sm:text-sm font-bold transition min-touch-target cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'te' ? 'వెనుకకు' : language === 'hi' ? 'पीछे' : 'Back'}</span>
          </button>
          <div className="text-center">
            <h2 className="text-sm sm:text-base font-black">
              {currentFarmer ? `${currentFarmer.name} • Khata Statement` : 'Farmer Khata Statement'}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-300">Official Form C Mandi Ledger & Combined PDF</p>
          </div>
          <button
            type="button"
            id="katha-modal-close-btn"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition min-touch-target cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {notificationMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{notificationMsg}</span>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-white/80 hover:text-white text-xs uppercase px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {viewMode === 'all_farmers_overview' ? (
        /* MODE B: ALL FARMERS DATE RANGE OVERVIEW */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header & Date Pickers */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1a3a52]" />
                  <span>Consignment Date Range Overview</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Filter and view parchis across all farmers for any date range with totals &amp; CSV export.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportOverviewCSV}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>Export Overview CSV</span>
              </button>
            </div>

            {/* Date Pickers and Quick Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">From Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-[#1a3a52]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">To Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-[#1a3a52]"
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <label className="font-bold text-slate-700 block">Quick Filters:</label>
                <div className="flex bg-slate-100 p-1 rounded-xl font-bold gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate('all')}
                    className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                      !startDate && !endDate ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate('today')}
                    className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                      startDate === todayStr && endDate === todayStr ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate('last7')}
                    className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                      startDate && endDate && startDate !== todayStr ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate('thisMonth')}
                    className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                      startDate && !endDate ? 'bg-[#1a3a52] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative pt-1">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by farmer name, village, phone, parchi # or variety..."
                value={overviewSearchQuery}
                onChange={(e) => setOverviewSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#1a3a52] text-xs font-semibold text-slate-900 outline-none"
              />
            </div>
          </div>

          {/* Overview Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Parchis</span>
              <p className="text-xl font-black text-slate-900 font-mono">{overviewMetrics.totalCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">{overviewMetrics.uniqueFarmers} Farmers</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Volume</span>
              <p className="text-xl font-black text-[#1a3a52] font-mono">{overviewMetrics.totalVolume} units</p>
              <p className="text-[10px] text-slate-500 font-medium">Recorded Quantity</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Gross Goods Value</span>
              <p className="text-xl font-black text-slate-900 font-mono">₹{overviewMetrics.grossTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 font-medium">Before Deductions</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Farmer Net Payable</span>
              <p className="text-xl font-black text-emerald-800 font-mono">₹{overviewMetrics.farmerNetTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-700 font-bold">After Hamali &amp; Commission</p>
            </div>
          </div>

          {/* Overview Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1a3a52] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Parchi #</th>
                    <th className="p-3">Farmer &amp; Village</th>
                    <th className="p-3">Variety</th>
                    <th className="p-3 text-right">Qty &amp; Rate</th>
                    <th className="p-3 text-right">Gross Total (₹)</th>
                    <th className="p-3 text-right">Deductions (₹)</th>
                    <th className="p-3 text-right">Farmer Net (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {overviewFilteredLots.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No parchis found for the selected date range and search criteria.
                      </td>
                    </tr>
                  ) : (
                    overviewFilteredLots.map((lot) => {
                      const deductions = (lot.ammaliCharges || 0) + (lot.transportCharges || 0) + (lot.commissionAmount || 0);
                      return (
                        <tr key={lot.id} className="hover:bg-slate-50 font-medium transition">
                          <td className="p-3 font-mono text-[11px] whitespace-nowrap">{lot.date}</td>
                          <td className="p-3 font-mono font-bold text-[#1a3a52]">{lot.parchiNumber}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{lot.farmerName}</div>
                            <div className="text-[10px] text-slate-500">{lot.farmerVillage} • {lot.farmerPhone}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{lot.flowerVariety}</td>
                          <td className="p-3 text-right font-mono">
                            {lot.quantity} {lot.unit} @ ₹{lot.rate}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{lot.grossTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono text-red-700">
                            -₹{deductions.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-800">
                            ₹{lot.farmerNetPayable.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* MODE A: SINGLE FARMER KHATA STATEMENT */
        <>
          {/* SECTION 1: FIND THE FARMER & DATE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1a3a52] text-white flex items-center justify-center font-black shadow-sm">
                  <User className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {language === 'te' ? 'రైతు & తేదీ ఎంపిక' : 'Find Farmer & Date'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {language === 'te' ? 'ఖాతా వివరాలను చూడటానికి రైతును ఎంచుకోండి' : 'Select a grower and pick the accounting time period'}
                  </p>
                </div>
              </div>

              {currentFarmer && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{currentFarmer.name}</span>
                  </div>
                  <button
                    type="button"
                    id="katha-edit-farmer-header-btn"
                    onClick={handleOpenEditFarmerModal}
                    className="px-3 py-1.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white border border-[#1a3a52] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs min-touch-target"
                    title="Edit Farmer Details"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-300" />
                    <span>Edit Farmer</span>
                  </button>
                  <button
                    type="button"
                    id="katha-delete-farmer-header-btn"
                    onClick={() => handleDeleteFarmerClick(currentFarmer)}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs min-touch-target"
                    title="Delete Farmer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 space-y-6">
              {/* STEP 1: PICK A FARMER */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1a3a52] text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                      {language === 'te' ? 'రైతును ఎంచుకోండి' : 'Step 1: Pick a Farmer'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {matchedFarmers.length} {matchedFarmers.length === 1 ? 'farmer' : 'farmers'} found
                  </span>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                  <input
                    id="merchant-katha-farmer-search-input"
                    type="text"
                    placeholder="Type name or phone number..."
                    value={searchNameQuery}
                    onChange={(e) => setSearchNameQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 min-h-[48px] rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1a3a52] focus:bg-white transition"
                  />
                </div>

                {/* Farmer Chips */}
                {matchedFarmers.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    No farmers found matching &quot;{searchNameQuery}&quot;.
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                    {matchedFarmers.map((f) => {
                      const isSelected = selectedFarmerId === f.id;
                      return (
                        <button
                          type="button"
                          key={f.id}
                          onClick={() => {
                            setSelectedFarmerId(f.id);
                            setSearchNameQuery(f.name);
                          }}
                          className={`min-h-[52px] px-3.5 py-2 rounded-2xl flex items-center gap-3 shrink-0 transition-all cursor-pointer border-2 text-left ${
                            isSelected
                              ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-md'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-black text-sm border ${
                              isSelected
                                ? 'border-blue-300 bg-white/10 text-white'
                                : 'border-slate-200 bg-slate-100 text-slate-700'
                            }`}
                          >
                            {f.photoUrl ? (
                              <img
                                src={f.photoUrl}
                                alt={f.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{f.name ? f.name.charAt(0) : '🌾'}</span>
                            )}
                          </div>

                          <div>
                            <div className="font-bold text-xs sm:text-sm leading-tight line-clamp-1">
                              {f.name}
                            </div>
                            <div
                              className={`text-[11px] leading-tight flex items-center gap-1.5 mt-0.5 ${
                                isSelected ? 'text-slate-200' : 'text-slate-500'
                              }`}
                            >
                              <span>📍 {f.village || 'Yard'}</span>
                              <span>•</span>
                              <span>📞 {f.phone ? f.phone.slice(-4) : '—'}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 2: PICK A DATE RANGE */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1a3a52] text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                      {language === 'te' ? 'తేదీని ఎంచుకోండి' : 'Step 2: Pick Date Range'}
                    </span>
                  </div>

                  {!startDate && !endDate ? (
                    <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>All Time (Full Ledger History)</span>
                    </span>
                  ) : isSingleDay ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Single Day: {startDate}</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-700" />
                      <span>Range: {startDate || 'Start'} to {endDate || 'End'}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="katha-filter-today-btn"
                    onClick={() => handleSetQuickDate('today')}
                    className={`min-h-[48px] px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer border-2 ${
                      startDate === todayStr && endDate === todayStr
                        ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-blue-300" />
                    <span>Default Date ({todayStr})</span>
                  </button>

                  <button
                    type="button"
                    id="katha-filter-custom-btn"
                    onClick={() => setShowCustomDatePickers(!showCustomDatePickers)}
                    className={`min-h-[48px] px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer border-2 ${
                      showCustomDatePickers || (startDate && startDate !== todayStr)
                        ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Filter className="w-4 h-4 text-blue-300" />
                    <span>Custom Range</span>
                  </button>
                </div>

                {showCustomDatePickers && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in">
                    <div className="space-y-1">
                      <label htmlFor="katha-start-date" className="text-xs font-bold text-slate-700 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#1a3a52]" />
                          <span>Start Date:</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">
                          {formatDateDMY(startDate)}
                        </span>
                      </label>
                      <input
                        id="katha-start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1a3a52]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="katha-end-date" className="text-xs font-bold text-slate-700 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#1a3a52]" />
                          <span>End Date:</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">
                          {formatDateDMY(endDate)}
                        </span>
                      </label>
                      <input
                        id="katha-end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1a3a52]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: ACTIONS & TOOLBAR */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1a3a52] text-white flex items-center justify-center font-bold shadow-sm">
                  <Share2 className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Send or Save Statement
                  </h2>
                  <p className="text-xs text-slate-500">
                    Share via WhatsApp or export official Form C copy
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 block uppercase">Farmer Net Payable</span>
                <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                  ₹{statementMetrics.farmerNetMoney.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {pdfStatusMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-md ${
                    pdfStatusMessage.startsWith('PDF could not be created')
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
                    <span>{pdfStatusMessage}</span>
                  </div>
                  {pdfStatusMessage.startsWith('PDF could not be created') ? (
                    <button
                      type="button"
                      onClick={handleDownloadKathaPdf}
                      className="px-3 py-1 bg-white text-rose-700 hover:bg-slate-100 rounded-lg text-xs font-black cursor-pointer shrink-0"
                    >
                      Retry
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPdfStatusMessage('')}
                      className="text-white hover:text-slate-200 text-xs font-bold px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  id="katha-whatsapp-btn"
                  onClick={handleShareWhatsApp}
                  disabled={isSharingPdf || isGeneratingPdf || !currentFarmer || selectedLots.length === 0}
                  className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {isSharingPdf ? (
                    <Loader2 className="w-6 h-6 animate-spin shrink-0 text-white" />
                  ) : (
                    <Share2 className="w-6 h-6 shrink-0 text-white" />
                  )}
                  <div className="text-left">
                    <div className="leading-tight font-black">
                      {isSharingPdf ? 'Preparing PDF…' : 'Share WhatsApp'}
                    </div>
                    <div className="text-[11px] font-normal text-emerald-100 leading-tight">
                      Send Form C PDF ({selectedLots.length} Selected)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  id="katha-pdf-download-btn"
                  disabled={isGeneratingPdf || !currentFarmer || selectedLots.length === 0}
                  onClick={handleDownloadKathaPdf}
                  className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-[#1a3a52] hover:bg-[#122839] active:bg-[#0c1a26] text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-6 h-6 text-blue-300 animate-spin shrink-0" />
                  ) : (
                    <Download className="w-6 h-6 text-blue-300 shrink-0" />
                  )}
                  <div className="text-left">
                    <div className="leading-tight font-black">
                      {isGeneratingPdf ? 'Preparing PDF…' : 'Generate Form C PDF'}
                    </div>
                    <div className="text-[11px] font-normal text-slate-300 leading-tight">
                      Combine {selectedLots.length} Selected Parchis
                    </div>
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  id="katha-customize-formc-btn"
                  onClick={() => setIsCustomFormCModalOpen(true)}
                  disabled={!currentFarmer || selectedLots.length === 0}
                  className="min-h-[48px] px-3 py-2 rounded-2xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Sliders className="w-4 h-4 text-[#1a3a52]" />
                  <span>Form C Editor</span>
                </button>

                <button
                  type="button"
                  id="katha-csv-btn"
                  onClick={handleExportCSV}
                  disabled={!currentFarmer || selectedLots.length === 0}
                  className="min-h-[48px] px-3 py-2 rounded-2xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: STATEMENT PREVIEW & PARCHI SELECTION */}
          <div className="space-y-6">
            {currentFarmer && kathaFormCData && (
              <div className="bg-slate-50 p-3.5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#1a3a52] text-white flex items-center justify-center font-black shadow-xs">
                      <FileText className="w-4 h-4 text-blue-300" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 leading-tight">
                        Official Mandi Statement Preview
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Mandi Standard Statement ({selectedLots.length} Selected Parchis)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      id="form-c-quick-custom-btn"
                      onClick={() => setIsCustomFormCModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[#1a3a52] hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer min-touch-target"
                    >
                      <Sliders className="w-3.5 h-3.5 text-blue-300" />
                      <span>Customize</span>
                    </button>
                    <button
                      type="button"
                      id="form-c-quick-pdf-btn"
                      onClick={handleDownloadKathaPdf}
                      disabled={isGeneratingPdf || selectedLots.length === 0}
                      className="px-3 py-1.5 rounded-xl bg-[#1a3a52] text-white hover:bg-[#122839] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer min-touch-target disabled:opacity-50"
                    >
                      {isGeneratingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-blue-300" />
                      )}
                      <span>{isGeneratingPdf ? 'Exporting...' : 'PDF'}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto py-1">
                  <FormCInvoiceCanvas
                    ref={formCPdfRef}
                    data={kathaFormCData}
                    format="a4"
                  />
                </div>
              </div>
            )}

            {/* CONSIGNMENT LOTS SELECTION TABLE */}
            {currentFarmer && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#1a3a52]" />
                      <span>
                        Parchi List &amp; Multi-Selection ({dateFilteredLots.length} Total)
                      </span>
                    </h4>

                    {dateFilteredLots.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAllLots}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLotIds.size === dateFilteredLots.length && dateFilteredLots.length > 0}
                          onChange={toggleSelectAllLots}
                          className="w-4 h-4 rounded text-[#1a3a52] focus:ring-[#1a3a52]"
                        />
                        <span>
                          {selectedLotIds.size === dateFilteredLots.length ? 'Deselect All' : 'Select All'} ({selectedLotIds.size}/{dateFilteredLots.length})
                        </span>
                      </button>
                    )}
                  </div>

                  {dateFilteredLots.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
                      <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800">No parchis found for the selected date range.</p>
                      <p>Try switching to &quot;All Time&quot; to view past records.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-2xl bg-white overflow-hidden">
                        <thead className="bg-[#1a3a52] text-white font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedLotIds.size === dateFilteredLots.length && dateFilteredLots.length > 0}
                                onChange={toggleSelectAllLots}
                                className="w-4 h-4 rounded text-[#1a3a52] focus:ring-[#1a3a52]"
                              />
                            </th>
                            <th className="p-3">Parchi No. / Date</th>
                            <th className="p-3">Item / Variety</th>
                            <th className="p-3 text-center">Quality</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right">Rate</th>
                            <th className="p-3 text-right">Gross Total</th>
                            <th className="p-3 text-right">Deductions</th>
                            <th className="p-3 text-right">Farmer Net</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {dateFilteredLots.map((lot) => {
                            const isSelected = selectedLotIds.has(lot.id);
                            const deductions = (lot.ammaliCharges || 0) + (lot.transportCharges || 0) + (lot.commissionAmount || 0);

                            return (
                              <tr
                                key={lot.id}
                                className={`transition ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectLot(lot.id)}
                                    className="w-4 h-4 rounded text-[#1a3a52] focus:ring-[#1a3a52]"
                                  />
                                </td>
                                <td className="p-3 font-mono">
                                  <span className="font-bold text-[#1a3a52] block">{lot.parchiNumber}</span>
                                  <span className="text-[10px] text-slate-500">{lot.date}</span>
                                </td>
                                <td className="p-3 font-bold text-slate-900">{lot.flowerVariety}</td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold border uppercase ${
                                      lot.flowerQuality === 'Bad'
                                        ? 'bg-red-50 text-red-800 border-red-300'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    }`}
                                  >
                                    {lot.flowerQuality || 'Good'}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900 font-mono">
                                  {lot.quantity} {lot.unit}
                                </td>
                                <td className="p-3 text-right font-mono">₹{lot.rate.toFixed(2)}</td>
                                <td className="p-3 text-right font-mono font-bold">₹{lot.grossTotal.toFixed(2)}</td>
                                <td className="p-3 text-right font-mono text-red-800">-₹{deductions.toFixed(2)}</td>
                                <td className="p-3 text-right font-mono font-black text-emerald-800">
                                  ₹{lot.farmerNetPayable.toFixed(2)}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openPdfModalForLot(lot)}
                                      className="px-2.5 py-1.5 rounded-xl bg-[#1a3a52] text-white hover:bg-[#122839] cursor-pointer text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
                                      title="Generate Form C Parchi for this lot"
                                    >
                                      <FileText className="w-3 h-3 text-blue-300" />
                                      <span>Parchi</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLotClick(lot)}
                                      className="p-1.5 rounded-xl bg-slate-100 border border-slate-200 text-red-700 hover:bg-red-50 hover:border-red-200 cursor-pointer"
                                      title="Delete this parchi record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
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
            )}
          </div>
        </>
      )}

      {/* Form C Customizer Modal */}
      {isCustomFormCModalOpen && kathaFormCData && (
        <GeneratePdfModal
          isOpen={isCustomFormCModalOpen}
          onClose={() => setIsCustomFormCModalOpen(false)}
          lots={selectedLots}
          draftData={{
            farmerName: kathaFormCData.farmerName,
            farmerVillage: kathaFormCData.farmerVillage,
            farmerPhone: kathaFormCData.farmerPhone,
            parchiNumber: kathaFormCData.parchiNumber,
            date: kathaFormCData.date,
            time: kathaFormCData.time,
            grossTotal: kathaFormCData.grossTotal,
            transportCharges: kathaFormCData.transportCharges,
            ammaliCharges: kathaFormCData.ammaliCharges,
            commissionPercent: kathaFormCData.commissionPercent,
            commissionAmount: kathaFormCData.commissionAmount,
            miscCommissionAmount: kathaFormCData.miscCommissionAmount,
            amountPaid: kathaFormCData.amountPaid,
            paymentMode: kathaFormCData.paymentMode,
            paymentStatus: kathaFormCData.paymentStatus,
            items: kathaFormCData.items,
          }}
        />
      )}

      {/* Delete Lot Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title="Delete Parchi Lot"
        itemName={deleteModalConfig.lot ? `Parchi Lot: ${deleteModalConfig.lot.parchiNumber}` : undefined}
        itemDetails={
          deleteModalConfig.lot
            ? `Farmer: ${deleteModalConfig.lot.farmerName} • Variety: ${deleteModalConfig.lot.flowerVariety} • Amount: ₹${(deleteModalConfig.lot.grossTotal ?? deleteModalConfig.lot.farmerNetPayable ?? 0).toFixed(2)}`
            : undefined
        }
        message="Are you sure you want to delete this parchi record from the farmer's account statement?"
        confirmText="CONFIRM DELETE"
        cancelText="CANCEL"
        onConfirm={handleConfirmDeleteLot}
        onCancel={() => setDeleteModalConfig({ isOpen: false, lot: null })}
      />

      {/* Delete Farmer Modal */}
      <DeleteConfirmModal
        isOpen={deleteFarmerModalConfig.isOpen}
        title="Delete Farmer Account"
        itemName={deleteFarmerModalConfig.farmer ? `Farmer: ${deleteFarmerModalConfig.farmer.name}` : undefined}
        itemDetails={
          deleteFarmerModalConfig.farmer
            ? `Phone: ${deleteFarmerModalConfig.farmer.phone || 'N/A'} • Village: ${deleteFarmerModalConfig.farmer.village || 'N/A'}`
            : undefined
        }
        message={
          deleteFarmerModalConfig.farmer
            ? `Delete ${deleteFarmerModalConfig.farmer.name}? This will permanently remove all their records. This cannot be undone.`
            : 'Are you sure you want to permanently delete this farmer?'
        }
        confirmWord={deleteFarmerModalConfig.farmer?.name}
        confirmText="PERMANENTLY DELETE FARMER"
        cancelText="CANCEL"
        onConfirm={handleConfirmDeleteFarmer}
        onCancel={() => setDeleteFarmerModalConfig({ isOpen: false, farmer: null })}
      />

      {/* Edit Farmer Details Modal */}
      {isEditFarmerModalOpen && (
        <div
          id="edit-farmer-modal-overlay"
          onClick={() => setIsEditFarmerModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
        >
          <div
            id="edit-farmer-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-300" />
                <h3 className="font-black text-sm sm:text-base">Edit Farmer Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditFarmerModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedFarmer} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {editFarmerError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{editFarmerError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Farmer Name *
                </label>
                <input
                  type="text"
                  value={editFarmerName}
                  onChange={(e) => setEditFarmerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] text-xs font-bold text-slate-900 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={editFarmerPhone}
                  onChange={(e) => setEditFarmerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono text-xs font-bold text-slate-900 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Village / Area Location
                </label>
                <input
                  type="text"
                  value={editFarmerVillage}
                  onChange={(e) => setEditFarmerVillage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#1a3a52] text-xs font-medium text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditFarmerModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-xs cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
