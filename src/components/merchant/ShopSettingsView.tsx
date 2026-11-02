import React, { useState } from 'react';
import {
  Store,
  User,
  ShieldCheck,
  QrCode,
  Settings,
  Save,
  CheckCircle2,
  Calendar,
  Globe,
  Database,
  Cloud,
  Headphones,
  Edit3,
  Percent,
  Coins,
  MapPin,
  Building,
  FileText,
  Smartphone,
  Check,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { useFirebase } from '../../context/FirebaseContext';
import { getLanguageInfo } from '../../data/indianLanguages';
import { COMMODITY_CONFIGS, ALL_COMMODITIES } from '../../data/initialData';
import { CommodityCategory } from '../../types';
import { PhotoUploadPicker } from '../common/PhotoUploadPicker';
import { QRModal } from '../common/QRModal';
import { sounds } from '../../utils/audio';

export const ShopSettingsView: React.FC = () => {
  const {
    merchantProfile,
    updateMerchantProfile,
    userCommodities,
    setUserCommodities,
    currentUserPhone,
    currentUserAccount,
    language,
    setIsOwnerSignUpOpen,
    setIsDateSwitcherOpen,
    setIsSettingsOpen,
    farmers,
    lots,
    shipments,
    t,
  } = useMandi();

  const { user, isSyncing, syncDataToCloud } = useFirebase();

  // Local Form State
  const [shopName, setShopName] = useState(merchantProfile.shopName || '');
  const [ownerName, setOwnerName] = useState(merchantProfile.ownerName || '');
  const [shopNumber, setShopNumber] = useState(merchantProfile.shopNumber || '');
  const [marketYardName, setMarketYardName] = useState(merchantProfile.marketYardName || '');
  const [licenseNumber, setLicenseNumber] = useState(merchantProfile.licenseNumber || '');
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(
    merchantProfile.defaultCommissionRate ?? 4
  );
  const [defaultLoadingChargePerUnit, setDefaultLoadingChargePerUnit] = useState<number>(
    merchantProfile.defaultLoadingChargePerUnit ?? 50
  );
  const [logoUrl, setLogoUrl] = useState(merchantProfile.logoUrl || '');
  const [selectedCommodities, setSelectedCommodities] = useState<CommodityCategory[]>(
    userCommodities && userCommodities.length > 0 ? userCommodities : ALL_COMMODITIES
  );

  const [isSaved, setIsSaved] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const toggleCommodity = (cat: CommodityCategory) => {
    sounds.playBidTick?.();
    if (selectedCommodities.includes(cat)) {
      if (selectedCommodities.length <= 1) {
        return; // Keep at least one
      }
      setSelectedCommodities(selectedCommodities.filter((c) => c !== cat));
    } else {
      setSelectedCommodities([...selectedCommodities, cat]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUserCommodities(selectedCommodities);
    const cleanYard = marketYardName.trim();
    const cleanShop = shopNumber.trim();
    const updatedAddress =
      merchantProfile.address &&
      merchantProfile.address.trim() &&
      !merchantProfile.address.toLowerCase().includes('gudimalkapur')
        ? merchantProfile.address
        : `${cleanShop ? `Shop No. ${cleanShop} • ` : ''}${cleanYard || 'Wholesale Market Yard'}`;

    updateMerchantProfile({
      shopName,
      ownerName,
      shopNumber: cleanShop,
      marketYardName: cleanYard,
      licenseNumber,
      defaultCommissionRate: Number(defaultCommissionRate),
      defaultLoadingChargePerUnit: Number(defaultLoadingChargePerUnit),
      logoUrl,
      selectedCommodities,
      address: updatedAddress,
    });
    sounds.playScaleBeep?.();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const currentLang = getLanguageInfo(language);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a3a52] via-[#244b6b] to-[#122839] rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-[#d4af37]" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {language === 'te'
                ? 'షాప్ సెట్టింగ్‌లు & వ్యాపారి వివరాలు'
                : language === 'hi'
                ? 'दुकान सेटिंग्स और व्यापारी जानकारी'
                : 'Shop Settings & Merchant Info'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            {merchantProfile.shopName || 'Mandi Commission Agency'} • License #{merchantProfile.licenseNumber || 'Verified'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsQRModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <QrCode className="w-4 h-4 text-[#d4af37]" />
            <span>Merchant QR Code</span>
          </button>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-5 h-5 shrink-0" />
          <span>Shop settings & merchant information updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION 1: Shop & Mandi Profile */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-[#eef3f7] flex items-center justify-center text-[#1a3a52]">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-800">
                {language === 'te' ? 'షాప్ వివరాలు' : 'Shop & Mandi Profile'}
              </h2>
              <span className="text-xs text-slate-500">Shop Profile & Firm Details</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="shop-name-input" className="block font-bold text-slate-700 mb-1">
                Shop / Firm Name *
              </label>
              <input
                id="shop-name-input"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Mandi Trading Co."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1a3a52] focus:outline-hidden font-semibold text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="shop-number-input" className="block font-bold text-slate-700 mb-1">
                  Shop / Stall Number
                </label>
                <input
                  id="shop-number-input"
                  type="text"
                  value={shopNumber}
                  onChange={(e) => setShopNumber(e.target.value)}
                  placeholder="e.g. Stall #14"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1a3a52] focus:outline-hidden font-mono font-semibold text-slate-800"
                />
              </div>

              <div>
                <label htmlFor="market-license-input" className="block font-bold text-slate-700 mb-1">
                  License Number
                </label>
                <input
                  id="market-license-input"
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. LIC/HYD/2026/8892"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1a3a52] focus:outline-hidden font-mono font-semibold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label htmlFor="market-market-input" className="block font-bold text-slate-700 mb-1">
                Market Yard Name
              </label>
              <input
                id="market-market-input"
                type="text"
                value={marketYardName}
                onChange={(e) => setMarketYardName(e.target.value)}
                placeholder="e.g. Wholesale Market Yard"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1a3a52] focus:outline-hidden font-semibold text-slate-800"
              />
            </div>

            <PhotoUploadPicker
              label="Shop Logo / Branding Banner"
              sublabel="Appears on digital Mandi Parchis and WhatsApp receipts"
              currentPhotoUrl={logoUrl}
              onChange={(url) => setLogoUrl(url)}
              presetType="owner"
              idPrefix="shop-settings"
            />
          </div>
        </div>

        {/* SECTION 2: Merchant / Owner Account Info */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#d4af37]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-800">
                {language === 'te' ? 'వ్యాపారి సమాచారం' : 'Merchant Info & Verified Profile'}
              </h2>
              <span className="text-xs text-slate-500">Trader Credentials & Authorized Signatory</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="owner-name-input" className="block font-bold text-slate-700 mb-1">
                Owner / Trader Name *
              </label>
              <input
                id="owner-name-input"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Ireddy"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1a3a52] focus:outline-hidden font-semibold text-slate-800"
                required
              />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Registered Phone:</span>
                <span className="font-mono font-bold text-[#1a3a52]">
                  {currentUserPhone || merchantProfile.phoneNumber || '9440826222'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Merchant ID:</span>
                <span className="font-mono font-bold text-slate-800">
                  {merchantProfile.merchantId || 'MND-HYD-9440'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Verification Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  ✓ Verified Mandi Adathiya
                </span>
              </div>
            </div>

            <div className="bg-[#FEF8ED] p-3.5 rounded-xl border border-[#d4af37]/40 space-y-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#1a3a52]" />
                <span className="font-bold text-[#1e293b]">Farmer Passbook Integration</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Farmers can scan your QR code or enter your Merchant ID (<strong>{merchantProfile.merchantId || 'MND-HYD-9440'}</strong>) to receive digital parchi receipts instantly.
              </p>
              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#122839] transition cursor-pointer"
              >
                View Merchant QR Code & Passbook Links
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2.5: Active Business Commodity Types */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 md:col-span-2">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#1a3a52]">
              <Store className="w-5 h-5 text-[#1a3a52]" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-800">
                My Active Business Commodity Types ({selectedCommodities.length} Selected)
              </h2>
              <span className="text-xs text-slate-500">
                Select all commodity produce categories you handle in your Mandi shop (Grains, Vegetables, Fruits, Flowers, Spices, etc.)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {ALL_COMMODITIES.map((catKey) => {
              const cfg = COMMODITY_CONFIGS[catKey];
              if (!cfg) return null;
              const isSelected = selectedCommodities.includes(catKey);

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => toggleCommodity(catKey)}
                  className={`p-3 rounded-xl border-2 text-left transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-touch-target ${
                    isSelected
                      ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-sm scale-[1.02]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className="text-2xl">{cfg.icon}</span>
                  <span className="font-extrabold text-xs leading-tight">{cfg.name}</span>
                  {isSelected ? (
                    <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-full">✓ Active</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">+ Click to Add</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Mandi Rates & Default Commission Rules */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 md:col-span-2">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-800">
                Default Mandi Commission Rates & Deduction Rules
              </h2>
              <span className="text-xs text-slate-500">Auto-filled whenever a new sale consignment lot is recorded</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="default-commission-input" className="block font-bold text-slate-700 mb-1">
                Default Mandi Commission Rate (%)
              </label>
              <div className="relative">
                <input
                  id="default-commission-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={defaultCommissionRate}
                  onChange={(e) => setDefaultCommissionRate(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1a3a52] focus:outline-hidden font-mono font-bold text-slate-800"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Standard Mandi commission is 4.0%</p>
            </div>

            <div>
              <label htmlFor="default-loading-input" className="block font-bold text-slate-700 mb-1">
                Default Hamali / Loading Charge (₹ per Bag / Box)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  id="default-loading-input"
                  type="number"
                  step="1"
                  min="0"
                  value={defaultLoadingChargePerUnit}
                  onChange={(e) => setDefaultLoadingChargePerUnit(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1a3a52] focus:outline-hidden font-mono font-bold text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Standard hamali charge is ₹50 per box/bag</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-[#1a3a52]" />
              <span>More Advanced Settings (Data Backup &amp; Reset)</span>
            </button>

            <button
              type="submit"
              id="save-shop-settings-btn"
              className="px-6 py-2.5 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition cursor-pointer shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-[#d4af37]" />
              <span>Save Shop Settings &amp; Merchant Info</span>
            </button>
          </div>
        </div>
      </form>

      {/* QR Modal */}
      <QRModal />
    </div>
  );
};
