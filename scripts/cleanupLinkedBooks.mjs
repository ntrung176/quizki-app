import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

let envText = '';
try {
    envText = readFileSync('.env.local', 'utf8');
} catch (e) {
    try {
        envText = readFileSync('.env', 'utf8');
    } catch (err) {
        console.error('Could not read .env file');
        process.exit(1);
    }
}

const env = {};
envText.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
});

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

async function cleanup() {
    console.log('Fetching all kanji vocab to find imported books...');
    const vocabSnap = await getDocs(collection(db, 'kanjiVocab'));
    const allVocab = vocabSnap.docs;

    let deleteCount = 0;
    for (const docSnap of allVocab) {
        const data = docSnap.data();
        if (data.category && data.category.startsWith('📚')) {
            await deleteDoc(doc(db, 'kanjiVocab', docSnap.id));
            deleteCount++;
            if (deleteCount % 100 === 0) console.log(`Deleted ${deleteCount}...`);
        }
    }
    console.log(`Deleted ${deleteCount} vocab words from imported books.`);

    console.log('Deleting kanjiImportedBooks history...');
    const histSnap = await getDocs(collection(db, 'kanjiImportedBooks'));
    for (const docSnap of histSnap.docs) {
        await deleteDoc(doc(db, 'kanjiImportedBooks', docSnap.id));
    }

    console.log('Deleting legacy kanjiLinkedBooks just in case...');
    const legacySnap = await getDocs(collection(db, 'kanjiLinkedBooks'));
    for (const docSnap of legacySnap.docs) {
        await deleteDoc(doc(db, 'kanjiLinkedBooks', docSnap.id));
    }

    console.log('Cleanup complete.');
    process.exit(0);
}

cleanup().catch(e => { console.error(e); process.exit(1); });
