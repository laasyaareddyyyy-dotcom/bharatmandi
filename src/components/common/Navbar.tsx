import React, { useState, useRef } from 'react';
import {
  Search,
  X,
  Calendar,
  Wifi,
  Sprout,
  Loader2,
  Menu,
  Globe,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PlusCircle,
  Users,
  Store,
  Building2,
  Settings,
  Headphones,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { useFirebase } from '../../context/FirebaseContext';
import { getTodayDateString, formatDisplayDate, COMMODITY_CONFIGS } from '../../data/initialData';
import { sounds } from '../../utils/audio';
import { CommodityCategory } from '../../types';

/* =========================================================================
   NAVBAR COMPONENT: AGRICULTURAL MARKETPLACE SETTLEMENT TRACKER HEADER
   - Centered Logo at top
   - Centered Title & Subtitle
   - One-row Language Buttons directly under Subtitle
   - Operational Action Toolbar below
   ========================================================================= */

export const Navbar: React.FC = () => {
  const {
    merchantProfile,
    portalMode,
    setPortalMode,
    merchantSection,
    setMerchantSection,
    activeSessionDate,
    merchantTab,
    setMerchantTab,
    setDashboardTab,
    consignmentSearchQuery,
    setConsignmentSearchQuery,
    setIsDateSwitcherOpen,
    setIsMobileDrawerOpen,
    userCommodities,
    activeCommodityFilter,
    setActiveCommodityFilter,
    language,
    setLanguage,
    farmers,
    lots,
    shipments,
    payments,
    settlements,
    helpTickets,
    setIsOwnerSignUpOpen,
    t,
  } = useMandi();

  const {
    user: firebaseUser,
    isSyncing,
    lastSyncedAt,
    signInWithGoogle,
    syncDataToCloud,
  } = useFirebase();

  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [hasUnreadSupportUpdate, setHasUnreadSupportUpdate] = useState<boolean>(() => {
    return localStorage.getItem('bharatmandi_unread_ticket_update') === 'true';
  });
  const commodityScrollRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleUpdate = () => {
      setHasUnreadSupportUpdate(localStorage.getItem('bharatmandi_unread_ticket_update') === 'true');
    };
    window.addEventListener('ticket_update', handleUpdate);
    return () => window.removeEventListener('ticket_update', handleUpdate);
  }, []);

  const scrollCommodityLeft = () => {
    sounds.playBidTick?.();
    if (commodityScrollRef.current) {
      commodityScrollRef.current.scrollBy({ left: -140, behavior: 'smooth' });
    }
  };

  const scrollCommodityRight = () => {
    sounds.playBidTick?.();
    if (commodityScrollRef.current) {
      commodityScrollRef.current.scrollBy({ left: 140, behavior: 'smooth' });
    }
  };

  const handleQuickCloudSync = async () => {
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
      setSyncFeedback('Sync error');
      setTimeout(() => setSyncFeedback(null), 2500);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConsignmentSearchQuery(val);
    if (val.trim()) {
      setMerchantTab('dashboard');
      setDashboardTab('ledger');
    }
  };

  const handleClearSearch = () => {
    setConsignmentSearchQuery('');
  };

  const handleSwitchCommodity = (category: CommodityCategory) => {
    sounds.playBidTick?.();
    setActiveCommodityFilter(category);
  };

  const shopDisplayTitle = merchantProfile.shopName || merchantProfile.shopNumber
    ? `${merchantProfile.shopName || merchantProfile.shopNumber}${merchantProfile.marketYardName ? ` - ${merchantProfile.marketYardName}` : ''}`
    : 'Mandi Merchant Ledger';

  return (
    <header className="no-print">
      {/* 1. TOP HEADER SECTION: Horizontal Row with Balanced Vertical Padding */}
      <div className="border-b border-[#132d42] bg-[#1a3a52] py-2.5 sm:py-3.5 px-3.5 sm:px-6 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Top Line: Logo + Title & Subtitle + Merchant Profile Button */}
          <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
            {/* Left Side: Logo + Title */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div
                className="cursor-pointer select-none shrink-0"
                onClick={() => {
                  setMerchantTab('dashboard');
                  setDashboardTab('summary');
                }}
                title="Agricultural Marketplace Settlement Tracker"
              >
                <img
                  src="/bharat_mandi_logo.png"
                  alt="Agricultural Marketplace Logo"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-xs bg-transparent shrink-0"
                />
              </div>

              <div className="flex flex-col text-left min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <h1 className="font-bold text-sm sm:text-base md:text-lg tracking-tight text-white leading-tight line-clamp-2 break-words min-w-0">
                    {shopDisplayTitle}
                  </h1>
                  {portalMode === 'admin' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-semibold uppercase tracking-wider shadow-2xs shrink-0">
                      Admin Portal
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Merchant Profile Icon Button (Right aligned on mobile line 1) */}
            <button
              type="button"
              id="topbar-merchant-profile-btn"
              onClick={() => setIsOwnerSignUpOpen(true)}
              className="p-2 sm:px-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-white/20 shadow-2xs shrink-0"
              title="Merchant Profile & Shop Settings"
              aria-label="Merchant Profile & Shop Settings"
            >
              <Store className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span className="hidden sm:inline text-xs font-extrabold truncate max-w-[120px]">
                {merchantProfile.ownerName || 'Merchant Profile'}
              </span>
            </button>
          </div>

          {/* Wholesaler / Retailer Mode Switcher: Full Width Segmented 2-Column Grid on Mobile */}
          <div className="bg-slate-900/70 p-1 rounded-xl border border-white/20 grid grid-cols-2 w-full sm:w-auto min-w-0 shrink-0 gap-1">
            <button
              type="button"
              id="mode-switch-wholesaler"
              onClick={() => setMerchantSection('wholesaler')}
              aria-label="Wholesaler Mandi Section"
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-[12px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-w-0 ${
                merchantSection === 'wholesaler'
                  ? 'bg-white text-[#1a3a52] font-black shadow-xs'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate min-w-0">
                <span className="sm:hidden">Wholesale</span>
                <span className="hidden sm:inline">Wholesaler Mandi</span>
              </span>
            </button>

            <button
              type="button"
              id="mode-switch-retailer"
              onClick={() => setMerchantSection('retailer')}
              aria-label="Retailer Sales Section"
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-[12px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-w-0 ${
                merchantSection === 'retailer'
                  ? 'bg-white text-[#1a3a52] font-black shadow-xs'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate min-w-0">
                <span className="sm:hidden">Retailer</span>
                <span className="hidden sm:inline">Retailer Sales Section</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL TOOLBAR SECTION: Commodity Switcher, Global Search, Session Date, Online Status, Menu (Sticky at Top) */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* COMMODITY SWITCHER or TOTAL SHOP ADDRESS */}
        {userCommodities && userCommodities.length >= 2 ? (
          <div className="w-full sm:w-auto order-first flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs max-w-full relative shrink-0">
            {/* Left Scroll Arrow for 3+ commodities */}
            {userCommodities.length >= 3 && (
              <button
                type="button"
                onClick={scrollCommodityLeft}
                aria-label="Scroll left"
                className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shrink-0 shadow-2xs cursor-pointer border border-slate-200 transition"
                title="Scroll commodities left"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
              </button>
            )}

            <div
              id="navbar-commodity-switcher"
              ref={commodityScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto scroll-smooth touch-pan-x max-w-full py-0.5 px-0.5 text-xs font-bold no-scrollbar min-w-0"
              role="tablist"
              aria-label="Switch Commodity Category"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {userCommodities.map((category) => {
                const config = COMMODITY_CONFIGS[category];
                if (!config) return null;
                const isActive = activeCommodityFilter === category;
                const label =
                  t(`commodity_${category}`) ||
                  (language === 'te'
                    ? config.nameTe.split(' ')[0]
                    : language === 'hi'
                    ? config.nameHi.split(' ')[0]
                    : config.name);

                return (
                  <button
                    key={category}
                    id={`commodity-switch-btn-${category}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={(e) => {
                      handleSwitchCommodity(category);
                      e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }}
                    className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer select-none ${
                      isActive
                        ? 'bg-[#1a3a52] text-white shadow-xs scale-[1.02]'
                        : 'bg-white/80 text-slate-700 hover:text-slate-900 hover:bg-white border border-slate-200/60'
                    }`}
                    title={`Switch to ${config.name}`}
                  >
                    <span className="text-sm leading-none shrink-0">{config.icon}</span>
                    <span className="shrink-0">{label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Arrow for 3+ commodities */}
            {userCommodities.length >= 3 && (
              <button
                type="button"
                onClick={scrollCommodityRight}
                aria-label="Scroll right"
                className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shrink-0 shadow-2xs cursor-pointer border border-slate-200 transition"
                title="Scroll commodities right"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
              </button>
            )}
          </div>
        ) : null}

        {/* TOTAL SHOP ADDRESS */}
        <div className="flex-1 flex items-center gap-2 text-[#1a3a52] text-xs sm:text-sm font-extrabold py-1">
          <span className="text-base shrink-0">{COMMODITY_CONFIGS[userCommodities[0] || 'flowers']?.icon || '🌸'}</span>
          <span className="font-extrabold text-[#1a3a52] text-xs sm:text-sm tracking-tight">
            {shopDisplayTitle}
          </span>
        </div>

        {/* RIGHT SIDE: [Desktop Nav Tabs & Sync Status] */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Navigation Bar */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
            <button
              type="button"
              id="desktop-nav-dashboard"
              onClick={() => setMerchantTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                merchantTab === 'dashboard'
                  ? 'bg-[#1a3a52] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('tabDashboard')}</span>
            </button>

            <button
              type="button"
              id="desktop-nav-newsale"
              onClick={() => setMerchantTab('new-sale')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                merchantTab === 'new-sale'
                  ? 'bg-[#1a3a52] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('tabNewSale')}</span>
            </button>

            <button
              type="button"
              id="desktop-nav-farmers"
              onClick={() => setMerchantTab('farmers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                merchantTab === 'farmers' || merchantTab === 'retailers'
                  ? 'bg-[#1a3a52] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{merchantSection === 'retailer' ? 'Retail Customers' : t('tabFarmers')}</span>
            </button>



            <button
              type="button"
              id="desktop-nav-support"
              onClick={() => {
                setMerchantTab('support');
                localStorage.removeItem('bharatmandi_unread_ticket_update');
                setHasUnreadSupportUpdate(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 relative ${
                merchantTab === 'support'
                  ? 'bg-[#1a3a52] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{t('helpDesk')}</span>
              {hasUnreadSupportUpdate && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-0.5" title="New ticket update" />
              )}
            </button>
          </nav>

          {/* Cloud / Offline Sync Status */}
          <button
            type="button"
            id="navbar-cloud-sync-status-btn"
            onClick={handleQuickCloudSync}
            disabled={isSyncing}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              firebaseUser
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title={
              firebaseUser
                ? `Firebase Online Sync: Active (${lastSyncedAt || 'Live'}). Click to sync.`
                : 'Offline Storage Active. Click to connect Cloud Backup.'
            }
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a3a52]" />
            ) : firebaseUser ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="text-[11px]">
              {syncFeedback ? syncFeedback : firebaseUser ? 'Online' : 'Offline'}
            </span>
          </button>
        </div>
      </div>
    </div>
  </header>
  );
};
