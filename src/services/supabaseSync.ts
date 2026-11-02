import { supabase, isSupabaseConfigured } from './supabase';
import {
  MerchantProfile,
  Farmer,
  SaleLot,
  Shipment,
  PaymentRecord,
  FifteenDaySettlement,
  HelpTicket,
} from '../types';

export function getActiveOwnerUid(): string {
  try {
    const savedPhone =
      localStorage.getItem('bharatmandi_active_phone_v1') ??
      localStorage.getItem('phoolmitra_current_user_phone');
    if (savedPhone) return `user-${savedPhone}`;
  } catch {}
  return 'laasyaareddyyyy@gmail.com';
}

/**
 * Uploads full Mandi state to Supabase PostgreSQL (and local backup).
 */
export async function syncLocalToSupabase(data: {
  profile: MerchantProfile;
  farmers: Farmer[];
  lots: SaleLot[];
  shipments: Shipment[];
  payments: PaymentRecord[];
  settlements: FifteenDaySettlement[];
  helpTickets?: HelpTicket[];
}): Promise<{ success: boolean; error?: string }> {
  // Always update local cache backup
  try {
    localStorage.setItem('bharatmandi_cloud_backup_v1', JSON.stringify(data));
  } catch {}

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  const uid = getActiveOwnerUid();

  try {
    // 1. Upsert Merchant Profile
    if (data.profile) {
      const p = data.profile;
      await supabase.from('merchants').upsert(
        {
          id: p.merchantId || 'MANDI-HYD-014',
          merchant_id: p.merchantId || 'MANDI-HYD-014',
          owner_uid: uid,
          shop_name: p.shopName || '',
          shop_number: p.shopNumber || '',
          market_yard_name: p.marketYardName || '',
          owner_name: p.ownerName || '',
          phone_number: p.phoneNumber || '',
          default_commission_percent: p.defaultCommissionRate ?? 5,
          address: p.address || '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'merchant_id' }
      );
    }

    // 2. Upsert Farmers
    if (Array.isArray(data.farmers) && data.farmers.length > 0) {
      const farmerRows = data.farmers.map((f, i) => ({
        id: f.id || `FM-${i + 1}`,
        owner_uid: uid,
        name: f.name || '',
        phone: f.phone || '',
        village: f.village || '',
        primary_crops: f.primaryCrops || [],
        created_at: f.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('farmers').upsert(farmerRows, { onConflict: 'id' });
    }

    // 3. Upsert Lots
    if (Array.isArray(data.lots) && data.lots.length > 0) {
      const lotRows = data.lots.map((l, i) => ({
        id: l.id || `LOT-${i + 1}`,
        parchi_number: l.parchiNumber || '',
        owner_uid: uid,
        farmer_id: l.farmerId || '',
        farmer_name: l.farmerName || '',
        farmer_phone: l.farmerPhone || '',
        farmer_village: l.farmerVillage || '',
        commodity_category: l.commodityCategory || 'flowers',
        flower_variety: l.flowerVariety || '',
        quantity: l.quantity ?? 0,
        unit: l.unit || 'Boxes',
        rate: l.rate ?? 0,
        gross_total: l.grossTotal ?? 0,
        commission_percent: l.commissionPercent ?? 5,
        commission_amount: l.commissionAmount ?? 0,
        boxes_count: l.boxesCount ?? 1,
        hamali_amount: l.ammaliCharges ?? 0,
        transport_deduction: l.transportCharges ?? 0,
        farmer_net_payable: l.farmerNetPayable ?? 0,
        payment_status: l.paymentStatus || 'Unpaid',
        amount_paid: l.amountPaid ?? 0,
        balance_due: l.balanceDue ?? 0,
        date: l.date || '',
        time: l.time || '',
        shipment_id: l.shipmentId || null,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('lots').upsert(lotRows, { onConflict: 'id' });
    }

    // 4. Upsert Shipments
    if (Array.isArray(data.shipments) && data.shipments.length > 0) {
      const shipmentRows = data.shipments.map((s, i) => ({
        id: s.id || `SHIP-${i + 1}`,
        shipment_number: s.shipmentNumber || '',
        owner_uid: uid,
        farmer_id: s.farmerId || '',
        farmer_name: s.farmerName || '',
        farmer_phone: s.farmerPhone || '',
        farmer_village: s.farmerVillage || '',
        transport_expense: s.transportCharge ?? 0,
        hamali_expense: s.hamaliCharge ?? 0,
        gross_total: s.grossTotal ?? 0,
        farmer_net_payable: s.netAmountAfterDailyCuts ?? 0,
        payment_status: s.paymentStatus || 'Unpaid',
        amount_paid: s.amountPaid ?? 0,
        balance_due: s.balanceDue ?? 0,
        variety_rows: s.items || [],
        date: s.date || '',
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('shipments').upsert(shipmentRows, { onConflict: 'id' });
    }

    // 5. Upsert Payments
    if (Array.isArray(data.payments) && data.payments.length > 0) {
      const paymentRows = data.payments.map((p, i) => ({
        id: p.id || `PAY-${i + 1}`,
        owner_uid: uid,
        farmer_id: p.farmerId || '',
        farmer_name: p.farmerName || '',
        amount: p.amount ?? 0,
        payment_mode: p.paymentMode || 'Cash',
        reference_number: p.referenceNumber || '',
        date: p.date || '',
        time: p.time || '',
        notes: p.notes || '',
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('payments').upsert(paymentRows, { onConflict: 'id' });
    }

    // 6. Upsert Settlements
    if (Array.isArray(data.settlements) && data.settlements.length > 0) {
      const settlementRows = data.settlements.map((st, i) => ({
        id: st.id || `SETTLE-${i + 1}`,
        owner_uid: uid,
        farmer_id: st.farmerId || '',
        farmer_name: st.farmerName || '',
        period_start: st.periodStart || '',
        period_end: st.periodEnd || '',
        total_sales: st.totalGross ?? 0,
        net_payable: st.finalPayment ?? 0,
        status: st.status || 'pending',
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('settlements').upsert(settlementRows, { onConflict: 'id' });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Supabase sync error:', error);
    return { success: false, error: error?.message || 'Supabase sync failed' };
  }
}

/**
 * Loads cloud data from Supabase PostgreSQL (or local fallback).
 */
export async function fetchUserCloudData(): Promise<{
  profile?: MerchantProfile;
  farmers: Farmer[];
  lots: SaleLot[];
  shipments: Shipment[];
  payments: PaymentRecord[];
  settlements: FifteenDaySettlement[];
  helpTickets: HelpTicket[];
} | null> {
  if (!isSupabaseConfigured()) {
    try {
      const saved = localStorage.getItem('bharatmandi_cloud_backup_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }

  const uid = getActiveOwnerUid();

  try {
    const [merchantsRes, farmersRes, lotsRes, shipmentsRes, paymentsRes, settlementsRes, ticketsRes] =
      await Promise.all([
        supabase.from('merchants').select('*').eq('owner_uid', uid).limit(1),
        supabase.from('farmers').select('*').eq('owner_uid', uid),
        supabase.from('lots').select('*').eq('owner_uid', uid),
        supabase.from('shipments').select('*').eq('owner_uid', uid),
        supabase.from('payments').select('*').eq('owner_uid', uid),
        supabase.from('settlements').select('*').eq('owner_uid', uid),
        supabase.from('help_tickets').select('*').eq('author_uid', uid),
      ]);

    let profile: MerchantProfile | undefined;
    if (merchantsRes.data && merchantsRes.data.length > 0) {
      const m = merchantsRes.data[0];
      profile = {
        merchantId: m.merchant_id || m.id,
        shopName: m.shop_name,
        shopNumber: m.shop_number,
        marketYardName: m.market_yard_name,
        ownerName: m.owner_name,
        phoneNumber: m.phone_number,
        licenseNumber: 'LIC-MND-01',
        defaultCommissionRate: Number(m.default_commission_percent) || 5,
        address: m.address || '',
      };
    }

    const farmers: Farmer[] = (farmersRes.data || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      phone: f.phone,
      village: f.village,
      primaryCrops: f.primary_crops || [],
      connectedMerchantIds: [f.owner_uid || uid],
      createdAt: f.created_at || new Date().toISOString(),
    }));

    const lots: SaleLot[] = (lotsRes.data || []).map((l: any) => ({
      id: l.id,
      parchiNumber: l.parchi_number,
      farmerId: l.farmer_id,
      farmerName: l.farmer_name,
      farmerPhone: l.farmer_phone,
      farmerVillage: l.farmer_village,
      commodityCategory: l.commodity_category,
      flowerVariety: l.flower_variety,
      quantity: l.quantity,
      unit: l.unit || 'Boxes',
      rate: l.rate,
      grossTotal: l.gross_total,
      commissionPercent: l.commission_percent,
      commissionAmount: l.commission_amount,
      boxesCount: l.boxes_count,
      ammaliCharges: l.hamali_amount,
      transportCharges: l.transport_deduction,
      otherExpenditures: { misc: 0 },
      totalOtherExpenditures: 0,
      farmerNetPayable: l.farmer_net_payable,
      paymentStatus: l.payment_status,
      amountPaid: l.amount_paid,
      balanceDue: l.balance_due,
      date: l.date,
      time: l.time,
      shipmentId: l.shipment_id,
    }));

    const shipments: Shipment[] = (shipmentsRes.data || []).map((s: any) => ({
      id: s.id,
      shipmentNumber: s.shipment_number,
      farmerId: s.farmer_id,
      farmerName: s.farmer_name,
      farmerPhone: s.farmer_phone,
      farmerVillage: s.farmer_village,
      time: s.time || '10:00 AM',
      items: s.variety_rows || [],
      grossTotal: s.gross_total,
      transportCharge: s.transport_expense,
      hamaliCharge: s.hamali_expense,
      netAmountAfterDailyCuts: s.farmer_net_payable,
      paymentStatus: s.payment_status,
      balanceDue: s.balance_due,
      amountPaid: s.amount_paid,
      date: s.date,
    }));

    const payments: PaymentRecord[] = (paymentsRes.data || []).map((p: any) => ({
      id: p.id,
      farmerId: p.farmer_id,
      farmerName: p.farmer_name,
      amount: p.amount,
      paymentMode: p.payment_mode,
      referenceNumber: p.reference_number,
      date: p.date,
      time: p.time,
      notes: p.notes,
    }));

    const settlements: FifteenDaySettlement[] = (settlementsRes.data || []).map((st: any) => ({
      id: st.id,
      settlementNumber: st.id,
      periodStart: st.period_start,
      periodEnd: st.period_end,
      periodLabel: `${st.period_start} to ${st.period_end}`,
      farmerId: st.farmer_id,
      farmerName: st.farmer_name,
      farmerVillage: 'Mandi Area',
      shipmentIds: [],
      totalShipmentsCount: 1,
      totalGross: st.total_sales,
      totalTransport: 0,
      totalHamali: 0,
      subtotalAfterCharges: st.total_sales,
      pendingAmountAfterDailyCuts: st.net_payable,
      commissionPercent: 5,
      commissionAmount: 0,
      finalPayment: st.net_payable,
      status: st.status,
    }));

    const helpTickets: HelpTicket[] = (ticketsRes.data || []).map((t: any) => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      userId: t.author_uid || uid,
      userName: t.user_name || 'Mandi Member',
      userPhone: t.user_phone || '',
      userRole: 'merchant',
      subject: t.subject,
      category: t.category || 'General Support',
      priority: t.priority || 'Medium',
      status: t.status || 'Open',
      description: t.description,
      createdAt: t.created_at || new Date().toISOString(),
      updatedAt: t.updated_at || new Date().toISOString(),
      responses: [],
    }));

    return {
      profile,
      farmers,
      lots,
      shipments,
      payments,
      settlements,
      helpTickets,
    };
  } catch (error) {
    console.error('Error fetching Supabase cloud data:', error);
    try {
      const saved = localStorage.getItem('bharatmandi_cloud_backup_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }
}

export async function syncFarmerToCloud(farmer: Farmer): Promise<boolean> {
  if (!isSupabaseConfigured() || !farmer?.id) return true;
  const uid = getActiveOwnerUid();
  try {
    await supabase.from('farmers').upsert({
      id: farmer.id,
      owner_uid: uid,
      name: farmer.name,
      phone: farmer.phone,
      village: farmer.village,
      primary_crops: farmer.primaryCrops || [],
      created_at: farmer.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteFarmerFromCloud(farmerId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !farmerId) return true;
  try {
    await supabase.from('farmers').delete().eq('id', farmerId);
    return true;
  } catch {
    return false;
  }
}

export async function syncLotToCloud(lot: SaleLot): Promise<boolean> {
  if (!isSupabaseConfigured() || !lot?.id) return true;
  const uid = getActiveOwnerUid();
  try {
    await supabase.from('lots').upsert({
      id: lot.id,
      parchi_number: lot.parchiNumber || '',
      owner_uid: uid,
      farmer_id: lot.farmerId || '',
      farmer_name: lot.farmerName || '',
      farmer_phone: lot.farmerPhone || '',
      farmer_village: lot.farmerVillage || '',
      commodity_category: lot.commodityCategory || 'flowers',
      flower_variety: lot.flowerVariety || '',
      quantity: lot.quantity ?? 0,
      unit: lot.unit || 'Boxes',
      rate: lot.rate ?? 0,
      gross_total: lot.grossTotal ?? 0,
      commission_percent: lot.commissionPercent ?? 5,
      commission_amount: lot.commissionAmount ?? 0,
      boxes_count: lot.boxesCount ?? 1,
      hamali_amount: lot.ammaliCharges ?? 0,
      transport_deduction: lot.transportCharges ?? 0,
      farmer_net_payable: lot.farmerNetPayable ?? 0,
      payment_status: lot.paymentStatus || 'Unpaid',
      amount_paid: lot.amountPaid ?? 0,
      balance_due: lot.balanceDue ?? 0,
      date: lot.date || '',
      time: lot.time || '',
      shipment_id: lot.shipmentId || null,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteLotFromCloud(lotId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !lotId) return true;
  try {
    await supabase.from('lots').delete().eq('id', lotId);
    return true;
  } catch {
    return false;
  }
}

export async function syncShipmentToCloud(shipment: Shipment): Promise<boolean> {
  if (!isSupabaseConfigured() || !shipment?.id) return true;
  const uid = getActiveOwnerUid();
  try {
    await supabase.from('shipments').upsert({
      id: shipment.id,
      shipment_number: shipment.shipmentNumber || '',
      owner_uid: uid,
      farmer_id: shipment.farmerId || '',
      farmer_name: shipment.farmerName || '',
      farmer_phone: shipment.farmerPhone || '',
      farmer_village: shipment.farmerVillage || '',
      transport_expense: shipment.transportCharge ?? 0,
      hamali_expense: shipment.hamaliCharge ?? 0,
      gross_total: shipment.grossTotal ?? 0,
      farmer_net_payable: shipment.netAmountAfterDailyCuts ?? 0,
      payment_status: shipment.paymentStatus || 'Unpaid',
      amount_paid: shipment.amountPaid ?? 0,
      balance_due: shipment.balanceDue ?? 0,
      variety_rows: shipment.items || [],
      date: shipment.date || '',
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteShipmentFromCloud(shipmentId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !shipmentId) return true;
  try {
    await supabase.from('shipments').delete().eq('id', shipmentId);
    return true;
  } catch {
    return false;
  }
}

export async function syncPaymentToCloud(payment: PaymentRecord): Promise<boolean> {
  if (!isSupabaseConfigured() || !payment?.id) return true;
  const uid = getActiveOwnerUid();
  try {
    await supabase.from('payments').upsert({
      id: payment.id,
      owner_uid: uid,
      farmer_id: payment.farmerId || '',
      farmer_name: payment.farmerName || '',
      amount: payment.amount ?? 0,
      payment_mode: payment.paymentMode || 'Cash',
      reference_number: payment.referenceNumber || '',
      date: payment.date || '',
      time: payment.time || '',
      notes: payment.notes || '',
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function deletePaymentFromCloud(paymentId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !paymentId) return true;
  try {
    await supabase.from('payments').delete().eq('id', paymentId);
    return true;
  } catch {
    return false;
  }
}

export async function syncSettlementToCloud(settlement: FifteenDaySettlement): Promise<boolean> {
  if (!isSupabaseConfigured() || !settlement?.id) return true;
  const uid = getActiveOwnerUid();
  try {
    await supabase.from('settlements').upsert({
      id: settlement.id,
      owner_uid: uid,
      farmer_id: settlement.farmerId || '',
      farmer_name: settlement.farmerName || '',
      period_start: settlement.periodStart || '',
      period_end: settlement.periodEnd || '',
      total_sales: settlement.totalGross ?? 0,
      net_payable: settlement.finalPayment ?? 0,
      status: settlement.status || 'pending',
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function syncMerchantProfileToCloud(profile: MerchantProfile): Promise<boolean> {
  if (!isSupabaseConfigured() || !profile) return true;
  const uid = getActiveOwnerUid();
  try {
    await supabase.from('merchants').upsert(
      {
        id: profile.merchantId || 'MANDI-HYD-014',
        merchant_id: profile.merchantId || 'MANDI-HYD-014',
        owner_uid: uid,
        shop_name: profile.shopName || '',
        shop_number: profile.shopNumber || '',
        market_yard_name: profile.marketYardName || '',
        owner_name: profile.ownerName || '',
        phone_number: profile.phoneNumber || '',
        default_commission_percent: profile.defaultCommissionRate ?? 5,
        address: profile.address || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_id' }
    );
    return true;
  } catch {
    return false;
  }
}

export async function checkCloudDuplicateRegistration(params: {
  phoneNumber: string;
  shopNumber?: string;
  marketName?: string;
  shopName?: string;
  role?: string;
  excludePhone?: string;
}): Promise<{ isDuplicate: boolean; message?: string }> {
  const cleanPhone = params.phoneNumber.replace(/\D/g, '').slice(-10);
  const cleanExclude = params.excludePhone ? params.excludePhone.replace(/\D/g, '').slice(-10) : '';

  if (cleanExclude && cleanPhone === cleanExclude) {
    return { isDuplicate: false };
  }

  // 1. Check in local storage first
  try {
    const savedAccounts = localStorage.getItem('bharatmandi_registered_accounts');
    if (savedAccounts) {
      const accounts: any[] = JSON.parse(savedAccounts);
      const exists = accounts.some(
        (acc) => acc.phoneNumber && acc.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone
      );
      if (exists) {
        return {
          isDuplicate: true,
          message: `An account with mobile number +91 ${cleanPhone} already exists. Please login instead.`,
        };
      }
    }
  } catch {}

  // 2. Check in Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('phone_number')
        .eq('phone_number', cleanPhone);

      if (accountsData && accountsData.length > 0) {
        return {
          isDuplicate: true,
          message: `An account with mobile number +91 ${cleanPhone} already exists. Please login instead.`,
        };
      }

      const { data: merchantsData } = await supabase
        .from('merchants')
        .select('phone_number')
        .ilike('phone_number', `%${cleanPhone}%`);

      if (merchantsData && merchantsData.length > 0) {
        return {
          isDuplicate: true,
          message: `A merchant account with mobile number +91 ${cleanPhone} is already registered.`,
        };
      }
    } catch (e) {
      console.warn('Supabase duplicate registration check error:', e);
    }
  }

  return { isDuplicate: false };
}

export async function checkCloudDuplicateFarmer(params: {
  ownerUid: string;
  phone: string;
  name: string;
  village: string;
  excludeFarmerId?: string;
}): Promise<{ isDuplicate: boolean; message?: string }> {
  return { isDuplicate: false };
}

export async function checkCloudDuplicateParchi(
  ownerUid: string,
  parchiNumber: string
): Promise<boolean> {
  const cleanParchi = parchiNumber.trim();
  if (!cleanParchi) return false;

  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('lots')
        .select('id')
        .eq('owner_uid', ownerUid)
        .eq('parchi_number', cleanParchi)
        .limit(1);
      return Boolean(data && data.length > 0);
    } catch {
      return false;
    }
  }
  return false;
}

export async function recordCloudUserSession(
  userPhone: string,
  sessionId: string
): Promise<boolean> {
  const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
  if (!cleanPhone) return true;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('user_sessions').upsert({
        phone_number: cleanPhone,
        current_session_id: sessionId,
        last_login_at: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web-app',
      });
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

export function listenToSessionConflict(
  userPhone: string,
  currentSessionId: string,
  onConflict: () => void
): () => void {
  const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
  if (!cleanPhone || !isSupabaseConfigured()) return () => {};

  try {
    const channel = supabase
      .channel(`session-${cleanPhone}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `phone_number=eq.${cleanPhone}`,
        },
        (payload: any) => {
          if (
            payload.new?.current_session_id &&
            payload.new.current_session_id !== currentSessionId
          ) {
            onConflict();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Gracefully ignore Realtime connection failure if table not published yet
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
