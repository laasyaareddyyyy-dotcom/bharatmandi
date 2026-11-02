import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Clock, Check, ChevronDown } from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { CommodityCategory } from '../../types';
import { COMMODITY_CONFIGS } from '../../data/initialData';

interface CustomVarietyInputProps {
  value: string;
  onChange: (val: string) => void;
  category?: CommodityCategory | 'all';
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  autoFocus?: boolean;
  onSelectOption?: (val: string) => void;
}

export const CustomVarietyInput: React.FC<CustomVarietyInputProps> = ({
  value,
  onChange,
  category = 'all',
  placeholder,
  className = '',
  id,
  required,
  autoFocus,
  onSelectOption,
}) => {
  const { getSuggestedVarietyNames, addCustomVarietyName, language } = useMandi();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get matching suggestions
  const suggestions = getSuggestedVarietyNames(category as CommodityCategory | 'all', value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const targetCategory: CommodityCategory | undefined = category !== 'all' ? (category as CommodityCategory) : undefined;

  const handleSelect = (selectedName: string) => {
    onChange(selectedName);
    addCustomVarietyName(selectedName, targetCategory);
    if (onSelectOption) {
      onSelectOption(selectedName);
    }
    setIsOpen(false);
  };

  const handleBlur = () => {
    if (value.trim().length > 1) {
      addCustomVarietyName(value.trim(), targetCategory);
    }
  };

  const defaultPlaceholder =
    category && category !== 'all' && COMMODITY_CONFIGS[category as CommodityCategory]
      ? (language === 'hi'
          ? `${COMMODITY_CONFIGS[category as CommodityCategory].nameHi.split(' ')[0]} का नाम दर्ज या चुनें...`
          : `Enter custom ${COMMODITY_CONFIGS[category as CommodityCategory].name} name...`)
      : (language === 'hi'
          ? 'किस्म या नाम दर्ज/चुनें...'
          : 'Type or select custom flower / commodity name...');

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={value}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder || defaultPlaceholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 pr-8 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:outline-hidden focus:border-[#1a3a52] focus:ring-1 focus:ring-[#1a3a52] bg-white transition ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2 text-[#64748b] hover:text-[#1a3a52] p-1 cursor-pointer"
          title="Show typed suggestions"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* DROPDOWN OF PREVIOUSLY TYPED & SUGGESTED CUSTOM NAMES ("come down there showing the same") */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 max-h-52 overflow-y-auto bg-white rounded-xl border border-[#e2e8f0] shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 flex items-center justify-between border-b border-[#e2e8f0]/80 pb-1 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a3a52] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#d4af37]" />
              <span>{language === 'hi' ? 'सुझाव एवं दर्ज की गई किस्में' : 'Previously Typed & Suggested Names'}</span>
            </span>
            <span className="text-[9px] text-[#64748b] font-mono">{suggestions.length} items</span>
          </div>

          {suggestions.map((item) => {
            const isSelected = value.trim().toLowerCase() === item.name.toLowerCase();
            return (
              <button
                key={`${item.category || 'all'}-${item.name}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur before click registers
                  handleSelect(item.name);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a3a52] text-white font-bold'
                    : 'hover:bg-[#f8fafc] text-[#1e293b] hover:text-[#1a3a52]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-xs">{item.icon || '🌸'}</span>
                  <span className="truncate">{item.name}</span>
                  {item.isCustom && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      🕒 {language === 'hi' ? 'पूर्व दर्ज' : 'Typed Before'}
                    </span>
                  )}
                </div>

                {isSelected && <Check className="w-3.5 h-3.5 text-[#d4af37] shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
