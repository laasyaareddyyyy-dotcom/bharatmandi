import {
  Farmer,
  SaleLot,
  Shipment,
  PaymentRecord,
  FifteenDaySettlement,
  StockItem,
  EmployeeRecord,
  ConnectionRequest,
  RegisteredAccount,
  HelpTicket,
  SyncedFarmerStatement,
} from '../types';
import { cleanIndianMobile } from './phoneValidation';

/**
 * Normalizes phone numbers to standard 10-digit string
 */
export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  return cleanIndianMobile(phone);
};

/**
 * Normalizes string for case-insensitive matching
 */
export const normalizeStr = (str?: string): string => {
  return (str || '').trim().toLowerCase();
};

/**
 * Deduplicates Farmers:
 * Filters out duplicate IDs, duplicate normalized 10-digit phone numbers,
 * or identical farmer name + village combinations.
 */
export const deduplicateFarmers = (farmers: Farmer[]): Farmer[] => {
  if (!Array.isArray(farmers) || farmers.length === 0) return [];
  const map = new Map<string, Farmer>();
  const phoneToKey = new Map<string, string>();
  const nameVillageToKey = new Map<string, string>();

  for (const f of farmers) {
    if (!f || typeof f !== 'object') continue;
    const cleanId = (f.id || '').trim();
    const cleanPhone = normalizePhone(f.phone);
    const cleanName = normalizeStr(f.name);
    const cleanVillage = normalizeStr(f.village);

    let key = '';

    // 1. Check if phone already mapped (valid 10-digit non-default phone)
    if (cleanPhone && cleanPhone.length === 10 && cleanPhone !== '9876543210') {
      if (phoneToKey.has(cleanPhone)) {
        key = phoneToKey.get(cleanPhone)!;
      }
    }

    // 2. Check if cleanId already in map
    if (!key && cleanId && map.has(cleanId)) {
      key = cleanId;
    }

    // 3. Check if name+village already mapped (only if BOTH name and village are non-empty and non-generic)
    if (
      !key &&
      cleanName &&
      cleanVillage &&
      cleanVillage !== 'mandi area' &&
      cleanVillage !== 'mandi yard' &&
      cleanVillage !== 'mandi'
    ) {
      const nvKey = `${cleanName}_${cleanVillage}`;
      if (nameVillageToKey.has(nvKey)) {
        key = nameVillageToKey.get(nvKey)!;
      }
    }

    // 4. Fallback to cleanId or new key
    if (!key) {
      key = cleanId || `farmer_${Date.now()}_${Math.random()}`;
    }

    // Register phone and name+village mappings
    if (cleanPhone && cleanPhone.length === 10 && cleanPhone !== '9876543210') {
      phoneToKey.set(cleanPhone, key);
    }
    if (
      cleanName &&
      cleanVillage &&
      cleanVillage !== 'mandi area' &&
      cleanVillage !== 'mandi yard' &&
      cleanVillage !== 'mandi'
    ) {
      nameVillageToKey.set(`${cleanName}_${cleanVillage}`, key);
    }

    if (map.has(key)) {
      const existing = map.get(key)!;
      // existing (encountered first in array) takes precedence over later duplicates (f)
      const preferredId =
        existing.id && existing.id.startsWith('FRM-')
          ? existing.id
          : f.id && f.id.startsWith('FRM-')
          ? f.id
          : existing.id || f.id;

      map.set(key, {
        ...f,
        ...existing, // existing (first encountered / newest) overrides f
        id: preferredId,
        name: existing.name?.trim() || f.name?.trim() || '',
        phone: existing.phone?.trim() || f.phone?.trim() || '',
        village: existing.village?.trim() || f.village?.trim() || '',
        photoUrl: existing.photoUrl?.trim() || f.photoUrl?.trim() || '',
        primaryCrops:
          Array.isArray(existing.primaryCrops) && existing.primaryCrops.length > 0
            ? existing.primaryCrops
            : f.primaryCrops || [],
        connectedMerchantIds: Array.from(
          new Set([...(existing.connectedMerchantIds || []), ...(f.connectedMerchantIds || [])])
        ),
      });
    } else {
      map.set(key, f);
    }
  }

  return Array.from(map.values());
};

