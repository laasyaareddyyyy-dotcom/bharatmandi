import React, { useState } from 'react';
import { Globe, Search, Check, X, Languages } from 'lucide-react';
import { Language } from '../../types';
import { INDIAN_LANGUAGES, getLanguageInfo } from '../../data/indianLanguages';
import { sounds } from '../../utils/audio';

interface LanguageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
}

export const LanguageSettingsModal: React.FC<LanguageSettingsModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onSelectLanguage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredLanguages = INDIAN_LANGUAGES.filter((lang) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      lang.englishName.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.region.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  const activeLang = getLanguageInfo(currentLanguage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a3a52] text-white p-4 sm:p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {currentLanguage === 'hi' ? 'भारतीय भाषा सेटिंग्स' : 'Indian Language Settings'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {currentLanguage === 'hi' ? 'अपनी पसंदीदा मंडी व्यापार भाषा चुनें' : 'Select your preferred Mandi trading interface language'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentLanguage === 'hi' ? 'भाषा या क्षेत्र से खोजें (उदा. हिंदी, English)...' : 'Search by language, script or region...'}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1a3a52]/30 focus:border-[#1a3a52]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                {currentLanguage === 'hi' ? 'साफ़ करें' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* Currently Selected Bar */}
        <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <Globe className="w-4 h-4 text-amber-700" />
            <span>{currentLanguage === 'hi' ? 'सक्रिय भाषा:' : 'Active Language:'}</span>
            <span className="font-bold text-amber-950 bg-amber-200/60 px-2 py-0.5 rounded-md">
              {activeLang.nativeName} ({activeLang.englishName})
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-semibold">
            {activeLang.region}
          </span>
        </div>

        {/* Languages Grid / List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 max-h-[50vh]">
          {filteredLanguages.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              {currentLanguage === 'hi' ? `"${searchQuery}" से मेल खाती कोई भाषा नहीं मिली।` : `No language matching "${searchQuery}" found.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredLanguages.map((lang) => {
                const isSelected = currentLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      sounds.playBidTick?.();
                      onSelectLanguage(lang.code);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-md ring-2 ring-[#1a3a52]/20'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-[#1a3a52]/40 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm sm:text-base leading-tight">
                          {lang.nativeName}
                        </span>
                        {lang.nativeName !== lang.englishName && (
                          <span
                            className={`text-xs ${
                              isSelected ? 'text-slate-200' : 'text-slate-500'
                            }`}
                          >
                            ({lang.englishName})
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {lang.region}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected ? (
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {lang.code}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{currentLanguage === 'hi' ? 'समर्थित मंडी क्षेत्रीय भाषाएं' : 'Supported Indian Mandi Regional Languages'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1a3a52] text-white rounded-lg font-bold hover:bg-[#234b6a] transition cursor-pointer"
          >
            {currentLanguage === 'hi' ? 'संपन्न' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
