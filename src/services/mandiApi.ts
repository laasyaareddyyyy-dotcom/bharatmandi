import { SaleLot, Farmer, MonthlySalesSummary, FarmerSearchResult } from '../types';

export interface FarmerParchiResponse {
  view: 'daily' | 'monthly';
  date?: string;
  month?: string;
  parchis: SaleLot[];
  summary: {
    totalParchis: number;
    totalVolume: number;
    grossTotal: number;
    commissionAmount: number;
    totalOtherExpenditures: number;
    farmerNetPayable: number;
    amountPaid: number;
    balanceDue: number;
    settledCount: number;
    partialCount: number;
    unpaidCount: number;
  };
}

export interface FarmerSearchResponse {
  query: string;
  count: number;
  farmers: FarmerSearchResult[];
}

export interface FarmerTransactionsResponse {
  farmerId: string;
  farmerName?: string;
  merchantId?: string;
  count: number;
  transactions: SaleLot[];
}

export interface FarmerSalesSummaryResponse {
  farmerId: string;
  merchantId?: string;
  groupBy: 'month';
  summaries: MonthlySalesSummary[];
  overall: {
    totalParchis: number;
    totalVolume: number;
    grossTotal: number;
    farmerNetPayable: number;
    amountPaid: number;
    balanceDue: number;
  };
}

function formatMonthLabel(ym: string): string {
  try {
    const [y, m] = ym.split('-');
    if (!y || !m) return ym;
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch {
    return ym;
  }
}

/**
 * Filter lots matching a specific farmer by ID, phone, or name
 */
export function filterLotsForFarmer(lots: SaleLot[], farmerId?: string, farmerPhone?: string, farmerName?: string): SaleLot[] {
  const cleanPhone = farmerPhone ? farmerPhone.replace(/\D/g, '').slice(-10) : '';
  const normName = (farmerName || '').trim().toLowerCase();
  const targetId = (farmerId || '').trim();

  return lots.filter((lot) => {
    if (targetId && lot.farmerId === targetId) return true;
    const lotPhone = lot.farmerPhone ? lot.farmerPhone.replace(/\D/g, '').slice(-10) : '';
    if (cleanPhone && lotPhone && lotPhone === cleanPhone) return true;
    if (normName && lot.farmerName && lot.farmerName.trim().toLowerCase() === normName) return true;
    return false;
  });
}

/**
 * Aggregate lots into monthly sales summaries
 */
export function calculateMonthlySalesSummaries(lots: SaleLot[], merchantFilter?: string): MonthlySalesSummary[] {
  const filtered = merchantFilter && merchantFilter !== 'all'
    ? lots.filter((l) => l.merchantId === merchantFilter || l.merchantName?.toLowerCase() === merchantFilter.toLowerCase())
    : lots;

  const monthMap: Record<string, {
    lots: SaleLot[];
    merchantId?: string;
    merchantName?: string;
  }> = {};

  filtered.forEach((lot) => {
    // Extract YYYY-MM
    const month = lot.date ? lot.date.slice(0, 7) : 'Unknown';
    if (!monthMap[month]) {
      monthMap[month] = { lots: [] };
    }
    monthMap[month].lots.push(lot);
  });

  const sortedMonths = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));

  return sortedMonths.map((month) => {
    const groupLots = monthMap[month].lots;
    const volume = groupLots.reduce((acc, l) => acc + (l.quantity || 0), 0);
    const gross = groupLots.reduce((acc, l) => acc + (l.grossTotal || 0), 0);
    const comm = groupLots.reduce((acc, l) => acc + (l.commissionAmount || 0), 0);
    const exp = groupLots.reduce((acc, l) => acc + (l.totalOtherExpenditures || 0), 0);
    const net = groupLots.reduce((acc, l) => acc + (l.farmerNetPayable || 0), 0);
    const paid = groupLots.reduce((acc, l) => acc + (l.amountPaid || 0), 0);
    const due = groupLots.reduce((acc, l) => acc + (l.balanceDue || 0), 0);

    const settlementRate = net > 0 ? Math.min(100, Math.round((paid / net) * 100)) : 100;

    return {
      month,
      monthLabel: formatMonthLabel(month),
      merchantId: merchantFilter && merchantFilter !== 'all' ? merchantFilter : undefined,
      merchantName: merchantFilter && merchantFilter !== 'all' ? groupLots[0]?.merchantName : 'All Connected Merchants',
      lotsCount: groupLots.length,
      totalVolume: volume,
      grossTotal: gross,
      commissionAmount: comm,
      totalOtherExpenditures: exp,
      farmerNetPayable: net,
      amountPaid: paid,
      balanceDue: due,
      settlementRate,
    };
  });
}

