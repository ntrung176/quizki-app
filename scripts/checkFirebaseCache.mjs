import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const env = {};
  for (const ef of envFiles) {
    if (fs.existsSync(ef)) {
      const lines = fs.readFileSync(ef, 'utf-8').split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          env[match[1]] = match[2] ? match[2].trim().replace(/^['"]|['"]$/g, '') : '';
        }
      }
    }
  }
  return env;
}

const env = loadEnv();

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = env.VITE_FIREBASE_APP_ID || 'quizki-default-app';

async function checkFirebase() {
  const cacheRef = doc(db, 'artifacts/' + appId + '/settings/cacheConfig');
  const cacheSnap = await getDoc(cacheRef);
  console.log('CacheConfig exists:', cacheSnap.exists());
  if (cacheSnap.exists()) {
    console.log('CacheConfig data:', cacheSnap.data());
  }

  const testsRef = collection(db, 'artifacts/' + appId + '/jlptTests');
  const testsSnap = await getDocs(testsRef);
  console.log('Firestore jlptTests docs count:', testsSnap.size);
  if (testsSnap.size > 0) {
    testsSnap.docs.slice(0, 5).forEach(d => console.log('Sample doc:', d.id, d.data().title));
  }
}

checkFirebase().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
