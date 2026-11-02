import React, { useState, useMemo } from 'react';
import {
  Users,
  ArrowLeft,
  Search,
  UserPlus,
  BookOpen,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Printer,
  ChevronRight,
  Plus,
  User,
  Sparkles,
  Send,
  ShieldCheck,
  Clock,
  Check,
  AlertCircle,
  Receipt,
  Trash2,
  Mic,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { Farmer } from '../../types';
import { flowerVarietiesData } from '../../translations';
import { PhotoUploadPicker } from '../common/PhotoUploadPicker';
import { FarmerKathaStatementView } from './FarmerKathaStatementView';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { VoiceInputModal } from '../common/VoiceInputModal';
import { FarmerVoiceParseResult } from '../../services/voiceAi';
import { sounds } from '../../utils/audio';
import { validateIndianMobile, cleanIndianMobile } from '../../utils/phoneValidation';
import { checkCloudDuplicateFarmer } from '../../services/supabaseSync';

import { NewFarmerRegistrationModal } from './NewFarmerRegistrationModal';

export interface FarmersViewProps {
  initialTab?: 'connected' | 'incoming';
  onClose?: () => void;
  isModal?: boolean;
}

export const FarmersView: React.FC<FarmersViewProps> = ({
  initialTab = 'connected',
  onClose,
  isModal = false,
}) => {
  const {
    farmers,
    addFarmer,
    updateFarmer,
    deleteFarmer,
    archiveFarmer,
    lots,
    shipments,
    getFarmerStats,
    setSelectedParchiLot,
    merchantProfile,
    setIsFarmerSignUpOpen,
    connectionRequests,
    acceptConnectionRequest,
    declineConnectionRequest,
    sendConnectionRequest,
    registeredAccounts,
    currentUserPhone,
    language,
    t,
  } = useMandi();

  const [activeTab, setActiveTab] = useState<'connected' | 'incoming'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [selectedLedgerFarmer, setSelectedLedgerFarmer] = useState<Farmer | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const handleFarmerVoiceParsed = (res: FarmerVoiceParseResult) => {
    // Populate form fields directly
    setFormName(res.name);
    setFormVillage(res.village);
    setFormPhone(res.phone);

    // Register farmer directly without manual typing
    const newFarmer = addFarmer({
      name: res.name || 'Kisan Member',
      phone: res.phone || '9876543210',
      village: res.village || 'Mandi Yard',
      primaryCrops: res.primaryCrops && res.primaryCrops.length > 0 ? res.primaryCrops : ['flowers'],
      connectedMerchantIds: [merchantProfile.merchantId],
    });

    sounds.playCashChime?.();
    setNotificationMsg(`✓ Voice Registration Complete: Registered ${newFarmer.name} (${newFarmer.village}, +91 ${newFarmer.phone}) directly!`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  // Delete & Archive Confirmation State
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    farmer: Farmer | null;
  }>({
    isOpen: false,
    farmer: null,
  });

  const [archiveModalConfig, setArchiveModalConfig] = useState<{
    isOpen: boolean;
    farmer: Farmer | null;
    entriesCount: number;
  }>({
    isOpen: false,
    farmer: null,
    entriesCount: 0,
  });

  const handleDeleteFarmerClick = (farmer: Farmer) => {
    const farmerLotsCount = lots.filter((l) => l.farmerId === farmer.id).length;
    const farmerShipmentsCount = (shipments || []).filter((s) => s.farmerId === farmer.id).length;
    const totalEntries = farmerLotsCount + farmerShipmentsCount;

    if (totalEntries > 0) {
      setArchiveModalConfig({
        isOpen: true,
        farmer,
        entriesCount: totalEntries,
      });
    } else {
      setDeleteModalConfig({
        isOpen: true,
        farmer,
      });
    }
  };

  const handleConfirmArchiveFarmer = () => {
    if (archiveModalConfig.farmer) {
      archiveFarmer(archiveModalConfig.farmer.id);
      sounds.playTrashSound?.();
      setNotificationMsg(`✓ Farmer "${archiveModalConfig.farmer.name}" archived from future entries.`);
      setTimeout(() => setNotificationMsg(null), 3500);
      if (editingFarmer?.id === archiveModalConfig.farmer.id) {
        setIsAddModalOpen(false);
        setEditingFarmer(null);
      }
    }
    setArchiveModalConfig({ isOpen: false, farmer: null, entriesCount: 0 });
  };

  const handleConfirmDeleteFarmer = () => {
    if (deleteModalConfig.farmer) {
      const deletedName = deleteModalConfig.farmer.name;
      deleteFarmer(deleteModalConfig.farmer.id);
      sounds.playTrashSound?.();
      setNotificationMsg(`✓ Farmer "${deletedName}" was successfully deleted.`);
      setTimeout(() => setNotificationMsg(null), 3500);
      if (editingFarmer?.id === deleteModalConfig.farmer.id) {
        setIsAddModalOpen(false);
        setEditingFarmer(null);
      }
    }
    setDeleteModalConfig({ isOpen: false, farmer: null });
  };

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formCrops, setFormCrops] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const cleanMerchantPhone = merchantProfile.phoneNumber
    ? merchantProfile.phoneNumber.replace(/\D/g, '').slice(-10)
    : currentUserPhone;

  // Incoming connection requests from farmers
  const incomingFarmerRequests = useMemo(() => {
    return connectionRequests.filter(
      (r) =>
        r.senderRole === 'farmer' &&
        r.status === 'pending' &&
        (r.merchantId === merchantProfile.merchantId ||
          (r.merchantPhone && r.merchantPhone.replace(/\D/g, '').slice(-10) === cleanMerchantPhone))
    );
  }, [connectionRequests, merchantProfile.merchantId, cleanMerchantPhone]);

  // Outgoing requests sent by merchant
  const outgoingMerchantRequests = useMemo(() => {
    return connectionRequests.filter(
      (r) =>
        r.senderRole === 'merchant' &&
        (r.merchantId === merchantProfile.merchantId ||
          (r.merchantPhone && r.merchantPhone.replace(/\D/g, '').slice(-10) === cleanMerchantPhone))
    );
  }, [connectionRequests, merchantProfile.merchantId, cleanMerchantPhone]);

  // Accepted connections
  const acceptedConnections = useMemo(() => {
    return connectionRequests.filter(
      (r) =>
        r.status === 'accepted' &&
        (r.merchantId === merchantProfile.merchantId ||
          (r.merchantPhone && r.merchantPhone.replace(/\D/g, '').slice(-10) === cleanMerchantPhone))
    );
  }, [connectionRequests, merchantProfile.merchantId, cleanMerchantPhone]);

  // Filtered farmers in Connected Tab
  const filteredFarmers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return (farmers || []).filter(Boolean);
    return (farmers || []).filter(
      (f) =>
        f &&
        ((f.name && f.name.toLowerCase().includes(q)) ||
        (f.village && f.village.toLowerCase().includes(q)) ||
        (f.phone && f.phone.includes(q)) ||
        (Array.isArray(f.primaryCrops) && f.primaryCrops.some((c) => c && c.toLowerCase().includes(q))))
    );
  }, [farmers, searchQuery]);

  // Searchable Network Farmers (registered accounts who are farmers + existing farmers)
  const networkFarmers = useMemo(() => {
    const list: {
      id: string;
      name: string;
      phone: string;
      village: string;
      crops: string[];
      photoUrl?: string;
    }[] = [];

    const seenPhones = new Set<string>();

    // 1. Registered accounts with role 'farmer'
    registeredAccounts
      .filter((a) => a.role === 'farmer')
      .forEach((a) => {
        const clean = a.phoneNumber.replace(/\D/g, '').slice(-10);
        if (!seenPhones.has(clean)) {
          seenPhones.add(clean);
          list.push({
            id: a.id,
            name: a.fullName,
            phone: clean,
            village: a.shopOrVillage || 'Grower Belt',
            crops: a.licenseOrCrop ? [a.licenseOrCrop] : ['Marigold (Banthi)'],
            photoUrl: a.photoUrl,
          });
        }
      });

    // 2. Existing local farmers
    farmers.forEach((f) => {
      const clean = f.phone ? f.phone.replace(/\D/g, '').slice(-10) : '';
      if (clean && !seenPhones.has(clean)) {
        seenPhones.add(clean);
        list.push({
          id: f.id,
          name: f.name,
          phone: clean,
          village: f.village,
          crops: Array.isArray(f.primaryCrops) ? f.primaryCrops : ['Marigold (Banthi)'],
          photoUrl: f.photoUrl,
        });
      }
    });

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.village.toLowerCase().includes(q) ||
        f.phone.includes(q) ||
        f.crops.some((c) => c.toLowerCase().includes(q))
    );
  }, [registeredAccounts, farmers, searchQuery]);

  const openAddModal = () => {
    setEditingFarmer(null);
    setFormName('');
    setFormPhone('');
    setFormVillage('');
    setFormPhotoUrl('');
    setFormCrops([]);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setFormName(farmer.name);
    setFormPhone(farmer.phone);
    setFormVillage(farmer.village);
    setFormPhotoUrl(farmer.photoUrl || '');
    setFormCrops(farmer.primaryCrops);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedVillage = formVillage.trim();

    if (!trimmedName) {
      setFormError('Farmer name is required');
      return;
    }

    if (/[0-9]/.test(trimmedName)) {
      setFormError(language === 'te' ? 'రైతు పేరులో అంకెలు ఉండకూడదు' : 'Farmer name cannot contain numbers');
      return;
    }

    // Duplicate check ignoring case and extra whitespace
    const normalizedNewName = trimmedName.replace(/\s+/g, ' ').toLowerCase();
    const isDuplicate = farmers.some(
      (f) =>
        f &&
        f.id !== editingFarmer?.id &&
        f.name &&
        f.name.replace(/\s+/g, ' ').trim().toLowerCase() === normalizedNewName
    );
    if (isDuplicate) {
      setFormError('Already registered');
      return;
    }

    // Phone validation - optional
    let cleanPhone = '';
    if (formPhone.trim()) {
      const phoneVal = validateIndianMobile(formPhone);
      if (!phoneVal.isValid) {
        setFormError(phoneVal.error || 'Enter a valid 10-digit Indian mobile number');
        return;
      }
      cleanPhone = phoneVal.cleanNumber;
    }

    if (editingFarmer) {
      updateFarmer(editingFarmer.id, {
        name: trimmedName,
        phone: cleanPhone,
        village: trimmedVillage,
        primaryCrops: formCrops,
        photoUrl: formPhotoUrl.trim() || '',
      });
      setNotificationMsg(`Farmer saved ✓ ${trimmedName}`);
    } else {
      const saved = addFarmer({
        name: trimmedName,
        phone: cleanPhone,
        village: trimmedVillage,
        primaryCrops: formCrops,
        connectedMerchantIds: [merchantProfile.merchantId],
        photoUrl: formPhotoUrl.trim() || '',
      });
      setNotificationMsg(`Farmer saved ✓ ${saved.name}`);
    }

    setTimeout(() => setNotificationMsg(null), 4000);
    setIsAddModalOpen(false);
  };

  const toggleCrop = (cropName: string) => {
    if (formCrops.includes(cropName)) {
      setFormCrops(formCrops.filter((c) => c !== cropName));
    } else {
      setFormCrops([...formCrops, cropName]);
    }
  };

  // Send request to searched farmer
  const handleAcceptRequest = (reqId: string, farmerName: string) => {
    acceptConnectionRequest(reqId);
    setNotificationMsg(
      `✓ Connection accepted with ${farmerName}! Data sharing activated. Only this specific farmer's parchi lots and ledger are now shared.`
    );
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleDeclineRequest = (reqId: string) => {
    declineConnectionRequest(reqId);
    setNotificationMsg('Request declined.');
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Farmer Ledger Modal calculations - strictly for this farmer!
  const farmerLots = useMemo(() => {
    if (!selectedLedgerFarmer) return [];
    const cleanFarmerPhone = selectedLedgerFarmer.phone
      ? selectedLedgerFarmer.phone.replace(/\D/g, '').slice(-10)
      : '';
    return lots.filter((l) => {
      const lotPhone = l.farmerPhone ? l.farmerPhone.replace(/\D/g, '').slice(-10) : '';
      return (
        l.farmerId === selectedLedgerFarmer.id ||
        (cleanFarmerPhone && lotPhone === cleanFarmerPhone) ||
        (l.farmerName && l.farmerName.trim().toLowerCase() === selectedLedgerFarmer.name.trim().toLowerCase())
      );
    });
  }, [lots, selectedLedgerFarmer]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-black text-[#1e293b] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1a3a52]" />
            <span>Farmers</span>
          </h2>

          <button
            id="open-add-farmer-modal-btn"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Farmer</span>
          </button>
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

        {/* Search Input */}
        {activeTab === 'connected' && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748b]" />
            <input
              id="farmers-search-input"
              type="text"
              placeholder="Search farmers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e2e8f0] text-xs focus:outline-hidden focus:border-[#1a3a52] bg-[#f8fafc]"
            />
          </div>
        )}
      </div>

      {/* TAB 1: Connected Farmers */}
      {activeTab === 'connected' && (
        <div>
          {filteredFarmers.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#e2e8f0] text-center space-y-3">
              <p className="text-xs font-bold text-slate-500">
                {searchQuery.trim() ? `No match found for "${searchQuery}"` : 'No farmers yet'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (searchQuery.trim()) {
                    setFormName(searchQuery.trim());
                  }
                  openAddModal();
                }}
                className="px-4 py-2 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4 text-blue-300" />
                <span>No match. + Add new</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {filteredFarmers.map((farmer) => {
                const stats = getFarmerStats(farmer.id);

                return (
                  <div
                    key={farmer.id}
                    id={`farmer-card-${farmer.id}`}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2e8f0] shadow-2xs hover:shadow-xs transition space-y-3.5 flex flex-col justify-between w-full h-full min-w-0"
                  >
                    {/* Farmer Info */}
                    <div className="space-y-3 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#1a3a52] bg-[#f8fafc] shrink-0 shadow-2xs">
                            {farmer.photoUrl ? (
                              <img
                                src={farmer.photoUrl}
                                alt={farmer.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#eef3f7] text-[#1a3a52] font-black text-sm">
                                {farmer.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-sm sm:text-base text-[#1e293b] truncate max-w-[180px] sm:max-w-none">
                                {farmer.name}
                              </h4>
                              <span className="font-mono text-[10px] bg-[#f8fafc] text-[#64748b] px-1.5 py-0.5 rounded border border-[#e2e8f0] shrink-0">
                                {farmer.id}
                              </span>
                            </div>
                            <p className="text-xs text-[#64748b] flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-[#1a3a52] shrink-0" />
                              <span className="truncate">{farmer.village && farmer.village.trim() ? farmer.village : '—'}</span>
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-[#1e293b] font-mono mt-0.5">
                              <Phone className="w-3 h-3 text-[#64748b] shrink-0" />
                              <span>{farmer.phone && farmer.phone.trim() ? `+91 ${farmer.phone}` : '—'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-start">
                          <button
                            id={`edit-farmer-btn-${farmer.id}`}
                            onClick={() => openEditModal(farmer)}
                            className="px-2.5 py-1 rounded-lg bg-[#f1f5f9] hover:bg-slate-200 text-[#1a3a52] text-[11px] font-bold transition cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            {t('editFarmer')}
                          </button>
                          <button
                            id={`delete-farmer-card-btn-${farmer.id}`}
                            onClick={() => handleDeleteFarmerClick(farmer)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                            title="Delete this farmer record"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Connection Badge */}
                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Connected &amp; Data Shared (Only this farmer)</span>
                      </div>

                      {/* Primary Crops Chips */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {(Array.isArray(farmer.primaryCrops) ? farmer.primaryCrops : [farmer.primaryCrops || 'Marigold']).map((crop) => (
                          <span
                            key={crop}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#eef3f7] text-[#1a3a52] font-medium"
                          >
                            🌸 {crop}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Lifetime Khata Stats */}
                    <div className="pt-2 border-t border-[#f1f5f9] space-y-2">
                      <div className="grid grid-cols-3 gap-1 text-center bg-[#f8fafc] p-2 rounded-xl border border-[#e2e8f0] text-[11px]">
                        <div>
                          <span className="text-[#64748b] block text-[9px] uppercase font-semibold">
                            Total Lots
                          </span>
                          <span className="font-black text-xs text-[#1e293b]">{stats.totalLots}</span>
                        </div>

                        <div>
                          <span className="text-[#64748b] block text-[9px] uppercase font-semibold">
                            Volume
                          </span>
                          <span className="font-black text-xs text-[#1e293b]">
                            {stats.totalVolume.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className="text-[#64748b] block text-[9px] uppercase font-semibold">
                            Turnover
                          </span>
                          <span className="font-black text-xs text-[#1a3a52]">
                            ₹{stats.totalTurnover.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Pending Dues Banner */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-[#64748b]">Outstanding Balance:</span>
                        <span
                          className={`font-mono font-bold ${
                            stats.pendingDues > 0 ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {stats.pendingDues > 0 ? `₹${stats.pendingDues.toLocaleString('en-IN')}` : 'Settled ✓'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          id={`view-ledger-btn-${farmer.id}`}
                          onClick={() => setSelectedLedgerFarmer(farmer)}
                          className="w-full py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>{language === 'te' ? 'వ్యక్తిగత ఖాతా (ఖాతా చూడండి)' : 'View Farmer Khata / Ledger'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}



      {/* New Farmer Registration Modal */}
      <NewFarmerRegistrationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingFarmer(null);
        }}
        editingFarmer={editingFarmer}
        onFarmerSaved={(savedFarmer) => {
          setNotificationMsg(`✓ Farmer "${savedFarmer.name}" saved successfully (${savedFarmer.id})!`);
          setTimeout(() => setNotificationMsg(null), 3500);
        }}
      />

      {/* Comprehensive Farmer Katha Statement Modal */}
      {selectedLedgerFarmer && (
        <div
          id="farmer-ledger-modal-overlay"
          onClick={() => setSelectedLedgerFarmer(null)}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
        >
          <div
            id="farmer-ledger-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-3 sm:p-4 bg-[#1a3a52] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLedgerFarmer(null)}
                  aria-label="Go Back"
                  className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-[#d4af37] shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold block leading-tight">
                    Farmer Katha Statement &amp; Date Lookup: {selectedLedgerFarmer.name}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {selectedLedgerFarmer.village ? `📍 ${selectedLedgerFarmer.village}` : ''} • +91 {selectedLedgerFarmer.phone}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerFarmer(null)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto">
              <FarmerKathaStatementView
                initialFarmer={selectedLedgerFarmer}
                onSelectParchiLot={(lot) => setSelectedParchiLot(lot)}
                onClose={() => setSelectedLedgerFarmer(null)}
                isModal={true}
              />
            </div>

            <div className="p-3 bg-white border-t border-[#e2e8f0] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLedgerFarmer(null)}
                className="px-4 py-1.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] text-xs font-semibold cursor-pointer hover:bg-gray-100 transition"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title="Delete Farmer Profile"
        itemName={deleteModalConfig.farmer ? `${deleteModalConfig.farmer.name} (${deleteModalConfig.farmer.village || 'Local Area'})` : undefined}
        itemDetails={
          deleteModalConfig.farmer
            ? `Phone: +91 ${deleteModalConfig.farmer.phone || 'N/A'} • Crops: ${Array.isArray(deleteModalConfig.farmer.primaryCrops) ? deleteModalConfig.farmer.primaryCrops.join(', ') : (deleteModalConfig.farmer.primaryCrops || 'Flowers')}`
            : undefined
        }
        message="Are you sure you want to delete this farmer? This will remove the farmer from your directory and associated active ledger views."
        confirmText="CONFIRM DELETE"
        cancelText="CANCEL"
        onConfirm={handleConfirmDeleteFarmer}
        onCancel={() => setDeleteModalConfig({ isOpen: false, farmer: null })}
      />
    </div>
  );
};
