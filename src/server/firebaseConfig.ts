import fs from 'fs';
import path from 'path';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
  oAuthClientId: string;
  recaptchaSiteKey: string;
}

// Fallback configuration matching project metadata
const defaultFirebaseConfig: FirebaseAppConfig = {
  projectId: 'astute-matrix-c2ts5',
  appId: '1:947453741105:web:e7ae0d13876b05c0b86d10',
  apiKey: 'AIzaSyCmgKzRw_9rT9xXUicYuoJrt1tMtkq1ZLg',
  authDomain: 'astute-matrix-c2ts5.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-phoolmitraflower-6a7330b5-9057-46f4-9c82-4b3aca129ea6',
  storageBucket: 'astute-matrix-c2ts5.firebasestorage.app',
  messagingSenderId: '947453741105',
  measurementId: '',
  oAuthClientId: '947453741105-cn6jl3k2tu9cqgl598tdumkvto1d9l3k.apps.googleusercontent.com',
  recaptchaSiteKey: '',
};

function loadFirebaseConfig(): FirebaseAppConfig {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...defaultFirebaseConfig, ...parsed };
    }
  } catch {}
  return defaultFirebaseConfig;
}

export const firebaseAppConfig = loadFirebaseConfig();
export default firebaseAppConfig;
