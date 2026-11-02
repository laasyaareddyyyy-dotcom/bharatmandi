export type Language =
  | 'en'
  | 'hi'
  | 'te'
  | 'kn'
  | 'ta'
  | 'mr'
  | 'gu'
  | 'bn'
  | 'pa'
  | 'ml'
  | 'or'
  | 'as'
  | 'ur'
  | 'mai'
  | 'sat'
  | 'ks'
  | 'ne'
  | 'kok'
  | 'doi'
  | 'mni'
  | 'brx'
  | 'sa'
  | 'sd';

export type PortalMode = 'merchant' | 'farmer' | 'admin' | 'flowchart';
export type Role = 'merchant' | 'farmer' | 'admin';

export type CommodityCategory = 'flowers' | 'grains' | 'vegetables' | 'fruits' | 'spices';

export type MerchantSection = 'wholesaler' | 'retailer';

export type MerchantTab =
  | 'dashboard'
  | 'new-sale'
  | 'farmers'
  | 'payments'
  | 'settlement'
  | 'settings'
  | 'stock'
  | 'employees'
  | 'retailers'
  | 'support';

export type FarmerTab =
  | 'parchi'
  | 'khata'
  | 'statements'
  | 'search-merchants'
  | 'requests'
  | 'profile';

export type WeightUnit = 'Kgs' | 'Bags' | 'Bunches' | 'Crates' | 'Quintals' | 'Boxes' | 'Baskets';

export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

export type PaymentMode = 'Cash' | 'PhonePe' | 'Google Pay' | 'Paytm' | 'UPI' | 'Bank Transfer' | 'Online';

export type QualityGrade = 'Grade A / Premium' | 'Grade B / Good' | 'Grade C / Fair' | 'Good' | 'Average' | 'Bad';

export type FlowerQuality = QualityGrade;

export interface CommodityChargeSettings {
  defaultCommissionRate: number;
  defaultHamaliRate: number;
  defaultTransportRate: number;
  defaultStorageRate?: number;
  packingCost?: number;
}

export interface Expenditures {
  transport?: number;
  hamali?: number; // coolie / loading / ammali
  kanta?: number; // weighing charges
  weighing?: number;
  mandiCess?: number; // market fee
  packingCharges?: number; // gunny bag / plastic crates / storage
  storageCharges?: number;
  advanceDeduction?: number;
  misc: number; // miscellaneous amount
  miscPercent?: number; // miscellaneous percentage
  miscNote?: string;
}

export interface SaleLot {
  id: string;
  parchiNumber: string; // e.g. PK-20260911-001
  date: string; // YYYY-MM-DD
  time: string; // HH:mm AM/PM
  commodityCategory?: CommodityCategory;
  farmerId: string;
  farmerName: string;
  farmerVillage: string;
  farmerPhone?: string;
  flowerVariety: string; // Crop variety name
  quantity: number; // No. of Kgs or primary units
  unit: WeightUnit;
  boxesCount?: number; // No. of Boxes/Bags/Crates/Baskets
  packagingType?: string; // 'Boxes' | 'Bags' | 'Crates' | 'Baskets' | 'Packets' | 'Bunches'
  packagingCount?: number;
  flowerQuality?: QualityGrade; // Quality grade
  qualityGrade?: QualityGrade;
  rate: number; // ₹ per unit
  grossTotal: number; // quantity * rate
  commissionPercent: number; // e.g. 4%
  commissionAmount: number; // grossTotal * (commissionPercent / 100)
  ammaliCharges?: number; // Ammali / Hamali deduction
  transportCharges?: number; // Transport deduction
  storageCharges?: number;
  otherExpenditures: Expenditures;
  totalOtherExpenditures: number;
  farmerNetPayable: number; // grossTotal - commissionAmount - ammali - transport - misc
  paymentStatus: PaymentStatus;
  amountPaid: number;
  balanceDue: number; // farmerNetPayable - amountPaid
  paymentMode?: PaymentMode;
  paymentReference?: string; // UPI UTR or receipt #
  notes?: string;
  merchantId?: string;
  merchantName?: string;
  shipmentId?: string;
  workerId?: string;
  workerName?: string;
  isWorkerEntry?: boolean;
}

