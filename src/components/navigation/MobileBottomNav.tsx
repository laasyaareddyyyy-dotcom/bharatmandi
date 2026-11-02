import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PlusCircle,
  Users,
  Store,
  Headphones,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';

export const MobileBottomNav: React.FC = () => {
  const {
    merchantTab,
    setMerchantTab,
    merchantSection,
    setMerchantSection,
    t,
  } = useMandi();

  const [hasUnreadSupportUpdate, setHasUnreadSupportUpdate] = useState<boolean>(() => {
    return localStorage.getItem('bharatmandi_unread_ticket_update') === 'true';
  });

  useEffect(() => {
    const handleUpdate = () => {
      setHasUnreadSupportUpdate(localStorage.getItem('bharatmandi_unread_ticket_update') === 'true');
    };
    window.addEventListener('ticket_update', handleUpdate);
    return () => window.removeEventListener('ticket_update', handleUpdate);
  }, []);

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg no-print pb-[max(8px,env(safe-area-inset-bottom))] md:hidden overflow-hidden"
    >
      <div className="grid grid-cols-4 w-full items-center justify-between h-14 sm:h-16 px-0.5 max-w-full overflow-hidden">
        {/* 1. Dashboard */}
        <button
          type="button"
          id="mobile-tab-dashboard"
          onClick={() => setMerchantTab('dashboard')}
          className={`flex flex-col items-center justify-center w-full h-full py-1 transition min-w-0 cursor-pointer ${
            merchantTab === 'dashboard'
              ? 'text-[#1a3a52] font-black'
              : 'text-slate-500 hover:text-[#1e293b]'
          }`}
        >
          <TrendingUp className={`w-5 h-5 shrink-0 ${merchantTab === 'dashboard' ? 'stroke-[2.5] text-[#1a3a52]' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none font-bold truncate max-w-full px-0.5">
            Dashboard
          </span>
        </button>

        {/* 2. New Sale */}
        <button
          type="button"
          id="mobile-tab-new-sale"
          onClick={() => setMerchantTab('new-sale')}
          className={`flex flex-col items-center justify-center w-full h-full py-1 transition min-w-0 cursor-pointer ${
            merchantTab === 'new-sale'
              ? 'text-[#1a3a52] font-black'
              : 'text-slate-500 hover:text-[#1e293b]'
          }`}
        >
          <PlusCircle className={`w-5 h-5 shrink-0 ${merchantTab === 'new-sale' ? 'stroke-[2.5] text-[#1a3a52]' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none font-bold truncate max-w-full px-0.5">
            New Sale
          </span>
        </button>

        {/* 3. Farmers */}
        <button
          type="button"
          id="mobile-tab-farmers"
          onClick={() => setMerchantTab('farmers')}
          className={`flex flex-col items-center justify-center w-full h-full py-1 transition min-w-0 cursor-pointer ${
            merchantTab === 'farmers' || merchantTab === 'retailers'
              ? 'text-[#1a3a52] font-black'
              : 'text-slate-500 hover:text-[#1e293b]'
          }`}
        >
          <Users className={`w-5 h-5 shrink-0 ${merchantTab === 'farmers' || merchantTab === 'retailers' ? 'stroke-[2.5] text-[#1a3a52]' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none font-bold truncate max-w-full px-0.5">
            {merchantSection === 'retailer' ? 'Customers' : 'Farmers'}
          </span>
        </button>

        {/* 4. Support / Help Desk */}
        <button
          type="button"
          id="mobile-tab-support"
          onClick={() => {
            setMerchantTab('support');
            localStorage.removeItem('bharatmandi_unread_ticket_update');
            setHasUnreadSupportUpdate(false);
          }}
          className={`flex flex-col items-center justify-center w-full h-full py-1 transition min-w-0 cursor-pointer relative ${
            merchantTab === 'support'
              ? 'text-[#1a3a52] font-black'
              : 'text-slate-500 hover:text-[#1e293b]'
          }`}
        >
          <div className="relative shrink-0">
            <Headphones className={`w-5 h-5 ${merchantTab === 'support' ? 'stroke-[2.5] text-[#1a3a52]' : ''}`} />
            {hasUnreadSupportUpdate && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse absolute -top-1 -right-1 border border-white" />
            )}
          </div>
          <span className="text-[11px] mt-0.5 leading-none font-bold truncate max-w-full px-0.5">
            Help
          </span>
        </button>
      </div>
    </nav>
  );
};
