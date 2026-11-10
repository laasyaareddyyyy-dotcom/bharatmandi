import React, { forwardRef } from 'react';
import { useMandi } from '../../context/MandiContext';

export interface FormCItem {
  id?: string;
  parchiNumber?: string;
  date?: string;
  commodity?: string;
  flowerVariety: string;
  flowerQuality?: string;
  quantity: number;
  unit: string;
  boxesCount?: number;
  packagingType?: string;
  rate: number;
  grossTotal: number;
  hamali?: number;
  transport?: number;
  commission?: number;
  misc?: number;
  farmerNetPayable?: number;
  workerName?: string;
}

export interface StatementRowForCanvas {
  id: string;
  type: 'sale' | 'payment';
  date: string;
  time: string;
  parchiNumber: string;
  itemsSummary: string;
  takenAmount: number;
  paidAmount: number;
  runningBalance: number;
  isDaySubtotal?: boolean;
}

export interface FormCInvoiceData {
  mode?: 'wholesaler' | 'retailer';
  isRetailStatement?: boolean;
  statementRows?: StatementRowForCanvas[];
  totalTaken?: number;
  totalPaid?: number;
  closingBalance?: number;
  parchiNumber: string;
  formCNumber?: string;
  date: string;
  time: string;
  farmerName: string;
  farmerVillage?: string;
  farmerPhone?: string;
  farmerPhotoUrl?: string;
  isCombinedStatement?: boolean;
  dateRangeLabel?: string;
  items: FormCItem[];
  grossTotal: number;
  transportCharges: number;
  ammaliCharges: number;
  commissionPercent: number;
  commissionAmount: number;
  miscCommissionMode?: 'percent' | 'fixed';
  miscCommissionPercent?: number;
  miscCommissionAmount?: number;
  otherDeductions?: Array<{ name: string; amount: number }>;
  totalDeductions?: number;
  farmerNetPayable: number;
  amountPaid: number;
  balanceDue?: number;
  previousDue?: number;
  openingBalance?: number;
  paymentMode?: string;
  paymentStatus: string;
  notes?: string;
  workerName?: string;
}

interface FormCInvoiceCanvasProps {
  data: FormCInvoiceData;
  format?: 'a4' | 'thermal-80mm';
  merchantOverride?: {
    shopName?: string;
    shopNumber?: string;
    marketYardName?: string;
    ownerName?: string;
    phoneNumber?: string;
  };
}

/**
 * Formats currency in Indian locale to 2 decimal places (e.g. ₹18,440.00)
 */
