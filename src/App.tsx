/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from 'react';
import { MandiProvider, useMandi } from './context/MandiContext';
import { FirebaseProvider } from './context/FirebaseContext';
import { Navbar } from './components/common/Navbar';
import { ParchiModal } from './components/common/ParchiModal';
import { EditParchiModal } from './components/common/EditParchiModal';
import { QRModal } from './components/common/QRModal';
import { SettingsModal } from './components/merchant/SettingsModal';
import { DateSwitcherModal } from './components/common/DateSwitcherModal';
import { DashboardView } from './components/merchant/DashboardView';
import { OnboardingAuthScreen } from './components/auth/OnboardingAuthScreen';
import { SplashScreen } from './components/common/SplashScreen';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { FloatingActionButton } from './components/navigation/FloatingActionButton';
import {
  TrendingUp,
  PlusCircle,
  Users,
  Coins,
  Headphones,
  Store,
  Wifi,
  ShieldCheck,
} from 'lucide-react';
import { MerchantTab } from './types';

// Lazy-loaded heavy views and modals (loaded on demand, not on initial app startup)
const NewSaleView = lazy(() => import('./components/merchant/NewSaleView').then(m => ({ default: m.NewSaleView })));
const FarmerKathaStatementView = lazy(() => import('./components/merchant/FarmerKathaStatementView').then(m => ({ default: m.FarmerKathaStatementView })));
const SettlementView = lazy(() => import('./components/merchant/SettlementView').then(m => ({ default: m.SettlementView })));
const SupportView = lazy(() => import('./components/merchant/SupportView').then(m => ({ default: m.SupportView })));
const ShopSettingsView = lazy(() => import('./components/merchant/ShopSettingsView').then(m => ({ default: m.ShopSettingsView })));
const RetailerSectionView = lazy(() => import('./components/merchant/RetailerSectionView').then(m => ({ default: m.RetailerSectionView })));
const NewRetailerSaleView = lazy(() => import('./components/merchant/NewRetailerSaleView').then(m => ({ default: m.NewRetailerSaleView })));
const FarmerPortalView = lazy(() => import('./components/farmer/FarmerPortalView').then(m => ({ default: m.FarmerPortalView })));
const FlowchartView = lazy(() => import('./components/flowchart/FlowchartView').then(m => ({ default: m.FlowchartView })));
const AdminPortalView = lazy(() => import('./components/admin/AdminPortalView').then(m => ({ default: m.AdminPortalView })));
const GeneratePdfModal = lazy(() => import('./components/common/GeneratePdfModal').then(m => ({ default: m.GeneratePdfModal })));
const HelpDeskModal = lazy(() => import('./components/helpdesk/HelpDeskModal').then(m => ({ default: m.HelpDeskModal })));
const ParchiAuditTrailModal = lazy(() => import('./components/merchant/ParchiAuditTrailModal').then(m => ({ default: m.ParchiAuditTrailModal })));
const OwnerSignUpModal = lazy(() => import('./components/merchant/OwnerSignUpModal').then(m => ({ default: m.OwnerSignUpModal })));
const FarmerSignUpModal = lazy(() => import('./components/farmer/FarmerSignUpModal').then(m => ({ default: m.FarmerSignUpModal })));


const MainLayout: React.FC = () => {
  const {
    currentUserPhone,
    portalMode,
    merchantTab,
    setMerchantTab,
    merchantSection,
    merchantProfile,
    isOwnerSignUpOpen,
    setIsOwnerSignUpOpen,
    isFarmerSignUpOpen,
    setIsFarmerSignUpOpen,
    setActiveFarmerId,
    isGeneratePdfOpen,
    setIsGeneratePdfOpen,
    activePdfLot,
    setActivePdfLot,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    language,
    t,
  } = useMandi();

  if (portalMode === 'admin') {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col font-sans p-2 sm:p-6">
        <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">Loading Admin Portal...</div>}>
          <AdminPortalView />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col font-sans">
      {/* Top Fixed Header Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 sm:pb-28 md:pb-28">

        {/* View Switcher based on portal mode and tab */}
        <div
          key={portalMode === 'merchant' ? `${merchantSection}-${merchantTab}` : portalMode}
          className="content-area animate-in fade-in duration-200"
        >
          <Suspense fallback={
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-[#1a3a52] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black text-slate-500">Loading view...</p>
            </div>
          }>
            {portalMode === 'farmer' ? (
              <FarmerPortalView />
            ) : portalMode === 'flowchart' ? (
              <FlowchartView />
            ) : merchantSection === 'retailer' ? (
              <>
                {merchantTab === 'dashboard' && <DashboardView />}
                {merchantTab === 'new-sale' && <NewRetailerSaleView />}
                {(merchantTab === 'farmers' || merchantTab === 'retailers') && <RetailerSectionView />}
                {merchantTab === 'settings' && <ShopSettingsView />}
                {merchantTab === 'support' && <SupportView />}
                {merchantTab === 'settlement' && <RetailerSectionView />}
              </>
            ) : (
              <>
                {merchantTab === 'dashboard' && <DashboardView />}
                {merchantTab === 'new-sale' && <NewSaleView />}
                {(merchantTab === 'farmers' || merchantTab === 'retailers') && <FarmerKathaStatementView />}
                {merchantTab === 'settings' && <ShopSettingsView />}
                {merchantTab === 'settlement' && <SettlementView />}
                {merchantTab === 'support' && <SupportView />}
              </>
            )}
          </Suspense>
        </div>
      </main>

      {/* Floating Action Button (FAB) for fast actions */}
      <FloatingActionButton />

      {/* Sticky Mobile Bottom Navigation Bar (Mobile / Phone view) */}
      <MobileBottomNav />

      {/* Footer */}
      <footer className="no-print bg-white border-t border-[#e2e8f0] py-4 px-4 sm:px-6 text-xs text-[#64748b] mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1e293b]">BHARAT MANDI</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#1a3a52] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Wholesale Form C Adathiya Ledger</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-mono text-[11px] text-[#1a3a52] bg-[#eef3f7] px-2 py-0.5 rounded-full">
              <Wifi className="w-3 h-3" />
              <span>Cloud Realtime Sync Active</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ParchiModal />
      <EditParchiModal />
      <Suspense fallback={null}>
        <GeneratePdfModal
          isOpen={isGeneratePdfOpen}
          onClose={() => {
            setIsGeneratePdfOpen(false);
            setActivePdfLot(null);
          }}
          lot={activePdfLot}
        />
        <QRModal />
        <SettingsModal />
        <DateSwitcherModal />
        <ParchiAuditTrailModal />
        <FarmerSignUpModal
          isOpen={isFarmerSignUpOpen}
          onClose={() => setIsFarmerSignUpOpen(false)}
          onSuccess={(newFarmer) => {
            setActiveFarmerId(newFarmer.id);
            setMerchantTab('new-sale');
          }}
        />
        <HelpDeskModal />
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <FirebaseProvider>
      <MandiProvider>
        <MainLayout />
      </MandiProvider>
    </FirebaseProvider>
  );
}
