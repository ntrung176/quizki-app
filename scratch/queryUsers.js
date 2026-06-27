import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
const appIdStr = "1:28989364918:web:a2a99ad33fc0c23fca6417";

async function queryStats() {
    try {
        const path = `artifacts/${appIdStr}/public/data/userStats`;
        console.log(`Fetching from: ${path}`);
        const snap = await getDocs(collection(db, path));
        snap.forEach(d => {
            const data = d.data();
            console.log(`User: ${data.displayName} (${d.id}) | Score: ${data.score} | League: ${data.league} | Vocab: ${data.totalCards} | Kanji: ${data.kanjiTotal}`);
            console.log(` - Details: addedLast7Days=${data.addedLast7Days}, reviewsLast7Days=${data.reviewsLast7Days}, activeDaysLast7Days=${data.activeDaysLast7Days}, streak=${data.streak}`);
        });
    } catch (e) {
        console.error("Error query stats:", e);
    }
}

queryStats();
