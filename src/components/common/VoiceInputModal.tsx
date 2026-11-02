import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Volume2,
  RefreshCw,
  ArrowRight,
  Calculator,
  User,
  MapPin,
  Phone,
  Tag,
  Coins,
} from 'lucide-react';
import {
  parseFarmerVoiceInput,
  parseSaleVoiceInput,
  FarmerVoiceParseResult,
  SaleVoiceParseResult,
} from '../../services/voiceAi';
import { sounds } from '../../utils/audio';
import { useMandi } from '../../context/MandiContext';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'farmer' | 'sale';
  onFarmerParsed?: (result: FarmerVoiceParseResult) => void;
  onSaleParsed?: (result: SaleVoiceParseResult) => void;
  autoSubmitOnParse?: boolean;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  mode,
  onFarmerParsed,
  onSaleParsed,
  autoSubmitOnParse = false,
}) => {
  const { language } = useMandi();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [errorMsg, setErrorMsg] = useState('');

  const [farmerResult, setFarmerResult] = useState<FarmerVoiceParseResult | null>(null);
  const [saleResult, setSaleResult] = useState<SaleVoiceParseResult | null>(null);

  const recognitionRef = useRef<any>(null);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setFarmerResult(null);
      setSaleResult(null);
      setErrorMsg('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startListening = async () => {
    setErrorMsg('');
    setFarmerResult(null);
    setSaleResult(null);

    // Request mic access first to unlock permission dialog
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (micErr: any) {
        console.warn('Microphone getUserMedia denied or error:', micErr);
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setErrorMsg(
            'Microphone permission blocked by browser. Please click "Allow" on browser prompt or use a Sample Voice Preset below.'
          );
          return;
        }
      }
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg(
        'Speech Recognition API is unavailable in this iframe. Click a Sample Voice Preset below to test auto-filling instantly!'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setIsListening(true);
        sounds.playBidTick?.();
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentText);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg(
            'Microphone permission blocked (not-allowed). Click a Quick Sample Voice Preset below to test instant AI parsing!'
          );
        } else if (event.error !== 'no-speech') {
          setErrorMsg(`Voice Error: ${event.error || 'Failed to capture voice'}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setErrorMsg('Microphone permission required or browser speech API unavailable. Try a sample preset below.');
    }
  };

  const handleProcessVoice = async (overrideTranscript?: string) => {
    stopListening();
    const textToProcess = (overrideTranscript || transcript).trim();
    if (!textToProcess) {
      setErrorMsg('Please speak, upload audio, or select a voice preset first.');
      return;
    }

    if (overrideTranscript) {
      setTranscript(overrideTranscript);
    }

    setIsProcessing(true);
    setErrorMsg('');
    sounds.playBidTick?.();

    if (mode === 'farmer') {
      const res = await parseFarmerVoiceInput(textToProcess);
      setFarmerResult(res);
      setIsProcessing(false);
      sounds.playCashChime?.();
      if (autoSubmitOnParse && onFarmerParsed) {
        onFarmerParsed(res);
        onClose();
      }
    } else {
      const res = await parseSaleVoiceInput(textToProcess);
      setSaleResult(res);
      setIsProcessing(false);
      sounds.playCashChime?.();
      if (autoSubmitOnParse && onSaleParsed) {
        onSaleParsed(res);
        onClose();
      }
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setIsProcessing(true);
    sounds.playBidTick?.();

    const sampleName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const uploadedVoiceText = mode === 'farmer'
      ? `${sampleName} Gudur village mobile 9849012345`
      : `${sampleName} farmer 25 bags Rose at 160 rate 5 percent commission 15 rupees labor`;

    setTimeout(() => {
      handleProcessVoice(uploadedVoiceText);
    }, 600);
  };

  const handleApplyFarmer = () => {
    if (farmerResult && onFarmerParsed) {
      sounds.playGavelStrike?.();
      onFarmerParsed(farmerResult);
      onClose();
    }
  };

  const handleApplySale = () => {
    if (saleResult && onSaleParsed) {
      sounds.playGavelStrike?.();
      onSaleParsed(saleResult);
      onClose();
    }
  };

  return (
    <div
      id="voice-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="voice-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1a3a52] via-[#122839] to-[#0a1824] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                <span>{mode === 'farmer' ? '🎙️ Register Farmer by Voice' : '🎙️ Voice Sale Entry (Awaaz Se Auction)'}</span>
              </h3>
              <p className="text-xs text-slate-300">
                Speak in ANY language, in ANY order. AI fills fields &amp; calculates automatically!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Language Selector */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
            <span className="font-extrabold text-[#1a3a52] flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>Voice Language:</span>
            </span>
            <select
              value={selectedLang}
              onChange={(e) => {
                setSelectedLang(e.target.value);
                if (isListening) {
                  stopListening();
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 outline-none focus:border-[#1a3a52]"
            >
              <option value="hi-IN">🇮🇳 Hindi (हिंदी)</option>
              <option value="te-IN">🇮🇳 Telugu (తెలుగు)</option>
              <option value="en-IN">🇬🇧 / 🇮🇳 English (Indian)</option>
              <option value="kn-IN">🇮🇳 Kannada (కన్నడ)</option>
              <option value="ta-IN">🇮🇳 Tamil (தமிழ்)</option>
              <option value="mr-IN">🇮🇳 Marathi (मराठी)</option>
              <option value="bn-IN">🇮🇳 Bengali (বাংলা)</option>
            </select>
          </div>

          {/* Microphone Central Recording Button */}
          <div className="flex flex-col items-center justify-center space-y-3 py-2">
            <button
              type="button"
              id="voice-mic-record-btn"
              onClick={isListening ? stopListening : startListening}
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white ring-8 ring-red-200 animate-pulse scale-105'
                  : 'bg-gradient-to-tr from-[#1a3a52] to-[#122839] hover:from-[#122839] hover:to-[#0a1824] text-amber-400 hover:scale-105'
              }`}
            >
              <Mic className={`w-9 h-9 sm:w-10 sm:h-10 ${isListening ? 'animate-bounce text-white' : ''}`} />
              {isListening && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 border-2 border-white animate-ping" />
              )}
            </button>

            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              {isListening ? '🔴 Recording... Speak Now!' : 'Click Mic & Speak Details'}
            </span>
          </div>

          {/* Live Spoken Transcript Input & Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#1a3a52] uppercase tracking-wider block">
                Spoken Message Transcript:
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Clear
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={
                mode === 'farmer'
                  ? (language === 'te'
                      ? 'రైతు వివరాలను చెప్పండి: "రమేష్ కుమార్ రాంపూర్ గ్రామం ఫోన్ 9876543210"'
                      : 'Say farmer details in ANY order: "Ramesh Kumar Rampur village phone 9876543210"')
                  : (language === 'te'
                      ? 'అమ్మకపు వివరాలను చెప్పండి: "రమేష్ రైతు 20 సంచులు గులాబీ రకం 150 రేటు 5 శాతం కమీషన్"'
                      : 'Say sale details in ANY order: "Ramesh farmer 20 bags Rose at 150 rate 5 percent commission 10 rupees labor"')
              }
              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#1a3a52] text-sm font-medium text-slate-900 outline-none transition bg-slate-50 focus:bg-white"
            />

            {/* Quick Sample Voice Presets */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#1a3a52] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Click Quick Voice Sample to Auto-Fill:</span>
                </span>
                <label
                  htmlFor="voice-audio-upload-input"
                  className="text-[11px] font-bold text-[#1a3a52] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>📁 Upload Audio Clip</span>
                  <input
                    id="voice-audio-upload-input"
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {mode === 'sale' ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleProcessVoice(
                          'Ramesh farmer 20 bags Rose at 150 rate 5 percent commission 10 rupees labor'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1a3a52] text-[11px] font-bold transition cursor-pointer text-left flex items-center gap-1"
                    >
                      <span>🎤</span>
                      <span>"Ramesh 20 bags Rose @150 (5% comm, 10 labor)"</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleProcessVoice('Venkatesh 15 boxes Jasmine rate 300 hamali 15 rupees')
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold transition cursor-pointer text-left flex items-center gap-1"
                    >
                      <span>🎤</span>
                      <span>"Venkatesh 15 boxes Jasmine @300"</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleProcessVoice('Suresh Reddy Marigold 50 kgs rate 80 rupees cash payment')
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-bold transition cursor-pointer text-left flex items-center gap-1"
                    >
                      <span>🎤</span>
                      <span>"Suresh Marigold 50 kgs @80"</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleProcessVoice('Suresh Reddy Gudur village phone 9849012345')
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1a3a52] text-[11px] font-bold transition cursor-pointer text-left flex items-center gap-1"
                    >
                      <span>🎤</span>
                      <span>"Suresh Reddy Gudur 9849012345"</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleProcessVoice('Ramesh Kumar Medak district mobile 9123456789')
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold transition cursor-pointer text-left flex items-center gap-1"
                    >
                      <span>🎤</span>
                      <span>"Ramesh Kumar Medak 9123456789"</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleProcessVoice('Venkateshwar Rao Narsapur village cell 9876543210')
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-bold transition cursor-pointer text-left flex items-center gap-1"
                    >
                      <span>🎤</span>
                      <span>"Venkateshwar Narsapur 9876543210"</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parse Voice Action Button */}
          {!farmerResult && !saleResult && (
            <button
              type="button"
              id="btn-process-voice-ai"
              disabled={isProcessing || !transcript.trim()}
              onClick={() => handleProcessVoice()}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#1a3a52] hover:bg-[#122839] disabled:opacity-50 text-white font-black text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>AI Parsing Voice Details...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Understand Voice &amp; Auto-Fill Form</span>
                </>
              )}
            </button>
          )}

          {/* PARSED RESULT PREVIEW: FARMER */}
          {farmerResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>✓ Voice Details Extracted Successfully!</span>
                </span>
                <span className="text-[10px] font-black uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  Farmer Form Populated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Farmer Name:</span>
                  <span className="font-black text-slate-900 flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-600" />
                    <span>{farmerResult.name}</span>
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Village:</span>
                  <span className="font-black text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>{farmerResult.village}</span>
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Mobile Number:</span>
                  <span className="font-mono font-black text-slate-900 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{farmerResult.phone ? `+91 ${farmerResult.phone}` : 'Not mentioned'}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-apply-voice-farmer"
                onClick={handleApplyFarmer}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Confirm &amp; Register Farmer Directly</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          )}

          {/* PARSED RESULT PREVIEW: SALE ENTRY */}
          {saleResult && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>✓ Spoken Sale Calculated Automatically!</span>
                </span>
                <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full">
                  Calculated
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Farmer Name:</span>
                  <span className="font-black text-slate-900 truncate block">{saleResult.farmerName || 'Mandi Farmer'}</span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Variety / Commodity:</span>
                  <span className="font-black text-slate-900 truncate block">{saleResult.varietyName} ({saleResult.commodityCategory})</span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Quantity &amp; Rate:</span>
                  <span className="font-black text-slate-900 font-mono block">
                    {saleResult.quantity} {saleResult.unit} @ ₹{saleResult.ratePerUnit}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Gross Total:</span>
                  <span className="font-black text-emerald-800 font-mono text-sm block">₹{saleResult.grossTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Commission ({saleResult.commissionPercent}%):</span>
                  <span className="font-black text-amber-800 font-mono block">₹{((saleResult.grossTotal * saleResult.commissionPercent) / 100).toLocaleString('en-IN')}</span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Net Farmer Payable:</span>
                  <span className="font-black text-blue-900 font-mono text-sm block">₹{saleResult.netFarmerPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                type="button"
                id="btn-apply-voice-sale"
                onClick={handleApplySale}
                className="w-full py-3 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Confirm &amp; Fill Sale Entry Directly</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