export interface ShipmentItem {
  id: string;
  commodityCategory?: CommodityCategory;
  flowerVariety: string;
  quantity: number; // e.g. 50 kg or 2 quintals
  unit: WeightUnit; // Kgs / Bags / Bunches / Crates / Quintals
  rate: number; // ₹ per unit
  grossTotal: number; // quantity * rate
  boxesCount?: number;
  packagingType?: string;
  packagingCount?: number;
  flowerQuality?: QualityGrade;
  qualityGrade?: QualityGrade;
}

export interface Shipment {
  id: string;
  shipmentNumber: string; // e.g. SHP-20240915-001
  date: string; // YYYY-MM-DD
  time: string; // HH:mm AM/PM
  commodityCategory?: CommodityCategory;
  farmerId: string;
  farmerName: string;
  farmerVillage: string;
  farmerPhone?: string;
  items: ShipmentItem[];
  grossTotal: number; // sum of item grossTotals (e.g. ₹4,000)
  transportCharge: number; // deducted ONCE per shipment (e.g. ₹75)
  hamaliCharge: number; // deducted ONCE per shipment (e.g. ₹50)
  storageCharge?: number;
  commissionPercent?: number; // e.g. 0% or 4%
  commissionAmount?: number; // e.g. ₹0
  netAmountAfterDailyCuts: number; // grossTotal - transportCharge - hamaliCharge - commissionAmount (e.g. ₹3,875)
  paymentStatus: PaymentStatus;
  amountPaid: number;
  balanceDue: number;
  isSettled?: boolean;
  settlementId?: string;
  notes?: string;
  merchantId?: string;
  merchantName?: string;
  workerId?: string;
  workerName?: string;
  isWorkerEntry?: boolean;
}

export interface FifteenDaySettlement {
  id: string;
  settlementNumber: string; // e.g. STL-202409-01
  periodStart: string; // e.g. "2024-09-01"
  periodEnd: string; // e.g. "2024-09-15"
  periodLabel: string; // e.g. "Sep 1-15, 2024"
  commodityCategory?: CommodityCategory | 'all';
  farmerId: string;
  farmerName: string;
  farmerVillage: string;
  farmerPhone?: string;
  shipmentIds: string[];
  totalShipmentsCount: number;
  totalGross: number;
  totalTransport: number;
  totalHamali: number;
  totalStorage?: number;
  subtotalAfterCharges: number; // totalGross - totalHamali - totalTransport
  pendingAmountAfterDailyCuts: number; // e.g. ₹13,850
  commissionPercent: number; // e.g. 4%
  commissionAmount: number; // e.g. ₹554
  miscPercent?: number; // e.g. 2%
  miscAmount?: number; // e.g. ₹277
  totalDeductionsCut?: number; // totalHamali + totalTransport + commissionAmount + miscAmount
  finalPayment: number; // e.g. ₹13,019
  status: 'pending' | 'settled';
  settledAt?: string;
  paymentMode?: PaymentMode;
  paymentReference?: string;
  notes?: string;
}

export type FarmerType = 'Grower / Kisan' | 'Trader' | 'Other';

export interface FarmerAuditLog {
  id: string;
  action: 'add' | 'edit' | 'archive' | 'delete';
  timestamp: string;
  details?: string;
}

export interface Farmer {
  id: string; // e.g. FRM-0001
  farmerCode?: string;
  name: string;
  phone: string;
  village: string;
  address?: string;
  farmerType?: FarmerType;
  commoditiesGrown?: CommodityCategory[];
  primaryCrops: string[];
  notes?: string;
  isArchived?: boolean;
  connectedMerchantIds: string[];
  createdAt: string;
  photoUrl?: string;
  auditLogs?: FarmerAuditLog[];
}

export interface PaymentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  farmerId: string;
  farmerName: string;
  amount: number;
  commodityCategory?: CommodityCategory;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  lotId?: string;
  parchiNumber?: string;
  status?: string;
}

export interface MerchantProfile {
  shopName: string;
  ownerName?: string; // photo and name of owner
  photoUrl?: string; // photo of owner
  logoUrl?: string; // logo of shop
  shopNumber: string;
  marketYardName: string;
  merchantId: string;
  phoneNumber: string;
  licenseNumber: string;
  gstin?: string;
  signatoryLabel?: string;
  defaultCommissionRate: number;
  defaultExpenditureRate?: number;
  defaultLoadingChargePerUnit?: number;
  selectedCommodities?: CommodityCategory[];
  commoditySettings?: Partial<Record<CommodityCategory, CommodityChargeSettings>>;
  address: string;
}

