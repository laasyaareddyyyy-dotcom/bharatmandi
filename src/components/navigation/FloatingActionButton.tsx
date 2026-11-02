import React, { useState } from 'react';
import {
  Plus,
  PlusCircle,
  UserPlus,
  Headphones,
  QrCode,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';

/* =========================================================================
   FLOATING ACTION BUTTON: EXECUTIVE NAVY REFACTOR
   - Primary action launcher (+ New Consignment / Sale, Add Farmer, Support)
   - Deep Executive Navy (#1a3a52) with Classic Gold (#d4af37)
   ========================================================================= */

export const FloatingActionButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const {
    portalMode,
    setMerchantTab,
    setIsFarmerSignUpOpen,
    setIsQRModalOpen,
    openHelpDesk,
    language,
    t,
  } = useMandi();

  // Hide floating action button in merchant portal mode as per strict UX constraints
  if (portalMode === 'merchant') {
    return null;
  }

  const handleNewSale = () => {
    setMerchantTab('new-sale');
    setIsOpen(false);
  };

  const handleAddFarmer = () => {
    setIsFarmerSignUpOpen(true);
    setIsOpen(false);
  };

  const handleOpenHelpDesk = () => {
    openHelpDesk('raise');
    setIsOpen(false);
  };

  const handleOpenQR = () => {
    setIsQRModalOpen(true);
    setIsOpen(false);
  };

  return (
    <div
      id="floating-action-button-container"
      className="fixed right-4 md:right-6 bottom-24 md:bottom-6 z-40 flex flex-col items-end gap-2.5 no-print"
    >
      {/* Expanded Speed-Dial Action Buttons */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Farmer Mode FAB Options */}
          <button
            type="button"
            id="fab-action-farmer-qr"
            onClick={handleOpenQR}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-white text-[#1a3a52] font-bold text-xs shadow-lg border border-slate-200 hover:bg-slate-50 transition min-touch-target cursor-pointer group"
          >
            <span className="text-[#1e293b] font-semibold text-xs">
              Scan Merchant QR
            </span>
            <div className="w-8 h-8 rounded-full bg-[#1a3a52] text-white flex items-center justify-center group-hover:scale-105 transition">
              <QrCode className="w-4 h-4 text-blue-300" />
            </div>
          </button>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        id="main-floating-action-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Quick Actions Floating Button"
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95 cursor-pointer border-2 border-white min-touch-target ${
          isOpen
            ? 'bg-[#122839] text-white rotate-45'
            : 'bg-gradient-to-tr from-[#1a3a52] to-[#254f6e] text-white hover:shadow-2xl hover:scale-105'
        }`}
      >
        <Plus className="w-7 h-7 text-white" />
      </button>
    </div>
  );
};
