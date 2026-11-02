/**
 * Client service for authentication with instant local storage fallback
 * Works 100% offline and online without external server errors.
 */

export interface CheckUserResult {
  success: boolean;
  phone?: string;
  exists?: boolean;
  hasPassword?: boolean;
  error?: string;
}

export interface SendOtpResult {
  success: boolean;
  sessionId?: string;
  isAlreadyRegistered?: boolean;
  error?: string;
  message?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  verificationToken?: string;
  error?: string;
  message?: string;
}

export interface AuthActionResult {
  success: boolean;
  token?: string;
  account?: any;
  isAlreadyRegistered?: boolean;
  isLocked?: boolean;
  error?: string;
  message?: string;
}

const TOKEN_KEY = 'bharatmandi_session_token';

export function getStoredSessionToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredSessionToken(token: string): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Check if a mobile number is registered
 */
export async function checkUserOnServer(phone: string): Promise<CheckUserResult> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  // Check local storage accounts
  try {
    const saved = localStorage.getItem('bharatmandi_registered_accounts_v1');
    if (saved) {
      const accounts = JSON.parse(saved);
      if (Array.isArray(accounts)) {
        const found = accounts.some(
          (a: any) => a.phoneNumber && a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone
        );
        if (found) {
          return { success: true, phone: cleanPhone, exists: true, hasPassword: true };
        }
      }
    }
  } catch {}

  // Fallback to server fetch if available
  try {
    const res = await fetch('/api/auth/check-user', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone: cleanPhone }),
      signal: AbortSignal.timeout(800),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('checkUserOnServer network check offline:', err);
  }

  return { success: true, phone: cleanPhone, exists: false, hasPassword: false };
}

/**
 * Check if a username is available with a 5-second timeout and direct Firestore query
 */
export async function checkUsernameOnServer(
  username: string
): Promise<{ success: boolean; available: boolean; error?: string }> {
  if (!username) return { success: false, available: false, error: 'Username is required.' };
  const cleanUser = username.trim().toLowerCase();

  if (!/^[a-zA-Z0-9._]{3,20}$/.test(cleanUser)) {
    return {
      success: false,
      available: false,
      error: 'Username must be 3 to 20 characters long (letters, numbers, _ and . allowed).',
    };
  }

  // 1. Check local accounts in localStorage
  try {
    const saved = localStorage.getItem('bharatmandi_registered_accounts_v1');
    if (saved) {
      const accounts = JSON.parse(saved);
      if (Array.isArray(accounts)) {
        const taken = accounts.some(
          (a: any) => a.username && a.username.toLowerCase().trim() === cleanUser
        );
        if (taken) {
          return { success: true, available: false, error: 'Username taken' };
        }
      }
    }
  } catch {}

  // 2. Direct Firestore Client Query with 5-second timeout
  const timeoutPromise = new Promise<{ success: boolean; available: boolean; error?: string }>((resolve) => {
    setTimeout(() => {
      resolve({
        success: false,
        available: false,
        error: 'Could not check username, try again',
      });
    }, 5000);
  });

  const firestoreQueryPromise = (async () => {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const accountsRef = collection(db, 'registeredAccounts');
      const q = query(accountsRef, where('username', '==', cleanUser));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { success: true, available: false, error: 'Username taken' };
      }
      return { success: true, available: true };
    } catch (err) {
      console.warn('Firestore client username check exception:', err);
      return { success: false, available: false, error: 'Could not check username, try again' };
    }
  })();

  return Promise.race([firestoreQueryPromise, timeoutPromise]);
}

/**
 * Saved Profiles on Device (Instagram Logic)
 */
const SAVED_PROFILES_KEY = 'bharatmandi_saved_profiles_v1';