/**
 * GET /api/farmer/parchi?view=daily|monthly&date=...
 */
export async function getFarmerParchiApi(params: {
  view: 'daily' | 'monthly';
  date?: string;
  month?: string;
  farmerId?: string;
  farmerPhone?: string;
  farmerName?: string;
  lots: SaleLot[];
}): Promise<FarmerParchiResponse> {
  const { view, date, month, farmerId, farmerPhone, farmerName, lots } = params;

  // Attempt server fetch first
  try {
    const q = new URLSearchParams();
    q.set('view', view);
    if (date) q.set('date', date);
    if (month) q.set('month', month);
    if (farmerId) q.set('farmerId', farmerId);
    if (farmerPhone) q.set('farmerPhone', farmerPhone);

    const res = await fetch(`/api/farmer/parchi?${q.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.parchis)) {
        return data;
      }
    }
  } catch {
    // fallback to local computation
  }

  // Local fallback calculation
  const farmerLots = filterLotsForFarmer(lots, farmerId, farmerPhone, farmerName);

  let parchiList: SaleLot[] = [];
  if (view === 'daily') {
    const targetDate = date || (farmerLots[0]?.date || new Date().toISOString().slice(0, 10));
    parchiList = farmerLots.filter((l) => l.date === targetDate);
  } else {
    const targetMonth = month || (date ? date.slice(0, 7) : (farmerLots[0]?.date?.slice(0, 7) || new Date().toISOString().slice(0, 7)));
    parchiList = farmerLots.filter((l) => l.date && l.date.startsWith(targetMonth));
  }

  const volume = parchiList.reduce((acc, l) => acc + (l.quantity || 0), 0);
  const gross = parchiList.reduce((acc, l) => acc + (l.grossTotal || 0), 0);
  const comm = parchiList.reduce((acc, l) => acc + (l.commissionAmount || 0), 0);
  const exp = parchiList.reduce((acc, l) => acc + (l.totalOtherExpenditures || 0), 0);
  const net = parchiList.reduce((acc, l) => acc + (l.farmerNetPayable || 0), 0);
  const paid = parchiList.reduce((acc, l) => acc + (l.amountPaid || 0), 0);
  const due = parchiList.reduce((acc, l) => acc + (l.balanceDue || 0), 0);

  const settledCount = parchiList.filter((l) => l.paymentStatus === 'Paid' || l.balanceDue <= 0).length;
  const partialCount = parchiList.filter((l) => l.paymentStatus === 'Partial' || (l.amountPaid > 0 && l.balanceDue > 0)).length;
  const unpaidCount = parchiList.filter((l) => l.paymentStatus === 'Unpaid' && l.amountPaid === 0).length;

  return {
    view,
    date,
    month,
    parchis: parchiList,
    summary: {
      totalParchis: parchiList.length,
      totalVolume: volume,
      grossTotal: gross,
      commissionAmount: comm,
      totalOtherExpenditures: exp,
      farmerNetPayable: net,
      amountPaid: paid,
      balanceDue: due,
      settledCount,
      partialCount,
      unpaidCount,
    },
  };
}

/**
 * GET /api/farmers/search?query=...
 */
export async function searchFarmersApi(params: {
  query: string;
  role?: 'farmer' | 'merchant' | 'admin';
  farmers: Farmer[];
  lots: SaleLot[];
}): Promise<FarmerSearchResponse> {
  const { query, farmers, lots } = params;
  const q = query.trim().toLowerCase();

  try {
    const res = await fetch(`/api/farmers/search?query=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.farmers)) {
        return data;
      }
    }
  } catch {
    // fallback
  }

  // Deduplicate and extract all known farmers from both farmers array and lots
  const farmerMap = new Map<string, FarmerSearchResult>();

  farmers.forEach((f) => {
    const cleanPhone = f.phone ? f.phone.replace(/\D/g, '').slice(-10) : '';
    const key = f.id || cleanPhone || f.name.toLowerCase();
    farmerMap.set(key, {
      farmerId: f.id,
      name: f.name,
      phone: cleanPhone,
      village: f.village,
      primaryCrops: f.primaryCrops || ['Marigold (Banthi)'],
      photoUrl: f.photoUrl,
      connectedMerchantIds: f.connectedMerchantIds || [],
      totalLotsCount: 0,
      totalTurnover: 0,
      pendingDues: 0,
    });
  });

  // Calculate lots count and dues from lots
  lots.forEach((l) => {
    const cleanPhone = l.farmerPhone ? l.farmerPhone.replace(/\D/g, '').slice(-10) : '';
    const key = l.farmerId || cleanPhone || l.farmerName.toLowerCase();
    
    let existing = farmerMap.get(key);
    if (!existing) {
      existing = {
        farmerId: l.farmerId || `FM-${cleanPhone.slice(-4) || '001'}`,
        name: l.farmerName,
        phone: cleanPhone,
        village: l.farmerVillage || 'Local Belt',
        primaryCrops: [l.flowerVariety],
        connectedMerchantIds: l.merchantId ? [l.merchantId] : [],
        totalLotsCount: 0,
        totalTurnover: 0,
        pendingDues: 0,
      };
      farmerMap.set(key, existing);
    }

    existing.totalLotsCount = (existing.totalLotsCount || 0) + 1;
    existing.totalTurnover = (existing.totalTurnover || 0) + (l.grossTotal || 0);
    existing.pendingDues = (existing.pendingDues || 0) + (l.balanceDue || 0);
    if (l.flowerVariety && !existing.primaryCrops.includes(l.flowerVariety)) {
      existing.primaryCrops.push(l.flowerVariety);
    }
  });

  const allResults = Array.from(farmerMap.values());

  const filtered = !q
    ? allResults
    : allResults.filter((f) => {
        return (
          f.name.toLowerCase().includes(q) ||
          f.phone.includes(q) ||
          f.farmerId.toLowerCase().includes(q) ||
          f.village.toLowerCase().includes(q) ||
          f.primaryCrops.some((c) => c.toLowerCase().includes(q))
        );
      });

  return {
    query,
    count: filtered.length,
    farmers: filtered,
  };
}

