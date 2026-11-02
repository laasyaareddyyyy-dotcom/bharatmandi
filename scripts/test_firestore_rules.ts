import { initializeApp as initClientApp } from 'firebase/app';
import { getAuth as getClientAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { initializeApp as initAdminApp, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// 1. Setup Admin SDK to create custom tokens for test
const projectId = process.env.FIREBASE_PROJECT_ID || 'astute-matrix-c2ts5';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';
const privateKey = rawPrivateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

const adminApp = initAdminApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId,
}, 'adminForRulesTest');
const adminAuth = getAdminAuth(adminApp);

// 2. Setup Client SDK
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const clientApp = initClientApp(firebaseConfig, 'clientForRulesTest');
const clientAuth = getClientAuth(clientApp);
const db = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

const merchantA_ID = 'mnd_test_merchant_A';
const merchantB_ID = 'mnd_test_merchant_B';

async function runRulesTests() {
  console.log('=== STARTING FIRESTORE SECURITY RULES VERIFICATION TESTS ===\n');

  // Create custom tokens for Merchant A and Merchant B
  const tokenA = await adminAuth.createCustomToken(merchantA_ID);
  const tokenB = await adminAuth.createCustomToken(merchantB_ID);

  // --------------------------------------------------------------------------
  // TEST (a): Signed-in merchant can read and write their OWN data
  // --------------------------------------------------------------------------
  console.log('TEST (a): Signing in as Merchant A (' + merchantA_ID + ')...');
  await signInWithCustomToken(clientAuth, tokenA);
  console.log('Client auth active UID:', clientAuth.currentUser?.uid);

  let testAPassed = false;
  try {
    const docRefA = doc(db, 'merchants', merchantA_ID, 'farmers', 'test_f1');
    await setDoc(docRefA, { name: 'Ramesh Kumar', village: 'Kothapet', createdAt: new Date().toISOString() });
    console.log('  -> Write to merchants/' + merchantA_ID + '/farmers/test_f1: SUCCESS');

    const snapA = await getDoc(docRefA);
    if (snapA.exists() && snapA.data()?.name === 'Ramesh Kumar') {
      console.log('  -> Read back from merchants/' + merchantA_ID + '/farmers/test_f1: SUCCESS');
      testAPassed = true;
    } else {
      console.error('  -> Read back failed or returned wrong payload');
    }
  } catch (err: any) {
    console.error('  -> TEST (a) FAILED with error:', err.message);
  }
  console.log(`TEST (a) RESULT: ${testAPassed ? 'PASS' : 'FAIL'}\n`);

  // --------------------------------------------------------------------------
  // TEST (c): Merchant A CANNOT read Merchant B's data
  // --------------------------------------------------------------------------
  console.log('TEST (c): Merchant A attempting to read Merchant B data (' + merchantB_ID + ')...');
  let testCPassed = false;
  try {
    const docRefB = doc(db, 'merchants', merchantB_ID, 'farmers', 'test_f2');
    await getDoc(docRefB);
    console.error('  -> ERROR: Merchant A was able to read Merchant B data! Rules failed.');
  } catch (err: any) {
    if (err.message.includes('permission') || err.message.includes('Permission')) {
      console.log('  -> Read Merchant B data DENIED as expected! Error:', err.message);
      testCPassed = true;
    } else {
      console.warn('  -> Unexpected error type:', err.message);
    }
  }
  console.log(`TEST (c) RESULT: ${testCPassed ? 'PASS' : 'FAIL'}\n`);

  // --------------------------------------------------------------------------
  // TEST (b): Signed-out request is DENIED
  // --------------------------------------------------------------------------
  console.log('TEST (b): Signing out...');
  await signOut(clientAuth);
  console.log('Client auth active UID:', clientAuth.currentUser?.uid || 'NULL (Signed out)');

  let testBPassed = false;
  try {
    const docRefA = doc(db, 'merchants', merchantA_ID, 'farmers', 'test_f1');
    await getDoc(docRefA);
    console.error('  -> ERROR: Signed-out client was able to read merchant data!');
  } catch (err: any) {
    if (err.message.includes('permission') || err.message.includes('Permission')) {
      console.log('  -> Signed-out read DENIED as expected! Error:', err.message);
      testBPassed = true;
    } else {
      console.warn('  -> Unexpected error type:', err.message);
    }
  }
  console.log(`TEST (b) RESULT: ${testBPassed ? 'PASS' : 'FAIL'}\n`);

  console.log('=== SUMMARY OF SECURITY RULE TESTS ===');
  console.log(`Test (a) Signed-in Merchant Read/Write: ${testAPassed ? 'PASS [100% SUCCESS]' : 'FAIL'}`);
  console.log(`Test (b) Signed-out Access Blocked:     ${testBPassed ? 'PASS [100% SUCCESS]' : 'FAIL'}`);
  console.log(`Test (c) Cross-Merchant Access Blocked: ${testCPassed ? 'PASS [100% SUCCESS]' : 'FAIL'}`);

  if (testAPassed && testBPassed && testCPassed) {
    console.log('\nALL 3 SECURITY TESTS PASSED PERFECTLY! Rules are verified.');
  } else {
    process.exit(1);
  }
}

runRulesTests().catch(err => {
  console.error('Rules test execution error:', err);
  process.exit(1);
});
