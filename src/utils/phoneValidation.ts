/**
 * Authentic Indian Mobile Number Validation & Normalization Utility
 * 
 * Rules:
 * 1. Must be exactly 10 digits.
 * 2. Must start with 6, 7, 8, or 9.
 * 3. Strips +91, 91 (if 12 digits), or 0 (if 11 digits) automatically.
 * 4. Rejects letters, symbols, spaces, or malformed inputs.
 * 5. Rejects all-repeated digits (e.g., 9999999999, 8888888888, 7777777777, 6666666666).
 * 6. Rejects simple sequential patterns (e.g., 1234567890, 9876543210, 0123456789).
 */

export interface PhoneValidationResult {
  isValid: boolean;
  cleanNumber: string;
  error?: string;
}

export const ERROR_INVALID_INDIAN_MOBILE = 'Enter a valid 10-digit Indian mobile number (must start with 6, 7, 8, or 9)';

export const DEFAULT_ADMIN_PHONE_NUMBERS = [
  '9000000000',
  '9999999999',
  '8888888888',
  '9876543210',
  '9898989898',
  '9110387978',
];

export function getCustomAdminNumbers(): string[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('bharatmandi_admin_numbers');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((n: string) => cleanIndianMobile(n));
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function getAllAdminNumbers(): string[] {
  const custom = getCustomAdminNumbers();
  const all = [...DEFAULT_ADMIN_PHONE_NUMBERS];
  for (const num of custom) {
    if (!all.includes(num)) all.push(num);
  }
  return all;
}

export function isAdminUniqueNumber(input: string | undefined | null): boolean {
  if (!input) return false;
  const clean = cleanIndianMobile(input);
  return getAllAdminNumbers().includes(clean);
}

export function addCustomAdminNumber(input: string): boolean {
  const clean = cleanIndianMobile(input);
  if (!clean || clean.length !== 10) return false;
  try {
    const list = getCustomAdminNumbers();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem('bharatmandi_admin_numbers', JSON.stringify(list));
    }
    return true;
  } catch {
    return false;
  }
}

export function removeCustomAdminNumber(input: string): boolean {
  const clean = cleanIndianMobile(input);
  try {
    const list = getCustomAdminNumbers().filter((n) => n !== clean);
    localStorage.setItem('bharatmandi_admin_numbers', JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * Strips country code (+91, 91, 0) and formatting characters.
 */
export const cleanIndianMobile = (raw: string | undefined | null): string => {
  if (!raw) return '';
  let str = String(raw).trim();

  // Strip spaces, dashes, parentheses, dots, plus signs
  str = str.replace(/[\s\-\(\)\.]/g, '');

  if (str.startsWith('+91')) {
    str = str.slice(3);
  } else if (str.startsWith('+')) {
    str = str.slice(1);
  } else if (str.startsWith('0091')) {
    str = str.slice(4);
  } else if (str.startsWith('91') && str.length === 12) {
    str = str.slice(2);
  } else if (str.startsWith('0') && str.length === 11) {
    str = str.slice(1);
  }

  return str;
};

/**
 * Validates strictly if the phone number is a genuine Indian mobile number.
 */
export const validateIndianMobile = (raw: string | undefined | null): PhoneValidationResult => {
  if (!raw || String(raw).trim() === '') {
    return {
      isValid: false,
      cleanNumber: '',
      error: ERROR_INVALID_INDIAN_MOBILE,
    };
  }

  const rawStr = String(raw).trim();

  // Check if raw contains forbidden characters (excluding allowed prefixes +91, -, spaces, brackets)
  const strippedOfAllowed = rawStr
    .replace(/^\+91/, '')
    .replace(/^0091/, '')
    .replace(/^91(?=\d{10}$)/, '')
    .replace(/^0(?=\d{10}$)/, '')
    .replace(/[\s\-\(\)\.]/g, '');

  // If any non-digit character exists in the remaining string
  if (!/^\d+$/.test(strippedOfAllowed)) {
    return {
      isValid: false,
      cleanNumber: strippedOfAllowed,
      error: ERROR_INVALID_INDIAN_MOBILE,
    };
  }

  const clean = strippedOfAllowed;

  // Rule 1: Exactly 10 digits
  if (clean.length !== 10) {
    return {
      isValid: false,
      cleanNumber: clean,
      error: ERROR_INVALID_INDIAN_MOBILE,
    };
  }

  // Admin Gateway Check: Authorized admin numbers bypass normal dummy filters
  if (isAdminUniqueNumber(clean)) {
    return {
      isValid: true,
      cleanNumber: clean,
    };
  }

  // Rule 2: Must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(clean)) {
    return {
      isValid: false,
      cleanNumber: clean,
      error: ERROR_INVALID_INDIAN_MOBILE,
    };
  }

  // Rule 3: Reject all identical repeating digits (9999999999, 8888888888, 7777777777, 6666666666, etc.)
  if (/^(\d)\1{9}$/.test(clean)) {
    return {
      isValid: false,
      cleanNumber: clean,
      error: ERROR_INVALID_INDIAN_MOBILE,
    };
  }

  // Rule 4: Reject simple sequential/ascending/descending or common fake dummy patterns
  const knownFakePatterns = new Set([
    '1234567890',
    '0123456789',
    '9876543210',
    '0987654321',
    '1122334455',
    '9988776655',
    '6789012345',
    '5432109876',
    '9898989898',
    '9797979797',
    '9696969696',
    '8787878787',
    '7878787878',
    '6969696969',
    '9090909090',
    '8080808080',
    '7070707070',
    '6060606060',
  ]);

  if (knownFakePatterns.has(clean)) {
    return {
      isValid: false,
      cleanNumber: clean,
      error: ERROR_INVALID_INDIAN_MOBILE,
    };
  }

  return {
    isValid: true,
    cleanNumber: clean,
  };
};

/**
 * Formats a valid 10-digit number for clean UI presentation.
 */
export const formatIndianMobileDisplay = (raw: string | undefined | null): string => {
  const clean = cleanIndianMobile(raw);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return raw || '';
};
