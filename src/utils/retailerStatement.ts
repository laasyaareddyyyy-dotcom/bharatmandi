import { RetailerSale, RetailerPayment } from '../types';

export interface StatementEntryRow {
  id: string;
  type: 'sale' | 'payment';
  date: string;
  time: string;
  parchiNumber: string;
  itemsSummary: string;
  paymentMode?: string;
  takenAmount: number;
  paidAmount: number;
  runningBalance: number;
  isDaySubtotal?: boolean;
}

export interface RetailerStatementResult {
  openingBalance: number;
  rows: StatementEntryRow[];
  rowsWithSubtotals: StatementEntryRow[];
  totalTaken: number;
  totalPaid: number;
  closingBalance: number;
  isInvalidDateRange: boolean;
}

export function computeRetailerStatement({
  allSales,
  allPayments,
  startDate,
  endDate,
}: {
  allSales: RetailerSale[];
  allPayments: RetailerPayment[];
  startDate?: string;
  endDate?: string;
}): RetailerStatementResult {
  if (startDate && endDate && startDate > endDate) {
    return {
      openingBalance: 0,
      rows: [],
      rowsWithSubtotals: [],
      totalTaken: 0,
      totalPaid: 0,
      closingBalance: 0,
      isInvalidDateRange: true,
    };
  }

  // 1. Calculate Opening Balance: customer due prior to startDate
  let openingBalance = 0;
  if (startDate) {
    const earlierSales = allSales.filter((s) => s.date < startDate);
    const earlierPayments = allPayments.filter((p) => p.date < startDate);

    const earlierTaken = earlierSales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
    const earlierSalesPaid = earlierSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const earlierDirectPaid = earlierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    openingBalance = Math.max(0, earlierTaken - (earlierSalesPaid + earlierDirectPaid));
  }

  // 2. Filter entries inside range [startDate, endDate]
  const rangeSales = allSales.filter((s) => {
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  });

  const rangePayments = allPayments.filter((p) => {
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    return true;
  });

  // 3. Convert sales & payments into rows
  const saleRows = rangeSales.map((s) => ({
    id: s.id,
    type: 'sale' as const,
    date: s.date,
    time: s.time || '10:00 AM',
    parchiNumber: s.parchiNumber,
    itemsSummary:
      s.items && s.items.length > 0
        ? s.items.map((i) => `${i.varietyName} (${i.quantity} ${i.unit})`).join(', ')
        : 'Retail Produce',
    paymentMode: s.paymentMode || 'Cash',
    takenAmount: s.grossTotal || 0,
    paidAmount: s.amountPaid || 0,
  }));

  const paymentRows = rangePayments.map((p) => ({
    id: p.id,
    type: 'payment' as const,
    date: p.date,
    time: p.time || '12:00 PM',
    parchiNumber: p.referenceNumber || 'PAYMENT',
    itemsSummary: `Payment Received (${p.notes || p.paymentMode})`,
    paymentMode: p.paymentMode,
    takenAmount: 0,
    paidAmount: p.amount || 0,
  }));

  // 4. Combine and sort ASCENDING by date, then time
  const allAscending = [...saleRows, ...paymentRows].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.time.localeCompare(b.time);
  });

  // 5. Calculate running balance for each row & group by date for Day Subtotals
  let currentBalance = openingBalance;
  const rowsWithBalance: StatementEntryRow[] = [];
  const rowsWithSubtotals: StatementEntryRow[] = [];

  // Group by date
  const dateGroups = new Map<string, typeof allAscending>();
  allAscending.forEach((row) => {
    if (!dateGroups.has(row.date)) {
      dateGroups.set(row.date, []);
    }
    dateGroups.get(row.date)!.push(row);
  });

  dateGroups.forEach((groupRows, dateStr) => {
    let dayTaken = 0;
    let dayPaid = 0;

    groupRows.forEach((row) => {
      currentBalance = currentBalance + row.takenAmount - row.paidAmount;
      const rowWithBal: StatementEntryRow = {
        ...row,
        runningBalance: Math.max(0, currentBalance),
      };
      rowsWithBalance.push(rowWithBal);
      rowsWithSubtotals.push(rowWithBal);

      dayTaken += row.takenAmount;
      dayPaid += row.paidAmount;
    });

    // If multiple entries on this day, insert Day Subtotal row
    if (groupRows.length > 1) {
      rowsWithSubtotals.push({
        id: `subtotal-${dateStr}`,
        type: 'sale',
        date: dateStr,
        time: '',
        parchiNumber: 'DAY SUBTOTAL',
        itemsSummary: `Day Subtotal for ${dateStr}`,
        takenAmount: dayTaken,
        paidAmount: dayPaid,
        runningBalance: Math.max(0, currentBalance),
        isDaySubtotal: true,
      });
    }
  });

  // 6. Calculate Totals counting ONLY entries inside range
  const totalTaken = rangeSales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
  const totalPaid =
    rangeSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0) +
    rangePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const closingBalance = openingBalance + totalTaken - totalPaid;

  return {
    openingBalance,
    rows: rowsWithBalance,
    rowsWithSubtotals,
    totalTaken,
    totalPaid,
    closingBalance: Math.max(0, closingBalance),
    isInvalidDateRange: false,
  };
}
