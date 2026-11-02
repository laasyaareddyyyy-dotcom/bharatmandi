import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { hashPin, verifyPin } from '../../utils/security';
import { sounds } from '../../utils/audio';

interface Props {
  isOpen: boolean;
  onUnlocked: () => void;
}

export const AppPinLockModal: React.FC<Props> = ({ isOpen, onUnlocked }) => {
  const { currentUserAccount, registeredAccounts, switchUserAccount, currentUserPhone } = useMandi();
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isSettingNewPin, setIsSettingNewPin] = useState<boolean>(false);
  const [pinStep, setPinStep] = useState<'enter_pin' | 'confirm_pin'>('enter_pin');
  const [tempNewPin, setTempNewPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const storedPinHash = currentUserAccount?.pinHash || localStorage.getItem(`bharatmandi_pin_hash_${currentUserPhone}`);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setErrorMsg('');
      setSuccessMsg('');
      if (!storedPinHash) {
        setIsSettingNewPin(true);
        setPinStep('enter_pin');
      } else {
        setIsSettingNewPin(false);
      }
    }
  }, [isOpen, storedPinHash, currentUserPhone]);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    sounds.playBidTick?.();
    setErrorMsg('');
    if (isSettingNewPin) {
      if (pinStep === 'enter_pin') {
        if (pin.length < 4) {
          const next = pin + digit;
          setPin(next);
          if (next.length === 4) {
            setTempNewPin(next);
            setPin('');
            setPinStep('confirm_pin');
          }
        }
      } else if (pinStep === 'confirm_pin') {
        if (confirmPin.length < 4) {
          const next = confirmPin + digit;
          setConfirmPin(next);
          if (next.length === 4) {
            handleSaveNewPin(tempNewPin, next);
          }
        }
      }
    } else {
      if (pin.length < 4) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 4) {
          handleVerifyExistingPin(next);
        }
      }
    }
  };

  const handleBackspace = () => {
    sounds.playBidTick?.();
    setErrorMsg('');
    if (isSettingNewPin) {
      if (pinStep === 'enter_pin') {
        setPin((prev) => prev.slice(0, -1));
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleSaveNewPin = async (p1: string, p2: string) => {
    if (p1 !== p2) {
      setErrorMsg('PINs do not match! Please try again.');
      sounds.playTrashSound?.();
      setConfirmPin('');
      setPin('');
      setPinStep('enter_pin');
      return;
    }

    try {
      const hashed = await hashPin(p1);
      localStorage.setItem(`bharatmandi_pin_hash_${currentUserPhone}`, hashed);
      if (currentUserAccount) {
        currentUserAccount.pinHash = hashed;
      }
      setSuccessMsg('App PIN set successfully!');
      sounds.playCashChime?.();
      setTimeout(() => {
        onUnlocked();
      }, 500);
    } catch {
      setErrorMsg('Failed to set PIN');
    }
  };

  const handleVerifyExistingPin = async (inputPin: string) => {
    if (!storedPinHash) return;
    const isMatch = await verifyPin(inputPin, storedPinHash);
    if (isMatch) {
      sounds.playCashChime?.();
      onUnlocked();
    } else {
      sounds.playTrashSound?.();
      setErrorMsg('Incorrect 4-Digit PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner">
          <Lock className="h-8 w-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900">
          {isSettingNewPin
            ? pinStep === 'enter_pin'
              ? 'Create 4-Digit App PIN'
              : 'Confirm Your 4-Digit PIN'
            : 'Enter 4-Digit Security PIN'}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {isSettingNewPin
            ? 'Set a 4-digit PIN to secure shop ledger and financial statements'
            : 'Enter your security PIN to view shop sales and farmer statements'}
        </p>

        {/* PIN Dots */}
        <div className="my-6 flex justify-center gap-4">
          {[0, 1, 2, 3].map((idx) => {
            const currentVal = isSettingNewPin && pinStep === 'confirm_pin' ? confirmPin : pin;
            const isFilled = currentVal.length > idx;
            return (
              <div
                key={idx}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all ${
                  isFilled
                    ? 'border-emerald-600 bg-emerald-600 text-white font-bold text-xl shadow-md scale-105'
                    : 'border-slate-200 bg-slate-50 text-slate-300'
                }`}
              >
                {isFilled ? '•' : ''}
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigitClick(num)}
              type="button"
              className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-800 transition active:scale-95 hover:bg-slate-200"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigitClick('0')}
            type="button"
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-800 transition active:scale-95 hover:bg-slate-200"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            type="button"
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-700 transition active:scale-95 hover:bg-slate-300"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};
