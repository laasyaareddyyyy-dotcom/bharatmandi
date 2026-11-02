import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  Language,
  PortalMode,
  CommodityCategory,
  MerchantTab,
  FarmerTab,
  SaleLot,
  Farmer,
  PaymentRecord,
  MerchantProfile,
  ConnectionRequest,
  RegisteredAccount,
  ParchiAuditLog,
  Shipment,
  ShipmentItem,
  FifteenDaySettlement,
  PaymentMode,
  HelpTicket,
  HelpTicketCategory,
  HelpTicketPriority,
  HelpTicketStatus,
  TicketAttachment,
  TicketMessage,
  TicketInternalNote,
  StockItem,
  EmployeeRecord,
  ConnectionStatus,
  SyncedFarmerStatement,
  SyncedFarmerStatementItem,
  MerchantSection,
  Retailer,
  RetailerSale,
  RetailerPayment,
} from '../types';
import { translations } from '../translations';
import { hashPassword, verifyPasswordHash } from '../utils/cryptoUtils';
import {
  syncFarmerToCloud,
  deleteFarmerFromCloud,
  syncLotToCloud,
  deleteLotFromCloud,
  syncShipmentToCloud,
  deleteShipmentFromCloud,
  syncPaymentToCloud,
  deletePaymentFromCloud,
  syncSettlementToCloud,
  syncMerchantProfileToCloud,
  syncLocalToSupabase,
  fetchUserCloudData,
} from '../services/supabaseSync';

import {
  syncToFirestore,
  fetchFromFirestore,
  fetchUserAccountByPhone,
  subscribeToFirestore,
  deleteFarmerFromFirestore,
  deleteLotFromFirestore,
  deleteShipmentFromFirestore,
  deletePaymentFromFirestore,
  deleteSettlementFromFirestore,
  cleanUndefinedValues,
} from '../services/firestoreSync';
import { createTicketInSupabase } from '../services/supabaseTickets';
import { isSupabaseConfigured } from '../services/supabase';
import {
  loginOnServer,
  checkUserOnServer,
  sendOtpOnServer,
  verifyOtpOnServer,
  registerPasswordOnServer,
  resetPasswordOnServer,
  logoutOnServer,
  verifySessionOnServer,
} from '../services/serverAuth';
import {
  initialFarmers,
  initialMerchantProfile,
  DEFAULT_MARKET_YARD_NAME,
  initialPayments,
  initialConnectionRequests,
  initialHelpTickets,
  INITIAL_STOCKS,
  INITIAL_EMPLOYEES,
  INITIAL_RETAILERS,
  INITIAL_RETAILER_SALES,
  INITIAL_RETAILER_PAYMENTS,
  generateInitialLots,
  generateInitialShipments,
  getTodayDateString,
  getPastDateString,
  COMMODITY_CONFIGS,
} from '../data/initialData';
import {
  deduplicateFarmers,
  deduplicateLots,
  deduplicateShipments,
  deduplicatePayments,
  deduplicateSettlements,
  deduplicateStocks,
  deduplicateEmployees,
  deduplicateConnectionRequests,
  deduplicateRegisteredAccounts,
  deduplicateHelpTickets,
  deduplicateSyncedStatements,
  purgeDuplicatesFromLocalStorage,
} from '../utils/deduplication';

export const sanitizeLotsCommission = (rawLots: SaleLot[]): SaleLot[] => {
  if (!Array.isArray(rawLots)) return [];
  return rawLots.map((lot) => {
    const hamali = Number(lot.ammaliCharges || lot.otherExpenditures?.hamali) || 0;
    const transport = Number(lot.transportCharges || lot.otherExpenditures?.transport) || 0;
    const misc = Number(lot.otherExpenditures?.misc) || 0;
    const gross = Number(lot.grossTotal) || 0;
    const net = Number(lot.farmerNetPayable) || 0;
    const totalDailyDeductions = hamali + transport + misc;

    // If commissionAmount was auto-assigned without being actually deducted from farmerNetPayable
    if (lot.commissionAmount > 0 && Math.abs((net + totalDailyDeductions) - gross) <= 1) {
      return {
        ...lot,
        commissionPercent: 0,
        commissionAmount: 0,
      };
    }
    return lot;
  });
};

export interface UniquenessCheckResult {
  valid: boolean;
  field?: 'shopName' | 'shopAddress' | 'phoneNumber';
  message?: string;
}

interface MandiContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  merchantTab: MerchantTab;
  setMerchantTab: (tab: MerchantTab) => void;
  farmerTab: FarmerTab;
  setFarmerTab: (tab: FarmerTab) => void;
  activeFarmerId: string;
  setActiveFarmerId: (id: string) => void;
  
  // User Session & Accounts
  currentUserPhone: string;
  currentUserAccount: RegisteredAccount | null;
  registeredAccounts: RegisteredAccount[];
  switchUserAccount: (phone: string) => void;
  verifyPasswordAndLogin: (identifier: string, passwordInput: string) => Promise<{ success: boolean; error?: string; account?: RegisteredAccount }>;
  resetUserPassword: (identifier: string, newPasswordInput: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  changeUserPin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  registerNewAccount: (account: Omit<RegisteredAccount, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  checkUniqueness: (params: { shopName?: string; shopAddress?: string; phoneNumber?: string; excludePhone?: string }) => UniquenessCheckResult;
  logoutCurrentUser: () => void;
  deleteRegisteredAccount: (phone: string) => void;
  deleteCurrentAccount: () => void;
  deleteCurrentFarmerProfile: (farmerId?: string) => void;

  // User Selected Commodities (Only chosen commodities are accessible in app)
  userCommodities: CommodityCategory[];
  setUserCommodities: (commodities: CommodityCategory[]) => void;

  // Multi-Commodity Active Filter & Stats
  activeCommodityFilter: CommodityCategory | 'all';
  setActiveCommodityFilter: (category: CommodityCategory | 'all') => void;
  commodityStats: Record<CommodityCategory | 'all', {
    grossSales: number;
    totalDeductions: number;
    netEarnings: number;
    totalVolume: number;
    count: number;
    transportTotal: number;
    hamaliTotal: number;
    commissionTotal: number;
  }>;

  // Active Trading Session Date (defaults to real today, can be simulated)
  activeSessionDate: string;
  setActiveSessionDate: (date: string) => void;

  merchantProfile: MerchantProfile;
  updateMerchantProfile: (profile: Partial<MerchantProfile>) => void;

  farmers: Farmer[];
  addFarmer: (farmer: Omit<Farmer, 'id' | 'createdAt'>) => Farmer;
  updateFarmer: (id: string, updated: Partial<Farmer>) => void;
  deleteFarmer: (id: string) => void;
  archiveFarmer: (id: string) => void;

  lots: SaleLot[];
  todayLots: SaleLot[];
  addSaleLot: (lot: Omit<SaleLot, 'id' | 'parchiNumber' | 'time'>) => SaleLot;
  updateSaleLot: (id: string, updated: Partial<SaleLot>) => void;
  deleteSaleLot: (id: string) => void;

  // Shipments (Consolidated Multi-variety shipments with one-time Hamali & Transport)
  shipments: Shipment[];
  todayShipments: Shipment[];
  addShipment: (data: Omit<Shipment, 'id' | 'shipmentNumber' | 'time'>) => Shipment;
  updateShipment: (id: string, updated: Partial<Shipment>) => void;
  deleteShipment: (id: string) => void;
  getShipmentsForDate: (date: string) => Shipment[];

  // 15-Day Settlements & Period Settlement Calculation
  settlements: FifteenDaySettlement[];
  calculate15DaySettlement: (
    farmerId: string,
    periodStart: string,
    periodEnd: string,
    commissionPercent?: number,
    miscPercent?: number,
    commodityCategory?: CommodityCategory | 'all'
  ) => FifteenDaySettlement;
  confirmSettlement: (settlement: FifteenDaySettlement, paymentMode?: PaymentMode, paymentReference?: string) => void;
  deleteSettlement: (id: string) => void;

  // Selected Shipment for View / Modal
  selectedShipment: Shipment | null;
  setSelectedShipment: (shipment: Shipment | null) => void;

  payments: PaymentRecord[];
  recordPayment: (payment: Omit<PaymentRecord, 'id' | 'time'>) => void;
  deletePayment: (id: string) => void;
  updateLotPaymentStatus: (
    lotId: string,
    paymentStatus: 'Paid' | 'Unpaid' | 'Partial',
    amountPaid?: number,
    paymentMode?: PaymentRecord['paymentMode'],
    paymentReference?: string,
    notes?: string
  ) => void;

  connectionRequests: ConnectionRequest[];
  acceptConnectionRequest: (requestId: string) => void;
  declineConnectionRequest: (requestId: string) => void;



  // Merchant Section Switcher (Wholesaler vs Retailer)
  merchantSection: MerchantSection;
  setMerchantSection: (section: MerchantSection) => void;

  // Retailer Sales & Ledgers
  retailers: Retailer[];
  addRetailer: (retailer: Omit<Retailer, 'id' | 'createdAt'>) => Retailer;
  updateRetailer: (id: string, updated: Partial<Retailer>) => void;
  deleteRetailer: (id: string) => void;

  retailerSales: RetailerSale[];
  addRetailerSale: (sale: Omit<RetailerSale, 'id' | 'parchiNumber' | 'time'>) => RetailerSale;
  deleteRetailerSale: (id: string) => void;

  retailerPayments: RetailerPayment[];
  addRetailerPayment: (payment: Omit<RetailerPayment, 'id' | 'time'>) => RetailerPayment;
  deleteRetailerPayment: (id: string) => void;

  // Stocks & Inventory
  stocks: StockItem[];
  addStockItem: (item: Omit<StockItem, 'id' | 'lastUpdated'>) => StockItem;
  updateStockItem: (id: string, updated: Partial<StockItem>) => void;
  deleteStockItem: (id: string) => void;

  // Employees & Mandi Staff
  employees: EmployeeRecord[];
  addEmployee: (employee: Omit<EmployeeRecord, 'id' | 'joinedDate' | 'totalPaid' | 'balanceDue'>) => EmployeeRecord;
  updateEmployee: (id: string, updated: Partial<EmployeeRecord>) => void;
  deleteEmployee: (id: string) => void;
  recordEmployeePayment: (id: string, amount: number) => void;
  sendConnectionRequest: (data: {
    senderRole: 'farmer' | 'merchant';
    farmerId?: string;
    farmerName: string;
    farmerPhone: string;
    farmerVillage?: string;
    merchantId: string;
    merchantName: string;
    merchantPhone?: string;
    merchantOwnerName?: string;
  }) => void;
  getConnectionStatus: (farmerPhone: string, merchantIdOrPhone?: string) => ConnectionStatus;
  disconnectFarmerAndMerchant: (farmerPhone: string, merchantIdOrPhone?: string) => void;
  syncedStatements: SyncedFarmerStatement[];
  syncStatementToFarmer: (statement: Omit<SyncedFarmerStatement, 'id' | 'generatedAt'>) => { success: boolean; reason?: string };
  deleteSyncedStatement: (id: string) => void;
  getSyncedStatementsForFarmer: (farmerPhone: string) => SyncedFarmerStatement[];
  getSharedLotsForFarmer: (farmerPhone: string, farmerName: string, farmerId?: string) => SaleLot[];

  // Selected Lot for Parchi Receipt Modal
  selectedParchiLot: SaleLot | null;
  setSelectedParchiLot: (lot: SaleLot | null) => void;

  // Edit Parchi Modal State
  isEditParchiOpen: boolean;
  setIsEditParchiOpen: (open: boolean) => void;
  editingParchiLot: SaleLot | null;
  setEditingParchiLot: (lot: SaleLot | null) => void;
  openEditParchiModal: (lot: SaleLot) => void;

  // Generate PDF Modal & Workflow
  isGeneratePdfOpen: boolean;
  setIsGeneratePdfOpen: (open: boolean) => void;
  activePdfLot: SaleLot | null;
  setActivePdfLot: (lot: SaleLot | null) => void;
  openPdfModalForLot: (lot: SaleLot) => void;
  openPdfModalForShipment: (shipment: Shipment) => void;
  openParchiSlipForShipment: (shipment: Shipment) => void;

  // Auto-remove parchi after printing & Audit Trail
  autoRemoveParchiAfterPrint: boolean;
  setAutoRemoveParchiAfterPrint: (enabled: boolean) => void;
  parchiAuditLogs: ParchiAuditLog[];
  isAuditTrailOpen: boolean;
  setIsAuditTrailOpen: (open: boolean) => void;
  removeParchiWithAudit: (lotId: string, options?: { printedAt?: string; reason?: string }) => ParchiAuditLog | null;
  restoreParchiFromAudit: (auditId: string) => boolean;
  clearParchiAuditLogs: () => void;

  // QR Modal
  isQRModalOpen: boolean;
  setIsQRModalOpen: (open: boolean) => void;

  // Custom Variety Names Suggestions & Persistence across whole app
  customVarietyNames: string[];
  addCustomVarietyName: (name: string, category?: CommodityCategory) => void;
  getSuggestedVarietyNames: (
    category?: CommodityCategory | 'all',
    query?: string
  ) => { name: string; category?: CommodityCategory; icon: string; isCustom: boolean }[];

  // Settings Modal
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;

  // Portal Selector Modal
  isPortalSelectorOpen: boolean;
  setIsPortalSelectorOpen: (open: boolean) => void;

  // Tools & Services Modal
  isToolsModalOpen: boolean;
  setIsToolsModalOpen: (open: boolean) => void;

  // Owner Sign Up / Profile Modal
  isOwnerSignUpOpen: boolean;
  setIsOwnerSignUpOpen: (open: boolean) => void;

  // Farmer Sign Up Modal
  isFarmerSignUpOpen: boolean;
  setIsFarmerSignUpOpen: (open: boolean) => void;

  // Date Switcher Modal
  isDateSwitcherOpen: boolean;
  setIsDateSwitcherOpen: (open: boolean) => void;

  // Mobile Drawer Navigation
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;

  // Interactive Morning Mandi Rush Simulator
  isMorningRushOpen: boolean;
  setIsMorningRushOpen: (open: boolean) => void;

  // Interactive Farmer Phone Live Sync
  isFarmerPhoneOpen: boolean;
  setIsFarmerPhoneOpen: (open: boolean) => void;

  // Help Desk & Support
  helpTickets: HelpTicket[];
  isHelpDeskOpen: boolean;
  setIsHelpDeskOpen: (open: boolean) => void;
  helpDeskTab: 'raise' | 'my-tickets' | 'admin-dashboard' | 'faq';
  setHelpDeskTab: (tab: 'raise' | 'my-tickets' | 'admin-dashboard' | 'faq') => void;
  selectedHelpTicketId: string | null;
  setSelectedHelpTicketId: (id: string | null) => void;
  openHelpDesk: (tab?: 'raise' | 'my-tickets' | 'admin-dashboard' | 'faq', ticketId?: string) => void;
  createHelpTicket: (ticket: {
    subject: string;
    category: HelpTicketCategory;
    priority: HelpTicketPriority;
    description: string;
    userName?: string;
    userPhone?: string;
    userRole?: 'merchant' | 'farmer';
    shopName?: string;
    village?: string;
    attachments?: TicketAttachment[];
  }) => HelpTicket;
  updateHelpTicketStatus: (ticketId: string, status: HelpTicketStatus, note?: string) => void;
  assignHelpTicket: (ticketId: string, staffName: string) => void;
  addTicketResponse: (ticketId: string, message: string, senderRole?: 'user' | 'support' | 'admin', isInternal?: boolean, attachments?: TicketAttachment[]) => void;
  deleteHelpTicket: (ticketId: string) => void;

  // Translation function
  t: (key: string) => string;

  // Calculated Metrics
  todayTurnover: number;
  todayLotsCount: number;
  todayFarmersServed: number;
  todayTotalVolume: number;
  todayCommissionEarned: number;
  todayTransportTotal: number;
  todayHamaliTotal: number;
  todayFarmerNetTotal: number;
  totalOutstandingDues: number;
  totalPaidToDate: number;

  getFarmerStats: (
    farmerId: string,
    startDate?: string,
    endDate?: string,
    commodityCategory?: CommodityCategory | 'all'
  ) => {
    totalLots: number;
    totalVolume: number;
    totalTurnover: number;
    totalNetPayable: number;
    totalPaid: number;
    pendingDues: number;
  };

  getLotsForDate: (date: string) => SaleLot[];
  startNewDaySession: (newDate?: string) => void;
  clearDateLots: (date: string) => void;

  // Data Actions
  exportBackupJSON: () => void;
  importBackupJSON: (jsonString: string) => boolean;
  resetAllData: () => void;
  clearTodayLotsForTesting: () => void;

  // Dashboard Sections & Global Consignment Search
  dashboardTab: 'summary' | 'ledger' | 'merchant-info' | 'tools-settings';
  setDashboardTab: (tab: 'summary' | 'ledger' | 'merchant-info' | 'tools-settings') => void;
  consignmentSearchQuery: string;
  setConsignmentSearchQuery: (query: string) => void;

  // Cloud Auto-Sync State
  firebaseAutoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  isFirebaseAutoSyncEnabled?: boolean;
}

const MandiContext = createContext<MandiContextType | undefined>(undefined);

// Ensure whole entire app is refreshed with zero data starting from 0
const migrateLegacyStorageKeys = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const isResetDone = localStorage.getItem('bharatmandi_app_zero_data_v3');
    if (!isResetDone) {
      localStorage.clear();
      localStorage.setItem('bharatmandi_app_zero_data_v3', 'true');
      return;
    }
  } catch {
    // ignore storage access restrictions
  }
};
migrateLegacyStorageKeys();

const GLOBAL_STORAGE_KEYS = {
  LANG: 'bharatmandi_lang_v1',
  ACCOUNTS: 'bharatmandi_registered_accounts_v1',
  ACTIVE_USER_PHONE: 'bharatmandi_active_phone_v1',
  ONBOARDING_DONE: 'bharatmandi_onboarding_completed',
  ACTIVE_ROLE: 'bharatmandi_user_role',
  PORTAL: 'bharatmandi_portal_v1',
  REQUESTS: 'bharatmandi_global_connection_requests_v3',
};

const getUserStorageKeys = (phone: string) => {
  const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : 'default';
  return {
    MERCHANT: `bharatmandi_${cleanPhone}_merchant_v2`,
    FARMERS: `bharatmandi_${cleanPhone}_farmers_v2`,
    LOTS: `bharatmandi_${cleanPhone}_lots_v2`,
    PAYMENTS: `bharatmandi_${cleanPhone}_payments_v2`,
    REQUESTS: `bharatmandi_${cleanPhone}_requests_v2`,
    AUTO_REMOVE_PARCHI: `bharatmandi_${cleanPhone}_auto_remove_parchi_v1`,
    AUDIT_LOGS: `bharatmandi_${cleanPhone}_parchi_audit_v1`,
    SHIPMENTS: `bharatmandi_${cleanPhone}_shipments_v2`,
    SETTLEMENTS: `bharatmandi_${cleanPhone}_settlements_v2`,
    STOCKS: `bharatmandi_${cleanPhone}_stocks_v1`,
    EMPLOYEES: `bharatmandi_${cleanPhone}_employees_v1`,
  };
};

