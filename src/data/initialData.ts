import {
  Farmer,
  MerchantProfile,
  PaymentRecord,
  SaleLot,
  ConnectionRequest,
  Shipment,
  FifteenDaySettlement,
  CommodityCategory,
  WeightUnit,
  QualityGrade,
  HelpTicket,
  StockItem,
  EmployeeRecord,
} from '../types';

export interface CommodityCategoryMeta {
  id: CommodityCategory;
  name: string;
  nameHi: string;
  nameTe: string;
  icon: string;
  color: string;
  bgLight: string;
  borderLight: string;
  badgeBg: string;
  badgeText: string;
  defaultCommissionRate: number;
  defaultHamaliRate: number;
  defaultTransportRate: number;
  defaultStorageRate: number;
  allowedUnits: WeightUnit[];
  packagingLabel: string;
  weightLabel: string;
  varieties: { id: string; en: string; hi: string; te: string; defaultRate: number; unit: WeightUnit }[];
}

export const COMMODITY_CONFIGS: Record<CommodityCategory, CommodityCategoryMeta> = {
  flowers: {
    id: 'flowers',
    name: 'Flowers',
    nameHi: 'Flowers',
    nameTe: 'Flowers',
    icon: '🌸',
    color: '#D97706',
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-900',
    badgeText: 'text-amber-800',
    defaultCommissionRate: 4,
    defaultHamaliRate: 50,
    defaultTransportRate: 75,
    defaultStorageRate: 20,
    allowedUnits: ['Kgs', 'Boxes', 'Bunches'],
    packagingLabel: 'Boxes',
    weightLabel: 'Kgs / Weight',
    varieties: [
      { id: 'rose', en: 'Rose', hi: 'Rose', te: 'Rose', defaultRate: 50, unit: 'Kgs' },
      { id: 'marigold', en: 'Marigold', hi: 'Marigold', te: 'Marigold', defaultRate: 40, unit: 'Kgs' },
      { id: 'jasmine', en: 'Jasmine', hi: 'Jasmine', te: 'Jasmine', defaultRate: 120, unit: 'Kgs' },
      { id: 'chrysanthemum', en: 'Chrysanthemum', hi: 'Chrysanthemum', te: 'Chrysanthemum', defaultRate: 60, unit: 'Kgs' },
      { id: 'dutch-rose', en: 'Dutch Rose', hi: 'Dutch Rose', te: 'Dutch Rose', defaultRate: 90, unit: 'Bunches' },
      { id: 'tuberose', en: 'Tuberose', hi: 'Tuberose', te: 'Tuberose', defaultRate: 80, unit: 'Kgs' },
      { id: 'crossandra', en: 'Crossandra', hi: 'Crossandra', te: 'Crossandra', defaultRate: 180, unit: 'Kgs' },
    ],
  },
  grains: {
    id: 'grains',
    name: 'Grains & Pulses',
    nameHi: 'Grains & Pulses',
    nameTe: 'Grains & Pulses',
    icon: '🌾',
    color: '#059669',
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-900',
    badgeText: 'text-emerald-800',
    defaultCommissionRate: 2.5,
    defaultHamaliRate: 40,
    defaultTransportRate: 120,
    defaultStorageRate: 30,
    allowedUnits: ['Quintals', 'Bags', 'Kgs'],
    packagingLabel: 'Bags',
    weightLabel: 'Quintals / Kgs',
    varieties: [
      { id: 'wheat', en: 'Wheat', hi: 'Wheat', te: 'Wheat', defaultRate: 2400, unit: 'Quintals' },
      { id: 'paddy', en: 'Paddy / Rice', hi: 'Paddy / Rice', te: 'Paddy / Rice', defaultRate: 2200, unit: 'Quintals' },
      { id: 'maize', en: 'Maize / Corn', hi: 'Maize / Corn', te: 'Maize / Corn', defaultRate: 1950, unit: 'Quintals' },
      { id: 'toor-dal', en: 'Toor Dal / Red Gram', hi: 'Toor Dal / Red Gram', te: 'Toor Dal / Red Gram', defaultRate: 7200, unit: 'Quintals' },
      { id: 'chana', en: 'Chana / Bengal Gram', hi: 'Chana / Bengal Gram', te: 'Chana / Bengal Gram', defaultRate: 5400, unit: 'Quintals' },
      { id: 'soybean', en: 'Soybean', hi: 'Soybean', te: 'Soybean', defaultRate: 4600, unit: 'Quintals' },
      { id: 'moong', en: 'Moong Dal / Green Gram', hi: 'Moong Dal / Green Gram', te: 'Moong Dal / Green Gram', defaultRate: 6800, unit: 'Quintals' },
    ],
  },
  vegetables: {
    id: 'vegetables',
    name: 'Vegetables',
    nameHi: 'Vegetables',
    nameTe: 'Vegetables',
    icon: '🥦',
    color: '#16A34A',
    bgLight: 'bg-green-50',
    borderLight: 'border-green-200',
    badgeBg: 'bg-green-100 text-green-900',
    badgeText: 'text-green-800',
    defaultCommissionRate: 5,
    defaultHamaliRate: 35,
    defaultTransportRate: 80,
    defaultStorageRate: 15,
    allowedUnits: ['Crates', 'Kgs', 'Bags'],
    packagingLabel: 'Crates',
    weightLabel: 'Kgs / Crates',
    varieties: [
      { id: 'tomato', en: 'Tomato', hi: 'Tomato', te: 'Tomato', defaultRate: 30, unit: 'Kgs' },
      { id: 'onion', en: 'Onion', hi: 'Onion', te: 'Onion', defaultRate: 35, unit: 'Kgs' },
      { id: 'potato', en: 'Potato', hi: 'Potato', te: 'Potato', defaultRate: 25, unit: 'Kgs' },
      { id: 'green-chilli', en: 'Green Chilli', hi: 'Green Chilli', te: 'Green Chilli', defaultRate: 60, unit: 'Kgs' },
      { id: 'brinjal', en: 'Brinjal / Eggplant', hi: 'Brinjal / Eggplant', te: 'Brinjal / Eggplant', defaultRate: 28, unit: 'Kgs' },
      { id: 'cabbage', en: 'Cabbage', hi: 'Cabbage', te: 'Cabbage', defaultRate: 18, unit: 'Kgs' },
      { id: 'cauliflower', en: 'Cauliflower', hi: 'Cauliflower', te: 'Cauliflower', defaultRate: 32, unit: 'Kgs' },
      { id: 'ginger', en: 'Ginger', hi: 'Ginger', te: 'Ginger', defaultRate: 90, unit: 'Kgs' },
    ],
  },
  fruits: {
    id: 'fruits',
    name: 'Fruits',
    nameHi: 'Fruits',
    nameTe: 'Fruits',
    icon: '🍎',
    color: '#EA580C',
    bgLight: 'bg-orange-50',
    borderLight: 'border-orange-200',
    badgeBg: 'bg-orange-100 text-orange-900',
    badgeText: 'text-orange-800',
    defaultCommissionRate: 6,
    defaultHamaliRate: 45,
    defaultTransportRate: 90,
    defaultStorageRate: 25,
    allowedUnits: ['Baskets', 'Crates', 'Boxes', 'Kgs'],
    packagingLabel: 'Baskets / Boxes',
    weightLabel: 'Kgs / Baskets',
    varieties: [
      { id: 'mango', en: 'Mango', hi: 'Mango', te: 'Mango', defaultRate: 85, unit: 'Kgs' },
      { id: 'banana', en: 'Banana', hi: 'Banana', te: 'Banana', defaultRate: 25, unit: 'Kgs' },
      { id: 'pomegranate', en: 'Pomegranate', hi: 'Pomegranate', te: 'Pomegranate', defaultRate: 140, unit: 'Kgs' },
      { id: 'sweet-lime', en: 'Sweet Lime / Mosambi', hi: 'Sweet Lime / Mosambi', te: 'Sweet Lime / Mosambi', defaultRate: 45, unit: 'Kgs' },
      { id: 'papaya', en: 'Papaya', hi: 'Papaya', te: 'Papaya', defaultRate: 22, unit: 'Kgs' },
      { id: 'apple', en: 'Apple', hi: 'Apple', te: 'Apple', defaultRate: 120, unit: 'Kgs' },
      { id: 'grapes', en: 'Grapes', hi: 'Grapes', te: 'Grapes', defaultRate: 80, unit: 'Kgs' },
      { id: 'watermelon', en: 'Watermelon', hi: 'Watermelon', te: 'Watermelon', defaultRate: 15, unit: 'Kgs' },
    ],
  },
  spices: {
    id: 'spices',
    name: 'Spices & Commercial Crops',
    nameHi: 'Spices & Commercial Crops',
    nameTe: 'Spices & Commercial Crops',
    icon: '🌶️',
    color: '#DC2626',
    bgLight: 'bg-red-50',
    borderLight: 'border-red-200',
    badgeBg: 'bg-red-100 text-red-900',
    badgeText: 'text-red-800',
    defaultCommissionRate: 3,
    defaultHamaliRate: 40,
    defaultTransportRate: 100,
    defaultStorageRate: 25,
    allowedUnits: ['Quintals', 'Bags', 'Kgs'],
    packagingLabel: 'Bags / Sacks',
    weightLabel: 'Quintals / Kgs',
    varieties: [
      { id: 'dry-chilli', en: 'Dry Red Chilli', hi: 'Dry Red Chilli', te: 'Dry Red Chilli', defaultRate: 18000, unit: 'Quintals' },
      { id: 'turmeric', en: 'Turmeric', hi: 'Turmeric', te: 'Turmeric', defaultRate: 14000, unit: 'Quintals' },
      { id: 'garlic', en: 'Garlic', hi: 'Garlic', te: 'Garlic', defaultRate: 12000, unit: 'Quintals' },
      { id: 'coriander', en: 'Coriander Seeds', hi: 'Coriander Seeds', te: 'Coriander Seeds', defaultRate: 8500, unit: 'Quintals' },
      { id: 'tamarind', en: 'Tamarind', hi: 'Tamarind', te: 'Tamarind', defaultRate: 9500, unit: 'Quintals' },
    ],
  },
};