export type ConnectionStatus =
  | 'not_connected'
  | 'pending_from_merchant'
  | 'pending_from_farmer'
  | 'connected'
  | 'declined';

export interface SyncedFarmerStatementItem {
  flowerVariety?: string;
  cropVariety?: string;
  lotId?: string;
  quantity: number;
  unit: string;
  rate: number;
  grossTotal: number;
  date?: string;
  parchiNumber?: string;
  quality?: string;
  boxesCount?: number;
}

export interface SyncedFarmerStatement {
  id: string;
  statementNumber: string;
  type: 'form_c' | 'farmer_katha' | 'settlement';
  title?: string;
  date: string;
  dateRange?: string;
  generatedAt: string;
  merchantId: string;
  merchantName: string;
  merchantOwnerName?: string;
  merchantPhone?: string;
  merchantShopNumber?: string;
  merchantMarketName?: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmerVillage?: string;
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
  lotsCount: number;
  grossTotal: number;
  totalDeductions: number;
  commissionAmount: number;
  hamaliAmount: number;
  transportAmount: number;
  transportCharges?: number;
  hamaliCharges?: number;
  miscAmount: number;
  farmerNetPayable: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'Unpaid' | 'Paid' | 'Partial';
  itemsSummary?: string;
  items?: SyncedFarmerStatementItem[];
  commodityCategory?: CommodityCategory;
  pdfFileName?: string;
  notes?: string;
}

export interface ConnectionRequest {
  id: string;
  senderRole: 'farmer' | 'merchant';
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmerVillage: string;
  merchantId: string;
  merchantName: string;
  merchantPhone?: string;
  merchantOwnerName?: string;
  status: 'pending' | 'accepted' | 'declined';
  requestDate: string;
}

export interface RegisteredAccount {
  id: string;
  merchantId?: string;
  username?: string;
  phoneNumber: string;
  email?: string;
  password?: string;
  pinHash?: string;
  role: Role;
  fullName: string;
  shopOrVillage: string;
  licenseOrCrop: string;
  selectedCommodities?: CommodityCategory[];
  commoditySettings?: Partial<Record<CommodityCategory, CommodityChargeSettings>>;
  shopAddress?: string;
  shopNumber?: string;
  state?: string;
  marketName?: string;
  mandiLicense?: string;
  photoUrl?: string;
  passwordResetAt?: string;
  createdAt: string;
}

export interface SavedProfile {
  id: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  shopOrVillage?: string;
  photoUrl?: string;
}

export interface ReportFilters {
  reportType: 'daily' | 'farmer' | 'dateRange' | 'farmer-search';
  commodityCategory?: CommodityCategory | 'all';
  singleDate: string; // for daily
  startDate: string; // for dateRange or farmer
  endDate: string; // for dateRange or farmer
  farmerId: string; // for farmer report
  searchQuery: string;
  statusFilter: 'all' | 'Paid' | 'Partial' | 'Unpaid';
}

export interface MonthlySalesSummary {
  month: string; // e.g. "2026-09"
  monthLabel: string; // e.g. "Sep 2026"
  commodityCategory?: CommodityCategory | 'all';
  merchantId?: string;
  merchantName?: string;
  lotsCount: number;
  totalVolume: number;
  grossTotal: number;
  commissionAmount: number;
  totalOtherExpenditures: number;
  farmerNetPayable: number;
  amountPaid: number;
  balanceDue: number;
  settlementRate: number; // percentage (0-100)
}

export interface FarmerSearchResult {
  farmerId: string;
  name: string;
  phone: string;
  village: string;
  primaryCrops: string[];
  commoditiesGrown?: CommodityCategory[];
  photoUrl?: string;
  connectedMerchantIds?: string[];
  totalLotsCount?: number;
  totalTurnover?: number;
  pendingDues?: number;
}

export interface ParchiAuditLog {
  id: string;
  parchiNumber: string;
  lotId: string;
  commodityCategory?: CommodityCategory;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  farmerVillage?: string;
  flowerVariety: string;
  flowerQuality?: QualityGrade;
  qualityGrade?: QualityGrade;
  boxesCount?: number;
  packagingType?: string;
  packagingCount?: number;
  quantity: number;
  unit: string;
  rate: number;
  grossTotal: number;
  commissionAmount: number;
  totalOtherExpenditures?: number;
  farmerNetPayable: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  amountPaid: number;
  balanceDue: number;
  parchiDate: string;
  parchiTime: string;
  printedAt: string;
  removedAt: string;
  actionBy: string;
  reason: string;
  archivedLot: SaleLot;
}

