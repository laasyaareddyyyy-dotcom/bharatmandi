import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Format private key for .env (multiline escaped as \n)
const formattedPrivateKey = privateKey.replace(/\n/g, '\\n');

const envContent = `# Mandatory Firebase Service Account Environment Variables
FIREBASE_PROJECT_ID="astute-matrix-c2ts5"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@astute-matrix-c2ts5.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="${formattedPrivateKey}"

# Gemini & 2Factor API Keys
GEMINI_API_KEY="\${process.env.GEMINI_API_KEY || 'your_gemini_api_key_here'}"
TWOFACTOR_API_KEY="\${process.env.TWOFACTOR_API_KEY || 'your_twofactor_api_key_here'}"
TWOFACTOR_TEMPLATE_NAME="BHRMND"
JWT_SECRET="\${process.env.JWT_SECRET || 'your_jwt_secret_key_here'}"
`;

fs.writeFileSync(path.resolve(process.cwd(), '.env'), envContent, 'utf8');
console.log('.env file written successfully!');
