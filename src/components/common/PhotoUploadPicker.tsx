import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  User,
  Image as ImageIcon,
  X,
  RefreshCw,
  Check,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { sounds } from '../../utils/audio';

export interface PhotoPreset {
  id: string;
  name: string;
  url: string;
  tag?: string;
}

export const OWNER_PRESETS: PhotoPreset[] = [
  {
    id: 'owner-1',
    name: 'Ravi Kumar Reddy',
    tag: 'Adathiya Owner',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'owner-2',
    name: 'Suresh Goud',
    tag: 'Wholesale Agent',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'owner-3',
    name: 'Venkatesh Sharma',
    tag: 'Licensed Merchant',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'owner-4',
    name: 'Lakshmi Devi',
    tag: 'Flower Commission Partner',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
  },
];

export const FARMER_PRESETS: PhotoPreset[] = [
  {
    id: 'farmer-1',
    name: 'Ramesh Reddy',
    tag: 'Marigold Grower',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'farmer-2',
    name: 'Suresh Patel',
    tag: 'Jasmine Cultivator',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'farmer-3',
    name: 'K. Venkatesh',
    tag: 'Crossandra Farmer',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'farmer-4',
    name: 'Anjamma Bai',
    tag: 'Tuberose Cultivator',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'farmer-5',
    name: 'Mallesh Yadav',
    tag: 'Greenhouse Rose Farmer',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
  },
];

interface PhotoUploadPickerProps {
  label: string;
  sublabel?: string;
  currentPhotoUrl?: string;
  onChange: (url: string) => void;
  presetType: 'owner' | 'farmer';
  idPrefix: string;
}

