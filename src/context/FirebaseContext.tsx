import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { syncToFirestore, fetchFromFirestore, subscribeToFirestore } from '../services/firestoreSync';
import {
  MerchantProfile,
  Farmer,
  SaleLot,
  Shipment,
  PaymentRecord,
  FifteenDaySettlement,
  HelpTicket,
  RegisteredAccount,
} from '../types';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface MandiSyncPayload {
  profile: MerchantProfile;
  farmers: Farmer[];
  lots: SaleLot[];
  shipments: Shipment[];
  payments: PaymentRecord[];
  settlements: FifteenDaySettlement[];
  helpTickets?: HelpTicket[];
  registeredAccounts?: RegisteredAccount[];
}

interface FirebaseContextType {
  user: User | null;
  isAuthLoading: boolean;
  isFirebaseConnected: boolean;
  isSyncing: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isAutoSyncEnabled: boolean;
  setIsAutoSyncEnabled: (enabled: boolean) => void;
  lastSyncedAt: string | null;
  syncError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  syncDataToCloud: (data: MandiSyncPayload) => Promise<boolean>;
  scheduleAutoSync: (data: MandiSyncPayload) => void;
  loadDataFromCloud: () => Promise<{
    profile?: MerchantProfile;
    farmers: Farmer[];
    lots: SaleLot[];
    shipments: Shipment[];
    payments: PaymentRecord[];
    settlements: FifteenDaySettlement[];
    helpTickets: HelpTicket[];
  } | null>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bharatmandi_user_profile');
    return saved
      ? JSON.parse(saved)
      : { uid: 'user-default', email: 'merchant@bharatmandi.in', displayName: 'Mandi Merchant' };
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isAutoSyncEnabled, setIsAutoSyncEnabledState] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('bharatmandi_last_firebase_sync');
  });
  const [syncError, setSyncError] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);
  const autoSaveResetTimerRef = useRef<any>(null);

  const setIsAutoSyncEnabled = (enabled: boolean) => {
    setIsAutoSyncEnabledState(enabled);
    localStorage.setItem('bharatmandi_auto_cloud_sync', String(enabled));
  };

  useEffect(() => {
    let mounted = true;

    const handleOnline = () => {
      if (mounted) setIsFirebaseConnected(true);
    };
    const handleOffline = () => {
      if (mounted) setIsFirebaseConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignInGoogle = async () => {
    const mockUser: User = {
      uid: 'user-firebase-authenticated',
      email: 'merchant@bharatmandi.in',
      displayName: 'Mandi Merchant',
    };
    setUser(mockUser);
    localStorage.setItem('bharatmandi_user_profile', JSON.stringify(mockUser));
    return mockUser;
  };

  const handleSignOut = async () => {
    setUser(null);
    localStorage.removeItem('bharatmandi_user_profile');
  };

  const syncDataToCloud = async (data: MandiSyncPayload): Promise<boolean> => {
    setIsSyncing(true);
    setAutoSaveStatus('saving');
    setSyncError(null);
    try {
      const res = await syncToFirestore(data);
      if (res.success) {
        const timestamp = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSyncedAt(timestamp);
        localStorage.setItem('bharatmandi_last_firebase_sync', timestamp);
        setIsSyncing(false);
        setAutoSaveStatus('saved');

        if (autoSaveResetTimerRef.current) clearTimeout(autoSaveResetTimerRef.current);
        autoSaveResetTimerRef.current = setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 3000);

        return true;
      } else {
        setSyncError(res.error || 'Failed to sync');
        setIsSyncing(false);
        setAutoSaveStatus('error');
        return false;
      }
    } catch (err: any) {
      setSyncError(err?.message || 'Sync error');
      setIsSyncing(false);
      setAutoSaveStatus('error');
      return false;
    }
  };

  const scheduleAutoSync = (data: MandiSyncPayload) => {
    if (!isAutoSyncEnabled) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setAutoSaveStatus('saving');

    debounceTimerRef.current = setTimeout(() => {
      syncDataToCloud(data);
    }, 1200);
  };

  const loadDataFromCloud = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const data = await fetchFromFirestore();
      setIsSyncing(false);
      return data;
    } catch (err: any) {
      setSyncError(err?.message || 'Failed to load from cloud');
      setIsSyncing(false);
      return null;
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        isAuthLoading,
        isFirebaseConnected,
        isSyncing,
        autoSaveStatus,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        lastSyncedAt,
        syncError,
        signInWithGoogle: handleSignInGoogle,
        signOut: handleSignOut,
        syncDataToCloud,
        scheduleAutoSync,
        loadDataFromCloud,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

const defaultFirebaseContext: FirebaseContextType = {
  user: null,
  isAuthLoading: false,
  isFirebaseConnected: true,
  isSyncing: false,
  autoSaveStatus: 'idle',
  isAutoSyncEnabled: true,
  setIsAutoSyncEnabled: () => {},
  lastSyncedAt: null,
  syncError: null,
  signInWithGoogle: async () => null,
  signOut: async () => {},
  syncDataToCloud: async () => true,
  scheduleAutoSync: () => {},
  loadDataFromCloud: async () => null,
};

export const useFirebase = (): FirebaseContextType => {
  const context = useContext(FirebaseContext);
  return context || defaultFirebaseContext;
};
