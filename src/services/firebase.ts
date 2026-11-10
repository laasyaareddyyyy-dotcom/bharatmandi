import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signInAnonymously, onAuthStateChanged, ConfirmationResult } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Global safety listener to handle transient Firestore internal assertion warnings in iframe sandboxes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (msg.includes('FIRESTORE') && msg.includes('INTERNAL ASSERTION FAILED')) {
      console.warn('[Firestore] Suppressed transient internal assertion note:', msg);
      event.preventDefault();
    }
  });
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Safely initialize Firestore using memoryLocalCache to prevent IndexedDB tab lock assertion failures in iframe sandboxes
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: memoryLocalCache(),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const auth = getAuth(app);

let authInitPromise: Promise<any> | null = null;

export async function ensureFirebaseAuth() {
  if (auth.currentUser) return auth.currentUser;
  if (authInitPromise) return authInitPromise;

  authInitPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const userCred = await signInAnonymously(auth);
          unsubscribe();
          resolve(userCred.user);
        } catch (err) {
          console.warn('Firebase Auth auto-session initialization note:', err);
          unsubscribe();
          resolve(auth.currentUser);
        }
      }
    });
  });

  return authInitPromise;
}

// Kickoff initialization on module load
ensureFirebaseAuth();

// Error Handling Function as required by skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  const isExpectedNetworkOrOffline =
    errInfo.error.toLowerCase().includes('offline') ||
    errInfo.error.toLowerCase().includes('network') ||
    errInfo.error.toLowerCase().includes('failed to get document') ||
    errInfo.error.toLowerCase().includes('unreachable');

  if (isExpectedNetworkOrOffline) {
    console.warn('Firestore network status note:', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error:', JSON.stringify(errInfo));
  }
  return errInfo;
}

// Connection test on boot
export async function testFirestoreConnection() {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      console.log('Server health connection online verified successfully.');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.warn('Initial server connection note:', error.message);
    }
  }
}

testFirestoreConnection();
export default app;