export function formatIndianCurrency(amount: number): string {
  const num = Math.abs(Number(amount) || 0);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}₹${formatted}`;
}

export const FormCInvoiceCanvas = forwardRef<HTMLDivElement, FormCInvoiceCanvasProps>(
  ({ data, format = 'a4', merchantOverride }, ref) => {
    const { merchantProfile } = useMandi();

    const isThermal = format === 'thermal-80mm';
    const isRetail = data.mode === 'retailer';

    // Merchant Profile Labels
    const rawShopName = (merchantOverride?.shopName || merchantProfile?.shopName || '')
      .replace(/\bAPMC\b/gi, '')
      .replace(/\bMandi Wholesale Merchant\b/gi, '')
      .replace(/\bWholesale Market Yard\b/gi, '')
      .trim();
    const shopName = rawShopName && rawShopName !== 'Mandi Wholesale Merchant' ? rawShopName : 'BHARAT MANDI';

    const rawShopNumber = merchantOverride?.shopNumber || merchantProfile?.shopNumber || '';
    const cleanShopNumber = rawShopNumber
      .replace(/^(shop\s*no\.?|shop\s*#?|stall\s*no\.?|shop)\s*/i, '')
      .replace(/\bAPMC\b/gi, '')
      .trim();

    const rawMarketYard = (merchantOverride?.marketYardName || merchantProfile?.marketYardName || '')
      .replace(/\bAPMC\b/gi, '')
      .replace(/\bWholesale Market Yard\b/gi, '')
      .trim();

    const rawAddress = (merchantProfile?.address || '')
      .replace(/\bWholesale Market Yard\b/gi, '')
      .replace(/\bMandi Wholesale Merchant\b/gi, '')
      .trim();

    const shopAddressDisplay = rawAddress
      ? rawAddress
      : rawMarketYard
      ? `Shop No. ${cleanShopNumber || '1'} • ${rawMarketYard}`
      : cleanShopNumber
      ? `Shop No. ${cleanShopNumber}`
      : '';

    const rawOwner = (merchantOverride?.ownerName || merchantProfile?.ownerName || '')
      .replace(/\bAPMC\b/gi, '')
      .replace(/\bMandi Trader\b/gi, '')
      .trim();

    const ownerName = rawOwner && rawOwner !== 'Mandi Trader' ? rawOwner : '';
    const phoneNumber = merchantOverride?.phoneNumber || merchantProfile?.phoneNumber || '+91 9849012345';

    // Clean Farmer / Customer Labels
    const partyName = (data.farmerName || (isRetail ? 'Retail Customer' : 'General Mandi Farmer')).replace(/\bAPMC\b/gi, '').trim();
    const partyVillage = (data.farmerVillage || 'Mandi Yard').replace(/\bAPMC\b/gi, '').trim();
    const farmerInitial = partyName ? partyName.charAt(0).toUpperCase() : 'G';

    // Aggregate Box Counts & Volumes & Deductions
    const totalBoxes = data.items.reduce((acc, it) => acc + (Number(it.boxesCount) || 0), 0);
    const totalVolumeKgs = data.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const calculatedTotalDeductions =
      data.totalDeductions !== undefined
        ? data.totalDeductions
        : Number(
            (
              Number(data.transportCharges || 0) +
              Number(data.ammaliCharges || 0) +
              Number(data.commissionAmount || 0) +
              Number(data.miscCommissionAmount || 0) +
              (data.otherDeductions || []).reduce((acc, d) => acc + (Number(d.amount) || 0), 0)
            ).toFixed(2)
          );

    // If rendering Retail Statement
    if (data.isRetailStatement) {
      const statementRows = data.statementRows || [];
      const openingBalance = data.openingBalance || 0;
      const totalTaken = data.totalTaken || 0;
      const totalPaid = data.totalPaid || 0;
      const closingBalance = data.closingBalance || 0;

      return (
        <div
          ref={ref}
          id="form-c-official-invoice-canvas"
          className="bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-sm mx-auto p-5 sm:p-6 max-w-3xl space-y-3.5 w-full"
          style={{
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* 1. TOP HEADER */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-start gap-3 min-w-0">
              <div className="text-left space-y-1 min-w-0">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-[9px] font-extrabold tracking-widest text-slate-700 uppercase border border-slate-200">
                  RETAIL STATEMENT
                </div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-tight break-words my-0.5">
                  {shopName}
                </h1>
                <p className="text-xs font-bold text-slate-800 leading-snug truncate">
                  {shopAddressDisplay}
                </p>
                <p className="text-[10px] text-slate-600 leading-snug">
                  Proprietor: <span className="font-bold text-slate-900">{ownerName}</span> | Contact: <span className="font-bold text-slate-900">{phoneNumber}</span>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 pt-1">
              <span className="text-[9px] font-mono uppercase px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold inline-block shadow-2xs whitespace-nowrap">
                OFFICIAL KHATA STATEMENT
              </span>
            </div>
          </div>

          {/* 2. CUSTOMER & STATEMENT PERIOD INFO CARD */}
          <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-200 grid grid-cols-12 gap-2 text-xs">
            <div className="col-span-4">
              <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider block mb-0.5">
                CUSTOMER
              </span>
              <span className="font-black text-slate-900 text-sm block break-words leading-tight">
                {partyName}
              </span>
            </div>

            <div className="col-span-4">
              <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider block mb-0.5">
                SHOP / MARKET &amp; CONTACT
              </span>
              <span className="font-bold text-slate-800 text-xs block break-words leading-tight">
                {partyVillage}
              </span>
            </div>

            <div className="col-span-4">
              <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider block mb-0.5">
                STATEMENT PERIOD
              </span>
              <span className="font-bold text-slate-900 text-xs block break-words leading-tight font-mono">
                {data.dateRangeLabel || 'All Time'}
              </span>
            </div>
          </div>

          {/* 3. STATEMENT TRANSACTIONS TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1a3a52] text-white font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-2.5">Date &amp; Time</th>
                  <th className="p-2.5">Type / Ref #</th>
                  <th className="p-2.5">Items / Details</th>
                  <th className="p-2.5 text-right">Taken (₹)</th>
                  <th className="p-2.5 text-right">Paid (₹)</th>
                  <th className="p-2.5 text-right">Balance After (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {statementRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 font-medium">
                    <td className="p-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {row.date} {row.time ? `• ${row.time}` : ''}
                    </td>
                    <td className="p-2.5 font-mono text-xs font-bold text-[#1a3a52]">
                      {row.parchiNumber}
                    </td>
                    <td className="p-2.5 text-slate-800 font-semibold max-w-xs break-words">
                      {row.itemsSummary}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {row.takenAmount > 0 ? formatIndianCurrency(row.takenAmount) : '-'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {row.paidAmount > 0 ? formatIndianCurrency(row.paidAmount) : '-'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-[#1a3a52]">
                      {formatIndianCurrency(row.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. CLOSING BALANCE BAR */}
          <div className="p-3.5 rounded-2xl bg-[#047857] text-white flex items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="block text-xs font-black uppercase tracking-wider text-white">
                CLOSING BALANCE:
              </span>
            </div>
            <span className="text-xl font-black font-mono text-white">
              {formatIndianCurrency(closingBalance)}
            </span>
          </div>
        </div>
      );
    }

    // OFFICIAL WHOLESALE MANDI SALE PARCHI • FORM C (Matching FormC-GRS-2026-10-31-1.pdf)
    return (
      <div
        ref={ref}
        id="form-c-official-invoice-canvas"
        className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 max-w-4xl w-full mx-auto shadow-sm border border-slate-200 space-y-4 font-sans text-xs leading-relaxed"
        style={{
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          pageBreakInside: 'avoid',
        }}
      >
        {/* 1. TOP HEADER */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <img
                src="/bharat_mandi_logo.png"
                alt="Bharat Mandi"
                className="w-8 h-8 object-contain shrink-0"
              />
              <span className="inline-block bg-slate-100 text-slate-600 font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-slate-200">
                MANDI SALE PARCHI • FORM C
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight my-0.5">
              {shopName}
            </h1>
            <p className="text-xs font-bold text-slate-800 leading-snug">
              {shopAddressDisplay}
            </p>
            <p className="text-xs text-slate-600">
              {ownerName ? (
                <>Proprietor: <span className="font-bold text-slate-800">{ownerName}</span> &nbsp;•&nbsp; </>
              ) : null}
              Contact: <span className="font-bold text-slate-800">{phoneNumber}</span>
            </p>
          </div>

          <div className="shrink-0 text-right">
            <span className="inline-block bg-[#e6f4ea] text-[#15803d] font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
              OFFICIAL MANDI RECEIPT
            </span>
          </div>
        </div>

        {/* 2. 4-COLUMN INFO CARD */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 grid grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
              PARCHI / INV NO.
            </span>
            <span className="font-mono font-black text-slate-900 text-sm block">
              {data.parchiNumber || data.formCNumber || 'FC-2026-GRS-3110'}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
              DATE &amp; TIME
            </span>
            <span className="font-mono font-bold text-slate-900 text-xs block">
              {data.date} • {data.time || 'Morning Auction'}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
              FARMER
            </span>
            <span className="font-black text-slate-900 text-sm block">
              {partyName}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
              VILLAGE &amp; CONTACT
            </span>
            <span className="font-bold text-slate-900 text-xs block">
              {partyVillage}
            </span>
            {data.farmerPhone && (
              <span className="font-mono text-slate-600 text-[11px] block mt-0.5">
                +91 {data.farmerPhone.replace(/\D/g, '').slice(-10)}
              </span>
            )}
          </div>
        </div>

        {/* 3. 10-COLUMN ITEMS TABLE */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-700 font-bold uppercase text-[9.5px] tracking-wider border-b border-slate-200">
                <th className="p-2.5">PARCHI &amp; DATE</th>
                <th className="p-2.5">ITEM / CROP</th>
                <th className="p-2.5 text-center">QTY</th>
                <th className="p-2.5 text-right">RATE</th>
                <th className="p-2.5 text-right">GROSS</th>
                <th className="p-2.5 text-right">HAMALI</th>
                <th className="p-2.5 text-right">TRANS</th>
                <th className="p-2.5 text-right">COMM</th>
                <th className="p-2.5 text-right">MISC</th>
                <th className="p-2.5 text-right">NET</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium">
              {data.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="p-2.5 font-mono">
                    <span className="font-extrabold text-slate-900 text-[11px] block">
                      {item.parchiNumber || data.parchiNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {item.date || data.date}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-black text-slate-900 text-xs block uppercase">
                      {item.flowerVariety}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {item.boxesCount ? `${item.boxesCount} Boxes` : item.packagingType || '1 Bag'}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                    {item.quantity} {item.unit || 'Kgs'}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                    {formatIndianCurrency(item.rate)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-black text-slate-900">
                    {formatIndianCurrency(item.grossTotal)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                    {formatIndianCurrency(item.hamali || 0)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                    {formatIndianCurrency(item.transport || 0)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                    {formatIndianCurrency(item.commission || 0)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                    {formatIndianCurrency(item.misc || 0)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-black text-emerald-700">
                    {formatIndianCurrency(item.farmerNetPayable || item.grossTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. TOTAL SALES AMOUNT (GROSS) CARD */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 flex justify-between items-center">
          <div>
            <span className="text-xs font-black uppercase text-slate-900 tracking-tight block">
              TOTAL SALES AMOUNT (GROSS)
            </span>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              Gross sales turnover before APMC mandi charges and commission
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {formatIndianCurrency(data.grossTotal)}
          </span>
        </div>

        {/* 5. MANDI CHARGES & COMMISSION DEDUCTIONS CARD */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
              MANDI CHARGES &amp; COMMISSION DEDUCTIONS
            </span>
            <span className="bg-white border border-slate-200 text-slate-600 font-bold text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-md">
              FORM C SUMMARY
            </span>
          </div>

          {/* 4 Summary Boxes Grid (2x2) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Box 1: Freight */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 text-xs block">Vehicle / Freight</span>
                <span className="text-[10px] text-slate-500 block">Transport</span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {formatIndianCurrency(data.transportCharges)}
              </span>
            </div>

            {/* Box 2: Hamali */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 text-xs block">Hamali / Labor</span>
                <span className="text-[10px] text-slate-500 block">Loading &amp; Unloading</span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {formatIndianCurrency(data.ammaliCharges)}
              </span>
            </div>

            {/* Box 3: Commission */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 text-xs block">Mandi Commission</span>
                <span className="text-[10px] text-slate-500 block">{data.commissionPercent}% Gross</span>
              </div>
              <span className="font-mono font-bold text-rose-600 text-xs">
                -{formatIndianCurrency(data.commissionAmount)}
              </span>
            </div>

            {/* Box 4: Misc Charges */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 text-xs block">Misc Charges</span>
                <span className="text-[10px] text-slate-500 block">{data.miscCommissionPercent || 0}%</span>
              </div>
              <span className="font-mono font-bold text-rose-600 text-xs">
                -{formatIndianCurrency(data.miscCommissionAmount)}
              </span>
            </div>
          </div>

          {/* Bottom Pink/Red Deductions Strip */}
          <div className="bg-[#fef2f2] border border-[#fecdd3] rounded-lg p-2.5 flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-900">
              TOTAL DEDUCTIONS (Freight + Hamali + Comm + Misc):
            </span>
            <span className="font-mono font-black text-rose-600">
              -{formatIndianCurrency(calculatedTotalDeductions)}
            </span>
          </div>
        </div>

        {/* 6. NET PAYABLE TO FARMER BANNER */}
        <div className="bg-[#047857] text-white rounded-xl p-4 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white block">
              NET PAYABLE TO FARMER:
            </span>
            <span className="text-[10.5px] text-emerald-100 font-medium block mt-0.5">
              Gross Total ({formatIndianCurrency(data.grossTotal)}) – Total Deductions ({formatIndianCurrency(calculatedTotalDeductions)})
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
            {formatIndianCurrency(data.farmerNetPayable)}
          </span>
        </div>

        {/* 7. SETTLEMENT STATUS & AUTHORIZATION CARDS */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Settlement Status Card */}
          <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                SETTLEMENT STATUS
              </span>
              <span
                className={`font-extrabold text-[9px] px-2.5 py-0.5 rounded-md uppercase border ${
                  data.paymentStatus?.toLowerCase() === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : data.paymentStatus?.toLowerCase() === 'partial'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                {data.paymentStatus || 'PENDING'}
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-slate-600">
                <span>Payments / Advances:</span>
                <span className="font-mono font-bold text-slate-900">{formatIndianCurrency(data.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800">{data.paymentMode || '—'}</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center">
                <span className="font-bold text-slate-900">Final Balance Due:</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {formatIndianCurrency(data.balanceDue !== undefined ? data.balanceDue : data.farmerNetPayable)}
                </span>
              </div>
            </div>
          </div>

          {/* Authorization Card */}
          <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between text-right">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
              AUTHORIZATION &amp; SEAL
            </span>
            <div className="pt-6">
              <span className="font-bold text-slate-900 text-xs block">
                For {shopName}
              </span>
              <span className="text-[9.5px] text-slate-500 block">
                (Authorized Signatory / Mandi Licensee)
              </span>
            </div>
          </div>
        </div>

        {/* 8. FOOTER */}
        <div className="pt-3 border-t border-slate-200/80 text-center space-y-0.5">
          <p className="font-extrabold text-[9.5px] uppercase tracking-widest text-slate-600">
            OFFICIAL APMC MANDI SALE PARCHI • FORM C • GOVT REGULATED
          </p>
          <p className="text-[9px] font-medium text-slate-400">
            Generated via Bharat MANDI Software • Valid Settlement Bill
          </p>
        </div>
      </div>
    );
  }
);

FormCInvoiceCanvas.displayName = 'FormCInvoiceCanvas';
