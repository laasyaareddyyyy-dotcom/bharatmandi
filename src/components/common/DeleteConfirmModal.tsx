import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, ArrowLeft } from 'lucide-react';

/* =========================================================================
   DELETE CONFIRM MODAL: UNIVERSAL STANDARDIZED MODAL
   - Fixed Header with 44px close button
   - Scrollable content area
   - Fixed Footer with high-contrast action buttons
   - Backdrop click & Escape key dismiss
   ========================================================================= */

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  itemDetails?: string;
  message?: string;
  confirmWord?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = 'Confirm Deletion',
  itemName,
  itemDetails,
  message,
  confirmWord,
  onConfirm,
  onCancel,
  onClose,
  confirmText = 'CONFIRM DELETE',
  cancelText = 'CANCEL',
}) => {
  const handleDismiss = onClose || onCancel;
  const [typedInput, setTypedInput] = React.useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedInput('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isConfirmedDisabled = Boolean(
    confirmWord && typedInput.trim().toLowerCase() !== confirmWord.trim().toLowerCase()
  );

  return (
    <div
      id="delete-confirmation-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      onClick={onCancel}
    >
      <div
        id="delete-confirmation-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              aria-label="Go Back"
              className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-300 hidden sm:flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
              <p className="text-[11px] text-red-300 font-medium leading-none mt-0.5">Permanent record action</p>
            </div>
          </div>

          <button
            type="button"
            id="delete-modal-close-x-btn"
            onClick={onCancel}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0 space-y-4 bg-white">
          {/* Item details card if provided */}
          {itemName && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Item to be deleted:
              </div>
              <div className="text-sm font-black text-[#1e293b]">{itemName}</div>
              {itemDetails && (
                <div className="text-xs text-slate-500 font-medium">{itemDetails}</div>
              )}
            </div>
          )}

          {/* Prompt Question & Message */}
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-[#1e293b]">
              Are you sure you want to proceed?
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {message ||
                'This item will be permanently deleted from the mandi ledger records and cannot be recovered.'}
            </p>
          </div>

          {/* Type-to-confirm input */}
          {confirmWord && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label htmlFor="delete-confirm-word-input" className="text-xs font-bold text-slate-700 block">
                Type <span className="font-mono font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{confirmWord}</span> to confirm:
              </label>
              <input
                id="delete-confirm-word-input"
                type="text"
                autoFocus
                placeholder={`Type "${confirmWord}" here...`}
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
              />
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            id="delete-modal-cancel-btn"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white text-xs font-bold hover:bg-slate-100 transition cursor-pointer shadow-2xs min-touch-target"
          >
            {cancelText}
          </button>
          <button
            type="button"
            id="delete-modal-confirm-btn"
            disabled={isConfirmedDisabled}
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer min-touch-target"
          >
            <Trash2 className="w-3.5 h-3.5 text-white" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
