import React, { useState, useRef } from 'react';
import { useMandi } from '../../context/MandiContext';
import { HelpTicket, HelpTicketStatus, TicketAttachment } from '../../types';
import {
  ArrowLeft,
  Clock,
  User,
  Phone,
  Tag,
  Flag,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  Share2,
  Check,
  Building2,
  Headphones,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { sounds } from '../../utils/audio';

interface TicketDetailViewProps {
  ticket: HelpTicket;
  onBack: () => void;
  isAdminView?: boolean;
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticket,
  onBack,
  isAdminView = false,
}) => {
  const {
    currentUserAccount,
    portalMode,
    merchantProfile,
    addTicketResponse,
    updateHelpTicketStatus,
    assignHelpTicket,
    t,
  } = useMandi();

  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFarmer = portalMode === 'farmer';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const fileUrl = uploadEvent.target?.result as string;
        const newAttachment: TicketAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          url: fileUrl,
          fileName: file.name,
          fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          fileType: isImg ? 'image' : 'pdf',
          fileUrl: fileUrl,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && attachments.length === 0) return;

    const senderRole = isAdminView ? 'support' : 'user';
    addTicketResponse(
      ticket.id,
      replyText.trim(),
      senderRole,
      isInternalNote,
      attachments.length > 0 ? attachments : undefined
    );

    sounds.playScaleBeep?.();
    setReplyText('');
    setAttachments([]);
    setIsInternalNote(false);
  };

  const handleQuickStatusChange = (newStatus: HelpTicketStatus) => {
    updateHelpTicketStatus(ticket.id, newStatus);
    sounds.playScaleBeep?.();
  };

  const handleShareTicket = () => {
    const text = `PhoolMitra Support Ticket #${ticket.ticketNumber}\nSubject: ${ticket.subject}\nStatus: ${ticket.status}\nPriority: ${ticket.priority}\nSubmitted by: ${ticket.userName} (${ticket.userPhone})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: HelpTicketStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Open</span>
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
            <Headphones className="w-3.5 h-3.5 text-blue-700" />
            <span>In Progress</span>
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Resolved</span>
          </span>
        );
      case 'Closed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-slate-600" />
            <span>Closed</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-300">CRITICAL</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">HIGH</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">LOW</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e2e8f0]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] text-xs font-bold text-[#1e293b] transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#1a3a52]" />
          <span>Back to Ticket List</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareTicket}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] text-xs font-medium text-[#64748b] transition cursor-pointer"
            title="Copy Ticket Details"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>

          {getStatusBadge(ticket.status)}
        </div>
      </div>

      {/* Ticket Meta Summary Card */}
      <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#eef3f7] text-[#1a3a52] border border-[#1a3a52]/20">
                {ticket.ticketNumber}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#1e293b]">
                {ticket.category}
              </span>
              {getPriorityBadge(ticket.priority)}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#1e293b] leading-snug">
              {ticket.subject}
            </h2>
          </div>

          <div className="text-right text-xs text-[#64748b]">
            <div className="flex items-center gap-1 justify-end font-mono">
              <Clock className="w-3.5 h-3.5 text-[#1a3a52]" />
              <span>{new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <span className="text-[11px] block text-emerald-700 font-medium">SLA: 2-Hour Mandi Support</span>
          </div>
        </div>

        {/* User & Assignee Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#e2e8f0]/60 text-xs">
          <div className="flex items-center gap-2 text-[#64748b]">
            <User className="w-3.5 h-3.5 text-[#1a3a52] shrink-0" />
            <div>
              <span className="text-[10px] text-[#64748b] block">Raised By</span>
              <span className="font-bold text-[#1e293b]">{ticket.userName} ({ticket.userRole === 'farmer' ? 'Kisan' : 'Merchant'})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#64748b]">
            <Phone className="w-3.5 h-3.5 text-[#1a3a52] shrink-0" />
            <div>
              <span className="text-[10px] text-[#64748b] block">Contact Number</span>
              <span className="font-mono font-bold text-[#1e293b]">{ticket.userPhone}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#64748b]">
            <Headphones className="w-3.5 h-3.5 text-[#1a3a52] shrink-0" />
            <div>
              <span className="text-[10px] text-[#64748b] block">Assigned Staff</span>
              <span className="font-bold text-[#1a3a52]">{ticket.assignedTo || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {/* Original Description */}
        <div className="p-3.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]/70 text-xs text-[#1e293b] leading-relaxed whitespace-pre-wrap">
          {ticket.description}
        </div>

        {/* Original Attachments */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-[#64748b] block">Attached Files / Screenshots:</span>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((att) => (
                <div
                  key={att.id}
                  onClick={() => att.fileType === 'image' && att.fileUrl && setPreviewImage(att.fileUrl)}
                  className={`flex items-center gap-2 p-2 rounded-lg bg-white border border-[#e2e8f0] text-xs transition ${
                    att.fileType === 'image' ? 'hover:border-[#1a3a52] cursor-pointer' : ''
                  }`}
                >
                  {att.fileType === 'image' ? (
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span className="font-medium text-[#1e293b] truncate max-w-[140px]">{att.fileName}</span>
                  <span className="text-[10px] text-[#64748b]">({att.fileSize})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Internal Staff Notes (Visible in Admin view or if any exist) */}
      {ticket.internalNotes && ticket.internalNotes.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span>Support Internal Audit Notes (Staff Only)</span>
          </div>
          <div className="space-y-1.5">
            {ticket.internalNotes.map((note) => (
              <div key={note.id} className="p-2 rounded bg-white/80 border border-amber-200 text-amber-950">
                <div className="flex justify-between text-[10px] text-amber-700 mb-0.5">
                  <span className="font-bold">{note.staffName}</span>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                <p className="leading-snug">{note.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Thread */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#1a3a52]" />
            <span>Responses & Updates ({ticket.responses?.length || 0})</span>
          </h3>
          <span className="text-[11px] text-[#64748b]">Real-time thread</span>
        </div>

        {(!ticket.responses || ticket.responses.length === 0) ? (
          <div className="p-6 text-center rounded-xl bg-white border border-dashed border-[#e2e8f0] text-xs text-[#64748b] space-y-1">
            <Clock className="w-6 h-6 text-[#1a3a52]/50 mx-auto" />
            <p className="font-medium text-[#1e293b]">Awaiting Support Officer review</p>
            <p className="text-[11px]">You can post follow-up comments or additional details below.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ticket.responses.map((resp) => {
              const isUser = resp.senderRole === 'user';
              return (
                <div
                  key={resp.id}
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                    isUser
                      ? 'bg-white border-[#e2e8f0] ml-0 mr-4 sm:mr-8'
                      : 'bg-[#eef3f7] border-[#1a3a52]/30 mr-0 ml-4 sm:ml-8'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${isUser ? 'text-[#1e293b]' : 'text-[#1a3a52]'}`}>
                        {resp.senderName}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        isUser ? 'bg-gray-100 text-gray-700' : 'bg-[#1a3a52] text-white'
                      }`}>
                        {isUser ? 'User' : 'Mandi Support'}
                      </span>
                    </div>
                    <span className="text-[#64748b] font-mono text-[10px]">
                      {new Date(resp.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-[#1e293b] whitespace-pre-wrap">{resp.message}</p>

                  {resp.attachments && resp.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {resp.attachments.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#e2e8f0] text-[10px] font-medium text-[#1e293b]">
                          <FileText className="w-3 h-3 text-emerald-600" />
                          {a.fileName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Composer */}
      <form onSubmit={handleSendReply} className="p-3.5 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#1e293b]">
            {isAdminView ? 'Post Official Support Response' : 'Add Follow-up Message / Response'}
          </label>

          {isAdminView && (
            <label className="flex items-center gap-1.5 text-xs text-amber-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="font-semibold text-[11px]">Save as Internal Staff Note</span>
            </label>
          )}
        </div>

        <textarea
          rows={3}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={
            isInternalNote
              ? 'Enter private note visible only to support staff...'
              : isAdminView
              ? 'Type your response to the merchant / farmer...'
              : 'Add any extra details, updates, or reply to support...'
          }
          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium bg-[#f8fafc] focus:bg-white focus:outline-none focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52]"
        />

        {/* Attachment preview for reply */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((att) => (
              <span key={att.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-[11px] font-medium text-slate-800">
                <ImageIcon className="w-3 h-3 text-emerald-600" />
                {att.fileName}
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] hover:bg-[#f1f5f9] text-xs font-medium text-[#64748b] transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#1a3a52]" />
              <span>Attach File</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Quick Status actions */}
            {ticket.status !== 'Resolved' && (
              <button
                type="button"
                onClick={() => handleQuickStatusChange('Resolved')}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark Resolved</span>
              </button>
            )}

            {ticket.status === 'Resolved' && (
              <button
                type="button"
                onClick={() => handleQuickStatusChange('In Progress')}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Reopen</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!replyText.trim() && attachments.length === 0}
              className="px-4 py-1.5 rounded-lg bg-[#1a3a52] hover:bg-[#122839] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      </form>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-2xl max-h-[85vh] bg-white rounded-2xl p-2 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImage} alt="Attachment Preview" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
