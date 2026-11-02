import { getAuthHeaders } from './serverAuth';
import {
  MerchantProfile,
  Farmer,
  SaleLot,
  Shipment,
  PaymentRecord,
  FifteenDaySettlement,
  HelpTicket,
  RegisteredAccount,
  StockItem,
  EmployeeRecord,
  ParchiAuditLog,
  ConnectionRequest,
} from '../types';

export function getMerchantDocId(phone?: string): string | null {
  try {
    const target =
      phone ||
      localStorage.getItem('phoolmitra_current_user_phone') ||
      localStorage.getItem('bharatmandi_active_phone_v1');
    if (target) {
      const clean = target.replace(/\D/g, '').slice(-10);
      if (clean && clean.length === 10) return `merchant-${clean}`;
    }
  } catch {}
  return null;
}

/**
 * Recursively strips keys with undefined values from objects/arrays
 */
export function cleanUndefinedValues<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = typeof value === 'object' && value !== null ? cleanUndefinedValues(value) : value;
    }
  }
  return cleaned as T;
}

/**
 * Saves or updates all Mandi data via authenticated server endpoint (/api/data/sync)
 */
export async function syncToFirestore(
  data: {
    profile?: MerchantProfile;
    farmers?: Farmer[];
    lots?: SaleLot[];
    shipments?: Shipment[];
    payments?: PaymentRecord[];
    settlements?: FifteenDaySettlement[];
    stocks?: StockItem[];
    employees?: EmployeeRecord[];
    parchiAuditLogs?: ParchiAuditLog[];
    connectionRequests?: ConnectionRequest[];
    helpTickets?: HelpTicket[];
    registeredAccounts?: RegisteredAccount[];
  },
  overridePhone?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = getAuthHeaders();
    if (headers['Authorization']) {
      const res = await fetch('/api/data/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      const resJson = await res.json();
      if (resJson.success) {
        return { success: true };
      }
      return { success: false, error: resJson.error || 'Server sync error' };
    }
  } catch (err) {
    console.warn('[Data Sync] Server data sync endpoint exception:', err);
  }

  if (Array.isArray(data.registeredAccounts) && data.registeredAccounts.length > 0) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      for (const acc of data.registeredAccounts) {
        if (acc && acc.phoneNumber) {
          const clean = acc.phoneNumber.replace(/\D/g, '').slice(-10);
          if (clean && clean.length === 10) {
            await setDoc(doc(db, 'registeredAccounts', clean), cleanUndefinedValues(acc), { merge: true });
          }
        }
      }
    } catch (err) {
      console.warn('[Data Sync] Firestore registeredAccounts write exception:', err);
    }
  }

  return { success: true };
}

/**
 * Fetches all user records via authenticated server endpoint (/api/data/fetch)
 */
export async function fetchFromFirestore(targetPhone?: string): Promise<{
  profile?: MerchantProfile;
  farmers: Farmer[];
  lots: SaleLot[];
  shipments: Shipment[];
  payments: PaymentRecord[];
  settlements: FifteenDaySettlement[];
  stocks: StockItem[];
  employees: EmployeeRecord[];
  parchiAuditLogs: ParchiAuditLog[];
  registeredAccounts: RegisteredAccount[];
  helpTickets: HelpTicket[];
} | null> {
  try {
    const headers = getAuthHeaders();
    if (headers['Authorization']) {
      const res = await fetch('/api/data/fetch', {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000),
      });
      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        return {
          profile: resJson.data.profile,
          farmers: (resJson.data.farmers || []) as Farmer[],
          lots: (resJson.data.lots || []) as SaleLot[],
          shipments: (resJson.data.shipments || []) as Shipment[],
          payments: (resJson.data.payments || []) as PaymentRecord[],
          settlements: (resJson.data.settlements || []) as FifteenDaySettlement[],
          stocks: (resJson.data.stocks || []) as StockItem[],
          employees: (resJson.data.employees || []) as EmployeeRecord[],
          parchiAuditLogs: [],
          helpTickets: [],
          registeredAccounts: [],
        };
      }
    }
  } catch (err) {
    console.warn('[Data Fetch] Server data fetch endpoint exception:', err);
  }

  return {
    profile: undefined,
    farmers: [],
    lots: [],
    shipments: [],
    payments: [],
    settlements: [],
    stocks: [],
    employees: [],
    parchiAuditLogs: [],
    helpTickets: [],
    registeredAccounts: [],
  };
}

/**
 * Direct lookup of a registered account by phone number across devices via Firestore
 */
export async function fetchUserAccountByPhone(phone: string): Promise<RegisteredAccount | null> {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) return null;

  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const docRef = doc(db, 'registeredAccounts', cleanPhone);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as RegisteredAccount;
    }
  } catch (err) {
    console.warn('[Firestore] fetchUserAccountByPhone exception:', err);
  }
  return null;
}

/**
 * Look up a registered account across devices via Firestore by username or phone number
 */
