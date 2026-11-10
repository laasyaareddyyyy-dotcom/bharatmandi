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
/**
 * Saves or updates all Mandi data directly in Firestore under user document and subcollections
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
  // 1. Try server sync endpoint if authorized
  try {
    const headers = getAuthHeaders();
    if (headers['Authorization']) {
      await fetch('/api/data/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    }
  } catch (err) {
    console.warn('[Data Sync] Server endpoint sync note:', err);
  }

  // 2. Direct Firestore SDK write for guaranteed cloud persistence across devices
  const targetPhone =
    overridePhone ||
    localStorage.getItem('bharatmandi_active_user_phone') ||
    localStorage.getItem('bharatmandi_active_phone_v1') ||
    '';
  const cleanPhone = targetPhone.replace(/\D/g, '').slice(-10);

  if (cleanPhone && cleanPhone.length === 10) {
    try {
      const { doc, setDoc, collection } = await import('firebase/firestore');
      const { db, ensureFirebaseAuth } = await import('./firebase');
      await ensureFirebaseAuth();

      const merchantRef = doc(db, 'merchants', `merchant-${cleanPhone}`);

      // Profile
      if (data.profile) {
        await setDoc(
          merchantRef,
          cleanUndefinedValues({
            ...data.profile,
            userPhone: cleanPhone,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      }

      // Farmers
      if (Array.isArray(data.farmers)) {
        for (const farmer of data.farmers) {
          if (!farmer.id) continue;
          await setDoc(doc(db, 'merchants', `merchant-${cleanPhone}`, 'farmers', String(farmer.id)), cleanUndefinedValues(farmer), { merge: true });
        }
      }

      // Lots (Parchis & Form C)
      if (Array.isArray(data.lots)) {
        for (const lot of data.lots) {
          if (!lot.id) continue;
          await setDoc(doc(db, 'merchants', `merchant-${cleanPhone}`, 'lots', String(lot.id)), cleanUndefinedValues(lot), { merge: true });
        }
      }

      // Shipments
      if (Array.isArray(data.shipments)) {
        for (const shipment of data.shipments) {
          if (!shipment.id) continue;
          await setDoc(doc(db, 'merchants', `merchant-${cleanPhone}`, 'shipments', String(shipment.id)), cleanUndefinedValues(shipment), { merge: true });
        }
      }

      // Payments
      if (Array.isArray(data.payments)) {
        for (const payment of data.payments) {
          if (!payment.id) continue;
          await setDoc(doc(db, 'merchants', `merchant-${cleanPhone}`, 'payments', String(payment.id)), cleanUndefinedValues(payment), { merge: true });
        }
      }

      // Settlements
      if (Array.isArray(data.settlements)) {
        for (const settlement of data.settlements) {
          if (!settlement.id) continue;
          await setDoc(doc(db, 'merchants', `merchant-${cleanPhone}`, 'settlements', String(settlement.id)), cleanUndefinedValues(settlement), { merge: true });
        }
      }

      // Stocks
      if (Array.isArray(data.stocks)) {
        for (const stock of data.stocks) {
          if (!stock.id) continue;
          await setDoc(doc(db, 'merchants', `merchant-${cleanPhone}`, 'stocks', String(stock.id)), cleanUndefinedValues(stock), { merge: true });
        }
      }

      // Employees
      if (Array.isArray(data.employees)) {
        for (const emp of data.employees) {
          if (!emp.id) continue;
          await setDoc(doc(db, 'merchants', `merchant-${cleanPhone}`, 'employees', String(emp.id)), cleanUndefinedValues(emp), { merge: true });
        }
      }
    } catch (err) {
      console.warn('[Data Sync] Direct Firestore merchant write exception:', err);
    }
  }

  // Registered Accounts write
  if (Array.isArray(data.registeredAccounts) && data.registeredAccounts.length > 0) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db, ensureFirebaseAuth } = await import('./firebase');
      await ensureFirebaseAuth();
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
 * Fetches all user records directly from Firestore under user document and subcollections
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
  const phoneToFetch =
    targetPhone ||
    localStorage.getItem('bharatmandi_active_user_phone') ||
    localStorage.getItem('bharatmandi_active_phone_v1') ||
    '';
  const cleanPhone = phoneToFetch.replace(/\D/g, '').slice(-10);

  let fetchedData: any = {
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

  // 1. Attempt server data fetch endpoint
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
        if (resJson.data.profile) fetchedData.profile = resJson.data.profile;
        if (Array.isArray(resJson.data.farmers)) fetchedData.farmers = resJson.data.farmers;
        if (Array.isArray(resJson.data.lots)) fetchedData.lots = resJson.data.lots;
        if (Array.isArray(resJson.data.shipments)) fetchedData.shipments = resJson.data.shipments;
        if (Array.isArray(resJson.data.payments)) fetchedData.payments = resJson.data.payments;
        if (Array.isArray(resJson.data.settlements)) fetchedData.settlements = resJson.data.settlements;
        if (Array.isArray(resJson.data.stocks)) fetchedData.stocks = resJson.data.stocks;
        if (Array.isArray(resJson.data.employees)) fetchedData.employees = resJson.data.employees;
      }
    }
  } catch (err) {
    console.warn('[Data Fetch] Server data fetch endpoint note:', err);
  }

  // 2. Direct Firestore SDK read to retrieve user data across devices
  if (cleanPhone && cleanPhone.length === 10) {
    try {
      const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
      const { db, ensureFirebaseAuth } = await import('./firebase');
      await ensureFirebaseAuth();

      const merchantRef = doc(db, 'merchants', `merchant-${cleanPhone}`);
      const merchantSnap = await getDoc(merchantRef);

      if (merchantSnap.exists()) {
        const snapProfile = merchantSnap.data() as MerchantProfile;
        if (snapProfile) fetchedData.profile = { ...fetchedData.profile, ...snapProfile };
      }

      const fetchSubDocs = async (collectionName: string) => {
        try {
          const snap = await getDocs(collection(db, 'merchants', `merchant-${cleanPhone}`, collectionName));
          if (!snap.empty) {
            return snap.docs.map((d) => d.data());
          }
        } catch {}
        return [];
      };

      const [cloudFarmers, cloudLots, cloudShipments, cloudPayments, cloudSettlements, cloudStocks, cloudEmployees] = await Promise.all([
        fetchSubDocs('farmers'),
        fetchSubDocs('lots'),
        fetchSubDocs('shipments'),
        fetchSubDocs('payments'),
        fetchSubDocs('settlements'),
        fetchSubDocs('stocks'),
        fetchSubDocs('employees'),
      ]);

      if (cloudFarmers.length > 0) fetchedData.farmers = cloudFarmers as Farmer[];
      if (cloudLots.length > 0) fetchedData.lots = cloudLots as SaleLot[];
      if (cloudShipments.length > 0) fetchedData.shipments = cloudShipments as Shipment[];
      if (cloudPayments.length > 0) fetchedData.payments = cloudPayments as PaymentRecord[];
      if (cloudSettlements.length > 0) fetchedData.settlements = cloudSettlements as FifteenDaySettlement[];
      if (cloudStocks.length > 0) fetchedData.stocks = cloudStocks as StockItem[];
      if (cloudEmployees.length > 0) fetchedData.employees = cloudEmployees as EmployeeRecord[];

      // Also load account record
      const accRef = doc(db, 'registeredAccounts', cleanPhone);
      const accSnap = await getDoc(accRef);
      if (accSnap.exists()) {
        fetchedData.registeredAccounts = [accSnap.data() as RegisteredAccount];
      }
    } catch (err) {
      console.warn('[Data Fetch] Direct Firestore merchant read exception:', err);
    }
  }

  return fetchedData;
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
    const { db, ensureFirebaseAuth } = await import('./firebase');
    await ensureFirebaseAuth();
    const docRef = doc(db, 'registeredAccounts', cleanPhone);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as RegisteredAccount;
    }
  } catch (err) {
    console.warn('[Firestore] fetchUserAccountByPhone note:', err instanceof Error ? err.message : String(err));
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
    const { db, ensureFirebaseAuth } = await import('./firebase');
    await ensureFirebaseAuth();
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
    console.warn('[Firestore] fetchUserAccountByUsernameOrPhone note:', err instanceof Error ? err.message : String(err));
  }

  return null;
}

/**
 * Real-time Firestore Listener & polling listener for live multi-device syncing
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
  const cleanPhone = targetPhone ? targetPhone.replace(/\D/g, '').slice(-10) : '';

  let unsubs: (() => void)[] = [];

  if (cleanPhone && cleanPhone.length === 10) {
    import('firebase/firestore').then(({ doc, onSnapshot, collection }) => {
      import('./firebase').then(({ db }) => {
        if (!active) return;

        const merchantRef = doc(db, 'merchants', `merchant-${cleanPhone}`);

        // Merchant profile listener
        const unsubProf = onSnapshot(merchantRef, (snap) => {
          if (snap.exists() && active) {
            onUpdate({ profile: snap.data() as MerchantProfile });
          }
        }, () => {});
        unsubs.push(unsubProf);

        // Lots (Parchis & Form C) listener
        const unsubLots = onSnapshot(collection(db, 'merchants', `merchant-${cleanPhone}`, 'lots'), (snap) => {
          if (!snap.empty && active) {
            const lots = snap.docs.map((d) => d.data() as SaleLot);
            onUpdate({ lots });
          }
        }, () => {});
        unsubs.push(unsubLots);

        // Farmers listener
        const unsubFarmers = onSnapshot(collection(db, 'merchants', `merchant-${cleanPhone}`, 'farmers'), (snap) => {
          if (!snap.empty && active) {
            const farmers = snap.docs.map((d) => d.data() as Farmer);
            onUpdate({ farmers });
          }
        }, () => {});
        unsubs.push(unsubFarmers);

        // Payments listener
        const unsubPayments = onSnapshot(collection(db, 'merchants', `merchant-${cleanPhone}`, 'payments'), (snap) => {
          if (!snap.empty && active) {
            const payments = snap.docs.map((d) => d.data() as PaymentRecord);
            onUpdate({ payments });
          }
        }, () => {});
        unsubs.push(unsubPayments);
      });
    }).catch(() => {});
  }

  // Backup polling every 12 seconds
  const intervalId = setInterval(async () => {
    if (!active) return;
    try {
      const fetched = await fetchFromFirestore(cleanPhone);
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
    } catch {}
  }, 12000);

  return () => {
    active = false;
    clearInterval(intervalId);
    unsubs.forEach((unsub) => {
      try { unsub(); } catch {}
    });
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
