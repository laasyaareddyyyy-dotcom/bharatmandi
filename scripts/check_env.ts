import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

console.log('ENV FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('ENV FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('ENV FIREBASE_PRIVATE_KEY is set:', Boolean(process.env.FIREBASE_PRIVATE_KEY));
console.log('ENV GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

async function testAdmin() {
  try {
    let app;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.log('Reading GOOGLE_APPLICATION_CREDENTIALS file...');
      const content = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
      console.log('SA Email:', content.client_email);
      app = initializeApp({
        credential: cert({
          projectId: content.project_id || 'astute-matrix-c2ts5',
          clientEmail: content.client_email,
          privateKey: content.private_key,
        })
      });
    } else {
      app = initializeApp({ projectId: 'astute-matrix-c2ts5' });
    }
    const auth = getAuth(app);
    const token = await auth.createCustomToken('test-uid-123');
    console.log('Successfully created custom token! Token length:', token.length);
  } catch (err: any) {
    console.error('Test Admin Error:', err.message);
  }
}

testAdmin();
