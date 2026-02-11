/**
 * Upload all 2211 JLPT kanji from jotobaKanjiData.js to Firebase Firestore
 * 
 * Usage: node scripts/uploadKanjiToFirebase.mjs <admin-password>
 * 
 * - Authenticates as admin user
 * - Uploads new kanji that don't exist in Firebase
 * - Updates existing kanji with missing sinoViet/meaningVi fields
 * - Does NOT overwrite any existing user edits
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

// Read Firebase config from .env
const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}

const password = process.argv[2];
if (!password) {
    console.error('Usage: node scripts/uploadKanjiToFirebase.mjs <admin-password>');
    console.error('  Password for admin email:', getEnv('VITE_ADMIN_EMAIL'));
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

console.log('Firebase Project:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Parse jotobaKanjiData.js
function parseKanjiData() {
    const dataContent = fs.readFileSync('src/data/jotobaKanjiData.js', 'utf-8');
    const startMarker = 'export const JOTOBA_KANJI_DATA = {';
    const startIdx = dataContent.indexOf(startMarker);
    if (startIdx === -1) throw new Error('Cannot find JOTOBA_KANJI_DATA');

    let braceCount = 0;
    const dataStart = startIdx + startMarker.length - 1;
    let dataEnd = -1;

    for (let i = dataStart; i < dataContent.length; i++) {
        if (dataContent[i] === '{') braceCount++;
        if (dataContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) { dataEnd = i + 1; break; }
        }
    }

    if (dataEnd === -1) throw new Error('Cannot find end of JOTOBA_KANJI_DATA');
    const dataStr = dataContent.substring(dataStart, dataEnd);
    return new Function(`return (${dataStr})`)();
}

async function main() {
    // Authenticate as admin
    const adminEmail = getEnv('VITE_ADMIN_EMAIL');
    console.log('Signing in as:', adminEmail);

    try {
        await signInWithEmailAndPassword(auth, adminEmail, password);
        console.log('✅ Authenticated successfully');
    } catch (e) {
        console.error('❌ Authentication failed:', e.message);
        process.exit(1);
    }

    const kanjiData = parseKanjiData();
    const allKanji = Object.values(kanjiData);
    console.log(`Parsed ${allKanji.length} kanji from jotobaKanjiData.js`);

    // Load existing kanji from Firebase
    console.log('Loading existing kanji from Firebase...');
    const existingSnap = await getDocs(collection(db, 'kanji'));
    const existingMap = {};
    existingSnap.docs.forEach(d => {
        const data = d.data();
        if (data.character) {
            existingMap[data.character] = { id: d.id, ...data };
        }
    });
    console.log(`Found ${Object.keys(existingMap).length} existing kanji in Firebase`);

    const toUpload = [];
    const toUpdate = [];

    for (const k of allKanji) {
        const existing = existingMap[k.literal];
        if (existing) {
            // Update existing: add missing fields only
            const updates = {};
            if (!existing.sinoViet && k.sinoViet) updates.sinoViet = k.sinoViet;
            if (!existing.meaningVi && k.meaningVi) updates.meaningVi = k.meaningVi;
            if (!existing.strokeCount && k.stroke_count) updates.strokeCount = String(k.stroke_count);
            if (!existing.onyomi && k.onyomi?.length) updates.onyomi = k.onyomi.join('、');
            if (!existing.kunyomi && k.kunyomi?.length) updates.kunyomi = k.kunyomi.join('、');
            if (Object.keys(updates).length > 0) {
                toUpdate.push({ id: existing.id, char: k.literal, updates });
            }
        } else {
            // New kanji
            toUpload.push({
                character: k.literal,
                meaning: k.meaningVi || k.meanings?.join(', ') || '',
                meaningVi: k.meaningVi || '',
                sinoViet: k.sinoViet || '',
                onyomi: k.onyomi?.join('、') || '',
                kunyomi: k.kunyomi?.join('、') || '',
                level: k.level || 'N5',
                strokeCount: String(k.stroke_count || ''),
                mnemonic: '',
                parts: (k.parts || []).join('、'),
            });
        }
    }

    console.log(`New kanji to upload: ${toUpload.length}`);
    console.log(`Existing kanji to update: ${toUpdate.length}`);

    // Upload in batches of 450
    const BATCH_SIZE = 450;
    let uploaded = 0;

    for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = toUpload.slice(i, i + BATCH_SIZE);
        for (const kanji of chunk) {
            const docRef = doc(collection(db, 'kanji'));
            batch.set(docRef, kanji);
        }
        await batch.commit();
        uploaded += chunk.length;
        console.log(`  Uploaded ${uploaded}/${toUpload.length} new kanji`);
    }

    // Update existing in batches
    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = toUpdate.slice(i, i + BATCH_SIZE);
        for (const item of chunk) {
            const docRef = doc(db, 'kanji', item.id);
            batch.update(docRef, item.updates);
        }
        await batch.commit();
        updated += chunk.length;
        console.log(`  Updated ${updated}/${toUpdate.length} existing kanji`);
    }

    console.log('\n✅ Done!');
    console.log(`  New kanji uploaded: ${uploaded}`);
    console.log(`  Existing kanji updated: ${updated}`);
    console.log(`  Total kanji in database: ${Object.keys(existingMap).length + uploaded}`);

    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
