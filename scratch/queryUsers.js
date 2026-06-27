import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBGHxudWm6DnkL9g_rLmqKpVaaT4R39_zk",
    authDomain: "quizki-988e9.firebaseapp.com",
    projectId: "quizki-988e9",
    storageBucket: "quizki-988e9.firebasestorage.app",
    messagingSenderId: "28989364918",
    appId: "1:28989364918:web:a2a99ad33fc0c23fca6417"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const userId = "cKaoe0SnScaX4IxoTaSY4xldySa2";
const appIdStr = "1:28989364918:web:a2a99ad33fc0c23fca6417";

async function inspectUserCards() {
    try {
        console.log(`\n--- INSPECTING USER: ${userId} ---`);
        
        // 1. Vocabulary
        const vocabPath = `artifacts/${appIdStr}/users/${userId}/vocabulary`;
        console.log(`Fetching vocabulary from: ${vocabPath}`);
        const vocabSnap = await getDocs(collection(db, vocabPath));
        console.log(`Total vocabulary cards found: ${vocabSnap.size}`);
        
        let vocabCount = 0;
        vocabSnap.forEach(d => {
            const data = d.data();
            // print first 5, or cards with any interval
            if (vocabCount < 10 || data.srsInterval > 0 || data.intervalIndex_back > 0) {
                console.log(`Vocab: "${data.front}" | srsInterval: ${data.srsInterval} | intervalIndex_back: ${data.intervalIndex_back} | reps: ${data.srsReps} | state: ${data.srsState}`);
                vocabCount++;
            }
        });

        // 2. Kanji SRS
        const kanjiPath = `artifacts/${appIdStr}/users/${userId}/kanjiSRS`;
        console.log(`\nFetching kanjiSRS from: ${kanjiPath}`);
        const kanjiSnap = await getDocs(collection(db, kanjiPath));
        console.log(`Total Kanji SRS cards found: ${kanjiSnap.size}`);
        
        let kanjiCount = 0;
        kanjiSnap.forEach(d => {
            const data = d.data();
            if (kanjiCount < 10 || data.interval > 0 || data.reps > 0) {
                console.log(`Kanji ID: "${d.id}" | interval: ${data.interval} | reps: ${data.reps} | state: ${data.state}`);
                kanjiCount++;
            }
        });
    } catch (e) {
        console.error("Error inspecting user cards:", e);
    }
}

inspectUserCards();
