import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  createTicketInSupabase,
  fetchTicketsFromSupabase,
  subscribeToSupabaseTickets,
} from '../../services/supabaseTickets';
import {
  Headphones,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  RefreshCw,
  MessageSquare,
  Store,
  User,
  Phone,
  Tag,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export const UserTicketScreen: React.FC = () => {
  const { merchantProfile, currentUserPhone, currentUserAccount } = useMandi();

  const [activeTab, setActiveTab] = useState<'my-tickets' | 'raise-ticket'>('my-tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Form Fields
  const [subject, setSubject] = useState<string>('');
  const [category, setCategory] = useState<string>('Billing & Settlement');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [message, setMessage] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');

  const activePhone = useMemo(() => {
    return (
      merchantProfile?.phoneNumber ||
      currentUserPhone ||
      currentUserAccount?.phoneNumber ||
      ''
    );
  }, [merchantProfile?.phoneNumber, currentUserPhone, currentUserAccount?.phoneNumber]);

  const activeShopName = useMemo(() => {
    return (
      merchantProfile?.shopName ||
      currentUserAccount?.shopOrVillage ||
      'Mandi Trader Shop'
    );
  }, [merchantProfile?.shopName, currentUserAccount?.shopOrVillage]);

  const activeUserName = useMemo(() => {
    return (
      merchantProfile?.ownerName ||
      currentUserAccount?.fullName ||
      'Mandi Merchant'
    );
  }, [merchantProfile?.ownerName, currentUserAccount?.fullName]);

  const [userToast, setUserToast] = useState<string | null>(null);
  const prevTicketsRef = React.useRef<Ticket[]>([]);

  // Clear unread badge on viewing support tickets
  useEffect(() => {
    localStorage.removeItem('bharatmandi_unread_ticket_update');
    window.dispatchEvent(new Event('ticket_update'));
  }, []);

  // Load user's tickets
  const loadUserTickets = useCallback(async () => {
    if (!activePhone) return;
    setIsRefreshing(true);
    const res = await fetchTicketsFromSupabase(activePhone);
    setIsLoading(false);
    setIsRefreshing(false);
    if (res.success && res.tickets) {
      const newTickets = res.tickets;

      // Check if any ticket changed status or note compared to previous
      if (prevTicketsRef.current.length > 0) {
        for (const newT of newTickets) {
          const oldT = prevTicketsRef.current.find((t) => t.id === newT.id);
          if (oldT) {
            if (oldT.status !== 'resolved' && (newT.status === 'resolved' || newT.status === 'closed')) {
              setUserToast('Your ticket was solved');
              localStorage.setItem('bharatmandi_unread_ticket_update', 'true');
              window.dispatchEvent(new Event('ticket_update'));
              setTimeout(() => setUserToast(null), 5000);
            } else if ((oldT.status === 'resolved' || oldT.status === 'closed') && (newT.status === 'open' || newT.status === 'in_progress')) {
              setUserToast('Your ticket was reopened');
              localStorage.setItem('bharatmandi_unread_ticket_update', 'true');
              window.dispatchEvent(new Event('ticket_update'));
              setTimeout(() => setUserToast(null), 5000);
            }
          }
        }
      }

      prevTicketsRef.current = newTickets;
      setTickets(newTickets);
    }
  }, [activePhone]);

  useEffect(() => {
    loadUserTickets();
    const unsubscribe = subscribeToSupabaseTickets(() => {
      loadUserTickets();
    });
    return () => {
      unsubscribe();
    };
  }, [loadUserTickets]);

  // Form Submission
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!subject.trim()) {
      setSubmitError('Please enter a ticket subject.');
      return;
    }
    if (!message.trim()) {
      setSubmitError('Please enter your support message / details.');
      return;
    }

    setIsSubmitting(true);

    const res = await createTicketInSupabase({
      shop_name: activeShopName,
      user_name: activeUserName,
      user_phone: activePhone,
      category,
      priority,
      subject: subject.trim(),
      message: message.trim(),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setSubmitError(res.error || 'Failed to submit ticket. Please try again.');
      return;
    }

    setSubmitSuccess('Support ticket submitted successfully! Mandi Help Desk will review it.');
    setSubject('');
    setMessage('');
    setPriority('normal');
    loadUserTickets();

    setTimeout(() => {
      setSubmitSuccess('');
      setActiveTab('my-tickets');
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans animate-in fade-in duration-200">
      {/* Realtime Status Update Toast */}
      {userToast && (
        <div className="p-3.5 bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{userToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setUserToast(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-2xs flex items-center justify-center max-w-md mx-auto">
        <div className="grid grid-cols-2 w-full gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('my-tickets')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'my-tickets'
                ? 'bg-[#1a3a52] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#d4af37]" />
            <span>My Support Tickets ({tickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('raise-ticket')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'raise-ticket'
                ? 'bg-[#1a3a52] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-[#d4af37]" />
            <span>Raise a Ticket</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MY SUPPORT TICKETS */}
      {activeTab === 'my-tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-black text-[#1e293b]">My Support Enquiries</h2>
              <p className="text-xs text-slate-500">
                Track status updates and admin responses in real-time
              </p>
            </div>

            <button
              type="button"
              onClick={loadUserTickets}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1a3a52] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#1a3a52]" />
              <p>Loading your tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-4">
              <Headphones className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-[#1e293b]">No Support Tickets Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Have a question about settlements, billing, or app features? Raise a ticket and our Mandi Help Desk will respond.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('raise-ticket')}
                className="px-5 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-black transition inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#d4af37]" />
                <span>Raise a Ticket Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3 hover:border-[#1a3a52]/40 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-[#eef3f7] text-[#1a3a52] font-mono text-[11px] font-bold">
                          {t.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            t.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : t.priority === 'normal'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.priority} Priority
                        </span>
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-[#1e293b]">
                        {t.subject}
                      </h3>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        t.status === 'resolved' || t.status === 'closed'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {t.status === 'resolved' || t.status === 'closed' ? 'Solved' : 'Unsolved'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-slate-100 whitespace-pre-wrap font-medium">
                    {t.message}
                  </p>

                  {/* Admin Note Box if available */}
                  {t.admin_note && (
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 space-y-1 text-xs">
                      <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Mandi Admin Response:</span>
                      </span>
                      <p className="text-amber-950 font-semibold leading-relaxed pl-5">
                        {t.admin_note}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                    <span>Shop: {t.shop_name}</span>
                    <span>
                      Submitted:{' '}
                      {new Date(t.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RAISE A TICKET FORM */}
      {activeTab === 'raise-ticket' && (
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-black text-[#1e293b]">Raise a Support Ticket</h2>
            <p className="text-xs text-slate-500">
              Submit your inquiry or issue directly to the Mandi Super Admin
            </p>
          </div>

          {submitSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            {/* Auto-filled User Info preview */}
            <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Shop / Firm:</span>
                <span className="font-extrabold text-[#1e293b]">{activeShopName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Trader Name:</span>
                <span className="font-bold text-[#1e293b]">{activeUserName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Phone Number:</span>
                <span className="font-mono font-bold text-[#1a3a52]">+91 {activePhone}</span>
              </div>
            </div>

            {/* Category and Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-[#1e293b] focus:outline-none focus:border-[#1a3a52] cursor-pointer"
                >
                  <option value="Billing & Settlement">Billing &amp; 15-Day Settlement</option>
                  <option value="Parchi & Auction">Form C Parchi &amp; Sales Ledger</option>
                  <option value="Thermal Printer">Thermal Bluetooth Printer</option>
                  <option value="Account & Profile">Account &amp; Phone Sync</option>
                  <option value="Technical Issue">Technical / App Glitch</option>
                  <option value="Feature Request">Feature Suggestion</option>
                  <option value="Other">Other Enquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                  Priority Level *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-[#1e293b] focus:outline-none focus:border-[#1a3a52] cursor-pointer"
                >
                  <option value="low">Low Priority (General Query)</option>
                  <option value="normal">Normal Priority (Standard)</option>
                  <option value="high">High Priority (Urgent)</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                Subject / Brief Summary *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Need assistance with settlement commission calculation"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-[#1e293b] focus:outline-none focus:border-[#1a3a52]"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                Detailed Message *
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain what happened, date, parchi number or question in detail..."
                className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-medium text-[#1e293b] focus:outline-none focus:border-[#1a3a52]"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('my-tickets')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#d4af37]" />
                <span>Submit Ticket</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