export const MandiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isAutoSyncEnabled, setIsAutoSyncEnabledState] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const debounceTimerRef = React.useRef<any>(null);

  const setIsAutoSyncEnabled = (enabled: boolean) => {
    setIsAutoSyncEnabledState(enabled);
  };

  const [currentUserPhone, setCurrentUserPhone] = useState<string>(() => {
    const saved = localStorage.getItem(GLOBAL_STORAGE_KEYS.ACTIVE_USER_PHONE);
    return saved ? saved.replace(/\D/g, '').slice(-10) : '';
  });

  const loadDataFromCloud = useCallback(async () => {
    if (currentUserPhone && currentUserPhone.length === 10) {
      return await fetchFromFirestore(currentUserPhone);
    }
    return await fetchFromFirestore();
  }, [currentUserPhone]);

  const syncDataToCloud = useCallback(async (payload: any) => {
    setAutoSaveStatus('saving');
    try {
      const res = await syncToFirestore(payload, currentUserPhone);
      if (res.success) {
        setAutoSaveStatus('saved');
        setLastSyncedAt(new Date().toLocaleTimeString());
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
        return true;
      } else {
        setAutoSaveStatus('error');
        return false;
      }
    } catch {
      setAutoSaveStatus('error');
      return false;
    }
  }, [currentUserPhone]);

  const scheduleAutoSync = useCallback((payload: any) => {
    if (!isAutoSyncEnabled) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setAutoSaveStatus('saving');
    debounceTimerRef.current = setTimeout(() => {
      syncDataToCloud(payload);
    }, 1500);
  }, [isAutoSyncEnabled, syncDataToCloud]);

  const [language, setLanguageState] = useState<Language>('en');

  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>(() => {
    const saved = localStorage.getItem(GLOBAL_STORAGE_KEYS.ACCOUNTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return deduplicateRegisteredAccounts(parsed);
      } catch {
        // fallback
      }
    }
    return [];
  });

  const currentUserAccount = useMemo(() => {
    if (!currentUserPhone) return null;
    return registeredAccounts.find(
      (a) => a.phoneNumber.replace(/\D/g, '').slice(-10) === currentUserPhone
    ) || null;
  }, [registeredAccounts, currentUserPhone]);

  const [portalMode, setPortalModeState] = useState<PortalMode>(() => {
    const activePhone = localStorage.getItem(GLOBAL_STORAGE_KEYS.ACTIVE_USER_PHONE) ||
      localStorage.getItem('bharatmandi_active_phone_v1') || '';
    const cleanPhone = activePhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone === '9110387978') {
      return 'admin';
    }
    const saved = localStorage.getItem(GLOBAL_STORAGE_KEYS.PORTAL) as PortalMode;
    if (saved === 'admin') return 'merchant';
    return saved || 'merchant';
  });

  // Keep portalMode strictly synchronized with the current active user role
  useEffect(() => {
    if (currentUserPhone && currentUserPhone.endsWith('9110387978')) {
      setPortalModeState('admin');
      try {
        localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, 'admin');
        localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_ROLE, 'admin');
      } catch {}
      return;
    }
    if (currentUserAccount?.role) {
      const role = currentUserAccount.role === 'admin' ? 'merchant' : currentUserAccount.role;
      if (role === 'merchant' || role === 'farmer') {
        setPortalModeState(role as PortalMode);
        try {
          localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, role);
        } catch {}
      }
    }
  }, [currentUserAccount?.role, currentUserPhone]);

  const [merchantTab, setMerchantTab] = useState<MerchantTab>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'summary' | 'ledger' | 'merchant-info' | 'tools-settings'>('summary');
  const [consignmentSearchQuery, setConsignmentSearchQuery] = useState<string>('');
  const [farmerTab, setFarmerTab] = useState<FarmerTab>('statements');
  const [activeFarmerId, setActiveFarmerId] = useState<string>('');

  // Selected commodities for this account (defaults to flowers or saved choice)
  const [userCommodities, setUserCommoditiesState] = useState<CommodityCategory[]>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_user_commodities') ?? localStorage.getItem('phoolmitra_user_commodities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return ['flowers'];
  });

  const [activeCommodityFilter, setActiveCommodityFilterState] = useState<CommodityCategory | 'all'>(() => {
    try {
      const lastActive = localStorage.getItem('bharatmandi_last_active_commodity') ?? localStorage.getItem('phoolmitra_last_active_commodity');
      const saved = localStorage.getItem('bharatmandi_user_commodities') ?? localStorage.getItem('phoolmitra_user_commodities');
      if (saved) {
        const parsed: CommodityCategory[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (lastActive && (parsed.includes(lastActive as CommodityCategory) || lastActive === 'all')) {
            return lastActive as CommodityCategory;
          }
          return parsed[0];
        }
      }
    } catch {
      // fallback
    }
    return 'flowers';
  });

  const setUserCommodities = (commodities: CommodityCategory[]) => {
    const validList = commodities.length > 0 ? commodities : (['flowers'] as CommodityCategory[]);
    setUserCommoditiesState(validList);
    try {
      localStorage.setItem('bharatmandi_user_commodities', JSON.stringify(validList));
    } catch {
      // ignore
    }
    // Strict isolation: If active commodity is not in newly selected commodities, default to first selected
    if (activeCommodityFilter !== 'all' && !validList.includes(activeCommodityFilter)) {
      const nextActive = validList[0];
      setActiveCommodityFilterState(nextActive);
      try {
        localStorage.setItem('bharatmandi_last_active_commodity', nextActive);
        localStorage.setItem('phoolmitra_last_active_commodity', nextActive);
      } catch {}
    } else if (validList.length === 1) {
      setActiveCommodityFilterState(validList[0]);
      try {
        localStorage.setItem('bharatmandi_last_active_commodity', validList[0]);
        localStorage.setItem('phoolmitra_last_active_commodity', validList[0]);
      } catch {}
    }
  };

  const setActiveCommodityFilter = (category: CommodityCategory | 'all') => {
    // If only 1 commodity is selected, user cannot switch to any other commodity
    if (userCommodities.length === 1) {
      const single = userCommodities[0];
      setActiveCommodityFilterState(single);
      try {
        localStorage.setItem('bharatmandi_last_active_commodity', single);
      } catch {}
      return;
    }
    // If multiple commodities are selected, user can only switch to selected commodities
    if (category !== 'all' && !userCommodities.includes(category)) {
      // Unselected commodity is forbidden
      return;
    }
    setActiveCommodityFilterState(category);
    try {
      localStorage.setItem('bharatmandi_last_active_commodity', category);
      localStorage.setItem('phoolmitra_last_active_commodity', category);
    } catch {
      // ignore
    }
  };

  // Active trading session date (persisted across refreshes)
  const [activeSessionDate, setActiveSessionDateState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_active_session_date');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
    } catch {}
    return getTodayDateString();
  });

  const setActiveSessionDate = useCallback((date: string) => {
    setActiveSessionDateState(date);
    try {
      localStorage.setItem('bharatmandi_active_session_date', date);
    } catch {}
  }, []);

  // Profile - dynamic per user phone
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile>(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    const saved = localStorage.getItem(keys.MERCHANT);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return initialMerchantProfile;
  });

  // Farmers - dynamic per user phone (persisted across refreshes & date changes)
  const [farmers, setFarmers] = useState<Farmer[]>(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    const saved = localStorage.getItem(keys.FARMERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonDummy = parsed.filter((f) => f && f.id && !String(f.id).startsWith('farmer-'));
          return deduplicateFarmers(
            nonDummy
              .filter((f) => f && typeof f === 'object')
              .map((f, idx) => ({
                ...f,
                id: (f.id && f.id !== 'undefined') ? String(f.id).trim() : `FM-${String(idx + 1).padStart(3, '0')}`,
              }))
          );
        }
      } catch {
        // fallback
      }
    }
    return initialFarmers;
  });

  // Lots - dynamic per user phone
  const [lots, setLots] = useState<SaleLot[]>(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    const saved = localStorage.getItem(keys.LOTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonDummy = parsed.filter((l) => l && l.id && !String(l.id).startsWith('lot-10'));
          return deduplicateLots(sanitizeLotsCommission(nonDummy));
        }
      } catch {
        // fallback
      }
    }
    return generateInitialLots();
  });

  // Payments - dynamic per user phone
  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    const saved = localStorage.getItem(keys.PAYMENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return deduplicatePayments(Array.isArray(parsed) ? parsed : []);
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Shipments (Multi-variety grouped shipments with one-time Hamali & Transport)
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    const saved = localStorage.getItem(keys.SHIPMENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateShipments(parsed);
      } catch {
        // fallback
      }
    }
    return [];
  });

  // 15-Day Settlements
  const [settlements, setSettlements] = useState<FifteenDaySettlement[]>(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    const saved = localStorage.getItem(keys.SETTLEMENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return deduplicateSettlements(parsed);
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Stock Management - dynamic per user phone
  const [stocks, setStocks] = useState<StockItem[]>(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    const saved = localStorage.getItem(keys.STOCKS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateStocks(parsed);
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Mandi Employees & Staff - dynamic per user phone
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    const saved = localStorage.getItem(keys.EMPLOYEES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateEmployees(parsed);
      } catch {
        // fallback
      }
    }
    return [];
  });

  useEffect(() => {
    const phone = currentUserPhone;
    if (phone) {
      const keys = getUserStorageKeys(phone);
      localStorage.setItem(keys.STOCKS, JSON.stringify(stocks));
    }
  }, [stocks, currentUserPhone]);

  useEffect(() => {
    const phone = currentUserPhone;
    if (phone) {
      const keys = getUserStorageKeys(phone);
      localStorage.setItem(keys.EMPLOYEES, JSON.stringify(employees));
    }
  }, [employees, currentUserPhone]);

  const addStockItem = useCallback((item: Omit<StockItem, 'id' | 'lastUpdated'>): StockItem => {
    let returnItem: StockItem | undefined;
    setStocks((prev) => {
      const match = prev.find(
        (s) => s.name.trim().toLowerCase() === item.name.trim().toLowerCase() && s.category === item.category
      );
      if (match) {
        returnItem = {
          ...match,
          quantityOnHand: match.quantityOnHand + item.quantityOnHand,
          packagesCount: (match.packagesCount || 0) + (item.packagesCount || 0),
          lastUpdated: getTodayDateString(),
        };
        return prev.map((s) => (s.id === match.id ? returnItem! : s));
      }
      const newItem: StockItem = {
        ...item,
        id: `STK-${Date.now().toString().slice(-4)}`,
        lastUpdated: getTodayDateString(),
      };
      returnItem = newItem;
      return deduplicateStocks([newItem, ...prev]);
    });
    return returnItem || { ...item, id: `STK-${Date.now().toString().slice(-4)}`, lastUpdated: getTodayDateString() };
  }, []);

  const updateStockItem = useCallback((id: string, updated: Partial<StockItem>) => {
    setStocks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated, lastUpdated: getTodayDateString() } : s))
    );
  }, []);

  const deleteStockItem = useCallback((id: string) => {
    setStocks((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addEmployee = useCallback(
    (employee: Omit<EmployeeRecord, 'id' | 'joinedDate' | 'totalPaid' | 'balanceDue'>): EmployeeRecord => {
      let returnEmp: EmployeeRecord | undefined;
      setEmployees((prev) => {
        const cleanPhone = employee.phone ? employee.phone.replace(/\D/g, '').slice(-10) : '';
        const match = prev.find((e) => {
          const ep = e.phone ? e.phone.replace(/\D/g, '').slice(-10) : '';
          return (cleanPhone && cleanPhone.length === 10 && ep === cleanPhone) ||
            e.name.trim().toLowerCase() === employee.name.trim().toLowerCase();
        });
        if (match) {
          returnEmp = match;
          return prev;
        }
        const newEmp: EmployeeRecord = {
          ...employee,
          id: `EMP-${Date.now().toString().slice(-4)}`,
          joinedDate: getTodayDateString(),
          totalPaid: 0,
          balanceDue: 0,
        };
        returnEmp = newEmp;
        return deduplicateEmployees([newEmp, ...prev]);
      });
      return returnEmp || { ...employee, id: `EMP-${Date.now().toString().slice(-4)}`, joinedDate: getTodayDateString(), totalPaid: 0, balanceDue: 0 };
    },
    []
  );

  const updateEmployee = useCallback((id: string, updated: Partial<EmployeeRecord>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const recordEmployeePayment = useCallback((id: string, amount: number) => {
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const newPaid = (e.totalPaid || 0) + amount;
        const newDue = Math.max(0, (e.balanceDue || 0) - amount);
        return { ...e, totalPaid: newPaid, balanceDue: newDue };
      })
    );
  }, []);

  // Merchant Section Switcher (Wholesaler vs Retailer)
  const [merchantSection, setMerchantSectionState] = useState<MerchantSection>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_merchant_section');
      if (saved === 'retailer') return 'retailer';
    } catch {}
    return 'wholesaler';
  });

  const setMerchantSection = (section: MerchantSection) => {
    setMerchantSectionState(section);
    try {
      localStorage.setItem('bharatmandi_merchant_section', section);
    } catch {}
  };

  // Retailer Sales & Ledgers State
  const [retailers, setRetailers] = useState<Retailer[]>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_retailers_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (r) =>
              r &&
              r.id &&
              !['RTL-001', 'RTL-002', 'RTL-003'].includes(r.id) &&
              !r.name?.includes('Sri Sai Lakshmi') &&
              !r.name?.includes('Venkateswara Retail') &&
              !r.name?.includes('Jai Hind Garland')
          );
        }
      }
    } catch {}
    return INITIAL_RETAILERS;
  });

  const [retailerSales, setRetailerSales] = useState<RetailerSale[]>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_retailer_sales_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (s) =>
              s &&
              s.id &&
              !['RTL-SALE-20261024-001', 'RTL-SALE-20261024-002'].includes(s.id) &&
              !['RTL-001', 'RTL-002', 'RTL-003'].includes(s.retailerId)
          );
        }
      }
    } catch {}
    return INITIAL_RETAILER_SALES;
  });

  const [retailerPayments, setRetailerPayments] = useState<RetailerPayment[]>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_retailer_payments_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (p) =>
              p &&
              p.id &&
              !['RTL-PAY-001'].includes(p.id) &&
              !['RTL-001', 'RTL-002', 'RTL-003'].includes(p.retailerId)
          );
        }
      }
    } catch {}
    return INITIAL_RETAILER_PAYMENTS;
  });

  // LocalStorage persistence for retailer data
  useEffect(() => {
    try {
      localStorage.setItem('bharatmandi_retailers_v1', JSON.stringify(retailers));
    } catch {}
  }, [retailers]);

  useEffect(() => {
    try {
      localStorage.setItem('bharatmandi_retailer_sales_v1', JSON.stringify(retailerSales));
    } catch {}
  }, [retailerSales]);

  useEffect(() => {
    try {
      localStorage.setItem('bharatmandi_retailer_payments_v1', JSON.stringify(retailerPayments));
    } catch {}
  }, [retailerPayments]);

  const addRetailer = useCallback((data: Omit<Retailer, 'id' | 'createdAt'>): Retailer => {
    const newRetailer: Retailer = {
      ...data,
      id: `RTL-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setRetailers((prev) => [newRetailer, ...prev]);
    return newRetailer;
  }, []);

  const updateRetailer = useCallback((id: string, updated: Partial<Retailer>) => {
    setRetailers((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
  }, []);

  const deleteRetailer = useCallback((id: string) => {
    setRetailers((prev) => prev.filter((r) => r.id !== id));
    setRetailerSales((prev) => prev.filter((s) => s.retailerId !== id));
    setRetailerPayments((prev) => prev.filter((p) => p.retailerId !== id));
  }, []);

  const addRetailerSale = useCallback((data: Omit<RetailerSale, 'id' | 'parchiNumber' | 'time'>): RetailerSale => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const parchiNumber = `RT-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

    const newSale: RetailerSale = {
      ...data,
      id: `RTL-SALE-${Date.now()}`,
      parchiNumber,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
    };

    setRetailerSales((prev) => [newSale, ...prev]);
    return newSale;
  }, []);

  const deleteRetailerSale = useCallback((id: string) => {
    setRetailerSales((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addRetailerPayment = useCallback((data: Omit<RetailerPayment, 'id' | 'time'>): RetailerPayment => {
    const now = new Date();
    const newPayment: RetailerPayment = {
      ...data,
      id: `RTL-PAY-${Date.now()}`,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setRetailerPayments((prev) => [newPayment, ...prev]);
    return newPayment;
  }, []);

  const deleteRetailerPayment = useCallback((id: string) => {
    setRetailerPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Connection Requests - globally synced across Mandi network
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>(() => {
    const savedGlobal = localStorage.getItem(GLOBAL_STORAGE_KEYS.REQUESTS);
    if (savedGlobal) {
      try {
        const parsed = JSON.parse(savedGlobal);
        if (Array.isArray(parsed)) return deduplicateConnectionRequests(parsed);
      } catch {
        // fallback
      }
    }
    const phone = currentUserPhone;
    if (phone) {
      const keys = getUserStorageKeys(phone);
      const saved = localStorage.getItem(keys.REQUESTS);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return deduplicateConnectionRequests(Array.isArray(parsed) ? parsed : []);
        } catch {
          // fallback
        }
      }
    }
    return [];
  });

  // Synced Statements across connected farmers & merchants
  const [syncedStatements, setSyncedStatements] = useState<SyncedFarmerStatement[]>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_synced_statements_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return deduplicateSyncedStatements(parsed);
      }
    } catch {
      // fallback
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('bharatmandi_synced_statements_v1', JSON.stringify(syncedStatements));
    } catch {
      // ignore
    }
  }, [syncedStatements]);

  // Modals
  const [selectedParchiLot, setSelectedParchiLot] = useState<SaleLot | null>(null);
  const [isEditParchiOpen, setIsEditParchiOpen] = useState<boolean>(false);
  const [editingParchiLot, setEditingParchiLot] = useState<SaleLot | null>(null);

  const openEditParchiModal = useCallback((lot: SaleLot) => {
    setEditingParchiLot(lot);
    setIsEditParchiOpen(true);
  }, []);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPortalSelectorOpen, setIsPortalSelectorOpen] = useState<boolean>(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState<boolean>(false);
  const [isOwnerSignUpOpen, setIsOwnerSignUpOpen] = useState<boolean>(false);
  const [isFarmerSignUpOpen, setIsFarmerSignUpOpen] = useState<boolean>(false);
  const [isDateSwitcherOpen, setIsDateSwitcherOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isMorningRushOpen, setIsMorningRushOpen] = useState<boolean>(false);
  const [isFarmerPhoneOpen, setIsFarmerPhoneOpen] = useState<boolean>(false);

  // Auto-remove parchi after printing setting
  const [autoRemoveParchiAfterPrint, setAutoRemoveParchiAfterPrintState] = useState<boolean>(() => {
    const phone = currentUserPhone;
    if (phone) {
      const keys = getUserStorageKeys(phone);
      const saved = localStorage.getItem(keys.AUTO_REMOVE_PARCHI);
      if (saved !== null) return saved === 'true';
    }
    const defaultSaved = localStorage.getItem('bharatmandi_auto_remove_parchi_v1') ?? localStorage.getItem('phoolmitra_auto_remove_parchi_v1');
    return defaultSaved === 'true';
  });

  const setAutoRemoveParchiAfterPrint = (enabled: boolean) => {
    setAutoRemoveParchiAfterPrintState(enabled);
    if (currentUserPhone) {
      const keys = getUserStorageKeys(currentUserPhone);
      localStorage.setItem(keys.AUTO_REMOVE_PARCHI, String(enabled));
    }
    localStorage.setItem('bharatmandi_auto_remove_parchi_v1', String(enabled));
  };

  // Parchi Audit Trail logs (persisted per user)
  const [parchiAuditLogs, setParchiAuditLogs] = useState<ParchiAuditLog[]>(() => {
    const phone = currentUserPhone;
    if (phone) {
      const keys = getUserStorageKeys(phone);
      const saved = localStorage.getItem(keys.AUDIT_LOGS);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
    }
    return [];
  });

  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState<boolean>(false);

  // Custom Commodity Variety Names State (Persisted in localStorage & synced across app)
  const [customVarietyNames, setCustomVarietyNames] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_custom_variety_names_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((n) => typeof n === 'string' && n.trim().length > 0);
      }
    } catch {}
    return [];
  });

  const addCustomVarietyName = useCallback((name: string, category?: CommodityCategory) => {
    const clean = name.trim();
    if (!clean || clean.length <= 1 || clean.toLowerCase() === 'standard') return;

    setCustomVarietyNames((prev) => {
      if (prev.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
        return prev;
      }
      const updated = [clean, ...prev];
      try {
        localStorage.setItem('bharatmandi_custom_variety_names_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const getSuggestedVarietyNames = useCallback(
    (category: CommodityCategory | 'all' = 'all', query: string = '') => {
      const cleanQuery = query.trim().toLowerCase();
      const results: { name: string; category?: CommodityCategory; icon: string; isCustom: boolean }[] = [];
      const seenNames = new Set<string>();

      const addResult = (name: string, cat?: CommodityCategory, isCustom: boolean = false) => {
        const trimmed = name.trim();
        if (!trimmed || trimmed.toLowerCase() === 'standard') return;
        const key = trimmed.toLowerCase();
        if (seenNames.has(key)) return;
        if (cleanQuery && !key.includes(cleanQuery)) return;

        seenNames.add(key);
        const icon = cat && COMMODITY_CONFIGS[cat] ? COMMODITY_CONFIGS[cat].icon : '🌸';
        results.push({ name: trimmed, category: cat, icon, isCustom });
      };

      // 1. First prioritize custom typed names from customVarietyNames state
      customVarietyNames.forEach((n) => addResult(n, category !== 'all' ? category : undefined, true));

      // 2. Add names from existing recorded lots, shipments, stocks, and farmers
      lots.forEach((l) => {
        if (l.flowerVariety) addResult(l.flowerVariety, l.commodityCategory, true);
      });
      shipments.forEach((s) => {
        s.items?.forEach((item) => {
          if (item.flowerVariety) addResult(item.flowerVariety, item.commodityCategory || s.commodityCategory, true);
        });
      });
      stocks.forEach((st) => {
        if (st.name) addResult(st.name, st.category, true);
      });
      farmers.forEach((f) => {
        f.primaryCrops?.forEach((crop) => addResult(crop, undefined, true));
      });

      // 3. Add predefined commodity varieties from COMMODITY_CONFIGS
      const categoriesToScan: CommodityCategory[] =
        category !== 'all' && COMMODITY_CONFIGS[category]
          ? [category]
          : (['flowers', 'grains', 'vegetables', 'fruits'] as CommodityCategory[]);

      categoriesToScan.forEach((cat) => {
        const config = COMMODITY_CONFIGS[cat];
        if (config && config.varieties) {
          config.varieties.forEach((v) => {
            if (language === 'hi') {
              if (v.hi) addResult(v.hi, cat, false);
              else addResult(v.en, cat, false);
            } else {
              if (v.en) addResult(v.en, cat, false);
            }
          });
        }
      });

      return results;
    },
    [customVarietyNames, lots, shipments, stocks, farmers, language]
  );

  // Help Desk & Support State
  const [helpTickets, setHelpTickets] = useState<HelpTicket[]>(() => {
    try {
      const saved = localStorage.getItem('bharatmandi_help_tickets_v2') ?? localStorage.getItem('phoolmitra_help_tickets_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateHelpTickets(parsed);
      }
    } catch {}
    return [];
  });

  const [isHelpDeskOpen, setIsHelpDeskOpen] = useState<boolean>(false);
  const [helpDeskTab, setHelpDeskTab] = useState<'raise' | 'my-tickets' | 'admin-dashboard' | 'faq'>('raise');
  const [selectedHelpTicketId, setSelectedHelpTicketId] = useState<string | null>(null);

  const saveHelpTickets = (updated: HelpTicket[]) => {
    setHelpTickets(updated);
    try {
      localStorage.setItem('bharatmandi_help_tickets_v2', JSON.stringify(updated));
    } catch {}
  };

  const openHelpDesk = (tab: 'raise' | 'my-tickets' | 'admin-dashboard' | 'faq' = 'raise', ticketId?: string) => {
    setHelpDeskTab(tab);
    if (ticketId) {
      setSelectedHelpTicketId(ticketId);
    }
    setIsHelpDeskOpen(true);
  };

  const createHelpTicket = (ticketInput: {
    subject: string;
    category: HelpTicketCategory;
    priority: HelpTicketPriority;
    description: string;
    userName?: string;
    userPhone?: string;
    userRole?: 'merchant' | 'farmer';
    shopName?: string;
    village?: string;
    attachments?: TicketAttachment[];
  }): HelpTicket => {
    const year = new Date().getFullYear();
    const existingNumbers = helpTickets
      .map((t) => {
        const match = t.ticketNumber.match(/TICKET-\d+-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextSeq = (existingNumbers.length > 0 ? Math.max(...existingNumbers) : helpTickets.length) + 1;
    const ticketNumber = `TICKET-${year}-${String(nextSeq).padStart(3, '0')}`;
    const id = `ticket-${Date.now()}`;
    const now = new Date().toISOString();

    const resolvedRole: 'merchant' | 'farmer' = ticketInput.userRole || (portalMode === 'farmer' ? 'farmer' : 'merchant');
    const resolvedName = ticketInput.userName || currentUserAccount?.fullName || (resolvedRole === 'merchant' ? merchantProfile.ownerName || merchantProfile.shopName : 'Kisan User');
    const resolvedPhone = ticketInput.userPhone || currentUserPhone || '9876543210';
    const resolvedShop = resolvedRole === 'merchant' ? (ticketInput.shopName || merchantProfile.shopName) : undefined;
    const resolvedVillage = resolvedRole === 'farmer' ? ticketInput.village : undefined;

    const newTicket: HelpTicket = {
      id,
      ticketNumber,
      userId: currentUserAccount?.id || (resolvedRole === 'farmer' ? `farmer-${resolvedPhone}` : merchantProfile.merchantId),
      userName: resolvedName,
      userPhone: resolvedPhone,
      userRole: resolvedRole,
      shopName: resolvedShop,
      village: resolvedVillage,
      subject: ticketInput.subject,
      category: ticketInput.category,
      priority: ticketInput.priority,
      description: ticketInput.description,
      attachments: ticketInput.attachments || [],
      status: 'Open',
      assignedTo: 'Unassigned',
      createdAt: now,
      updatedAt: now,
      responses: [],
      internalNotes: [],
    };

    const updated = [newTicket, ...helpTickets];
    saveHelpTickets(updated);
    setSelectedHelpTicketId(id);

    // Mirror to Admin Portal Supabase Tickets table
    createTicketInSupabase({
      shop_name: resolvedShop || (resolvedRole === 'farmer' ? `Farmer (${resolvedVillage || 'Kisan'})` : 'Mandi Trader Shop'),
      user_name: resolvedName,
      user_phone: resolvedPhone,
      category: ticketInput.category,
      priority: ticketInput.priority === 'High' ? 'high' : ticketInput.priority === 'Low' ? 'low' : 'normal',
      subject: ticketInput.subject,
      message: ticketInput.description,
    });

    return newTicket;
  };

  const updateHelpTicketStatus = (ticketId: string, status: HelpTicketStatus, note?: string) => {
    const now = new Date().toISOString();
    const updated = helpTickets.map((t) => {
      if (t.id !== ticketId && t.ticketNumber !== ticketId) return t;
      const isResolved = status === 'Resolved' || status === 'Closed';
      const updatedNotes = note
        ? [
            ...(t.internalNotes || []),
            {
              id: `note-${Date.now()}`,
              staffName: currentUserAccount?.fullName || 'Support Staff',
              note,
              createdAt: now,
            },
          ]
        : t.internalNotes || [];

      return {
        ...t,
        status,
        updatedAt: now,
        resolvedAt: isResolved ? now : t.resolvedAt,
        internalNotes: updatedNotes,
      };
    });
    saveHelpTickets(updated);
  };

  const assignHelpTicket = (ticketId: string, staffName: string) => {
    const now = new Date().toISOString();
    const updated = helpTickets.map((t) => {
      if (t.id !== ticketId && t.ticketNumber !== ticketId) return t;
      return {
        ...t,
        assignedTo: staffName,
        updatedAt: now,
      };
    });
    saveHelpTickets(updated);
  };

  const addTicketResponse = (
    ticketId: string,
    message: string,
    senderRole: 'user' | 'support' | 'admin' = 'user',
    isInternal: boolean = false,
    attachments?: TicketAttachment[]
  ) => {
    const now = new Date().toISOString();
    const senderName =
      senderRole === 'user'
        ? currentUserAccount?.fullName || (portalMode === 'farmer' ? 'Kisan Bhai' : merchantProfile.ownerName || 'Merchant')
        : currentUserAccount?.fullName || 'भारत MANDI Support';

    const updated = helpTickets.map((t) => {
      if (t.id !== ticketId && t.ticketNumber !== ticketId) return t;

      if (isInternal) {
        return {
          ...t,
          updatedAt: now,
          internalNotes: [
            ...(t.internalNotes || []),
            {
              id: `note-${Date.now()}`,
              staffName: senderName,
              note: message,
              createdAt: now,
            },
          ],
        };
      }

      return {
        ...t,
        updatedAt: now,
        status: senderRole !== 'user' && t.status === 'Open' ? 'In Progress' : t.status,
        responses: [
          ...(t.responses || []),
          {
            id: `resp-${Date.now()}`,
            senderRole,
            senderName,
            message,
            timestamp: now,
            attachments,
            isInternalNote: false,
          },
        ],
      };
    });
    saveHelpTickets(updated);
  };

  const deleteHelpTicket = (ticketId: string) => {
    const updated = helpTickets.filter((t) => t.id !== ticketId && t.ticketNumber !== ticketId);
    saveHelpTickets(updated);
    if (selectedHelpTicketId === ticketId) {
      setSelectedHelpTicketId(null);
    }
  };

  // Generate PDF Modal State
  const [isGeneratePdfOpen, setIsGeneratePdfOpen] = useState<boolean>(false);
  const [activePdfLot, setActivePdfLot] = useState<SaleLot | null>(null);

  const openPdfModalForLot = (lot: SaleLot) => {
    setActivePdfLot(lot);
    setIsGeneratePdfOpen(true);
  };

  const openPdfModalForShipment = (shipment: Shipment) => {
    const varietiesSummary = shipment.items
      .map((i) => `${i.flowerVariety} (${i.quantity} ${i.unit})`)
      .join(', ');
    const totalQty = shipment.items.reduce((sum, i) => sum + i.quantity, 0) || 1;
    const totalBoxes = shipment.items.reduce((sum, i) => sum + (i.boxesCount || 0), 0);
    const primaryPackagingType = shipment.items[0]?.packagingType || 'Boxes';
    const synthesizedLot: SaleLot = {
      id: shipment.id,
      parchiNumber: shipment.shipmentNumber,
      date: shipment.date,
      time: shipment.time,
      farmerId: shipment.farmerId,
      farmerName: shipment.farmerName,
      farmerPhone: shipment.farmerPhone,
      farmerVillage: shipment.farmerVillage,
      flowerVariety: varietiesSummary,
      flowerQuality: shipment.items[0]?.flowerQuality || 'Good',
      boxesCount: totalBoxes,
      packagingType: primaryPackagingType,
      quantity: totalQty,
      unit: shipment.items[0]?.unit || 'Kgs',
      rate: Math.round(shipment.grossTotal / totalQty),
      grossTotal: shipment.grossTotal,
      commissionPercent: shipment.commissionPercent || 0,
      commissionAmount: shipment.commissionAmount || 0,
      transportCharges: shipment.transportCharge,
      ammaliCharges: shipment.hamaliCharge,
      totalOtherExpenditures: shipment.transportCharge + shipment.hamaliCharge,
      otherExpenditures: {
        transport: shipment.transportCharge,
        hamali: shipment.hamaliCharge,
        weighing: 0,
        mandiCess: 0,
        advanceDeduction: 0,
        misc: 0,
      },
      farmerNetPayable: shipment.netAmountAfterDailyCuts,
      paymentStatus: shipment.paymentStatus,
      amountPaid: shipment.amountPaid,
      balanceDue: shipment.balanceDue,
      notes: shipment.notes || 'Consignment with multi-variety flowers',
      shipmentId: shipment.id,
    };
    setActivePdfLot(synthesizedLot);
    setIsGeneratePdfOpen(true);
  };

  const openParchiSlipForShipment = (shipment: Shipment) => {
    const varietiesSummary = shipment.items
      .map((i) => `${i.flowerVariety} (${i.quantity} ${i.unit})`)
      .join(', ');
    const totalQty = shipment.items.reduce((sum, i) => sum + i.quantity, 0) || 1;
    const totalBoxes = shipment.items.reduce((sum, i) => sum + (i.boxesCount || 0), 0);
    const primaryPackagingType = shipment.items[0]?.packagingType || 'Boxes';
    const synthesizedLot: SaleLot = {
      id: shipment.id,
      parchiNumber: shipment.shipmentNumber,
      date: shipment.date,
      time: shipment.time,
      farmerId: shipment.farmerId,
      farmerName: shipment.farmerName,
      farmerPhone: shipment.farmerPhone,
      farmerVillage: shipment.farmerVillage,
      flowerVariety: varietiesSummary,
      flowerQuality: shipment.items[0]?.flowerQuality || 'Good',
      boxesCount: totalBoxes,
      packagingType: primaryPackagingType,
      quantity: totalQty,
      unit: shipment.items[0]?.unit || 'Kgs',
      rate: Math.round(shipment.grossTotal / totalQty),
      grossTotal: shipment.grossTotal,
      commissionPercent: shipment.commissionPercent || 0,
      commissionAmount: shipment.commissionAmount || 0,
      transportCharges: shipment.transportCharge,
      ammaliCharges: shipment.hamaliCharge,
      totalOtherExpenditures: shipment.transportCharge + shipment.hamaliCharge,
      otherExpenditures: {
        transport: shipment.transportCharge,
        hamali: shipment.hamaliCharge,
        weighing: 0,
        mandiCess: 0,
        advanceDeduction: 0,
        misc: 0,
      },
      farmerNetPayable: shipment.netAmountAfterDailyCuts,
      paymentStatus: shipment.paymentStatus,
      amountPaid: shipment.amountPaid,
      balanceDue: shipment.balanceDue,
      notes: shipment.notes || 'Consignment with multi-variety flowers',
      shipmentId: shipment.id,
    };
    setSelectedParchiLot(synthesizedLot);
  };

  // Helper function to generate or get a unique, persistent Merchant ID (e.g., MND-1001, MND-1002)
  const getOrCreateSequentialMerchantId = (
    cleanPhone: string,
    accounts: RegisteredAccount[]
  ): string => {
    if (!cleanPhone) return 'MND-1001';

    const match = accounts.find(
      (a) => a.phoneNumber && a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone
    );
    if (match?.merchantId) {
      return match.merchantId;
    }

    const merchantAccounts = accounts.filter((a) => a.role === 'merchant');
    const existingNums = merchantAccounts
      .map((a) => a.merchantId)
      .filter(Boolean)
      .map((id) => {
        const m = id?.match(/MND-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n >= 1000);

    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1001 + merchantAccounts.length;
    return `MND-${nextNum}`;
  };

  // Switch User Account & Load Their Isolated Data
  const switchUserAccount = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    setCurrentUserPhone(cleanPhone);
    localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_USER_PHONE, cleanPhone);

    const keys = getUserStorageKeys(cleanPhone);
    const assignedMerchantId = getOrCreateSequentialMerchantId(cleanPhone, registeredAccounts);

    // 1. Load Merchant Profile from cache
    const savedMerchant = localStorage.getItem(keys.MERCHANT);
    if (savedMerchant) {
      try {
        const parsedProf = JSON.parse(savedMerchant);
        if (!parsedProf.merchantId || parsedProf.merchantId.startsWith('MANDI-')) {
          parsedProf.merchantId = assignedMerchantId;
        }
        setMerchantProfile(parsedProf);
      } catch {
        setMerchantProfile({ ...initialMerchantProfile, merchantId: assignedMerchantId });
      }
    } else {
      // Find account if registered
      const acct = registeredAccounts.find(
        (a) => a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone
      );
      if (acct && acct.role === 'merchant') {
        const newProf: MerchantProfile = {
          shopName: acct.shopOrVillage,
          ownerName: acct.fullName,
          photoUrl: acct.photoUrl || '',
          shopNumber: acct.shopNumber || '',
          marketYardName: acct.marketName || DEFAULT_MARKET_YARD_NAME,
          merchantId: acct.merchantId || assignedMerchantId,
          phoneNumber: `+91 ${cleanPhone}`,
          licenseNumber: acct.licenseOrCrop || '',
          defaultCommissionRate: 4,
          defaultExpenditureRate: 6,
          address: acct.shopAddress || '',
        };
        setMerchantProfile(newProf);
      } else {
        setMerchantProfile({ ...initialMerchantProfile, merchantId: assignedMerchantId });
      }
    }

    // Load Farmers
    const savedFarmers = localStorage.getItem(keys.FARMERS);
    if (savedFarmers) {
      try {
        const parsed = JSON.parse(savedFarmers);
        if (Array.isArray(parsed)) {
          setFarmers(
            deduplicateFarmers(
              parsed
                .filter((f) => f && typeof f === 'object')
                .map((f, idx) => ({
                  ...f,
                  id: (f.id && f.id !== 'undefined') ? String(f.id).trim() : `FM-${String(idx + 1).padStart(3, '0')}`,
                }))
            )
          );
        } else {
          setFarmers([]);
        }
      } catch {
        setFarmers([]);
      }
    } else {
      setFarmers([]);
    }

    // Load Lots
    const savedLots = localStorage.getItem(keys.LOTS);
    if (savedLots) {
      try {
        const parsed = JSON.parse(savedLots);
        setLots(deduplicateLots(sanitizeLotsCommission(Array.isArray(parsed) ? parsed : [])));
      } catch {
        setLots([]);
      }
    } else {
      setLots([]);
    }

    // Load Payments
    const savedPayments = localStorage.getItem(keys.PAYMENTS);
    if (savedPayments) {
      try {
        const parsed = JSON.parse(savedPayments);
        setPayments(deduplicatePayments(Array.isArray(parsed) ? parsed : []));
      } catch {
        setPayments([]);
      }
    } else {
      setPayments([]);
    }

    // Load Connection Requests from global store
    const savedRequests = localStorage.getItem(GLOBAL_STORAGE_KEYS.REQUESTS);
    if (savedRequests) {
      try {
        const parsed = JSON.parse(savedRequests);
        setConnectionRequests(deduplicateConnectionRequests(Array.isArray(parsed) ? parsed : []));
      } catch {
        setConnectionRequests([]);
      }
    } else {
      setConnectionRequests([]);
    }

    // Load Auto-Remove Parchi setting
    const savedAutoRemove = localStorage.getItem(keys.AUTO_REMOVE_PARCHI);
    setAutoRemoveParchiAfterPrintState(savedAutoRemove === 'true');

    // Load Audit Logs
    const savedAudit = localStorage.getItem(keys.AUDIT_LOGS);
    if (savedAudit) {
      try {
        const parsed = JSON.parse(savedAudit);
        setParchiAuditLogs(Array.isArray(parsed) ? parsed : []);
      } catch {
        setParchiAuditLogs([]);
      }
    } else {
      setParchiAuditLogs([]);
    }

    // Load Shipments
    const savedShipments = localStorage.getItem(keys.SHIPMENTS);
    if (savedShipments) {
      try {
        const parsed = JSON.parse(savedShipments);
        setShipments(deduplicateShipments(Array.isArray(parsed) ? parsed : []));
      } catch {
        setShipments([]);
      }
    } else {
      setShipments([]);
    }

    // Load Settlements
    const savedSettlements = localStorage.getItem(keys.SETTLEMENTS);
    if (savedSettlements) {
      try {
        const parsed = JSON.parse(savedSettlements);
        setSettlements(deduplicateSettlements(Array.isArray(parsed) ? parsed : []));
      } catch {
        setSettlements([]);
      }
    } else {
      setSettlements([]);
    }

    // Load Stocks
    const savedStocks = localStorage.getItem(keys.STOCKS);
    if (savedStocks) {
      try {
        const parsed = JSON.parse(savedStocks);
        setStocks(deduplicateStocks(Array.isArray(parsed) ? parsed : []));
      } catch {
        setStocks([]);
      }
    } else {
      setStocks([]);
    }

    // Load Employees
    const savedEmployees = localStorage.getItem(keys.EMPLOYEES);
    if (savedEmployees) {
      try {
        const parsed = JSON.parse(savedEmployees);
        setEmployees(deduplicateEmployees(Array.isArray(parsed) ? parsed : []));
      } catch {
        setEmployees([]);
      }
    } else {
      setEmployees([]);
    }

    // Restore User Role & Portal Mode & Commodities from account record
    if (cleanPhone.endsWith('9110387978')) {
      setPortalModeState('admin');
      localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, 'admin');
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_ROLE, 'admin');
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ONBOARDING_DONE, 'true');
    } else {
      const matchedAccount = registeredAccounts.find(
        (a) => a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone
      );
      if (matchedAccount) {
        setPortalModeState(matchedAccount.role);
        localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, matchedAccount.role);
        localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_ROLE, matchedAccount.role);
        localStorage.setItem(GLOBAL_STORAGE_KEYS.ONBOARDING_DONE, 'true');

        if (matchedAccount.selectedCommodities && matchedAccount.selectedCommodities.length > 0) {
          setUserCommoditiesState(matchedAccount.selectedCommodities);
          try {
            localStorage.setItem('bharatmandi_user_commodities', JSON.stringify(matchedAccount.selectedCommodities));
          } catch {}
        }
      }
    }

    // 2. Multi-Phone Cloud Restore: Fetch full previously saved account data from Cloud Firestore!
    if (cleanPhone && cleanPhone.length === 10) {
      fetchFromFirestore(cleanPhone).then((cloudData) => {
        if (!cloudData) return;
        if (cloudData.profile) {
          setMerchantProfile(cloudData.profile);
          try { localStorage.setItem(keys.MERCHANT, JSON.stringify(cloudData.profile)); } catch {}
        }
        if (Array.isArray(cloudData.farmers) && cloudData.farmers.length > 0) {
          const mergedFarmers = deduplicateFarmers(cloudData.farmers);
          setFarmers(mergedFarmers);
          try { localStorage.setItem(keys.FARMERS, JSON.stringify(mergedFarmers)); } catch {}
        }
        if (Array.isArray(cloudData.lots) && cloudData.lots.length > 0) {
          const mergedLots = deduplicateLots(sanitizeLotsCommission(cloudData.lots));
          setLots(mergedLots);
          try { localStorage.setItem(keys.LOTS, JSON.stringify(mergedLots)); } catch {}
        }
        if (Array.isArray(cloudData.payments) && cloudData.payments.length > 0) {
          const mergedPayments = deduplicatePayments(cloudData.payments);
          setPayments(mergedPayments);
          try { localStorage.setItem(keys.PAYMENTS, JSON.stringify(mergedPayments)); } catch {}
        }
        if (Array.isArray(cloudData.shipments) && cloudData.shipments.length > 0) {
          const mergedShipments = deduplicateShipments(cloudData.shipments);
          setShipments(mergedShipments);
          try { localStorage.setItem(keys.SHIPMENTS, JSON.stringify(mergedShipments)); } catch {}
        }
        if (Array.isArray(cloudData.settlements) && cloudData.settlements.length > 0) {
          const mergedSettlements = deduplicateSettlements(cloudData.settlements);
          setSettlements(mergedSettlements);
          try { localStorage.setItem(keys.SETTLEMENTS, JSON.stringify(mergedSettlements)); } catch {}
        }
        if (Array.isArray(cloudData.stocks) && cloudData.stocks.length > 0) {
          const mergedStocks = deduplicateStocks(cloudData.stocks);
          setStocks(mergedStocks);
          try { localStorage.setItem(keys.STOCKS, JSON.stringify(mergedStocks)); } catch {}
        }
        if (Array.isArray(cloudData.employees) && cloudData.employees.length > 0) {
          const mergedEmployees = deduplicateEmployees(cloudData.employees);
          setEmployees(mergedEmployees);
          try { localStorage.setItem(keys.EMPLOYEES, JSON.stringify(mergedEmployees)); } catch {}
        }
        if (Array.isArray(cloudData.registeredAccounts) && cloudData.registeredAccounts.length > 0) {
          setRegisteredAccounts((prev) => {
            const updated = deduplicateRegisteredAccounts([...cloudData.registeredAccounts, ...prev]);
            try { localStorage.setItem(GLOBAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      });
    }
  };

  // Verify Password & Login with Instant Local & Firestore Authentication
  const verifyPasswordAndLogin = async (
    identifier: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string; account?: RegisteredAccount; isLocked?: boolean }> => {
    const cleanPhone = identifier.replace(/\D/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return { success: false, error: 'Please enter a valid 10-digit registered mobile number.' };
    }

    if (!passwordInput || passwordInput.trim().length === 0) {
      return { success: false, error: 'Please enter your password.' };
    }

    // 1. Check in-memory registered accounts
    let foundAccount = registeredAccounts.find(
      (a) => a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone
    );

    // 2. Fallback to Cloud Firestore
    if (!foundAccount) {
      try {
        foundAccount = await fetchUserAccountByPhone(cleanPhone);
      } catch (err) {
        console.warn('Firestore fetch user account error:', err);
      }
    }

    // 3. Local Password Verification
    if (foundAccount) {
      let isMatch = false;
      if (foundAccount.password && foundAccount.password === passwordInput) {
        isMatch = true;
      } else if (foundAccount.pinHash && foundAccount.pinHash === passwordInput) {
        isMatch = true;
      } else if (foundAccount.pinHash) {
        try {
          isMatch = await verifyPasswordHash(passwordInput, foundAccount.pinHash);
        } catch {
          isMatch = false;
        }
      }

      if (isMatch) {
        setRegisteredAccounts((prev) => {
          const updated = deduplicateRegisteredAccounts([...prev, foundAccount!]);
          try {
            localStorage.setItem(GLOBAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
          } catch {}
          return updated;
        });

        switchUserAccount(foundAccount.phoneNumber);
        setPortalModeState(foundAccount.role || 'merchant');
        try {
          localStorage.setItem(GLOBAL_STORAGE_KEYS.ONBOARDING_DONE, 'true');
          localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_ROLE, foundAccount.role || 'merchant');
          localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, foundAccount.role || 'merchant');
          localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_USER_PHONE, cleanPhone);
        } catch {}
        return { success: true, account: foundAccount };
      } else {
        return { success: false, error: 'Incorrect password. Please re-enter your password.' };
      }
    }

    // 4. Server Endpoint Fallback
    const serverResult = await loginOnServer(cleanPhone, passwordInput);
    if (serverResult.success && serverResult.account) {
      const acct = serverResult.account;
      setRegisteredAccounts((prev) => deduplicateRegisteredAccounts([...prev, acct]));
      switchUserAccount(acct.phoneNumber);
      setPortalModeState(acct.role || 'merchant');
      try {
        localStorage.setItem(GLOBAL_STORAGE_KEYS.ONBOARDING_DONE, 'true');
        localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_ROLE, acct.role || 'merchant');
        localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, acct.role || 'merchant');
        localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_USER_PHONE, cleanPhone);
      } catch {}
      return { success: true, account: acct };
    }

    return {
      success: false,
      error: serverResult.error || 'Account not found for this mobile number. Please Sign Up first.',
    };
  };

  // Reset User Password
  const resetUserPassword = async (
    identifier: string,
    newPasswordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '').slice(-10);

    let targetAccount = registeredAccounts.find(
      (a) =>
        (cleanPhone && a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone) ||
        (a.email && a.email.trim().toLowerCase() === cleanId)
    );

    if (!targetAccount && cleanPhone && cleanPhone.length === 10) {
      targetAccount = await fetchUserAccountByPhone(cleanPhone);
    }

    if (!targetAccount) {
      return {
        success: false,
        error: 'No account found to reset password. Please check your registered mobile number.',
      };
    }

    const hashedPassword = await hashPassword(newPasswordInput);
    const passwordResetAt = new Date().toISOString();

    const updatedAccount: RegisteredAccount = {
      ...targetAccount,
      pinHash: hashedPassword,
      passwordResetAt,
    };
    delete (updatedAccount as any).password;

    // Invalidate local active session if it matches this account
    const activePhone = localStorage.getItem('bharatmandi_active_phone_v1') || '';
    if (activePhone.replace(/\D/g, '').slice(-10) === cleanPhone) {
      localStorage.removeItem('bharatmandi_onboarding_completed');
      localStorage.removeItem('bharatmandi_active_phone_v1');
    }

    // Update registeredAccounts state & localStorage
    const updatedAccounts = registeredAccounts.map((a) => {
      const aPhone = a.phoneNumber.replace(/\D/g, '').slice(-10);
      if (aPhone === cleanPhone || (a.email && a.email.trim().toLowerCase() === cleanId)) {
        return updatedAccount;
      }
      return a;
    });

    if (!updatedAccounts.some((a) => a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone)) {
      updatedAccounts.push(updatedAccount);
    }

    setRegisteredAccounts(updatedAccounts);
    try {
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
    } catch {}

    // Persist via server data sync route
    try {
      const cleanForSync = updatedAccounts.map((a: any) => ({
        ...a,
        pinHash: a.pinHash || a.password,
        passwordHash: a.passwordHash || a.pinHash || a.password,
      }));
      await syncToFirestore({ registeredAccounts: cleanForSync });
    } catch (err) {
      console.warn('Error syncing updated password account to server:', err);
    }

    return { success: true };
  };

  const changeUserPin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUserAccount) {
      return { success: false, error: 'No active logged-in account.' };
    }
    if (!currentPin) {
      return { success: false, error: 'Please enter your current 6-digit PIN.' };
    }
    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      return { success: false, error: 'New PIN must be exactly 6 numeric digits.' };
    }
    const { isWeakPin, verifyPasswordHash, hashPassword } = await import('../utils/cryptoUtils');
    if (isWeakPin(newPin)) {
      return {
        success: false,
        error: 'This PIN is too weak/simple (e.g. 111111, 123456, 000000). Please choose a stronger 6-digit PIN.',
      };
    }

    const accountPhone = currentUserAccount.phoneNumber.replace(/\D/g, '').slice(-10);
    const isCurrentValid = await verifyPasswordHash(
      currentPin,
      currentUserAccount.pinHash || currentUserAccount.password,
      currentUserAccount.password,
      accountPhone
    );

    if (!isCurrentValid) {
      return { success: false, error: 'Current 6-digit PIN is incorrect.' };
    }

    const hashedPin = await hashPassword(newPin, accountPhone);
    const updatedAccount: RegisteredAccount = {
      ...currentUserAccount,
      pinHash: hashedPin,
      password: hashedPin,
    };

    const updatedAccounts = registeredAccounts.map((a) => {
      const aPhone = a.phoneNumber.replace(/\D/g, '').slice(-10);
      if (aPhone === accountPhone) {
        return updatedAccount;
      }
      return a;
    });

    setRegisteredAccounts(updatedAccounts);
    try {
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
    } catch {}

    try {
      const cleanForSync = updatedAccounts.map((a: any) => ({
        ...a,
        pinHash: a.pinHash || a.password,
        passwordHash: a.passwordHash || a.pinHash || a.password,
      }));
      await syncToFirestore({ registeredAccounts: cleanForSync });
    } catch (err) {
      console.warn('Error syncing updated PIN to server:', err);
    }

    return { success: true };
  };
  const checkUniqueness = ({
    shopName,
    shopAddress,
    phoneNumber,
    excludePhone,
  }: {
    shopName?: string;
    shopAddress?: string;
    phoneNumber?: string;
    excludePhone?: string;
  }): UniquenessCheckResult => {
    const cleanExcludePhone = excludePhone ? excludePhone.replace(/\D/g, '').slice(-10) : '';

    const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');

    for (const acct of registeredAccounts) {
      const acctPhone = acct.phoneNumber.replace(/\D/g, '').slice(-10);
      if (cleanExcludePhone && acctPhone === cleanExcludePhone) {
        continue;
      }

      // Check Mobile uniqueness
      if (phoneNumber) {
        const cleanReqPhone = phoneNumber.replace(/\D/g, '').slice(-10);
        if (cleanReqPhone && acctPhone === cleanReqPhone) {
          return {
            valid: false,
            field: 'phoneNumber',
            message: 'This mobile number is already registered. Please log in.',
          };
        }
      }

      // Check Shop Name uniqueness
      if (shopName && acct.shopOrVillage) {
        const normShop = normalize(shopName);
        const normAcctShop = normalize(acct.shopOrVillage);
        if (normShop && normAcctShop && normShop === normAcctShop) {
          return {
            valid: false,
            field: 'shopName',
            message: `Shop name "${shopName}" is already registered by another merchant. Every shop must have a unique name.`,
          };
        }
      }

      // Check Shop Address uniqueness
      if (shopAddress && acct.shopAddress) {
        const normAddress = normalize(shopAddress);
        const normAcctAddress = normalize(acct.shopAddress);
        if (normAddress && normAcctAddress && normAddress === normAcctAddress) {
          return {
            valid: false,
            field: 'shopAddress',
            message: `Shop address "${shopAddress}" is already registered. Another shop cannot have the exact same address.`,
          };
        }
      }
    }

    return { valid: true };
  };

  // Register a new account
  const registerNewAccount = async (
    accountData: Omit<RegisteredAccount, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = accountData.phoneNumber.replace(/\D/g, '').slice(-10);
    
    // Validate Name: cannot contain numbers
    if (/[0-9]/.test(accountData.fullName)) {
      return {
        success: false,
        error: language === 'hi' ? 'नाम में संख्याएं नहीं हो सकतीं' : 'Name cannot contain numbers',
      };
    }

    // Validate Phone: must be exactly 10 digits
    if (!/^\d{10}$/.test(cleanPhone)) {
      return {
        success: false,
        error: language === 'hi' ? 'फ़ोन नंबर में ठीक 10 अंक होने चाहिए' : 'Phone number must contain exactly 10 digits',
      };
    }

    // Validate uniqueness locally
    const uniqueness = checkUniqueness({
      shopName: accountData.role === 'merchant' ? accountData.shopOrVillage : undefined,
      shopAddress: accountData.role === 'merchant' ? (accountData.shopAddress || accountData.shopOrVillage) : undefined,
      phoneNumber: cleanPhone,
    });

    if (!uniqueness.valid) {
      return { success: false, error: uniqueness.message };
    }

    // Also check Cloud Firestore to prevent duplicate registration from another device
    if (cleanPhone && cleanPhone.length === 10) {
      const existingCloudAcc = await fetchUserAccountByPhone(cleanPhone);
      if (existingCloudAcc) {
        return {
          success: false,
          error: 'This mobile number is already registered. Please log in.',
        };
      }
    }

    const assignedMerchantId = getOrCreateSequentialMerchantId(cleanPhone, registeredAccounts);
    const hashedPassword = accountData.password ? await hashPassword(accountData.password) : (accountData.pinHash || '');

    const { password: rawPassword, ...cleanAccountData } = accountData as any;

    const newAccount: RegisteredAccount = {
      ...cleanAccountData,
      pinHash: hashedPassword,
      id: `USR-${Date.now()}-${cleanPhone.slice(-4)}`,
      merchantId: assignedMerchantId,
      phoneNumber: cleanPhone,
      selectedCommodities: (accountData.selectedCommodities && accountData.selectedCommodities.length > 0)
        ? accountData.selectedCommodities
        : (userCommodities.length > 0 ? userCommodities : ['flowers']),
      createdAt: getTodayDateString(),
    };

    const updatedAccounts = [...registeredAccounts, newAccount];
    setRegisteredAccounts(updatedAccounts);
    try {
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
    } catch {}

    // Initialize Merchant Profile with assigned Merchant ID
    if (accountData.role === 'merchant') {
      const newProf: MerchantProfile = {
        shopName: accountData.shopOrVillage,
        ownerName: accountData.fullName,
        photoUrl: accountData.photoUrl || '',
        shopNumber: accountData.shopNumber || 'Shop No. 1',
        marketYardName: accountData.marketName || DEFAULT_MARKET_YARD_NAME,
        merchantId: assignedMerchantId,
        phoneNumber: `+91 ${cleanPhone}`,
        licenseNumber: accountData.licenseOrCrop || 'Verified Adathiya',
        defaultCommissionRate: 4,
        defaultExpenditureRate: 6,
        address: accountData.shopAddress || '',
        selectedCommodities: newAccount.selectedCommodities,
      };
      setMerchantProfile(newProf);
      const keys = getUserStorageKeys(cleanPhone);
      try {
        localStorage.setItem(keys.MERCHANT, JSON.stringify(newProf));
      } catch {}

      // Persist new account and merchant profile to Firestore immediately
      syncToFirestore({ registeredAccounts: [newAccount], profile: newProf }, cleanPhone);
    } else {
      syncToFirestore({ registeredAccounts: [newAccount] }, cleanPhone);
    }

    // Switch to this user immediately
    switchUserAccount(cleanPhone);
    return { success: true };
  };

  // Continuous Cloud Auto-Sync to Firestore by User Mobile Phone
  useEffect(() => {
    if (!currentUserPhone || currentUserPhone.length !== 10) return;
    const timer = setTimeout(() => {
      syncToFirestore(
        {
          profile: merchantProfile,
          farmers,
          lots,
          shipments,
          payments,
          settlements,
          stocks,
          employees,
          registeredAccounts,
        },
        currentUserPhone
      );
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    currentUserPhone,
    merchantProfile,
    farmers,
    lots,
    shipments,
    payments,
    settlements,
    stocks,
    employees,
    registeredAccounts,
  ]);

  // Real-time Firestore Listener for active user phone
  useEffect(() => {
    if (!currentUserPhone || currentUserPhone.length !== 10) return;
    const unsub = subscribeToFirestore(currentUserPhone, (updated) => {
      if (updated.profile) setMerchantProfile(updated.profile);
      if (updated.farmers) setFarmers(deduplicateFarmers(updated.farmers));
      if (updated.lots) setLots(deduplicateLots(sanitizeLotsCommission(updated.lots)));
      if (updated.shipments) setShipments(deduplicateShipments(updated.shipments));
      if (updated.payments) setPayments(deduplicatePayments(updated.payments));
      if (updated.settlements) setSettlements(deduplicateSettlements(updated.settlements));
      if (updated.stocks) setStocks(deduplicateStocks(updated.stocks));
      if (updated.employees) setEmployees(deduplicateEmployees(updated.employees));
    });
    return () => {
      if (unsub) unsub();
    };
  }, [currentUserPhone]);

  // Logout Current User
  const logoutCurrentUser = async () => {
    try {
      await logoutOnServer();
      localStorage.setItem('bharatmandi_onboarding_completed', 'false');
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ONBOARDING_DONE, 'false');
      localStorage.setItem('bharatmandi_active_user_phone', '');
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ACTIVE_USER_PHONE, '');
      localStorage.setItem('phoolmitra_active_phone_v1', '');
      localStorage.removeItem(GLOBAL_STORAGE_KEYS.ACTIVE_ROLE);
      localStorage.removeItem('bharatmandi_user_role');
      localStorage.removeItem('phoolmitra_user_role');
      localStorage.removeItem(GLOBAL_STORAGE_KEYS.PORTAL);
      localStorage.removeItem('bharatmandi_portal_v1');
      localStorage.removeItem('phoolmitra_portal_mode');
    } catch {
      // ignore
    }
    setCurrentUserPhone('');
    window.location.reload();
  };

  // Delete a specific registered account by phone number
  const deleteRegisteredAccount = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return;

    // 1. Remove all stored data for this user phone
    const keys = getUserStorageKeys(cleanPhone);
    Object.values(keys).forEach((storageKey) => {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    });

    // 2. Remove from registeredAccounts
    const updatedAccounts = registeredAccounts.filter(
      (a) => a.phoneNumber.replace(/\D/g, '').slice(-10) !== cleanPhone
    );
    setRegisteredAccounts(updatedAccounts);
    try {
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
    } catch {}

    // 3. If the deleted account was the currently active one
    if (currentUserPhone === cleanPhone) {
      if (updatedAccounts.length > 0) {
        // Switch to the first available account
        switchUserAccount(updatedAccounts[0].phoneNumber);
      } else {
        // No accounts left: perform clean reset to onboarding
        logoutCurrentUser();
      }
    }
  };

  // Delete current active account
  const deleteCurrentAccount = () => {
    if (currentUserPhone) {
      deleteRegisteredAccount(currentUserPhone);
    } else {
      logoutCurrentUser();
    }
  };

  // Delete Farmer profile from Farmer portal & session
  const deleteCurrentFarmerProfile = (farmerId?: string) => {
    const targetId = farmerId || activeFarmerId;
    if (targetId) {
      deleteFarmer(targetId);
    }
    if (currentUserPhone) {
      deleteRegisteredAccount(currentUserPhone);
    } else {
      logoutCurrentUser();
    }
  };

  // Sync to Global LocalStorage
  useEffect(() => {
    localStorage.setItem(GLOBAL_STORAGE_KEYS.LANG, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, portalMode);
  }, [portalMode]);

  useEffect(() => {
    localStorage.setItem(GLOBAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(registeredAccounts));
  }, [registeredAccounts]);

  // Sync isolated data to LocalStorage (works seamlessly for logged-in and default guest sessions)
  useEffect(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    localStorage.setItem(keys.MERCHANT, JSON.stringify(merchantProfile));
  }, [merchantProfile, currentUserPhone]);

  useEffect(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    localStorage.setItem(keys.FARMERS, JSON.stringify(farmers));
  }, [farmers, currentUserPhone]);

  useEffect(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    localStorage.setItem(keys.LOTS, JSON.stringify(lots));
  }, [lots, currentUserPhone]);

  useEffect(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    localStorage.setItem(keys.PAYMENTS, JSON.stringify(payments));
  }, [payments, currentUserPhone]);

  useEffect(() => {
    localStorage.setItem(GLOBAL_STORAGE_KEYS.REQUESTS, JSON.stringify(connectionRequests));
  }, [connectionRequests]);

  useEffect(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    localStorage.setItem(keys.AUDIT_LOGS, JSON.stringify(parchiAuditLogs));
  }, [parchiAuditLogs, currentUserPhone]);

  useEffect(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    localStorage.setItem(keys.SHIPMENTS, JSON.stringify(shipments));
  }, [shipments, currentUserPhone]);

  useEffect(() => {
    const cleanPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : 'default';
    const keys = getUserStorageKeys(cleanPhone);
    localStorage.setItem(keys.SETTLEMENTS, JSON.stringify(settlements));
  }, [settlements, currentUserPhone]);

  // 1. Initial Cloud Data Load on Mount or Sign-in
  const isInitialCloudLoadDoneRef = React.useRef(false);

  useEffect(() => {
    let isMounted = true;
    loadDataFromCloud().then((cloudData) => {
      if (!isMounted || !cloudData) {
        isInitialCloudLoadDoneRef.current = true;
        return;
      }

      // If cloud has records, restore them into local state
      if (cloudData.profile && cloudData.profile.shopName) {
        setMerchantProfile((prev) => ({ ...prev, ...cloudData.profile }));
      }
      if (Array.isArray(cloudData.farmers) && cloudData.farmers.length > 0) {
        const cleanFarmers = cloudData.farmers
          .filter((f) => f && typeof f === 'object')
          .map((f, idx) => ({
            ...f,
            id: (f.id && f.id !== 'undefined') ? String(f.id).trim() : `FM-${String(idx + 1).padStart(3, '0')}`,
          }));
        setFarmers((prev) => deduplicateFarmers([...prev, ...cleanFarmers]));
      }
      if (Array.isArray(cloudData.lots) && cloudData.lots.length > 0) {
        const cleanLots = cloudData.lots
          .filter((l) => l && typeof l === 'object')
          .map((l, idx) => ({
            ...l,
            id: (l.id && l.id !== 'undefined') ? String(l.id).trim() : `LOT-${String(idx + 1).padStart(4, '0')}`,
          }));
        setLots(deduplicateLots(sanitizeLotsCommission(cleanLots)));
      }
      if (Array.isArray(cloudData.shipments) && cloudData.shipments.length > 0) {
        const cleanShipments = cloudData.shipments
          .filter((s) => s && typeof s === 'object')
          .map((s, idx) => ({
            ...s,
            id: (s.id && s.id !== 'undefined') ? String(s.id).trim() : `SHIP-${String(idx + 1).padStart(4, '0')}`,
          }));
        setShipments(deduplicateShipments(cleanShipments));
      }
      if (Array.isArray(cloudData.payments) && cloudData.payments.length > 0) {
        const cleanPayments = cloudData.payments
          .filter((p) => p && typeof p === 'object')
          .map((p, idx) => ({
            ...p,
            id: (p.id && p.id !== 'undefined') ? String(p.id).trim() : `PAY-${String(idx + 1).padStart(4, '0')}`,
          }));
        setPayments(deduplicatePayments(cleanPayments));
      }
      if (Array.isArray(cloudData.settlements) && cloudData.settlements.length > 0) {
        const cleanSettlements = cloudData.settlements
          .filter((s) => s && typeof s === 'object')
          .map((s, idx) => ({
            ...s,
            id: (s.id && s.id !== 'undefined') ? String(s.id).trim() : `SETTLE-${String(idx + 1).padStart(4, '0')}`,
          }));
        setSettlements(deduplicateSettlements(cleanSettlements));
      }
      if (Array.isArray(cloudData.stocks) && cloudData.stocks.length > 0) {
        setStocks(deduplicateStocks(cloudData.stocks));
      }
      if (Array.isArray(cloudData.employees) && cloudData.employees.length > 0) {
        setEmployees(deduplicateEmployees(cloudData.employees));
      }
      if (Array.isArray(cloudData.registeredAccounts) && cloudData.registeredAccounts.length > 0) {
        setRegisteredAccounts((prev) => deduplicateRegisteredAccounts([...cloudData.registeredAccounts, ...prev]));
      }
      if (Array.isArray(cloudData.helpTickets) && cloudData.helpTickets.length > 0) {
        const cleanTickets = cloudData.helpTickets
          .filter((t) => t && typeof t === 'object')
          .map((t, idx) => ({
            ...t,
            id: (t.id && t.id !== 'undefined') ? String(t.id).trim() : `TCK-${String(idx + 1).padStart(4, '0')}`,
          }));
        setHelpTickets(deduplicateHelpTickets(cleanTickets));
      }
      isInitialCloudLoadDoneRef.current = true;
    }).catch(() => {
      isInitialCloudLoadDoneRef.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, [currentUserPhone, loadDataFromCloud]);

  // 2. Automatic Debounced Sync to Firestore whenever state updates
  useEffect(() => {
    if (!isAutoSyncEnabled) return;
    if (!isInitialCloudLoadDoneRef.current) return;

    scheduleAutoSync({
      profile: merchantProfile,
      farmers,
      lots,
      shipments,
      payments,
      settlements,
      stocks,
      employees,
      registeredAccounts,
      helpTickets,
    });
  }, [
    merchantProfile,
    farmers,
    lots,
    shipments,
    payments,
    settlements,
    stocks,
    employees,
    registeredAccounts,
    helpTickets,
    isAutoSyncEnabled,
  ]);

  const setLanguage = (_lang?: Language) => {
    setLanguageState('en');
    try {
      localStorage.setItem(GLOBAL_STORAGE_KEYS.LANG, 'en');
    } catch {
      // ignore
    }
  };

  const setPortalMode = (mode: PortalMode) => {
    if (currentUserPhone && currentUserPhone.endsWith('9110387978')) {
      setPortalModeState('admin');
      try { localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, 'admin'); } catch {}
      return;
    }
    const safeMode = mode === 'admin' ? 'merchant' : mode;
    setPortalModeState(safeMode);
    try { localStorage.setItem(GLOBAL_STORAGE_KEYS.PORTAL, safeMode); } catch {}
  };

  const updateMerchantProfile = (profile: Partial<MerchantProfile>) => {
    setMerchantProfile((prev) => {
      const updated = { ...prev, ...profile };
      // Granular Cloud Sync
      syncMerchantProfileToCloud(updated).catch(() => {});
      // Also sync back to registered account if matching
      if (currentUserPhone) {
        setRegisteredAccounts((allAccts) =>
          allAccts.map((a) => {
            if (a.phoneNumber.replace(/\D/g, '').slice(-10) === currentUserPhone && a.role === 'merchant') {
              return {
                ...a,
                fullName: updated.ownerName || a.fullName,
                shopOrVillage: updated.shopName || a.shopOrVillage,
                shopAddress: updated.address || a.shopAddress,
                shopNumber: updated.shopNumber || a.shopNumber,
                marketName: updated.marketYardName || a.marketName,
                licenseOrCrop: updated.licenseNumber || a.licenseOrCrop,
                photoUrl: updated.photoUrl || a.photoUrl,
              };
            }
            return a;
          })
        );
      }
      return updated;
    });
  };

  const addFarmer = (farmerData: Omit<Farmer, 'id' | 'createdAt'>): Farmer => {
    const cleanPhone = farmerData.phone ? farmerData.phone.replace(/\D/g, '').slice(-10) : '';
    const normName = (farmerData.name || '').trim().toLowerCase();
    const normVillage = (farmerData.village || '').trim().toLowerCase();

    const existingIndex = farmers.findIndex((f) => {
      const fp = f.phone ? f.phone.replace(/\D/g, '').slice(-10) : '';
      if (cleanPhone && cleanPhone.length === 10 && cleanPhone !== '9876543210' && fp === cleanPhone) return true;
      if (normName && f.name?.trim().toLowerCase() === normName && normVillage && f.village?.trim().toLowerCase() === normVillage) return true;
      return false;
    });

    if (existingIndex >= 0) {
      const existing = farmers[existingIndex];
      const updatedFarmer: Farmer = {
        ...existing,
        name: farmerData.name?.trim() || existing.name,
        phone: (cleanPhone && cleanPhone.length === 10) ? cleanPhone : existing.phone,
        village: farmerData.village?.trim() || existing.village,
        photoUrl: farmerData.photoUrl?.trim() || existing.photoUrl,
        primaryCrops: Array.isArray(farmerData.primaryCrops) && farmerData.primaryCrops.length > 0 ? farmerData.primaryCrops : existing.primaryCrops,
        connectedMerchantIds: Array.from(
          new Set([...(existing.connectedMerchantIds || []), ...(farmerData.connectedMerchantIds || []), merchantProfile.merchantId])
        ),
      };
      setFarmers((prev) => prev.map((f, i) => (i === existingIndex ? updatedFarmer : f)));
      syncFarmerToCloud(updatedFarmer).catch(() => {});
      return updatedFarmer;
    }

    let nextNum = farmers.length + 1;
    let newId = `FRM-${String(nextNum).padStart(4, '0')}`;
    while (farmers.some((f) => f && f.id === newId)) {
      nextNum++;
      newId = `FRM-${String(nextNum).padStart(4, '0')}`;
    }
    const currentMerchantId = merchantProfile.merchantId || `MANDI-${(currentUserPhone || '').slice(-4)}`;

    // Check if farmer has registered in app
    const registeredAcc = registeredAccounts.find(
      (a) => a.role === 'farmer' && a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone
    );

    const finalName = (registeredAcc && (!farmerData.name || farmerData.name.includes('Farmer (+91') || farmerData.name === 'General Mandi Farmer' || farmerData.name === 'Farmer Grower'))
      ? registeredAcc.fullName
      : farmerData.name;

    const finalVillage = (registeredAcc && (!farmerData.village || farmerData.village === 'Mandi Area'))
      ? (registeredAcc.shopOrVillage || 'Mandi Grower Belt')
      : farmerData.village;

    const newFarmer: Farmer = {
      ...farmerData,
      name: finalName,
      village: finalVillage,
      id: newId,
      createdAt: getTodayDateString(),
      connectedMerchantIds: farmerData.connectedMerchantIds && farmerData.connectedMerchantIds.length > 0
        ? Array.from(new Set([...farmerData.connectedMerchantIds, currentMerchantId]))
        : [currentMerchantId],
    };

    setFarmers((prev) => deduplicateFarmers([newFarmer, ...prev]));

    // Auto-create accepted connection request so data shows directly in farmer portal
    if (cleanPhone && cleanPhone.length === 10) {
      const cleanMerchantPhone = (merchantProfile.phoneNumber || currentUserPhone || '').replace(/\D/g, '').slice(-10);
      const autoReq: ConnectionRequest = {
        id: `req-auto-${Date.now()}-${cleanPhone.slice(-4)}`,
        senderRole: 'merchant',
        farmerId: newId,
        farmerName: farmerData.name,
        farmerPhone: cleanPhone,
        farmerVillage: farmerData.village || 'Mandi Grower Belt',
        merchantId: currentMerchantId,
        merchantName: merchantProfile.shopName || 'Mandi Merchant',
        merchantPhone: cleanMerchantPhone,
        merchantOwnerName: merchantProfile.ownerName,
        status: 'accepted',
        requestDate: getTodayDateString(),
      };

      setConnectionRequests((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              r.farmerPhone.replace(/\D/g, '').slice(-10) === cleanPhone &&
              r.merchantId === currentMerchantId
            )
        );
        return [autoReq, ...filtered];
      });
    }

    // Instant Cloud Sync
    syncFarmerToCloud(newFarmer).catch(() => {});
    return newFarmer;
  };

  const updateFarmer = (id: string, updated: Partial<Farmer>) => {
    if (!id || id === 'undefined') return;
    setFarmers((prev) => {
      const nextList = prev.map((f) => {
        if (f.id === id) {
          const merged = { ...f, ...updated };
          syncFarmerToCloud(merged).catch(() => {});
          return merged;
        }
        return f;
      });
      return nextList;
    });

    // Also update farmer fields across past lots and shipments
    if (updated.name || updated.village || updated.phone) {
      setLots((prev) =>
        prev.map((l) => {
          if (l.farmerId === id) {
            return {
              ...l,
              farmerName: updated.name || l.farmerName,
              farmerVillage: updated.village || l.farmerVillage,
              farmerPhone: updated.phone || l.farmerPhone,
            };
          }
          return l;
        })
      );
      setShipments((prev) =>
        prev.map((s) => {
          if (s.farmerId === id) {
            return {
              ...s,
              farmerName: updated.name || s.farmerName,
              farmerVillage: updated.village || s.farmerVillage,
              farmerPhone: updated.phone || s.farmerPhone,
            };
          }
          return s;
        })
      );
    }
  };

  const archiveFarmer = (id: string) => {
    if (!id || id === 'undefined') return;
    setFarmers((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const updated: Farmer = {
            ...f,
            isArchived: true,
            auditLogs: [
              ...(f.auditLogs || []),
              {
                id: `log-${Date.now()}`,
                action: 'archive',
                timestamp: new Date().toISOString(),
                details: 'Farmer archived from new entries',
              },
            ],
          };
          syncFarmerToCloud(updated).catch(() => {});
          return updated;
        }
        return f;
      })
    );
  };

  const deleteFarmer = (id: string) => {
    if (!id || id === 'undefined') return;
    const targetFarmer = farmers.find((f) => f.id === id);
    const cleanPhone = targetFarmer?.phone ? targetFarmer.phone.replace(/\D/g, '').slice(-10) : '';

    setFarmers((prev) => prev.filter((f) => f.id !== id));
    setRegisteredAccounts((prev) =>
      prev.filter((a) => {
        if (a.id === id) return false;
        if (cleanPhone && a.phoneNumber?.replace(/\D/g, '').slice(-10) === cleanPhone) return false;
        return true;
      })
    );
    setLots((prev) => prev.filter((l) => {
      const lotPhone = l.farmerPhone ? l.farmerPhone.replace(/\D/g, '').slice(-10) : '';
      if (l.farmerId === id) return false;
      if (cleanPhone && lotPhone === cleanPhone) return false;
      return true;
    }));
    setShipments((prev) => prev.filter((s) => {
      const sPhone = s.farmerPhone ? s.farmerPhone.replace(/\D/g, '').slice(-10) : '';
      if (s.farmerId === id) return false;
      if (cleanPhone && sPhone === cleanPhone) return false;
      return true;
    }));
    setPayments((prev) => prev.filter((p) => p.farmerId !== id));
    setSettlements((prev) => prev.filter((s) => s.farmerId !== id));
    setConnectionRequests((prev) => prev.filter((r) => {
      if (r.farmerId === id) return false;
      if (cleanPhone && r.farmerPhone?.replace(/\D/g, '').slice(-10) === cleanPhone) return false;
      return true;
    }));

    if (activeFarmerId === id) {
      setActiveFarmerId('');
    }
    deleteFarmerFromFirestore(id, currentUserPhone).catch(() => {});
    deleteFarmerFromCloud(id).catch(() => {});
  };

  // Add Sale Lot
  const addSaleLot = (lotData: Omit<SaleLot, 'id' | 'parchiNumber' | 'time'>): SaleLot => {
    const lotYear = activeSessionDate.split('-')[0] || '2026';
    const nextNum = lots.length + 1;
    const parchiNumber = `FC-${lotYear}-${String(nextNum).padStart(4, '0')}`;

    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newLot: SaleLot = {
      ...lotData,
      id: `lot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      parchiNumber,
      time,
      merchantId: lotData.merchantId || merchantProfile.merchantId || `MANDI-${currentUserPhone.slice(-4)}`,
      merchantName: lotData.merchantName || merchantProfile.shopName || 'Mandi Shop',
    };

    setLots((prev) => deduplicateLots([newLot, ...prev]));
    // Instant Cloud Sync
    syncLotToCloud(newLot).catch(() => {});

    // If payment recorded on lot creation
    if (newLot.amountPaid > 0) {
      const newPayment: PaymentRecord = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        farmerId: newLot.farmerId,
        farmerName: newLot.farmerName,
        lotId: newLot.id,
        parchiNumber: newLot.parchiNumber,
        amount: newLot.amountPaid,
        paymentMode: newLot.paymentMode || 'Cash',
        date: newLot.date,
        time: newLot.time,
        notes: newLot.notes || 'Direct lot auction payment',
        status: 'Completed',
      };
      setPayments((prev) => deduplicatePayments([newPayment, ...prev]));
      syncPaymentToCloud(newPayment).catch(() => {});
    }

    return newLot;
  };

  const updateSaleLot = (id: string, updated: Partial<SaleLot>) => {
    setLots((prev) => {
      const nextList = prev.map((l) => {
        if (l.id === id) {
          const merged = { ...l, ...updated };
          syncLotToCloud(merged).catch(() => {});
          return merged;
        }
        return l;
      });
      return nextList;
    });
  };

  const deleteSaleLot = (id: string) => {
    setLots((prev) => prev.filter((l) => l.id !== id));
    if (selectedParchiLot?.id === id) {
      setSelectedParchiLot(null);
    }
    deleteLotFromFirestore(id, currentUserPhone).catch(() => {});
    deleteLotFromCloud(id).catch(() => {});
  };

  // Add Consolidated Multi-Variety Shipment (Hamali and Transport deducted ONCE)
  const addShipment = (shipmentData: Omit<Shipment, 'id' | 'shipmentNumber' | 'time'>): Shipment => {
    const lotYear = (shipmentData.date || activeSessionDate).split('-')[0] || '2026';
    const nextNum = shipments.length + 1;
    const shipmentNumber = `FC-${lotYear}-${String(nextNum).padStart(4, '0')}`;
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const grossTotal = shipmentData.items.reduce((sum, item) => sum + (Number(item.grossTotal) || 0), 0);
    const transportCharge = Number(shipmentData.transportCharge) || 0;
    const hamaliCharge = Number(shipmentData.hamaliCharge) || 0;
    const commissionPercent = Number(shipmentData.commissionPercent) || 0;
    const commissionAmount = Number(shipmentData.commissionAmount) || (commissionPercent > 0 ? Math.round((grossTotal * commissionPercent) / 100) : 0);
    const netAmountAfterDailyCuts = Math.max(0, grossTotal - transportCharge - hamaliCharge - commissionAmount);

    const resolvedMerchantId = shipmentData.merchantId || merchantProfile.merchantId || `MANDI-${currentUserPhone.slice(-4)}`;
    const resolvedMerchantName = shipmentData.merchantName || merchantProfile.shopName || 'Flower Mandi';

    const newShipment: Shipment = {
      ...shipmentData,
      id: `shp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      shipmentNumber,
      time,
      grossTotal,
      transportCharge,
      hamaliCharge,
      commissionPercent,
      commissionAmount,
      netAmountAfterDailyCuts,
      paymentStatus: shipmentData.paymentStatus || 'Unpaid',
      amountPaid: shipmentData.amountPaid || 0,
      balanceDue: netAmountAfterDailyCuts - (shipmentData.amountPaid || 0),
      merchantId: resolvedMerchantId,
      merchantName: resolvedMerchantName,
    };

    setShipments((prev) => deduplicateShipments([newShipment, ...prev]));
    syncShipmentToCloud(newShipment).catch(() => {});

    // Synchronize lots so legacy views and audit trails stay fully functional
    newShipment.items.forEach((item, idx) => {
      const itemTransport = idx === 0 ? transportCharge : 0;
      const itemHamali = idx === 0 ? hamaliCharge : 0;
      const itemComm = commissionPercent > 0 ? Math.round((item.grossTotal * commissionPercent) / 100) : 0;
      const itemNet = Math.max(0, item.grossTotal - itemTransport - itemHamali - itemComm);

      // Compute item-level payment split matching shipment overall payment
      const itemPaid = newShipment.netAmountAfterDailyCuts > 0
        ? Math.min(itemNet, Math.round((newShipment.amountPaid * itemNet) / newShipment.netAmountAfterDailyCuts))
        : 0;
      const itemBalance = Math.max(0, itemNet - itemPaid);

      addSaleLot({
        commodityCategory: item.commodityCategory || 'flowers',
        date: newShipment.date,
        farmerId: newShipment.farmerId,
        farmerName: newShipment.farmerName,
        farmerVillage: newShipment.farmerVillage,
        farmerPhone: newShipment.farmerPhone,
        flowerVariety: item.flowerVariety,
        quantity: item.quantity,
        unit: item.unit,
        boxesCount: item.boxesCount,
        packagingType: item.packagingType,
        flowerQuality: item.flowerQuality,
        rate: item.rate,
        grossTotal: item.grossTotal,
        commissionPercent,
        commissionAmount: itemComm,
        transportCharges: itemTransport,
        ammaliCharges: itemHamali,
        otherExpenditures: {
          transport: itemTransport,
          hamali: itemHamali,
          misc: 0,
        },
        totalOtherExpenditures: itemTransport + itemHamali,
        farmerNetPayable: itemNet,
        paymentStatus: newShipment.paymentStatus,
        amountPaid: itemPaid,
        balanceDue: itemBalance,
        merchantId: newShipment.merchantId,
        merchantName: newShipment.merchantName,
        notes: newShipment.notes,
        shipmentId: newShipment.id,
      });
    });

    return newShipment;
  };

  const updateShipment = (id: string, updated: Partial<Shipment>) => {
    setShipments((prev) => {
      const nextList = prev.map((s) => {
        if (s.id === id) {
          const merged = { ...s, ...updated };
          syncShipmentToCloud(merged).catch(() => {});
          return merged;
        }
        return s;
      });
      return nextList;
    });
  };

  const deleteShipment = (id: string) => {
    setShipments((prev) => prev.filter((s) => s.id !== id));
    setLots((prev) => prev.filter((l) => l.shipmentId !== id && l.id !== id));
    if (selectedShipment?.id === id) {
      setSelectedShipment(null);
    }
    if (selectedParchiLot?.id === id || selectedParchiLot?.shipmentId === id) {
      setSelectedParchiLot(null);
    }
    deleteShipmentFromFirestore(id, currentUserPhone).catch(() => {});
    deleteShipmentFromCloud(id).catch(() => {});
  };

  const getShipmentsForDate = (date: string): Shipment[] => {
    return shipments.filter((s) => s.date === date);
  };

  // 15-Day Settlement & Period Settlement Calculation (supports Multi-Commodity filtering)
  const calculate15DaySettlement = (
    farmerId: string,
    periodStart: string,
    periodEnd: string,
    commissionPercent: number = 4,
    miscPercent: number = 2,
    commodityCategory: CommodityCategory | 'all' = 'all'
  ): FifteenDaySettlement => {
    const farmer = farmers.find((f) => f.id === farmerId);
    const farmerShipments = shipments.filter((s) => {
      if (s.farmerId !== farmerId) return false;
      if (s.date < periodStart || s.date > periodEnd) return false;
      if (commodityCategory !== 'all') {
        const hasMatchingItem = s.items.some((it) => (it.commodityCategory || s.commodityCategory || 'flowers') === commodityCategory);
        const matchesShipment = (s.commodityCategory || 'flowers') === commodityCategory;
        if (!hasMatchingItem && !matchesShipment) return false;
      }
      return true;
    });

    const totalGross = farmerShipments.reduce((sum, s) => sum + s.grossTotal, 0);
    const totalTransport = farmerShipments.reduce((sum, s) => sum + s.transportCharge, 0);
    const totalHamali = farmerShipments.reduce((sum, s) => sum + s.hamaliCharge, 0);
    const subtotalAfterCharges = Math.max(0, totalGross - totalTransport - totalHamali);
    const pendingAmountAfterDailyCuts = subtotalAfterCharges;
    const commissionAmount = Math.round((totalGross * commissionPercent) / 100);
    const miscAmount = Math.round((totalGross * miscPercent) / 100);
    const totalDeductionsCut = totalTransport + totalHamali + commissionAmount + miscAmount;
    const finalPayment = Math.max(0, totalGross - totalHamali - totalTransport - commissionAmount - miscAmount);

    const startParts = periodStart.split('-');
    const endParts = periodEnd.split('-');
    const periodLabel = `${startParts[0] || '2024'}-${startParts[1] || '09'} (${startParts[2] || '01'} to ${endParts[2] || '15'})`;

    return {
      id: `stl-${farmerId}-${periodStart}-${periodEnd}${commodityCategory !== 'all' ? `-${commodityCategory}` : ''}`,
      settlementNumber: `STL-${periodStart.replace(/-/g, '')}-${farmerId.slice(-3)}`,
      periodStart,
      periodEnd,
      periodLabel,
      farmerId,
      commodityCategory: commodityCategory !== 'all' ? commodityCategory : undefined,
      farmerName: farmer?.name || farmerShipments[0]?.farmerName || 'Farmer',
      farmerVillage: farmer?.village || farmerShipments[0]?.farmerVillage || 'Mandi Belt',
      farmerPhone: farmer?.phone || farmerShipments[0]?.farmerPhone,
      shipmentIds: farmerShipments.map((s) => s.id),
      totalShipmentsCount: farmerShipments.length,
      totalGross,
      totalTransport,
      totalHamali,
      subtotalAfterCharges,
      pendingAmountAfterDailyCuts,
      commissionPercent,
      commissionAmount,
      miscPercent,
      miscAmount,
      totalDeductionsCut,
      finalPayment,
      status: 'pending',
    };
  };

  const confirmSettlement = (
    settlement: FifteenDaySettlement,
    paymentMode: PaymentMode = 'Cash',
    paymentReference: string = ''
  ) => {
    const settledRecord: FifteenDaySettlement = {
      ...settlement,
      status: 'settled',
      settledAt: new Date().toISOString(),
      paymentMode,
      paymentReference,
    };

    setSettlements((prev) => [settledRecord, ...prev.filter((s) => s.id !== settlement.id)]);

    // Mark corresponding shipments as settled / Paid
    setShipments((prev) =>
      prev.map((s) => {
        if (settlement.shipmentIds.includes(s.id)) {
          return {
            ...s,
            isSettled: true,
            settlementId: settlement.id,
            paymentStatus: 'Paid',
            amountPaid: s.netAmountAfterDailyCuts,
            balanceDue: 0,
          };
        }
        return s;
      })
    );

    // Mark corresponding lots as settled / Paid
    setLots((prev) =>
      prev.map((l) => {
        const matchesFarmer =
          l.farmerId === settlement.farmerId ||
          (settlement.farmerName && l.farmerName.trim().toLowerCase() === settlement.farmerName.trim().toLowerCase());
        const inPeriod =
          (!settlement.periodStart || l.date >= settlement.periodStart) &&
          (!settlement.periodEnd || l.date <= settlement.periodEnd);
        const matchesShipment = l.shipmentId && settlement.shipmentIds.includes(l.shipmentId);
        if (matchesShipment || (matchesFarmer && inPeriod)) {
          return {
            ...l,
            paymentStatus: 'Paid',
            amountPaid: l.farmerNetPayable,
            balanceDue: 0,
            paymentMode: paymentMode || l.paymentMode || 'Cash',
            paymentReference: paymentReference || l.paymentReference,
          };
        }
        return l;
      })
    );

    // Record Payment
    const newPayment: PaymentRecord = {
      id: `pay-stl-${Date.now()}`,
      farmerId: settlement.farmerId,
      farmerName: settlement.farmerName,
      amount: settlement.finalPayment,
      paymentMode,
      referenceNumber: paymentReference || `15-Day Settlement (${settlement.periodLabel})`,
      date: activeSessionDate,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      notes: `15-Day Final Settlement: Net ₹${settlement.pendingAmountAfterDailyCuts} - Comm ₹${settlement.commissionAmount} = ₹${settlement.finalPayment}`,
      status: 'Completed',
    };
    setPayments((prev) => deduplicatePayments([newPayment, ...prev]));
  };

  const deleteSettlement = (id: string) => {
    const target = settlements.find((s) => s.id === id);
    if (target) {
      setShipments((prev) =>
        prev.map((s) => {
          if (target.shipmentIds.includes(s.id)) {
            return {
              ...s,
              isSettled: false,
              settlementId: undefined,
              paymentStatus: 'Unpaid',
              amountPaid: 0,
              balanceDue: s.netAmountAfterDailyCuts,
            };
          }
          return s;
        })
      );
    }
    setSettlements((prev) => prev.filter((s) => s.id !== id));
  };

  // Remove Parchi after printing with permanent Audit Trail
  const removeParchiWithAudit = (
    lotId: string,
    options?: { printedAt?: string; reason?: string }
  ): ParchiAuditLog | null => {
    const targetLot = lots.find((l) => l.id === lotId) || (selectedParchiLot?.id === lotId ? selectedParchiLot : null);
    if (!targetLot) return null;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const timestampStr = `${dateFormatted} • ${timeFormatted}`;

    const auditEntry: ParchiAuditLog = {
      id: `audit-${Date.now()}-${targetLot.parchiNumber}`,
      parchiNumber: targetLot.parchiNumber,
      lotId: targetLot.id,
      farmerId: targetLot.farmerId,
      farmerName: targetLot.farmerName,
      farmerPhone: targetLot.farmerPhone,
      farmerVillage: targetLot.farmerVillage,
      flowerVariety: targetLot.flowerVariety,
      flowerQuality: targetLot.flowerQuality,
      boxesCount: targetLot.boxesCount,
      quantity: targetLot.quantity,
      unit: targetLot.unit,
      rate: targetLot.rate,
      grossTotal: targetLot.grossTotal,
      commissionAmount: targetLot.commissionAmount,
      totalOtherExpenditures: targetLot.totalOtherExpenditures,
      farmerNetPayable: targetLot.farmerNetPayable,
      paymentStatus: targetLot.paymentStatus,
      amountPaid: targetLot.amountPaid,
      balanceDue: targetLot.balanceDue,
      parchiDate: targetLot.date,
      parchiTime: targetLot.time,
      printedAt: options?.printedAt || timestampStr,
      removedAt: timestampStr,
      actionBy: merchantProfile.shopName || 'Merchant Adathiya',
      reason: options?.reason || 'Printed and removed by merchant',
      archivedLot: { ...targetLot },
    };

    // Discard from active lots and shipments so it no longer appears in pending lists or reports
    if (targetLot.shipmentId) {
      setShipments((prev) => prev.filter((s) => s.id !== targetLot.shipmentId));
      setLots((prev) => prev.filter((l) => l.shipmentId !== targetLot.shipmentId && l.id !== lotId));
    } else {
      setLots((prev) => prev.filter((l) => l.id !== lotId));
    }

    // Archive in audit trail (newest first)
    setParchiAuditLogs((prev) => [auditEntry, ...prev]);

    // If this lot was currently opened in the parchi modal, clear it
    if (selectedParchiLot?.id === lotId || selectedParchiLot?.shipmentId === targetLot.shipmentId) {
      setSelectedParchiLot(null);
    }

    return auditEntry;
  };

  const restoreParchiFromAudit = (auditId: string): boolean => {
    const auditEntry = parchiAuditLogs.find((a) => a.id === auditId);
    if (!auditEntry || !auditEntry.archivedLot) return false;

    // Check if lot already exists in active lots
    setLots((prev) => {
      const exists = prev.some(
        (l) => l.id === auditEntry.archivedLot.id || l.parchiNumber === auditEntry.parchiNumber
      );
      if (exists) return prev;
      return [auditEntry.archivedLot, ...prev];
    });

    // Remove from audit logs
    setParchiAuditLogs((prev) => prev.filter((a) => a.id !== auditId));
    return true;
  };

  const clearParchiAuditLogs = () => {
    setParchiAuditLogs([]);
  };

  // Record separate payment
  const recordPayment = (paymentData: Omit<PaymentRecord, 'id' | 'time'>) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time,
    };

    setPayments((prev) => deduplicatePayments([newPayment, ...prev]));
    syncPaymentToCloud(newPayment).catch(() => {});

    // Update lot status if linked directly or settle dues across outstanding lots
    if (newPayment.lotId) {
      setLots((prev) =>
        prev.map((l) => {
          if (l.id === newPayment.lotId || l.shipmentId === newPayment.lotId || l.parchiNumber === newPayment.lotId) {
            const newAmountPaid = Math.min(l.farmerNetPayable, l.amountPaid + newPayment.amount);
            const newBalance = Math.max(0, l.farmerNetPayable - newAmountPaid);
            const newStatus: 'Paid' | 'Partial' | 'Unpaid' =
              newBalance <= 0 ? 'Paid' : newAmountPaid > 0 ? 'Partial' : 'Unpaid';
            return {
              ...l,
              amountPaid: newAmountPaid,
              balanceDue: newBalance,
              paymentStatus: newStatus,
              paymentMode: newPayment.paymentMode || l.paymentMode,
              paymentReference: newPayment.referenceNumber || l.paymentReference,
            };
          }
          return l;
        })
      );
      setShipments((prev) =>
        prev.map((s) => {
          if (s.id === newPayment.lotId || (s as any).parchiNumber === newPayment.lotId) {
            const newAmountPaid = Math.min(s.netAmountAfterDailyCuts, s.amountPaid + newPayment.amount);
            const newBalance = Math.max(0, s.netAmountAfterDailyCuts - newAmountPaid);
            const newStatus: 'Paid' | 'Partial' | 'Unpaid' =
              newBalance <= 0 ? 'Paid' : newAmountPaid > 0 ? 'Partial' : 'Unpaid';
            return {
              ...s,
              amountPaid: newAmountPaid,
              balanceDue: newBalance,
              paymentStatus: newStatus,
            };
          }
          return s;
        })
      );
    } else if (newPayment.farmerId || newPayment.farmerName) {
      // Settle outstanding lots of this farmer in order
      setLots((prev) => {
        let remainingToApply = newPayment.amount;
        return prev.map((l) => {
          const matchesFarmer =
            (newPayment.farmerId && l.farmerId === newPayment.farmerId) ||
            (newPayment.farmerName && l.farmerName.trim().toLowerCase() === newPayment.farmerName.trim().toLowerCase());
          if (matchesFarmer && l.balanceDue > 0 && remainingToApply > 0) {
            const settleAmount = Math.min(remainingToApply, l.balanceDue);
            remainingToApply -= settleAmount;
            const newAmountPaid = Math.min(l.farmerNetPayable, l.amountPaid + settleAmount);
            const newBalance = Math.max(0, l.farmerNetPayable - newAmountPaid);
            const newStatus: 'Paid' | 'Partial' | 'Unpaid' =
              newBalance <= 0 ? 'Paid' : newAmountPaid > 0 ? 'Partial' : 'Unpaid';
            return {
              ...l,
              amountPaid: newAmountPaid,
              balanceDue: newBalance,
              paymentStatus: newStatus,
              paymentMode: newPayment.paymentMode || l.paymentMode,
              paymentReference: newPayment.referenceNumber || l.paymentReference,
            };
          }
          return l;
        });
      });
      setShipments((prev) => {
        let remainingToApply = newPayment.amount;
        return prev.map((s) => {
          const matchesFarmer =
            (newPayment.farmerId && s.farmerId === newPayment.farmerId) ||
            (newPayment.farmerName && s.farmerName.trim().toLowerCase() === newPayment.farmerName.trim().toLowerCase());
          if (matchesFarmer && s.balanceDue > 0 && remainingToApply > 0) {
            const settleAmount = Math.min(remainingToApply, s.balanceDue);
            remainingToApply -= settleAmount;
            const newAmountPaid = Math.min(s.netAmountAfterDailyCuts, s.amountPaid + settleAmount);
            const newBalance = Math.max(0, s.netAmountAfterDailyCuts - newAmountPaid);
            const newStatus: 'Paid' | 'Partial' | 'Unpaid' =
              newBalance <= 0 ? 'Paid' : newAmountPaid > 0 ? 'Partial' : 'Unpaid';
            return {
              ...s,
              amountPaid: newAmountPaid,
              balanceDue: newBalance,
              paymentStatus: newStatus,
            };
          }
          return s;
        });
      });
    }
  };

  const deletePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
    deletePaymentFromCloud(id).catch(() => {});
  };

  const updateLotPaymentStatus = (
    lotId: string,
    paymentStatus: 'Paid' | 'Unpaid' | 'Partial',
    amountPaid?: number,
    paymentMode: PaymentRecord['paymentMode'] = 'Cash',
    paymentReference?: string,
    notes?: string
  ) => {
    let targetFarmerId = '';
    let targetFarmerName = '';
    let recordedAmount = 0;

    // 1. Update Lots
    setLots((prev) =>
      prev.map((l) => {
        if (l.id === lotId || l.shipmentId === lotId || (l.parchiNumber && l.parchiNumber === lotId)) {
          targetFarmerId = l.farmerId;
          targetFarmerName = l.farmerName;
          let newPaid = 0;
          let newStatus: 'Paid' | 'Unpaid' | 'Partial' = paymentStatus;
          if (paymentStatus === 'Paid') {
            newPaid = l.farmerNetPayable;
            newStatus = 'Paid';
          } else if (paymentStatus === 'Unpaid') {
            newPaid = 0;
            newStatus = 'Unpaid';
          } else {
            newPaid = amountPaid !== undefined ? Math.min(l.farmerNetPayable, Math.max(0, amountPaid)) : l.amountPaid;
            newStatus = newPaid >= l.farmerNetPayable ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
          }
          const newBalance = Math.max(0, l.farmerNetPayable - newPaid);
          recordedAmount = newPaid;

          return {
            ...l,
            paymentStatus: newStatus,
            amountPaid: newPaid,
            balanceDue: newBalance,
            paymentMode: newStatus === 'Unpaid' ? undefined : (paymentMode || l.paymentMode || 'Cash'),
            paymentReference: newStatus === 'Unpaid' ? undefined : (paymentReference !== undefined ? paymentReference : l.paymentReference),
            notes: notes !== undefined ? notes : l.notes,
          };
        }
        return l;
      })
    );

    // 2. Update Shipments
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id === lotId || s.shipmentNumber === lotId) {
          targetFarmerId = s.farmerId;
          targetFarmerName = s.farmerName;
          let newPaid = 0;
          let newStatus: 'Paid' | 'Unpaid' | 'Partial' = paymentStatus;
          if (paymentStatus === 'Paid') {
            newPaid = s.netAmountAfterDailyCuts;
            newStatus = 'Paid';
          } else if (paymentStatus === 'Unpaid') {
            newPaid = 0;
            newStatus = 'Unpaid';
          } else {
            newPaid = amountPaid !== undefined ? Math.min(s.netAmountAfterDailyCuts, Math.max(0, amountPaid)) : s.amountPaid;
            newStatus = newPaid >= s.netAmountAfterDailyCuts ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
          }
          const newBalance = Math.max(0, s.netAmountAfterDailyCuts - newPaid);
          recordedAmount = newPaid;

          return {
            ...s,
            paymentStatus: newStatus,
            amountPaid: newPaid,
            balanceDue: newBalance,
          };
        }
        return s;
      })
    );

    // 3. Update active Parchi lot modal in real-time
    setSelectedParchiLot((curr) => {
      if (!curr) return null;
      if (curr.id === lotId || curr.shipmentId === lotId || curr.parchiNumber === lotId) {
        let newPaid = 0;
        let newStatus: 'Paid' | 'Unpaid' | 'Partial' = paymentStatus;
        if (paymentStatus === 'Paid') {
          newPaid = curr.farmerNetPayable;
          newStatus = 'Paid';
        } else if (paymentStatus === 'Unpaid') {
          newPaid = 0;
          newStatus = 'Unpaid';
        } else {
          newPaid = amountPaid !== undefined ? Math.min(curr.farmerNetPayable, Math.max(0, amountPaid)) : curr.amountPaid;
          newStatus = newPaid >= curr.farmerNetPayable ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
        }
        const newBalance = Math.max(0, curr.farmerNetPayable - newPaid);

        return {
          ...curr,
          paymentStatus: newStatus,
          amountPaid: newPaid,
          balanceDue: newBalance,
          paymentMode: newStatus === 'Unpaid' ? undefined : (paymentMode || curr.paymentMode || 'Cash'),
          paymentReference: newStatus === 'Unpaid' ? undefined : (paymentReference !== undefined ? paymentReference : curr.paymentReference),
          notes: notes !== undefined ? notes : curr.notes,
        };
      }
      return curr;
    });

    // 4. Update payments log
    if (paymentStatus !== 'Unpaid' && recordedAmount > 0) {
      const now = new Date();
      const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const newPayment: PaymentRecord = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        farmerId: targetFarmerId,
        farmerName: targetFarmerName,
        date: activeSessionDate,
        time,
        amount: recordedAmount,
        paymentMode: paymentMode || 'Cash',
        referenceNumber: paymentReference,
        notes: notes || `Payment status changed to ${paymentStatus}`,
        lotId,
      };
      setPayments((prev) => deduplicatePayments([newPayment, ...prev]));
    }
  };

  // Connection Requests
  const acceptConnectionRequest = (requestId: string) => {
    let acceptedReq: ConnectionRequest | undefined;

    setConnectionRequests((prev) => {
      const updated = prev.map((r) => {
        if (r.id === requestId) {
          acceptedReq = { ...r, status: 'accepted' as const };
          return acceptedReq;
        }
        return r;
      });
      return updated;
    });

    // Also link farmer to merchant profile
    const req = connectionRequests.find((r) => r.id === requestId) || acceptedReq;
    if (req) {
      const cleanPhone = req.farmerPhone.replace(/\D/g, '').slice(-10);
      setFarmers((prev) => {
        const existingIdx = prev.findIndex((f) => f.phone.replace(/\D/g, '').slice(-10) === cleanPhone);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          const mIds = curr.connectedMerchantIds || [];
          if (!mIds.includes(req.merchantId)) {
            updated[existingIdx] = {
              ...curr,
              connectedMerchantIds: [...mIds, req.merchantId],
            };
          }
          return updated;
        } else {
          let nextNum = prev.length + 1;
          let newId = `FM-${String(nextNum).padStart(3, '0')}`;
          while (prev.some((f) => f && f.id === newId)) {
            nextNum++;
            newId = `FM-${String(nextNum).padStart(3, '0')}`;
          }
          const newFarmer: Farmer = {
            id: newId,
            name: req.farmerName || 'Farmer',
            phone: cleanPhone || '9876543210',
            village: req.farmerVillage || 'Local Mandi Belt',
            primaryCrops: ['Marigold (Banthi)'],
            connectedMerchantIds: [req.merchantId],
            createdAt: getTodayDateString(),
          };
          syncFarmerToCloud(newFarmer).catch(() => {});
          return [newFarmer, ...prev];
        }
      });
    }
  };

  const declineConnectionRequest = (requestId: string) => {
    setConnectionRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'declined' as const } : r))
    );
  };

  const sendConnectionRequest = (data: {
    senderRole: 'farmer' | 'merchant';
    farmerId?: string;
    farmerName: string;
    farmerPhone: string;
    farmerVillage?: string;
    merchantId: string;
    merchantName: string;
    merchantPhone?: string;
    merchantOwnerName?: string;
  }) => {
    const cleanFarmerPhone = data.farmerPhone.replace(/\D/g, '').slice(-10);
    const cleanMerchantPhone = data.merchantPhone ? data.merchantPhone.replace(/\D/g, '').slice(-10) : undefined;

    const newReq: ConnectionRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      senderRole: data.senderRole,
      farmerId: data.farmerId || `FM-${cleanFarmerPhone.slice(-4)}`,
      farmerName: data.farmerName,
      farmerPhone: cleanFarmerPhone,
      farmerVillage: data.farmerVillage || 'Mandi Grower Belt',
      merchantId: data.merchantId,
      merchantName: data.merchantName,
      merchantPhone: cleanMerchantPhone,
      merchantOwnerName: data.merchantOwnerName,
      status: 'pending',
      requestDate: getTodayDateString(),
    };

    setConnectionRequests((prev) => {
      // Don't add duplicate pending request
      const exists = prev.some(
        (r) =>
          r.farmerPhone.replace(/\D/g, '').slice(-10) === cleanFarmerPhone &&
          r.merchantId === newReq.merchantId &&
          r.status === 'pending'
      );
      if (exists) return prev;
      return [newReq, ...prev];
    });
  };



  // Get Pair-wise Connection Status between Farmer & Merchant
  const getConnectionStatus = useCallback(
    (farmerPhone: string, merchantIdOrPhone?: string): ConnectionStatus => {
      const cleanFarmerPhone = (farmerPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanFarmerPhone) return 'not_connected';

      const targetMerchantId = merchantIdOrPhone || merchantProfile.merchantId;
      const cleanMerchantPhone = (merchantProfile.phoneNumber || currentUserPhone || '').replace(/\D/g, '').slice(-10);

      // 1. Look up any existing connection requests
      const matchingReq = connectionRequests.find((r) => {
        const rFarmerPhone = (r.farmerPhone || '').replace(/\D/g, '').slice(-10);
        const rMerchantPhone = r.merchantPhone ? r.merchantPhone.replace(/\D/g, '').slice(-10) : '';
        const rMerchantId = r.merchantId;

        const farmerMatch = rFarmerPhone === cleanFarmerPhone;
        const merchantMatch =
          (targetMerchantId && (rMerchantId === targetMerchantId || rMerchantPhone === targetMerchantId)) ||
          (cleanMerchantPhone && rMerchantPhone === cleanMerchantPhone) ||
          (!merchantIdOrPhone && (rMerchantId === merchantProfile.merchantId || rMerchantPhone === cleanMerchantPhone));

        return farmerMatch && merchantMatch;
      });

      if (matchingReq) {
        if (matchingReq.status === 'accepted') return 'connected';
        if (matchingReq.status === 'declined') return 'declined';
        if (matchingReq.status === 'pending') {
          return matchingReq.senderRole === 'merchant' ? 'pending_from_merchant' : 'pending_from_farmer';
        }
      }

      // 2. Check if farmer profile already has this merchant ID in connectedMerchantIds
      const matchingFarmer = farmers.find(
        (f) => f.phone && f.phone.replace(/\D/g, '').slice(-10) === cleanFarmerPhone
      );
      if (matchingFarmer && targetMerchantId && matchingFarmer.connectedMerchantIds?.includes(targetMerchantId)) {
        return 'connected';
      }

      return 'not_connected';
    },
    [connectionRequests, merchantProfile.merchantId, merchantProfile.phoneNumber, currentUserPhone, farmers]
  );

  // Disconnect Farmer and Merchant
  const disconnectFarmerAndMerchant = useCallback(
    (farmerPhone: string, merchantIdOrPhone?: string) => {
      const cleanFarmerPhone = (farmerPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanFarmerPhone) return;

      const targetMerchantId = merchantIdOrPhone || merchantProfile.merchantId;
      const cleanMerchantPhone = (merchantProfile.phoneNumber || currentUserPhone || '').replace(/\D/g, '').slice(-10);

      // Update connection requests to declined / disconnected
      setConnectionRequests((prev) =>
        prev.map((r) => {
          const rFarmerPhone = (r.farmerPhone || '').replace(/\D/g, '').slice(-10);
          const rMerchantPhone = r.merchantPhone ? r.merchantPhone.replace(/\D/g, '').slice(-10) : '';
          const rMerchantId = r.merchantId;

          const farmerMatch = rFarmerPhone === cleanFarmerPhone;
          const merchantMatch =
            (targetMerchantId && (rMerchantId === targetMerchantId || rMerchantPhone === targetMerchantId)) ||
            (cleanMerchantPhone && rMerchantPhone === cleanMerchantPhone) ||
            (!merchantIdOrPhone && (rMerchantId === merchantProfile.merchantId || rMerchantPhone === cleanMerchantPhone));

          if (farmerMatch && merchantMatch) {
            return { ...r, status: 'declined' as const };
          }
          return r;
        })
      );

      // Remove from farmer's connectedMerchantIds
      setFarmers((prev) =>
        prev.map((f) => {
          if (f.phone && f.phone.replace(/\D/g, '').slice(-10) === cleanFarmerPhone) {
            return {
              ...f,
              connectedMerchantIds: (f.connectedMerchantIds || []).filter((id) => id !== targetMerchantId),
            };
          }
          return f;
        })
      );
    },
    [merchantProfile.merchantId, merchantProfile.phoneNumber, currentUserPhone]
  );

  // Auto-push / Sync Statement to Connected Farmer's Digital Portal
  const syncStatementToFarmer = useCallback(
    (statementData: Omit<SyncedFarmerStatement, 'id' | 'generatedAt'>): { success: boolean; reason?: string } => {
      const cleanPhone = (statementData.farmerPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanPhone) {
        return { success: false, reason: 'Farmer mobile number is missing.' };
      }

      const status = getConnectionStatus(cleanPhone, statementData.merchantId);
      if (status !== 'connected') {
        return {
          success: false,
          reason: 'Farmer and merchant are not mutually connected. Data sharing is locked until connected.',
        };
      }

      const now = new Date();
      const dateFormatted = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeFormatted = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const generatedAt = `${dateFormatted} • ${timeFormatted}`;

      const newStatement: SyncedFarmerStatement = {
        ...statementData,
        id: `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        generatedAt,
        farmerPhone: cleanPhone,
      };

      setSyncedStatements((prev) => {
        // Replace if already exists with same statementNumber & farmer & merchant, or prepend
        const filtered = prev.filter(
          (s) =>
            !(
              s.statementNumber === newStatement.statementNumber &&
              (s.farmerPhone || '').replace(/\D/g, '').slice(-10) === cleanPhone &&
              s.merchantId === newStatement.merchantId
            )
        );
        return [newStatement, ...filtered];
      });

      return { success: true };
    },
    [getConnectionStatus]
  );

  // Get synced statements for a farmer
  const getSyncedStatementsForFarmer = useCallback(
    (farmerPhone: string): SyncedFarmerStatement[] => {
      const cleanPhone = (farmerPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanPhone) return [];
      return syncedStatements.filter(
        (s) => (s.farmerPhone || '').replace(/\D/g, '').slice(-10) === cleanPhone
      );
    },
    [syncedStatements]
  );

  // Delete a synced statement
  const deleteSyncedStatement = useCallback((id: string) => {
    setSyncedStatements((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Translation helper
  const t = (key: string): string => {
    const langObj = translations[language] || translations.en;
    return langObj[key] || translations.en[key] || key;
  };

  // Active Trading Session Lots (Scoped to active commodity)
  const todayLots = useMemo(() => {
    return lots.filter((lot) => {
      if (lot.date !== activeSessionDate) return false;
      if (activeCommodityFilter !== 'all') {
        const lotCat = lot.commodityCategory || 'flowers';
        if (lotCat !== activeCommodityFilter) return false;
      }
      return true;
    });
  }, [lots, activeSessionDate, activeCommodityFilter]);

  // Active Trading Session Shipments (Scoped to active commodity)
  const todayShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (s.date !== activeSessionDate) return false;
      if (activeCommodityFilter !== 'all') {
        const matchCat =
          s.commodityCategory === activeCommodityFilter ||
          s.items.some((i) => (i.commodityCategory || 'flowers') === activeCommodityFilter);
        if (!matchCat) return false;
      }
      return true;
    });
  }, [shipments, activeSessionDate, activeCommodityFilter]);

  // Today metrics
  const todayTurnover = useMemo(() => {
    if (todayShipments.length > 0) {
      return todayShipments.reduce((acc, s) => acc + s.grossTotal, 0);
    }
    return todayLots.reduce((acc, l) => acc + l.grossTotal, 0);
  }, [todayShipments, todayLots]);

  const todayLotsCount = useMemo(() => {
    if (todayShipments.length > 0) return todayShipments.length;
    return todayLots.length;
  }, [todayShipments, todayLots]);

  const todayFarmersServed = useMemo(() => {
    if (todayShipments.length > 0) {
      const unique = new Set(todayShipments.map((s) => s.farmerId));
      return unique.size;
    }
    const unique = new Set(todayLots.map((l) => l.farmerId));
    return unique.size;
  }, [todayShipments, todayLots]);

  const todayTotalVolume = useMemo(() => {
    if (todayShipments.length > 0) {
      return todayShipments.reduce(
        (acc, s) => acc + s.items.reduce((itemSum, it) => itemSum + it.quantity, 0),
        0
      );
    }
    return todayLots.reduce((acc, l) => acc + l.quantity, 0);
  }, [todayShipments, todayLots]);

  const todayCommissionEarned = useMemo(() => {
    return todayLots.reduce((acc, l) => acc + l.commissionAmount, 0);
  }, [todayLots]);

  const todayTransportTotal = useMemo(() => {
    if (todayShipments.length > 0) {
      return todayShipments.reduce((acc, s) => acc + s.transportCharge, 0);
    }
    return todayLots.reduce((acc, l) => acc + (l.transportCharges || l.otherExpenditures?.transport || 0), 0);
  }, [todayShipments, todayLots]);

  const todayHamaliTotal = useMemo(() => {
    if (todayShipments.length > 0) {
      return todayShipments.reduce((acc, s) => acc + s.hamaliCharge, 0);
    }
    return todayLots.reduce((acc, l) => acc + (l.ammaliCharges || l.otherExpenditures?.hamali || 0), 0);
  }, [todayShipments, todayLots]);

  const todayFarmerNetTotal = useMemo(() => {
    if (todayShipments.length > 0) {
      return todayShipments.reduce((acc, s) => acc + s.netAmountAfterDailyCuts, 0);
    }
    return todayLots.reduce((acc, l) => acc + l.farmerNetPayable, 0);
  }, [todayShipments, todayLots]);

  const totalOutstandingDues = useMemo(() => {
    return lots
      .filter((l) => {
        if (activeCommodityFilter !== 'all') {
          const lotCat = l.commodityCategory || 'flowers';
          if (lotCat !== activeCommodityFilter) return false;
        }
        return true;
      })
      .reduce((acc, l) => acc + (l.balanceDue || 0), 0);
  }, [lots, activeCommodityFilter]);

  const totalPaidToDate = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  // Commodity-wise stats breakdown for Dashboard & Reports
  const commodityStats = useMemo(() => {
    const categories: (CommodityCategory | 'all')[] = ['all', 'flowers', 'grains', 'vegetables', 'fruits', 'spices'];
    const result: Record<CommodityCategory | 'all', {
      grossSales: number;
      totalDeductions: number;
      netEarnings: number;
      totalVolume: number;
      count: number;
      transportTotal: number;
      hamaliTotal: number;
      commissionTotal: number;
    }> = {
      all: { grossSales: 0, totalDeductions: 0, netEarnings: 0, totalVolume: 0, count: 0, transportTotal: 0, hamaliTotal: 0, commissionTotal: 0 },
      flowers: { grossSales: 0, totalDeductions: 0, netEarnings: 0, totalVolume: 0, count: 0, transportTotal: 0, hamaliTotal: 0, commissionTotal: 0 },
      grains: { grossSales: 0, totalDeductions: 0, netEarnings: 0, totalVolume: 0, count: 0, transportTotal: 0, hamaliTotal: 0, commissionTotal: 0 },
      vegetables: { grossSales: 0, totalDeductions: 0, netEarnings: 0, totalVolume: 0, count: 0, transportTotal: 0, hamaliTotal: 0, commissionTotal: 0 },
      fruits: { grossSales: 0, totalDeductions: 0, netEarnings: 0, totalVolume: 0, count: 0, transportTotal: 0, hamaliTotal: 0, commissionTotal: 0 },
      spices: { grossSales: 0, totalDeductions: 0, netEarnings: 0, totalVolume: 0, count: 0, transportTotal: 0, hamaliTotal: 0, commissionTotal: 0 },
    };

    // Calculate from todayShipments (or all shipments for this date)
    todayShipments.forEach((s) => {
      const cat = s.commodityCategory || 'flowers';
      const gross = s.grossTotal;
      const deductions = s.transportCharge + s.hamaliCharge;
      const net = s.netAmountAfterDailyCuts;
      const vol = s.items.reduce((sum, it) => sum + it.quantity, 0);

      // All
      result.all.grossSales += gross;
      result.all.totalDeductions += deductions;
      result.all.netEarnings += net;
      result.all.totalVolume += vol;
      result.all.count += 1;
      result.all.transportTotal += s.transportCharge;
      result.all.hamaliTotal += s.hamaliCharge;

      // Category specific
      if (result[cat]) {
        result[cat].grossSales += gross;
        result[cat].totalDeductions += deductions;
        result[cat].netEarnings += net;
        result[cat].totalVolume += vol;
        result[cat].count += 1;
        result[cat].transportTotal += s.transportCharge;
        result[cat].hamaliTotal += s.hamaliCharge;
      }
    });

    // Commission from lots
    todayLots.forEach((l) => {
      const cat = l.commodityCategory || 'flowers';
      result.all.commissionTotal += l.commissionAmount || 0;
      if (result[cat]) {
        result[cat].commissionTotal += l.commissionAmount || 0;
      }
    });

    return result;
  }, [todayShipments, todayLots]);

  // Stats for specific farmer (Scoped to active commodity or optional category and date range)
  const getFarmerStats = (
    farmerId: string,
    startDate?: string,
    endDate?: string,
    commodityCategory?: CommodityCategory | 'all'
  ) => {
    const filterCategory = commodityCategory !== undefined ? commodityCategory : activeCommodityFilter;
    const farmerLots = lots.filter((l) => {
      if (l.farmerId !== farmerId) return false;
      if (filterCategory !== 'all') {
        const lotCat = l.commodityCategory || 'flowers';
        if (lotCat !== filterCategory) return false;
      }
      if (startDate && l.date < startDate) return false;
      if (endDate && l.date > endDate) return false;
      return true;
    });
    const totalLots = farmerLots.length;
    const totalVolume = farmerLots.reduce((acc, l) => acc + l.quantity, 0);
    const totalTurnover = farmerLots.reduce((acc, l) => acc + l.grossTotal, 0);
    const totalNetPayable = farmerLots.reduce((acc, l) => acc + l.farmerNetPayable, 0);
    const totalPaid = farmerLots.reduce((acc, l) => acc + l.amountPaid, 0);
    const pendingDues = farmerLots.reduce((acc, l) => acc + l.balanceDue, 0);

    return {
      totalLots,
      totalVolume,
      totalTurnover,
      totalNetPayable,
      totalPaid,
      pendingDues,
    };
  };

  // Get shared lots for a specific farmer (strictly isolated: only this farmer's details, not other farmers)
  const getSharedLotsForFarmer = (farmerPhone: string, farmerName: string, farmerId?: string): SaleLot[] => {
    const cleanPhone = farmerPhone ? farmerPhone.replace(/\D/g, '').slice(-10) : '';
    const normalizedName = (farmerName || '').trim().toLowerCase();

    // Collect farmer IDs in farmers list that match this phone number or farmerId
    const matchingFarmerIds = new Set<string>();
    if (farmerId) matchingFarmerIds.add(farmerId);
    if (cleanPhone && cleanPhone.length === 10) {
      farmers.forEach((f) => {
        const fp = f.phone ? f.phone.replace(/\D/g, '').slice(-10) : '';
        if (fp === cleanPhone) {
          matchingFarmerIds.add(f.id);
        }
      });
    }

    // 1. Lots in the active session belonging specifically to this farmer
    const matchingLots = lots.filter((l) => {
      const lotPhone = l.farmerPhone ? l.farmerPhone.replace(/\D/g, '').slice(-10) : '';
      const lotName = (l.farmerName || '').trim().toLowerCase();

      // Check phone match
      if (cleanPhone && lotPhone && cleanPhone.length === 10 && lotPhone.length === 10) {
        if (lotPhone === cleanPhone) return true;
      }

      // Check farmer ID match
      if (l.farmerId && matchingFarmerIds.has(l.farmerId)) {
        return true;
      }

      // Check normalized name match
      if (normalizedName && lotName && (lotName === normalizedName || lotName.includes(normalizedName) || normalizedName.includes(lotName))) {
        return true;
      }

      return false;
    });

    // 2. Lots from connected merchants who have accepted connection with this farmer
    const acceptedRequests = connectionRequests.filter(
      (r) =>
        (r.status === 'accepted' || r.status === 'pending') &&
        r.farmerPhone.replace(/\D/g, '').slice(-10) === cleanPhone
    );

    const externalLots: SaleLot[] = [];
    for (const req of acceptedRequests) {
      if (req.merchantPhone) {
        const mKeys = getUserStorageKeys(req.merchantPhone);
        const savedLotsStr = localStorage.getItem(mKeys.LOTS);
        if (savedLotsStr) {
          try {
            const parsedLots: SaleLot[] = JSON.parse(savedLotsStr);
            if (Array.isArray(parsedLots)) {
              // ONLY lots for this specific farmer from this merchant!
              const merchantFarmerLots = parsedLots
                .filter((l) => {
                  const lotPhone = l.farmerPhone ? l.farmerPhone.replace(/\D/g, '').slice(-10) : '';
                  const lotName = (l.farmerName || '').trim().toLowerCase();
                  if (cleanPhone && lotPhone && cleanPhone.length === 10 && lotPhone.length === 10) {
                    return lotPhone === cleanPhone;
                  }
                  if (l.farmerId && matchingFarmerIds.has(l.farmerId)) {
                    return true;
                  }
                  return normalizedName && lotName && (lotName === normalizedName || lotName.includes(normalizedName) || normalizedName.includes(lotName));
                })
                .map((l) => ({
                  ...l,
                  merchantName: l.merchantName || req.merchantName,
                  merchantId: l.merchantId || req.merchantId,
                }));
              externalLots.push(...merchantFarmerLots);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // 3. Scan all merchant storage keys in localStorage for lots created for this farmer's phone
    if (cleanPhone && cleanPhone.length === 10) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('bharatmandi_') && key.endsWith('_lots_v2')) {
              const savedStr = localStorage.getItem(key);
              if (savedStr) {
                const parsedLots: SaleLot[] = JSON.parse(savedStr);
                if (Array.isArray(parsedLots)) {
                  parsedLots.forEach((l) => {
                    const lotPhone = l.farmerPhone ? l.farmerPhone.replace(/\D/g, '').slice(-10) : '';
                    if (
                      lotPhone === cleanPhone ||
                      (l.farmerId && matchingFarmerIds.has(l.farmerId)) ||
                      (normalizedName && l.farmerName && l.farmerName.trim().toLowerCase() === normalizedName)
                    ) {
                      externalLots.push(l);
                    }
                  });
                }
              }
            }
          }
        }
      } catch {
        // ignore storage restrictions
      }
    }

    // Merge and deduplicate by lot id
    const combined = [...matchingLots];
    for (const el of externalLots) {
      if (!combined.some((cl) => cl.id === el.id)) {
        combined.push(el);
      }
    }

    return combined;
  };

  // Export JSON Backup
  const exportBackupJSON = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      userPhone: currentUserPhone,
      merchantProfile,
      farmers,
      lots,
      shipments,
      payments,
      settlements,
      connectionRequests,
      autoRemoveParchiAfterPrint,
      parchiAuditLogs,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PhoolMitra-Backup-${currentUserPhone || 'User'}-${getTodayDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const importBackupJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.merchantProfile) setMerchantProfile(parsed.merchantProfile);
      if (Array.isArray(parsed.farmers)) {
        setFarmers(
          parsed.farmers
            .filter((f: any) => f && typeof f === 'object')
            .map((f: any, idx: number) => ({
              ...f,
              id: (f.id && f.id !== 'undefined') ? String(f.id).trim() : `FM-${String(idx + 1).padStart(3, '0')}`,
            }))
        );
      }
      if (Array.isArray(parsed.lots)) setLots(parsed.lots);
      if (Array.isArray(parsed.shipments)) setShipments(parsed.shipments);
      if (Array.isArray(parsed.payments)) setPayments(parsed.payments);
      if (Array.isArray(parsed.settlements)) setSettlements(parsed.settlements);
      if (Array.isArray(parsed.connectionRequests)) setConnectionRequests(parsed.connectionRequests);
      if (typeof parsed.autoRemoveParchiAfterPrint === 'boolean') {
        setAutoRemoveParchiAfterPrintState(parsed.autoRemoveParchiAfterPrint);
      }
      if (Array.isArray(parsed.parchiAuditLogs)) setParchiAuditLogs(parsed.parchiAuditLogs);
      return true;
    } catch {
      return false;
    }
  };

  // Reset all data for whole entire app to 100% zero data
  const resetAllData = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }

    setParchiAuditLogs([]);
    setAutoRemoveParchiAfterPrintState(false);

    setMerchantProfile(initialMerchantProfile);
    setFarmers([]);
    setLots([]);
    setShipments([]);
    setPayments([]);
    setSettlements([]);
    setStocks([]);
    setEmployees([]);
    setConnectionRequests([]);
    setSyncedStatements([]);
    setHelpTickets([]);
    setActiveSessionDate(getTodayDateString());
  };

  // Quick helper to test the empty morning state prompt on Dashboard
  const clearTodayLotsForTesting = () => {
    setLots((prev) => prev.filter((l) => l.date !== activeSessionDate));
  };

  const getLotsForDate = (date: string): SaleLot[] => {
    return lots.filter((l) => l.date === date);
  };

  const startNewDaySession = (newDate?: string) => {
    const target = newDate || getTodayDateString();
    setActiveSessionDate(target);
  };

  const clearDateLots = (date: string) => {
    setLots((prev) => prev.filter((l) => l.date !== date));
  };

  return (
    <MandiContext.Provider
      value={{
        language,
        setLanguage,
        portalMode,
        setPortalMode,
        merchantTab,
        setMerchantTab,
        farmerTab,
        setFarmerTab,
        activeFarmerId,
        setActiveFarmerId,
        currentUserPhone,
        currentUserAccount,
        registeredAccounts,
        switchUserAccount,
        verifyPasswordAndLogin,
        resetUserPassword,
        changeUserPin,
        registerNewAccount,
        checkUniqueness,
        logoutCurrentUser,
        deleteRegisteredAccount,
        deleteCurrentAccount,
        deleteCurrentFarmerProfile,
        activeSessionDate,
        setActiveSessionDate,
        merchantProfile,
        updateMerchantProfile,
        farmers,
        addFarmer,
        updateFarmer,
        deleteFarmer,
        archiveFarmer,
        lots,
        todayLots,
        addSaleLot,
        updateSaleLot,
        deleteSaleLot,
        shipments,
        todayShipments,
        addShipment,
        updateShipment,
        deleteShipment,
        getShipmentsForDate,
        settlements,
        calculate15DaySettlement,
        confirmSettlement,
        deleteSettlement,
        selectedShipment,
        setSelectedShipment,
        payments,
        recordPayment,
        deletePayment,
        updateLotPaymentStatus,
        connectionRequests,
        acceptConnectionRequest,
        declineConnectionRequest,
        sendConnectionRequest,
        getConnectionStatus,
        disconnectFarmerAndMerchant,

        syncedStatements,
        syncStatementToFarmer,
        deleteSyncedStatement,
        getSyncedStatementsForFarmer,
        selectedParchiLot,
        setSelectedParchiLot,
        isEditParchiOpen,
        setIsEditParchiOpen,
        editingParchiLot,
        setEditingParchiLot,
        openEditParchiModal,
        isGeneratePdfOpen,
        setIsGeneratePdfOpen,
        activePdfLot,
        setActivePdfLot,
        openPdfModalForLot,
        openPdfModalForShipment,
        openParchiSlipForShipment,
        autoRemoveParchiAfterPrint,
        setAutoRemoveParchiAfterPrint,
        parchiAuditLogs,
        isAuditTrailOpen,
        setIsAuditTrailOpen,
        removeParchiWithAudit,
        restoreParchiFromAudit,
        clearParchiAuditLogs,
        isQRModalOpen,
        setIsQRModalOpen,
        customVarietyNames,
        addCustomVarietyName,
        getSuggestedVarietyNames,
        isSettingsOpen,
        setIsSettingsOpen,
        isPortalSelectorOpen,
        setIsPortalSelectorOpen,
        isToolsModalOpen,
        setIsToolsModalOpen,
        isOwnerSignUpOpen,
        setIsOwnerSignUpOpen,
        isFarmerSignUpOpen,
        setIsFarmerSignUpOpen,
        isDateSwitcherOpen,
        setIsDateSwitcherOpen,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        isMorningRushOpen,
        setIsMorningRushOpen,
        isFarmerPhoneOpen,
        setIsFarmerPhoneOpen,
        helpTickets,
        isHelpDeskOpen,
        setIsHelpDeskOpen,
        helpDeskTab,
        setHelpDeskTab,
        selectedHelpTicketId,
        setSelectedHelpTicketId,
        openHelpDesk,
        createHelpTicket,
        updateHelpTicketStatus,
        assignHelpTicket,
        addTicketResponse,
        deleteHelpTicket,
        userCommodities,
        setUserCommodities,
        activeCommodityFilter,
        setActiveCommodityFilter,
        commodityStats,
        t,
        todayTurnover,
        todayLotsCount,
        todayFarmersServed,
        todayTotalVolume,
        todayCommissionEarned,
        todayTransportTotal,
        todayHamaliTotal,
        todayFarmerNetTotal,
        totalOutstandingDues,
        totalPaidToDate,
        getFarmerStats,
        getSharedLotsForFarmer,
        getLotsForDate,
        startNewDaySession,
        clearDateLots,
        exportBackupJSON,
        importBackupJSON,
        resetAllData,
        clearTodayLotsForTesting,
        dashboardTab,
        setDashboardTab,
        consignmentSearchQuery,
        setConsignmentSearchQuery,
        stocks,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        recordEmployeePayment,
        merchantSection,
        setMerchantSection,
        retailers,
        addRetailer,
        updateRetailer,
        deleteRetailer,
        retailerSales,
        addRetailerSale,
        deleteRetailerSale,
        retailerPayments,
        addRetailerPayment,
        deleteRetailerPayment,
        firebaseAutoSaveStatus: autoSaveStatus,
        isFirebaseAutoSyncEnabled: isAutoSyncEnabled,
      }}
    >
      {children}
    </MandiContext.Provider>
  );
};

export const useMandi = (): MandiContextType => {
  const context = useContext(MandiContext);
  if (!context) {
    throw new Error('useMandi must be used within a MandiProvider');
  }
  return context;
};
