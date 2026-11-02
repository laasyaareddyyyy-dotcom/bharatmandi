import React, { useState, useMemo } from 'react';
import {
  Users,
  QrCode,
  BookOpen,
  ArrowUpRight,
  Printer,
  Share2,
  Calendar,
  Layers,
  Phone,
  Store,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Sparkles,
  User,
  UserPlus,
  Search,
  Send,
  ShieldCheck,
  Clock,
  Check,
  X,
  Receipt,
  TrendingUp,
  LogOut,
  Edit3,
  Trash2,
  Save,
  MapPin,
  Tag,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { CommodityCategory } from '../../types';
import { sounds } from '../../utils/audio';
import { FarmerParchiView } from './FarmerParchiView';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { PhotoUploadPicker } from '../common/PhotoUploadPicker';

const COMMODITY_TABS: { id: CommodityCategory; label: string; icon: string; nameTe: string }[] = [
  { id: 'flowers', label: 'Flowers', icon: '🌸', nameTe: 'పూలు (Flowers)' },
  { id: 'fruits', label: 'Fruits', icon: '🍎', nameTe: 'పండ్లు (Fruits)' },
  { id: 'vegetables', label: 'Vegetables', icon: '🥦', nameTe: 'కూరగాయలు (Vegetables)' },
  { id: 'grains', label: 'Grains & Pulses', icon: '🌾', nameTe: 'ధాన్యాలు (Grains)' },
];

export const FarmerPortalView: React.FC = () => {
  const {
    farmers,
    updateFarmer,
    lots,
    merchantProfile,
    setSelectedParchiLot,
    setIsQRModalOpen,
    setIsFarmerSignUpOpen,
    connectionRequests,
    acceptConnectionRequest,
    declineConnectionRequest,
    sendConnectionRequest,
    registeredAccounts,
    currentUserPhone,
    currentUserAccount,
    getSharedLotsForFarmer,
    activeFarmerId,
    setActiveFarmerId,
    logoutCurrentUser,
    deleteCurrentFarmerProfile,
    userCommodities,
    setUserCommodities,
    language,
    t,
  } = useMandi();

  const [activeTab, setActiveTab] = useState<'parchi' | 'khata' | 'search-merchants' | 'requests' | 'profile'>('parchi');
  const [searchMerchantQuery, setSearchMerchantQuery] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [isDeleteProfileOpen, setIsDeleteProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState({
    name: '',
    phone: '',
    village: '',
    crops: '',
    photoUrl: '',
  });
  const [profileError, setProfileError] = useState('');

  // Determine the current active farmer identity
  // If user is logged in as a registered farmer, use their profile
  const registeredFarmerAccount = registeredAccounts.find(
    (a) =>
      a.role === 'farmer' &&
      a.phoneNumber.replace(/\D/g, '').slice(-10) === currentUserPhone.replace(/\D/g, '').slice(-10)
  );

  const currentFarmer = useMemo(() => {
    const cleanUserPhone = currentUserPhone ? currentUserPhone.replace(/\D/g, '').slice(-10) : '';

    if (registeredFarmerAccount) {
      return {
        id: registeredFarmerAccount.id,
        name: registeredFarmerAccount.fullName,
        phone: registeredFarmerAccount.phoneNumber ? registeredFarmerAccount.phoneNumber.replace(/\D/g, '').slice(-10) : cleanUserPhone,
        village: registeredFarmerAccount.shopOrVillage || 'Mandi Area',
        primaryCrops: registeredFarmerAccount.licenseOrCrop
          ? [registeredFarmerAccount.licenseOrCrop]
          : [],
        photoUrl: registeredFarmerAccount.photoUrl,
        connectedMerchantIds: merchantProfile.merchantId ? [merchantProfile.merchantId] : [],
        createdAt: registeredFarmerAccount.createdAt,
      };
    }

    // Look for farmer in farmers directory matching cleanUserPhone
    if (cleanUserPhone) {
      const matchByPhone = farmers.find(
        (f) => f.phone && f.phone.replace(/\D/g, '').slice(-10) === cleanUserPhone
      );
      if (matchByPhone) {
        return matchByPhone;
      }
    }

    // Match by activeFarmerId
    if (activeFarmerId) {
      const matchById = farmers.find((f) => f.id === activeFarmerId);
      if (matchById) return matchById;
    }

    // Fallback farmer profile tied to cleanUserPhone
    if (cleanUserPhone) {
      return {
        id: `FM-${cleanUserPhone.slice(-4)}`,
        name: `Farmer (+91 ${cleanUserPhone})`,
        phone: cleanUserPhone,
        village: 'Mandi Area',
        primaryCrops: ['Flowers'],
        connectedMerchantIds: merchantProfile.merchantId ? [merchantProfile.merchantId] : [],
        createdAt: new Date().toISOString().split('T')[0],
      };
    }

    return farmers[0] || null;
  }, [registeredFarmerAccount, farmers, activeFarmerId, currentUserPhone, merchantProfile.merchantId]);

  // Enabled crop categories dynamically built from profile selection
  const enabledCategories = useMemo<CommodityCategory[]>(() => {
    if (registeredFarmerAccount?.selectedCommodities && registeredFarmerAccount.selectedCommodities.length > 0) {
      return registeredFarmerAccount.selectedCommodities;
    }
    if (currentFarmer?.commoditiesGrown && currentFarmer.commoditiesGrown.length > 0) {
      return currentFarmer.commoditiesGrown;
    }
    if (userCommodities && userCommodities.length > 0) {
      return userCommodities;
    }
    return ['flowers'];
  }, [registeredFarmerAccount, currentFarmer, userCommodities]);

  const [selectedCategory, setSelectedCategory] = useState<CommodityCategory>(enabledCategories[0] || 'flowers');

  React.useEffect(() => {
    if (!enabledCategories.includes(selectedCategory)) {
      setSelectedCategory(enabledCategories[0] || 'flowers');
    }
  }, [enabledCategories, selectedCategory]);

  const cleanFarmerPhone = useMemo(() => {
    if (currentUserPhone) {
      const clean = currentUserPhone.replace(/\D/g, '').slice(-10);
      if (clean && clean.length === 10) return clean;
    }
    if (currentFarmer?.phone) {
      const clean = currentFarmer.phone.replace(/\D/g, '').slice(-10);
      if (clean && clean.length === 10) return clean;
    }
    return '';
  }, [currentUserPhone, currentFarmer?.phone]);

  // Get shared lots ONLY for this specific farmer (Strict Isolation Guarantee!)
  const farmerLots = useMemo(() => {
    if (!cleanFarmerPhone && !currentFarmer) return [];
    return getSharedLotsForFarmer(cleanFarmerPhone, currentFarmer?.name || '', currentFarmer?.id);
  }, [getSharedLotsForFarmer, cleanFarmerPhone, currentFarmer]);

  // Connection requests involving this farmer
  const farmerRequests = useMemo(() => {
    if (!cleanFarmerPhone) return [];
    return connectionRequests.filter(
      (r) => r.farmerPhone.replace(/\D/g, '').slice(-10) === cleanFarmerPhone
    );
  }, [connectionRequests, cleanFarmerPhone]);

  const incomingRequestsFromMerchants = useMemo(() => {
    return farmerRequests.filter((r) => r.senderRole === 'merchant' && r.status === 'pending');
  }, [farmerRequests]);

  const outgoingFarmerRequests = useMemo(() => {
    return farmerRequests.filter((r) => r.senderRole === 'farmer');
  }, [farmerRequests]);

  const acceptedMerchants = useMemo(() => {
    return farmerRequests.filter((r) => r.status === 'accepted');
  }, [farmerRequests]);

  // Searchable Merchants across the Mandi network
  const networkMerchants = useMemo(() => {
    const list: {
      merchantId: string;
      shopName: string;
      ownerName: string;
      phoneNumber: string;
      shopNumber: string;
      marketYardName: string;
      photoUrl?: string;
      commissionRate: number;
    }[] = [];

    const seenPhones = new Set<string>();

    // 1. Registered accounts with role 'merchant'
    registeredAccounts
      .filter((a) => a.role === 'merchant')
      .forEach((a) => {
        const clean = a.phoneNumber ? a.phoneNumber.replace(/\D/g, '').slice(-10) : '';
        if (clean && !seenPhones.has(clean)) {
          seenPhones.add(clean);
          list.push({
            merchantId: `MANDI-${clean.slice(-4)}`,
            shopName: a.shopOrVillage || 'Mandi Merchant',
            ownerName: a.fullName,
            phoneNumber: clean,
            shopNumber: a.shopNumber || '',
            marketYardName: a.marketName || 'Gudimalkapur Flower Market Yard',
            photoUrl: a.photoUrl,
            commissionRate: 4,
          });
        }
      });

    // 2. Active Merchant Profile
    const cleanActivePhone = merchantProfile.phoneNumber
      ? merchantProfile.phoneNumber.replace(/\D/g, '').slice(-10)
      : '';

    if (cleanActivePhone && !seenPhones.has(cleanActivePhone)) {
      seenPhones.add(cleanActivePhone);
      list.push({
        merchantId: merchantProfile.merchantId,
        shopName: merchantProfile.shopName || 'Mandi Merchant',
        ownerName: merchantProfile.ownerName || 'Commission Merchant',
        phoneNumber: cleanActivePhone,
        shopNumber: merchantProfile.shopNumber || '',
        marketYardName: merchantProfile.marketYardName || 'Gudimalkapur Flower Market Yard',
        photoUrl: merchantProfile.photoUrl,
        commissionRate: merchantProfile.defaultCommissionRate || 4,
      });
    }

    const q = searchMerchantQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.shopName.toLowerCase().includes(q) ||
        m.ownerName.toLowerCase().includes(q) ||
        m.marketYardName.toLowerCase().includes(q) ||
        m.phoneNumber.includes(q) ||
        m.shopNumber.toLowerCase().includes(q)
    );
  }, [registeredAccounts, merchantProfile, searchMerchantQuery]);

  // Handle Send Connection Request from Farmer to Merchant
  const handleSendRequestToMerchant = (m: {
    merchantId: string;
    shopName: string;
    ownerName: string;
    phoneNumber: string;
  }) => {
    sendConnectionRequest({
      senderRole: 'farmer',
      farmerId: currentFarmer.id,
      farmerName: currentFarmer.name,
      farmerPhone: cleanFarmerPhone,
      farmerVillage: currentFarmer.village,
      merchantId: m.merchantId,
      merchantName: m.shopName,
      merchantPhone: m.phoneNumber,
      merchantOwnerName: m.ownerName,
    });

    setNotificationMsg(
      `✓ Connection request sent to ${m.shopName}! When the merchant accepts, your parchi records and settlements will automatically sync here.`
    );
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleAcceptMerchantRequest = (reqId: string, shopName: string) => {
    acceptConnectionRequest(reqId);
    setNotificationMsg(
      `✓ Connection accepted with ${shopName}! Only your specific flower parchi records and settlements are shared.`
    );
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleDeclineRequest = (reqId: string) => {
    declineConnectionRequest(reqId);
    setNotificationMsg('Request declined.');
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Financial calculations strictly for selected crop category (or all lots if none match category filter)
  const categoryFarmerLots = useMemo(() => {
    const filtered = farmerLots.filter((l) => (l.commodityCategory || 'flowers') === selectedCategory);
    if (filtered.length === 0 && farmerLots.length > 0) {
      return farmerLots;
    }
    return filtered;
  }, [farmerLots, selectedCategory]);

  const totalVolume = categoryFarmerLots.reduce((acc, l) => acc + l.quantity, 0);
  const totalGross = categoryFarmerLots.reduce((acc, l) => acc + l.grossTotal, 0);
  const totalCommissionDeducted = categoryFarmerLots.reduce((acc, l) => acc + l.commissionAmount, 0);
  const totalOtherDeducted = categoryFarmerLots.reduce((acc, l) => acc + l.totalOtherExpenditures, 0);
  const totalNet = categoryFarmerLots.reduce((acc, l) => acc + l.farmerNetPayable, 0);
  const totalPaid = categoryFarmerLots.reduce((acc, l) => acc + l.amountPaid, 0);
  const totalDue = categoryFarmerLots.reduce((acc, l) => acc + l.balanceDue, 0);

  return (
    <div className="space-y-6">
      {/* Farmer Profile Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#1a3a52] bg-[#f8fafc] shrink-0 shadow-2xs">
              {currentFarmer?.photoUrl ? (
                <img
                  src={currentFarmer.photoUrl}
                  alt={currentFarmer.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#eef3f7] text-[#1a3a52] font-black text-lg">
                  {currentFarmer?.name.charAt(0) || '🌾'}
                </div>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider block">
                {language === 'hi' ? 'किसान डिजिटल पासबुक' : 'Farmer Digital Passbook'}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-[#1e293b]">
                  {currentFarmer?.name || (cleanFarmerPhone ? `Farmer (+91 ${cleanFarmerPhone})` : 'Farmer Passbook')}
                </h2>
                {currentFarmer?.village && (
                  <span className="text-xs text-[#64748b] font-medium">📍 {currentFarmer.village}</span>
                )}
                {cleanFarmerPhone && (
                  <span className="font-mono text-xs font-semibold text-[#1a3a52] bg-[#eef3f7] px-2 py-0.5 rounded-md">
                    +91 {cleanFarmerPhone}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#1a3a52] font-medium mt-0.5">
                Primary Crops: {currentFarmer?.primaryCrops && currentFarmer.primaryCrops.length > 0 ? currentFarmer.primaryCrops.join(', ') : 'None specified'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* If not logged in as a farmer, show switch grower for testing/demo */}
            {!registeredFarmerAccount && farmers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-[#64748b] font-medium whitespace-nowrap">
                  Switch Grower:
                </label>
                <select
                  id="switch-farmer-select"
                  value={activeFarmerId || farmers[0]?.id}
                  onChange={(e) => setActiveFarmerId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-bold bg-[#f8fafc] text-[#1e293b] cursor-pointer"
                >
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.village})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Global Notification Banner */}
        {notificationMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
            <button onClick={() => setNotificationMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] pt-1 overflow-x-auto">
          <button
            type="button"
            id="farmer-tab-parchi"
            onClick={() => setActiveTab('parchi')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'parchi'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-[#eef3f7]/50 rounded-t-xl'
                : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{language === 'te' ? 'పర్చీ రసీదులు' : 'Parchi Receipts'}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#1a3a52] text-white text-[10px] font-mono font-bold">
              {farmerLots.length}
            </span>
          </button>

          <button
            type="button"
            id="farmer-tab-khata"
            onClick={() => setActiveTab('khata')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'khata'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-[#eef3f7]/50 rounded-t-xl'
                : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{language === 'te' ? 'నా మండి ఖాతా' : 'My Mandi Khata'}</span>
          </button>

          <button
            type="button"
            id="farmer-tab-search-merchants"
            onClick={() => setActiveTab('search-merchants')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'search-merchants'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-[#eef3f7]/50 rounded-t-xl'
                : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>{language === 'te' ? 'మండి వ్యాపారుల శోధన' : 'Search Mandi Merchants'}</span>
          </button>

          <button
            type="button"
            id="farmer-tab-requests"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'requests'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-[#eef3f7]/50 rounded-t-xl'
                : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Requests &amp; Connected Shops</span>
            {incomingRequestsFromMerchants.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold animate-pulse">
                {incomingRequestsFromMerchants.length} new
              </span>
            )}
          </button>

          <button
            type="button"
            id="farmer-tab-profile"
            onClick={() => {
              if (currentFarmer) {
                setProfileEditForm({
                  name: currentFarmer.name || '',
                  phone: cleanFarmerPhone || '',
                  village: currentFarmer.village || '',
                  crops: currentFarmer.primaryCrops ? currentFarmer.primaryCrops.join(', ') : '',
                  photoUrl: currentFarmer.photoUrl || '',
                });
              }
              setActiveTab('profile');
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#1a3a52] text-[#1a3a52] bg-[#eef3f7]/50 rounded-t-xl'
                : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{language === 'te' ? 'నా ప్రొఫైల్ & వివరాలు' : 'My Profile & Account'}</span>
          </button>
        </div>

        {/* Data Isolation Guarantee Banner */}
        <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#64748b] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1a3a52] shrink-0" />
          <span>
            <strong>Secure Data Privacy:</strong> Only your flower parchi slips, auction rates, and payment settlements with your connected merchants are shared here. No other farmer&apos;s details are accessible to you, and other farmers cannot see your data.
          </span>
        </div>
      </div>

      {/* DYNAMIC MULTI-CROP CATEGORY SWITCHER BAR (Only visible if farmer has enabled > 1 category) */}
      {enabledCategories.length > 1 && (activeTab === 'parchi' || activeTab === 'khata') && (
        <div className="bg-[#f8fafc] p-2 rounded-2xl border border-[#e2e8f0] flex items-center gap-2 overflow-x-auto shadow-2xs">
          <span className="text-[11px] font-black text-[#1a3a52] uppercase tracking-wider px-2 shrink-0">
            {language === 'te' ? 'పంట వర్గం:' : 'Crop Category:'}
          </span>
          {COMMODITY_TABS.filter((tab) => enabledCategories.includes(tab.id)).map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`farmer-category-switcher-${tab.id}`}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 min-touch-target ${
                  isSelected
                    ? 'bg-[#1a3a52] text-white shadow-2xs'
                    : 'bg-white text-[#1e293b] hover:bg-[#eef3f7] border border-[#e2e8f0]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{language === 'te' ? tab.nameTe : tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* TAB: Parchi (Daily / Monthly) */}
      {activeTab === 'parchi' && (
        <FarmerParchiView
          farmerId={currentFarmer.id}
          farmerPhone={cleanFarmerPhone}
          farmerName={currentFarmer.name}
          farmerLots={categoryFarmerLots}
        />
      )}

      {/* TAB 1: My Mandi Khata */}
      {activeTab === 'khata' && (
        <div className="space-y-6">
          {/* Connected Merchant Card */}
          <div className="bg-gradient-to-r from-[#1a3a52] to-[#122839] text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#d4af37] bg-white/10 shrink-0 shadow-md">
                {merchantProfile.photoUrl ? (
                  <img
                    src={merchantProfile.photoUrl}
                    alt={merchantProfile.ownerName || merchantProfile.shopName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#d4af37]">
                    <Store className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] tracking-wider uppercase mb-0.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Connected Commission Merchant • Data Sharing Active</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black">{merchantProfile.shopName || 'Mandi Commission Merchant'}</h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Owner: <strong className="text-[#d4af37]">{merchantProfile.ownerName || 'Merchant'}</strong> {merchantProfile.shopNumber ? `• ${merchantProfile.shopNumber}` : ''} {merchantProfile.marketYardName ? `• ${merchantProfile.marketYardName}` : ''}
                </p>
                <div className="text-[11px] text-white/70 mt-0.5 font-mono">
                  Phone: {merchantProfile.phoneNumber ? `+91 ${merchantProfile.phoneNumber}` : 'Not configured'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                id="farmer-view-qr-btn"
                onClick={() => setIsQRModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-white text-[#1a3a52] font-bold text-xs hover:bg-white/90 transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#d4af37]" />
                <span>Shop QR Code</span>
              </button>
            </div>
          </div>

          {/* Passbook Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b] block">
                Total Flower Volume
              </span>
              <div className="text-2xl font-black text-[#1e293b] mt-2">
                {totalVolume.toLocaleString('en-IN')} <span className="text-sm font-semibold text-[#64748b]">units/kgs</span>
              </div>
              <span className="text-xs text-[#1a3a52] font-medium mt-1 block">
                Across {categoryFarmerLots.length} sales lots
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b] block">
                Gross Auction Earnings
              </span>
              <div className="text-2xl font-black text-[#1e293b] mt-2">
                ₹{totalGross.toLocaleString('en-IN')}
              </div>
              <span className="text-xs text-[#64748b] mt-1 block">
                Comm: ₹{totalCommissionDeducted} • Exp: ₹{totalOtherDeducted}
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b] block">
                Total Received (Paid)
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                ₹{totalPaid.toLocaleString('en-IN')}
              </div>
              <span className="text-xs text-emerald-800/80 font-medium mt-1 block">
                Cash, PhonePe &amp; UPI settlements
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b] block">
                Pending Balance
              </span>
              <div
                className={`text-2xl font-black mt-2 ${
                  totalDue > 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                ₹{totalDue.toLocaleString('en-IN')}
              </div>
              <span className="text-xs text-[#64748b] mt-1 block font-semibold">
                {totalDue > 0 ? 'Due from Commission Merchant' : 'Settled ✓ (All dues cleared)'}
              </span>
            </div>
          </div>

          {/* Farmer Digital Passbook Lots List */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs overflow-hidden space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#1e293b] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#1a3a52]" />
                  <span>Digital Mandi Parchi Passbook ({categoryFarmerLots.length})</span>
                </h3>
                <p className="text-xs text-[#64748b]">
                  Transparent realtime record of all parchi lots brought by {currentFarmer.name}.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#eef3f7] text-[#1a3a52] font-mono font-bold text-xs">
                {categoryFarmerLots.length} slips
              </span>
            </div>

            {categoryFarmerLots.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#64748b] space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#eef3f7] text-[#1a3a52] flex items-center justify-center mx-auto text-2xl">
                  🌸
                </div>
                <h4 className="font-bold text-sm text-[#1e293b]">No Parchi Records Logged Yet for {currentFarmer.name}</h4>
                <p className="max-w-md mx-auto">
                  When your connected merchant records an arrival lot in the Mandi, your official slip and payment status will appear here in real-time.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('search-merchants')}
                  className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Search className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Search More Mandi Merchants</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {[...categoryFarmerLots].reverse().map((lot) => {
                  const isSettled = lot.paymentStatus === 'Paid' || lot.balanceDue === 0;
                  const isPartial = lot.paymentStatus === 'Partial' || (lot.amountPaid > 0 && lot.balanceDue > 0);

                  return (
                    <div
                      key={lot.id}
                      id={`farmer-lot-slip-${lot.id}`}
                      className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#1a3a52]/40 transition space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#1a3a52] bg-white px-2.5 py-1 rounded border border-[#e2e8f0]">
                            {lot.parchiNumber}
                          </span>
                          <span className="text-[#64748b]">
                            {lot.date} • {lot.time}
                          </span>
                          {lot.merchantName && (
                            <span className="text-[11px] text-[#1a3a52] font-medium bg-emerald-50 px-2 py-0.5 rounded">
                              🏪 {lot.merchantName}
                            </span>
                          )}
                        </div>

                        {/* Automatic Settled Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                            isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isSettled ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                            </>
                          ) : isPartial ? (
                            <>
                              <Clock className="w-3.5 h-3.5" /> Partially Paid (Due: ₹{lot.balanceDue})
                            </>
                          ) : (
                            `Due ₹${lot.balanceDue}`
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                            Crop Variety
                          </span>
                          <span className="font-bold text-sm text-[#1e293b]">
                            🌸 {lot.flowerVariety}
                          </span>
                          <span className="text-[11px] text-[#1a3a52] block font-semibold">
                            {lot.quantity} {lot.unit} @ ₹{lot.rate}/{lot.unit}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                            Gross &amp; Deductions
                          </span>
                          <span className="font-mono text-xs text-[#1e293b] block">
                            Gross: ₹{lot.grossTotal}
                          </span>
                          <span className="text-[10px] text-[#64748b] block">
                            Comm: ₹{lot.commissionAmount} • Other Exp: ₹{lot.totalOtherExpenditures}
                          </span>
                        </div>

                        <div className="sm:text-right">
                          <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                            Farmer Net Amount
                          </span>
                          <span className="font-mono font-black text-base text-[#1e293b] block">
                            ₹{lot.farmerNetPayable.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-emerald-700 block">
                            Paid: ₹{lot.amountPaid}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                        <button
                          onClick={() => setSelectedParchiLot(lot)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#122839] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>{language === 'te' ? 'మండి రసీదు' : 'View Mandi Slip'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Search Mandi Merchants */}
      {activeTab === 'search-merchants' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#1e293b] flex items-center gap-2">
                <Store className="w-5 h-5 text-[#1a3a52]" />
                <span>
                  {language === 'te'
                    ? 'హోల్‌సేల్ వ్యాపారుల శోధన'
                    : 'Search Mandi Commission Merchants'}
                </span>
              </h3>
              <p className="text-xs text-[#64748b]">
                Find licensed flower commission agents in Gudimalkapur, Shamshabad, or regional Mandi yards. Send a connection request to link your passbook.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748b]" />
              <input
                id="search-merchant-input"
                type="text"
                placeholder="Search by shop name, owner name, mandi yard, phone number..."
                value={searchMerchantQuery}
                onChange={(e) => setSearchMerchantQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-[#f8fafc]"
              />
            </div>
          </div>

          {/* Merchants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {networkMerchants.map((m) => {
              const cleanPhone = m.phoneNumber.replace(/\D/g, '').slice(-10);

              const isAccepted = acceptedMerchants.some(
                (r) =>
                  r.merchantId === m.merchantId ||
                  (r.merchantPhone && r.merchantPhone.replace(/\D/g, '').slice(-10) === cleanPhone)
              );

              const isPendingSent = outgoingFarmerRequests.some(
                (r) =>
                  r.status === 'pending' &&
                  (r.merchantId === m.merchantId ||
                    (r.merchantPhone && r.merchantPhone.replace(/\D/g, '').slice(-10) === cleanPhone))
              );

              const incomingReq = incomingRequestsFromMerchants.find(
                (r) =>
                  r.merchantId === m.merchantId ||
                  (r.merchantPhone && r.merchantPhone.replace(/\D/g, '').slice(-10) === cleanPhone)
              );

              return (
                <div
                  key={m.merchantId}
                  id={`merchant-card-${m.merchantId}`}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2e8f0] shadow-2xs hover:shadow-xs transition space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#1a3a52] bg-[#f8fafc] shrink-0">
                        {m.photoUrl ? (
                          <img
                            src={m.photoUrl}
                            alt={m.shopName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#eef3f7] text-[#1a3a52]">
                            <Store className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-[#1e293b]">
                          {m.shopName}
                        </h4>
                        <p className="text-xs text-[#64748b]">
                          Owner: <strong>{m.ownerName}</strong>
                        </p>
                        <p className="text-[11px] text-[#64748b] mt-0.5">
                          📍 {m.shopNumber}, {m.marketYardName}
                        </p>
                        <p className="text-[11px] font-mono text-[#1a3a52] font-bold mt-0.5">
                          📞 +91 {cleanPhone}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[11px] flex justify-between text-[#64748b]">
                      <span>Standard Commission:</span>
                      <span className="font-bold text-[#1e293b]">{m.commissionRate}% Mandi</span>
                    </div>
                  </div>

                  {/* Status / Connect Button */}
                  <div className="pt-2 border-t border-[#f1f5f9]">
                    {isAccepted ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Connected (Data Shared)
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('khata')}
                          className="text-xs font-bold text-[#1a3a52] hover:underline"
                        >
                          View Passbook →
                        </button>
                      </div>
                    ) : incomingReq ? (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-800 block">
                          Merchant invited you to connect!
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptMerchantRequest(incomingReq.id, m.shopName)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839]"
                          >
                            Accept Connection
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineRequest(incomingReq.id)}
                            className="py-1.5 px-2.5 rounded-lg border border-gray-300 text-xs text-[#64748b]"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : isPendingSent ? (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 block text-center">
                        ⏳ Request Sent (Awaiting Merchant Approval)
                      </span>
                    ) : (
                      <button
                        type="button"
                        id={`send-farmer-req-btn-${m.merchantId}`}
                        onClick={() => handleSendRequestToMerchant(m)}
                        className="w-full py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>{language === 'te' ? 'రిక్వెస్ట్ పంపండి' : 'Send Connection Request'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Requests & Connected Shops */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming Requests from Merchants */}
          <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#1e293b] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1a3a52]" />
                  <span>Connected Merchants ({acceptedMerchants.length})</span>
                </h3>
                <p className="text-xs text-[#64748b]">
                  Merchants who want to link your passbook. When accepted, only your specific parchi records and payments will be shared with them.
                </p>
              </div>
            </div>

            {incomingRequestsFromMerchants.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748b]">
                No pending incoming requests from merchants.
              </div>
            ) : (
              <div className="space-y-3">
                {incomingRequestsFromMerchants.map((req) => (
                  <div
                    key={req.id}
                    id={`farmer-incoming-req-${req.id}`}
                    className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1e293b]">{req.merchantName}</span>
                        {req.merchantOwnerName && (
                          <span className="text-xs text-[#64748b]">Owner: {req.merchantOwnerName}</span>
                        )}
                      </div>
                      {req.merchantPhone && (
                        <span className="font-mono text-xs text-[#1a3a52] block">
                          Phone: +91 {req.merchantPhone}
                        </span>
                      )}
                      <span className="text-[10px] text-[#64748b] block">
                        Received on: {req.requestDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptMerchantRequest(req.id, req.merchantName)}
                        className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Accept &amp; Share Data</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(req.id)}
                        className="px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] text-[#64748b] text-xs font-semibold hover:bg-gray-100"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Requests Sent by Farmer */}
          <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-[#1e293b] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#1a3a52]" />
              <span>Connection Requests You Sent ({outgoingFarmerRequests.length})</span>
            </h3>

            {outgoingFarmerRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748b]">
                You haven&apos;t sent any connection requests yet. Use &quot;Search Mandi Merchants&quot; to connect with your commission agent.
              </div>
            ) : (
              <div className="space-y-3">
                {outgoingFarmerRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#1e293b] block">{req.merchantName}</span>
                      <span className="text-[11px] text-[#64748b]">Sent on: {req.requestDate}</span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'declined'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status === 'accepted'
                        ? '✓ Connected & Data Shared'
                        : req.status === 'declined'
                        ? 'Declined'
                        : '⏳ Pending Approval'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Farmer Profile & Account Management */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Overview Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#1a3a52] bg-[#f8fafc] shrink-0 shadow-sm">
                  {currentFarmer?.photoUrl ? (
                    <img
                      src={currentFarmer.photoUrl}
                      alt={currentFarmer.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#eef3f7] text-[#1a3a52] font-black text-2xl">
                      {currentFarmer?.name.charAt(0) || '🌸'}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#1e293b]">
                    {currentFarmer?.name || 'Farmer'}
                  </h3>
                  <p className="text-xs text-[#64748b] flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#1a3a52]" />
                    <span>{currentFarmer?.village || 'Village / Town'}</span>
                    <span>•</span>
                    <Phone className="w-3.5 h-3.5 text-[#1a3a52]" />
                    <span className="font-mono">+91 {cleanFarmerPhone || 'Not set'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="farmer-edit-profile-btn"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-touch-target ${
                    isEditingProfile
                      ? 'bg-[#1a3a52] text-white'
                      : 'bg-[#f8fafc] hover:bg-[#eef3f7] text-[#1a3a52] border border-[#e2e8f0]'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingProfile ? 'Cancel Editing' : 'Edit Profile Details'}</span>
                </button>
              </div>
            </div>

            {/* If in edit mode */}
            {isEditingProfile ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setProfileError('');
                  const cleanName = profileEditForm.name.replace(/[0-9]/g, '').trim();
                  if (!cleanName) {
                    setProfileError('Please enter a valid farmer name without digits');
                    return;
                  }
                  const cleanDigits = profileEditForm.phone.replace(/\D/g, '').slice(-10);
                  if (cleanDigits.length < 10) {
                    setProfileError('Please enter a valid 10-digit mobile number');
                    return;
                  }

                  if (currentFarmer?.id) {
                    const cropArr = profileEditForm.crops
                      .split(',')
                      .map((c) => c.trim())
                      .filter(Boolean);

                    updateFarmer(currentFarmer.id, {
                      name: cleanName,
                      phone: cleanDigits,
                      village: profileEditForm.village.trim(),
                      primaryCrops: cropArr.length > 0 ? cropArr : ['Jasmine / Jasmine flowers'],
                      photoUrl: profileEditForm.photoUrl || currentFarmer.photoUrl,
                    });

                    setIsEditingProfile(false);
                    setNotificationMsg('✓ Farmer profile updated successfully!');
                    sounds.success();
                  }
                }}
                className="space-y-4 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4" />
                    <span>{language === 'te' ? 'రైతు వివరాలు సవరించండి' : 'Edit Farmer Profile Details'}</span>
                  </h4>
                  <span className="text-[11px] text-[#64748b]">
                    {language === 'te' ? 'తప్పుడు సమాచారం నమోదు చేస్తే ఇక్కడ మార్చుకోండి' : 'Correct any wrong information here'}
                  </span>
                </div>

                {profileError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1e293b] mb-1">
                      {language === 'te' ? 'రైతు పూర్తి పేరు' : 'Farmer Full Name'} *
                    </label>
                    <input
                      type="text"
                      id="farmer-edit-name-input"
                      value={profileEditForm.name}
                      onChange={(e) => {
                        setProfileEditForm({
                          ...profileEditForm,
                          name: e.target.value.replace(/[0-9]/g, ''),
                        });
                        setProfileError('');
                      }}
                      placeholder="e.g. M. Rama Krishna Reddy"
                      className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1e293b] mb-1">
                      {language === 'te' ? 'మొబైల్ నంబర్' : 'Mobile Number'} (10 Digits) *
                    </label>
                    <input
                      type="tel"
                      id="farmer-edit-phone-input"
                      value={profileEditForm.phone}
                      maxLength={10}
                      onChange={(e) => {
                        setProfileEditForm({
                          ...profileEditForm,
                          phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                        });
                        setProfileError('');
                      }}
                      placeholder="9848012345"
                      className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1e293b] mb-1">
                      {language === 'te' ? 'గ్రామం / పట్టణం' : 'Village / Town'}
                    </label>
                    <input
                      type="text"
                      id="farmer-edit-village-input"
                      value={profileEditForm.village}
                      onChange={(e) =>
                        setProfileEditForm({ ...profileEditForm, village: e.target.value })
                      }
                      placeholder="e.g. Madanapalle Rural"
                      className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1e293b] mb-1">
                      {language === 'te' ? 'పండించే పూలు / పంటలు' : 'Primary Flowers / Crops'}
                    </label>
                    <input
                      type="text"
                      id="farmer-edit-crops-input"
                      value={profileEditForm.crops}
                      onChange={(e) =>
                        setProfileEditForm({ ...profileEditForm, crops: e.target.value })
                      }
                      placeholder={language === 'te' ? 'ఉదా. మల్లె, గులాబీ, చామంతి' : 'e.g. Jasmine, Rose, Marigold'}
                      className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-[#e2e8f0] text-xs font-semibold text-[#64748b] hover:bg-slate-100 cursor-pointer min-touch-target"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="farmer-save-profile-btn"
                    className="px-5 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center gap-1.5 shadow-2xs cursor-pointer min-touch-target"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block mb-1">
                    Primary Flowers &amp; Crops
                  </span>
                  <span className="font-bold text-[#1e293b]">
                    {currentFarmer?.primaryCrops && currentFarmer.primaryCrops.length > 0
                      ? currentFarmer.primaryCrops.join(', ')
                      : 'Wholesale Flowers (మల్లె, రోజా, చామంతి)'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block mb-1">
                    Total Lots Handled
                  </span>
                  <span className="font-bold text-[#1e293b]">
                    {farmerLots.length} Parchi Slips
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block mb-1">
                    Account Status
                  </span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active Digital Passbook</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Manage Crop Categories / Commodities Section */}
          <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#d4af37]" />
                  <span>{language === 'te' ? 'పండించే పంటల వర్గాలు (పంటల స్విచర్)' : 'Enabled Farming Crop Categories'}</span>
                </h4>
                <p className="text-xs text-[#64748b] mt-0.5">
                  {language === 'te'
                    ? 'మీరు పండించే ఉత్పత్తుల వర్గాలను ఎంచుకోండి. మీరు ఎంచుకున్న వర్గాలు మాత్రమే ఖాతా స్విచర్‌లో కనిపిస్తాయి.'
                    : 'Select all produce types you farm. Enabling multiple categories will unlock the category switcher tab bar in your Khata.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {COMMODITY_TABS.map((cat) => {
                const isEnabled = enabledCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    id={`profile-toggle-category-${cat.id}`}
                    onClick={() => {
                      let next: CommodityCategory[];
                      if (isEnabled) {
                        if (enabledCategories.length <= 1) {
                          setNotificationMsg('At least one crop category must remain enabled.');
                          setTimeout(() => setNotificationMsg(null), 3000);
                          return;
                        }
                        next = enabledCategories.filter((c) => c !== cat.id);
                      } else {
                        next = [...enabledCategories, cat.id];
                      }
                      setUserCommodities(next);
                      if (registeredFarmerAccount) {
                        registeredFarmerAccount.selectedCommodities = next;
                      }
                      sounds.playCashChime?.();
                      setNotificationMsg(`✓ Crop categories updated (${next.length} enabled)`);
                      setTimeout(() => setNotificationMsg(null), 3000);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                      isEnabled
                        ? 'bg-[#eef3f7] border-[#1a3a52] text-[#1a3a52] shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base shrink-0">{cat.icon}</span>
                      <span className="truncate">{language === 'te' ? cat.nameTe : cat.label}</span>
                    </div>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                      isEnabled ? 'bg-[#1a3a52] text-white border-[#1a3a52]' : 'border-slate-300'
                    }`}>
                      {isEnabled ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Deletion & Clarification Section */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-red-200 shadow-2xs space-y-4 bg-red-50/15">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5 border-b border-red-200/60 pb-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>{language === 'te' ? 'ఖాతా & ప్రొఫైల్ నిర్వహణ' : 'Account & Profile Deletion'}</span>
            </h4>

            <div className="p-4 rounded-xl bg-red-100/50 border border-red-200 text-red-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-bold">
                    {language === 'te'
                      ? 'మీరు పూలు మాత్రమే విక్రయిస్తారా లేదా తప్పుడు సమాచారం నమోదు చేశారా?'
                      : 'Do you only sell flowers or entered incorrect information?'}
                  </p>
                  <p className="text-red-800">
                    {language === 'te'
                      ? 'ఈ యాప్ ప్రత్యేకంగా పూల వ్యాపారం (మల్లె, గులాబీ, చామంతి) మరియు వ్యవసాయ ఉత్పత్తుల కోసం రూపొందించబడింది. మీరు మీ పేరు లేదా ఫోన్ నంబర్ మార్చాలనుకుంటే పైనున్న "Edit Profile Details" ఉపయోగించండి. మీ ప్రొఫైల్ పూర్తిగా తొలగించాలనుకుంటే కింద ఉన్న బటన్ నొక్కండి.'
                      : 'This portal is purpose-built for wholesale flower and crop transactions. If you entered the wrong name, phone, or village, you can edit it above. If you wish to delete your entire profile and start freshly, tap "Delete Farmer Profile" below.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <p className="font-bold text-xs text-slate-800">
                  {currentFarmer?.name || 'Farmer'} • +91 {cleanFarmerPhone || 'Phone'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Permanently wipe this farmer profile and all local session data from this device.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="farmer-logout-btn-profile"
                  onClick={logoutCurrentUser}
                  className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-touch-target"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>

                <button
                  type="button"
                  id="farmer-delete-profile-btn"
                  onClick={() => setIsDeleteProfileOpen(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer min-touch-target"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'te' ? 'ప్రొఫైల్ తొలగించండి' : 'Delete Farmer Profile'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Farmer Profile Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={isDeleteProfileOpen}
        title={language === 'te' ? 'రైతు ప్రొఫైల్ తొలగించండి' : 'Delete Farmer Profile & Account'}
        itemName={currentFarmer?.name || 'Farmer Profile'}
        itemDetails={`+91 ${cleanFarmerPhone} • ${currentFarmer?.village || 'Village'}`}
        message={
          language === 'te'
            ? 'ఈ రైతు ప్రొఫైల్ మరియు అన్ని అనుబంధ రికార్డులను ఈ పరికరం నుండి శాశ్వతంగా తొలగించాలనుకుంటున్నారా? తప్పుడు సమాచారం ఉంటే మీరు మళ్లీ సరిగ్గా నమోదు చేసుకోవచ్చు.'
            : 'Are you sure you want to permanently delete your Farmer Profile? All linked parchi links and passbook session will be wiped from this device.'
        }
        confirmText={language === 'te' ? 'అవును, ప్రొఫైల్ తొలగించు' : 'YES, DELETE PROFILE'}
        cancelText={language === 'te' ? 'రద్దు చేయి' : 'CANCEL'}
        onConfirm={() => {
          setIsDeleteProfileOpen(false);
          sounds.tap();
          deleteCurrentFarmerProfile(currentFarmer?.id);
        }}
        onCancel={() => setIsDeleteProfileOpen(false)}
      />
    </div>
  );
};
