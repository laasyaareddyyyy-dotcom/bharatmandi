import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Receipt,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Tag,
  Coins,
  Truck,
  Package,
  Layers,
  FileText,
  DollarSign,
  Percent,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import {
  SaleLot,
  CommodityCategory,
  WeightUnit,
  FlowerQuality,
  PaymentStatus,
  PaymentMode,
} from '../../types';
import { COMMODITY_CONFIGS } from '../../data/initialData';
import { CustomVarietyInput } from './CustomVarietyInput';
import { sounds } from '../../utils/audio';

export const EditParchiModal: React.FC = () => {
  const {
    isEditParchiOpen,
    setIsEditParchiOpen,
    editingParchiLot,
    setEditingParchiLot,
    updateSaleLot,
    updateShipment,
    shipments,
    selectedParchiLot,
    setSelectedParchiLot,
    userCommodities,
    addCustomVarietyName,
    language,
    t,
  } = useMandi();

  const [farmerName, setFarmerName] = useState<string>('');
  const [farmerPhone, setFarmerPhone] = useState<string>('');
  const [farmerVillage, setFarmerVillage] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [commodityCategory, setCommodityCategory] = useState<CommodityCategory>('flowers');
  const [flowerVariety, setFlowerVariety] = useState<string>('');
  const [flowerQuality, setFlowerQuality] = useState<FlowerQuality>('Good');
  const [packagingType, setPackagingType] = useState<string>('Boxes');
  const [boxesCount, setBoxesCount] = useState<string | number>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState<WeightUnit>('Kgs');
  const [rate, setRate] = useState<number>(0);
  const [transportCharges, setTransportCharges] = useState<number>(0);
  const [ammaliCharges, setAmmaliCharges] = useState<number>(0);
  const [commissionPercent, setCommissionPercent] = useState<number>(0);
  const [miscCharges, setMiscCharges] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pre-fill form state when editingParchiLot changes
  useEffect(() => {
    if (!editingParchiLot) return;
    const lot = editingParchiLot;

    setFarmerName(lot.farmerName || '');
    setFarmerPhone(lot.farmerPhone ? lot.farmerPhone.replace(/\D/g, '').slice(-10) : '');
    setFarmerVillage(lot.farmerVillage || '');
    setDate(lot.date || new Date().toISOString().slice(0, 10));
    setTime(lot.time || '');
    setCommodityCategory((lot.commodityCategory || 'flowers') as CommodityCategory);
    setFlowerVariety(lot.flowerVariety || 'Standard');
    setFlowerQuality(lot.flowerQuality || 'Good');
    setPackagingType(lot.packagingType || (lot.commodityCategory === 'grains' ? 'Bags' : 'Boxes'));
    setBoxesCount(lot.boxesCount ?? '');
    setQuantity(lot.quantity || 0);
    setUnit(lot.unit || 'Kgs');
    setRate(lot.rate || 0);

    const transport = lot.transportCharges ?? lot.otherExpenditures?.transport ?? 0;
    const hamali = lot.ammaliCharges ?? lot.otherExpenditures?.hamali ?? 0;
    const commRate = lot.commissionPercent ?? 0;
    const misc = lot.otherExpenditures?.misc ?? 0;

    setTransportCharges(transport);
    setAmmaliCharges(hamali);
    setCommissionPercent(commRate);
    setMiscCharges(misc);
    setPaymentStatus(lot.paymentStatus || 'Unpaid');
    setAmountPaid(lot.amountPaid || 0);
    setPaymentMode(lot.paymentMode || 'Cash');
    setNotes(lot.notes || '');
    setFeedbackMsg(null);
  }, [editingParchiLot]);

  if (!isEditParchiOpen || !editingParchiLot) return null;

  const lot = editingParchiLot;
  const commodityConfig = COMMODITY_CONFIGS[commodityCategory] || COMMODITY_CONFIGS.flowers;

  // Real-time calculations
  const numQty = Number(quantity) || 0;
  const numRate = Number(rate) || 0;
  const grossTotal = Math.round(numQty * numRate);

  const numTransport = Number(transportCharges) || 0;
  const numHamali = Number(ammaliCharges) || 0;
  const numCommRate = Number(commissionPercent) || 0;
  const commAmount = numCommRate > 0 ? Math.round((grossTotal * numCommRate) / 100) : 0;
  const numMisc = Number(miscCharges) || 0;
  const totalDeductions = numTransport + numHamali + commAmount + numMisc;
  const farmerNetPayable = Math.max(0, grossTotal - totalDeductions);

  const numPaid = Number(amountPaid) || 0;
  const balanceDue = Math.max(0, farmerNetPayable - numPaid);

  const handleClose = () => {
    setIsEditParchiOpen(false);
    setEditingParchiLot(null);
    setFeedbackMsg(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!farmerName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Farmer Name is required.' });
      return;
    }

    if (numQty <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }

    if (numRate <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Rate per unit must be greater than 0.' });
      return;
    }

    const cleanPhone = farmerPhone.replace(/\D/g, '').slice(-10);

    if (flowerVariety.trim()) {
      addCustomVarietyName(flowerVariety.trim(), commodityCategory);
    }

    // Auto update status based on amountPaid vs net
    let finalStatus: PaymentStatus = paymentStatus;
    if (numPaid >= farmerNetPayable && farmerNetPayable > 0) {
      finalStatus = 'Paid';
    } else if (numPaid > 0 && numPaid < farmerNetPayable) {
      finalStatus = 'Partial';
    } else if (numPaid === 0) {
      finalStatus = 'Unpaid';
    }

    const updatedLot: SaleLot = {
      ...lot,
      farmerName: farmerName.trim(),
      farmerPhone: cleanPhone,
      farmerVillage: farmerVillage.trim() || 'Mandi Area',
      date,
      time: time.trim() || lot.time,
      commodityCategory,
      flowerVariety: flowerVariety.trim(),
      flowerQuality,
      packagingType,
      boxesCount: boxesCount !== '' ? Number(boxesCount) : undefined,
      quantity: numQty,
      unit,
      rate: numRate,
      grossTotal,
      commissionPercent: numCommRate,
      commissionAmount: commAmount,
      transportCharges: numTransport,
      ammaliCharges: numHamali,
      otherExpenditures: {
        transport: numTransport,
        hamali: numHamali,
        misc: numMisc,
      },
      totalOtherExpenditures: totalDeductions,
      farmerNetPayable,
      paymentStatus: finalStatus,
      amountPaid: numPaid,
      balanceDue,
      paymentMode: numPaid > 0 ? paymentMode : undefined,
      notes: notes.trim(),
    };

    // Update lot in context
    updateSaleLot(lot.id, updatedLot);

    // If tied to a shipment, update linked shipment as well
    if (lot.shipmentId) {
      const targetShipment = shipments.find((s) => s.id === lot.shipmentId);
      if (targetShipment) {
        updateShipment(lot.shipmentId, {
          farmerName: updatedLot.farmerName,
          farmerPhone: updatedLot.farmerPhone,
          farmerVillage: updatedLot.farmerVillage,
          date: updatedLot.date,
          grossTotal: updatedLot.grossTotal,
          transportCharge: updatedLot.transportCharges,
          hamaliCharge: updatedLot.ammaliCharges,
          commissionPercent: updatedLot.commissionPercent,
          commissionAmount: updatedLot.commissionAmount,
          netAmountAfterDailyCuts: updatedLot.farmerNetPayable,
          paymentStatus: updatedLot.paymentStatus,
          amountPaid: updatedLot.amountPaid,
          balanceDue: updatedLot.balanceDue,
          notes: updatedLot.notes,
        });
      }
    }

    // If selectedParchiLot is currently open, refresh it
    if (selectedParchiLot && selectedParchiLot.id === lot.id) {
      setSelectedParchiLot(updatedLot);
    }

    try {
      sounds.playCashChime();
    } catch {
      // safe audio
    }

    handleClose();
  };

  return (
    <div
      id="edit-parchi-modal-overlay"
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="edit-parchi-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]"
      >
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-4 bg-[#1a3a52] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#d4af37]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-white">
                  Edit Parchi Slip #{lot.parchiNumber}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#d4af37] text-[#1a3a52] text-[10px] font-mono font-black">
                  EDITABLE
                </span>
              </div>
              <p className="text-xs text-slate-200/80 mt-0.5">
                Modify auction rates, quantities, farmer info, or settlement deductions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#1e293b]">
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                feedbackMsg.type === 'error'
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              {feedbackMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* SECTION 1: FARMER DETAILS */}
          <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#d4af37]" />
              <span>1. Farmer Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Farmer Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748b]" />
                  <input
                    type="text"
                    required
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value.replace(/[0-9]/g, ''))}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                    placeholder="e.g. Ramesh Kumar"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Farmer Phone (+91)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748b]" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={farmerPhone}
                    onChange={(e) => setFarmerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Village / Mandi Area
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748b]" />
                  <input
                    type="text"
                    value={farmerVillage}
                    onChange={(e) => setFarmerVillage(e.target.value.replace(/[0-9]/g, ''))}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-medium text-xs focus:outline-hidden focus:border-[#1a3a52]"
                    placeholder="e.g. Medchal Belt"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CROP & CONSIGNMENT AUCTION DETAILS */}
          <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#d4af37]" />
              <span>2. Crop &amp; Auction Rates</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Commodity Category
                </label>
                <select
                  value={commodityCategory}
                  onChange={(e) => setCommodityCategory(e.target.value as CommodityCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                >
                  <option value="flowers">🌸 Flowers</option>
                  <option value="fruits">🍎 Fruits</option>
                  <option value="vegetables">🥦 Vegetables</option>
                  <option value="grains">🌾 Grains &amp; Pulses</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Variety Name
                </label>
                <CustomVarietyInput
                  category={commodityCategory}
                  value={flowerVariety}
                  onChange={(val) => setFlowerVariety(val)}
                  placeholder="e.g. Yellow Marigold / Banthi"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Flower Quality
                </label>
                <select
                  value={flowerQuality}
                  onChange={(e) => setFlowerQuality(e.target.value as FlowerQuality)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                >
                  <option value="Good">Good Quality</option>
                  <option value="Average">Average Quality</option>
                  <option value="Poor">Poor Quality</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min={0.1}
                  step="any"
                  required
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as WeightUnit)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                >
                  {commodityConfig.allowedUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Rate (₹ per {unit}) *
                </label>
                <input
                  type="number"
                  min={0.1}
                  step="any"
                  required
                  value={rate || ''}
                  onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  No. of {packagingType}
                </label>
                <input
                  type="number"
                  min={0}
                  value={boxesCount}
                  onChange={(e) => setBoxesCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Calculated Gross Banner */}
            <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-between font-mono font-black text-sm">
              <span className="text-xs font-bold text-[#64748b] uppercase">Gross Sales Total:</span>
              <span className="text-base text-[#1a3a52]">₹{grossTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* SECTION 3: DEDUCTIONS & MANDI CHARGES */}
          <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#d4af37]" />
              <span>3. Deductions &amp; Charges</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Freight / Transport (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={transportCharges || ''}
                  onChange={(e) => setTransportCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Hamali / Loading (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={ammaliCharges || ''}
                  onChange={(e) => setAmmaliCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={commissionPercent || ''}
                  onChange={(e) => setCommissionPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Misc Charges (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={miscCharges || ''}
                  onChange={(e) => setMiscCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between font-mono font-black text-sm text-amber-900">
              <span className="text-xs font-bold uppercase">Farmer Net Payable:</span>
              <span className="text-base">₹{farmerNetPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* SECTION 4: PAYMENT SETTLEMENT & NOTES */}
          <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#d4af37]" />
              <span>4. Additional Notes</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Amount Paid Now (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  max={farmerNetPayable}
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-mono font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-bold text-xs focus:outline-hidden focus:border-[#1a3a52]"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-mono font-black text-sm text-emerald-950">
              <span className="text-xs font-bold uppercase">Balance Due:</span>
              <span className={`text-base ${balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                ₹{balanceDue.toLocaleString('en-IN')} {balanceDue === 0 ? '✓ Cleared' : ''}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                Parchi Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] font-medium text-xs focus:outline-hidden focus:border-[#1a3a52]"
                placeholder="Optional notes or remarks for farmer ledger..."
              />
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="save-edited-parchi-btn"
              className="px-5 py-2 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#d4af37]" />
              <span>Save Parchi Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
