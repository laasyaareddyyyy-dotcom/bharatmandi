import React, { useState, useMemo } from 'react';
import {
  History,
  ArrowLeft,
  Printer,
  X,
  Search,
  RotateCcw,
  Trash2,
  Download,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { ParchiAuditLog } from '../../types';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { sounds } from '../../utils/audio';

export const ParchiAuditTrailModal: React.FC = () => {
  const {
    isAuditTrailOpen,
    setIsAuditTrailOpen,
    parchiAuditLogs,
    restoreParchiFromAudit,
    clearParchiAuditLogs,
    setSelectedParchiLot,
    merchantProfile,
    t,
  } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuditTrailOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAuditTrailOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuditTrailOpen, setIsAuditTrailOpen]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return parchiAuditLogs;
    const q = searchQuery.toLowerCase().trim();
    return parchiAuditLogs.filter(
      (log) =>
        log.parchiNumber.toLowerCase().includes(q) ||
        log.farmerName.toLowerCase().includes(q) ||
        log.farmerPhone.toLowerCase().includes(q) ||
        log.farmerVillage.toLowerCase().includes(q) ||
        log.flowerVariety.toLowerCase().includes(q)
    );
  }, [parchiAuditLogs, searchQuery]);

  const totalValueRemoved = useMemo(() => {
    return parchiAuditLogs.reduce((acc, log) => acc + (log.farmerNetPayable || 0), 0);
  }, [parchiAuditLogs]);

  if (!isAuditTrailOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 text-center border border-slate-200">
        <button
          type="button"
          onClick={() => setIsAuditTrailOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <History className="w-7 h-7 opacity-60" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          Audit Trail Disabled
        </h3>
        <p className="text-xs text-slate-600 mb-5">
          The Audit Trail feature has been disabled by system administrator.
        </p>
        <button
          type="button"
          onClick={() => setIsAuditTrailOpen(false)}
          className="px-5 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#132d42] transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );

  const handleRestore = (log: ParchiAuditLog) => {
    const success = restoreParchiFromAudit(log.id);
    if (success) {
      setRestoredId(log.id);
      setTimeout(() => setRestoredId(null), 3000);
    }
  };

  const handlePreviewSlip = (log: ParchiAuditLog) => {
    if (log.archivedLot) {
      setSelectedParchiLot(log.archivedLot);
      setIsAuditTrailOpen(false);
    }
  };

  const exportAuditCSV = () => {
    if (parchiAuditLogs.length === 0) return;
    const headers = [
      'Parchi Number',
      'Original Date',
      'Original Time',
      'Farmer Name',
      'Village',
      'Phone',
      'Flower Variety',
      'Boxes',
      'Quantity',
      'Unit',
      'Rate',
      'Gross Total',
      'Commission',
      'Farmer Net',
      'Payment Status',
      'Printed At',
      'Removed At',
      'Action By',
      'Reason',
    ];

    const rows = parchiAuditLogs.map((l) => [
      l.parchiNumber,
      l.parchiDate,
      l.parchiTime,
      `"${l.farmerName.replace(/"/g, '""')}"`,
      `"${l.farmerVillage.replace(/"/g, '""')}"`,
      l.farmerPhone,
      `"${l.flowerVariety.replace(/"/g, '""')}"`,
      l.boxesCount || '',
      l.quantity,
      l.unit,
      l.rate,
      l.grossTotal,
      l.commissionAmount,
      l.farmerNetPayable,
      l.paymentStatus,
      `"${l.printedAt}"`,
      `"${l.removedAt}"`,
      `"${l.actionBy}"`,
      `"${l.reason}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `PhoolMitra-Parchi-Audit-Trail-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="parchi-audit-trail-overlay"
      onClick={() => setIsAuditTrailOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div
        id="parchi-audit-trail-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsAuditTrailOpen(false)}
              aria-label="Go Back"
              className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 hidden sm:flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg leading-tight text-white">
                  {t('auditTrailTitle')}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-xs font-bold">
                  {parchiAuditLogs.length}
                </span>
              </div>
              <p className="text-xs text-slate-200/80 leading-none mt-0.5">{t('auditTrailSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            id="close-audit-trail-btn"
            onClick={() => setIsAuditTrailOpen(false)}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="flex-shrink-0 bg-[#f8fafc] border-b border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5 pointer-events-none" />
            <input
              id="audit-trail-search"
              type="text"
              placeholder="Search by farmer, variety, parchi #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#e2e8f0] bg-white text-xs font-medium focus:outline-hidden focus:border-[#1a3a52]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {parchiAuditLogs.length > 0 && (
              <>
                <button
                  type="button"
                  id="export-audit-csv-btn"
                  onClick={exportAuditCSV}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[#1e293b] text-xs font-semibold hover:bg-[#f1f5f9] transition flex items-center gap-1.5 shadow-2xs"
                  title="Export audit log to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#1a3a52]" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  id="trigger-clear-audit-btn"
                  onClick={() => setIsClearModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Trail</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-3 flex-1 bg-[#F9F7F4]">
          {restoredId && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Parchi restored back to Active Lots successfully!</span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          {parchiAuditLogs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                  Total Parchis Discarded
                </span>
                <span className="text-base font-black text-[#1e293b] font-mono">
                  {parchiAuditLogs.length} slips
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                  Total Farmer Value Traced
                </span>
                <span className="text-base font-black text-[#1a3a52] font-mono">
                  ₹{totalValueRemoved.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                  Latest Audit Event
                </span>
                <span className="text-xs font-semibold text-[#1e293b] truncate block">
                  {parchiAuditLogs[0]?.removedAt || 'N/A'}
                </span>
              </div>
            </div>
          )}

          {/* Logs List */}
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-[#e2e8f0] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#eef3f7] mx-auto flex items-center justify-center text-[#1a3a52]">
                <History className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#1e293b]">No Audit Logs Found</h4>
              <p className="text-xs text-[#64748b] max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'No archived parchis match your search filter.'
                  : 'When the "Remove Parchi After Printing" toggle is enabled in Settings, any parchi slip confirmed printed will be archived here with full auction and timestamp audit logs.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  id={`audit-card-${log.id}`}
                  className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-2xs hover:border-[#1a3a52]/40 transition space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-[#1a3a52]/10 text-[#1a3a52]">
                        {log.parchiNumber}
                      </span>
                      <span className="text-xs font-bold text-[#1e293b]">
                        {log.flowerVariety}
                      </span>
                      {log.flowerQuality && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                          {log.flowerQuality}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Printer className="w-3 h-3" />
                        <span>Printed & Discarded</span>
                      </span>
                      <span className="text-[11px] font-black text-[#1e293b]">
                        ₹{log.farmerNetPayable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Card Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Farmer */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                        Farmer / Consignor
                      </span>
                      <span className="font-bold text-[#1e293b] block">
                        {log.farmerName}
                      </span>
                      <span className="text-[11px] text-[#64748b]">
                        📍 {log.farmerVillage} • {log.farmerPhone}
                      </span>
                    </div>

                    {/* Auction Data */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                        Lot Breakdown
                      </span>
                      <span className="font-semibold text-[#1e293b] block">
                        {log.quantity} {log.unit} @ ₹{log.rate}/{log.unit}
                      </span>
                      <span className="text-[11px] text-[#64748b]">
                        {log.boxesCount ? `${log.boxesCount} Boxes • ` : ''}
                        Comm: ₹{log.commissionAmount}
                      </span>
                    </div>

                    {/* Audit Metadata */}
                    <div className="bg-[#f8fafc] p-2 rounded-lg border border-[#e2e8f0] text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-[#64748b]">
                        <span>🖨️ Printed:</span>
                        <span className="font-mono font-medium text-[#1e293b]">{log.printedAt}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#64748b]">
                        <span>🗑️ Removed:</span>
                        <span className="font-mono font-medium text-[#1e293b]">{log.removedAt}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#64748b]">
                        <span>👤 Operator:</span>
                        <span className="font-medium text-[#1e293b] truncate max-w-[120px]">{log.actionBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9]">
                    <span className="text-[11px] text-[#64748b] italic">
                      {log.reason}
                    </span>

                    <div className="flex items-center gap-2">
                      {log.archivedLot && (
                        <button
                          type="button"
                          id={`preview-archived-slip-${log.id}`}
                          onClick={() => handlePreviewSlip(log)}
                          className="px-2.5 py-1 rounded-lg border border-[#e2e8f0] text-[#1e293b] text-xs font-semibold hover:bg-[#f1f5f9] transition flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3 text-[#d4af37]" />
                          <span>View Slip</span>
                        </button>
                      )}

                      <button
                        type="button"
                        id={`restore-parchi-btn-${log.id}`}
                        onClick={() => handleRestore(log)}
                        className="px-3 py-1 rounded-lg bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center gap-1 shadow-2xs"
                        title="Restore this slip back to active lots"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t('restoreParchiBtn')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredLogs.length} of {parchiAuditLogs.length} audit records
          </span>
          <button
            type="button"
            id="close-audit-trail-footer-btn"
            onClick={() => setIsAuditTrailOpen(false)}
            className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#122839] transition cursor-pointer min-touch-target"
          >
            {t('close')}
          </button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={isClearModalOpen}
        title="Clear Parchi Audit Trail"
        itemName="All Archived Parchi Audit Logs"
        itemDetails={`${parchiAuditLogs.length} archived print slips and removed parchi records will be deleted.`}
        message="Are you sure you want to permanently clear the parchi audit history log? This action cannot be reversed."
        confirmText="CONFIRM CLEAR"
        cancelText="CANCEL"
        onConfirm={() => {
          clearParchiAuditLogs();
          sounds.playTrashSound?.();
          setIsClearModalOpen(false);
        }}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
