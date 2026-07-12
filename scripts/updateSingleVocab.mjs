import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

// Read config from .env
const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}

const password = process.argv[2];

if (!password) {
    console.error('Usage: node scripts/updateSingleVocab.mjs <admin-password>');
    process.exit(1);
}

const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
    const adminEmail = getEnv('VITE_ADMIN_EMAIL');
    console.log(`Signing in as: ${adminEmail}...`);
    await signInWithEmailAndPassword(auth, adminEmail, password);
    console.log('✅ Authenticated successfully.');

    console.log('Scanning all vocabularies for "最怖"...');
    const snap = await getDocs(collection(db, 'kanjiVocab'));
    
    let updatedCount = 0;
    for (const d of snap.docs) {
        const data = d.data();
        if (data.word && data.word.includes('最怖')) {
            console.log(`Matching doc found: ID=${d.id} | Current word=${data.word} | Reading=${data.reading}`);
            
            await updateDoc(doc(db, 'kanjiVocab', d.id), {
                word: "最怖（さいきょう）",
                reading: "さいきょう",
                updatedAt: Date.now()
            });
            console.log(`  -> Updated successfully to さいきょう!`);
            updatedCount++;
        }
    }
    
    console.log(`🎉 Done! Updated ${updatedCount} document(s).`);
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