export const PhotoUploadPicker: React.FC<PhotoUploadPickerProps> = ({
  label,
  sublabel,
  currentPhotoUrl,
  onChange,
  presetType,
  idPrefix,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'camera' | 'presets'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const presets = presetType === 'owner' ? OWNER_PRESETS : FARMER_PRESETS;

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setActiveMode('camera');
    } catch (err) {
      console.warn('Camera access not available:', err);
      setCameraError('Camera access denied or not supported on this device/browser.');
      setIsCameraActive(false);
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 300, 300);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    onChange(dataUrl);
    stopCamera();
  };

  const compressAndProcessFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange(dataUrl);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      compressAndProcessFile(file);
    }
  };

  const handleRemovePhoto = () => {
    stopCamera();
    onChange('');
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      onChange(customUrlInput.trim());
      setShowUrlInput(false);
      setCustomUrlInput('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-[#1e293b]">
            {label}
          </label>
          {sublabel && <p className="text-[11px] text-[#64748b]">{sublabel}</p>}
        </div>
        {currentPhotoUrl && (
          <button
            type="button"
            id={`${idPrefix}-remove-photo-btn`}
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-[11px] font-semibold text-red-600 hover:text-red-800 transition flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Remove Photo</span>
          </button>
        )}
      </div>

      {/* Main Container: Photo Avatar Preview + Method Switchers */}
      <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Circular Photo Avatar Preview */}
          <div className="relative shrink-0">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 shadow-sm flex items-center justify-center bg-white ${
                currentPhotoUrl ? 'border-[#1a3a52]' : 'border-dashed border-[#d4af37]'
              }`}
            >
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt={label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#64748b] p-2 text-center">
                  <User className="w-7 h-7 text-[#d4af37]" />
                  <span className="text-[9px] font-bold mt-1 text-[#1e293b]">No Photo</span>
                </div>
              )}
            </div>

            {currentPhotoUrl && (
              <div
                className="absolute bottom-0 right-0 bg-[#1a3a52] text-white p-1 rounded-full border-2 border-white shadow-xs"
                title="Photo verified"
              >
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Action Choice Buttons */}
          <div className="flex-1 space-y-2 w-full">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                id={`${idPrefix}-tab-upload`}
                onClick={() => {
                  stopCamera();
                  setActiveMode('upload');
                  fileInputRef.current?.click();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMode === 'upload' && !isCameraActive
                    ? 'bg-[#1a3a52] text-white shadow-2xs'
                    : 'bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-[#f1f5f9]'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Upload File / Gallery</span>
              </button>

              <button
                type="button"
                id={`${idPrefix}-tab-camera`}
                onClick={() => {
                  if (isCameraActive) {
                    stopCamera();
                  } else {
                    startCamera();
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isCameraActive
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-[#f1f5f9]'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>{isCameraActive ? 'Cancel Camera' : 'Take Photo (Camera)'}</span>
              </button>

              <button
                type="button"
                id={`${idPrefix}-tab-presets`}
                onClick={() => {
                  stopCamera();
                  setActiveMode('presets');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMode === 'presets'
                    ? 'bg-[#1a3a52] text-white shadow-2xs'
                    : 'bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-[#f1f5f9]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Sample Photo Presets</span>
              </button>
            </div>

            <p className="text-[11px] text-[#64748b]">
              {presetType === 'owner'
                ? 'Owner photo will be featured on shop profile, digital receipts & trading passbooks.'
                : 'Farmer photo appears on passbook ledger, parchi slips, and connected mandi accounts.'}
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          id={`${idPrefix}-file-input`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Drag & Drop Box (Upload mode) */}
        {activeMode === 'upload' && !isCameraActive && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition ${
              isDragOver
                ? 'border-[#1a3a52] bg-[#eef3f7]'
                : 'border-[#e2e8f0] hover:border-[#1a3a52]/50 bg-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs text-[#1e293b]">
              <Upload className="w-4 h-4 text-[#1a3a52]" />
              <span className="font-bold">Click to choose image or drag & drop photo here</span>
            </div>
            <p className="text-[10px] text-[#64748b] mt-0.5">PNG, JPG, JPEG or WEBP (automatically optimized)</p>
          </div>
        )}

        {/* Camera Live Viewfinder */}
        {isCameraActive && (
          <div className="p-3 bg-black rounded-xl text-white space-y-2 text-center">
            <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-[#d4af37]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border border-white/30 rounded-xl pointer-events-none" />
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button
                type="button"
                id={`${idPrefix}-snap-photo-btn`}
                onClick={capturePhotoFromCamera}
                className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#1e293b] font-black text-xs hover:bg-[#c68c22] transition flex items-center gap-1.5 shadow-md"
              >
                <Camera className="w-4 h-4" />
                <span>Snap & Use Photo</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2 rounded-xl bg-white/20 text-white font-semibold text-xs hover:bg-white/30 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>{cameraError}</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold underline ml-2"
            >
              Upload file instead
            </button>
          </div>
        )}

        {/* Sample Photo Presets Selector */}
        {activeMode === 'presets' && !isCameraActive && (
          <div className="space-y-2 pt-1 border-t border-[#e2e8f0]">
            <span className="text-[11px] font-bold text-[#1e293b] block">
              Select an authentic sample profile photo:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange(preset.url)}
                  className={`p-2 rounded-xl border text-left transition flex items-center gap-2 group ${
                    currentPhotoUrl === preset.url
                      ? 'border-[#1a3a52] bg-[#eef3f7] ring-2 ring-[#1a3a52]/20'
                      : 'border-[#e2e8f0] bg-white hover:border-[#1a3a52]/40 hover:bg-[#f8fafc]'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border border-white shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-[#1e293b] block truncate group-hover:text-[#1a3a52]">
                      {preset.name}
                    </span>
                    {preset.tag && (
                      <span className="text-[9px] text-[#64748b] block truncate">
                        {preset.tag}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom URL Input Toggle */}
        <div className="pt-1 flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[#1a3a52] hover:underline font-semibold"
          >
            {showUrlInput ? 'Hide photo URL input' : 'Paste online photo URL directly'}
          </button>
        </div>

        {showUrlInput && (
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs bg-white focus:outline-hidden focus:border-[#1a3a52]"
            />
            <button
              type="button"
              onClick={handleApplyCustomUrl}
              className="px-3 py-1.5 rounded-lg bg-[#1a3a52] text-white font-bold text-xs hover:bg-[#122839]"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Remove Profile Photo"
        itemName={label}
        itemDetails="The current photo avatar will be removed and reset to the default icon placeholder."
        message="Are you sure you want to delete and remove this profile photo?"
        confirmText="CONFIRM REMOVE"
        cancelText="CANCEL"
        onConfirm={() => {
          setIsDeleteModalOpen(false);
          sounds.playTrashSound?.();
          handleRemovePhoto();
        }}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
