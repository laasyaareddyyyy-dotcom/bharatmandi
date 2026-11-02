import React, { useState, useEffect } from 'react';
import { Scale, RotateCcw, Check, Sparkles, Plus, Minus, Wifi } from 'lucide-react';
import { sounds } from '../../utils/audio';
import { useMandi } from '../../context/MandiContext';

interface DigitalWeighingScaleProps {
  onCaptureWeight?: (weight: number) => void;
  onLockWeight?: (weight: number) => void;
  initialWeight?: number;
  compact?: boolean;
}

export const DigitalWeighingScale: React.FC<DigitalWeighingScaleProps> = ({
  onCaptureWeight,
  initialWeight = 50,
  compact = false,
}) => {
  const { language } = useMandi();
  const [grossWeight, setGrossWeight] = useState<number>(initialWeight);
  const [tareWeight, setTareWeight] = useState<number>(0);
  const [isStabilizing, setIsStabilizing] = useState<boolean>(false);
  const [isStable, setIsStable] = useState<boolean>(true);
  const [lastCaptured, setLastCaptured] = useState<number | null>(null);

  // Net weight
  const netWeight = Math.max(0, Number((grossWeight - tareWeight).toFixed(2)));

  // Simulate scale jitter when grossWeight changes
  const triggerWeightChange = (newGross: number) => {
    setIsStabilizing(true);
    setIsStable(false);
    setGrossWeight(newGross);

    setTimeout(() => {
      setIsStabilizing(false);
      setIsStable(true);
      sounds.playBidTick();
    }, 400);
  };

  const handleTare = () => {
    setTareWeight(grossWeight);
    sounds.playScaleBeep();
  };

  const handleZero = () => {
    setTareWeight(0);
    triggerWeightChange(0);
  };

  const handleCapture = () => {
    sounds.playScaleBeep();
    setLastCaptured(netWeight);
    if (onCaptureWeight) {
      onCaptureWeight(netWeight);
    }
  };

  return (
    <div
      id="digital-weighing-scale-widget"
      className="bg-[#1C2420] border-2 border-[#1a3a52] rounded-2xl p-3.5 sm:p-4 text-white shadow-md relative overflow-hidden"
    >
      {/* Scale Brand & Status Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#1a3a52] text-[#d4af37] flex items-center justify-center">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 block font-mono">
              {language === 'te' ? 'ఎలక్ట్రానిక్ కాటా' : 'Electronic Weighing Scale'}
            </span>
            <span className="text-[9px] text-white/50 block">Bluetooth Direct Sync • Model: SCALE-500KG</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
            <Wifi className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
            <span>ONLINE</span>
          </span>
          {isStable ? (
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500 text-black">
              STABLE
            </span>
          ) : (
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500 text-black animate-pulse">
              WEIGHING...
            </span>
          )}
        </div>
      </div>

      {/* Realistic Digital 7-Segment / LCD Glowing Display */}
      <div className="bg-[#0B100D] border-2 border-emerald-950 rounded-xl p-3 sm:p-4 relative shadow-inner mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono text-emerald-500/70 border-b border-emerald-950/80 pb-1 mb-2">
          <span>GROSS: {grossWeight.toFixed(2)} KG</span>
          <span>TARE: {tareWeight.toFixed(2)} KG</span>
          <span>ZERO: {tareWeight === 0 ? 'CAL' : 'TARED'}</span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
              NET WEIGHT
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-wider tabular-nums transition-all ${
                isStabilizing ? 'text-amber-400 blur-[0.3px]' : 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]'
              }`}
            >
              {netWeight.toFixed(2)}
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-300">KG</span>
          </div>
        </div>

        {lastCaptured !== null && (
          <div className="text-right text-[10px] text-emerald-300 font-mono mt-1">
            ✓ Captured: {lastCaptured.toFixed(2)} kg
          </div>
        )}
      </div>

      {/* Interactive Scale Controls: Place Crate / Adjust / Tare / Zero */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-white/70">
          <span>Simulate Flower Cargo on Scale:</span>
          <span className="text-emerald-300">Click to place crate:</span>
        </div>

        {/* Quick Crate Presets */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '20kg Sack', weight: 20 },
            { label: '35kg Crate', weight: 35 },
            { label: '50kg Bag', weight: 50 },
            { label: '75kg Lot', weight: 75 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => triggerWeightChange(preset.weight + (Math.random() * 0.8 - 0.4))}
              className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[11px] font-bold font-mono transition text-center active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Fine Adjustment & Tare / Zero Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => triggerWeightChange(Math.max(0, grossWeight - 1))}
              className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white active:scale-95"
              title="-1 Kg"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => triggerWeightChange(grossWeight + 1)}
              className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white active:scale-95"
              title="+1 Kg"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleTare}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold font-mono border border-amber-500/40 active:scale-95"
              title="Tare crate / basket weight"
            >
              TARE ({tareWeight > 0 ? `${tareWeight.toFixed(1)}k` : '0'})
            </button>
            <button
              type="button"
              onClick={handleZero}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 text-[10px] font-bold font-mono active:scale-95"
              title="Zero scale"
            >
              ZERO
            </button>
          </div>

          <button
            type="button"
            id="scale-capture-weight-btn"
            onClick={handleCapture}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 ml-auto"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Lock Weight to Lot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
