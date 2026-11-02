import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Check, User, MapPin, Phone, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { Farmer, CommodityCategory, FarmerType } from '../../types';
import { sounds } from '../../utils/audio';

interface NewFarmerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFarmer?: Farmer | null;
  onFarmerSaved?: (farmer: Farmer) => void;
  initialNameQuery?: string;
}

export const NewFarmerRegistrationModal: React.FC<NewFarmerRegistrationModalProps> = ({
  isOpen,
  onClose,
  editingFarmer = null,
  onFarmerSaved,
  initialNameQuery = '',
}) => {
  const { farmers, addFarmer, updateFarmer, merchantProfile, userCommodities } = useMandi();

  // Input Refs for smooth keyboard navigation
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const villageInputRef = useRef<HTMLInputElement>(null);

  // Form Field States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');
  const [farmerType, setFarmerType] = useState<FarmerType>('Grower / Kisan');
  const [commoditiesGrown, setCommoditiesGrown] = useState<CommodityCategory[]>([]);
  const [notes, setNotes] = useState('');

  // Touched state for inline validation messages
  const [touched, setTouched] = useState<{ name?: boolean; phone?: boolean; village?: boolean }>({});
  const [nameCharError, setNameCharError] = useState<string | null>(null);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  // Reset or Populate form when modal opens or editingFarmer changes
  useEffect(() => {
    if (isOpen) {
      if (editingFarmer) {
        setName(editingFarmer.name || '');
        setPhone(editingFarmer.phone ? editingFarmer.phone.replace(/\D/g, '').slice(-10) : '');
        setVillage(editingFarmer.village || '');
        setAddress(editingFarmer.address || '');
        setFarmerType(editingFarmer.farmerType || 'Grower / Kisan');
        setCommoditiesGrown(editingFarmer.commoditiesGrown || (editingFarmer.primaryCrops as CommodityCategory[]) || []);
        setNotes(editingFarmer.notes || '');
      } else {
        const cleanInitialP = (initialNameQuery || '').replace(/\D/g, '').slice(-10);
        if (cleanInitialP.length === 10) {
          setName('');
          setPhone(cleanInitialP);
        } else {
          setName(initialNameQuery || '');
          setPhone('');
        }
        setVillage('');
        setAddress('');
        setFarmerType('Grower / Kisan');
        // Default to merchant's selected setup commodities
        setCommoditiesGrown(merchantProfile.selectedCommodities || userCommodities || ['flowers']);
        setNotes('');
      }
      setTouched({});
      setNameCharError(null);
      setIsDiscardConfirmOpen(false);

      // Auto-focus Name field
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingFarmer, initialNameQuery, merchantProfile.selectedCommodities, userCommodities]);

  // Unique list of previously entered villages for suggestions
  const villageSuggestions = useMemo(() => {
    const list = Array.from(
      new Set(
        farmers
          .map((f) => f.village?.trim())
          .filter((v): v is string => Boolean(v && v !== 'Mandi Area' && v !== 'Mandi Yard' && v.length > 1))
      )
    );
    if (list.length === 0) return ['Shamshabad', 'Gudimalkapur', 'Chevella', 'Ibrahimpatnam', 'Medchal'];
    return list;
  }, [farmers]);

  // Sanitize Name Input (Letters, Spaces, Dots, Regional Alphabets only)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Check if raw value contains numbers or prohibited special characters
    const hasInvalidChars = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/g.test(raw);

    if (hasInvalidChars) {
      setNameCharError('Name should contain letters only.');
    } else {
      setNameCharError(null);
    }

    // Keep valid characters
    const cleaned = raw.replace(/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/g, '');
    setName(cleaned);
    setTouched((prev) => ({ ...prev, name: true }));
  };

  // Clean Phone Number Input (Exactly 10 numeric digits)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    setTouched((prev) => ({ ...prev, phone: true }));
  };

  // Check for duplicate mobile number in existing farmers
  const duplicateFarmer = useMemo(() => {
    const cleanP = phone.trim().replace(/\D/g, '').slice(-10);
    if (cleanP.length !== 10) return null;
    return farmers.find((f) => {
      if (editingFarmer && f.id === editingFarmer.id) return false;
      const fp = f.phone ? f.phone.replace(/\D/g, '').slice(-10) : '';
      return fp === cleanP;
    });
  }, [farmers, phone, editingFarmer]);

  // Validation Rules
  const nameErrorMsg = useMemo(() => {
    if (nameCharError) return nameCharError;
    if (touched.name && !name.trim()) return 'Enter farmer name';
    return null;
  }, [name, touched.name, nameCharError]);

  const phoneErrorMsg = useMemo(() => {
    const cleanP = phone.trim().replace(/\D/g, '').slice(-10);
    if (touched.phone && cleanP.length !== 10) return 'Mobile number must be 10 digits';
    if (duplicateFarmer) return 'This number is already registered';
    return null;
  }, [phone, touched.phone, duplicateFarmer]);

  const villageErrorMsg = useMemo(() => {
    if (touched.village && !village.trim()) return 'Enter village or belt';
    return null;
  }, [village, touched.village]);

  const isFormValid = useMemo(() => {
    const cleanP = phone.trim().replace(/\D/g, '').slice(-10);
    return (
      name.trim().length >= 2 &&
      !nameCharError &&
      cleanP.length === 10 &&
      !duplicateFarmer &&
      village.trim().length >= 2
    );
  }, [name, nameCharError, phone, duplicateFarmer, village]);

  // Handle Cancel / Discard Guard
  const handleAttemptClose = () => {
    const hasTypedData = Boolean(
      name.trim() || phone.trim() || village.trim() || address.trim() || notes.trim()
    );

    if (hasTypedData && !editingFarmer) {
      setIsDiscardConfirmOpen(true);
    } else {
      onClose();
    }
  };

  // Commodity options grouped: Setup commodities first, others below
  const setupCommodities = merchantProfile.selectedCommodities || userCommodities || ['flowers', 'grains', 'vegetables', 'fruits'];
  const allCommodityOptions: { id: CommodityCategory; label: string; icon: string }[] = [
    { id: 'flowers', label: 'Flowers', icon: '🌸' },
    { id: 'grains', label: 'Grains', icon: '🌾' },
    { id: 'vegetables', label: 'Vegetables', icon: '🥕' },
    { id: 'fruits', label: 'Fruits', icon: '🍎' },
  ];

  const primaryCommodities = allCommodityOptions.filter((c) => setupCommodities.includes(c.id));
  const secondaryCommodities = allCommodityOptions.filter((c) => !setupCommodities.includes(c.id));

  const toggleCommodity = (id: CommodityCategory) => {
    if (commoditiesGrown.includes(id)) {
      setCommoditiesGrown(commoditiesGrown.filter((c) => c !== id));
    } else {
      setCommoditiesGrown([...commoditiesGrown, id]);
    }
  };

  // Keyboard Navigation: Enter key transitions focus
  const handleKeyDown = (e: React.KeyboardEvent, currentField: 'name' | 'phone' | 'village') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentField === 'name') {
        setTouched((prev) => ({ ...prev, name: true }));
        phoneInputRef.current?.focus();
      } else if (currentField === 'phone') {
        setTouched((prev) => ({ ...prev, phone: true }));
        villageInputRef.current?.focus();
      } else if (currentField === 'village') {
        setTouched((prev) => ({ ...prev, village: true }));
        if (isFormValid) {
          handleSave();
        }
      }
    }
  };

  // Save Farmer Action
  const handleSave = () => {
    setTouched({ name: true, phone: true, village: true });
    if (!isFormValid) return;

    const cleanP = phone.trim().replace(/\D/g, '').slice(-10);

    if (editingFarmer) {
      const updatedFields: Partial<Farmer> = {
        name: name.trim(),
        phone: cleanP,
        village: village.trim(),
        address: address.trim(),
        farmerType: farmerType || 'Grower / Kisan',
        commoditiesGrown: commoditiesGrown.length > 0 ? commoditiesGrown : ['flowers'],
        primaryCrops: commoditiesGrown.length > 0 ? commoditiesGrown : ['flowers'],
        notes: notes.trim(),
        auditLogs: [
          ...(editingFarmer.auditLogs || []),
          {
            id: `log-${Date.now()}`,
            action: 'edit',
            timestamp: new Date().toISOString(),
            details: `Updated name to ${name.trim()}, village to ${village.trim()}, phone to ${cleanP}`,
          },
        ],
      };

      updateFarmer(editingFarmer.id, updatedFields);
      const savedObj = { ...editingFarmer, ...updatedFields };
      sounds.playCashChime?.();
      if (onFarmerSaved) onFarmerSaved(savedObj);
      onClose();
    } else {
      const newFarmerData: Omit<Farmer, 'id' | 'createdAt'> = {
        name: name.trim(),
        phone: cleanP,
        village: village.trim(),
        address: address.trim(),
        farmerType: farmerType || 'Grower / Kisan',
        commoditiesGrown: (commoditiesGrown.length > 0 ? commoditiesGrown : ['flowers']) as CommodityCategory[],
        primaryCrops: commoditiesGrown.length > 0 ? commoditiesGrown : ['flowers'],
        notes: notes.trim(),
        connectedMerchantIds: [merchantProfile.merchantId],
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            action: 'add' as const,
            timestamp: new Date().toISOString(),
            details: 'Farmer registered via New Farmer Registration form',
          },
        ],
      };

      const savedObj = addFarmer(newFarmerData);
      sounds.playCashChime?.();
      if (onFarmerSaved) onFarmerSaved(savedObj);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-auto overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <User className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase leading-snug">
                {editingFarmer ? 'EDIT FARMER REGISTRATION' : 'NEW FARMER REGISTRATION'}
              </h2>
              <p className="text-[11px] text-emerald-100/90 font-medium">
                Register grower details for consignments &amp; Form C parchis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {/* FIELD 1: FARMER FULL NAME (REQUIRED) */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
              FARMER FULL NAME <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                onKeyDown={(e) => handleKeyDown(e, 'name')}
                placeholder="e.g. Venkat Reddy"
                className={`w-full min-h-[48px] px-4 py-3 bg-slate-50 border rounded-xl font-bold text-slate-900 text-base focus:bg-white focus:outline-none transition-all ${
                  nameErrorMsg ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                }`}
              />
            </div>
            {nameErrorMsg ? (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {nameErrorMsg}
              </p>
            ) : null}
          </div>

          {/* FIELD 2: MOBILE NUMBER (REQUIRED) */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
              MOBILE NUMBER <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500 text-sm">
                +91
              </span>
              <input
                ref={phoneInputRef}
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                onKeyDown={(e) => handleKeyDown(e, 'phone')}
                placeholder="e.g. 9848012345"
                className={`w-full min-h-[48px] pl-12 pr-4 py-3 bg-slate-50 border rounded-xl font-mono font-bold text-slate-900 text-base focus:bg-white focus:outline-none transition-all ${
                  phoneErrorMsg ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                }`}
              />
            </div>

            {/* DUPLICATE FARMER WARNING CALLOUT CARD */}
            {duplicateFarmer ? (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <p className="text-xs font-bold text-amber-900 leading-snug">
                  This farmer is already registered as{' '}
                  <span className="font-black underline">{duplicateFarmer.name}</span> ({duplicateFarmer.village}). Select them instead?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onFarmerSaved) onFarmerSaved(duplicateFarmer);
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  Select {duplicateFarmer.name}
                </button>
              </div>
            ) : phoneErrorMsg ? (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {phoneErrorMsg}
              </p>
            ) : null}
          </div>

          {/* FIELD 3: VILLAGE / BELT (REQUIRED) */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
              VILLAGE / BELT <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                ref={villageInputRef}
                type="text"
                list="village-suggestions-list"
                value={village}
                onChange={(e) => {
                  setVillage(e.target.value);
                  setTouched((prev) => ({ ...prev, village: true }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, village: true }))}
                onKeyDown={(e) => handleKeyDown(e, 'village')}
                placeholder="e.g. Shamshabad"
                className={`w-full min-h-[48px] px-4 py-3 bg-slate-50 border rounded-xl font-bold text-slate-900 text-base focus:bg-white focus:outline-none transition-all ${
                  villageErrorMsg ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                }`}
              />
              <datalist id="village-suggestions-list">
                {villageSuggestions.map((v, i) => (
                  <option key={i} value={v} />
                ))}
              </datalist>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {villageSuggestions.slice(0, 4).map((v, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setVillage(v);
                    setTouched((prev) => ({ ...prev, village: true }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition-colors"
                >
                  + {v}
                </button>
              ))}
            </div>

            {villageErrorMsg ? (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {villageErrorMsg}
              </p>
            ) : null}
          </div>

          {/* FIELD 4: ADDRESS (OPTIONAL) */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              ADDRESS <span className="text-slate-400 font-normal">(OPTIONAL)</span>
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Near Bus Stand, Shamshabad Mandal"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 text-sm focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
            />
          </div>

          {/* FIELD 5: FARMER TYPE (OPTIONAL) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              FARMER TYPE <span className="text-slate-400 font-normal">(OPTIONAL)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Grower / Kisan', 'Trader', 'Other'] as FarmerType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFarmerType(type)}
                  className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    farmerType === type
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* FIELD 6: COMMODITIES GROWN (OPTIONAL) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              COMMODITIES GROWN <span className="text-slate-400 font-normal">(OPTIONAL)</span>
            </label>

            {/* Merchant Setup Commodities First */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Primary Commodities (Merchant Setup):
              </span>
              <div className="grid grid-cols-2 gap-2">
                {primaryCommodities.map((item) => {
                  const isChecked = commoditiesGrown.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleCommodity(item.id)}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      {isChecked ? <Check className="w-4 h-4 ml-auto text-emerald-700 shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Other Commodities Below */}
            {secondaryCommodities.length > 0 ? (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Other Available Commodities:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {secondaryCommodities.map((item) => {
                    const isChecked = commoditiesGrown.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleCommodity(item.id)}
                        className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                        {isChecked ? <Check className="w-4 h-4 ml-auto text-emerald-700 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* FIELD 7: NOTES (OPTIONAL, MAX 200 CHARACTERS) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                NOTES <span className="text-slate-400 font-normal">(OPTIONAL)</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {notes.length}/200
              </span>
            </div>
            <input
              type="text"
              maxLength={200}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special arrival preferences, preferred payment bank"
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 text-sm focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 font-extrabold text-sm uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isFormValid}
            onClick={handleSave}
            className={`min-h-[48px] px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
              isFormValid
                ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-emerald-900/20 active:scale-[0.99]'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <Check className="w-5 h-5" />
            <span>{editingFarmer ? 'Update Farmer' : 'Save Farmer'}</span>
          </button>
        </div>
      </div>

      {/* DISCARD CONFIRMATION MODAL GUARD */}
      {isDiscardConfirmOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Discard this farmer?</h3>
              <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                You have unsaved farmer information typed in the registration form. Discarding will clear these details.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDiscardConfirmOpen(false)}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-800 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-100"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDiscardConfirmOpen(false);
                  onClose();
                }}
                className="py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs uppercase tracking-wider shadow-xs"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
