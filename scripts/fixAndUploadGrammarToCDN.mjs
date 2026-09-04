import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

// Read .env
const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}

const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
};

const appId = firebaseConfig.appId;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function main() {
    console.log('Đang đọc file public/data/grammar_data.json...');
    const grammarFilePath = path.join(process.cwd(), 'public/data/grammar_data.json');
    if (!fs.existsSync(grammarFilePath)) {
        console.error('Không tìm thấy file grammar_data.json');
        process.exit(1);
    }

    const grammarContent = fs.readFileSync(grammarFilePath, 'utf-8');
    const grammarData = JSON.parse(grammarContent);
    const totalPoints = grammarData.reduce((sum, tb) => sum + (tb.lessons || []).reduce((lSum, ls) => lSum + (ls.points?.length || 0), 0), 0);
    console.log(`Đã đọc ${grammarData.length} giáo trình với ${totalPoints} mẫu ngữ pháp.`);

    console.log('Đang tải file lên Firebase Storage CDN (cache/' + appId + '/grammar_data.json)...');
    const blob = new Uint8Array(Buffer.from(grammarContent, 'utf-8'));
    const fileRef = ref(storage, `cache/${appId}/grammar_data.json`);
    await uploadBytes(fileRef, blob, { contentType: 'application/json' });
    const grammarUrl = await getDownloadURL(fileRef);
    console.log('✅ Đã tải lên CDN thành công! URL:', grammarUrl);

    const exportedAt = Date.now();
    console.log('Đang cập nhật cacheConfig trong Firestore...');
    const configRef = doc(db, `artifacts/${appId}/settings/cacheConfig`);
    await setDoc(configRef, { grammarUrl, exportedAt }, { merge: true });
    console.log('✅ Đã cập nhật cacheConfig thành công! exportedAt:', exportedAt);
}

main().catch(err => {
    console.error('Lỗi upload:', err);
    process.exit(1);
});