/**
 * GET /api/farmer/{farmerId}/transactions?merchantId=...
 */
export async function getFarmerTransactionsApi(params: {
  farmerId: string;
  farmerPhone?: string;
  farmerName?: string;
  merchantId?: string;
  lots: SaleLot[];
}): Promise<FarmerTransactionsResponse> {
  const { farmerId, farmerPhone, farmerName, merchantId, lots } = params;

  try {
    const url = `/api/farmer/${encodeURIComponent(farmerId)}/transactions${
      merchantId ? `?merchantId=${encodeURIComponent(merchantId)}` : ''
    }`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.transactions)) {
        return data;
      }
    }
  } catch {
    // fallback
  }

  const farmerLots = filterLotsForFarmer(lots, farmerId, farmerPhone, farmerName);
  const matching = merchantId && merchantId !== 'all'
    ? farmerLots.filter((l) => l.merchantId === merchantId || l.merchantName?.toLowerCase() === merchantId.toLowerCase())
    : farmerLots;

  return {
    farmerId,
    farmerName: farmerLots[0]?.farmerName || farmerName,
    merchantId,
    count: matching.length,
    transactions: matching,
  };
}

/**
 * GET /api/farmer/{farmerId}/sales-summary?merchantId=...&groupBy=month
 * GET /api/farmer/{farmerId}/sales-summary?groupBy=month (Overall)
 */
export async function getFarmerSalesSummaryApi(params: {
  farmerId: string;
  farmerPhone?: string;
  farmerName?: string;
  merchantId?: string;
  groupBy: 'month';
  lots: SaleLot[];
}): Promise<FarmerSalesSummaryResponse> {
  const { farmerId, farmerPhone, farmerName, merchantId, groupBy, lots } = params;

  try {
    const q = new URLSearchParams();
    q.set('groupBy', groupBy);
    if (merchantId && merchantId !== 'all') q.set('merchantId', merchantId);

    const res = await fetch(`/api/farmer/${encodeURIComponent(farmerId)}/sales-summary?${q.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.summaries)) {
        return data;
      }
    }
  } catch {
    // fallback
  }

  const farmerLots = filterLotsForFarmer(lots, farmerId, farmerPhone, farmerName);
  const summaries = calculateMonthlySalesSummaries(farmerLots, merchantId);

  const totalVolume = summaries.reduce((acc, s) => acc + s.totalVolume, 0);
  const grossTotal = summaries.reduce((acc, s) => acc + s.grossTotal, 0);
  const farmerNetPayable = summaries.reduce((acc, s) => acc + s.farmerNetPayable, 0);
  const amountPaid = summaries.reduce((acc, s) => acc + s.amountPaid, 0);
  const balanceDue = summaries.reduce((acc, s) => acc + s.balanceDue, 0);
  const totalParchis = summaries.reduce((acc, s) => acc + s.lotsCount, 0);

  return {
    farmerId,
    merchantId,
    groupBy,
    summaries,
    overall: {
      totalParchis,
      totalVolume,
      grossTotal,
      farmerNetPayable,
      amountPaid,
      balanceDue,
    },
  };
}
