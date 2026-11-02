import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as crypto from 'crypto';

// Generate a valid 2048-bit RSA key
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const clientEmail = 'firebase-adminsdk-fbsvc@astute-matrix-c2ts5.iam.gserviceaccount.com';
const projectId = 'astute-matrix-c2ts5';

console.log('Testing Firebase Admin initialization with RSA key...');

try {
  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });

  const auth = getAuth(app);
  auth.createCustomToken('merchant-12345').then(token => {
    console.log('Custom token generated successfully! Length:', token.length);
  }).catch(err => {
    console.error('Error generating custom token:', err);
  });
} catch (err: any) {
  console.error('Initialization error:', err);
}
