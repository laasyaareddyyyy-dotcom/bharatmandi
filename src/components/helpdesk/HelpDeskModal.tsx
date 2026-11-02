import React, { useEffect } from 'react';
import { useMandi } from '../../context/MandiContext';
import { RaiseQueryForm } from './RaiseQueryForm';
import { MyTicketsList } from './MyTicketsList';
import { SupportAdminDashboard } from './SupportAdminDashboard';
import { MandiKnowledgeBase } from './MandiKnowledgeBase';
import {
  X,
  HelpCircle,
  PlusCircle,
  Ticket,
  Headphones,
  BookOpen,
  PhoneCall,
  MessageCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

/* =========================================================================
   HELPDESK MODAL: MASTER STANDARDIZED MODAL
   - Fixed Header with 44px close button
   - Tab subnav
   - Scrollable body
   - Fixed footer
   - Dismiss via Backdrop & Escape
   ========================================================================= */

export const HelpDeskModal: React.FC = () => {
  const {
    isHelpDeskOpen,
    setIsHelpDeskOpen,
    helpDeskTab,
    setHelpDeskTab,
    helpTickets,
    setSelectedHelpTicketId,
    portalMode,
    t,
  } = useMandi();

  const handleClose = () => {
    setIsHelpDeskOpen(false);
    setSelectedHelpTicketId(null);
  };

  useEffect(() => {
    if (!isHelpDeskOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpDeskOpen]);

  if (!isHelpDeskOpen) return null;

  const openTicketsCount = helpTickets.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  ).length;

  return (
    <div
      id="help-desk-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        id="help-desk-modal-card"
        className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#d4af37] shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold leading-tight text-white">
                  {t('helpDesk')}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 uppercase tracking-wider text-slate-100">
                  2-Hour Support SLA
                </span>
              </div>
              <p className="text-xs text-slate-200/80 leading-none mt-0.5">
                {t('helpDeskSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-help-desk-modal-btn"
            onClick={handleClose}
            aria-label="Close modal"
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Mandi Helplines Sub-bar */}
        <div className="flex-shrink-0 bg-[#F8F6F2] border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <a href="tel:9110387978" className="flex items-center gap-1.5 font-medium text-slate-800 hover:text-[#1a3a52]">
              <PhoneCall className="w-3.5 h-3.5 text-[#1a3a52]" />
              <span>Helpline Number: <strong className="font-mono text-[#1a3a52]">9110387978</strong></span>
            </a>

            <a href="https://wa.me/919110387978" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-medium text-slate-800 hover:text-emerald-700">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp: <strong className="font-mono text-slate-800">9110387978</strong></span>
            </a>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3 h-3 text-[#1a3a52]" />
            <span>Mandi Hours: <strong>04:00 AM – 10:00 PM</strong></span>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 pt-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <button
              id="helpdesk-tab-raise"
              type="button"
              onClick={() => {
                setSelectedHelpTicketId(null);
                setHelpDeskTab('raise');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
                helpDeskTab === 'raise'
                  ? 'border-[#1a3a52] text-[#1a3a52]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('raiseQuery')}</span>
            </button>

            <button
              id="helpdesk-tab-my-tickets"
              type="button"
              onClick={() => {
                setSelectedHelpTicketId(null);
                setHelpDeskTab('my-tickets');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
                helpDeskTab === 'my-tickets'
                  ? 'border-[#1a3a52] text-[#1a3a52]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>{t('myTickets')}</span>
              {openTicketsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#1a3a52] text-white">
                  {openTicketsCount}
                </span>
              )}
            </button>

            {portalMode === 'admin' && (
              <button
                id="helpdesk-tab-admin"
                type="button"
                onClick={() => {
                  setSelectedHelpTicketId(null);
                  setHelpDeskTab('admin-dashboard');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
                  helpDeskTab === 'admin-dashboard'
                    ? 'border-[#1a3a52] text-[#1a3a52]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Headphones className="w-4 h-4" />
                <span>{t('supportAdmin')}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900">
                  ADMIN
                </span>
              </button>
            )}

            <button
              id="helpdesk-tab-faq"
              type="button"
              onClick={() => {
                setSelectedHelpTicketId(null);
                setHelpDeskTab('faq');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
                helpDeskTab === 'faq'
                  ? 'border-[#1a3a52] text-[#1a3a52]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('knowledgeBase')}</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 sm:p-6 bg-[#f8fafc]">
          {helpDeskTab === 'raise' && (
            <RaiseQueryForm
              onSuccessNavigate={(ticketId) => {
                setSelectedHelpTicketId(ticketId);
                setHelpDeskTab('my-tickets');
              }}
            />
          )}

          {helpDeskTab === 'my-tickets' && (
            <MyTicketsList
              onRaiseNew={() => {
                setSelectedHelpTicketId(null);
                setHelpDeskTab('raise');
              }}
            />
          )}

          {helpDeskTab === 'admin-dashboard' && <SupportAdminDashboard />}

          {helpDeskTab === 'faq' && (
            <MandiKnowledgeBase
              onRaiseTicket={() => {
                setSelectedHelpTicketId(null);
                setHelpDeskTab('raise');
              }}
            />
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            PhoolMitra Mandi Help Desk &bull; 24x7 Assistance
          </span>
          <button
            type="button"
            id="close-help-desk-footer-btn"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#122839] transition cursor-pointer min-touch-target"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