/**
 * Deduplicates Sale Lots:
 * Filters out duplicate IDs, identical parchi numbers, or exact duplicate lot records.
 */
export const deduplicateLots = (lots: SaleLot[]): SaleLot[] => {
  if (!Array.isArray(lots) || lots.length === 0) return [];
  const seenIds = new Set<string>();
  const seenParchis = new Set<string>();
  const seenSignatures = new Set<string>();
  const unique: SaleLot[] = [];

  for (const lot of lots) {
    if (!lot || typeof lot !== 'object') continue;

    const id = (lot.id || '').trim();
    const parchi = (lot.parchiNumber || '').trim();
    const signature = `${lot.farmerId}_${lot.date}_${lot.time}_${normalizeStr(lot.flowerVariety)}_${lot.quantity}_${lot.rate}_${lot.farmerNetPayable}`;

    if (id && seenIds.has(id)) continue;
    if (parchi && seenParchis.has(parchi)) continue;
    if (seenSignatures.has(signature)) continue;

    if (id) seenIds.add(id);
    if (parchi) seenParchis.add(parchi);
    seenSignatures.add(signature);

    unique.push(lot);
  }

  return unique;
};

/**
 * Deduplicates Shipments:
 * Filters out duplicate IDs or duplicate shipment numbers.
 */
export const deduplicateShipments = (shipments: Shipment[]): Shipment[] => {
  if (!Array.isArray(shipments) || shipments.length === 0) return [];
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  const unique: Shipment[] = [];

  for (const shipment of shipments) {
    if (!shipment || typeof shipment !== 'object') continue;

    const id = (shipment.id || '').trim();
    const number = (shipment.shipmentNumber || '').trim();

    if (id && seenIds.has(id)) continue;
    if (number && seenNumbers.has(number)) continue;

    if (id) seenIds.add(id);
    if (number) seenNumbers.add(number);

    unique.push(shipment);
  }

  return unique;
};

/**
 * Deduplicates Payments:
 * Filters out duplicate IDs or duplicate payment transaction signatures.
 */
