import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Store,
  Calendar,
  Save,
  Download,
  Upload,
  AlertTriangle,
  RotateCcw,
  Check,
  Languages,
  User,
  ShieldCheck,
  AlertCircle,
  Printer,
  History,
  Cloud,
  Database,
  RefreshCw,
  CheckCircle2,
  LogIn,
  Loader2,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { CommodityCategory } from '../../types';
import { getTodayDateString, COMMODITY_CONFIGS, DEFAULT_MARKET_YARD_NAME } from '../../data/initialData';
import { PhotoUploadPicker } from '../common/PhotoUploadPicker';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { sounds } from '../../utils/audio';
import { useMandi } from '../../context/MandiContext';
import { syncLocalToSupabase, fetchUserCloudData } from '../../services/supabaseSync';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    setIsOwnerSignUpOpen,
    merchantProfile,
    updateMerchantProfile,
    currentUserPhone,
    checkUniqueness,
    language,
    setLanguage,
    userCommodities,
    setUserCommodities,
    activeSessionDate,
    setActiveSessionDate,
    autoRemoveParchiAfterPrint,
    setAutoRemoveParchiAfterPrint,
    parchiAuditLogs,
    setIsAuditTrailOpen,
    exportBackupJSON,
    importBackupJSON,
    farmers,
    lots,
    shipments,
    payments,
    settlements,
    helpTickets,
    resetAllData,
    clearTodayLotsForTesting,
    logoutCurrentUser,
    deleteCurrentAccount,
    changeUserPin,
    t,
  } = useMandi();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudMsg, setCloudMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change PIN State
  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState<boolean>(false);
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMsg(null);

    if (!currentPin) {
      setPinChangeMsg({ type: 'error', text: 'Please enter your current 6-digit PIN.' });
      return;
    }
    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinChangeMsg({ type: 'error', text: 'New PIN must be exactly 6 numeric digits.' });
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinChangeMsg({ type: 'error', text: 'New PINs do not match.' });
      return;
    }

    setIsSubmittingPin(true);
    const res = await changeUserPin(currentPin, newPin);
    setIsSubmittingPin(false);

    if (res.success) {
      sounds.playCashChime();
      setPinChangeMsg({ type: 'success', text: 'Security PIN updated successfully!' });
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
    } else {
      sounds.playTrashSound?.();
      setPinChangeMsg({ type: 'error', text: res.error || 'Failed to update PIN.' });
    }
  };

  const handleCloudBackup = async () => {
    setIsSyncing(true);
    setCloudMsg(null);
    const res = await syncLocalToSupabase({
      profile: merchantProfile,
      farmers,
      lots,
      shipments,
      payments,
      settlements,
      helpTickets,
    });
    setIsSyncing(false);
    if (res.success) {
      setCloudMsg({ type: 'success', text: 'Successfully backed up all records to Supabase!' });
      setTimeout(() => setCloudMsg(null), 4000);
    } else {
      setCloudMsg({ type: 'error', text: res.error || 'Failed to sync to Supabase' });
    }
  };

  const handleCloudRestore = async () => {
    if (!window.confirm('Restore records from Supabase? This will merge and update your local ledger.')) {
      return;
    }
    setIsSyncing(true);
    setCloudMsg(null);
    const cloudData = await fetchUserCloudData();
    setIsSyncing(false);
    if (!cloudData) {
      setCloudMsg({ type: 'error', text: 'No cloud records found or error reading Supabase' });
      return;
    }

    importBackupJSON(JSON.stringify(cloudData));
    setCloudMsg({ type: 'success', text: 'Successfully restored and updated data from Supabase!' });
    setTimeout(() => setCloudMsg(null), 4000);
  };

  const [formData, setFormData] = useState({
    ...merchantProfile,
    ownerName: merchantProfile.ownerName || '',
    photoUrl: merchantProfile.photoUrl || '',
  });
  const [selectedComms, setSelectedComms] = useState<CommodityCategory[]>(userCommodities);
  const [tempDate, setTempDate] = useState(activeSessionDate);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteProfileConfirmOpen, setIsDeleteProfileConfirmOpen] = useState(false);


  const handleConfirmDeleteProfile = () => {
    setIsDeleteProfileConfirmOpen(false);
    setIsSettingsOpen(false);
    sounds.tap();
    deleteCurrentAccount();
  };

  React.useEffect(() => {
    if (isSettingsOpen) {
      setFormData({
        ...merchantProfile,
        ownerName: merchantProfile.ownerName || '',
        photoUrl: merchantProfile.photoUrl || '',
      });
      setSelectedComms(userCommodities);
      setTempDate(activeSessionDate);
    }
  }, [isSettingsOpen, merchantProfile, userCommodities, activeSessionDate]);

  React.useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedComms.length === 0) {
      setValidationError('Please select at least one commodity category');
      return;
    }

    if (!formData.shopName.trim()) {
      setValidationError('Shop name is required');
      return;
    }

    if (formData.ownerName && /[0-9]/.test(formData.ownerName)) {
      setValidationError(language === 'te' ? 'యజమాని పేరులో అంకెలు ఉండకూడదు' : 'Owner name cannot contain numbers');
      return;
    }

    const cleanPhone = formData.phoneNumber.replace(/\D/g, '').slice(-10);
    if (formData.phoneNumber && cleanPhone.length !== 10) {
      setValidationError('Phone number must contain only numbers (exactly 10 digits)');
      return;
    }
    if (!formData.address.trim()) {
      setValidationError('Shop address is required');
      return;
    }

    // Verify uniqueness of shop name & address
    const uniqueness = checkUniqueness({
      shopName: formData.shopName.trim(),
      shopAddress: formData.address.trim(),
      excludePhone: currentUserPhone,
    });

    if (!uniqueness.valid) {
      setValidationError(uniqueness.message || 'Shop name and address must be unique');
      return;
    }

    setValidationError('');
    updateMerchantProfile(formData);
    setUserCommodities(selectedComms);
    setActiveSessionDate(tempDate);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importBackupJSON(content);
        if (success) {
          alert('Backup restored successfully!');
          setIsSettingsOpen(false);
        } else {
          setImportError('Invalid JSON format or corrupted backup file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    resetAllData();
    sounds.playTrashSound?.();
    setIsResetConfirmOpen(false);
    setIsSettingsOpen(false);
  };

  return (
    <div
      id="settings-modal-overlay"
      onClick={() => setIsSettingsOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <form
        id="settings-modal-dialog"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
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
              <h2 className="font-bold text-base sm:text-lg text-white leading-tight">
                {t('settingsTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-200/80 leading-none mt-0.5">
                {t('settingsSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-settings-modal-btn"
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0 space-y-6 bg-[#f8fafc]">
          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 text-xs font-black flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>✓ {language === 'te' ? 'ప్రొఫైల్ విజయవంతంగా సేవ్ చేయబడింది! (సేవ్ చేయబడిన ప్రొఫైల్)' : 'Profile saved successfully! Saved Profile.'}</span>
            </div>
          )}

          {validationError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Section 1: Merchant Profile */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <Store className="w-4 h-4" />
                <span>Adathiya Shop & Owner Profile</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsOwnerSignUpOpen(true);
                }}
                className="text-[11px] font-bold text-[#1a3a52] hover:underline flex items-center gap-1"
              >
                <span>Full Owner Sign-Up</span>
              </button>
            </div>

            {/* Photo of Owner */}
            <PhotoUploadPicker
              label={language === 'te' ? 'యజమాని ఫోటో' : 'Photo of Owner'}
              sublabel="Official photo for merchant registry, parchi prints, and farmer passbooks"
              currentPhotoUrl={formData.photoUrl}
              onChange={(url) => setFormData({ ...formData, photoUrl: url })}
              presetType="owner"
              idPrefix="settings-owner"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {language === 'te' ? 'యజమాని పూర్తి పేరు' : 'Owner Full Name'}
                </label>
                <input
                  id="setting-owner-name-input"
                  type="text"
                  required
                  placeholder="e.g. Ravi Kumar Reddy"
                  value={formData.ownerName}
                  onKeyDown={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                      setValidationError(language === 'te' ? 'యజమాని పేరులో అంకెలు ఉండకూడదు' : 'Owner name cannot contain numbers');
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const clean = e.clipboardData.getData('text').replace(/[0-9]/g, '');
                    setFormData({ ...formData, ownerName: clean });
                    setValidationError('');
                  }}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[0-9]/g, '');
                    setFormData({ ...formData, ownerName: clean });
                    setValidationError('');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {t('shopName')} *
                </label>
                <input
                  id="setting-shop-name-input"
                  type="text"
                  required
                  value={formData.shopName}
                  onChange={(e) => {
                    setFormData({ ...formData, shopName: e.target.value });
                    setValidationError('');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
                <span className="text-[10px] text-[#64748b] mt-0.5 block">
                  Must be unique across all shops
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {t('shopNumber')}
                </label>
                <input
                  id="setting-shop-number-input"
                  type="text"
                  required
                  value={formData.shopNumber}
                  onChange={(e) => setFormData({ ...formData, shopNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {t('marketYardName')}
                </label>
                <input
                  id="setting-market-name-input"
                  type="text"
                  required
                  value={formData.marketYardName}
                  onChange={(e) => setFormData({ ...formData, marketYardName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {t('merchantPhone')} (10 digits, numbers only)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-[#64748b] border-r border-[#e2e8f0] pr-2 pointer-events-none">
                    +91
                  </span>
                  <input
                    id="setting-phone-input"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={formData.phoneNumber.replace(/\D/g, '').slice(-10)}
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
                        setValidationError(language === 'te' ? 'ఫోన్ నంబరులో అంకెలు మాత్రమే ఉండాలి' : 'Phone number can only contain numbers');
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const clean = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phoneNumber: clean });
                      setValidationError('');
                    }}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phoneNumber: clean });
                      setValidationError('');
                    }}
                    className="w-full pl-12 pr-3 py-2 rounded-lg border border-[#e2e8f0] text-xs font-mono font-bold focus:outline-hidden focus:border-[#1a3a52] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {t('defaultCommissionRate')}
                </label>
                <div className="relative">
                  <input
                    id="setting-commission-input"
                    type="number"
                    min="0"
                    max="25"
                    step="0.5"
                    required
                    value={formData.defaultCommissionRate ?? 4}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultCommissionRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-bold"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-500 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {t('defaultExpenditureRate')}
                </label>
                <div className="relative">
                  <input
                    id="setting-expenditure-input"
                    type="number"
                    min="0"
                    max="25"
                    step="0.5"
                    required
                    value={formData.defaultExpenditureRate ?? 6}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultExpenditureRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-bold"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-500 font-bold">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                {t('shopAddress')} *
              </label>
              <input
                id="setting-address-input"
                type="text"
                required
                value={formData.address}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  setValidationError('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white"
              />
              <span className="text-[10px] text-[#64748b] mt-0.5 block">
                Cannot match another shop address
              </span>
            </div>
          </div>

          {/* Section 2: Selected Commodities You Work With */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <span>🌸</span>
                <span>Commodities Handled ({selectedComms.length} selected)</span>
              </h4>
              <button
                type="button"
                onClick={() => setSelectedComms(['flowers'])}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                  selectedComms.length === 1 && selectedComms[0] === 'flowers'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>🌸</span>
                <span>{language === 'te' ? 'పూల వ్యాపారం మాత్రమే (Flowers Only)' : 'Wholesale Flowers Only'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['flowers', 'grains', 'vegetables', 'fruits'] as CommodityCategory[]).map((cat) => {
                const cfg = COMMODITY_CONFIGS[cat];
                const isChecked = selectedComms.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        if (selectedComms.length === 1) return; // Keep at least one
                        setSelectedComms((prev) => prev.filter((c) => c !== cat));
                      } else {
                        setSelectedComms((prev) => [...prev, cat]);
                      }
                    }}
                    className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                      isChecked
                        ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm'
                        : 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#1e293b] border-[#e2e8f0]'
                    }`}
                  >
                    <span className="text-xl">{cfg.icon}</span>
                    <span className="font-bold">{cfg.name}</span>
                    <span className="text-[10px] opacity-80">
                      {isChecked ? '✓ Selected' : '+ Add'}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#64748b]">
              {language === 'te' 
                ? 'గమనిక: మీరు పూలు మాత్రమే విక్రయిస్తే "పూల వ్యాపారం మాత్రమే" ఎంచుకోండి. అప్పుడు మిగిలిన ధాన్యాలు/పప్పులు పూర్తిగా దాచబడతాయి.' 
                : 'Note: If you only deal with flowers, selecting "Wholesale Flowers Only" will hide all grain, pulses, and vegetable options across the entire system.'}
            </p>
          </div>

          {/* Section 3: Active Session Date */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5 border-b border-[#e2e8f0] pb-2">
              <Calendar className="w-4 h-4" />
              <span>Mandi Trading Session Date</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                Active Trading Date (Live Session)
              </label>
                <input
                  id="setting-date-input"
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
                <button
                  type="button"
                  onClick={() => setTempDate(getTodayDateString())}
                  className="mt-1 text-[11px] text-[#1a3a52] font-medium hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to today ({getTodayDateString()})</span>
                </button>
              </div>
            </div>

          {/* Section: Printing & Parchi Workflow */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <Printer className="w-4 h-4" />
                <span>{t('removeParchiAfterPrint')}</span>
              </h4>
              {parchiAuditLogs.length > 0 && (
                <button
                  type="button"
                  id="view-audit-trail-settings-btn"
                  onClick={() => setIsAuditTrailOpen(true)}
                  className="text-[11px] font-bold text-[#1a3a52] hover:underline flex items-center gap-1 bg-[#1a3a52]/10 px-2.5 py-1 rounded-md transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{t('viewAuditTrail')} ({parchiAuditLogs.length})</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1e293b]">
                    {t('autoRemoveToggleLabel')}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      autoRemoveParchiAfterPrint
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {autoRemoveParchiAfterPrint ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b] max-w-xl leading-relaxed">
                  {t('removeParchiAfterPrintDesc')}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  id="auto-remove-parchi-toggle"
                  type="checkbox"
                  checked={autoRemoveParchiAfterPrint}
                  onChange={(e) => setAutoRemoveParchiAfterPrint(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a3a52]"></div>
              </label>
            </div>
          </div>

          {/* Section: Change 6-Digit Security PIN */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#1a3a52]" />
                <span>Change 6-Digit Security PIN</span>
              </h4>
            </div>

            {pinChangeMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  pinChangeMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {pinChangeMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{pinChangeMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePinSubmit} className="space-y-3">
              <div>
                <label htmlFor="settings-current-pin" className="block text-xs font-bold text-[#1e293b] mb-1">
                  Current 6-Digit PIN *
                </label>
                <div className="relative">
                  <input
                    id="settings-current-pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter current 6-digit PIN"
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] font-mono text-sm focus:border-[#1a3a52] outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="settings-new-pin" className="block text-xs font-bold text-[#1e293b] mb-1">
                    New 6-Digit PIN *
                  </label>
                  <input
                    id="settings-new-pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="New 6-digit PIN"
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] font-mono text-sm focus:border-[#1a3a52] outline-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="settings-confirm-new-pin" className="block text-xs font-bold text-[#1e293b] mb-1">
                    Confirm New 6-Digit PIN *
                  </label>
                  <input
                    id="settings-confirm-new-pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Re-enter new PIN"
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] font-mono text-sm focus:border-[#1a3a52] outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-settings-change-pin"
                disabled={isSubmittingPin}
                className="px-4 py-2 rounded-lg bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingPin ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-[#d4af37]" />
                )}
                <span>Update Security PIN</span>
              </button>
            </form>
          </div>

          {/* Section: Firebase Cloud Storage & Database */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-[#1a3a52]" />
                <span>Supabase Cloud Database & Sync (PostgreSQL)</span>
              </h4>
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#eef3f7] text-[#1a3a52] font-semibold">
                <Database className="w-3 h-3" />
                <span>supabase-mandi-db</span>
              </span>
            </div>

            {/* Cloud Status Info */}
            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1e293b]">
                      Supabase Cloud Status:
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected to Supabase Cloud
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b]">
                    Your Mandi app is connected to Supabase PostgreSQL database for persistent cloud data and SMS OTP security.
                  </p>
                </div>
              </div>

              {cloudMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    cloudMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {cloudMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{cloudMsg.text}</span>
                </div>
              )}

              {/* Sync Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#e2e8f0]/60">
                <button
                  type="button"
                  id="backup-to-cloud-btn"
                  onClick={handleCloudBackup}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-lg bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] disabled:opacity-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {isSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-[#d4af37]" />
                  )}
                  <span>{isSyncing ? 'Syncing...' : 'Backup All Data to Supabase'}</span>
                </button>

                <button
                  type="button"
                  id="restore-from-cloud-btn"
                  onClick={handleCloudRestore}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-lg bg-white border border-[#e2e8f0] text-[#1e293b] text-xs font-semibold hover:bg-[#f1f5f9] disabled:opacity-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#1a3a52] ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Restore from Supabase</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Backup, Export & Reset */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5 border-b border-[#e2e8f0] pb-2">
              <Download className="w-4 h-4" />
              <span>{t('backupExportSection')}</span>
            </h4>

            {importError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                id="export-backup-btn"
                onClick={exportBackupJSON}
                className="px-3.5 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] text-xs font-semibold hover:bg-[#f1f5f9] transition flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#1a3a52]" />
                <span>{t('exportJSON')}</span>
              </button>

              <label
                htmlFor="import-backup-file"
                className="px-3.5 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] text-xs font-semibold hover:bg-[#f1f5f9] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>{t('importJSON')}</span>
                <input
                  id="import-backup-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                id="reset-ledger-btn"
                onClick={handleReset}
                className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 transition flex items-center gap-1.5 ml-auto"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t('resetLedger')}</span>
              </button>
            </div>
          </div>

          {/* Section 4: Account Session, Logout & Profile Deletion */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-red-200 shadow-2xs space-y-4 bg-red-50/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5 border-b border-red-200/60 pb-2">
              <LogOut className="w-4 h-4 text-red-600" />
              <span>{language === 'te' ? 'ఖాతా సెషన్ & ప్రొఫైల్ నిర్వహణ' : language === 'hi' ? 'खाता सत्र और प्रोफ़ाइल प्रबंधन' : 'Account Session & Profile Management'}</span>
            </h4>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-slate-800">
                  {merchantProfile.ownerName || 'Merchant'} • {currentUserPhone || merchantProfile.phoneNumber || 'Session User'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {language === 'te' 
                    ? 'ఈ పరికరం నుండి లాగ్ అవుట్ అవ్వండి మరియు ఖాతా ఎంపిక స్క్రీన్‌కు తిరిగి వెళ్లండి.' 
                    : 'Log out of this device and return to the role & account selection screen.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="settings-logout-btn"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    logoutCurrentUser();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer min-touch-target"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'te' ? 'లాగ్ అవుట్' : language === 'hi' ? 'लॉग आउट' : 'Log Out'}</span>
                </button>

                <button
                  type="button"
                  id="settings-delete-profile-btn"
                  onClick={() => setIsDeleteProfileConfirmOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer min-touch-target"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{language === 'te' ? 'ప్రొఫైల్ తొలగించండి' : language === 'hi' ? 'प्रोफ़ाइल हटाएं' : 'Delete Profile'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-red-100/50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-[11px] leading-relaxed">
                <span className="font-bold">
                  {language === 'te' ? 'తప్పుడు సమాచారం ఇచ్చారా లేదా పూల వ్యాపారమేనా?' : 'Entered wrong information or only sell flowers?'}
                </span>
                <p className="text-red-800">
                  {language === 'te'
                    ? 'మీరు మీ పేరు, చిరునామా లేదా వివరాలు మార్చాలనుకుంటే పై ఫారమ్‌లో సరిదిద్ది "సేవ్ చేయండి" నొక్కండి. పూర్తిగా కొత్తగా నమోదు కావాలంటే "ప్రొఫైల్ తొలగించండి" ఎంచుకోండి.'
                    : 'If you entered incorrect name, phone, or shop info, you can edit them above and tap "Save Settings". To permanently wipe this profile and start fresh, tap "Delete Profile".'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            id="cancel-settings-btn"
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#1e293b] hover:bg-slate-100 transition cursor-pointer min-touch-target"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            id="save-settings-btn"
            className="px-5 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center gap-1.5 shadow-2xs cursor-pointer min-touch-target"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('saveSettings')}</span>
          </button>
        </div>
      </form>

      <DeleteConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset All Mandi Ledger Data"
        itemName="All Merchant Data, Farmers & Transactions"
        itemDetails="This will reset all current session lots, custom farmer additions, payments, and generated reports back to default state."
        message="Are you sure you want to delete all current ledger data? This action is permanent."
        confirmText="CONFIRM DELETE & RESET"
        cancelText="CANCEL"
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      <DeleteConfirmModal
        isOpen={isDeleteProfileConfirmOpen}
        title={language === 'te' ? 'వ్యాపారి ప్రొఫైల్ & ఖాతా తొలగించండి' : 'Delete Merchant Profile & Account'}
        itemName={merchantProfile.shopName || merchantProfile.ownerName || 'Merchant Profile'}
        itemDetails={`${merchantProfile.phoneNumber || currentUserPhone} • ${merchantProfile.address || 'Market Yard'}`}
        message={
          language === 'te'
            ? 'ఈ ప్రొఫైల్ మరియు అన్ని అనుబంధ రికార్డులను శాశ్వతంగా తొలగించాలనుకుంటున్నారా? మీరు కొత్త ప్రొఫైల్‌తో లేదా పూల వ్యాపారిగా మళ్లీ నమోదు చేసుకోవచ్చు.'
            : 'Are you sure you want to permanently delete this profile and wipe account data from this device? You can register freshly with correct info or flowers-only trade.'
        }
        confirmText={language === 'te' ? 'అవును, ప్రొఫైల్ తొలగించు' : 'YES, DELETE PROFILE'}
        cancelText={language === 'te' ? 'రద్దు చేయి' : 'CANCEL'}
        onConfirm={handleConfirmDeleteProfile}
        onCancel={() => setIsDeleteProfileConfirmOpen(false)}
      />
    </div>
  );
};