export type HelpTicketCategory =
  | 'Technical Issue'
  | 'Account Problem'
  | 'Payment/Settlement Issue'
  | 'Report/Invoice Issue'
  | 'Feature Request'
  | 'Other';

export type HelpTicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type HelpTicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface TicketAttachment {
  id: string;
  name?: string;
  url?: string;
  fileName?: string;
  fileUrl?: string;
  size?: string;
  fileSize?: string;
  type?: string;
  fileType?: 'image' | 'pdf' | 'doc';
}

export interface TicketMessage {
  id: string;
  senderRole: 'user' | 'support' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
  attachments?: TicketAttachment[];
  isInternalNote?: boolean;
}

export interface TicketInternalNote {
  id: string;
  staffName: string;
  note: string;
  createdAt: string;
}

export interface HelpTicket {
  id: string;
  ticketNumber: string; // e.g. TICKET-2026-001
  userId: string;
  userName: string;
  userPhone: string;
  userRole: 'merchant' | 'farmer';
  shopName?: string;
  village?: string;
  subject: string;
  category: HelpTicketCategory;
  priority: HelpTicketPriority;
  description: string;
  attachments?: TicketAttachment[];
  status: HelpTicketStatus;
  assignedTo?: string; // e.g. 'Ramesh (Mandi Tech)', 'Priya (Settlement & Billing)', 'Unassigned'
  createdAt: string; // ISO date string
  updatedAt: string;
  resolvedAt?: string;
  responses: TicketMessage[];
  internalNotes?: TicketInternalNote[];
}

export interface StockItem {
  id: string;
  name: string;
  category: CommodityCategory;
  quantityOnHand: number;
  unit: WeightUnit;
  packagesCount: number;
  packageType: string;
  avgCostPrice: number;
  targetSellingPrice: number;
  minReorderLevel: number;
  storageLocation: string;
  lastUpdated: string;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  phone: string;
  role: 'Accountant' | 'Weighman (Taula)' | 'Hamal / Coolie' | 'Supervisor' | 'Clerk';
  dailyWageOrSalary: number;
  wageType: 'daily' | 'monthly';
  status: 'active' | 'on-leave' | 'inactive';
  joinedDate: string;
  totalPaid: number;
  balanceDue: number;
  notes?: string;
}

export interface Retailer {
  id: string; // e.g. RTL-001
  name: string;
  phone: string;
  shopOrMarket: string; // shop, market or village location
  createdAt: string; // YYYY-MM-DD
  notes?: string;
}

export interface RetailerSaleItem {
  id: string;
  commodityCategory?: CommodityCategory;
  varietyName: string; // Dutch Rose, Marigold, Lily, Jasmine, Chrysanthemum, etc.
  quantity: number;
  unit: WeightUnit; // Kg, Crates, Baskets, Bags, Boxes, Bunches
  rate: number; // ₹ per unit
  amount: number; // quantity * rate
  packagingType?: string;
  packagingCount?: number;
}

export interface RetailerSale {
  id: string; // e.g. RTL-SALE-20261024-001
  parchiNumber: string; // e.g. RT-20261024-001
  date: string; // YYYY-MM-DD
  time: string; // HH:mm AM/PM
  retailerId: string;
  retailerName: string;
  retailerPhone: string;
  retailerShop: string;
  items: RetailerSaleItem[];
  grossTotal: number; // sum of today's item amounts
  previousDue?: number; // carry-forward balance prior to this sale
  grandTotalPayable?: number; // grossTotal + previousDue
  amountPaid: number; // advance / paid now
  balanceDue: number; // remaining balance (grandTotalPayable - amountPaid)
  paymentStatus: PaymentStatus; // 'Paid' | 'Partial' | 'Unpaid'
  paymentMode?: PaymentMode;
  paymentReference?: string;
  notes?: string;
  createdAt?: string;
}

export interface RetailerPayment {
  id: string; // e.g. RTL-PAY-001
  date: string; // YYYY-MM-DD
  time: string; // HH:mm AM/PM
  retailerId: string;
  retailerName: string;
  amount: number; // payment received from retailer
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
}

