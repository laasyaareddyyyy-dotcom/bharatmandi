import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ArrowLeft,
  X,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { getTodayDateString, getPastDateString, formatDisplayDate } from '../../data/initialData';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { SalesReportPdfModal } from '../merchant/SalesReportPdfModal';
import { sounds } from '../../utils/audio';

/* =========================================================================
   DATE SWITCHER MODAL: UNIVERSAL STANDARDIZED MODAL
   - Fixed Header with high-contrast 44px close button
   - Scrollable internal content area
   - Escape key & backdrop click dismiss
   - Quick date switchers, custom calendar picker, morning refresh
   ========================================================================= */

export const DateSwitcherModal: React.FC = () => {
  const {
    isDateSwitcherOpen,
    setIsDateSwitcherOpen,
    activeSessionDate,
    setActiveSessionDate,
    lots,
    startNewDaySession,
    clearDateLots,
    setMerchantTab,
    t,
  } = useMandi();

  const [customDate, setCustomDate] = useState<string>(activeSessionDate);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [isSalesReportModalOpen, setIsSalesReportModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isDateSwitcherOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDateSwitcherOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDateSwitcherOpen, setIsDateSwitcherOpen]);

  if (!isDateSwitcherOpen) return null;

  const todayStr = getTodayDateString();
  const yesterdayStr = getPastDateString(1);
  const twoDaysAgoStr = getPastDateString(2);

  const getCountForDate = (d: string) => lots.filter((l) => l.date === d).length;

  const handleSelectDate = (date: string) => {
    setActiveSessionDate(date);
    setCustomDate(date);
    setShowSuccessToast(`Active trading date set to ${formatDisplayDate(date)}`);
    setTimeout(() => {
      setShowSuccessToast(null);
      setIsDateSwitcherOpen(false);
    }, 900);
  };

  const handleStartFreshDay = () => {
    startNewDaySession(todayStr);
    setCustomDate(todayStr);
    setShowSuccessToast(`Fresh morning session activated for today! New sales is clean & ready.`);
    setTimeout(() => {
      setShowSuccessToast(null);
      setIsDateSwitcherOpen(false);
    }, 1200);
  };

  const handleClearCurrentSessionLots = () => {
    setIsClearConfirmOpen(true);
  };

  const handleConfirmClearLots = () => {
    clearDateLots(activeSessionDate);
    sounds.playTrashSound?.();
    setIsClearConfirmOpen(false);
    setShowSuccessToast(`Session refreshed. New sales for ${formatDisplayDate(activeSessionDate)} is now empty.`);
    setTimeout(() => {
      setShowSuccessToast(null);
    }, 1500);
  };

  const activeDateLotCount = getCountForDate(activeSessionDate);

  return (
    <div
      id="date-switcher-overlay"
      onClick={() => setIsDateSwitcherOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div
        id="date-switcher-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsDateSwitcherOpen(false)}
              aria-label="Go Back"
              className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-[#d4af37] shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white leading-tight">
                Mandi Trading Session Date
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-200/80 leading-none mt-0.5">
                Manage daily auction dates &amp; morning session rollover
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-date-switcher-btn"
            onClick={() => setIsDateSwitcherOpen(false)}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0 space-y-4 bg-[#f8fafc]">
          {/* Toast feedback */}
          {showSuccessToast && (
            <div className="p-3 rounded-xl bg-[#eef3f7] border border-[#1a3a52]/30 text-[#1a3a52] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1a3a52]" />
              <span>{showSuccessToast}</span>
            </div>
          )}

          {/* Current Active Status Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Current Active Trading Session
            </span>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-lg font-black text-[#1e293b]">
                  {formatDisplayDate(activeSessionDate)}
                </span>
                <span className="block font-mono text-xs text-slate-500">
                  {activeSessionDate} {activeSessionDate === todayStr ? '(Today)' : ''}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    activeDateLotCount === 0
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-[#eef3f7] text-[#1a3a52] border border-[#1a3a52]/30'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {activeDateLotCount === 0 ? '0 Lots (Fresh Session)' : `${activeDateLotCount} Lots Recorded`}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Default App Opened Session Date */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Default App Trading Date
            </span>
            <button
              type="button"
              id="select-today-btn"
              onClick={() => handleSelectDate(todayStr)}
              className={`w-full p-3.5 rounded-xl text-left border transition flex items-center justify-between cursor-pointer min-touch-target ${
                activeSessionDate === todayStr
                  ? 'bg-[#eef3f7] border-[#1a3a52] text-[#1a3a52] shadow-2xs font-bold'
                  : 'bg-white border-slate-200 text-[#1e293b] hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="font-bold text-sm block text-[#1a3a52]">Default Trading Date (Today)</span>
                <span className="text-xs font-mono text-slate-500">{todayStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1a3a52] bg-[#1a3a52]/10 px-2.5 py-1 rounded-lg">
                  {getCountForDate(todayStr) === 0 ? '0 lots recorded' : `${getCountForDate(todayStr)} lots`}
                </span>
                {activeSessionDate === todayStr && <CheckCircle2 className="w-5 h-5 text-[#1a3a52]" />}
              </div>
            </button>
          </div>

          {/* Pick Custom Calendar Date */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-[#1e293b] block">
              Or Choose Any Specific Trading Date
            </label>
            <div className="flex items-center gap-2">
              <input
                id="custom-session-date-input"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-[#f8fafc] focus:outline-hidden focus:border-[#1a3a52]"
              />
              <button
                type="button"
                id="apply-custom-date-btn"
                onClick={() => handleSelectDate(customDate)}
                className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition whitespace-nowrap cursor-pointer min-touch-target"
              >
                Set Date
              </button>
            </div>
          </div>

          {/* Every Day Refresh Assurance Section */}
          <div className="p-4 rounded-xl bg-[#FEF8ED] border border-[#d4af37]/40 space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#1e293b]">
                  Everyday Mandi Trading Cycle
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                  Every new morning opens with a <strong>refreshed & empty</strong> New Sales entry screen, ready for the day&apos;s flower auctions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#1e293b]">
              <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                <Users className="w-3.5 h-3.5 text-[#1a3a52]" />
                <span>Farmers data & dues remain safe</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Past reports & PDFs preserved</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                id="start-fresh-day-btn"
                onClick={handleStartFreshDay}
                className="flex-1 px-3 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-touch-target"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Start Fresh Day for Today</span>
              </button>

              <button
                type="button"
                id="open-custom-sales-report-pdf-btn"
                onClick={() => {
                  sounds.playBidTick?.();
                  setIsSalesReportModalOpen(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#1a3a52] border border-slate-300 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-touch-target mt-1"
              >
                <FileText className="w-4 h-4 text-[#1a3a52]" />
                <span>Generate Custom Range Sales Report PDF</span>
              </button>

              {activeDateLotCount > 0 && (
                <button
                  type="button"
                  id="clear-session-lots-btn"
                  onClick={handleClearCurrentSessionLots}
                  className="px-3 py-2 rounded-xl bg-white border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 transition flex items-center gap-1 cursor-pointer min-touch-target"
                  title="Clear today's test lots to see empty morning state"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Refresh {activeSessionDate === todayStr ? 'Today' : 'Date'} (Empty)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1a3a52]" />
            <span>Single-Day Session Isolation</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setIsDateSwitcherOpen(false);
              setMerchantTab('settlement');
            }}
            className="text-[#1a3a52] font-bold hover:underline flex items-center gap-1 text-xs cursor-pointer"
          >
            <span>Open Fortnight Settlements</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <SalesReportPdfModal
        isOpen={isSalesReportModalOpen}
        onClose={() => setIsSalesReportModalOpen(false)}
      />

      <DeleteConfirmModal
        isOpen={isClearConfirmOpen}
        title="Clear Trading Session Parchi Lots"
        itemName={`Session Date: ${formatDisplayDate(activeSessionDate)}`}
        itemDetails={`${activeDateLotCount} parchi lots currently recorded for this day will be cleared.`}
        message={`Are you sure you want to clear all ${activeDateLotCount} recorded lots for ${formatDisplayDate(activeSessionDate)}? All farmer accounts, previous reports, and payment logs remain safe.`}
        confirmText="CONFIRM CLEAR"
        cancelText="CANCEL"
        onConfirm={handleConfirmClearLots}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </div>
  );
};