export const deduplicatePayments = (payments: PaymentRecord[]): PaymentRecord[] => {
  if (!Array.isArray(payments) || payments.length === 0) return [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const unique: PaymentRecord[] = [];

  for (const payment of payments) {
    if (!payment || typeof payment !== 'object') continue;

    const id = (payment.id || '').trim();
    const signature = `${payment.farmerId}_${payment.date}_${payment.amount}_${payment.paymentMode}_${payment.referenceNumber || ''}_${payment.lotId || ''}`;

    if (id && seenIds.has(id)) continue;
    if (seenSignatures.has(signature)) continue;

    if (id) seenIds.add(id);
    seenSignatures.add(signature);

    unique.push(payment);
  }

  return unique;
};

/**
 * Deduplicates 15-Day Settlements:
 * Filters out duplicate IDs or duplicate farmer + period combinations.
 */
export const deduplicateSettlements = (settlements: FifteenDaySettlement[]): FifteenDaySettlement[] => {
  if (!Array.isArray(settlements) || settlements.length === 0) return [];
  const seenIds = new Set<string>();
  const seenFarmerPeriods = new Set<string>();
  const unique: FifteenDaySettlement[] = [];

  for (const s of settlements) {
    if (!s || typeof s !== 'object') continue;

    const id = (s.id || '').trim();
    const periodKey = `${s.farmerId}_${s.periodStart}_${s.periodEnd}_${s.commodityCategory || 'all'}`;

    if (id && seenIds.has(id)) continue;
    if (seenFarmerPeriods.has(periodKey)) continue;

    if (id) seenIds.add(id);
    seenFarmerPeriods.add(periodKey);

    unique.push(s);
  }

  return unique;
};

/**
 * Deduplicates Stock Items:
 * Filters out duplicate IDs or duplicate name + category items.
 */
export const deduplicateStocks = (stocks: StockItem[]): StockItem[] => {
  if (!Array.isArray(stocks) || stocks.length === 0) return [];
  const seenIds = new Set<string>();
  const seenNameCats = new Set<string>();
  const unique: StockItem[] = [];

  for (const stock of stocks) {
    if (!stock || typeof stock !== 'object') continue;

    const id = (stock.id || '').trim();
    const key = `${normalizeStr(stock.name)}_${stock.category}`;

    if (id && seenIds.has(id)) continue;
    if (seenNameCats.has(key)) continue;

    if (id) seenIds.add(id);
    seenNameCats.add(key);

    unique.push(stock);
  }

  return unique;
};

/**
 * Deduplicates Employees:
 * Filters out duplicate IDs or duplicate phone numbers.
 */
export const deduplicateEmployees = (employees: EmployeeRecord[]): EmployeeRecord[] => {
  if (!Array.isArray(employees) || employees.length === 0) return [];
  const seenIds = new Set<string>();
  const seenPhones = new Set<string>();
  const unique: EmployeeRecord[] = [];

  for (const emp of employees) {
    if (!emp || typeof emp !== 'object') continue;

    const id = (emp.id || '').trim();
    const phone = normalizePhone(emp.phone);

    if (id && seenIds.has(id)) continue;
    if (phone && phone.length === 10 && seenPhones.has(phone)) continue;

    if (id) seenIds.add(id);
    if (phone && phone.length === 10) seenPhones.add(phone);

    unique.push(emp);
  }

  return unique;
};

/**
 * Deduplicates Connection Requests:
 * Filters out duplicate IDs or duplicate sender + receiver combinations.
 */
export const deduplicateConnectionRequests = (requests: ConnectionRequest[]): ConnectionRequest[] => {
  if (!Array.isArray(requests) || requests.length === 0) return [];
  const seenIds = new Set<string>();
  const seenPairs = new Set<string>();
  const unique: ConnectionRequest[] = [];

  for (const req of requests) {
    if (!req || typeof req !== 'object') continue;

    const id = (req.id || '').trim();
    const pair = `${normalizePhone(req.farmerPhone)}_${(req.merchantId || '').trim()}_${req.senderRole}`;

    if (id && seenIds.has(id)) continue;
    if (seenPairs.has(pair)) continue;

    if (id) seenIds.add(id);
    seenPairs.add(pair);

    unique.push(req);
  }

  return unique;
};

/**
 * Deduplicates Registered Accounts:
 * Filters out duplicate 10-digit phone numbers or IDs.
 */
export const deduplicateRegisteredAccounts = (accounts: RegisteredAccount[]): RegisteredAccount[] => {
  if (!Array.isArray(accounts) || accounts.length === 0) return [];
  const seenPhones = new Set<string>();
  const seenIds = new Set<string>();
  const unique: RegisteredAccount[] = [];

  for (const acc of accounts) {
    if (!acc || typeof acc !== 'object') continue;

    const id = (acc.id || '').trim();
    const phone = normalizePhone(acc.phoneNumber);

    if (phone && phone.length === 10 && seenPhones.has(phone)) continue;
    if (id && seenIds.has(id)) continue;

    if (phone && phone.length === 10) seenPhones.add(phone);
    if (id) seenIds.add(id);

    unique.push(acc);
  }

  return unique;
};

/**
 * Deduplicates Help Tickets
 */
export const deduplicateHelpTickets = (tickets: HelpTicket[]): HelpTicket[] => {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  const unique: HelpTicket[] = [];

  for (const t of tickets) {
    if (!t || typeof t !== 'object') continue;

    const id = (t.id || '').trim();
    const number = (t.ticketNumber || '').trim();

    if (id && seenIds.has(id)) continue;
    if (number && seenNumbers.has(number)) continue;

    if (id) seenIds.add(id);
    if (number) seenNumbers.add(number);

    unique.push(t);
  }

  return unique;
};

/**
 * Deduplicates Synced Statements
 */
export const deduplicateSyncedStatements = (statements: SyncedFarmerStatement[]): SyncedFarmerStatement[] => {
  if (!Array.isArray(statements) || statements.length === 0) return [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const unique: SyncedFarmerStatement[] = [];

  for (const s of statements) {
    if (!s || typeof s !== 'object') continue;

    const id = (s.id || '').trim();
    const key = `${normalizePhone(s.farmerPhone)}_${s.merchantId}_${s.startDate || s.date}_${s.endDate || s.date}_${s.statementNumber}`;

    if (id && seenIds.has(id)) continue;
    if (seenKeys.has(key)) continue;

    if (id) seenIds.add(id);
    seenKeys.add(key);

    unique.push(s);
  }

  return unique;
};

const isMockStock = (s: StockItem) => {
  return ['STK-001', 'STK-002', 'STK-003', 'STK-004', 'STK-005', 'STK-006'].includes(s.id) ||
    ['Sharbati Wheat', 'Basmati Paddy', 'Nashik Red Onion', 'Hybrid Tomato', 'Dutch Rose', 'Yellow Marigold'].some((name) => s.name?.includes(name));
};

const isMockEmployee = (e: EmployeeRecord) => {
  return ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005'].includes(e.id) ||
    ['Rameshwar Lal Sharma', 'Balram Singh Yadav', 'Suresh Kumar Coolie', 'Raju Bhai Prajapati', 'Mohan Kumar Verma'].includes(e.name);
};

const isMockFarmer = (f: Farmer) => {
  return ['FM-001', 'FM-002', 'FM-003', 'FM-004', 'FM-005'].includes(f.id) &&
    ['Ramesh Patel', 'Suresh Reddy', 'Kailash Chand', 'Mahesh Deshmukh'].includes(f.name);
};

const isMockLot = (l: SaleLot) => {
  return l.id?.startsWith('lot-demo') || l.parchiNumber?.startsWith('PAR-2024-') || ['lot-1', 'lot-2', 'lot-3', 'lot-4'].includes(l.id);
};

const isMockShipment = (s: Shipment) => {
  return s.id?.startsWith('shp-demo') || s.shipmentNumber?.startsWith('SHP-20240915') || ['shp-1', 'shp-2', 'shp-3'].includes(s.id);
};

/**
 * Global cleanup helper that inspects all keys in localStorage,
 * purges mock/sample data, and removes duplicates across all namespaces.
 */
export const purgeDuplicatesFromLocalStorage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const val = localStorage.getItem(key);
      if (!val) continue;

      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) continue;

        let cleaned: unknown[] = parsed;

        if (key.includes('_farmers_')) {
          cleaned = deduplicateFarmers((parsed as Farmer[]).filter((f) => !isMockFarmer(f)));
        } else if (key.includes('_lots_')) {
          cleaned = deduplicateLots((parsed as SaleLot[]).filter((l) => !isMockLot(l)));
        } else if (key.includes('_payments_')) {
          cleaned = deduplicatePayments((parsed as PaymentRecord[]).filter((p) => !p.id?.startsWith('pay-demo') && !['pay-1', 'pay-2'].includes(p.id)));
        } else if (key.includes('_shipments_')) {
          cleaned = deduplicateShipments((parsed as Shipment[]).filter((s) => !isMockShipment(s)));
        } else if (key.includes('_settlements_')) {
          cleaned = deduplicateSettlements(parsed as FifteenDaySettlement[]);
        } else if (key.includes('_stocks_')) {
          cleaned = deduplicateStocks((parsed as StockItem[]).filter((s) => !isMockStock(s)));
        } else if (key.includes('_employees_')) {
          cleaned = deduplicateEmployees((parsed as EmployeeRecord[]).filter((e) => !isMockEmployee(e)));
        } else if (key.includes('_requests_') || key.includes('connection_requests')) {
          cleaned = deduplicateConnectionRequests(parsed as ConnectionRequest[]);
        } else if (key.includes('accounts') || key.includes('registered_accounts')) {
          cleaned = deduplicateRegisteredAccounts(parsed as RegisteredAccount[]);
        } else if (key.includes('tickets')) {
          cleaned = deduplicateHelpTickets(parsed as HelpTicket[]);
        } else if (key.includes('synced_statements')) {
          cleaned = deduplicateSyncedStatements(parsed as SyncedFarmerStatement[]);
        }

        if (cleaned.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      } catch {
        // non-JSON item, ignore
      }
    }
  } catch {
    // ignore storage exceptions
  }
};
