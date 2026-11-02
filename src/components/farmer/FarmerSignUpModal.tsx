import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  UserPlus,
  Phone,
  MapPin,
  Check,
  Flower2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { PhotoUploadPicker } from '../common/PhotoUploadPicker';
import { flowerVarietiesData } from '../../translations';
import { Farmer } from '../../types';
import { validateIndianMobile, cleanIndianMobile } from '../../utils/phoneValidation';
import { checkCloudDuplicateFarmer } from '../../services/supabaseSync';

interface FarmerSignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newFarmer: Farmer) => void;
}

export const FarmerSignUpModal: React.FC<FarmerSignUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addFarmer, farmers, merchantProfile, currentUserPhone, language, t } = useMandi();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [crops, setCrops] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  const toggleCrop = (cropName: string) => {
    if (crops.includes(cropName)) {
      setCrops(crops.filter((c) => c !== cropName));
    } else {
      setCrops([...crops, cropName]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedVillage = village.trim() || 'Local Flower Belt';

    if (!trimmedName) {
      setErrorMessage('Farmer name is required');
      return;
    }

    if (/[0-9]/.test(trimmedName)) {
      setErrorMessage(language === 'te' ? 'రైతు పేరులో అంకెలు ఉండకూడదు' : 'Farmer name cannot contain numbers');
      return;
    }

    const phoneVal = validateIndianMobile(phone);
    if (!phoneVal.isValid) {
      setErrorMessage(phoneVal.error || 'Enter a valid 10-digit Indian mobile number');
      return;
    }
    const cleanPhone = phoneVal.cleanNumber;

    setErrorMessage('');
    const newFarmer = addFarmer({
      name: trimmedName,
      phone: cleanPhone,
      village: trimmedVillage,
      primaryCrops: crops,
      connectedMerchantIds: [merchantProfile.merchantId],
      photoUrl: photoUrl.trim() || '',
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSuccess?.(newFarmer);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="farmer-signup-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div
        id="farmer-signup-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
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
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white leading-tight">
                  Farmer Sign Up &amp; Mandi Khata Registration
                </h2>
                {language === 'te' && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#d4af37] text-[#1e293b]">
                    రైతు నమోదు
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-200/80 leading-none mt-0.5">
                Register grower identity with photo for transparent digital auctions and passbook
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-farmer-signup-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 flex flex-col">
          <div className="flex-1 p-5 sm:p-6 space-y-6 bg-[#f8fafc]">
            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Farmer registered successfully with photo and added to Mandi Khata!</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-start gap-2">
                <span className="text-red-600 font-bold">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

          {/* 1. Photo of Farmer */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>{language === 'te' ? 'దశ 1: రైతు ఫోటో' : 'Step 1: Photo of Farmer'}</span>
              </span>
            </div>

            <PhotoUploadPicker
              label="Farmer Profile Photo"
              sublabel="Upload photo from phone/PC, snap live with webcam, or choose an authentic portrait"
              currentPhotoUrl={photoUrl}
              onChange={(url) => setPhotoUrl(url)}
              presetType="farmer"
              idPrefix="farmer-signup"
            />
          </div>

          {/* 2. Farmer Personal Details */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5 border-b border-[#e2e8f0] pb-2">
              <UserPlus className="w-4 h-4" />
              <span>Step 2: Farmer Particulars</span>
            </span>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                  {language === 'te' ? 'రైతు పూర్తి పేరు *' : 'Farmer Full Name *'}
                </label>
                <input
                  id="farmer-signup-name-input"
                  type="text"
                  required
                  placeholder="e.g., Ramesh Reddy (letters only)"
                  value={name}
                  onKeyDown={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                      setErrorMessage(language === 'te' ? 'రైతు పేరులో అంకెలు ఉండకూడదు' : 'Farmer name cannot contain numbers');
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text').replace(/[0-9]/g, '');
                    if (/[0-9]/.test(e.clipboardData.getData('text'))) {
                      setErrorMessage(language === 'te' ? 'రైతు పేరులో అంకెలు ఉండకూడదు' : 'Farmer name cannot contain numbers');
                    }
                    setName(text);
                  }}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[0-9]/g, '');
                    setName(filtered);
                    if (/[0-9]/.test(e.target.value)) {
                      setErrorMessage(language === 'te' ? 'రైతు పేరులో అంకెలు ఉండకూడదు' : 'Farmer name cannot contain numbers');
                    } else {
                      setErrorMessage('');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                    Mobile / WhatsApp Number * (Numbers only)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs font-bold text-[#64748b] border-r border-[#e2e8f0] pr-2 pointer-events-none">
                      +91
                    </span>
                    <input
                      id="farmer-signup-phone-input"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      required
                      placeholder="9848123456"
                      value={phone}
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
                        setPhone(clean);
                        setErrorMessage('');
                      }}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhone(clean);
                        setErrorMessage('');
                      }}
                      className="w-full pl-12 pr-3 py-2 rounded-lg border border-[#e2e8f0] text-xs font-mono font-bold focus:outline-hidden focus:border-[#1a3a52] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1e293b] mb-1">
                    Village / Mandal / District *
                  </label>
                  <input
                    id="farmer-signup-village-input"
                    type="text"
                    required
                    placeholder="e.g., Shamshabad, R.R. Dist"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Primary Crops Grown */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-100/70 opacity-60 pointer-events-none space-y-3 cursor-not-allowed">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flower2 className="w-4 h-4 text-slate-400" />
                <span>Step 3: Primary Flower Crops Cultivated</span>
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Currently Disabled</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Select flower varieties brought to the mandi yard:
            </p>

            <div className="flex flex-wrap gap-2">
              {flowerVarietiesData.map((flower) => {
                const label = language === 'te' ? flower.te : language === 'hi' ? flower.hi : flower.en;
                const isSelected = crops.includes(flower.en);
                return (
                  <button
                    key={flower.id}
                    type="button"
                    disabled
                    onClick={() => toggleCrop(flower.en)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed ${
                      isSelected
                        ? 'bg-slate-400 text-white shadow-2xs'
                        : 'bg-slate-200 border border-slate-300 text-slate-500'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 opacity-50"
                      style={{ backgroundColor: flower.color }}
                    />
                    <span>{label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-slate-200" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Live Farmer Badge Preview */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#1a3a52] bg-[#f8fafc] shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name || 'Farmer'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#64748b]">
                  <User className="w-5 h-5 text-[#1a3a52]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1e293b] truncate">
                  {name || 'Farmer Name'}
                </span>
                <span className="px-1.5 py-0.2 bg-[#eef3f7] text-[#1a3a52] text-[10px] font-bold rounded">
                  New Member
                </span>
              </div>
              <div className="text-[11px] text-[#64748b] flex items-center gap-2">
                <span>📍 {village || 'Village Area'}</span>
                <span>•</span>
                <span>📞 {phone || 'Phone'}</span>
              </div>
              <div className="text-[10px] text-[#1a3a52] font-medium mt-0.5 truncate">
                Crops: {crops.join(', ')}
              </div>
            </div>
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            id="farmer-signup-cancel-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition min-touch-target cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            id="save-farmer-signup-btn"
            className="px-5 py-2.5 rounded-xl bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#122839] transition flex items-center gap-1.5 shadow-xs min-touch-target cursor-pointer"
          >
            <Check className="w-4 h-4 text-[#d4af37]" />
            <span>Complete Farmer Registration</span>
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};
