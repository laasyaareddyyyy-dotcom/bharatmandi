import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Store,
  ShieldCheck,
  Check,
  CheckCircle2,
  Sparkles,
  Phone,
  MapPin,
  FileBadge,
  Percent,
  User,
  AlertCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { DEFAULT_MARKET_YARD_NAME } from '../../data/initialData';
import { PhotoUploadPicker } from '../common/PhotoUploadPicker';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { sounds } from '../../utils/audio';
import { validateIndianMobile, cleanIndianMobile } from '../../utils/phoneValidation';
import { checkCloudDuplicateRegistration } from '../../services/supabaseSync';

interface OwnerSignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerSignUpModal: React.FC<OwnerSignUpModalProps> = ({ isOpen, onClose }) => {
  const {
    merchantProfile,
    updateMerchantProfile,
    checkUniqueness,
    currentUserPhone,
    deleteCurrentAccount,
    language,
    t,
  } = useMandi();

  const [formData, setFormData] = useState({
    ownerName: (merchantProfile.ownerName || '').replace(/[0-9]/g, ''),
    photoUrl: merchantProfile.photoUrl || '',
    shopName: merchantProfile.shopName || '',
    shopNumber: merchantProfile.shopNumber || '',
    marketYardName: merchantProfile.marketYardName || '',
    phoneNumber: (merchantProfile.phoneNumber || '').replace(/\D/g, '').slice(-10),
    defaultCommissionRate: merchantProfile.defaultCommissionRate || 4,
    defaultExpenditureRate: merchantProfile.defaultExpenditureRate || 6,
    address: merchantProfile.address || '',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleConfirmDelete = () => {
    setIsDeleteConfirmOpen(false);
    onClose();
    sounds.tap();
    deleteCurrentAccount();
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ownerName.trim()) {
      setErrorMessage('Owner name is required');
      return;
    }

    if (/[0-9]/.test(formData.ownerName)) {
      setErrorMessage(language === 'te' ? 'యజమాని పేరులో అంకెలు ఉండకూడదు' : 'Owner name cannot contain numbers');
      return;
    }

    const phoneVal = validateIndianMobile(formData.phoneNumber);
    if (!phoneVal.isValid) {
      setErrorMessage(phoneVal.error || 'Enter a valid 10-digit Indian mobile number');
      return;
    }
    const cleanPhone = phoneVal.cleanNumber;

    if (!formData.shopName.trim()) {
      setErrorMessage('Shop name is required');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('Shop address is required');
      return;
    }

    // Verify uniqueness of shop name & address against other accounts
    const uniqueness = checkUniqueness({
      shopName: formData.shopName.trim(),
      shopAddress: formData.address.trim(),
      phoneNumber: cleanPhone,
      excludePhone: currentUserPhone,
    });

    if (!uniqueness.valid) {
      setErrorMessage(uniqueness.message || 'Shop name or address must be unique');
      return;
    }

    // Cloud Database Duplicate Check
    try {
      const cloudCheck = await checkCloudDuplicateRegistration({
        phoneNumber: cleanPhone,
        shopNumber: formData.shopNumber?.trim(),
        marketName: formData.marketYardName?.trim(),
        shopName: formData.shopName.trim(),
        excludePhone: currentUserPhone,
      });
      if (cloudCheck.isDuplicate) {
        setErrorMessage(cloudCheck.message || 'Details already exist in database');
        return;
      }
    } catch {}

    setErrorMessage('');
    updateMerchantProfile({
      ...formData,
      phoneNumber: `+91 ${cleanPhone}`,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleFillSample = () => {
    setFormData({
      ownerName: 'Ravi Kumar Reddy',
      photoUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      shopName: 'Ravi Flowers (Sri Venkateshwara Florals)',
      shopNumber: 'Shop No. 27, Gate #3',
      marketYardName: 'Gudimalkapur Wholesale Flower Market',
      phoneNumber: '9849012345',
      defaultCommissionRate: 4,
      defaultExpenditureRate: 6,
      address: 'Market Yard, Gudimalkapur, Mehdipatnam, Hyderabad, Telangana - 500028',
    });
    setErrorMessage('');
  };

  return (
    <div
      id="owner-signup-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div
        id="owner-signup-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Go Back"
              className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-[#d4af37] shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white leading-tight">
                  Shop Owner Sign Up &amp; Profile
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#d4af37] text-[#1e293b]">
                  Adathiya
                </span>
              </div>
              <p className="text-[11px] text-slate-200/80 leading-none mt-0.5">
                Register shop owner identity, photo, shop details &amp; commission rules
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-owner-signup-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 flex flex-col">
          <div className="flex-1 p-5 sm:p-6 space-y-6 bg-[#f8fafc]">
            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Owner profile and photo saved successfully!</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

          {/* 1. Photo of Owner */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>{language === 'te' ? 'దశ 1: యజమాని ఫోటో' : 'Step 1: Photo of Owner'}</span>
              </span>
              <button
                type="button"
                onClick={handleFillSample}
                className="text-[11px] font-bold text-[#1a3a52] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-[#d4af37]" />
                <span>Fill Sample Owner</span>
              </button>
            </div>

            <PhotoUploadPicker
              label="Shop Owner Profile Photo"
              sublabel="Upload from files, capture live with camera, or select a realistic sample avatar"
              currentPhotoUrl={formData.photoUrl}
              onChange={(url) => setFormData({ ...formData, photoUrl: url })}
              presetType="owner"
              idPrefix="owner-signup"
            />
          </div>

          {/* 2. Owner & Firm Details */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5 border-b border-[#e2e8f0] pb-2">
              <Store className="w-4 h-4" />
              <span>Step 2: Owner & Mandi Firm Details</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {language === 'te' ? 'యజమాని పూర్తి పేరు *' : 'Owner Full Name *'}
                </label>
                <input
                  id="owner-signup-name-input"
                  type="text"
                  required
                  placeholder="e.g., Ravi Kumar Reddy (letters only)"
                  value={formData.ownerName}
                  onKeyDown={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                      setErrorMessage(language === 'te' ? 'యజమాని పేరులో అంకెలు ఉండకూడదు' : 'Owner name cannot contain numbers');
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text').replace(/[0-9]/g, '');
                    if (/[0-9]/.test(e.clipboardData.getData('text'))) {
                      setErrorMessage(language === 'te' ? 'యజమాని పేరులో అంకెలు ఉండకూడదు' : 'Owner name cannot contain numbers');
                    }
                    setFormData({ ...formData, ownerName: text });
                  }}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[0-9]/g, '');
                    setFormData({ ...formData, ownerName: filtered });
                    if (/[0-9]/.test(e.target.value)) {
                      setErrorMessage(language === 'te' ? 'యజమాని పేరులో అంకెలు ఉండకూడదు' : 'Owner name cannot contain numbers');
                    } else {
                      setErrorMessage('');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  Owner Mobile / WhatsApp Number * (Numbers only)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-[#64748b] border-r border-[#e2e8f0] pr-2 pointer-events-none">
                    +91
                  </span>
                  <input
                    id="owner-signup-phone-input"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    placeholder="9849012345"
                    value={formData.phoneNumber}
                    onKeyDown={(e) => {
                      if (
                        !/[0-9]/.test(e.key) &&
                        e.key !== 'Backspace' &&
                        e.key !== 'Delete' &&
                        e.key !== 'ArrowLeft' &&
                        e.key !== 'ArrowRight' &&
                        e.key !== 'Tab' &&
                        e.key !== 'Enter'
                      ) {
                        e.preventDefault();
                        setErrorMessage(language === 'te' ? 'ఫోన్ నంబరులో అంకెలు మాత్రమే ఉండాలి' : 'Phone number can only contain numbers');
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const clean = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phoneNumber: clean });
                      setErrorMessage('');
                    }}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phoneNumber: clean });
                      setErrorMessage('');
                    }}
                    className="w-full pl-12 pr-3 py-2 rounded-lg border border-[#e2e8f0] text-xs font-mono font-bold focus:outline-hidden focus:border-[#1a3a52] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {language === 'te' ? 'దుకాణం / సంస్థ పేరు *' : 'Shop / Firm Name *'}
                </label>
                <input
                  id="owner-signup-shop-name-input"
                  type="text"
                  required
                  placeholder="e.g., Ravi Flowers"
                  value={formData.shopName}
                  onChange={(e) => {
                    setFormData({ ...formData, shopName: e.target.value });
                    setErrorMessage('');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
                <span className="text-[10px] text-[#64748b] mt-0.5 block">
                  Must be unique across all mandi shops
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  Shop / Stall Number & Gate *
                </label>
                <input
                  id="owner-signup-shop-number-input"
                  type="text"
                  required
                  placeholder="e.g., Shop No. 27, Gate #3"
                  value={formData.shopNumber}
                  onChange={(e) => setFormData({ ...formData, shopNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  Market Yard Name *
                </label>
                <input
                  id="owner-signup-market-input"
                  type="text"
                  required
                  placeholder="e.g., Wholesale Flower Market / Bowenpally / Vashi APMC"
                  value={formData.marketYardName}
                  onChange={(e) => {
                    const yard = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      marketYardName: yard,
                      address: prev.address && !prev.address.toLowerCase().includes('gudimalkapur')
                        ? prev.address
                        : yard ? `Market Yard, ${yard}` : prev.address,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  Default Mandi Commission Rate (%) *
                </label>
                <div className="relative">
                  <input
                    id="owner-signup-commission-input"
                    type="number"
                    min="1"
                    max="25"
                    step="0.5"
                    required
                    value={formData.defaultCommissionRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultCommissionRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-bold"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-500 font-bold">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                Shop / Yard Physical Address *
              </label>
              <input
                id="owner-signup-address-input"
                type="text"
                required
                placeholder="Full address in Flower Market Yard"
                value={formData.address}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  setErrorMessage('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
              />
              <span className="text-[10px] text-[#64748b] mt-0.5 block">
                Cannot be identical to any other registered shop address
              </span>
            </div>
          </div>

          {/* 3. Live Owner ID Card Badge Preview */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1a3a52] to-[#122839] text-white shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-white/15 pb-2">
              <span className="uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Wholesale Merchant ID Card Preview</span>
              </span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">
                {merchantProfile.merchantId}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#d4af37] bg-white/10 shrink-0">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt={formData.ownerName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60">
                    <User className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#d4af37]">
                  {formData.shopName || 'Shop Name'}
                </h4>
                <p className="text-xs text-white/90 font-medium">
                  {formData.ownerName || 'Owner Name'}
                </p>
                <div className="text-[11px] text-white/70 font-mono mt-0.5">
                  {formData.shopNumber} • {formData.phoneNumber}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
          <button
            type="button"
            id="delete-owner-profile-btn"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 min-touch-target cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'te' ? 'ప్రొఫైల్ తొలగించండి' : 'Delete Profile'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="cancel-owner-signup-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#1e293b] hover:bg-slate-100 min-touch-target cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-owner-signup-btn"
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs min-touch-target cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-[#1a3a52] text-white hover:bg-[#122839]'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Saved Profile</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#d4af37]" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>

    <DeleteConfirmModal
      isOpen={isDeleteConfirmOpen}
      title={language === 'te' ? 'వ్యాపారి ప్రొఫైల్ & ఖాతా తొలగించండి' : 'Delete Merchant Profile & Account'}
      itemName={formData.shopName || formData.ownerName || 'Merchant Profile'}
      itemDetails={`${formData.phoneNumber} • ${formData.address || 'Market Yard'}`}
      message={
        language === 'te'
          ? 'మీరు ఈ ప్రొఫైల్‌ను తొలగించాలనుకుంటున్నారా? తప్పుడు సమాచారం ఇచ్చి ఉంటే లేదా కొత్తగా నమోదు కావాలనుకుంటే మీరు మళ్లీ నమోదు చేసుకోవచ్చు.'
          : 'Are you sure you want to delete this profile? If you provided incorrect info or want to start fresh as a flower trader, your profile will be wiped and you can re-register.'
      }
      confirmText={language === 'te' ? 'అవును, ప్రొఫైల్ తొలగించు' : 'YES, DELETE PROFILE'}
      cancelText={language === 'te' ? 'రద్దు చేయి' : 'CANCEL'}
      onConfirm={handleConfirmDelete}
      onCancel={() => setIsDeleteConfirmOpen(false)}
    />
  </div>
  );
};
