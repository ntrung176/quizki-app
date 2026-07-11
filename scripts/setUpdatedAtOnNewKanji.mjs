/**
 * Set updatedAt timestamp on the newly uploaded Jōyō Kanji in Firestore
 * so they appear in the admin-only 'Mới thêm' filter.
 * 
 * Usage: node scripts/setUpdatedAtOnNewKanji.mjs <admin-password>
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
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
    console.error('Usage: node scripts/setUpdatedAtOnNewKanji.mjs <admin-password>');
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

// List of the 186 added Joyo kanji characters
const newKanjiChars = new Set([
    '分', '込', '的', '無', '可', '身', '畑', '坊', '韓', '岡', '阪', '狙', '枠', '埼', '孝', '里', '茨', '寿', '曽', '丈', 
    '栃', '阜', '粧', '葛', '畿', '尻', '唐', '笹', '柿', '腎', '釜', '脇', '鍋', '慌', '瓦', '挫', '誰', '俺', '痕', '袖', 
    '妖', '闇', '捉', '賭', '槻', '汎', '頃', '謎', '爪', '鍵', '臼', '牙', '枕', '丼', '惧', '膳', '呪', '斬', '怨', '串', 
    '腫', '餅', '箸', '斑', '摯', '堆', '芯', '蜜', '股', '匂', '玩', '蜂', '椅', '叱', '挨', '餌', '脊', '凄', '嫉', '膝', 
    '恣', '麺', '戴', '裾', '冥', '麓', '稽', '蹴', '訃', '剥', '蓋', '畏', '喉', '拭', '頬', '贴', '諦', '煎', '緻', '哺', 
    '罵', '乞', '嗅', '蔑', '凪', '柾', '椋', '滉', '澪', '瑳', '侶', '傲', '僅', '刹', '剝', '勃', '勾', '咽', '唾', '喩', 
    '嘲', '塞', '塡', '填', '妬', '宛', '崖', '巾', '弄', '彙', '慄', '憬', '戚', '拉', '拶', '捗', '捻', '昧', '曖', '柵', 
    '桁', '梗', '楷', '毀', '氾', '沃', '淫', '溺', '潰', '璧', '璽', '痩', '瘍', '窟', '箋', '籠', '绽', '羞', '羨', '肘', 
    '腺', '臆', '舷', '苛', '萎', '蔽', '詣', '诠', '諧', '貌', '貪', '賂', '踪', '辣', '遜', '遡', '酎', '醒', '錮', '隙', 
    '頓', '頰', '顎', '骸', '鬱', '𠮟'
]);

async function main() {
    const adminEmail = getEnv('VITE_ADMIN_EMAIL');
    console.log('Signing in as:', adminEmail);

    try {
        await signInWithEmailAndPassword(auth, adminEmail, password);
        console.log('✅ Authenticated successfully');
    } catch (e) {
        console.error('❌ Authentication failed:', e.message);
        process.exit(1);
    }

    console.log('Fetching all kanji docs from Firestore...');
    const snap = await getDocs(collection(db, 'kanji'));
    console.log(`Found ${snap.size} total kanji docs in Firestore.`);

    const toUpdate = [];
    snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.character && newKanjiChars.has(data.character) && !data.updatedAt) {
            toUpdate.push({ id: doc.id, char: data.character });
        }
    });

    console.log(`Found ${toUpdate.length} documents matching new Jōyō characters that need 'updatedAt' field.`);

    if (toUpdate.length === 0) {
        console.log('✅ No documents need updating!');
        process.exit(0);
    }

    const BATCH_SIZE = 450;
    let updated = 0;
    const now = Date.now();

    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = toUpdate.slice(i, i + BATCH_SIZE);
        for (const item of chunk) {
            const docRef = doc(db, 'kanji', item.id);
            batch.update(docRef, { updatedAt: now });
        }
        await batch.commit();
        updated += chunk.length;
        console.log(`  Updated ${updated}/${toUpdate.length} documents...`);
    }

    console.log('\n✅ All done!');
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