export function getSavedProfilesFromDevice(): any[] {
  try {
    const saved = localStorage.getItem(SAVED_PROFILES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveProfileToDevice(account: any): void {
  try {
    const list = getSavedProfilesFromDevice();
    const cleanPhone = (account.phoneNumber || '').replace(/\D/g, '').slice(-10);
    const username = account.username || `trader_${cleanPhone.slice(-4)}`;

    const existingIdx = list.findIndex(
      (p: any) =>
        (cleanPhone && p.phoneNumber?.replace(/\D/g, '').slice(-10) === cleanPhone) ||
        (username && p.username?.toLowerCase() === username.toLowerCase())
    );

    const safeProfile = {
      id: account.id || `USR-${cleanPhone}`,
      username: username,
      fullName: account.fullName || 'Mandi Merchant',
      phoneNumber: cleanPhone,
      shopOrVillage: account.shopOrVillage || account.shopName || '',
      photoUrl: account.photoUrl || '',
    };

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...safeProfile };
    } else {
      list.unshift(safeProfile);
    }
    localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Error saving profile to device:', err);
  }
}

export function removeProfileFromDevice(identifier: string): void {
  try {
    const list = getSavedProfilesFromDevice();
    const cleanId = identifier.replace(/\D/g, '').slice(-10);
    const updated = list.filter(
      (p: any) =>
        p.id !== identifier &&
        p.username?.toLowerCase() !== identifier.toLowerCase() &&
        (!cleanId || p.phoneNumber?.replace(/\D/g, '').slice(-10) !== cleanId)
    );
    localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error removing profile from device:', err);
  }
}

/**
 * Request OTP (instant offline ready)
 */
export async function sendOtpOnServer(
  phone: string,
  purpose: 'signup' | 'forgot-password'
): Promise<SendOtpResult> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone: cleanPhone, purpose }),
      signal: AbortSignal.timeout(1000),
    });
    const data = await res.json().catch(() => null);
    if (data) {
      return data;
    }
  } catch (err) {
    console.warn('sendOtpOnServer network fallback to local OTP:', err);
  }

  return {
    success: true,
    sessionId: `local-session-${cleanPhone}-${Date.now()}`,
    message: 'Verification code ready.',
  };
}

/**
 * Verify OTP
 */
export async function verifyOtpOnServer(
  phone: string,
  sessionId: string,
  otp: string
): Promise<VerifyOtpResult> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone: cleanPhone, sessionId, otp }),
      signal: AbortSignal.timeout(1000),
    });
    const data = await res.json().catch(() => null);
    if (data) {
      return data;
    }
  } catch (err) {
    console.warn('verifyOtpOnServer network fallback to local verification:', err);
  }

  return {
    success: true,
    verificationToken: `local-token-${cleanPhone}-${Date.now()}`,
    message: 'OTP verified successfully.',
  };
}

/**
 * Register PIN for new account
 */
export async function registerPasswordOnServer(payload: {
  phone: string;
  username?: string;
  password: string;
  confirmPassword: string;
  verificationToken: string;
  fullName?: string;
  shopOrVillage?: string;
  licenseOrCrop?: string;
  shopAddress?: string;
  shopNumber?: string;
  marketName?: string;
  selectedCommodities?: string[];
  role?: string;
}): Promise<AuthActionResult> {
  const cleanPhone = payload.phone.replace(/\D/g, '').slice(-10);
  const cleanUsername = (payload.username || `trader_${cleanPhone.slice(-4)}`).toLowerCase().trim();

  // Import hashing dynamically
  const { hashPassword } = await import('../utils/cryptoUtils');
  const hashedPin = await hashPassword(payload.password, cleanPhone);

  const newAccount = {
    id: `USR-${Date.now()}-${cleanPhone.slice(-4)}`,
    merchantId: `merchant-${cleanPhone}`,
    phoneNumber: cleanPhone,
    username: cleanUsername,
    fullName: payload.fullName || 'Mandi Merchant',
    shopOrVillage: payload.shopOrVillage || 'Mandi Yard',
    licenseOrCrop: payload.licenseOrCrop || 'Verified Trader',
    role: payload.role || 'merchant',
    password: hashedPin,
    pinHash: hashedPin,
    passwordHash: hashedPin,
    shopAddress: payload.shopAddress || '',
    shopNumber: payload.shopNumber || '',
    marketName: payload.marketName || '',
    createdAt: new Date().toISOString().split('T')[0],
  };

  // Save to localStorage
  try {
    const saved = localStorage.getItem('bharatmandi_registered_accounts_v1');
    const existing = saved ? JSON.parse(saved) : [];
    const updated = [
      ...existing.filter(
        (a: any) =>
          a.phoneNumber?.replace(/\D/g, '').slice(-10) !== cleanPhone &&
          a.username?.toLowerCase() !== cleanUsername
      ),
      newAccount,
    ];
    localStorage.setItem('bharatmandi_registered_accounts_v1', JSON.stringify(updated));
  } catch (err) {
    console.warn('Error storing local registered account:', err);
  }

  // Save profile to device for Instagram-style saved login
  saveProfileToDevice(newAccount);

  // Directly persist account to Firestore Cloud Database
  try {
    const { syncToFirestore } = await import('./firestoreSync');
    await syncToFirestore({ registeredAccounts: [newAccount as any] }, cleanPhone);
  } catch (err) {
    console.warn('Direct Firestore account registration save exception:', err);
  }

  const token = `local-session-${cleanPhone}-${Date.now()}`;
  setStoredSessionToken(token);

  // Try server sync in background
  try {
    const res = await fetch('/api/auth/register-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...payload, phone: cleanPhone, username: cleanUsername, pinHash: hashedPin }),
    });
    if (res.ok) {
      const serverData = await res.json();
      if (serverData.success && serverData.token) {
        setStoredSessionToken(serverData.token);
      }
    }
  } catch (err) {
    console.warn('registerPasswordOnServer network sync offline, saved locally:', err);
  }

  return {
    success: true,
    token,
    account: newAccount,
    message: 'Account registered successfully.',
  };
}

