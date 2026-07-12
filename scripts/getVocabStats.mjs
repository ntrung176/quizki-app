import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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
    console.error('Usage: node scripts/getVocabStats.mjs <admin-password>');
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

        console.log('Fetching Kanji characters...');
        const kanjiSnapshot = await getDocs(collection(db, 'kanji'));
        const kanjiList = kanjiSnapshot.docs.map(doc => doc.data());
        console.log(`Loaded ${kanjiList.length} Kanji characters.`);

        console.log('Fetching vocabulary words...');
        const vocabSnapshot = await getDocs(collection(db, 'kanjiVocab'));
        const vocabList = vocabSnapshot.docs.map(doc => doc.data());
        console.log(`Loaded ${vocabList.length} total vocabulary words.\n`);

        // Statistics
        let bookVocabCount = 0;
        let dictVocabCount = 0;
        const kanjiVocabCount = {};

        // Initialize kanjiVocabCount for each character in kanjiList
        kanjiList.forEach(k => {
            kanjiVocabCount[k.character] = 0;
        });

        vocabList.forEach(v => {
            if (v.category && v.category.startsWith('📚')) {
                bookVocabCount++;
            } else {
                dictVocabCount++;
            }

            // Extract Kanji characters from the word to see how many words are mapped to it
            const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
            chars.forEach(c => {
                if (c in kanjiVocabCount) {
                    kanjiVocabCount[c]++;
                }
            });
        });

        let kanjiWithTenOrMore = 0;
        let kanjiWithLess = 0;
        let kanjiWithZero = 0;

        kanjiList.forEach(k => {
            const count = kanjiVocabCount[k.character] || 0;
            if (count >= 10) {
                kanjiWithTenOrMore++;
            } else {
                kanjiWithLess++;
                if (count === 0) {
                    kanjiWithZero++;
                }
            }
        });

        console.log('=== THỐNG KÊ CHI TIẾT ===');
        console.log(`1. Tổng số chữ Kanji: ${kanjiList.length} chữ`);
        console.log(`2. Tổng số từ vựng: ${vocabList.length} từ`);
        console.log(`   - Từ vựng từ sách/giáo trình (📚): ${bookVocabCount} từ`);
        console.log(`   - Từ vựng từ điển thông thường: ${dictVocabCount} từ`);
        console.log(`3. Phân bổ từ vựng theo chữ Kanji:`);
        console.log(`   - Số Kanji đã đủ từ vựng (>= 10 từ): ${kanjiWithTenOrMore} chữ (${((kanjiWithTenOrMore / kanjiList.length) * 100).toFixed(2)}%)`);
        console.log(`   - Số Kanji chưa đủ từ vựng (< 10 từ): ${kanjiWithLess} chữ (${((kanjiWithLess / kanjiList.length) * 100).toFixed(2)}%)`);
        console.log(`   - Trong đó, số Kanji chưa có bất kỳ từ nào (0 từ): ${kanjiWithZero} chữ`);
        
    } catch (error) {
        console.error('An error occurred during statistical execution:', error);
    }
    process.exit(0);
}

run();
