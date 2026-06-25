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
        console.log("Fetching users from Firestore...");
        const path = "artifacts/1:28989364918:web:a2a99ad33fc0c23fca6417/public/data/userStats";
        const snapshot = await getDocs(collection(db, path));
        
        const users = [];
        snapshot.forEach(doc => {
            users.push({
                uid: doc.id,
                ...doc.data()
            });
        });
        
        users.sort((a, b) => (b.level || 0) - (a.level || 0));
        
        let output = `Found ${users.length} user profiles in database:\n`;
        users.forEach((u, i) => {
            output += `${i+1}. UID: ${u.uid} | Name: ${u.displayName} | Level: ${u.level} | XP: ${u.xp} | League: ${u.league}\n`;
        });
        
        fs.writeFileSync('scratch/users_list.txt', output, 'utf8');
        console.log("Written users list to scratch/users_list.txt");
    } catch (e) {
        console.error("Error listing users:", e);
    }
}

listUsers();
