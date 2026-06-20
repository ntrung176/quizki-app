import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    setDoc, 
    deleteDoc, 
    doc,
    query,
    limit,
    writeBatch
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// 1. Read Environment Variables with robust BOM and UTF-16/UTF-8 detection
import { existsSync } from 'fs';
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
    // Clean null bytes if any
    envText = envText.replace(/\u0000/g, '');
} catch (e) {
    console.error('Error reading env file:', e);
    process.exit(1);
}

const env = {};
envText.split('\n').forEach((line, idx) => {
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
const appId = env.VITE_FIREBASE_APP_ID || 'quizki-app';

// Authenticate if password argument is provided
const password = process.argv[2];
if (password) {
    const auth = getAuth(app);
    const adminEmail = env.VITE_ADMIN_EMAIL;
    console.log(`🔑 Logging in as admin: "${adminEmail}"...`);
    try {
        await signInWithEmailAndPassword(auth, adminEmail, password);
        console.log('✅ Authenticated successfully.');
    } catch (e) {
        console.error('❌ Authentication failed:', e.message);
        process.exit(1);
    }
} else {
    console.log('ℹ️ Running without authentication. (If you encounter PERMISSION_DENIED on production, run as: node scripts/normalizeSharedVocabulary.mjs <admin-password>)');
}

// Helper to normalize bracket formatting
function normalizeBrackets(text) {
    if (!text) return '';
    // Replace half-width ( ) with full-width （ ）
    return text.replace(/\(([^)]+)\)/g, '（$1）').trim();
}

// Helper to normalize POS
function normalizePos(pos) {
    if (!pos) return '';
    return pos.trim().toLowerCase();
}

async function runMigration() {
    console.log(`🚀 Starting Database Normalization & Consolidating Plan...`);
    console.log(`Targeting App ID: "${appId}"`);

    // --- STEP 1: Normalize Root sharedVocabulary ---
    console.log('\n--- Step 1: Normalizing root "sharedVocabulary" collection ---');
    const rootVocabSnap = await getDocs(collection(db, 'sharedVocabulary'));
    console.log(`Found ${rootVocabSnap.size} documents in root "sharedVocabulary".`);

    let normalizedCount = 0;
    let batch = writeBatch(db);
    let operationsInBatch = 0;
    const BATCH_LIMIT = 450;

    for (const docSnap of rootVocabSnap.docs) {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        const originalFront = data.front || data.frontWithFurigana || docId;
        const normalizedFront = normalizeBrackets(originalFront);
        const normalizedSynonym = normalizeBrackets(data.synonym || '');
        const normalizedPos = normalizePos(data.pos || '');
        const normalizedSino = (data.sinoVietnamese || '').trim().toUpperCase();

        const updatedData = {
            front: normalizedFront,
            back: data.back || data.meaning || '',
            synonym: normalizedSynonym,
            sinoVietnamese: normalizedSino,
            synonymSinoVietnamese: (data.synonymSinoVietnamese || '').trim().toUpperCase(),
            example: data.example || '',
            exampleMeaning: data.exampleMeaning || '',
            nuance: data.nuance || '',
            pos: normalizedPos,
            level: data.level || '',
            updatedAt: data.updatedAt || Date.now(),
        };

        // Determine if any field changed
        const isChanged = 
            originalFront !== normalizedFront ||
            (data.synonym || '') !== normalizedSynonym ||
            (data.pos || '') !== normalizedPos ||
            (data.sinoVietnamese || '') !== normalizedSino ||
            (data.back || '') !== updatedData.back;

        if (isChanged) {
            batch.set(doc(db, 'sharedVocabulary', docId), updatedData, { merge: true });
            normalizedCount++;
            operationsInBatch++;

            if (operationsInBatch >= BATCH_LIMIT) {
                console.log(`  Writing batch of ${operationsInBatch} normalization updates...`);
                await batch.commit();
                batch = writeBatch(db);
                operationsInBatch = 0;
            }
        }
    }

    if (operationsInBatch > 0) {
        console.log(`  Writing final batch of ${operationsInBatch} normalization updates...`);
        await batch.commit();
    }
    console.log(`✅ Normalized ${normalizedCount} documents in root "sharedVocabulary".`);

    // --- STEP 2: Consolidate redundant nested sharedVocab ---
    const nestedCollectionPath = `artifacts/${appId}/sharedVocab`;
    console.log(`\n--- Step 2: Consolidating redundant collection "${nestedCollectionPath}" ---`);
    let nestedVocabSnap;
    try {
        nestedVocabSnap = await getDocs(collection(db, nestedCollectionPath));
    } catch (e) {
        console.warn(`Could not read "${nestedCollectionPath}". It may not exist or rules block it. Skipping.`, e.message);
        console.log(`\n🎉 Process finished.`);
        process.exit(0);
    }

    console.log(`Found ${nestedVocabSnap.size} documents in nested "${nestedCollectionPath}".`);
    
    let migratedCount = 0;
    let deletedCount = 0;
    let batch2 = writeBatch(db);
    let operationsInBatch2 = 0;

    for (const docSnap of nestedVocabSnap.docs) {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        // Find if this word exists in root sharedVocabulary
        const rootDocRef = doc(db, 'sharedVocabulary', docId);

        // Set normalized data
        const normalizedFront = normalizeBrackets(data.front || data.frontWithFurigana || docId);
        const normalizedSynonym = normalizeBrackets(data.synonym || '');
        const normalizedPos = normalizePos(data.pos || '');
        const normalizedSino = (data.sinoVietnamese || '').trim().toUpperCase();

        const cleanData = {
            front: normalizedFront,
            back: data.back || data.meaning || '',
            synonym: normalizedSynonym,
            sinoVietnamese: normalizedSino,
            synonymSinoVietnamese: (data.synonymSinoVietnamese || '').trim().toUpperCase(),
            example: data.example || '',
            exampleMeaning: data.exampleMeaning || '',
            nuance: data.nuance || '',
            pos: normalizedPos,
            level: data.level || '',
            updatedAt: data.updatedAt || Date.now(),
        };

        // Write to root sharedVocabulary & Delete from nested
        batch2.set(rootDocRef, cleanData, { merge: true });
        batch2.delete(doc(db, nestedCollectionPath, docId));
        
        migratedCount++;
        deletedCount++;
        operationsInBatch2 += 2; // set + delete counts as 2 operations

        if (operationsInBatch2 >= BATCH_LIMIT) {
            console.log(`  Writing batch of ${operationsInBatch2} consolidation updates...`);
            await batch2.commit();
            batch2 = writeBatch(db);
            operationsInBatch2 = 0;
        }
    }

    if (operationsInBatch2 > 0) {
        console.log(`  Writing final batch of ${operationsInBatch2} consolidation updates...`);
        await batch2.commit();
    }

    console.log(`✅ Migrated/merged ${migratedCount} documents to root "sharedVocabulary".`);
    console.log(`✅ Deleted ${deletedCount} redundant documents from "${nestedCollectionPath}".`);
    console.log(`\n🎉 Database Consolidation & Clean-up completed successfully!`);
    process.exit(0);
}

runMigration().catch(e => {
    console.error('❌ Migration failed with error:', e);
    process.exit(1);
});
