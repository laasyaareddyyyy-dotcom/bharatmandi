import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseAppConfig as firebaseConfig } from './firebaseConfig';

let adminDbInstance: any = null;
let initAttempted = false;

/**
 * Safe, lazy Firebase Admin Firestore initialization wrapped in try/catch.
 * Logs diagnostic errors for missing variables without logging secrets or breaking serverless startup.
 */
export function getAdminDb() {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  if (initAttempted) {
    return adminDbInstance;
  }
  initAttempted = true;

  try {
    if (getApps().length > 0) {
      const app = getApp();
      adminDbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
      return adminDbInstance;
    }

    const projectId = (process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || '').trim();
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';

    if (clientEmail && rawPrivateKey && projectId) {
      // Replaces escaped \n with real newlines for multiline RSA key in Vercel, and strips quotes if wrapped
      const privateKey = rawPrivateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      adminDbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
      console.log(`[Firebase Admin] Successfully initialized with cert for project: ${projectId}`);
      return adminDbInstance;
    }

    // Only use default GCP app if we are actually in a GCP environment (Cloud Run / App Engine)
    // NEVER on Vercel or non-GCP environments without credentials, because attempting to query 169.254.169.254 hangs for 60 seconds!
    const isGcp = Boolean(
      (process.env.K_SERVICE || process.env.FUNCTION_NAME || process.env.GOOGLE_CLOUD_PROJECT) &&
      !process.env.VERCEL &&
      !process.env.NOW_REGION
    );

    if (projectId && isGcp) {
      const app = initializeApp({ projectId });
      adminDbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
      console.log(`[Firebase Admin] Initialized default app for project: ${projectId} on GCP`);
      return adminDbInstance;
    }

    console.info('[Firebase Admin Startup Note] Service account credentials not present on Vercel/host. Using ultra-fast in-memory store.');
    return null;
  } catch (err: any) {
    console.warn(`[Firebase Admin Startup Note] Step 'Firebase Admin Initialization' note: ${err?.message || err}`);
    return null;
  }
}
