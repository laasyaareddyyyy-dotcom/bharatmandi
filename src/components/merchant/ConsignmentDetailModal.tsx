import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  FileText,
  Printer,
  Trash2,
  Truck,
  Package,
  Calendar,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  History,
  Layers,
  ArrowRight,
  Edit3,
} from 'lucide-react';
import { Shipment, SaleLot } from '../../types';
import { useMandi } from '../../context/MandiContext';
import { sounds } from '../../utils/audio';

interface ConsignmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: {
    type: 'shipment' | 'lot';
    shipment?: Shipment;
    lot?: SaleLot;
  } | null;
  onDelete?: () => void;
}

type DetailTab = 'summary' | 'commodity' | 'charges' | 'history';

export const ConsignmentDetailModal: React.FC<ConsignmentDetailModalProps> = ({
  isOpen,
  onClose,
  consignment,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');

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

  const {
    openPdfModalForShipment,
    openPdfModalForLot,
    openParchiSlipForShipment,
    setSelectedParchiLot,
    openEditParchiModal,
    lots,
    language,
    merchantProfile,
    activeSessionDate,
  } = useMandi();

  if (!isOpen || !consignment) return null;

  const isShipment = consignment.type === 'shipment' && consignment.shipment;
  const shipment = consignment.shipment;
  const lot = consignment.lot;

  const id = isShipment ? shipment!.shipmentNumber : lot!.parchiNumber;
  const farmerName = isShipment ? shipment!.farmerName : lot!.farmerName;
  const farmerVillage = isShipment ? shipment!.farmerVillage : lot!.farmerVillage;
  const farmerPhone = isShipment ? shipment!.farmerPhone : lot!.farmerPhone;
  const date = isShipment ? shipment!.date : lot!.date;
  const time = isShipment ? shipment!.time : lot!.time;
  const grossTotal = isShipment ? shipment!.grossTotal : lot!.grossTotal;
  const transportCharge = isShipment
    ? shipment!.transportCharge
    : lot!.transportCharges || lot!.otherExpenditures?.transport || 0;
  const hamaliCharge = isShipment
    ? shipment!.hamaliCharge
    : lot!.ammaliCharges || lot!.otherExpenditures?.hamali || 0;
  const netAmount = isShipment
    ? shipment!.netAmountAfterDailyCuts || grossTotal - transportCharge - hamaliCharge
    : lot!.farmerNetPayable || grossTotal - transportCharge - hamaliCharge;
  const paymentStatus = isShipment ? shipment!.paymentStatus : lot!.paymentStatus;
  const balanceDue = isShipment ? shipment!.balanceDue : lot!.balanceDue;
  const amountPaid = isShipment ? shipment!.amountPaid : lot!.amountPaid;
  const notes = isShipment ? shipment!.notes : lot!.notes;

  const items = isShipment
    ? shipment!.items
    : [
        {
          id: lot!.id,
          commodityCategory: lot!.commodityCategory || 'flowers',
          flowerVariety: lot!.flowerVariety,
          quantity: lot!.quantity,
          unit: lot!.unit,
          rate: lot!.rate,
          grossTotal: lot!.grossTotal,
          boxesCount: lot!.boxesCount,
          flowerQuality: lot!.flowerQuality,
        },
      ];

  const totalQuantity = items.reduce((acc, it) => acc + it.quantity, 0);
  const totalPackages = items.reduce((acc, it) => acc + (it.boxesCount || 0), 0);

  const handlePrintSlip = () => {
    sounds.playBidTick();
    if (isShipment && shipment) {
      openParchiSlipForShipment(shipment);
    } else if (lot) {
      setSelectedParchiLot(lot);
    }
  };

  const handleFormCPdf = () => {
    sounds.playBidTick();
    if (isShipment && shipment) {
      openPdfModalForShipment(shipment);
    } else if (lot) {
      openPdfModalForLot(lot);
    }
  };

  return (
    <div
      id="consignment-details-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden no-print"
    >
      <div
        id="consignment-details-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consignment-details-title"
      >
        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              id="back-consignment-detail-btn"
              onClick={onClose}
              aria-label="Go Back"
              className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/15 hidden sm:flex items-center justify-center text-[#d4af37] border border-white/20 shrink-0">
              {isShipment ? <Truck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="consignment-details-title" className="text-sm sm:text-lg font-black leading-tight text-white">
                  {id}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#d4af37] text-[#1e293b] font-black">
                  {isShipment ? 'Shipment Record' : 'Single Lot'}
                </span>
              </div>
              <p className="text-xs text-slate-200/80 leading-none mt-0.5">
                {farmerName} • 📍 {farmerVillage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 bg-[#f1f5f9] border-b border-slate-200 px-4 pt-2 flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {[
            { id: 'summary', label: 'SUMMARY' },
            { id: 'commodity', label: `COMMODITY (${items.length})` },
            { id: 'charges', label: 'CHARGES & DEDUCTIONS' },
            { id: 'history', label: 'HISTORY' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`modal-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#1a3a52] text-[#1a3a52] bg-white shadow-2xs'
                    : 'border-transparent text-[#64748b] hover:text-[#1e293b] hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* 1. SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#f8fafc] p-3.5 rounded-xl border border-[#e2e8f0] space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                    Parchi Identification
                  </span>
                  <div className="space-y-1 text-[#1e293b]">
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">ID Number:</span>
                      <strong className="font-mono text-[#1a3a52]">{id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Session Date:</span>
                      <strong className="font-mono">{date}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Time Recorded:</span>
                      <strong>{time}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Session Type:</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                        {date === activeSessionDate ? 'Live Session' : 'Past Archive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8fafc] p-3.5 rounded-xl border border-[#e2e8f0] space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                    Consignor Farmer Information
                  </span>
                  <div className="space-y-1 text-[#1e293b]">
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Farmer Name:</span>
                      <strong>{farmerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Village/Location:</span>
                      <strong>{farmerVillage}</strong>
                    </div>
                    {farmerPhone && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Mobile:</span>
                        <span className="font-mono">{farmerPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Market Yard:</span>
                      <span>{merchantProfile.marketYardName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="p-4 rounded-xl bg-[#F9F6F0] border border-[#e2e8f0] grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block">Gross Total</span>
                  <span className="text-base sm:text-lg font-black text-[#1e293b]">
                    ₹{grossTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block">Vehicle Freight</span>
                  <span className="text-sm font-bold text-blue-700">₹{transportCharge}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block">Hamali / Loading</span>
                  <span className="text-sm font-bold text-[#d4af37]">₹{hamaliCharge}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#1a3a52] block">Net Payable</span>
                  <span className="text-base sm:text-lg font-black text-[#1a3a52]">
                    ₹{netAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {notes && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900">
                  <strong className="block text-[10px] uppercase font-bold">Parchi Notes:</strong>
                  <p className="mt-0.5">{notes}</p>
                </div>
              )}
            </div>
          )}

          {/* 2. COMMODITY TAB */}
          {activeTab === 'commodity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#64748b] pb-1">
                <span>Varieties &amp; Line Items ({items.length})</span>
                <span>
                  Total Volume: <strong>{totalQuantity} Kgs</strong> • Packages: <strong>{totalPackages} pkgs</strong>
                </span>
              </div>

              <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#f1f5f9] text-[#1e293b] font-bold">
                    <tr>
                      <th className="p-2.5">Commodity &amp; Variety</th>
                      <th className="p-2.5 text-center">Bags / Pkgs</th>
                      <th className="p-2.5 text-center">Grade</th>
                      <th className="p-2.5 text-right">Quantity</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Item Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0] bg-white">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#f8fafc]">
                        <td className="p-2.5 font-bold text-[#1e293b]">
                          <div className="flex items-center gap-1.5">
                            <span>
                              {item.commodityCategory === 'grains'
                                ? '🌾'
                                : item.commodityCategory === 'vegetables'
                                ? '🥦'
                                : item.commodityCategory === 'fruits'
                                ? '🍎'
                                : '🌸'}
                            </span>
                            <span>{item.flowerVariety}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono text-[#64748b]">
                          {item.boxesCount ? `${item.boxesCount} pkgs` : '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {item.flowerQuality || 'Grade A / Premium'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono">₹{item.rate}/{item.unit}</td>
                        <td className="p-2.5 text-right font-mono font-black text-[#1e293b]">
                          ₹{Math.round(item.quantity * item.rate).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f1f5f9] font-bold border-t border-[#e2e8f0]">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right uppercase text-[10px] text-[#64748b]">
                        Total Gross Sum:
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-[#1a3a52]">
                        {totalQuantity} Kgs
                      </td>
                      <td></td>
                      <td className="p-2.5 text-right font-mono font-black text-base text-[#1a3a52]">
                        ₹{grossTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 3. CHARGES & DEDUCTIONS TAB */}
          {activeTab === 'charges' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#e2e8f0] divide-y divide-[#e2e8f0]">
                <div className="p-3.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-sm text-[#1e293b] block">Gross Sales Total</span>
                    <span className="text-[#64748b] text-[11px]">Total sales proceeds before any Mandi deductions</span>
                  </div>
                  <span className="font-mono font-black text-base text-[#1e293b]">
                    ₹{grossTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-[#f8fafc]">
                  <div>
                    <span className="font-bold text-[#1e293b] block">Vehicle Freight Charges</span>
                    <span className="text-[#64748b] text-[11px]">Direct truck/tempo freight deducted once</span>
                  </div>
                  <span className="font-mono font-bold text-blue-700">- ₹{transportCharge}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-[#f8fafc]">
                  <div>
                    <span className="font-bold text-[#1e293b] block">Hamali / Loading / Kata</span>
                    <span className="text-[#64748b] text-[11px]">Unloading, sorting &amp; weighing fees</span>
                  </div>
                  <span className="font-mono font-bold text-[#d4af37]">- ₹{hamaliCharge}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-[#F9F6F0]">
                  <div>
                    <span className="font-black text-sm text-[#1a3a52] block">
                      Net Amount After Daily Cuts
                    </span>
                    <span className="text-[#64748b] text-[11px]">
                      Credited to farmer account ledger
                    </span>
                  </div>
                  <span className="font-mono font-black text-lg text-[#1a3a52]">
                    ₹{netAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Payment Settlement breakdown */}
              <div className="p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#64748b] block">
                  Payment Status Breakdown
                </span>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Already Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">₹{amountPaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Balance Due / Pending:</span>
                  <span className="font-mono font-bold text-red-700">₹{balanceDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1a3a52]">
                  <History className="w-4 h-4" />
                  <span>Audit Trail &amp; Life-cycle History</span>
                </div>

                <div className="space-y-2 text-[#1e293b]">
                  <div className="flex justify-between border-b border-[#e2e8f0]/70 pb-2">
                    <span className="text-[#64748b]">Created At:</span>
                    <span className="font-mono">{date} {time}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#e2e8f0]/70 pb-2">
                    <span className="text-[#64748b]">Last Modified:</span>
                    <span className="font-mono">{date} {time}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#e2e8f0]/70 pb-2">
                    <span className="text-[#64748b]">Last Viewed:</span>
                    <span className="font-mono">Today</span>
                  </div>
                  <div className="flex justify-between border-b border-[#e2e8f0]/70 pb-2">
                    <span className="text-[#64748b]">Active Session Date:</span>
                    <span className="font-mono">{date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Archived Status:</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">
                      {date === activeSessionDate ? 'Active (Live)' : 'Archived Day'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="detail-modal-slip-btn"
              onClick={handlePrintSlip}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#1e293b] text-xs font-bold hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs min-touch-target"
            >
              <Printer className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Parchi Slip</span>
            </button>

            <button
              type="button"
              id="detail-modal-edit-btn"
              onClick={() => {
                onClose();
                if (lot) {
                  openEditParchiModal(lot);
                } else if (shipment) {
                  const lotFromShipment = lots.find((l) => l.shipmentId === shipment.id) || {
                    id: shipment.id,
                    parchiNumber: shipment.shipmentNumber,
                    date: shipment.date,
                    time: shipment.time,
                    farmerId: shipment.farmerId,
                    farmerName: shipment.farmerName,
                    farmerVillage: shipment.farmerVillage,
                    farmerPhone: shipment.farmerPhone,
                    commodityCategory: shipment.items[0]?.commodityCategory || 'flowers',
                    flowerVariety: shipment.items.map((i) => `${i.flowerVariety} (${i.quantity} ${i.unit})`).join(', '),
                    quantity: shipment.items.reduce((s, i) => s + i.quantity, 0),
                    unit: shipment.items[0]?.unit || 'Kgs',
                    boxesCount: shipment.items.reduce((s, i) => s + (i.boxesCount || 0), 0),
                    flowerQuality: shipment.items[0]?.flowerQuality || 'Good',
                    rate: shipment.items[0]?.rate || 0,
                    grossTotal: shipment.grossTotal,
                    commissionPercent: shipment.commissionPercent,
                    commissionAmount: shipment.commissionAmount,
                    transportCharges: shipment.transportCharge,
                    ammaliCharges: shipment.hamaliCharge,
                    otherExpenditures: {
                      transport: shipment.transportCharge,
                      hamali: shipment.hamaliCharge,
                      misc: 0,
                    },
                    totalOtherExpenditures: shipment.transportCharge + shipment.hamaliCharge,
                    farmerNetPayable: shipment.netAmountAfterDailyCuts,
                    paymentStatus: shipment.paymentStatus,
                    amountPaid: shipment.amountPaid,
                    balanceDue: shipment.balanceDue,
                    merchantId: shipment.merchantId,
                    merchantName: shipment.merchantName,
                    notes: shipment.notes,
                    shipmentId: shipment.id,
                  };
                  openEditParchiModal(lotFromShipment);
                }
              }}
              className="px-3 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs min-touch-target"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-800" />
              <span>Edit Parchi</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                id="detail-modal-delete-btn"
                onClick={onDelete}
                className="p-2 min-w-[40px] min-h-[40px] rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition cursor-pointer flex items-center justify-center"
                title="Delete this record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition cursor-pointer shadow-xs min-touch-target"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
