/**
 * Security utilities for hashing passwords/PINs before storage or transmission.
 * Implements PBKDF2 with 100,000 iterations (SHA-256) using standard Web Crypto API.
 */

const AUTH_SALT_PREFIX = 'PhoolmitraMandiAuthSaltV2_';

export async function hashPassword(password: string, saltInput: string = 'global'): Promise<string> {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const salt = encoder.encode(AUTH_SALT_PREFIX + saltInput);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const hashArray = Array.from(new Uint8Array(derivedBits));
    return 'pbkdf2_sha256$' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let hash = 0;
    const str = AUTH_SALT_PREFIX + saltInput + password;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'pbkdf2_fallback_' + Math.abs(hash).toString(16);
  }
}

export async function verifyPasswordHash(
  inputPassword: string,
  storedHash?: string,
  storedPlainPassword?: string,
  saltInput: string = 'global'
): Promise<boolean> {
  if (!inputPassword) return false;

  // 1. Check PBKDF2 hash match
  const computedPbkdf2Hash = await hashPassword(inputPassword, saltInput);
  if (storedHash && storedHash === computedPbkdf2Hash) {
    return true;
  }

  // 2. Backward compatibility: check legacy SHA-256 hash match
  try {
    const encoder = new TextEncoder();
    const legacyData = encoder.encode('PhoolmitraMandiAuthSaltV1_' + inputPassword);
    const legacyBuffer = await crypto.subtle.digest('SHA-256', legacyData);
    const legacyArray = Array.from(new Uint8Array(legacyBuffer));
    const legacySha256 = legacyArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    if (storedHash && storedHash === legacySha256) {
      return true;
    }
  } catch {}

  // 3. Legacy plaintext password comparison for migration
  if (storedPlainPassword && storedPlainPassword === inputPassword) {
    return true;
  }

  return false;
}

/**
 * Validate username format: 3-20 chars, letters, numbers, underscore, dot
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;
  const clean = username.trim();
  return /^[a-zA-Z0-9._]{3,20}$/.test(clean);
}

/**
 * Block easily guessable / simple repeating / sequential 6-digit PINs
 */
export function isWeakPin(pin: string): boolean {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) return true;
  const weakPins = [
    '000000',
    '111111',
    '222222',
    '333333',
    '444444',
    '555555',
    '666666',
    '777777',
    '888888',
    '999999',
    '123456',
    '654321',
    '012345',
    '543210',
  ];
  return weakPins.includes(pin);
}

export const hashPin = hashPassword;
export const verifyPinHash = verifyPasswordHash;
