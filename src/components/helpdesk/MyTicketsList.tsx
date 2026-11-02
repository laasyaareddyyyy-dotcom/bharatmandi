import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { HelpTicket, HelpTicketStatus } from '../../types';
import { TicketDetailView } from './TicketDetailView';
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Plus,
  Paperclip,
  User,
  Phone,
  Tag,
  Headphones,
} from 'lucide-react';

export const MyTicketsList: React.FC<{
  onRaiseNew: () => void;
}> = ({ onRaiseNew }) => {
  const {
    helpTickets,
    selectedHelpTicketId,
    setSelectedHelpTicketId,
    currentUserPhone,
    currentUserAccount,
    portalMode,
    merchantProfile,
  } = useMandi();

  const [statusFilter, setStatusFilter] = useState<HelpTicketStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected ticket for detailed view
  const activeTicket = useMemo(() => {
    if (!selectedHelpTicketId) return null;
    return helpTickets.find((t) => t.id === selectedHelpTicketId || t.ticketNumber === selectedHelpTicketId) || null;
  }, [selectedHelpTicketId, helpTickets]);

  const filteredTickets = useMemo(() => {
    return helpTickets.filter((t) => {
      // Filter by status
      if (statusFilter !== 'All' && t.status !== statusFilter) {
        return false;
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = t.ticketNumber.toLowerCase().includes(q);
        const matchSubject = t.subject.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchUser = t.userName.toLowerCase().includes(q);
        if (!matchId && !matchSubject && !matchCat && !matchUser) return false;
      }
      return true;
    });
  }, [helpTickets, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = {
      All: helpTickets.length,
      Open: 0,
      'In Progress': 0,
      Resolved: 0,
      Closed: 0,
    };
    helpTickets.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return counts;
  }, [helpTickets]);

  if (activeTicket) {
    return (
      <TicketDetailView
        ticket={activeTicket}
        onBack={() => setSelectedHelpTicketId(null)}
        isAdminView={false}
      />
    );
  }

  const getStatusPill = (status: HelpTicketStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Closed
          </span>
        );
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Critical':
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-100 text-red-800">CRITICAL</span>;
      case 'High':
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">HIGH</span>;
      case 'Medium':
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">MED</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">LOW</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#64748b]" />
          <input
            id="search-tickets-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Ticket ID, Subject..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium bg-white focus:outline-none focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52]"
          />
        </div>

        <button
          id="raise-new-ticket-action-btn"
          type="button"
          onClick={onRaiseNew}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Raise New Ticket</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#e2e8f0]">
        {(['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as (HelpTicketStatus | 'All')[]).map((tab) => {
          const isActive = statusFilter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#1a3a52] text-white shadow-2xs'
                  : 'text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9]'
              }`}
            >
              <span>{tab}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {statusCounts[tab as keyof typeof statusCounts] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-[#e2e8f0] p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center mx-auto text-[#64748b]">
            <Clock className="w-6 h-6 text-[#1a3a52]/50" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1e293b]">No tickets found</h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              {searchQuery
                ? `No support tickets matched "${searchQuery}".`
                : statusFilter !== 'All'
                ? `No tickets currently in ${statusFilter} state.`
                : 'You have not submitted any queries yet.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRaiseNew}
            className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold shadow-2xs hover:bg-[#122839] cursor-pointer"
          >
            Raise a Support Query
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTickets.map((ticket) => {
            const hasResponses = (ticket.responses?.length || 0) > 0;
            const lastResponse = hasResponses ? ticket.responses![ticket.responses!.length - 1] : null;

            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedHelpTicketId(ticket.id)}
                className="p-3.5 sm:p-4 rounded-xl bg-white hover:bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#1a3a52]/50 transition cursor-pointer shadow-2xs group space-y-2"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#eef3f7] text-[#1a3a52]">
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-[11px] font-semibold text-[#64748b] px-2 py-0.5 rounded bg-gray-100">
                      {ticket.category}
                    </span>
                    {getPriorityBadge(ticket.priority)}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusPill(ticket.status)}
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1a3a52] group-hover:translate-x-0.5 transition" />
                  </div>
                </div>

                {/* Subject & snippet */}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#1e293b] group-hover:text-[#1a3a52] transition leading-snug">
                    {ticket.subject}
                  </h4>
                  <p className="text-xs text-[#64748b] line-clamp-2 mt-0.5 leading-relaxed">
                    {ticket.description}
                  </p>
                </div>

                {/* Footer metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#e2e8f0]/50 text-[11px] text-[#64748b]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-[#1a3a52]" />
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </span>

                    <span className="flex items-center gap-1 font-medium">
                      <User className="w-3 h-3 text-[#1a3a52]" />
                      <span>{ticket.userName}</span>
                    </span>

                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <span className="flex items-center gap-1 font-mono text-emerald-700 font-bold">
                        <Paperclip className="w-3 h-3" />
                        <span>{ticket.attachments.length} files</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {ticket.assignedTo && ticket.assignedTo !== 'Unassigned' && (
                      <span className="text-[10px] font-bold text-[#1a3a52] bg-[#eef3f7] px-2 py-0.5 rounded">
                        Officer: {ticket.assignedTo}
                      </span>
                    )}

                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#1e293b]">
                      <MessageSquare className="w-3 h-3 text-[#1a3a52]" />
                      <span>{ticket.responses?.length || 0} updates</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
