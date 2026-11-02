import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Read config from firebase-applet-config.json
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const rawConfig = fs.readFileSync(configPath, 'utf8');
const firebaseConfig = JSON.parse(rawConfig);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function backup() {
  console.log('Starting Firestore Backup...');
  const backupData: Record<string, any> = {};

  const rootCollections = ['registeredAccounts', 'merchants', 'supportTickets', 'farmers', 'lots', 'shipments', 'payments'];

  for (const colName of rootCollections) {
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      backupData[colName] = {};
      console.log(`Collection '${colName}': found ${snap.docs.length} documents.`);
      
      for (const docSnap of snap.docs) {
        backupData[colName][docSnap.id] = docSnap.data();

        // If it's merchants, backup subcollections for each merchant!
        if (colName === 'merchants') {
          const merchantId = docSnap.id;
          const subCollections = ['farmers', 'parchis', 'payments', 'charges', 'counters', 'settings'];
          backupData[`merchants_${merchantId}_subcollections`] = {};

          for (const subColName of subCollections) {
            try {
              const subColRef = collection(db, 'merchants', merchantId, subColName);
              const subSnap = await getDocs(subColRef);
              backupData[`merchants_${merchantId}_subcollections`][subColName] = {};
              for (const subDocSnap of subSnap.docs) {
                backupData[`merchants_${merchantId}_subcollections`][subColName][subDocSnap.id] = subDocSnap.data();
              }
              console.log(`  Subcollection 'merchants/${merchantId}/${subColName}': ${subSnap.docs.length} docs.`);
            } catch (err: any) {
              console.warn(`  Could not read subcollection 'merchants/${merchantId}/${subColName}': ${err.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`Could not read collection '${colName}': ${err.message}`);
    }
  }

  const backupFilePath = path.resolve(process.cwd(), 'firestore_backup.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\nSUCCESS: Firestore backup saved to ${backupFilePath}`);
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
