import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const rawConfig = fs.readFileSync(configPath, 'utf8');
const firebaseConfig = JSON.parse(rawConfig);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function generateRandomMerchantId(): string {
  const bytes = crypto.randomBytes(8).toString('hex');
  return `mnd_${bytes}`;
}

async function migrateMerchants() {
  console.log('=== STARTING STEP 1.3 MERCHANT ID MIGRATION (CLIENT SDK) ===\n');

  const registeredCol = collection(db, 'registeredAccounts');
  const registeredSnap = await getDocs(registeredCol);
  console.log(`Found ${registeredSnap.docs.length} registered accounts in Firestore.`);

  const migrationResults: Array<{
    phone: string;
    oldMerchantId: string;
    newMerchantId: string;
    verified: boolean;
    subcollectionStats: Record<string, number>;
  }> = [];

  for (const docSnap of registeredSnap.docs) {
    const phone = docSnap.id;
    const accountData = docSnap.data();
    const oldMerchantId = accountData.merchantId || `merchant-${phone}`;

    let newMerchantId = accountData.merchantId;
    const isPredictable =
      !oldMerchantId || oldMerchantId.startsWith('merchant-') || oldMerchantId.startsWith('MND-');

    if (isPredictable) {
      newMerchantId = generateRandomMerchantId();
    }

    console.log(`Processing Phone: +91****${phone.slice(-4)} | Old ID: ${oldMerchantId} -> New ID: ${newMerchantId}`);

    const subcollections = ['farmers', 'parchis', 'payments', 'charges', 'counters', 'settings'];
    const subStats: Record<string, number> = {};
    let allSubcollectionsMigrated = true;

    if (oldMerchantId !== newMerchantId) {
      for (const subName of subcollections) {
        const sourceColRef = collection(db, 'merchants', oldMerchantId, subName);
        const sourceSnap = await getDocs(sourceColRef);
        subStats[subName] = sourceSnap.docs.length;

        if (sourceSnap.docs.length > 0) {
          const targetColRef = collection(db, 'merchants', newMerchantId, subName);

          for (const itemDoc of sourceSnap.docs) {
            await setDoc(doc(targetColRef, itemDoc.id), itemDoc.data());
          }

          // Verify copy count
          const targetSnap = await getDocs(targetColRef);
          if (targetSnap.docs.length !== sourceSnap.docs.length) {
            console.error(`  ERROR: Mismatch in ${subName} count for ${oldMerchantId} -> ${newMerchantId}`);
            allSubcollectionsMigrated = false;
          } else {
            console.log(`  Copied ${subName} (${sourceSnap.docs.length} docs) to merchants/${newMerchantId}/${subName}`);
          }
        }
      }

      // Copy merchant root document if exists
      const oldMerchantDocRef = doc(db, 'merchants', oldMerchantId);
      const oldMerchantDoc = await getDoc(oldMerchantDocRef);
      if (oldMerchantDoc.exists()) {
        await setDoc(doc(db, 'merchants', newMerchantId), oldMerchantDoc.data(), { merge: true });
      }

      // Update registeredAccounts mapping
      await updateDoc(doc(db, 'registeredAccounts', phone), {
        merchantId: newMerchantId,
        oldMerchantId,
        migratedAt: new Date().toISOString(),
      });
      console.log(`  Updated registeredAccounts/${phone} with new merchantId: ${newMerchantId}`);
    } else {
      console.log(`  Merchant ID ${newMerchantId} is already secure.`);
    }

    migrationResults.push({
      phone,
      oldMerchantId,
      newMerchantId,
      verified: allSubcollectionsMigrated,
      subcollectionStats: subStats,
    });
  }

  console.log('\n=== MIGRATION SUMMARY REPORT ===');
  console.log(JSON.stringify(migrationResults, null, 2));

  fs.writeFileSync(
    path.resolve(process.cwd(), 'merchant_migration_log.json'),
    JSON.stringify(migrationResults, null, 2),
    'utf8'
  );
  console.log('\nMigration log saved to merchant_migration_log.json');
}

migrateMerchants().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
