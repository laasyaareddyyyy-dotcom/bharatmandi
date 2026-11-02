import { Language } from '../types';

export interface IndianLanguage {
  code: Language;
  nativeName: string;
  englishName: string;
  region: string;
  script: string;
  flagSymbol: string;
}

export const INDIAN_LANGUAGES: IndianLanguage[] = [
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    region: 'National / All India',
    script: 'Latin',
    flagSymbol: '🇮🇳'
  },
  {
    code: 'hi',
    nativeName: 'हिंदी',
    englishName: 'Hindi',
    region: 'North & Central India',
    script: 'Devanagari',
    flagSymbol: '🇮🇳'
  }
];

export function getLanguageInfo(code: Language): IndianLanguage {
  return (
    INDIAN_LANGUAGES.find((lang) => lang.code === code) || INDIAN_LANGUAGES[0]
  );
}