export const ALL_COMMODITIES: CommodityCategory[] = ['flowers', 'grains', 'vegetables', 'fruits', 'spices'];

export const DEFAULT_MARKET_YARD_NAME = 'Wholesale Market Yard';

export const initialMerchantProfile: MerchantProfile = {
  shopName: "Mandi Wholesale Merchant",
  ownerName: "Mandi Trader",
  photoUrl: "",
  shopNumber: "Shop No. 1",
  marketYardName: "Wholesale Market Yard",
  merchantId: "MND-1001",
  phoneNumber: "+91 9849012345",
  licenseNumber: "Verified Adathiya",
  defaultCommissionRate: 4,
  defaultExpenditureRate: 6,
  selectedCommodities: ['flowers', 'grains', 'vegetables', 'fruits', 'spices'],
  commoditySettings: {
    flowers: { defaultCommissionRate: 4, defaultHamaliRate: 50, defaultTransportRate: 75, defaultStorageRate: 20 },
    grains: { defaultCommissionRate: 2.5, defaultHamaliRate: 40, defaultTransportRate: 120, defaultStorageRate: 30 },
    vegetables: { defaultCommissionRate: 5, defaultHamaliRate: 35, defaultTransportRate: 80, defaultStorageRate: 15 },
    fruits: { defaultCommissionRate: 6, defaultHamaliRate: 45, defaultTransportRate: 90, defaultStorageRate: 25 },
    spices: { defaultCommissionRate: 3, defaultHamaliRate: 40, defaultTransportRate: 100, defaultStorageRate: 25 },
  },
  address: "Wholesale Market Yard"
};

