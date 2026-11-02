import React, { useState, useMemo } from 'react';
import {
  Package,
  PlusCircle,
  ArrowLeft,
  X,
  Search,
  AlertTriangle,
  Boxes,
  TrendingUp,
  Warehouse,
  Trash2,
  MinusCircle,
  CheckCircle,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { StockItem, CommodityCategory, WeightUnit } from '../../types';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { CustomVarietyInput } from '../common/CustomVarietyInput';
import { sounds } from '../../utils/audio';

export const StockView: React.FC = () => {
  const { stocks, addStockItem, updateStockItem, deleteStockItem, userCommodities, addCustomVarietyName, language } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stockOutModalItem, setStockOutModalItem] = useState<StockItem | null>(null);
  const [stockOutQty, setStockOutQty] = useState<number | ''>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // New Stock Form (defaults to user's first enabled commodity)
  const defaultCommodity = userCommodities[0] || 'grains';
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CommodityCategory>(defaultCommodity);
  const [quantityOnHand, setQuantityOnHand] = useState<number | ''>('');
  const [unit, setUnit] = useState<WeightUnit>(
    defaultCommodity === 'grains' ? 'Quintals' : defaultCommodity === 'flowers' ? 'Kgs' : 'Boxes'
  );
  const [packagesCount, setPackagesCount] = useState<number | ''>('');
  const [packageType, setPackageType] = useState(defaultCommodity === 'grains' ? 'Bags' : 'Boxes');
  const [avgCostPrice, setAvgCostPrice] = useState<number | ''>('');
  const [targetSellingPrice, setTargetSellingPrice] = useState<number | ''>('');
  const [minReorderLevel, setMinReorderLevel] = useState<number | ''>(50);
  const [storageLocation, setStorageLocation] = useState('Godown #1');

  // Delete modal state
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    item: StockItem | null;
  }>({
    isOpen: false,
    item: null,
  });

  // Strict Merchant Type Isolation: only stocks matching userCommodities
  const allowedStocks = useMemo(() => {
    return stocks.filter((item) => userCommodities.includes(item.category));
  }, [stocks, userCommodities]);

  const filteredStocks = useMemo(() => {
    return allowedStocks.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.storageLocation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [allowedStocks, searchQuery, selectedCategory]);

  // Aggregate Metrics
  const totalItemsCount = allowedStocks.length;
  const totalPackages = allowedStocks.reduce((acc, curr) => acc + (curr.packagesCount || 0), 0);
  const totalStockValuation = allowedStocks.reduce(
    (acc, curr) => acc + curr.quantityOnHand * curr.avgCostPrice,
    0
  );
  const lowStockItems = allowedStocks.filter((item) => item.quantityOnHand <= item.minReorderLevel);

  const handleCreateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantityOnHand || Number(quantityOnHand) <= 0) {
      setFeedbackMsg('⚠️ Please enter valid commodity name and quantity.');
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    if (!userCommodities.includes(category)) {
      setFeedbackMsg(`⚠️ Cannot add stock: Category "${category}" is not active for your merchant account.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }

    addCustomVarietyName(name.trim(), category);

    addStockItem({
      name: name.trim(),
      category,
      quantityOnHand: Number(quantityOnHand),
      unit,
      packagesCount: Number(packagesCount || 0),
      packageType,
      avgCostPrice: Number(avgCostPrice || 0),
      targetSellingPrice: Number(targetSellingPrice || 0),
      minReorderLevel: Number(minReorderLevel || 10),
      storageLocation: storageLocation.trim() || 'Main Shed',
    });

    sounds.cashSuccess?.();
    setFeedbackMsg(`✓ Stock added for ${name.trim()} successfully!`);
    setTimeout(() => setFeedbackMsg(null), 3000);

    // Reset Form
    setName('');
    setQuantityOnHand('');
    setPackagesCount('');
    setAvgCostPrice('');
    setTargetSellingPrice('');
    setIsAddModalOpen(false);
  };

  const handleConfirmStockOut = () => {
    if (!stockOutModalItem || !stockOutQty || Number(stockOutQty) <= 0) return;
    const qty = Number(stockOutQty);
    const newQty = Math.max(0, stockOutModalItem.quantityOnHand - qty);
    const newPkgs = Math.max(
      0,
      stockOutModalItem.packagesCount - Math.round((qty / stockOutModalItem.quantityOnHand) * stockOutModalItem.packagesCount)
    );

    updateStockItem(stockOutModalItem.id, {
      quantityOnHand: newQty,
      packagesCount: newPkgs,
    });

    setFeedbackMsg(`✓ Deducted ${qty} ${stockOutModalItem.unit} from ${stockOutModalItem.name}`);
    setTimeout(() => setFeedbackMsg(null), 3000);
    setStockOutModalItem(null);
    setStockOutQty('');
  };

  const handleConfirmDelete = () => {
    if (deleteModalConfig.item) {
      deleteStockItem(deleteModalConfig.item.id);
      sounds.playTrashSound?.();
      setFeedbackMsg(`✓ ${deleteModalConfig.item.name} removed from stock.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      setDeleteModalConfig({ isOpen: false, item: null });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-700 text-white font-bold flex items-center gap-3 shadow-md animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-emerald-700" />
            <span>Mandi Commodity Stock & Godown</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time inventory of incoming agricultural consignments, godown storage & bags on hand
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition active:scale-95 min-h-[48px] cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Add Stock Inward</span>
        </button>
      </div>

      {/* Summary KPI Cards with Breathing Room */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Lines</span>
            <Boxes className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalItemsCount}
          </div>
          <div className="text-xs text-slate-500 font-medium">Commodity varieties in sheds</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Packages</span>
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
            {totalPackages.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 font-medium">Bags, Crates & Boxes on hand</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Valuation</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            ₹{totalStockValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 font-medium">Estimated inventory value at cost</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 font-mono">
            {lowStockItems.length}
          </div>
          <div className="text-xs text-slate-500 font-medium">Items near or below reorder level</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search commodity or godown..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer min-h-[38px] ${
              selectedCategory === 'all'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Items
          </button>
          {[
            { id: 'grains', label: '🌾 Grains' },
            { id: 'vegetables', label: '🥬 Vegetables' },
            { id: 'flowers', label: '🌸 Flowers' },
            { id: 'fruits', label: '🍎 Fruits' },
          ]
            .filter((cat) => userCommodities.includes(cat.id as CommodityCategory))
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer min-h-[38px] ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
        </div>
      </div>

      {/* Stock Items List - Spread vertically with clean margins */}
      <div className="space-y-4">
        {filteredStocks.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No stock records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add new arrivals and inward consignments to monitor godown inventory and balance bags.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add First Stock Item</span>
            </button>
          </div>
        ) : (
          filteredStocks.map((item) => {
            const isLowStock = item.quantityOnHand <= item.minReorderLevel;
            return (
              <div
                key={item.id}
                className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-lg">
                      {item.category === 'flowers'
                        ? '🌸'
                        : item.category === 'grains'
                        ? '🌾'
                        : item.category === 'vegetables'
                        ? '🥬'
                        : '🍎'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          {item.name}
                        </h3>
                        {isLowStock && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low Stock Alert</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Location: <span className="font-semibold text-slate-700">{item.storageLocation}</span> • Last Updated: {item.lastUpdated}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setStockOutModalItem(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition min-h-[44px]"
                    >
                      <MinusCircle className="w-4 h-4 text-amber-700" />
                      <span>Stock Out / Sale</span>
                    </button>
                    <button
                      onClick={() => setDeleteModalConfig({ isOpen: true, item })}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stock Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Available Quantity:</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      {item.quantityOnHand.toLocaleString('en-IN')} {item.unit}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Packages / Bags:</span>
                    <span className="text-base font-black text-amber-800 font-mono">
                      {item.packagesCount} {item.packageType}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Avg Cost Price:</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      ₹{item.avgCostPrice.toLocaleString('en-IN')}/{item.unit}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="text-emerald-700 block font-medium">Total Valuation:</span>
                    <span className="text-base font-black text-emerald-900 font-mono">
                      ₹{(item.quantityOnHand * item.avgCostPrice).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Stock Modal */}
      {isAddModalOpen && (
        <div
          id="add-stock-modal-overlay"
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
        >
          <div
            id="add-stock-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* FIXED HEADER */}
            <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  aria-label="Go Back"
                  className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-[#d4af37] shrink-0">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight">Add Stock Inward</h3>
                  <p className="text-[11px] text-slate-200/80 leading-none mt-0.5">Register commodity into godown storage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStock} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs bg-[#f8fafc]">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Commodity Produce Name *</label>
                <CustomVarietyInput
                  category={category}
                  value={name}
                  onChange={(val) => setName(val)}
                  placeholder="e.g. Sharbati Wheat, Red Onion, Dutch Rose"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CommodityCategory)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  >
                    {[
                      { value: 'grains', label: '🌾 Grains & Pulses' },
                      { value: 'vegetables', label: '🥬 Vegetables' },
                      { value: 'flowers', label: '🌸 Flowers' },
                      { value: 'fruits', label: '🍎 Fruits' },
                    ]
                      .filter((opt) => userCommodities.includes(opt.value as CommodityCategory))
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Weight Unit *</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as WeightUnit)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  >
                    <option value="Quintals">Quintals</option>
                    <option value="Bags">Bags</option>
                    <option value="Kgs">Kgs</option>
                    <option value="Crates">Crates</option>
                    <option value="Bunches">Bunches</option>
                    <option value="Boxes">Boxes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Quantity on Hand *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 100"
                    value={quantityOnHand}
                    onChange={(e) => setQuantityOnHand(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Packages / Bags Count</label>
                  <input
                    type="number"
                    placeholder="e.g. 50 Bags"
                    value={packagesCount}
                    onChange={(e) => setPackagesCount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Cost Rate (₹ per unit)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2400"
                    value={avgCostPrice}
                    onChange={(e) => setAvgCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Expected Selling Rate (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2650"
                    value={targetSellingPrice}
                    onChange={(e) => setTargetSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Godown / Storage Shed</label>
                  <input
                    type="text"
                    placeholder="e.g. Godown #1, Shed B"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Min Reorder Level</label>
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    value={minReorderLevel}
                    onChange={(e) => setMinReorderLevel(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition min-h-[48px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-bold transition shadow-sm min-h-[48px] cursor-pointer"
                >
                  Save Inward Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Out Modal */}
      {stockOutModalItem && (
        <div
          id="stock-out-modal-overlay"
          onClick={() => setStockOutModalItem(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
        >
          <div
            id="stock-out-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* FIXED HEADER */}
            <div className="flex-shrink-0 px-3 sm:px-4 py-3 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setStockOutModalItem(null)}
                  aria-label="Go Back"
                  className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Record Stock Out / Sale</h3>
                  <p className="text-[10px] text-slate-200/80 leading-none mt-0.5">{stockOutModalItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockOutModalItem(null)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#f8fafc]">
              <p className="text-xs text-slate-600">
                Deduct sold quantity from <strong>{stockOutModalItem.name}</strong>.
              </p>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500">Currently in Godown:</span>
                <strong className="block text-sm text-slate-900 font-mono mt-0.5">
                  {stockOutModalItem.quantityOnHand} {stockOutModalItem.unit} ({stockOutModalItem.packagesCount} {stockOutModalItem.packageType})
                </strong>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Quantity Dispatched / Sold ({stockOutModalItem.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 20"
                  value={stockOutQty}
                  onChange={(e) => setStockOutQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStockOutModalItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 min-h-[48px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStockOut}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold min-h-[48px] cursor-pointer"
                >
                  Confirm Deduction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title="Remove Stock Item"
        itemName={deleteModalConfig.item?.name}
        itemDetails={`${deleteModalConfig.item?.quantityOnHand || 0} ${deleteModalConfig.item?.unit || ''} at ${deleteModalConfig.item?.storageLocation || ''}`}
        message="Are you sure you want to delete this commodity stock record? This action cannot be undone."
        onClose={() => setDeleteModalConfig({ isOpen: false, item: null })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
