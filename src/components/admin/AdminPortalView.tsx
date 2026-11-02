import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Ticket,
  fetchTicketsFromSupabase,
  updateTicketInSupabase,
  subscribeToSupabaseTickets,
} from '../../services/supabaseTickets';
import {
  LogOut,
  PhoneCall,
  CheckCircle2,
  RotateCcw,
  Clock,
  Sparkles,
  Inbox,
  RefreshCw,
  MessageSquare,
  Building2,
  Tag,
  Loader2,
} from 'lucide-react';

export const AdminPortalView: React.FC = () => {
  const { logoutCurrentUser } = useMandi();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<'unsolved' | 'solved'>('unsolved');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Map of reply notes per ticket ID
  const [replyNotes, setReplyNotes] = useState<Record<string, string>>({});
  const [loadingTicketIds, setLoadingTicketIds] = useState<Record<string, boolean>>({});

  // Fetch tickets from Supabase
  const loadTickets = useCallback(async () => {
    setIsRefreshing(true);
    const res = await fetchTicketsFromSupabase();
    setIsLoading(false);
    setIsRefreshing(false);
    if (res.success && res.tickets) {
      setTickets(res.tickets);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const unsubscribe = subscribeToSupabaseTickets(() => {
      loadTickets();
    });
    return () => {
      unsubscribe();
    };
  }, [loadTickets]);

  // Derived arrays
  const unsolvedTickets = useMemo(() => {
    return tickets
      .filter((t) => t.status === 'open' || t.status === 'in_progress')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tickets]);

  const solvedTickets = useMemo(() => {
    return tickets
      .filter((t) => t.status === 'resolved' || t.status === 'closed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tickets]);

  const displayedTickets = activeTab === 'unsolved' ? unsolvedTickets : solvedTickets;

  // Handle Mark as Solved
  const handleMarkSolved = async (ticket: Ticket) => {
    const note = replyNotes[ticket.id] || '';
    setLoadingTicketIds((prev) => ({ ...prev, [ticket.id]: true }));

    await updateTicketInSupabase(ticket.id, 'resolved', note.trim());

    setReplyNotes((prev) => {
      const next = { ...prev };
      delete next[ticket.id];
      return next;
    });

    setLoadingTicketIds((prev) => ({ ...prev, [ticket.id]: false }));
    loadTickets();
  };

  // Handle Reopen
  const handleReopen = async (ticket: Ticket) => {
    setLoadingTicketIds((prev) => ({ ...prev, [ticket.id]: true }));

    await updateTicketInSupabase(ticket.id, 'open', ticket.admin_note || '');

    setLoadingTicketIds((prev) => ({ ...prev, [ticket.id]: false }));
    loadTickets();
  };

  // Helper date formatter
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 font-sans px-2 sm:px-4 animate-in fade-in duration-200">
      {/* 1. SLIM HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight">
            Tickets
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase Live</span>
          </span>
        </div>

        <button
          type="button"
          onClick={logoutCurrentUser}
          className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* 2. TWO TABS: UNSOLVED & SOLVED */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-2xs flex items-center justify-between gap-2">
        <div className="grid grid-cols-2 w-full gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('unsolved')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'unsolved'
                ? 'bg-[#1a3a52] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Unsolved ({unsolvedTickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('solved')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'solved'
                ? 'bg-[#1a3a52] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Solved ({solvedTickets.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadTickets}
          disabled={isRefreshing}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition cursor-pointer shrink-0"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 text-[#1a3a52] ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 3. TICKET LIST & EMPTY STATES */}
      {isLoading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#1a3a52]" />
          <p>Loading tickets from Supabase...</p>
        </div>
      ) : displayedTickets.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-base font-extrabold text-slate-700">
            {activeTab === 'unsolved' ? 'No unsolved tickets' : 'No solved tickets'}
          </p>
          <p className="text-xs text-slate-400">
            {activeTab === 'unsolved'
              ? 'All user inquiries have been answered.'
              : 'Resolved tickets will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTickets.map((t) => {
            const isSaving = loadingTicketIds[t.id];
            const cleanPhone = t.user_phone.replace(/\D/g, '');

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3 hover:border-[#1a3a52]/40 transition"
              >
                {/* Card Top: Shop Name, Phone, Date */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-base text-[#1e293b]">
                        {t.shop_name || t.user_name || 'Mandi Trader'}
                      </span>
                      {t.user_name && t.user_name !== t.shop_name && (
                        <span className="text-xs text-slate-500 font-medium">({t.user_name})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-1">
                      <a
                        href={`tel:+91${cleanPhone}`}
                        className="text-[#1a3a52] font-mono font-bold hover:underline inline-flex items-center gap-1 bg-[#eef3f7] px-2 py-0.5 rounded-md"
                      >
                        <PhoneCall className="w-3 h-3 text-emerald-600" />
                        <span>+91 {t.user_phone}</span>
                      </a>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatDate(t.created_at)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                      activeTab === 'unsolved'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {activeTab === 'unsolved' ? 'Unsolved' : 'Solved'}
                  </span>
                </div>

                {/* Subject & Message */}
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-sm sm:text-base text-[#1e293b]">
                    {t.subject}
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {t.message}
                  </p>
                </div>

                {/* Action Section */}
                {activeTab === 'unsolved' ? (
                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Reply note for user (optional)..."
                      value={replyNotes[t.id] || ''}
                      onChange={(e) =>
                        setReplyNotes((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1a3a52] transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleMarkSolved(t)}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Mark as Solved</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-100">
                    {t.admin_note ? (
                      <div className="text-xs text-emerald-900 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 flex-1">
                        <span className="font-bold">Admin Reply: </span>
                        <span>{t.admin_note}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No note added.</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleReopen(t)}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0 ml-auto"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>Reopen</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
