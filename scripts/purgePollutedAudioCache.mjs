import { readFileSync, existsSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collectionGroup, 
    getDocs, 
    writeBatch, 
    doc,
    updateDoc,
    deleteField
} from 'firebase/firestore';

// 1. Read Environment Variables
let envText = '';
const envPath = existsSync('.env.local') ? '.env.local' : existsSync('.env') ? '.env' : null;

if (!envPath) {
    console.error('Could not find .env or .env.local file.');
    process.exit(1);
}

try {
    const buffer = readFileSync(envPath);
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
        envText = buffer.toString('utf16le');
    } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
        envText = buffer.toString('utf16be');
    } else if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        envText = buffer.toString('utf8').substring(1);
    } else {
        envText = buffer.toString('utf8');
    }
    envText = envText.replace(/\u0000/g, '');
} catch (e) {
    console.error('Error reading env file:', e);
    process.exit(1);
}

const env = {};
envText.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/['"]/g, '').trim();
        env[key] = val;
    }
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

async function runPurge() {
    console.log('🚀 Starting scan of vocabulary cards to purge polluted audioBase64...');
    console.log('Fetching all vocabulary cards across all users (collection group: "vocabulary")...');
    
    let vocabSnap;
    try {
        vocabSnap = await getDocs(collectionGroup(db, 'vocabulary'));
    } catch (e) {
        console.error('❌ Failed to fetch vocabulary collection group:', e.message);
        process.exit(1);
    }
    
    console.log(`Found ${vocabSnap.size} vocabulary documents in total.`);
    
    let scannedCount = 0;
    let purgedCount = 0;
    let batch = writeBatch(db);
    let operationsInBatch = 0;
    const BATCH_LIMIT = 450;
    
    for (const docSnap of vocabSnap.docs) {
        scannedCount++;
        const data = docSnap.data();
        
        // Chỉ xử lý các thẻ đã có trường audioBase64
        if (!data.audioBase64) continue;
        
        const front = data.front || '';
        const match = front.match(/[（(]([^）)]+)[）)]/);
        
        if (match) {
            const bracketContent = match[1].trim();
            // Nếu phần trong ngoặc có ký tự Latinh (a-zA-Z), chứng tỏ đây là ghi chú tiếng Anh
            // chứ không phải là phiên âm Hiragana/Katakana chuẩn.
            const hasLatin = /[a-zA-Z]/.test(bracketContent);
            
            if (hasLatin) {
                console.log(`  [PURGE] Document ${docSnap.id} ("${front}"): brackets contain Latin ("${bracketContent}"). Clearing audioBase64.`);
                
                batch.update(docSnap.ref, {
                    audioBase64: null // hoặc deleteField()
                });
                
                purgedCount++;
                operationsInBatch++;
                
                if (operationsInBatch >= BATCH_LIMIT) {
                    console.log(`  Writing batch of ${operationsInBatch} updates to Firestore...`);
                    await batch.commit();
                    batch = writeBatch(db);
                    operationsInBatch = 0;
                }
            }
        }
    }
    
    if (operationsInBatch > 0) {
        console.log(`  Writing final batch of ${operationsInBatch} updates to Firestore...`);
        await batch.commit();
    }
    
    console.log(`\n🎉 Purge complete!`);
    console.log(`Scanned: ${scannedCount} cards`);
    console.log(`Purged:  ${purgedCount} polluted audios (will be regenerated correctly on next play)`);
    process.exit(0);
}

runPurge().catch((e) => {
    console.error('❌ Purge script failed:', e);
    process.exit(1);
});