export const initialFarmers: Farmer[] = [];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPastDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDMY(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[2].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[0];
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const generateInitialShipments = (_sessionDate: string = '2024-09-15'): Shipment[] => {
  return [];
};

export const generateInitialLots = (_sessionDate: string = getTodayDateString()): SaleLot[] => {
  return [];
};

export const initialPayments: PaymentRecord[] = [];

export const initialConnectionRequests: ConnectionRequest[] = [];

export const SUPPORT_STAFF_MEMBERS = [
  'Unassigned',
  'Ramesh Kumar (Mandi Tech Lead)',
  'Priya Sharma (Settlement & Billing)',
  'Vikram Varma (Farmer Care & Liaison)',
  'Anand Patil (Print & Hardware Support)',
];

export interface MandiFAQ {
  id: string;
  category: string;
  question: string;
  questionTe: string;
  questionHi: string;
  answer: string;
  answerTe: string;
  answerHi: string;
  tag: string;
}

export const MANDI_FAQS: MandiFAQ[] = [
  {
    id: 'faq-1',
    category: 'Settlement & Billing',
    question: 'How is the 4% Form C Mandi Commission calculated?',
    questionTe: 'How is the 4% Form C Mandi Commission calculated?',
    questionHi: 'How is the 4% Form C Mandi Commission calculated?',
    answer: 'Commission is statutory under Mandi Act. It is calculated as Gross Sales Value × 4%. For example, if a farmer brings 100 kg marigold sold at ₹40/kg = ₹4,000 gross, the 4% commission is ₹160. Hamali and Transport are deducted from gross before arriving at Net Payable.',
    answerTe: 'Commission is statutory under Mandi Act. It is calculated as Gross Sales Value × 4%. For example, if a farmer brings 100 kg marigold sold at ₹40/kg = ₹4,000 gross, the 4% commission is ₹160. Hamali and Transport are deducted from gross before arriving at Net Payable.',
    answerHi: 'Commission is statutory under Mandi Act. It is calculated as Gross Sales Value × 4%. For example, if a farmer brings 100 kg marigold sold at ₹40/kg = ₹4,000 gross, the 4% commission is ₹160. Hamali and Transport are deducted from gross before arriving at Net Payable.',
    tag: 'Commission',
  },
  {
    id: 'faq-2',
    category: '15-Day Settlement',
    question: 'How does the 15-Day Settlement Cycle work for registered farmers?',
    questionTe: 'How does the 15-Day Settlement Cycle work for registered farmers?',
    questionHi: 'How does the 15-Day Settlement Cycle work for registered farmers?',
    answer: 'Bharat Mandi aggregates all arrival lots between the 1st-15th and 16th-end of every month. Merchants can generate consolidated Form C Settlement Statements, apply deductions, review advance adjustments, and issue instant payouts via Cash, UPI, or Bank NEFT with automated PDF receipts.',
    answerTe: 'Bharat Mandi aggregates all arrival lots between the 1st-15th and 16th-end of every month. Merchants can generate consolidated Form C Settlement Statements, apply deductions, review advance adjustments, and issue instant payouts via Cash, UPI, or Bank NEFT with automated PDF receipts.',
    answerHi: 'Bharat Mandi aggregates all arrival lots between the 1st-15th and 16th-end of every month. Merchants can generate consolidated Form C Settlement Statements, apply deductions, review advance adjustments, and issue instant payouts via Cash, UPI, or Bank NEFT with automated PDF receipts.',
    tag: 'Settlement',
  },
  {
    id: 'faq-3',
    category: 'Hardware & Printing',
    question: 'How to connect and print receipts on 80mm Bluetooth Thermal Printers?',
    questionTe: 'How to connect and print receipts on 80mm Bluetooth Thermal Printers?',
    questionHi: 'How to connect and print receipts on 80mm Bluetooth Thermal Printers?',
    answer: 'Connect your ESC/POS thermal printer via Bluetooth or USB. When clicking "Print Parchi" or "Download PDF", select the "Thermal (80mm)" format option. The output is pre-formatted to 72mm printable width with clear rendering.',
    answerTe: 'Connect your ESC/POS thermal printer via Bluetooth or USB. When clicking "Print Parchi" or "Download PDF", select the "Thermal (80mm)" format option. The output is pre-formatted to 72mm printable width with clear rendering.',
    answerHi: 'Connect your ESC/POS thermal printer via Bluetooth or USB. When clicking "Print Parchi" or "Download PDF", select the "Thermal (80mm)" format option. The output is pre-formatted to 72mm printable width with clear rendering.',
    tag: 'Printer',
  },
  {
    id: 'faq-4',
    category: 'Offline Storage',
    question: 'Will my Mandi data be safe if the internet goes down at the morning auction?',
    questionTe: 'Will my Mandi data be safe if the internet goes down at the morning auction?',
    questionHi: 'Will my Mandi data be safe if the internet goes down at the morning auction?',
    answer: 'Yes, 100%! Bharat Mandi uses local browser persistence and IndexedDB caches. You can record lots, calculate rates, issue parchis, and view farmer khatas without an active internet connection. All records sync automatically once reconnected.',
    answerTe: 'Yes, 100%! Bharat Mandi uses local browser persistence and IndexedDB caches. You can record lots, calculate rates, issue parchis, and view farmer khatas without an active internet connection. All records sync automatically once reconnected.',
    answerHi: 'Yes, 100%! Bharat Mandi uses local browser persistence and IndexedDB caches. You can record lots, calculate rates, issue parchis, and view farmer khatas without an active internet connection. All records sync automatically once reconnected.',
    tag: 'Offline',
  },
  {
    id: 'faq-5',
    category: 'Accounts & Khata',
    question: 'How do farmers track their daily sales and pending balance from home?',
    questionTe: 'How do farmers track their daily sales and pending balance from home?',
    questionHi: 'How do farmers track their daily sales and pending balance from home?',
    answer: 'Farmers can switch to the "Farmer Portal", enter their registered mobile number, and instantly see live auction prices, today\'s parchi slips with QR codes, 15-day settlement histories, and download PDF statements.',
    answerTe: 'Farmers can switch to the "Farmer Portal", enter their registered mobile number, and instantly see live auction prices, today\'s parchi slips with QR codes, 15-day settlement histories, and download PDF statements.',
    answerHi: 'Farmers can switch to the "Farmer Portal", enter their registered mobile number, and instantly see live auction prices, today\'s parchi slips with QR codes, 15-day settlement histories, and download PDF statements.',
    tag: 'Farmer Portal',
  },
];

export const initialHelpTickets: HelpTicket[] = [];

export const INITIAL_STOCKS: StockItem[] = [];

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [];

export const INITIAL_RETAILERS: any[] = [];

export const INITIAL_RETAILER_SALES: any[] = [];

export const INITIAL_RETAILER_PAYMENTS: any[] = [];

