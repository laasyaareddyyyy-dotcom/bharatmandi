import React, { useState, useMemo } from 'react';
import {
  Headphones,
  UserPlus,
  QrCode,
  Calendar,
  Settings,
  PhoneCall,
  LogOut,
  Store,
  Users,
  Clock,
  X,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { useFirebase } from '../../context/FirebaseContext';
import { FarmersView } from './FarmersView';
import { ShopSettingsView } from './ShopSettingsView';
import { SalesReportPdfModal } from './SalesReportPdfModal';
import { UserTicketScreen } from '../support/UserTicketScreen';

export const SupportView: React.FC = () => {
  const {
    merchantProfile,
    language,
    openHelpDesk,
    setIsFarmerSignUpOpen,
    setIsQRModalOpen,
    setIsSettingsOpen,
    setIsDateSwitcherOpen,
    logoutCurrentUser,
    activeSessionDate,
    farmers,
    connectionRequests,
    currentUserPhone,
  } = useMandi();

  const { user: firebaseUser } = useFirebase();
  const [activeTab, setActiveTab] = useState<'help' | 'settings'>('help');
  const [farmersModalTab, setFarmersModalTab] = useState<'connected' | 'incoming' | null>(null);
  const [isSalesReportModalOpen, setIsSalesReportModalOpen] = useState<boolean>(false);

  const cleanMerchantPhone = merchantProfile?.phoneNumber
    ? merchantProfile.phoneNumber.replace(/\D/g, '').slice(-10)
    : currentUserPhone;

  const incomingRequestsCount = useMemo(() => {
    return connectionRequests.filter(
      (r) =>
        r.senderRole === 'farmer' &&
        r.status === 'pending' &&
        (r.merchantId === merchantProfile?.merchantId ||
          (r.merchantPhone && r.merchantPhone.replace(/\D/g, '').slice(-10) === cleanMerchantPhone))
    ).length;
  }, [connectionRequests, merchantProfile?.merchantId, cleanMerchantPhone]);

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-200 space-y-6">
      {/* Top Tab Bar: Help Desk vs Shop Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-2xs flex items-center justify-center max-w-lg mx-auto">
        <div className="grid grid-cols-2 w-full gap-1">
          <button
            type="button"
            id="support-tab-help"
            onClick={() => setActiveTab('help')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'help'
                ? 'bg-[#1a3a52] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Headphones className="w-4 h-4 text-[#d4af37]" />
            <span>Help Desk &amp; Support</span>
          </button>

          <button
            type="button"
            id="support-tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-[#1a3a52] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4 text-[#d4af37]" />
            <span>Shop Settings &amp; Info</span>
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <ShopSettingsView />
      ) : (
        <div className="space-y-6">
          {/* Page Header */}
          <div className="page-header flex flex-col items-center justify-center text-center gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a3a52] tracking-tight">Support &amp; Services</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Mandi Help desk, mandi tools, and account services</p>
            </div>
            {merchantProfile && (
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-[#1a3a52] font-semibold shadow-2xs">
                  <Store className="w-3.5 h-3.5 text-[#1a3a52]" />
                  <span>{merchantProfile.shopName || 'భారత్ MANDI Wholesale'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-slate-500 font-normal">
                    {firebaseUser ? 'Cloud Connected' : 'Offline Storage'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Support Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {/* Register New Farmer */}
            <button
              type="button"
              id="support-add-farmer-btn"
              onClick={() => setIsFarmerSignUpOpen(true)}
              className="support-card group text-center flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-[#eef3f7] text-[#1a3a52] group-hover:bg-[#1a3a52] group-hover:text-white transition-colors flex items-center justify-center mb-1 mx-auto">
                <UserPlus className="w-6 h-6 text-[#1a3a52] group-hover:text-white transition-colors" />
              </div>
              <div className="support-title">Register New Farmer</div>
              <div className="support-desc">Add grower profile &amp; passbook</div>
            </button>

            {/* Connected Farmers */}
            <button
              type="button"
              id="support-connected-farmers-btn"
              onClick={() => setFarmersModalTab('connected')}
              className="support-card group text-center flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-[#eef3f7] text-[#1a3a52] group-hover:bg-[#1a3a52] group-hover:text-white transition-colors flex items-center justify-center mb-1 mx-auto">
                <Users className="w-6 h-6 text-[#1a3a52] group-hover:text-white transition-colors" />
              </div>
              <div className="support-title">Connected Farmers</div>
              <div className="support-desc">{farmers.length} connected grower profiles &amp; passbooks</div>
            </button>

            <button
              type="button"
              id="support-open-helpdesk-btn"
              onClick={() => openHelpDesk()}
              className="support-card group text-center flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-[#eef3f7] text-[#1a3a52] group-hover:bg-[#1a3a52] group-hover:text-white transition-colors flex items-center justify-center mb-1 mx-auto">
                <Headphones className="w-6 h-6 text-[#1a3a52] group-hover:text-white transition-colors" />
              </div>
              <div className="support-title">Help Desk</div>
              <div className="support-desc">Instant mandi assistant &amp; tickets</div>
            </button>

            <button
              type="button"
              id="support-dateswitcher-btn"
              onClick={() => setIsDateSwitcherOpen(true)}
              className="support-card group text-center flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-[#eef3f7] text-[#1a3a52] group-hover:bg-[#1a3a52] group-hover:text-white transition-colors flex items-center justify-center mb-1 mx-auto">
                <Calendar className="w-6 h-6 text-[#1a3a52] group-hover:text-white transition-colors" />
              </div>
              <div className="support-title">Trading Session Date</div>
              <div className="support-desc">Active: {activeSessionDate || 'Today'}</div>
            </button>

            <button
              type="button"
              id="support-sales-report-btn"
              onClick={() => setIsSalesReportModalOpen(true)}
              className="support-card group text-center flex flex-col items-center justify-center cursor-pointer border-2 border-emerald-600/40 bg-emerald-50/40 shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white group-hover:bg-emerald-800 transition-colors flex items-center justify-center mb-1 mx-auto shadow-2xs">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="support-title font-black text-emerald-900">Custom Sales Report PDF</div>
              <div className="support-desc">Date range daily sales statement</div>
            </button>

            <button
              type="button"
              id="support-settings-inline-btn"
              onClick={() => setActiveTab('settings')}
              className="support-card group text-center flex flex-col items-center justify-center cursor-pointer border-2 border-[#1a3a52]/30 shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1a3a52] text-white group-hover:bg-[#122839] transition-colors flex items-center justify-center mb-1 mx-auto shadow-2xs">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="support-title font-black text-[#1a3a52]">Shop Settings &amp; Info</div>
              <div className="support-desc">Configure rates, license, &amp; shop profile</div>
            </button>
          </div>

          {/* User Support Ticket Portal (Raise a ticket & View ticket responses) */}
          <div className="pt-4 border-t border-slate-200">
            <UserTicketScreen />
          </div>

          {/* Logout Button */}
          <button
            type="button"
            id="support-logout-btn"
            onClick={logoutCurrentUser}
            className="btn-logout"
          >
            <LogOut className="w-4 h-4 text-[#1a3a52]" />
            <span>Log Out of Session</span>
          </button>
        </div>
      )}

      {/* Sales Report PDF Modal */}
      <SalesReportPdfModal
        isOpen={isSalesReportModalOpen}
        onClose={() => setIsSalesReportModalOpen(false)}
      />

      {/* Farmer Management Modal */}
      {farmersModalTab && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in overflow-hidden">
          <div className="bg-[#f8fafc] w-full max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0 shadow-2xs z-10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Connected Farmers Directory
                </h3>
                <p className="text-xs text-slate-500">
                  {farmersModalTab === 'incoming'
                    ? 'Review and accept/decline farmer link requests'
                    : 'Manage connected farmer passbooks, edit details and rates'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFarmersModalTab(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0">
              <FarmersView
                initialTab={farmersModalTab}
                isModal={true}
                onClose={() => setFarmersModalTab(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportView;
