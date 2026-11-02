import React, { useState, useRef } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  HelpTicketCategory,
  HelpTicketPriority,
  TicketAttachment,
} from '../../types';
import {
  Send,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Phone,
  User,
  Tag,
  Flag,
  Share2,
  Clock,
  Check,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { sounds } from '../../utils/audio';

const QUICK_SUGGESTIONS = [
  {
    category: 'Technical Issue' as HelpTicketCategory,
    priority: 'Medium' as HelpTicketPriority,
    title: 'Thermal printer prints truncated parchi margins',
    desc: 'When generating 58mm/80mm thermal receipts on my POS bluetooth printer, the right margin cuts off the farmer net payable amount.',
  },
  {
    category: 'Payment/Settlement Issue' as HelpTicketCategory,
    priority: 'High' as HelpTicketPriority,
    title: '15-Day settlement ledger balance calculation discrepancy',
    desc: 'Need assistance verifying hamali deductions and advance cut adjustments in the 15-day batch settlement statement.',
  },
  {
    category: 'Account Problem' as HelpTicketCategory,
    priority: 'Low' as HelpTicketPriority,
    title: 'Farmer phone number sync and WhatsApp connection',
    desc: 'Kisan bhai is not receiving automated WhatsApp parchi slips on his mobile number despite active connection.',
  },
  {
    category: 'Report/Invoice Issue' as HelpTicketCategory,
    priority: 'Medium' as HelpTicketPriority,
    title: 'Form C monthly Mandi turnover report format question',
    desc: 'Requesting clarification on whether daily transport cess is bundled into the gross taxable turnover column.',
  },
];

export const RaiseQueryForm: React.FC<{
  onSuccessNavigate?: (ticketId: string) => void;
}> = ({ onSuccessNavigate }) => {
  const {
    currentUserAccount,
    currentUserPhone,
    portalMode,
    merchantProfile,
    createHelpTicket,
    setHelpDeskTab,
    setSelectedHelpTicketId,
    language,
    t,
  } = useMandi();

  const isFarmer = portalMode === 'farmer';
  const defaultUserName =
    currentUserAccount?.fullName ||
    (isFarmer ? 'Kisan Bhai' : merchantProfile.ownerName || merchantProfile.shopName || 'Mandi Merchant');
  const defaultUserPhone =
    currentUserAccount?.phoneNumber ||
    (currentUserPhone ? `+91 ${currentUserPhone}` : merchantProfile.phoneNumber || '9876543210');

  const [userName, setUserName] = useState(defaultUserName);
  const [userPhone, setUserPhone] = useState(defaultUserPhone);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<HelpTicketCategory>('Technical Issue');
  const [priority, setPriority] = useState<HelpTicketPriority>('Medium');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    id: string;
    ticketNumber: string;
    createdAt: string;
    subject: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const removeAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleApplySuggestion = (s: typeof QUICK_SUGGESTIONS[0]) => {
    setCategory(s.category);
    setPriority(s.priority);
    setSubject(s.title);
    setDescription(s.desc);
    sounds.playScaleBeep?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const newTicket = createHelpTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        userName: userName.trim() || defaultUserName,
        userPhone: userPhone.trim() || defaultUserPhone,
        userRole: isFarmer ? 'farmer' : 'merchant',
        shopName: !isFarmer ? merchantProfile.shopName : undefined,
        village: isFarmer ? currentUserAccount?.shopOrVillage : undefined,
        attachments,
      });

      sounds.playCashChime?.();
      setIsSubmitting(false);
      setSubmittedTicket({
        id: newTicket.id,
        ticketNumber: newTicket.ticketNumber,
        createdAt: newTicket.createdAt,
        subject: newTicket.subject,
      });
    }, 450);
  };

  const handleCopyTicketDetails = () => {
    if (!submittedTicket) return;
    const text = `PhoolMitra Mandi Support Ticket:\nTicket ID: ${submittedTicket.ticketNumber}\nSubject: ${submittedTicket.subject}\nSubmitted: ${new Date(submittedTicket.createdAt).toLocaleString()}\nStatus: Open (Under 2-Hour Support SLA)`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setSubject('');
    setDescription('');
    setAttachments([]);
    setCategory('Technical Issue');
    setPriority('Medium');
  };

  if (submittedTicket) {
    return (
      <div className="py-6 px-4 sm:px-8 text-center max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            {t('ticketCreatedSuccess')}
          </span>
          <h2 className="text-2xl font-black text-[#1e293b]">
            Ticket #{submittedTicket.ticketNumber}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748b] max-w-md mx-auto">
            {t('weWillGetBack')}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-left space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-[#e2e8f0]/60">
            <span className="text-[#64748b] font-medium">Submitted By:</span>
            <span className="font-bold text-[#1e293b]">{userName} ({isFarmer ? 'Kisan Bhai' : 'Adathiya'})</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#e2e8f0]/60">
            <span className="text-[#64748b] font-medium">Registered Phone:</span>
            <span className="font-mono font-bold text-[#1e293b]">{userPhone}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#e2e8f0]/60">
            <span className="text-[#64748b] font-medium">Category / Priority:</span>
            <span className="font-semibold text-[#1a3a52]">{category} • {priority} Priority</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#e2e8f0]/60">
            <span className="text-[#64748b] font-medium">Timestamp:</span>
            <span className="font-mono text-[#64748b]">{new Date(submittedTicket.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748b] font-medium">SMS & WhatsApp Alerts:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Active (+91 Confirmation Sent)
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            id="view-ticket-btn"
            type="button"
            onClick={() => {
              setSelectedHelpTicketId(submittedTicket.id);
              setHelpDeskTab('my-tickets');
              if (onSuccessNavigate) {
                onSuccessNavigate(submittedTicket.id);
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <span>Track This Ticket</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="copy-ticket-share-btn"
            type="button"
            onClick={handleCopyTicketDetails}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#e2e8f0] hover:bg-[#f1f5f9] text-[#1e293b] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-[#64748b]" />}
            <span>{copiedLink ? 'Copied Details!' : 'Share / Copy Info'}</span>
          </button>

          <button
            id="raise-another-btn"
            type="button"
            onClick={handleResetForm}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#e2e8f0] hover:bg-[#f1f5f9] text-[#64748b] font-medium text-xs transition cursor-pointer"
          >
            Raise Another Query
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Quick Template Chips */}
      <div className="bg-[#F8F6F2] rounded-xl p-3 border border-[#e2e8f0]/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#1e293b] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Common Mandi Query Shortcuts (Click to autofill)</span>
          </span>
          <span className="text-[11px] text-[#64748b]">One-click templates</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySuggestion(item)}
              className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-[#e2e8f0] hover:border-[#1a3a52] hover:text-[#1a3a52] text-[#1e293b] transition flex items-center gap-1 shadow-2xs group cursor-pointer"
            >
              <Tag className="w-3 h-3 text-[#1a3a52]/70 group-hover:text-[#1a3a52]" />
              <span className="font-medium truncate max-w-[220px] sm:max-w-none">{item.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* User Information (Auto-filled) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-[#1e293b] mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#1a3a52]" />
            <span>User Name</span>
            <span className="text-[10px] font-normal text-[#64748b]">(Auto-filled from login)</span>
          </label>
          <div className="relative">
            <input
              id="ticket-user-name"
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium bg-white focus:outline-none focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52]"
              placeholder="Full Name"
            />
            <span className="absolute right-2.5 top-2.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#eef3f7] text-[#1a3a52]">
              {isFarmer ? 'Kisan' : 'Merchant'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1e293b] mb-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#1a3a52]" />
            <span>User Phone Number / ID</span>
            <span className="text-[10px] font-normal text-[#64748b]">(For SMS/Call Updates)</span>
          </label>
          <input
            id="ticket-user-phone"
            type="text"
            required
            value={userPhone}
            onChange={(e) => setUserPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-mono font-medium bg-white focus:outline-none focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52]"
            placeholder="+91 Mobile Number"
          />
        </div>
      </div>

      {/* Category and Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-[#1e293b] mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#1a3a52]" />
            <span>Category <span className="text-red-500">*</span></span>
          </label>
          <select
            id="ticket-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as HelpTicketCategory)}
            className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium bg-white focus:outline-none focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52] cursor-pointer"
          >
            <option value="Technical Issue">Technical Issue (App bugs, crashes, printer)</option>
            <option value="Account Problem">Account Problem (Login, profile, PIN)</option>
            <option value="Payment/Settlement Issue">Payment/Settlement Issue (Khata, dues, RTGS)</option>
            <option value="Report/Invoice Issue">Report/Invoice Issue (Form C, PDF, summaries)</option>
            <option value="Feature Request">Feature Request (New tools, translations)</option>
            <option value="Other">Other Query / Market Yard Assistance</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1e293b] mb-1 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-[#1a3a52]" />
            <span>Priority Level <span className="text-red-500">*</span></span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['Low', 'Medium', 'High', 'Critical'] as HelpTicketPriority[]).map((p) => {
              const active = priority === p;
              const colorMap: Record<HelpTicketPriority, string> = {
                Low: 'border-slate-300 text-slate-700 active:bg-slate-100',
                Medium: 'border-blue-300 text-blue-700 active:bg-blue-100',
                High: 'border-amber-400 text-amber-800 active:bg-amber-100',
                Critical: 'border-red-400 text-red-800 active:bg-red-100',
              };
              const activeBgMap: Record<HelpTicketPriority, string> = {
                Low: 'bg-slate-100 border-slate-600 text-slate-900 font-bold',
                Medium: 'bg-blue-50 border-blue-600 text-blue-900 font-bold',
                High: 'bg-amber-100 border-amber-600 text-amber-950 font-bold',
                Critical: 'bg-red-100 border-red-600 text-red-950 font-bold',
              };

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-1.5 text-center text-xs rounded-lg border transition cursor-pointer ${
                    active ? activeBgMap[p] : colorMap[p] + ' bg-white hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-bold text-[#1e293b] mb-1">
          Subject / Query Title <span className="text-red-500">*</span>
        </label>
        <input
          id="ticket-subject-input"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of the issue or question..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-medium bg-white focus:outline-none focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52]"
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-[#1e293b]">
            Description / Details <span className="text-red-500">*</span>
          </label>
          <span className="text-[11px] text-[#64748b]">{description.length} characters</span>
        </div>
        <textarea
          id="ticket-description-input"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please describe what happened, steps to reproduce, or any relevant lot numbers / farmer details..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-medium bg-white focus:outline-none focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52] resize-y"
        />
      </div>

      {/* Attachments Section */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-[#1e293b] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-[#1a3a52]" />
            <span>Attachment Option (Optional)</span>
          </span>
          <span className="text-[11px] font-normal text-[#64748b]">Screenshots, Parchi photo, Bills</span>
        </label>

        {/* Drop zone / Upload button */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#e2e8f0] hover:border-[#1a3a52] rounded-xl p-3.5 text-center bg-[#f8fafc] hover:bg-[#f1f5f9] transition cursor-pointer group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2 text-xs text-[#64748b] group-hover:text-[#1a3a52]">
            <ImageIcon className="w-4 h-4 text-[#1a3a52]" />
            <span className="font-semibold">Click or drag & drop files here</span>
            <span className="text-[10px] text-[#64748b]">(PNG, JPG, PDF up to 10MB)</span>
          </div>
        </div>

        {/* Attached files preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-xs shadow-2xs"
              >
                {att.fileType === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                )}
                <span className="font-medium text-[#1e293b] truncate max-w-[130px]">{att.fileName}</span>
                <span className="text-[10px] text-[#64748b]">({att.fileSize})</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications toggle */}
      <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="text-left">
            <span className="text-xs font-bold text-[#1e293b] block">Receive SMS & WhatsApp Status Updates</span>
            <span className="text-[11px] text-[#64748b]">Direct notification when support responds to this ticket</span>
          </div>
        </div>
        <input
          type="checkbox"
          checked={notifyWhatsApp}
          onChange={(e) => setNotifyWhatsApp(e.target.checked)}
          className="w-4 h-4 text-[#1a3a52] rounded border-gray-300 focus:ring-[#1a3a52] cursor-pointer"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-2 flex items-center justify-end gap-3">
        <button
          id="submit-ticket-btn"
          type="submit"
          disabled={isSubmitting || !subject.trim() || !description.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating Ticket...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Submit Support Ticket</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
