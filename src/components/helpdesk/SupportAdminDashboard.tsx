import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { HelpTicket, HelpTicketStatus, HelpTicketPriority, HelpTicketCategory } from '../../types';
import { SUPPORT_STAFF_MEMBERS } from '../../data/initialData';
import { TicketDetailView } from './TicketDetailView';
import {
  Headphones,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Trash2,
  Send,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { sounds } from '../../utils/audio';

const QUICK_STAFF_REPLIES = [
  'Ledger statement verified. Payment voucher balance has been recalculated in the 15-day settlement.',
  'Bluetooth thermal printer format updated. Please re-print your 58mm/80mm parchi slip.',
  'Kisan WhatsApp synchronization refreshed. The farmer will now receive real-time auction SMS alerts.',
  'Form C monthly market turnover summary has been regenerated and ready for Mandi download.',
];

export const SupportAdminDashboard: React.FC = () => {
  const {
    helpTickets,
    selectedHelpTicketId,
    setSelectedHelpTicketId,
    updateHelpTicketStatus,
    assignHelpTicket,
    addTicketResponse,
    deleteHelpTicket,
  } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<HelpTicketStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<HelpTicketPriority | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<'All' | 'merchant' | 'farmer'>('All');
  const [activeTicketIdForQuickReply, setActiveTicketIdForQuickReply] = useState<string | null>(null);
  const [customReply, setCustomReply] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState<HelpTicket | null>(null);

  // Selected ticket for detailed view
  const activeTicket = useMemo(() => {
    if (!selectedHelpTicketId) return null;
    return helpTickets.find((t) => t.id === selectedHelpTicketId || t.ticketNumber === selectedHelpTicketId) || null;
  }, [selectedHelpTicketId, helpTickets]);

  const metrics = useMemo(() => {
    const total = helpTickets.length;
    const open = helpTickets.filter((t) => t.status === 'Open').length;
    const inProgress = helpTickets.filter((t) => t.status === 'In Progress').length;
    const resolved = helpTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
    const critical = helpTickets.filter((t) => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;

    return { total, open, inProgress, resolved, critical };
  }, [helpTickets]);

  const filteredTickets = useMemo(() => {
    return helpTickets.filter((t) => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (roleFilter !== 'All' && t.userRole !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = t.ticketNumber.toLowerCase().includes(q);
        const matchSubject = t.subject.toLowerCase().includes(q);
        const matchUser = t.userName.toLowerCase().includes(q);
        const matchPhone = t.userPhone.includes(q);
        if (!matchId && !matchSubject && !matchUser && !matchPhone) return false;
      }
      return true;
    });
  }, [helpTickets, statusFilter, priorityFilter, roleFilter, searchQuery]);

  if (activeTicket) {
    return (
      <TicketDetailView
        ticket={activeTicket}
        onBack={() => setSelectedHelpTicketId(null)}
        isAdminView={true}
      />
    );
  }

  const handleQuickAssign = (ticketId: string, staffName: string) => {
    assignHelpTicket(ticketId, staffName);
    sounds.playScaleBeep?.();
  };

  const handleQuickStatus = (ticketId: string, status: HelpTicketStatus) => {
    updateHelpTicketStatus(ticketId, status);
    sounds.playScaleBeep?.();
  };

  const handleSendQuickMacroReply = (ticketId: string, reply: string) => {
    addTicketResponse(ticketId, reply, 'support', false);
    sounds.playNotificationSound?.();
    setActiveTicketIdForQuickReply(null);
  };

  return (
    <div className="space-y-4">
      {/* Admin Notice Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#1a3a52] to-[#122839] text-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold leading-tight">Mandi Help Desk Control Center</h3>
            <p className="text-[11px] text-white/80">Manage merchant & farmer tickets, assign mandi desk officers, and resolve SLA items</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-white/20 font-mono font-bold">
            Live Support Desk Active
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block">Total Tickets</span>
          <span className="text-xl font-black text-[#1e293b] font-mono">{metrics.total}</span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Open (Awaiting)</span>
          <span className="text-xl font-black text-amber-900 font-mono">{metrics.open}</span>
        </div>

        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">In Progress</span>
          <span className="text-xl font-black text-blue-900 font-mono">{metrics.inProgress}</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Resolved / Closed</span>
          <span className="text-xl font-black text-emerald-900 font-mono">{metrics.resolved}</span>
        </div>

        <div className="p-3 rounded-xl bg-red-50 border border-red-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">Critical Attention</span>
          <span className="text-xl font-black text-red-900 font-mono">{metrics.critical}</span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, Subject, User..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs font-medium bg-[#f8fafc] focus:bg-white focus:outline-none focus:border-[#1a3a52]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] text-xs font-semibold bg-white text-[#1e293b] focus:outline-none cursor-pointer"
            >
              <option value="All">All User Roles</option>
              <option value="merchant">Adathiya Merchants</option>
              <option value="farmer">Kisan Bhai</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] text-xs font-semibold bg-white text-[#1e293b] focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] text-xs font-semibold bg-white text-[#1e293b] focus:outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table / Cards */}
      <div className="space-y-2.5">
        {filteredTickets.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-[#e2e8f0] text-xs text-[#64748b]">
            No support tickets match the selected filters.
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isQuickReplyOpen = activeTicketIdForQuickReply === ticket.id;

            return (
              <div
                key={ticket.id}
                className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#e2e8f0] hover:border-[#1a3a52]/40 transition shadow-2xs space-y-3"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#eef3f7] text-[#1a3a52]">
                        {ticket.ticketNumber}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {ticket.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        ticket.priority === 'Critical' ? 'bg-red-100 text-red-900 border border-red-300' :
                        ticket.priority === 'High' ? 'bg-amber-100 text-amber-900' :
                        ticket.priority === 'Medium' ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ticket.userRole === 'farmer' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {ticket.userRole === 'farmer' ? '🌾 Kisan Bhai' : '🏬 Merchant'}
                      </span>
                    </div>

                    <h4
                      onClick={() => setSelectedHelpTicketId(ticket.id)}
                      className="text-xs sm:text-sm font-bold text-[#1e293b] hover:text-[#1a3a52] cursor-pointer transition leading-tight"
                    >
                      {ticket.subject}
                    </h4>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleQuickStatus(ticket.id, e.target.value as HelpTicketStatus)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                        ticket.status === 'Open' ? 'bg-amber-50 text-amber-900 border-amber-300' :
                        ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-900 border-blue-300' :
                        ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
                        'bg-slate-100 text-slate-800 border-slate-300'
                      }`}
                    >
                      <option value="Open">Status: Open</option>
                      <option value="In Progress">Status: In Progress</option>
                      <option value="Resolved">Status: Resolved</option>
                      <option value="Closed">Status: Closed</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setSelectedHelpTicketId(ticket.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Thread</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description snippet */}
                <p className="text-xs text-[#64748b] bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]/60 leading-relaxed">
                  {ticket.description}
                </p>

                {/* Admin controls row: Assign Staff, User details, Quick Reply */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-[#e2e8f0]/60 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-[#64748b]">
                    <span className="font-bold text-[#1e293b]">{ticket.userName} ({ticket.userPhone})</span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Staff assignment dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#64748b]">Assign:</span>
                      <select
                        value={ticket.assignedTo || 'Unassigned'}
                        onChange={(e) => handleQuickAssign(ticket.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-[#e2e8f0] text-xs font-medium bg-white text-[#1e293b] cursor-pointer"
                      >
                        {SUPPORT_STAFF_MEMBERS.map((staffName) => (
                          <option key={staffName} value={staffName}>
                            {staffName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Macro Reply Toggle */}
                    <button
                      type="button"
                      onClick={() => setActiveTicketIdForQuickReply(isQuickReplyOpen ? null : ticket.id)}
                      className="px-2.5 py-1 rounded-lg border border-[#e2e8f0] hover:bg-[#f1f5f9] text-xs font-semibold text-[#1a3a52] transition flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-[#d4af37]" />
                      <span>Quick Macro</span>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setTicketToDelete(ticket)}
                      className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition cursor-pointer"
                      title="Delete Ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Macro Reply Box */}
                {isQuickReplyOpen && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Send 1-Click Support Macro Response</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTicketIdForQuickReply(null)}
                        className="text-amber-800 hover:text-amber-950 font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {QUICK_STAFF_REPLIES.map((reply, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => handleSendMacroReply(ticket.id, reply)}
                          className="p-2 text-left rounded-lg bg-white border border-amber-200 hover:border-[#1a3a52] text-[11px] text-[#1e293b] transition hover:shadow-2xs cursor-pointer"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Ticket Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(ticketToDelete)}
        title="Delete Support Ticket"
        itemName={ticketToDelete ? `Ticket #${ticketToDelete.ticketNumber}` : undefined}
        itemDetails={
          ticketToDelete
            ? `User: ${ticketToDelete.userName} (${ticketToDelete.userRole}) • Subject: ${ticketToDelete.subject}`
            : undefined
        }
        message="Are you sure you want to delete this support inquiry? This will remove the ticket and all its message conversation history."
        confirmText="CONFIRM DELETE"
        cancelText="CANCEL"
        onConfirm={() => {
          if (ticketToDelete) {
            deleteHelpTicket(ticketToDelete.id);
            sounds.playTrashSound?.();
            setTicketToDelete(null);
          }
        }}
        onCancel={() => setTicketToDelete(null)}
      />
    </div>
  );

  function handleSendMacroReply(ticketId: string, replyText: string) {
    handleSendQuickMacroReply(ticketId, replyText);
  }
};
