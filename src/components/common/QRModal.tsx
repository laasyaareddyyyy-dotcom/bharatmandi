import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';

/* =========================================================================
   QR MODAL: UNIVERSAL STANDARDIZED MODAL
   - Fixed Header with high-contrast 44px close button
   - Internal scrollable content
   - Backdrop click & Escape key dismiss
   - Tabbed QR display and incoming connection requests
   ========================================================================= */

export const QRModal: React.FC = () => {
  const {
    isQRModalOpen,
    setIsQRModalOpen,
    merchantProfile,
    connectionRequests,
    acceptConnectionRequest,
    declineConnectionRequest,
    t,
  } = useMandi();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'requests'>('qr');

  useEffect(() => {
    if (!isQRModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsQRModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQRModalOpen, setIsQRModalOpen]);

  if (!isQRModalOpen) return null;

  const copyMerchantId = () => {
    navigator.clipboard.writeText(merchantProfile.merchantId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingRequests = connectionRequests.filter((r) => r.status === 'pending');

  return (
    <div
      id="qr-modal-overlay"
      onClick={() => setIsQRModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div
        id="qr-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              aria-label="Go Back"
              className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-[#d4af37] shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white leading-tight">
                Merchant QR &amp; Farmer Connections
              </h2>
              <p className="text-[11px] text-slate-200/80 leading-none mt-0.5">
                Connect growers directly to your digital mandi khata
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-qr-modal-btn"
            onClick={() => setIsQRModalOpen(false)}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex-shrink-0 flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            id="qr-view-tab-btn"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition cursor-pointer min-touch-target ${
              activeTab === 'qr'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-[#1e293b]'
            }`}
          >
            Merchant ID & QR Code
          </button>
          <button
            type="button"
            id="qr-requests-tab-btn"
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition flex items-center justify-center gap-1.5 cursor-pointer min-touch-target ${
              activeTab === 'requests'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-[#1e293b]'
            }`}
          >
            <span>Connection Requests</span>
            {pendingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 min-h-0 bg-white">
          {activeTab === 'qr' ? (
            <div className="flex flex-col items-center text-center">
              {/* Profile Card */}
              <div className="w-full bg-[#f8fafc] p-3.5 rounded-xl border border-slate-200 mb-4">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#1a3a52] font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Commission Merchant</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#1e293b]">{merchantProfile.shopName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {merchantProfile.shopNumber} • {merchantProfile.marketYardName}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl border-2 border-[#1a3a52]/20 shadow-sm relative group">
                <svg
                  className="w-44 h-44 sm:w-52 sm:h-52"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer Frame */}
                  <rect width="100" height="100" fill="white" />
                  {/* Top Left Finder */}
                  <rect x="5" y="5" width="26" height="26" rx="2" fill="#1a3a52" />
                  <rect x="9" y="9" width="18" height="18" rx="1" fill="white" />
                  <rect x="13" y="13" width="10" height="10" fill="#1a3a52" />
                  {/* Top Right Finder */}
                  <rect x="69" y="5" width="26" height="26" rx="2" fill="#1a3a52" />
                  <rect x="73" y="9" width="18" height="18" rx="1" fill="white" />
                  <rect x="77" y="13" width="10" height="10" fill="#1a3a52" />
                  {/* Bottom Left Finder */}
                  <rect x="5" y="69" width="26" height="26" rx="2" fill="#1a3a52" />
                  <rect x="9" y="73" width="18" height="18" rx="1" fill="white" />
                  <rect x="13" y="77" width="10" height="10" fill="#1a3a52" />
                  {/* Custom QR Matrix Bits */}
                  <rect x="36" y="8" width="5" height="5" fill="#1a3a52" />
                  <rect x="44" y="8" width="8" height="5" fill="#1e293b" />
                  <rect x="55" y="8" width="5" height="5" fill="#1a3a52" />
                  <rect x="36" y="16" width="9" height="5" fill="#1e293b" />
                  <rect x="48" y="16" width="6" height="5" fill="#d4af37" />
                  <rect x="57" y="16" width="6" height="5" fill="#1a3a52" />
                  <rect x="8" y="36" width="6" height="6" fill="#1e293b" />
                  <rect x="18" y="36" width="6" height="6" fill="#1a3a52" />
                  <rect x="27" y="36" width="5" height="5" fill="#1e293b" />
                  <rect x="36" y="27" width="6" height="6" fill="#1a3a52" />
                  <rect x="45" y="27" width="10" height="5" fill="#1e293b" />
                  <rect x="60" y="27" width="5" height="5" fill="#d4af37" />
                  <rect x="70" y="36" width="7" height="6" fill="#1e293b" />
                  <rect x="82" y="36" width="8" height="6" fill="#1a3a52" />
                  {/* Center Flower Badge */}
                  <rect x="40" y="40" width="20" height="20" rx="4" fill="#1a3a52" />
                  <circle cx="50" cy="50" r="6" fill="#d4af37" />
                  <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
                  {/* Bottom Pattern */}
                  <rect x="36" y="65" width="8" height="6" fill="#1e293b" />
                  <rect x="48" y="65" width="6" height="6" fill="#1a3a52" />
                  <rect x="58" y="65" width="8" height="6" fill="#1e293b" />
                  <rect x="70" y="65" width="6" height="8" fill="#1a3a52" />
                  <rect x="80" y="65" width="12" height="6" fill="#1e293b" />
                  <rect x="36" y="75" width="12" height="6" fill="#1a3a52" />
                  <rect x="52" y="75" width="8" height="6" fill="#d4af37" />
                  <rect x="64" y="75" width="6" height="6" fill="#1e293b" />
                  <rect x="74" y="75" width="8" height="6" fill="#1a3a52" />
                  <rect x="86" y="75" width="6" height="12" fill="#1e293b" />
                  <rect x="36" y="85" width="6" height="8" fill="#1e293b" />
                  <rect x="46" y="85" width="10" height="8" fill="#1a3a52" />
                  <rect x="60" y="85" width="8" height="8" fill="#d4af37" />
                  <rect x="72" y="85" width="10" height="8" fill="#1a3a52" />
                </svg>
              </div>

              {/* Merchant ID Pill & Copy */}
              <div className="mt-4 flex items-center gap-2 bg-[#f8fafc] border-2 border-dashed border-[#1a3a52]/40 px-3 py-2 rounded-xl">
                <span className="text-xs text-slate-500">Merchant ID:</span>
                <span className="text-sm font-black font-mono text-[#1a3a52] tracking-wider">
                  {merchantProfile.merchantId}
                </span>
                <button
                  type="button"
                  id="copy-merchant-id-btn"
                  onClick={copyMerchantId}
                  className="p-1 rounded-md hover:bg-black/5 text-[#1a3a52] transition cursor-pointer"
                  title="Copy Merchant ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-3 max-w-xs">
                Farmers can scan this QR code or enter your 11-digit Merchant ID in their Farmer Portal to connect and sync daily sales.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-200">
                <span>Pending Grower Requests</span>
                <span>{pendingRequests.length} pending</span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <UserCheck className="w-10 h-10 mx-auto text-[#1a3a52]/40 mb-2" />
                  <p className="text-sm font-semibold text-[#1e293b]">All Connection Requests Handled</p>
                  <p className="text-xs mt-1">
                    When farmers search your Merchant ID ({merchantProfile.merchantId}) and request connection, they appear here.
                  </p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-[#f8fafc] flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-[#1e293b]">{req.farmerName}</h4>
                      <p className="text-xs text-slate-500">
                        📍 {req.farmerVillage} • Ph: {req.farmerPhone}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>Requested: {req.requestDate}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        id={`accept-req-${req.id}`}
                        onClick={() => acceptConnectionRequest(req.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1a3a52] text-white text-xs font-semibold hover:bg-[#122839] transition flex items-center gap-1 shadow-2xs cursor-pointer min-touch-target"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        id={`decline-req-${req.id}`}
                        onClick={() => declineConnectionRequest(req.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition border border-red-200 cursor-pointer min-touch-target"
                        title="Decline"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            id="qr-modal-close-btn"
            onClick={() => setIsQRModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#122839] transition cursor-pointer min-touch-target"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
