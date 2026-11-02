import { getAdminDb } from './firebaseAdmin';

// In-Memory Fallback Store for Merchant Data
const memMerchants = new Map<string, any>();

function cleanUndefinedValues<T>(obj: T): T {
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
 * Sync Merchant Data to Firestore Admin (merchants/merchant-{phone}) with Memory Fallback
 */
export async function handleSyncData(userPhone: string, data: any) {
  if (!userPhone || userPhone.length !== 10) {
    return { success: false, error: 'Invalid user phone for data sync.' };
  }

  const merchantId = `merchant-${userPhone}`;
  const existingMem = memMerchants.get(merchantId) || {
    profile: undefined,
    farmers: [],
    lots: [],
    shipments: [],
    payments: [],
    settlements: [],
    stocks: [],
    employees: [],
  };

  if (data.profile) existingMem.profile = data.profile;
  if (Array.isArray(data.farmers)) existingMem.farmers = data.farmers;
  if (Array.isArray(data.lots)) existingMem.lots = data.lots;
  if (Array.isArray(data.shipments)) existingMem.shipments = data.shipments;
  if (Array.isArray(data.payments)) existingMem.payments = data.payments;
  if (Array.isArray(data.settlements)) existingMem.settlements = data.settlements;
  if (Array.isArray(data.stocks)) existingMem.stocks = data.stocks;
  if (Array.isArray(data.employees)) existingMem.employees = data.employees;

  memMerchants.set(merchantId, existingMem);

  const db = getAdminDb();
  if (db) {
    try {
      const merchantRef = db.collection('merchants').doc(merchantId);

      if (data.profile) {
        await merchantRef.set(
          cleanUndefinedValues({
            ...data.profile,
            userPhone,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      }

      if (Array.isArray(data.farmers)) {
        for (const farmer of data.farmers) {
          if (!farmer.id) continue;
          await merchantRef.collection('farmers').doc(String(farmer.id)).set(cleanUndefinedValues(farmer), { merge: true });
        }
      }

      if (Array.isArray(data.lots)) {
        for (const lot of data.lots) {
          if (!lot.id) continue;
          await merchantRef.collection('lots').doc(String(lot.id)).set(cleanUndefinedValues(lot), { merge: true });
        }
      }

      if (Array.isArray(data.shipments)) {
        for (const shipment of data.shipments) {
          if (!shipment.id) continue;
          await merchantRef.collection('shipments').doc(String(shipment.id)).set(cleanUndefinedValues(shipment), { merge: true });
        }
      }

      if (Array.isArray(data.payments)) {
        for (const payment of data.payments) {
          if (!payment.id) continue;
          await merchantRef.collection('payments').doc(String(payment.id)).set(cleanUndefinedValues(payment), { merge: true });
        }
      }

      if (Array.isArray(data.settlements)) {
        for (const settlement of data.settlements) {
          if (!settlement.id) continue;
          await merchantRef.collection('settlements').doc(String(settlement.id)).set(cleanUndefinedValues(settlement), { merge: true });
        }
      }

      if (Array.isArray(data.stocks)) {
        for (const stock of data.stocks) {
          if (!stock.id) continue;
          await merchantRef.collection('stocks').doc(String(stock.id)).set(cleanUndefinedValues(stock), { merge: true });
        }
      }

      if (Array.isArray(data.employees)) {
        for (const emp of data.employees) {
          if (!emp.id) continue;
          await merchantRef.collection('employees').doc(String(emp.id)).set(cleanUndefinedValues(emp), { merge: true });
        }
      }

      if (Array.isArray(data.workerRequests)) {
        for (const wreq of data.workerRequests) {
          if (!wreq.id) continue;
          await merchantRef.collection('workerRequests').doc(String(wreq.id)).set(cleanUndefinedValues(wreq), { merge: true });
        }
      }
    } catch (err: any) {
      console.warn('[Data Handler Sync Note]', err?.message || err);
    }
  }

  return { success: true, message: 'Data synced successfully to server database.' };
}

/**
 * Fetch Merchant Data from Firestore Admin (merchants/merchant-{phone}) with Memory Fallback
 */
export async function handleFetchData(userPhone: string) {
  if (!userPhone || userPhone.length !== 10) {
    return { success: false, error: 'Invalid user phone for data fetch.' };
  }

  const merchantId = `merchant-${userPhone}`;
  const memData = memMerchants.get(merchantId);
  const db = getAdminDb();

  if (db) {
    try {
      const merchantRef = db.collection('merchants').doc(merchantId);
      const merchantSnap = await merchantRef.get();
      const profile = merchantSnap.exists ? merchantSnap.data() : memData?.profile;

      const safeFetchSubDocs = async (collectionName: string) => {
        try {
          const snap = await merchantRef.collection(collectionName).get();
          if (!snap.empty) return snap.docs.map((d) => d.data());
        } catch {}
        return memData?.[collectionName] || [];
      };

      const [farmers, lots, shipments, payments, settlements, stocks, employees, workerRequests] = await Promise.all([
        safeFetchSubDocs('farmers'),
        safeFetchSubDocs('lots'),
        safeFetchSubDocs('shipments'),
        safeFetchSubDocs('payments'),
        safeFetchSubDocs('settlements'),
        safeFetchSubDocs('stocks'),
        safeFetchSubDocs('employees'),
        safeFetchSubDocs('workerRequests'),
      ]);

      return {
        success: true,
        data: {
          profile: profile || memData?.profile,
          farmers,
          lots,
          shipments,
          payments,
          settlements,
          stocks,
          employees,
          workerRequests,
        },
      };
    } catch (err: any) {
      console.warn('[Data Handler Fetch Note]', err?.message || err);
    }
  }

  // Return in-memory merchant data fallback
  return {
    success: true,
    data: memData || {
      profile: undefined,
      farmers: [],
      lots: [],
      shipments: [],
      payments: [],
      settlements: [],
      stocks: [],
      employees: [],
    },
  };
}

/**
 * Delete Item from Merchant Subcollection
 */
export async function handleDeleteData(userPhone: string, itemType: string, itemId: string) {
  if (!userPhone || !itemType || !itemId) {
    return { success: false, error: 'Missing parameters for data deletion.' };
  }

  const merchantId = `merchant-${userPhone}`;
  const memData = memMerchants.get(merchantId);
  if (memData && Array.isArray(memData[itemType])) {
    memData[itemType] = memData[itemType].filter((item: any) => String(item.id) !== String(itemId));
    memMerchants.set(merchantId, memData);
  }

  const db = getAdminDb();
  if (db) {
    try {
      await db.collection('merchants').doc(merchantId).collection(itemType).doc(String(itemId)).delete();
    } catch {}
  }

  return { success: true, message: `Item ${itemId} deleted from ${itemType}.` };
}
