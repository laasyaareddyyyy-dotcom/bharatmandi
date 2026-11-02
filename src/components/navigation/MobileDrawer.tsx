import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  PlusCircle,
  Users,
  Coins,
  Calculator,
  Settings,
  Headphones,
  QrCode,
  LogOut,
  Calendar,
  Cloud,
  Loader2,
  ChevronRight,
  Sprout,
  Store,
  UserPlus,
} from 'lucide-react';
import { MerchantTab } from '../../types';
import { getTodayDateString, COMMODITY_CONFIGS } from '../../data/initialData';
import { useMandi } from '../../context/MandiContext';
import { useFirebase } from '../../context/FirebaseContext';

/* =========================================================================
   MOBILE DRAWER: UNIFIED NAVIGATION & EXECUTIVE NAVY REFACTOR
   - Structured sections: 
     1. Merchant Operations (Dashboard, New Sale, Farmers, Payments, Settlement, Reports)
     2. Account Management (Settings & Profile, Merchant QR)
     3. Support & Mandi (Help Desk, Add Farmer Registration)
   ========================================================================= */

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const {
    portalMode,
    setPortalMode,
    merchantTab,
    setMerchantTab,
    merchantSection,
    setMerchantSection,
    userCommodities,
    activeCommodityFilter,
    setActiveCommodityFilter,
    merchantProfile,
    language,
    setLanguage,
    activeSessionDate,
    setIsDateSwitcherOpen,
    setIsQRModalOpen,
    setIsSettingsOpen,
    setIsFarmerSignUpOpen,
    openHelpDesk,
    connectionRequests,
    helpTickets,
    logoutCurrentUser,
    currentUserAccount,
    currentUserPhone,
    farmers,
    lots,
    shipments,
    payments,
    settlements,
    t,
  } = useMandi();



  const {
    user: firebaseUser,
    isSyncing,
    signInWithGoogle,
    syncDataToCloud,
  } = useFirebase();

  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pendingRequestsCount = connectionRequests.filter((r) => r.status === 'pending').length;
  const openTicketsCount = helpTickets.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  ).length;

  const handleCloudSync = async () => {
    if (!firebaseUser) {
      try {
        await signInWithGoogle();
      } catch (e) {
        // handled
      }
      return;
    }
    setSyncFeedback('Syncing...');
    const ok = await syncDataToCloud({
      profile: merchantProfile,
      farmers,
      lots,
      shipments,
      payments,
      settlements,
      helpTickets,
    });
    if (ok) {
      setSyncFeedback('✓ Synced!');
      setTimeout(() => setSyncFeedback(null), 2500);
    } else {
      setSyncFeedback('Sync failed');
      setTimeout(() => setSyncFeedback(null), 2500);
    }
  };

  const merchantTabsList: { id: MerchantTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t('tabDashboard'), icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'new-sale', label: t('tabNewSale'), icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'farmers', label: t('tabFarmers'), icon: <Users className="w-4 h-4" /> },
    { id: 'retailers', label: 'Retailer Sales Section', icon: <Store className="w-4 h-4 text-amber-500" /> },
    { id: 'settings', label: t('tabSettings'), icon: <Store className="w-4 h-4" /> },
    { id: 'support', label: t('helpDesk'), icon: <Headphones className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex no-print">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        id="mobile-navigation-drawer"
        className="relative w-full max-w-[320px] sm:max-w-xs bg-white h-full flex flex-col shadow-2xl z-10 overflow-y-auto safe-top-padding safe-bottom-padding"
      >
        {/* Header with App Info - Executive Navy */}
        <div className="bg-[#1a3a52] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/bharat_mandi_logo.png"
              alt="Bharat Mandi Logo"
              referrerPolicy="no-referrer"
              className="w-9 h-9 object-contain shrink-0 bg-transparent"
            />
            <div>
              <div className="flex items-center gap-1.5 font-black text-sm leading-tight text-white">
                <span>भारत</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d4af37] text-[#1a3a52] font-black tracking-wide">
                  MANDI
                </span>
              </div>
              <p className="text-[11px] text-slate-200/80 mt-0.5">
                {merchantProfile.shopNumber || 'Shop 1'} • {merchantProfile.marketYardName || 'Gudimalkapur Flower Market Yard'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="mobile-drawer-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/20 text-white/90 hover:text-white hover:bg-black/40 transition min-touch-target cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account / Profile Box */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#1a3a52] bg-white flex items-center justify-center text-xs font-bold text-[#1a3a52] shrink-0 shadow-2xs">
                {merchantProfile.photoUrl ? (
                  <img
                    src={merchantProfile.photoUrl}
                    alt={merchantProfile.ownerName || 'Owner'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUserAccount?.fullName?.charAt(0) || merchantProfile.ownerName?.charAt(0) || 'U'
                )}
              </div>
              <div className="text-left min-w-0 truncate">
                <p className="text-xs font-bold text-[#1e293b] leading-tight truncate">
                  {currentUserAccount?.fullName || merchantProfile.ownerName || 'Mandi Trader'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  {currentUserPhone || merchantProfile.phoneNumber || 'Mobile'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 p-3 space-y-4 overflow-y-auto">
          {/* SECTION 0: Active Produce Commodity Switcher */}
          {userCommodities && userCommodities.length >= 2 && (
            <div className="bg-slate-100 p-2.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1a3a52] block mb-2 px-1">
                Active Produce Commodity ({userCommodities.length} Selected)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {userCommodities.map((catKey) => {
                  const cfg = COMMODITY_CONFIGS[catKey];
                  if (!cfg) return null;
                  const isActive = activeCommodityFilter === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => {
                        setActiveCommodityFilter(catKey);
                        onClose();
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer select-none ${
                        isActive
                          ? 'bg-[#1a3a52] text-white shadow-xs font-extrabold'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <span>{cfg.icon}</span>
                      <span>{cfg.name}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 1: Merchant Operations */}
          {portalMode === 'merchant' && (
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-2 px-1">
                Merchant Operations
              </span>
              <div className="space-y-1">
                {merchantTabsList.map((tab) => {
                  const isActive = merchantTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`drawer-tab-${tab.id}`}
                      onClick={() => {
                        if (tab.id === 'retailers') {
                          setMerchantSection('retailer');
                        } else {
                          setMerchantSection('wholesaler');
                        }
                        setMerchantTab(tab.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition min-touch-target cursor-pointer ${
                        isActive
                          ? 'bg-[#1a3a52] text-white shadow-2xs'
                          : 'text-[#1e293b] hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-[#d4af37]' : 'text-[#1a3a52]'}>
                          {tab.icon}
                        </span>
                        <span>{tab.label}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-[#d4af37]' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: Account Management & Tools */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-2 px-1">
              Account Management
            </span>
            <div className="space-y-1">
              {/* Settings & Merchant Info */}
              {portalMode === 'merchant' && (
                <button
                  type="button"
                  id="drawer-settings-btn"
                  onClick={() => {
                    setIsSettingsOpen(true);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-[#1e293b] min-touch-target cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-[#1a3a52]" />
                    <span>{t('tabSettings')} &amp; Merchant Info</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {/* Date Switcher */}
              <button
                type="button"
                id="drawer-date-switcher-btn"
                onClick={() => {
                  setIsDateSwitcherOpen(true);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-[#1e293b] min-touch-target cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#1a3a52]" />
                  <span>Session: <strong className="font-mono">{activeSessionDate}</strong></span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-[#1a3a52] font-bold">
                  {activeSessionDate === getTodayDateString() ? 'Today' : 'Archive'}
                </span>
              </button>

              {/* QR Code */}
              {portalMode === 'merchant' && (
                <button
                  type="button"
                  id="drawer-qr-code-btn"
                  onClick={() => {
                    setIsQRModalOpen(true);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-[#1e293b] min-touch-target cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-4 h-4 text-[#1a3a52]" />
                    <span>Merchant QR &amp; Farmer Links</span>
                  </div>
                  {pendingRequestsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {pendingRequestsCount} new
                    </span>
                  )}
                </button>
              )}

              {/* Log Out & Switch Account */}
              <button
                type="button"
                id="drawer-logout-action-btn"
                onClick={() => {
                  logoutCurrentUser();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-red-50/70 hover:bg-red-100/80 border border-red-200 text-xs font-bold text-red-800 min-touch-target cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Log Out &amp; Switch User</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>

          {/* SECTION 3: Support */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-2 px-1">
              Support
            </span>
            <div className="space-y-1">
              {/* Add Farmer Quick Action */}
              {portalMode === 'merchant' && (
                <button
                  type="button"
                  id="drawer-add-farmer-btn"
                  onClick={() => {
                    setIsFarmerSignUpOpen(true);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-[#1e293b] min-touch-target cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-[#1a3a52]" />
                    <span>Register New Farmer</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {/* Mandi Help Desk */}
              <button
                type="button"
                id="drawer-help-desk-btn"
                onClick={() => {
                  openHelpDesk('raise');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-[#1e293b] min-touch-target cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-[#1a3a52]" />
                  <span>Mandi Help Desk</span>
                </div>
                {openTicketsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#1a3a52] text-white text-[10px] font-bold">
                    {openTicketsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Cloud Sync Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <button
            type="button"
            id="drawer-cloud-sync-btn"
            onClick={handleCloudSync}
            disabled={isSyncing}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs min-touch-target cursor-pointer ${
              firebaseUser
                ? 'bg-white border border-[#1a3a52] text-[#1a3a52]'
                : 'bg-[#d4af37] text-[#1a3a52] hover:bg-[#c49f2b]'
            }`}
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#1a3a52]" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
            <span>
              {syncFeedback
                ? syncFeedback
                : isSyncing
                ? 'Syncing to Firebase...'
                : firebaseUser
                ? 'Sync with Cloud Database'
                : 'Sign In for Cloud Backup'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
