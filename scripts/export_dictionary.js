import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Read and parse .env manually
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) {
        env[match[1]] = match[2].trim();
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

async function exportData() {
    console.log('Connecting to Firestore...');
    
    console.log('Fetching kanji collection...');
    const kanjiSnap = await getDocs(collection(db, 'kanji'));
    const kanjiList = kanjiSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Fetched ${kanjiList.length} kanji records`);

    console.log('Fetching kanjiVocab collection...');
    const vocabSnap = await getDocs(collection(db, 'kanjiVocab'));
    const vocabList = vocabSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Fetched ${vocabList.length} vocab records`);

    console.log('Fetching vocabCategories collection...');
    const catSnap = await getDocs(collection(db, 'vocabCategories'));
    const catList = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Fetched ${catList.length} categories records`);

    console.log('Fetching bookGroups hierarchy...');
    const groupsSnap = await getDocs(collection(db, 'bookGroups'));
    const bookGroupsList = await Promise.all(groupsSnap.docs.map(async (groupDoc) => {
        const group = { id: groupDoc.id, ...groupDoc.data(), books: [] };
        const booksSnap = await getDocs(collection(db, 'bookGroups', groupDoc.id, 'books'));
        
        group.books = await Promise.all(booksSnap.docs.map(async (bookDoc) => {
            const book = { id: bookDoc.id, ...bookDoc.data(), chapters: [] };
            const chaptersSnap = await getDocs(collection(db, 'bookGroups', groupDoc.id, 'books', bookDoc.id, 'chapters'));
            
            book.chapters = await Promise.all(chaptersSnap.docs.map(async (chapterDoc) => {
                const chapter = { id: chapterDoc.id, ...chapterDoc.data(), lessons: [] };
                const lessonsSnap = await getDocs(
                    collection(db, 'bookGroups', groupDoc.id, 'books', bookDoc.id, 'chapters', chapterDoc.id, 'lessons')
                );
                
                chapter.lessons = lessonsSnap.docs.map(lessonDoc => ({
                    id: lessonDoc.id,
                    _docPath: lessonDoc.ref.path,
                    ...lessonDoc.data()
                })).sort((a, b) => (a.order || 0) - (b.order || 0));
                
                return chapter;
            }));
            
            book.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
            return book;
        }));
        
        group.books.sort((a, b) => (a.order || 0) - (b.order || 0));
        return group;
    }));
    bookGroupsList.sort((a, b) => (a.order || 0) - (b.order || 0));
    console.log(`Fetched ${bookGroupsList.length} book groups`);

    const dataDir = path.resolve('public/data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write metadata
    const metadata = {
        exportedAt: Date.now()
    };
    fs.writeFileSync(path.join(dataDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

    fs.writeFileSync(path.join(dataDir, 'kanji_data.json'), JSON.stringify(kanjiList, null, 2), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'vocab_data.json'), JSON.stringify(vocabList, null, 2), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'vocab_categories.json'), JSON.stringify(catList, null, 2), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'books_data.json'), JSON.stringify(bookGroupsList, null, 2), 'utf8');
    
    console.log('Data successfully written to public/data/*.json!');
    process.exit(0);
}

exportData().catch(err => {
    console.error('Error exporting data:', err);
    process.exit(1);
});
