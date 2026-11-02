import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { Retailer, PaymentMode } from '../../types';
import { X, CheckCircle2, Coins, Calendar, User, CreditCard, Hash, FileText } from 'lucide-react';

interface ReceiveRetailerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedRetailerId?: string;
}

export const ReceiveRetailerPaymentModal: React.FC<ReceiveRetailerPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedRetailerId,
}) => {
  const {
    retailers,
    retailerSales,
    retailerPayments,
    addRetailerPayment,
    language,
    activeSessionDate,
  } = useMandi();

  const [selectedRetailerId, setSelectedRetailerId] = useState<string>(preselectedRetailerId || '');
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [paymentDate, setPaymentDate] = useState<string>(activeSessionDate || new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  React.useEffect(() => {
    if (preselectedRetailerId) {
      setSelectedRetailerId(preselectedRetailerId);
    } else if (retailers.length > 0 && !selectedRetailerId) {
      setSelectedRetailerId(retailers[0].id);
    }
  }, [preselectedRetailerId, retailers]);

  if (!isOpen) return null;

  const currentRetailer = retailers.find((r) => r.id === selectedRetailerId);

  // Calculate current outstanding balance due for selected retailer
  const retailerTotalBilled = retailerSales
    .filter((s) => s.retailerId === selectedRetailerId)
    .reduce((sum, s) => sum + (s.grossTotal || 0), 0);

  const retailerTotalPaidAtSales = retailerSales
    .filter((s) => s.retailerId === selectedRetailerId)
    .reduce((sum, s) => sum + (s.amountPaid || 0), 0);

  const retailerTotalDirectPayments = retailerPayments
    .filter((p) => p.retailerId === selectedRetailerId)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPaidSoFar = retailerTotalPaidAtSales + retailerTotalDirectPayments;
  const currentBalanceDue = Math.max(0, retailerTotalBilled - totalPaidSoFar);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailerId || !currentRetailer) return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid payment amount greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      addRetailerPayment({
        date: paymentDate,
        retailerId: currentRetailer.id,
        retailerName: currentRetailer.name,
        amount: numAmount,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg(`₹${numAmount.toLocaleString('en-IN')} payment received from ${currentRetailer.name}`);
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMsg('');
        setAmount('');
        setReferenceNumber('');
        setNotes('');
        onClose();
      }, 1200);
    } catch (err) {
      setIsSubmitting(false);
      alert('Failed to record retailer payment. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#1a3a52] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Receive Retailer Payment</h2>
              <p className="text-xs text-slate-300 font-medium">Record cash or online payment received from retailer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          
          {/* Retailer Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#1a3a52]" />
              Select Retailer *
            </label>
            <select
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-semibold text-sm text-[#1e293b] outline-none"
              required
            >
              {retailers.length === 0 ? (
                <option value="">No retailers registered</option>
              ) : (
                retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.shopOrMarket}) - Ph: {r.phone}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Balance Summary Card */}
          {currentRetailer && (
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <p className="text-slate-500 font-medium">Retailer Outstanding Balance:</p>
                <p className="text-[#1a3a52] font-black text-sm">{currentRetailer.name}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Due Amount</span>
                <span className="text-base font-black text-rose-700 font-mono">
                  ₹{currentBalanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Amount Paid Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#1a3a52]" />
              Payment Amount Received (₹) *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 font-bold text-slate-500 text-lg">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={currentBalanceDue > 0 ? `${currentBalanceDue}` : '0'}
                className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-black text-lg text-[#1e293b] outline-none"
                required
                autoFocus
              />
              {currentBalanceDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(currentBalanceDue))}
                  className="absolute right-2 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Pay Full ₹{currentBalanceDue}
                </button>
              )}
            </div>
          </div>

          {/* Payment Mode & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-[#1a3a52]" />
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-bold text-xs text-[#1e293b] outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Google Pay">Google Pay</option>
                <option value="Paytm">Paytm</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#1a3a52]" />
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-xs text-[#1e293b] outline-none"
                required
              />
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              Reference / UTR / Receipt No. (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI-123456789 or Cash Slip #42"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#1a3a52] font-mono text-xs text-[#1e293b] outline-none"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning flower sales installment payment"
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
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className="flex-1 py-3 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] disabled:opacity-50 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Receive ₹{amount ? parseFloat(amount).toLocaleString('en-IN') : '0'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