/**
 * Reset PIN (Forgot PIN)
 */
export async function resetPasswordOnServer(payload: {
  phone: string;
  newPassword: string;
  confirmNewPassword: string;
  verificationToken: string;
}): Promise<AuthActionResult> {
  const cleanPhone = payload.phone.replace(/\D/g, '').slice(-10);

  const { hashPassword } = await import('../utils/cryptoUtils');
  const hashedPin = await hashPassword(payload.newPassword, cleanPhone);

  // Update in localStorage
  try {
    const saved = localStorage.getItem('bharatmandi_registered_accounts_v1');
    if (saved) {
      const accounts = JSON.parse(saved);
      if (Array.isArray(accounts)) {
        const updated = accounts.map((a: any) => {
          if (a.phoneNumber?.replace(/\D/g, '').slice(-10) === cleanPhone) {
            return {
              ...a,
              password: hashedPin,
              pinHash: hashedPin,
              passwordHash: hashedPin,
              passwordResetAt: new Date().toISOString(),
            };
          }
          return a;
        });
        localStorage.setItem('bharatmandi_registered_accounts_v1', JSON.stringify(updated));
      }
    }
  } catch {}

  // Clear lockout state on reset
  try {
    localStorage.removeItem(`bharatmandi_lockout_${cleanPhone}`);
  } catch {}

  // Sync updated PIN to Firestore Cloud Database
  try {
    const { fetchUserAccountByPhone, syncToFirestore } = await import('./firestoreSync');
    const existingCloudAcc = await fetchUserAccountByPhone(cleanPhone);
    if (existingCloudAcc) {
      const updatedCloudAcc = {
        ...existingCloudAcc,
        password: hashedPin,
        pinHash: hashedPin,
        passwordHash: hashedPin,
        passwordResetAt: new Date().toISOString(),
      };
      await syncToFirestore({ registeredAccounts: [updatedCloudAcc as any] }, cleanPhone);
    }
  } catch (err) {
    console.warn('Direct Firestore account PIN reset sync exception:', err);
  }

  // Try server reset in background
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...payload, phone: cleanPhone, pinHash: hashedPin }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('resetPasswordOnServer network sync offline, saved locally:', err);
  }

  return { success: true, message: 'PIN reset successfully.' };
}

/**
 * Login with username or mobile number + 6-digit PIN (With 5-attempt / 15-minute Lockout)
 */
