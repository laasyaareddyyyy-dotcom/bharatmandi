import React, { useRef, useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { Retailer } from '../../types';
import { X, Download, Store } from 'lucide-react';
import { FormCInvoiceCanvas, FormCInvoiceData } from '../common/FormCInvoiceCanvas';
import { exportElementToPdf } from '../../utils/pdfExport';
import { computeRetailerStatement } from '../../utils/retailerStatement';

interface RetailerPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailer: Retailer | null;
  dateRangeLabel?: string;
  startDate?: string;
  endDate?: string;
}

export const RetailerPdfModal: React.FC<RetailerPdfModalProps> = ({
  isOpen,
  onClose,
  retailer,
  dateRangeLabel = 'All Time Statement',
  startDate,
  endDate,
}) => {
  const { retailerSales, retailerPayments, activeSessionDate } = useMandi();
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (!isOpen || !retailer) return null;

  // Filter sales and payments for this retailer
  const sales = retailerSales.filter((s) => s.retailerId === retailer.id);
  const payments = retailerPayments.filter((p) => p.retailerId === retailer.id);

  const statement = computeRetailerStatement({
    allSales: sales,
    allPayments: payments,
    startDate,
    endDate,
  });

  const canvasData: FormCInvoiceData = {
    mode: 'retailer',
    isRetailStatement: true,
    parchiNumber: `STMT-${retailer.id.slice(-4)}`,
    date: activeSessionDate || new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    farmerName: retailer.name,
    farmerVillage: retailer.shopOrMarket || 'Local Shop',
    farmerPhone: retailer.phone,
    dateRangeLabel,
    openingBalance: statement.openingBalance,
    totalTaken: statement.totalTaken,
    totalPaid: statement.totalPaid,
    closingBalance: statement.closingBalance,
    statementRows: statement.rowsWithSubtotals,
    items: [],
    grossTotal: statement.totalTaken,
    transportCharges: 0,
    ammaliCharges: 0,
    commissionPercent: 0,
    commissionAmount: 0,
    farmerNetPayable: statement.closingBalance,
    amountPaid: statement.totalPaid,
    balanceDue: statement.closingBalance,
    paymentStatus: statement.closingBalance === 0 ? 'Paid' : 'Due',
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    setPdfError(null);
    try {
      const cleanCustomer = retailer.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `BharatMandi-Retail-Statement-${cleanCustomer}.pdf`;
      const res = await exportElementToPdf(printRef.current, {
        filename,
        format: 'a4',
        orientation: 'portrait',
        scale: 2,
        autoDownload: true,
      });
      if (!res.success) {
        setPdfError(`PDF could not be created: ${res.error || 'Export failed'}`);
      }
    } catch (err: any) {
      console.error('Retailer PDF download exception:', err);
      setPdfError(`PDF could not be created: ${err?.message || 'Download error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto no-print-bg">
      <div className="bg-slate-900 text-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-black tracking-tight">Retail Customer Statement</h2>
              <p className="text-[11px] text-slate-400">{retailer.name} • Official Statement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-3.5 py-1.5 rounded-lg bg-[#1a3a52] hover:bg-[#24485e] text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-blue-400/30 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-blue-300" />
              <span>{isDownloading ? 'Preparing PDF…' : 'Download Statement PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {pdfError && (
          <div className="p-3 bg-rose-600 text-white text-xs font-bold flex items-center justify-between gap-2">
            <span>{pdfError}</span>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1 bg-white text-rose-700 hover:bg-slate-100 rounded-lg text-xs font-black cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Printable PDF Sheet Area */}
        <div className="p-4 sm:p-6 bg-slate-800 max-h-[75vh] overflow-y-auto flex justify-center">
          <FormCInvoiceCanvas
            ref={printRef}
            data={canvasData}
          />
        </div>
      </div>
    </div>
  );
};

