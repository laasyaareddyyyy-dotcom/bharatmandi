import React, { useRef, useState } from 'react';
import {
  Printer,
  Share2,
  X,
  ArrowLeft,
  CheckCircle,
  Copy,
  Receipt,
  Phone,
  Store,
  Trash2,
  History,
  Download,
  Loader2,
  Edit3,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { sounds } from '../../utils/audio';
import {
  exportElementToPdf,
  printHtmlViaIframe,
  sharePdfFile,
  createPdfFile,
  canSharePdfFile,
  acquireGlobalShareLock,
  releaseGlobalShareLock,
} from '../../utils/pdfExport';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const ParchiModal: React.FC = () => {
  const {
    selectedParchiLot,
    setSelectedParchiLot,
    openEditParchiModal,
    merchantProfile,
    farmers,
    setActiveFarmerId,
    language,
    autoRemoveParchiAfterPrint,
    setAutoRemoveParchiAfterPrint,
    removeParchiWithAudit,
    setIsAuditTrailOpen,
    parchiAuditLogs,
    shipments,
    t,
  } = useMandi();

  const printAreaRef = useRef<HTMLDivElement>(null);
  const [showRemovePrompt, setShowRemovePrompt] = useState<boolean>(false);
  const [printCompletedTime, setPrintCompletedTime] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [isSharingPdf, setIsSharingPdf] = useState<boolean>(false);

  React.useEffect(() => {
    if (!selectedParchiLot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedParchiLot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedParchiLot, setSelectedParchiLot]);

  if (!selectedParchiLot) return null;

  const lot = selectedParchiLot;
  const matchedFarmer = farmers.find((f) => f.id === lot.farmerId);
  const farmerPhoto = matchedFarmer?.photoUrl;
  const linkedShipment = lot.shipmentId ? shipments.find((s) => s.id === lot.shipmentId) : null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  const ammaliVal = lot.ammaliCharges ?? lot.otherExpenditures?.hamali ?? 0;
  const transportVal = lot.transportCharges ?? lot.otherExpenditures?.transport ?? 0;
  const miscVal = lot.otherExpenditures?.misc ?? 0;
  const nonCommissionDeductions = ammaliVal + transportVal + miscVal;

  const handleDownloadPdf = async (format: 'a4' | 'thermal-80mm' = 'a4') => {
    if (!printAreaRef.current || !lot) return;
    setIsGeneratingPdf(true);
    showToast('Generating Full Parchi PDF...');
    try {
      const cleanFarmer = lot.farmerName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `BharatMandi-Parchi-${lot.parchiNumber}-${cleanFarmer}.pdf`;
      const res = await exportElementToPdf(printAreaRef.current, {
        filename,
        format,
        orientation: 'portrait',
        marginMm: format === 'thermal-80mm' ? 4 : 6,
        scale: 2,
        fitToPage: true,
        autoDownload: true,
      });

      if (res.success) {
        showToast('✓ Full Parchi PDF Downloaded!');
      } else {
        showToast(`Failed: ${res.error || 'PDF Generation Error'}`);
      }
    } catch (e: any) {
      console.error('[Parchi PDF Error]', e);
      showToast('Error downloading Parchi PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const timestampStr = `${dateFormatted} • ${timeFormatted}`;
    setPrintCompletedTime(timestampStr);

    // If auto-remove is turned on, set up listener for print completion
    if (autoRemoveParchiAfterPrint) {
      let triggered = false;
      const onPrintDone = () => {
        if (!triggered) {
          triggered = true;
          window.removeEventListener('afterprint', onPrintDone);
          setShowRemovePrompt(true);
        }
      };

      window.addEventListener('afterprint', onPrintDone);
      // Fallback in case window.onafterprint is bypassed by certain preview iframes/browsers
      setTimeout(onPrintDone, 1200);
    }

    if (printAreaRef.current) {
      printHtmlViaIframe(printAreaRef.current, `Mandi Parchi - ${lot.parchiNumber}`);
    } else {
      window.print();
    }
  };

  const handleConfirmRemove = () => {
    if (!lot) return;
    sounds.playCashChime();
    removeParchiWithAudit(lot.id, {
      printedAt: printCompletedTime || '',
      reason: 'Printed and removed by merchant',
    });
    setShowRemovePrompt(false);
  };

  const handleKeepParchi = () => {
    setShowRemovePrompt(false);
  };

  const lotPackaging = lot.packagingType || (linkedShipment?.items[0]?.packagingType) || 'Boxes';

  const getWhatsAppMessage = () => {
    const text = `*FLOWER MANDI PARCHI* 🌸
*${merchantProfile.shopName}*
Shop: ${merchantProfile.shopNumber}, ${merchantProfile.marketYardName}
Phone: ${merchantProfile.phoneNumber}
--------------------------------
*Parchi No:* ${lot.parchiNumber}
*Date:* ${lot.date} | *Time:* ${lot.time}
*Farmer:* ${lot.farmerName} (${lot.farmerVillage})
*Flower:* ${lot.flowerVariety}
*No. of ${lotPackaging}:* ${lot.boxesCount ? `${lot.boxesCount} ${lotPackaging}` : 'N/A'}
*Quality of Flower:* ${lot.flowerQuality || 'Good'}
*Quantity:* ${lot.quantity} ${lot.unit}
*Rate:* ₹${lot.rate} per ${lot.unit}
*Total Sales Amount:* ₹${lot.grossTotal.toLocaleString('en-IN')}
--------------------------------
*Recorded Mandi Charges:*
- Vehicle / Freight: ₹${transportVal.toLocaleString('en-IN')}
- Hamali / Loading: ₹${ammaliVal.toLocaleString('en-IN')}
--------------------------------
_Generated via भारत MANDI Ledger_`;

    return encodeURIComponent(text);
  };

  const shareWhatsApp = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSharingPdf || !printAreaRef.current) return;

    // Acquire global share lock synchronously BEFORE PDF rendering starts
    if (!acquireGlobalShareLock()) {
      return;
    }

    setIsSharingPdf(true);
    setToastMessage('Preparing PDF file for sharing...');

    try {
      // 1. Generate the PDF from the thermal parchi element
      const filename = `MandiParchi-${lot.parchiNumber}.pdf`;
      const result = await exportElementToPdf(printAreaRef.current, {
        filename,
        format: 'thermal-80mm',
        autoDownload: false,
      });

      if (!result.success || !result.blob) {
        throw new Error(result.error || 'Failed to render PDF');
      }

      // 2. Share PDF file via centralized helper
      const shareRes = await sharePdfFile({
        blob: result.blob,
        filename,
        title: `Mandi Parchi #${lot.parchiNumber}`,
        fallbackToDownload: true,
      });

      if (shareRes.shared) {
        setToastMessage('Parchi PDF shared successfully!');
      } else if (shareRes.downloaded) {
        setToastMessage(
          "Your browser doesn't support direct file sharing — PDF downloaded so you can attach it in WhatsApp."
        );
      }
    } catch (err: any) {
      console.error('[Parchi Share Fatal Error]', err);
      setToastMessage('Could not share PDF. Please use the Download PDF button.');
    } finally {
      setIsSharingPdf(false);
      releaseGlobalShareLock(2500);
      setTimeout(() => setToastMessage(''), 6000);
    }
  };

  const copyToClipboard = () => {
    const text = decodeURIComponent(getWhatsAppMessage());
    navigator.clipboard.writeText(text);
    alert('Parchi receipt details copied to clipboard!');
  };

  return (
    <div
      id="parchi-modal-overlay"
      onClick={() => setSelectedParchiLot(null)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div
        id="parchi-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg md:max-w-xl max-h-[92vh] sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* FIXED HEADER */}
        <div className="no-print flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              id="back-parchi-modal-btn"
              onClick={() => setSelectedParchiLot(null)}
              aria-label="Go Back"
              className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-blue-300 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white leading-tight">
                {t('mandiParchiTitle')} - {lot.parchiNumber}
              </h2>
              <p className="text-[11px] text-slate-200/80 leading-none mt-0.5">{t('parchiSubtitle')}</p>
            </div>
          </div>

          <button
            type="button"
            id="close-parchi-modal-btn"
            onClick={() => setSelectedParchiLot(null)}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="no-print flex-shrink-0 bg-[#f8fafc] border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="whatsapp-share-parchi-btn"
              onClick={shareWhatsApp}
              disabled={isSharingPdf}
              className="px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#20b858] transition shadow-xs cursor-pointer disabled:opacity-60"
              title="Share PDF via WhatsApp / Native Share Sheet"
            >
              {isSharingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{isSharingPdf ? 'Sharing...' : 'WhatsApp'}</span>
            </button>
            <button
              id="copy-parchi-btn"
              onClick={copyToClipboard}
              className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#e2e8f0] text-[#1e293b] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#f1f5f9] transition shadow-xs"
            >
              <Copy className="w-3.5 h-3.5 text-[#64748b]" />
              <span className="hidden sm:inline">Copy</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="download-parchi-pdf-btn"
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => handleDownloadPdf('a4')}
              className="px-3 py-1.5 rounded-lg bg-[#f8fafc] border border-[#1a3a52] text-[#1a3a52] text-xs font-bold flex items-center gap-1.5 hover:bg-[#eef3f7] transition shadow-2xs cursor-pointer disabled:opacity-50"
              title="Download full Parchi as PDF file"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 text-[#1a3a52] animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#1a3a52]" />
              )}
              <span>{isGeneratingPdf ? 'Saving...' : 'Download PDF'}</span>
            </button>

            <button
              id="print-thermal-parchi-btn"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-[#1a3a52] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#122839] transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('printReceiptBtn')}</span>
            </button>

            <button
              type="button"
              id="edit-parchi-btn"
              onClick={() => openEditParchiModal(lot)}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Edit rates, quantity, farmer or deductions for this parchi"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-800" />
              <span>Edit Parchi</span>
            </button>
          </div>
        </div>

        {/* Toast Notification for Real-Time Updates */}
        {toastMessage && (
          <div className="no-print bg-[#1a3a52] text-white text-xs px-4 py-2 font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage('')} className="text-white/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* User-Controlled Auto-Remove Setting Strip */}
        <div className="no-print bg-[#F9F7F4] border-b border-[#e2e8f0] px-4 py-2 flex items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="parchi-modal-auto-remove-checkbox"
              type="checkbox"
              checked={autoRemoveParchiAfterPrint}
              onChange={(e) => setAutoRemoveParchiAfterPrint(e.target.checked)}
              className="w-4 h-4 text-[#1a3a52] rounded border-[#e2e8f0] focus:ring-[#1a3a52] cursor-pointer"
            />
            <span className="font-semibold text-[#1e293b] text-xs">
              {t('removeParchiAfterPrint')}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                autoRemoveParchiAfterPrint
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {autoRemoveParchiAfterPrint ? 'ON' : 'OFF'}
            </span>
          </label>

          {parchiAuditLogs.length > 0 && (
            <button
              type="button"
              id="parchi-modal-audit-trail-link"
              onClick={() => {
                setSelectedParchiLot(null);
                setIsAuditTrailOpen(true);
              }}
              className="text-[11px] font-bold text-[#1a3a52] hover:underline flex items-center gap-1 shrink-0"
            >
              <History className="w-3.5 h-3.5" />
              <span>{t('viewAuditTrail')} ({parchiAuditLogs.length})</span>
            </button>
          )}
        </div>

        {/* Post-Print Confirmation Prompt (Only displayed after print confirmation or manual remove click) */}
        {showRemovePrompt && (
          <div
            id="post-print-confirmation-banner"
            className="no-print bg-amber-50 border-b border-amber-200 p-3.5 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
                <Printer className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-bold text-xs sm:text-sm text-[#1e293b]">
                  {t('removeParchiPromptTitle')}
                </h4>
                <p className="text-[11px] text-[#64748b] leading-relaxed">
                  {t('removeParchiPromptDesc')}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    id="confirm-remove-parchi-btn"
                    onClick={handleConfirmRemove}
                    className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('confirmAndRemoveBtn')}</span>
                  </button>
                  <button
                    type="button"
                    id="keep-parchi-btn"
                    onClick={handleKeepParchi}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[#1e293b] font-semibold text-xs hover:bg-[#f8fafc] transition cursor-pointer"
                  >
                    {t('keepParchiBtn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Receipt Body (Targeted by Thermal Print CSS) */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-[#f8fafc]">
          <div
            ref={printAreaRef}
            className="thermal-receipt-print bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs text-xs font-sans text-slate-900 mx-auto max-w-[420px] space-y-3.5"
          >
            {/* Merchant Mandi Letterhead */}
            <div className="pb-3 border-b border-slate-200/70 text-center space-y-1">
              <div className="flex items-center justify-center gap-2.5 mb-1.5">
                <img
                  src={merchantProfile.photoUrl || '/bharat_mandi_logo.png'}
                  alt={merchantProfile.ownerName || 'Bharat Mandi Logo'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 object-contain shrink-0 bg-transparent"
                />
                <div className="text-left">
                  <span className="text-[9px] tracking-widest font-black uppercase text-slate-500 block">
                    WHOLESALE MANDI COMMISSION AGENT
                  </span>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                    {merchantProfile.shopName}
                  </h2>
                </div>
              </div>
              <p className="text-[11px] font-bold text-slate-800 leading-snug">
                {merchantProfile.shopNumber ? (
                  merchantProfile.shopNumber.toLowerCase().includes('shop')
                    ? merchantProfile.shopNumber
                    : `Shop No. ${merchantProfile.shopNumber}`
                ) : 'Shop No. 1'} • {merchantProfile.marketYardName}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Adathiya: {merchantProfile.ownerName || 'Merchant'} | Ph: {merchantProfile.phoneNumber}
              </p>
              <div className="pt-1">
                <span className="inline-block bg-slate-100/90 text-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-slate-200/60 tracking-wider">
                  Mandi Sale Parchi
                </span>
              </div>
            </div>

            {/* Slip Meta */}
            <div className="flex justify-between items-center py-2 border-b border-slate-200/60 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">PARCHI NO.</span>
                <span className="font-bold text-slate-900 font-mono">{lot.parchiNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">DATE & TIME</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {lot.date} • {lot.time}
                </span>
              </div>
            </div>

            {/* Farmer Info */}
            <div className="py-2.5 border-b border-slate-200/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {farmerPhoto ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <img
                      src={farmerPhoto}
                      alt={lot.farmerName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0">
                    {(lot.farmerName || 'F').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Farmer / Consignor</span>
                  <div className="text-[12px] font-black text-slate-900 leading-snug">
                    <span>{lot.farmerName || 'Farmer Consignor'}</span>
                    {lot.farmerVillage && (
                      <span className="font-medium text-[11px] text-slate-500 ml-1.5 font-sans">({lot.farmerVillage})</span>
                    )}
                  </div>
                </div>
              </div>

              {lot.farmerPhone && (
                <div className="text-[10px] text-slate-600 flex items-center gap-1 font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                  <Phone className="w-2.5 h-2.5 text-slate-400" />
                  <span>+91 {lot.farmerPhone}</span>
                </div>
              )}
            </div>

            {/* Parchi / Lot Particulars */}
            <div className="py-2 space-y-2 border-b border-slate-200/60">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 pb-1.5 border-b border-slate-200/50 uppercase tracking-wider">
                <span>Variety & Particulars</span>
                <span className="text-right">Rate & Gross</span>
              </div>

              {linkedShipment && linkedShipment.items.length > 0 ? (
                <div className="space-y-2.5 py-1">
                  {linkedShipment.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-100/80 pb-2 last:border-0 last:pb-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-900 font-black text-[13px]">{it.flowerVariety}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5">
                          {/* 1. Packaging Count & Type */}
                          <span className="bg-slate-50 px-1.5 py-0.5 rounded font-bold border border-slate-200/60 text-slate-700 text-[10px]">
                            {it.boxesCount ? `${it.boxesCount} ${it.packagingType || lotPackaging}` : `1 ${it.packagingType || lotPackaging}`}
                          </span>
                          <span className="text-slate-300">•</span>
                          {/* 2. Quantity / Weight */}
                          <span className="font-bold text-slate-900 font-mono">
                            {it.quantity} {it.unit}
                          </span>
                          <span className="text-slate-300">•</span>
                          {/* 3. Rate */}
                          <span className="font-semibold text-slate-700 font-mono">
                            @ ₹{it.rate}/{it.unit}
                          </span>
                          <span className="text-slate-300">•</span>
                          {/* 4. Quality */}
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase ${
                            it.flowerQuality === 'Bad'
                              ? 'bg-red-50 text-red-800 border-red-200/60'
                              : it.flowerQuality === 'Average'
                              ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                          }`}>
                            {it.flowerQuality || 'Good'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-slate-900 font-black text-xs font-mono">
                          ₹{Math.round(it.quantity * it.rate).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between items-start text-xs py-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-900 font-black text-[13px]">{lot.flowerVariety}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5">
                      {/* 1. Packaging Count & Type */}
                      <span className="bg-slate-50 px-1.5 py-0.5 rounded font-bold border border-slate-200/60 text-slate-700 text-[10px]">
                        {lot.boxesCount ? `${lot.boxesCount} ${lotPackaging}` : `1 ${lotPackaging}`}
                      </span>
                      <span className="text-slate-300">•</span>
                      {/* 2. Quantity / Weight */}
                      <span className="font-bold text-slate-900 font-mono">
                        {lot.quantity} {lot.unit}
                      </span>
                      <span className="text-slate-300">•</span>
                      {/* 3. Rate */}
                      <span className="font-semibold text-slate-700 font-mono">
                        @ ₹{lot.rate}/{lot.unit}
                      </span>
                      <span className="text-slate-300">•</span>
                      {/* 4. Quality */}
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase ${
                        lot.flowerQuality === 'Bad'
                          ? 'bg-red-50 text-red-800 border-red-200/60'
                          : lot.flowerQuality === 'Average'
                          ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                      }`}>
                        {lot.flowerQuality || 'Good'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-slate-900 font-black text-xs font-mono">
                      ₹{lot.grossTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* Box count and Quality summary strip */}
              <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50/80 p-2 rounded-xl border border-slate-200/60 mt-1.5">
                <div>
                  <span className="text-slate-400 font-medium block">Lot Type</span>
                  <span className="font-bold text-slate-800">
                    {linkedShipment ? `One Truck (${linkedShipment.items.length} varieties)` : (lot.boxesCount ? `${lot.boxesCount} ${lotPackaging}` : 'Direct arrival')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Total Volume</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {lot.quantity} {lot.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Charges Strip (Vehicle / Freight & Hamali / Loading) */}
            <div className="py-2 border-b border-slate-200/60 text-[11px] space-y-1.5">
              <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                Mandi Recorded Charges
              </span>

              <div className="flex justify-between text-slate-600">
                <span>{language === 'te' ? 'రవాణా / వెహికల్ ఛార్జీలు' : 'Vehicle / Freight Charges'}</span>
                <span className="font-mono font-bold text-slate-900">₹{transportVal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>{language === 'te' ? 'హమాలీ / లోడింగ్ కూలీ' : 'Hamali / Loading Charges'}</span>
                <span className="font-mono font-bold text-slate-900">₹{ammaliVal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Total Sales Amount (Gross Total before deductions) */}
            <div className="my-2 p-3.5 rounded-2xl bg-[#1a3a52] text-white flex justify-between items-center shadow-xs">
              <div>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-200">
                  TOTAL SALES AMOUNT
                </span>
                <span className="text-[9px] text-slate-300 font-normal block mt-0.5">
                  {language === 'te' ? 'స్థూల మొత్తం (కమీషన్ తగ్గింపుల ముందు)' : 'Gross sales amount (before deductions)'}
                </span>
              </div>
              <span className="text-lg sm:text-xl font-black text-white font-mono">
                ₹{(linkedShipment ? linkedShipment.grossTotal : lot.grossTotal).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Auction Slip Memo Notice */}
            <div className="py-2 border-b border-slate-200/60 text-[10px] text-slate-500 space-y-1">
              <div className="flex justify-between items-center font-medium">
                <span>Document Type</span>
                <span className="font-bold text-slate-700">
                  {language === 'te' ? 'రోజువారీ వేలం తూకం పర్చి' : language === 'hi' ? 'दैनिक नीलामी तौल पर्ची' : 'Daily Auction Weighing Slip'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[9px]">
                <span>Mandi Verification</span>
                <span className="font-semibold text-slate-600">
                  Official Mandi Entry Recorded
                </span>
              </div>
            </div>

            {/* Signatures Area */}
            <div className="pt-4 pb-1 grid grid-cols-2 gap-4 text-center text-[9px]">
              <div className="border-t border-slate-200/80 pt-1.5 text-slate-500">
                <span>Farmer Signature / Thumb</span>
              </div>
              <div className="border-t border-slate-200/80 pt-1.5 font-bold text-slate-800">
                <span>For {merchantProfile.shopName}</span>
                <span className="block text-[8px] font-normal text-slate-400">(Authorized Signatory)</span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200/40">
              <p>*** Wholesale Market Yard ***</p>
              <p className="text-[8px] mt-0.5">Printed via भारत MANDI</p>
            </div>
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="no-print flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="manual-remove-parchi-trigger"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer min-touch-target"
              title="Discard this parchi and preserve an audit log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Slip</span>
            </button>

            <button
              type="button"
              id="edit-parchi-footer-btn"
              onClick={() => openEditParchiModal(lot)}
              className="text-xs text-amber-800 hover:text-amber-900 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer min-touch-target border border-amber-200"
              title="Edit details of this saved parchi"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <button
            type="button"
            id="parchi-modal-close-bottom-btn"
            onClick={() => setSelectedParchiLot(null)}
            className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#122839] transition cursor-pointer min-touch-target"
          >
            {t('close')}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal for Parchi Slip Removal */}
      {lot && (
        <DeleteConfirmModal
          isOpen={isDeleteConfirmOpen}
          title="Remove Mandi Parchi Slip"
          itemName={`Parchi Slip: ${lot.parchiNumber}`}
          itemDetails={`Farmer: ${lot.farmerName} • Flower: ${lot.flowerVariety} • Amount: ₹${(lot.grossTotal ?? (lot.quantity * lot.rate)).toLocaleString('en-IN')}`}
          message="Are you sure you want to remove this Mandi slip? It will be archived with an audit log record."
          confirmText="CONFIRM REMOVE"
          cancelText="CANCEL"
          onConfirm={() => {
            setIsDeleteConfirmOpen(false);
            handleConfirmRemove();
          }}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </div>
  );
};
