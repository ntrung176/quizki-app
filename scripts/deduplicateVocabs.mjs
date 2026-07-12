import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
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
    console.error('Usage: node scripts/deduplicateVocabs.mjs <admin-password>');
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
    try {
        console.log('Logging in to Firebase as admin...');
        const adminEmail = getEnv('VITE_ADMIN_EMAIL');
        await signInWithEmailAndPassword(auth, adminEmail, password);
        console.log('Successfully logged in!\n');

        console.log('Fetching all vocabulary words...');
        const vocabSnapshot = await getDocs(collection(db, 'kanjiVocab'));
        const vocabList = vocabSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Loaded ${vocabList.length} vocabulary words.`);

        // Group by normalized word
        const grouped = {};
        vocabList.forEach(v => {
            if (!v.word) return;
            const normalized = v.word.split('（')[0].split('(')[0].trim();
            if (!grouped[normalized]) {
                grouped[normalized] = [];
            }
            grouped[normalized].push(v);
        });

        const toDelete = [];
        let duplicateGroups = 0;

        for (const [word, items] of Object.entries(grouped)) {
            if (items.length > 1) {
                duplicateGroups++;
                // Prioritize keeping:
                // 1. Items with category starting with '📚' (book vocabulary)
                // 2. Items with more fields populated
                // 3. The oldest item (or first item)
                
                items.sort((a, b) => {
                    const aIsBook = a.category && a.category.startsWith('📚') ? 1 : 0;
                    const bIsBook = b.category && b.category.startsWith('📚') ? 1 : 0;
                    if (aIsBook !== bIsBook) {
                        return bIsBook - aIsBook; // book first
                    }
                    
                    // Sort by number of populated fields
                    const aFields = Object.values(a).filter(val => val !== '' && val !== null && val !== undefined).length;
                    const bFields = Object.values(b).filter(val => val !== '' && val !== null && val !== undefined).length;
                    if (aFields !== bFields) {
                        return bFields - aFields; // more fields first
                    }
                    
                    return (a.updatedAt || 0) - (b.updatedAt || 0); // oldest first
                });

                // Keep the first one, delete the rest
                const keep = items[0];
                const duplicates = items.slice(1);
                
                console.log(`Duplicate found for "${word}": Keeping Doc ${keep.id} (${keep.category || 'Tự động'}), deleting:`);
                duplicates.forEach(dup => {
                    console.log(`  - Doc ${dup.id} (${dup.category || 'Tự động'})`);
                    toDelete.push(dup.id);
                });
            }
        }

        console.log(`\nFound ${duplicateGroups} groups of duplicate words.`);
        console.log(`Total duplicate documents to delete: ${toDelete.length}`);

        if (toDelete.length > 0) {
            console.log('Starting deletion in batches of 500...');
            let batch = writeBatch(db);
            let count = 0;
            
            for (let i = 0; i < toDelete.length; i++) {
                const docId = toDelete[i];
                batch.delete(doc(db, 'kanjiVocab', docId));
                count++;
                
                if (count === 500 || i === toDelete.length - 1) {
                    await batch.commit();
                    console.log(`Committed batch deletion of ${count} documents.`);
                    batch = writeBatch(db);
                    count = 0;
                }
            }
            console.log('🎉 Successfully removed all duplicate vocabularies!');
        } else {
            console.log('No duplicates found. The database is clean!');
        }
        
    } catch (error) {
        console.error('An error occurred during execution:', error);
    }
    process.exit(0);
}

run();