export async function fetchUserAccountByUsernameOrPhone(identifier: string): Promise<RegisteredAccount | null> {
  if (!identifier) return null;
  const cleanInput = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/\D/g, '').slice(-10);
  const isPhone = /^[6-9]\d{9}$/.test(cleanPhone);

  if (isPhone) {
    const accByPhone = await fetchUserAccountByPhone(cleanPhone);
    if (accByPhone) return accByPhone;
  }

  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const accountsRef = collection(db, 'registeredAccounts');

    // Query by username
    const qUser = query(accountsRef, where('username', '==', cleanInput));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      return snapUser.docs[0].data() as RegisteredAccount;
    }

    // Fallback query by phoneNumber
    if (cleanPhone && cleanPhone.length === 10) {
      const qPhone = query(accountsRef, where('phoneNumber', '==', cleanPhone));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) {
        return snapPhone.docs[0].data() as RegisteredAccount;
      }
    }
  } catch (err) {
    console.warn('[Firestore] fetchUserAccountByUsernameOrPhone exception:', err);
  }

  return null;
}

/**
 * Server-authenticated polling listener for live multi-device syncing
 */
export function subscribeToFirestore(
  targetPhone: string,
  onUpdate: (data: {
    profile?: MerchantProfile;
    farmers?: Farmer[];
    lots?: SaleLot[];
    shipments?: Shipment[];
    payments?: PaymentRecord[];
    settlements?: FifteenDaySettlement[];
    stocks?: StockItem[];
    employees?: EmployeeRecord[];
  }) => void
) {
  let active = true;
  let isPolling = false;

  const poll = async () => {
    if (!active || isPolling) return;
    isPolling = true;
    try {
      const fetched = await fetchFromFirestore(targetPhone);
      if (fetched && active) {
        onUpdate({
          profile: fetched.profile,
          farmers: fetched.farmers,
          lots: fetched.lots,
          shipments: fetched.shipments,
          payments: fetched.payments,
          settlements: fetched.settlements,
          stocks: fetched.stocks,
          employees: fetched.employees,
        });
      }
    } finally {
      isPolling = false;
    }
  };

  // Poll server data route every 15 seconds
  const intervalId = setInterval(poll, 15000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
}

/**
 * Helper function for server item deletion
 */
async function deleteItemViaServer(itemType: string, itemId: string): Promise<boolean> {
  try {
    const headers = getAuthHeaders();
    if (headers['Authorization']) {
      const res = await fetch('/api/data/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemType, itemId }),
        signal: AbortSignal.timeout(5000),
      });
      const resJson = await res.json();
      return Boolean(resJson.success);
    }
  } catch (err) {
    console.warn(`[Data Delete] Exception deleting ${itemType} ${itemId}:`, err);
  }
  return true;
}

export async function deleteFarmerFromFirestore(farmerId: string, _phone?: string): Promise<boolean> {
  return deleteItemViaServer('farmers', farmerId);
}

export async function deleteLotFromFirestore(lotId: string, _phone?: string): Promise<boolean> {
  return deleteItemViaServer('lots', lotId);
}

export async function deleteShipmentFromFirestore(shipmentId: string, _phone?: string): Promise<boolean> {
  return deleteItemViaServer('shipments', shipmentId);
}

export async function deletePaymentFromFirestore(paymentId: string, _phone?: string): Promise<boolean> {
  return deleteItemViaServer('payments', paymentId);
}

export async function deleteSettlementFromFirestore(settlementId: string, _phone?: string): Promise<boolean> {
  return deleteItemViaServer('settlements', settlementId);
}

/**
 * Persist or update a support ticket directly in Firestore supportTickets collection
 */
export async function saveTicketToFirestore(ticket: HelpTicket): Promise<boolean> {
  if (!ticket || !ticket.id) return false;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'supportTickets', String(ticket.id)), cleanUndefinedValues(ticket), { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] saveTicketToFirestore exception:', err);
    return false;
  }
}

/**
 * Fetch all support tickets directly from Firestore supportTickets collection
 */
export async function fetchAllSupportTicketsFromFirestore(): Promise<HelpTicket[]> {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const snap = await getDocs(collection(db, 'supportTickets'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as HelpTicket);
    }
  } catch (err) {
    console.warn('[Firestore] fetchAllSupportTicketsFromFirestore exception:', err);
  }
  return [];
}

/**
 * Subscribe to live support tickets in Firestore supportTickets collection
 */
export function subscribeToSupportTickets(onUpdate: (tickets: HelpTicket[]) => void) {
  let unsub: (() => void) | null = null;
  import('firebase/firestore').then(({ collection, onSnapshot }) => {
    import('./firebase').then(({ db }) => {
      unsub = onSnapshot(collection(db, 'supportTickets'), (snap) => {
        if (!snap.empty) {
          const tickets = snap.docs.map((d) => d.data() as HelpTicket);
          onUpdate(tickets);
        }
      }, (err) => {
        console.warn('[Firestore] subscribeToSupportTickets error:', err);
      });
    });
  }).catch((err) => {
    console.warn('[Firestore] subscribeToSupportTickets import error:', err);
  });

  return () => {
    if (unsub) unsub();
  };
}
