import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

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

async function listUsers() {
    try {
        console.log("Fetching all users from userStats...");
        const path = "artifacts/1:28989364918:web:a2a99ad33fc0c23fca6417/public/data/userStats";
        const snapshot = await getDocs(collection(db, path));
        
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.league === 'Đồng' && (data.score === undefined || data.score === 0 || data.level === 1)) {
                users.push({
                    uid: doc.id,
                    ...data
                });
            }
        });
        
        console.log(`Found ${users.length} users in 'Đồng' with score 0/undefined or level 1:`);
        users.forEach((u, i) => {
            const dateStr = u.lastUpdated?.toDate ? u.lastUpdated.toDate().toISOString() : (u.lastUpdated?.seconds ? new Date(u.lastUpdated.seconds * 1000).toISOString() : 'N/A');
            console.log(`${i+1}. Name: ${u.displayName} | UID: ${u.uid} | Level: ${u.level} | Score: ${u.score} | LastUpdated: ${dateStr}`);
        });
    } catch (e) {
        console.error("Error listing users:", e);
    }
}

listUsers();
