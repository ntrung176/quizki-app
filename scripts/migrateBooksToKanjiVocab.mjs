import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

const envPath = '.env.local'; // Usually .env.local or .env in Vite
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

async function migrate() {
    console.log('Fetching kanjiLinkedBooks...');
    const linkedBooksSnap = await getDocs(collection(db, 'kanjiLinkedBooks'));
    const linkedBooks = linkedBooksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (linkedBooks.length === 0) {
        console.log('No linked books found. Exiting.');
        process.exit(0);
    }

    console.log(`Found ${linkedBooks.length} linked books. Loading existing kanjiVocab to avoid duplicates...`);
    const vocabSnap = await getDocs(collection(db, 'kanjiVocab'));
    const existingVocab = vocabSnap.docs.map(d => d.data());

    for (const lb of linkedBooks) {
        console.log(`Processing link: ${lb.bookName}`);
        let addedCount = 0;
        if (lb.bookPath) {
            const [gId, bId] = lb.bookPath.split('/');
            if (gId && bId) {
                const chapSnap = await getDocs(collection(db, 'bookGroups', gId, 'books', bId, 'chapters'));
                for (const chDoc of chapSnap.docs) {
                    const lessonsSnap = await getDocs(collection(db, 'bookGroups', gId, 'books', bId, 'chapters', chDoc.id, 'lessons'));
                    for (const lDoc of lessonsSnap.docs) {
                        const lessonData = lDoc.data();
                        if (lessonData.vocab && Array.isArray(lessonData.vocab)) {
                            let audioMap = {};
                            try {
                                const audioSnap = await getDocs(collection(db, 'bookGroups', gId, 'books', bId, 'chapters', chDoc.id, 'lessons', lDoc.id, 'vocabAudio'));
                                audioSnap.docs.forEach(aDoc => { audioMap[aDoc.id] = aDoc.data(); });
                            } catch (_) { }

                            for (let vi = 0; vi < lessonData.vocab.length; vi++) {
                                const v = lessonData.vocab[vi];
                                const wordAudio = audioMap[`${vi}_word`];
                                const word = v.word || v.front || '';
                                const catName = `📚 ${lb.bookName}`;

                                const isDuplicate = existingVocab.some(ex => ex.word === word && ex.category === catName);
                                if (!isDuplicate) {
                                    const newDoc = {
                                        word: word,
                                        reading: v.reading || '',
                                        meaning: v.meaning || v.back || '',
                                        category: catName,
                                        level: v.level || 'N5',
                                        sinoViet: v.sinoViet || '',
                                        audioBase64: (wordAudio && wordAudio.base64) ? wordAudio.base64 : null
                                    };
                                    await addDoc(collection(db, 'kanjiVocab'), newDoc);
                                    existingVocab.push(newDoc);
                                    addedCount++;
                                }
                            }
                        }
                    }
                }
            }
        }
        console.log(`Added ${addedCount} vocab from ${lb.bookName}. Deleting kanjiLinkedBooks document...`);
        await deleteDoc(doc(db, 'kanjiLinkedBooks', lb.id));
    }
    console.log('Migration complete.');
    process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