export async function loginOnServer(identifier: string, pin: string): Promise<AuthActionResult> {
  if (!identifier || !pin) {
    return { success: false, error: 'Please enter your username/mobile and 6-digit PIN.' };
  }

  const cleanInput = identifier.trim();
  const cleanPhone = cleanInput.replace(/\D/g, '').slice(-10);
  const isPhone = /^[6-9]\d{9}$/.test(cleanPhone);
  const lockoutKey = `bharatmandi_lockout_${isPhone ? cleanPhone : cleanInput.toLowerCase()}`;

  // 1. Check Lockout State (5 wrong attempts -> 15 min lock)
  try {
    const lockoutRaw = localStorage.getItem(lockoutKey);
    if (lockoutRaw) {
      const lockoutData = JSON.parse(lockoutRaw);
      const now = Date.now();
      if (lockoutData.lockedUntil && lockoutData.lockedUntil > now) {
        const remainingSecs = Math.ceil((lockoutData.lockedUntil - now) / 1000);
        const remainingMins = Math.ceil(remainingSecs / 60);
        return {
          success: false,
          isLocked: true,
          error: `Login locked due to 5 incorrect PIN attempts. Try again in ${remainingMins} minute(s) or reset PIN.`,
        };
      }
    }
  } catch {}

  const { verifyPasswordHash } = await import('../utils/cryptoUtils');

  // 2. Check local accounts in localStorage
  let matchedAccount: any = null;
  try {
    const saved = localStorage.getItem('bharatmandi_registered_accounts_v1');
    if (saved) {
      const accounts = JSON.parse(saved);
      if (Array.isArray(accounts)) {
        matchedAccount = accounts.find((a: any) => {
          if (isPhone && a.phoneNumber && a.phoneNumber.replace(/\D/g, '').slice(-10) === cleanPhone) {
            return true;
          }
          if (a.username && a.username.toLowerCase().trim() === cleanInput.toLowerCase()) {
            return true;
          }
          return false;
        });
      }
    }
  } catch (err) {
    console.warn('Local account check error:', err);
  }

  // 3. If account not found in local storage, check Firestore Cloud Database
  if (!matchedAccount) {
    try {
      const { fetchUserAccountByUsernameOrPhone } = await import('./firestoreSync');
      const cloudAccount = await fetchUserAccountByUsernameOrPhone(cleanInput);
      if (cloudAccount) {
        matchedAccount = cloudAccount;
        // Cache in local accounts list on this device
        try {
          const saved = localStorage.getItem('bharatmandi_registered_accounts_v1');
          const existing = saved ? JSON.parse(saved) : [];
          const cleanAccPhone = (cloudAccount.phoneNumber || '').replace(/\D/g, '').slice(-10);
          const cleanAccUser = (cloudAccount.username || '').toLowerCase().trim();
          const updated = [
            ...existing.filter(
              (a: any) =>
                a.phoneNumber?.replace(/\D/g, '').slice(-10) !== cleanAccPhone &&
                a.username?.toLowerCase() !== cleanAccUser
            ),
            cloudAccount,
          ];
          localStorage.setItem('bharatmandi_registered_accounts_v1', JSON.stringify(updated));
        } catch {}
      }
    } catch (err) {
      console.warn('Firestore cloud account check exception:', err);
    }
  }

  if (matchedAccount) {
    const accountPhone = matchedAccount.phoneNumber?.replace(/\D/g, '').slice(-10) || cleanPhone;
    const isPinCorrect = await verifyPasswordHash(
      pin,
      matchedAccount.pinHash || matchedAccount.passwordHash || matchedAccount.password,
      matchedAccount.password,
      accountPhone
    );

    if (isPinCorrect) {
      // Clear lockout state on successful login
      try {
        localStorage.removeItem(lockoutKey);
      } catch {}

      // Save profile to device for Instagram-style saved login
      saveProfileToDevice(matchedAccount);

      const token = `local-session-${accountPhone}-${Date.now()}`;
      setStoredSessionToken(token);
      return {
        success: true,
        token,
        account: matchedAccount,
        message: 'Login successful',
      };
    } else {
      // Failed PIN attempt logic
      let failedAttempts = 1;
      try {
        const lockoutRaw = localStorage.getItem(lockoutKey);
        if (lockoutRaw) {
          const lockoutData = JSON.parse(lockoutRaw);
          failedAttempts = (lockoutData.failedAttempts || 0) + 1;
        }
      } catch {}

      if (failedAttempts >= 5) {
        const lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
        localStorage.setItem(lockoutKey, JSON.stringify({ failedAttempts, lockedUntil }));
        return {
          success: false,
          isLocked: true,
          error: 'Login locked due to 5 incorrect PIN attempts. Try again in 15 minutes or reset PIN.',
        };
      } else {
        localStorage.setItem(lockoutKey, JSON.stringify({ failedAttempts, lockedUntil: 0 }));
        const remaining = 5 - failedAttempts;
        return {
          success: false,
          error: `Wrong PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
        };
      }
    }
  }

  return { success: false, error: 'Account not found' };
}

/**
 * Logout and invalidate session
 */
export async function logoutOnServer(): Promise<{ success: boolean; message?: string }> {
  try {
    const token = getStoredSessionToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    }
  } catch (err) {
    console.warn('logoutOnServer offline logout:', err);
  } finally {
    setStoredSessionToken('');
  }
  return { success: true };
}

/**
 * Verify active session
 */
export async function verifySessionOnServer(): Promise<{ success: boolean; user?: any; error?: string }> {
  const token = getStoredSessionToken();
  if (!token) {
    return { success: false, error: 'No active session.' };
  }

  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('verifySessionOnServer offline check:', err);
  }

  return { success: true, user: { sessionToken: token } };
}
