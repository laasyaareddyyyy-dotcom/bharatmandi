import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { CommodityCategory, WeightUnit, RetailerSaleItem, PaymentMode } from '../../types';
import { COMMODITY_CONFIGS } from '../../data/initialData';
import {
  X,
  Plus,
  Trash2,
  Store,
  Calendar,
  Clock,
  UserPlus,
  CheckCircle2,
  Package,
  Calculator,
  Coins,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface NewRetailerSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedRetailerId?: string;
  onSaleCreated?: (saleId: string) => void;
}

export const NewRetailerSaleModal: React.FC<NewRetailerSaleModalProps> = ({
  isOpen,
  onClose,
  preselectedRetailerId,
  onSaleCreated,
}) => {
  const {
    retailers,
    addRetailer,
    addRetailerSale,
    retailerSales,
    retailerPayments,
    activeSessionDate,
    userCommodities,
    language,
    stocks,
    updateStockItem,
  } = useMandi();

  const [selectedRetailerId, setSelectedRetailerId] = useState<string>(preselectedRetailerId || '');
  
  // Inline New Retailer Creation State
  const [showAddNewRetailer, setShowAddNewRetailer] = useState<boolean>(false);
  const [newRetailerName, setNewRetailerName] = useState<string>('');
  const [newRetailerPhone, setNewRetailerPhone] = useState<string>('');
  const [newRetailerShop, setNewRetailerShop] = useState<string>('');

  const [date, setDate] = useState<string>(activeSessionDate || new Date().toISOString().split('T')[0]);
  const [amountPaidNow, setAmountPaidNow] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [deductStock, setDeductStock] = useState<boolean>(true);
  const [allowAdvance, setAllowAdvance] = useState<boolean>(false);
  const [showDueDetailsModal, setShowDueDetailsModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Line items state for multi-variety entry (same as farmer slip)
  const [items, setItems] = useState<
    {
      id: string;
      category: CommodityCategory;
      varietyName: string;
      quantity: string;
      unit: WeightUnit;
      rate: string;
    }[]
  >([
    {
      id: `item-${Date.now()}-1`,
      category: userCommodities[0] || 'flowers',
      varietyName: 'Dutch Rose (Greenhouse)',
      quantity: '',
      unit: 'Bunches',
      rate: '90',
    },
  ]);

  React.useEffect(() => {
    if (preselectedRetailerId) {
      setSelectedRetailerId(preselectedRetailerId);
    } else if (retailers.length > 0 && !selectedRetailerId) {
      setSelectedRetailerId(retailers[0].id);
    }
  }, [preselectedRetailerId, retailers]);

  // Auto-calculate line item amounts and total
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      const amt = q * r;
      return {
        ...item,
        numQuantity: q,
        numRate: r,
        amount: amt,
      };
    });
  }, [items]);

  const grossTotal = useMemo(() => {
    return calculatedItems.reduce((sum, item) => sum + item.amount, 0);
  }, [calculatedItems]);

  const currentRetailer = retailers.find((r) => r.id === selectedRetailerId);

  // Selected retailer's prior sales and payments (for Previous Due)
  const customerPriorSales = useMemo(() => {
    if (!currentRetailer) return [];
    return retailerSales.filter((s) => s.retailerId === currentRetailer.id);
  }, [currentRetailer, retailerSales]);

  const customerPriorPayments = useMemo(() => {
    if (!currentRetailer) return [];
    return retailerPayments.filter((p) => p.retailerId === currentRetailer.id);
  }, [currentRetailer, retailerPayments]);

  const previousDue = useMemo(() => {
    if (!currentRetailer) return 0;
    const totalBilled = customerPriorSales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
    const paidAtSales = customerPriorSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const directPayments = customerPriorPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaid = paidAtSales + directPayments;
    return Math.max(0, totalBilled - totalPaid);
  }, [currentRetailer, customerPriorSales, customerPriorPayments]);

  const grandTotalPayable = grossTotal + previousDue;
  const numAmountPaid = parseFloat(amountPaidNow) || 0;
  const remainingBalance = grandTotalPayable - numAmountPaid;

  const isPaymentOverLimit = numAmountPaid > grandTotalPayable && !allowAdvance;
  const isPaymentNegative = numAmountPaid < 0;
  const paymentValidationError = isPaymentNegative
    ? 'Amount paid cannot be negative.'
    : isPaymentOverLimit
    ? `Amount paid cannot exceed Grand Total Payable (₹${grandTotalPayable.toLocaleString('en-IN')}) unless advance payment is enabled.`
    : null;

  const handlePresetPayFull = () => setAmountPaidNow(String(grandTotalPayable));
  const handlePresetPayHalf = () => setAmountPaidNow(String(Math.round(grandTotalPayable / 2)));
  const handlePresetPayTodaysOnly = () => setAmountPaidNow(String(grossTotal));
  const handlePresetCustom = () => setAmountPaidNow('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    const lastItem = items[items.length - 1];
    const category = lastItem ? lastItem.category : (userCommodities[0] || 'flowers');
    const config = COMMODITY_CONFIGS[category];
    const defaultVariety = config?.varieties[0]?.en || 'Dutch Rose';
    const defaultUnit = config?.allowedUnits[0] || 'Kgs';

    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${items.length + 1}`,
        category,
        varietyName: defaultVariety,
        quantity: '',
        unit: defaultUnit,
        rate: '',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      alert('At least one item is required in a retailer sale entry.');
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: 'category' | 'varietyName' | 'quantity' | 'unit' | 'rate',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === 'category') {
          const category = value as CommodityCategory;
          const config = COMMODITY_CONFIGS[category];
          const firstVariety = config?.varieties[0]?.en || 'General Variety';
          const firstUnit = config?.allowedUnits[0] || 'Kgs';
          return {
            ...item,
            category,
            varietyName: firstVariety,
            unit: firstUnit,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const handleCreateInlineRetailer = () => {
    if (!newRetailerName.trim()) {
      alert('Please enter retailer name');
      return;
    }
    if (!newRetailerPhone.trim() || newRetailerPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    const created = addRetailer({
      name: newRetailerName.trim(),
      phone: newRetailerPhone.replace(/\D/g, '').slice(-10),
      shopOrMarket: newRetailerShop.trim() || 'Retail Market',
    });

    setSelectedRetailerId(created.id);
    setShowAddNewRetailer(false);
    setNewRetailerName('');
    setNewRetailerPhone('');
    setNewRetailerShop('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let activeRetailer = currentRetailer;
    if (showAddNewRetailer) {
      if (!newRetailerName.trim() || !newRetailerPhone.trim()) {
        alert('Please fill in new retailer details');
        return;
      }
      activeRetailer = addRetailer({
        name: newRetailerName.trim(),
        phone: newRetailerPhone.replace(/\D/g, '').slice(-10),
        shopOrMarket: newRetailerShop.trim() || 'Retail Market',
      });
    }

    if (!activeRetailer) {
      alert('Please select or add a retailer');
      return;
    }

    if (calculatedItems.some((i) => !i.numQuantity || i.numQuantity <= 0 || !i.numRate || i.numRate <= 0)) {
      alert('Please enter valid quantity and rate for all line items.');
      return;
    }

    if (paymentValidationError) {
      alert(paymentValidationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const finalItems: RetailerSaleItem[] = calculatedItems.map((ci) => ({
        id: ci.id,
        commodityCategory: ci.category,
        varietyName: ci.varietyName,
        quantity: ci.numQuantity,
        unit: ci.unit,
        rate: ci.numRate,
        amount: ci.amount,
      }));

      const paymentStatus = remainingBalance <= 0 ? 'Paid' : numAmountPaid > 0 ? 'Partial' : 'Unpaid';

      const createdSale = addRetailerSale({
        date,
        retailerId: activeRetailer.id,
        retailerName: activeRetailer.name,
        retailerPhone: activeRetailer.phone,
        retailerShop: activeRetailer.shopOrMarket,
        items: finalItems,
        grossTotal,
        previousDue,
        grandTotalPayable,
        amountPaid: numAmountPaid,
        balanceDue: remainingBalance,
        paymentStatus,
        paymentMode: numAmountPaid > 0 ? paymentMode : undefined,
        notes: notes.trim() || undefined,
      });

      // Optionally subtract sold quantity from stock
      if (deductStock && stocks.length > 0) {
        finalItems.forEach((item) => {
          const matchedStock = stocks.find(
            (s) => s.name.toLowerCase().includes(item.varietyName.toLowerCase()) || item.varietyName.toLowerCase().includes(s.name.toLowerCase())
          );
          if (matchedStock) {
            const updatedQty = Math.max(0, matchedStock.quantityOnHand - item.quantity);
            updateStockItem(matchedStock.id, {
              quantityOnHand: updatedQty,
              lastUpdated: new Date().toISOString().split('T')[0],
            });
          }
        });
      }

      setIsSubmitting(false);
      onClose();
      if (onSaleCreated) {
        onSaleCreated(createdSale.id);
      }
    } catch (err) {
      setIsSubmitting(false);
      alert('Error creating retailer sale entry. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Modal Header */}
        <div className="bg-[#1a3a52] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">New Retailer Sale Entry (Retail Parchi)</h2>
              <p className="text-xs text-slate-300 font-medium">Record retail goods taken, calculate amount, and receive advance cash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Retailer Selection Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-600" />
                Select Retailer *
              </label>
              <button
                type="button"
                onClick={() => setShowAddNewRetailer(!showAddNewRetailer)}
                className="text-xs font-bold text-[#1a3a52] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddNewRetailer ? 'Select Existing Retailer' : '+ Add New Retailer'}</span>
              </button>
            </div>

            {!showAddNewRetailer ? (
              <select
                value={selectedRetailerId}
                onChange={(e) => setSelectedRetailerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-bold text-sm text-[#1e293b] outline-none bg-white"
                required
              >
                {retailers.length === 0 ? (
                  <option value="">No retailers registered yet - Click "+ Add New Retailer"</option>
                ) : (
                  retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.shopOrMarket} (Ph: {r.phone})
                    </option>
                  ))
                )}
              </select>
            ) : (
              <div className="space-y-2.5 pt-1 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Retailer Full Name *"
                    value={newRetailerName}
                    onChange={(e) => setNewRetailerName(e.target.value.replace(/[0-9]/g, ''))}
                    className="px-3 py-2 rounded-lg border border-slate-300 font-bold text-xs bg-white outline-none focus:border-[#1a3a52]"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Mobile Number (10 Digits) *"
                    value={newRetailerPhone}
                    onChange={(e) => setNewRetailerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-xs bg-white outline-none focus:border-[#1a3a52]"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Shop Name / Market Yard Location (e.g. Stall #4)"
                    value={newRetailerShop}
                    onChange={(e) => setNewRetailerShop(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 font-medium text-xs bg-white outline-none focus:border-[#1a3a52]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateInlineRetailer}
                    className="px-3 py-2 rounded-lg bg-[#1a3a52] hover:bg-[#122839] text-white font-bold text-xs transition cursor-pointer"
                  >
                    Save Retailer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#1a3a52]" />
              Sale Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-xs text-[#1e293b] outline-none bg-white"
              required
            />
          </div>

          {/* Line Items Table (Multiple Varieties in 1 Entry) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#1a3a52] flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                Goods Taken / Line Items (माल का विवरण)
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item / Variety</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const config = COMMODITY_CONFIGS[item.category];
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group hover:border-[#1a3a52] transition"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Category Selector */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-bold text-xs bg-white outline-none"
                        >
                          {userCommodities.map((cat) => (
                            <option key={cat} value={cat}>
                              {COMMODITY_CONFIGS[cat]?.name || cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variety Name */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Variety Name *</label>
                        <select
                          value={item.varietyName}
                          onChange={(e) => handleItemChange(item.id, 'varietyName', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-bold text-xs bg-white outline-none"
                        >
                          {config?.varieties.map((v) => (
                            <option key={v.id} value={v.en}>
                              {v.en}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity & Unit */}
                      <div className="sm:col-span-3 flex gap-1">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Qty *</label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            placeholder="0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs bg-white outline-none"
                            required
                          />
                        </div>
                        <div className="w-20">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                            className="w-full px-1.5 py-1.5 rounded-lg border border-slate-300 font-bold text-[11px] bg-white outline-none"
                          >
                            {config?.allowedUnits.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Rate per unit */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Rate (₹) *</label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs bg-white outline-none text-right"
                          required
                        />
                      </div>
                    </div>

                    {/* Calculated Line Item Total */}
                    <div className="text-right text-xs font-bold text-slate-700 pt-0.5">
                      Item Total: <span className="font-mono text-[#1a3a52] font-black">₹{calculatedItems[idx].amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Box Order: Today's Total -> Previous Due -> Grand Total */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#1a3a52] border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Retail Bill Breakup</span>
            </h3>

            <div className="space-y-2 text-xs">
              {/* 1. Today's Sale Total */}
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>1. Today's Sale Total (sum of item varieties)</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  ₹{grossTotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* 2. Previous Due */}
              <div className="flex items-center justify-between font-bold text-slate-700 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                <div className="flex items-center gap-2">
                  <span>2. Previous Due (Carry-forward balance)</span>
                  {currentRetailer && (
                    <button
                      type="button"
                      onClick={() => setShowDueDetailsModal(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-extrabold underline cursor-pointer"
                    >
                      (View details)
                    </button>
                  )}
                </div>
                <span className="font-mono font-black text-rose-700 text-sm">
                  ₹{previousDue.toLocaleString('en-IN')}
                </span>
              </div>

              {/* 3. Grand Total Payable */}
              <div className="flex items-center justify-between font-black text-[#1a3a52] bg-blue-50/80 p-2.5 rounded-lg border border-blue-200 text-sm sm:text-base">
                <span>3. GRAND TOTAL PAYABLE</span>
                <span className="font-mono font-black text-lg text-[#1a3a52]">
                  ₹{grandTotalPayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Quick Payment Amount Presets */}
            <div className="pt-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Quick Payment Presets:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={handlePresetPayFull}
                  className={`py-1.5 px-2 rounded-lg font-black text-xs transition border cursor-pointer ${
                    numAmountPaid === grandTotalPayable && grandTotalPayable > 0
                      ? 'bg-[#1a3a52] text-white border-[#1a3a52]'
                      : 'bg-white text-[#1a3a52] border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Pay Full (₹{grandTotalPayable.toLocaleString('en-IN')})
                </button>

                <button
                  type="button"
                  onClick={handlePresetPayHalf}
                  className={`py-1.5 px-2 rounded-lg font-black text-xs transition border cursor-pointer ${
                    numAmountPaid === Math.round(grandTotalPayable / 2) && numAmountPaid > 0
                      ? 'bg-[#1a3a52] text-white border-[#1a3a52]'
                      : 'bg-white text-[#1a3a52] border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Pay Half (₹{Math.round(grandTotalPayable / 2).toLocaleString('en-IN')})
                </button>

                <button
                  type="button"
                  onClick={handlePresetPayTodaysOnly}
                  className={`py-1.5 px-2 rounded-lg font-black text-xs transition border cursor-pointer ${
                    numAmountPaid === grossTotal && grossTotal > 0
                      ? 'bg-[#1a3a52] text-white border-[#1a3a52]'
                      : 'bg-white text-[#1a3a52] border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Pay Today's Only (₹{grossTotal.toLocaleString('en-IN')})
                </button>

                <button
                  type="button"
                  onClick={handlePresetCustom}
                  className="py-1.5 px-2 rounded-lg font-bold text-xs bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Payment Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  Amount Paid Now (₹)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountPaidNow}
                  onChange={(e) => setAmountPaidNow(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 focus:border-[#1a3a52] font-mono font-black text-sm text-[#1e293b] outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 focus:border-[#1a3a52] font-bold text-xs text-[#1e293b] outline-none bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Paytm">Paytm</option>
                  <option value="Google Pay">Google Pay</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            {/* Calculated Remaining Balance Due Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold">
              <span className="text-slate-600">Remaining Balance Due:</span>
              <span className={`font-mono font-black text-base ${remainingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {remainingBalance <= 0 ? 'Cleared ✓' : `₹${remainingBalance.toLocaleString('en-IN')}`}
              </span>
            </div>

            {/* Validation Error Banner */}
            {paymentValidationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs font-bold">
                {paymentValidationError}
              </div>
            )}

            {/* Advance Payment Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="modal-allow-advance-toggle"
                checked={allowAdvance}
                onChange={(e) => setAllowAdvance(e.target.checked)}
                className="w-4 h-4 rounded text-[#1a3a52] focus:ring-[#1a3a52] cursor-pointer"
              />
              <label htmlFor="modal-allow-advance-toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                Allow advance payment exceeding Grand Total Payable
              </label>
            </div>
          </div>

          {/* Stock Deduction Option */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              id="deduct-stock-checkbox"
              checked={deductStock}
              onChange={(e) => setDeductStock(e.target.checked)}
              className="w-4 h-4 rounded-xs text-[#1a3a52] accent-[#1a3a52]"
            />
            <label htmlFor="deduct-stock-checkbox" className="cursor-pointer">
              Automatically subtract sold quantities from available farmer Mandi stock
            </label>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wedding flowers morning delivery"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#1a3a52] text-xs text-[#1e293b] outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-xs text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || grossTotal <= 0}
              className="flex-1 py-3 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] disabled:opacity-50 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving Entry...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-blue-300" />
                  <span>Save Retail Parchi (₹{grossTotal.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Previous Due Details Modal */}
        {showDueDetailsModal && currentRetailer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
              <div className="bg-[#1a3a52] text-white p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black">Previous Due Details</h3>
                  <p className="text-xs text-slate-300 font-medium">{currentRetailer.name} • {currentRetailer.shopOrMarket}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDueDetailsModal(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                  <span className="font-bold text-slate-700">Total Outstanding Previous Due:</span>
                  <span className="font-mono font-black text-rose-700 text-base">₹{previousDue.toLocaleString('en-IN')}</span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-[#1a3a52] uppercase text-[10px] tracking-wider">Prior Sales History ({customerPriorSales.length})</h4>
                  {customerPriorSales.length === 0 ? (
                    <p className="text-slate-400 italic">No prior sales recorded.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1a3a52] text-white font-bold text-[10px] uppercase">
                          <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Ref #</th>
                            <th className="p-2 text-right">Gross (₹)</th>
                            <th className="p-2 text-right">Paid (₹)</th>
                            <th className="p-2 text-right">Due (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerPriorSales.map((s) => (
                            <tr key={s.id}>
                              <td className="p-2 font-mono text-[11px]">{s.date}</td>
                              <td className="p-2 font-mono font-bold text-[#1a3a52]">{s.parchiNumber}</td>
                              <td className="p-2 text-right font-mono">₹{s.grossTotal.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-right font-mono text-emerald-700">₹{s.amountPaid.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-right font-mono font-bold text-rose-700">₹{s.balanceDue.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {customerPriorPayments.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <h4 className="font-black text-emerald-800 uppercase text-[10px] tracking-wider">Direct Payments Received ({customerPriorPayments.length})</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-emerald-800 text-white font-bold text-[10px] uppercase">
                          <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Mode</th>
                            <th className="p-2 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerPriorPayments.map((p) => (
                            <tr key={p.id}>
                              <td className="p-2 font-mono text-[11px]">{p.date}</td>
                              <td className="p-2 font-bold text-emerald-800">{p.paymentMode}</td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-800">₹{p.amount.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDueDetailsModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white font-bold text-xs cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
