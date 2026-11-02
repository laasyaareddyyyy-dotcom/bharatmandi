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
 * Formats currency in Indian locale (e.g. ₹23,891)
 */
export function formatIndianCurrency(amount: number): string {
  const num = Math.abs(Number(amount) || 0);
  const formatted = num.toLocaleString('en-IN');
  return `${amount < 0 ? '-' : ''}₹${formatted}`;
}

export const FormCInvoiceCanvas = forwardRef<HTMLDivElement, FormCInvoiceCanvasProps>(
  ({ data, format = 'a4', merchantOverride }, ref) => {
    const { merchantProfile } = useMandi();

    const isThermal = format === 'thermal-80mm';
    const isRetail = data.mode === 'retailer';

    // Merchant Profile Labels
    const rawShopName = merchantOverride?.shopName || merchantProfile?.shopName || 'Mandi Wholesale Merchant';
    const shopName = rawShopName.replace(/\bAPMC\b/gi, '').trim() || 'Mandi Wholesale Merchant';

    const rawShopNumber = merchantOverride?.shopNumber || merchantProfile?.shopNumber || '1';
    const cleanShopNumber = rawShopNumber
      .replace(/^(shop\s*no\.?|shop\s*#?|stall\s*no\.?|shop)\s*/i, '')
      .replace(/\bAPMC\b/gi, '')
      .trim();

    const rawMarketYard = merchantOverride?.marketYardName || merchantProfile?.marketYardName || 'Wholesale Market Yard';
    const cleanMarketYard = rawMarketYard.replace(/\bAPMC\b/gi, '').trim();

    const shopAddressDisplay = merchantProfile?.address && merchantProfile.address.trim()
      ? merchantProfile.address
      : `Shop No. ${cleanShopNumber || '1'} • ${cleanMarketYard}`;

    const ownerName = (merchantOverride?.ownerName || merchantProfile?.ownerName || 'Mandi Trader').replace(/\bAPMC\b/gi, '').trim();
    const phoneNumber = merchantOverride?.phoneNumber || merchantProfile?.phoneNumber || '+91 9849012345';

    // Clean Farmer / Customer Labels
    const partyName = (data.farmerName || (isRetail ? 'Retail Customer' : 'General Mandi Farmer')).replace(/\bAPMC\b/gi, '').trim();
    const partyVillage = (data.farmerVillage || 'Mandi Yard').replace(/\bAPMC\b/gi, '').trim();
    const farmerInitial = partyName ? partyName.charAt(0).toUpperCase() : 'G';

    // Aggregate Box Counts & Volumes
    const totalBoxes = data.items.reduce((acc, it) => acc + (Number(it.boxesCount) || 0), 0);
    const totalVolumeKgs = data.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

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

    // ON-SCREEN MANDI SALE PARCHI TICKET VIEW (Matching Screenshots 2 & 3)
    return (
      <div
        ref={ref}
        id="form-c-official-invoice-canvas"
        className="bg-white text-slate-800 rounded-2xl p-5 sm:p-7 max-w-md sm:max-w-lg mx-auto shadow-xl border border-slate-200 space-y-4 w-full"
        style={{
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          pageBreakInside: 'avoid',
        }}
      >
        {/* 1. CENTERED SHOP HEADER */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-1">
            <img
              src="/bharat_mandi_logo.png"
              alt="Bharat Mandi"
              referrerPolicy="no-referrer"
              className="w-10 h-10 object-contain"
            />
          </div>
          <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
            WHOLESALE MANDI COMMISSION AGENT
          </span>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight block">
            {shopName}
          </h1>
          <p className="text-xs font-bold text-slate-700 block">
            {shopAddressDisplay}
          </p>
          <p className="text-[11px] text-slate-500 block">
            Adathiya: <span className="font-semibold text-slate-800">{ownerName}</span> | Ph: <span className="font-semibold text-slate-800">{phoneNumber}</span>
          </p>
          <div className="pt-1">
            <span className="inline-block bg-slate-100 text-slate-800 font-extrabold text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full border border-slate-200">
              MANDI SALE PARCHI
            </span>
          </div>
        </div>

        {/* 2. PARCHI META HEADER CARD */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                PARCHI NO.
              </span>
              <span className="font-mono font-black text-slate-900 text-xs sm:text-sm block">
                {data.parchiNumber || 'SHP-20261027-001'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                DATE &amp; TIME
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs text-right block">
                {data.date} • {data.time || '12:12 PM'}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
              {farmerInitial}
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                FARMER / CONSIGNOR
              </span>
              <span className="font-black text-slate-900 text-xs sm:text-sm block">
                {partyName} <span className="font-medium text-slate-500">({partyVillage})</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3. VARIETY & PARTICULARS SECTION */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            <span>VARIETY &amp; PARTICULARS</span>
            <span>RATE &amp; GROSS</span>
          </div>

          <div className="divide-y divide-slate-100">
            {data.items.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                    {item.flowerVariety}
                  </h3>
                  <span className="font-mono font-black text-slate-900 text-sm sm:text-base shrink-0">
                    {formatIndianCurrency(item.grossTotal)}
                  </span>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {item.boxesCount ? (
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                      {item.boxesCount} Boxes
                    </span>
                  ) : null}
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                    {item.quantity} {item.unit || 'Kgs'}
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                    @ {formatIndianCurrency(item.rate)}/{item.unit || 'Kgs'}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-extrabold uppercase">
                    {item.flowerQuality || 'GOOD'}
                  </span>
                </div>

                {/* Sub-box for Lot Info */}
                <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg grid grid-cols-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Lot Type
                    </span>
                    <span className="font-bold text-slate-800 text-xs block">
                      Single Variety Lot
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Total Volume
                    </span>
                    <span className="font-bold text-slate-800 text-xs font-mono block">
                      {item.quantity} {item.unit || 'Kgs'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. MANDI RECORDED CHARGES */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
            MANDI RECORDED CHARGES
          </span>
          <div className="flex justify-between items-center text-xs text-slate-700 font-semibold py-0.5">
            <span>Vehicle / Freight Charges</span>
            <span className="font-mono text-slate-900 font-bold">{formatIndianCurrency(data.transportCharges)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-700 font-semibold py-0.5">
            <span>Hamali / Loading Charges</span>
            <span className="font-mono text-slate-900 font-bold">{formatIndianCurrency(data.ammaliCharges)}</span>
          </div>
        </div>

        {/* 5. TOTAL SALES AMOUNT BANNER (SOLID DARK NAVY BOX) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#1e293b] text-white flex justify-between items-center shadow-md">
          <div>
            <span className="block text-xs font-black uppercase tracking-wider text-white">
              TOTAL SALES AMOUNT
            </span>
            <span className="text-[10px] text-slate-300 font-medium block mt-0.5">
              Gross sales amount (before deductions)
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-white">
            {formatIndianCurrency(data.grossTotal)}
          </span>
        </div>

        {/* 6. DOCUMENT TYPE & VERIFICATION */}
        <div className="grid grid-cols-2 text-[10px] text-slate-500 pt-2 border-t border-slate-100">
          <div>
            <span className="text-slate-400 block">Document Type</span>
            <span className="font-bold text-slate-700 block">Mandi Verification</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">Daily Auction Weighing Slip</span>
            <span className="font-bold text-slate-700 block">Official Mandi Entry Recorded</span>
          </div>
        </div>

        {/* 7. SIGNATURES */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 text-xs">
          <div className="text-center pt-2">
            <span className="text-[10px] font-bold text-slate-400 block border-t border-slate-300 pt-1">
              Farmer Signature / Thumb
            </span>
          </div>
          <div className="text-center pt-2">
            <span className="font-bold text-slate-900 text-[11px] block border-t border-slate-300 pt-1 truncate">
              For {shopName}
            </span>
            <span className="text-[9px] text-slate-500 block truncate">
              (Authorized Signatory)
            </span>
          </div>
        </div>

        {/* 8. FOOTER */}
        <div className="text-center pt-2 border-t border-slate-100 space-y-0.5">
          <p className="font-mono text-[10px] text-slate-400 tracking-widest uppercase">
            *** Wholesale Market Yard ***
          </p>
          <p className="text-[9px] text-slate-400">
            Printed via भारत MANDI
          </p>
        </div>
      </div>
    );
  }
);

FormCInvoiceCanvas.displayName = 'FormCInvoiceCanvas';
