/**
 * Migrate users stuck in Bronze ('Đồng') back to Iron ('Sắt')
 * if they are level 1 or have a score/XP of 0 (haven't learned anything yet).
 * 
 * Usage: node scripts/migrateBronzeUsers.mjs <admin-password>
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
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
    console.error('Usage: node scripts/migrateBronzeUsers.mjs <admin-password>');
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

console.log('Firebase Project:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
    // Authenticate as admin
    const adminEmail = getEnv('VITE_ADMIN_EMAIL');
    console.log('Signing in as:', adminEmail);

    try {
        await signInWithEmailAndPassword(auth, adminEmail, password);
        console.log('✅ Authenticated successfully');
    } catch (e) {
        console.error('❌ Authentication failed:', e.message);
        process.exit(1);
    }

    const appId = firebaseConfig.appId;
    const publicStatsPath = `artifacts/${appId}/public/data/userStats`;
    
    console.log('Fetching all users from publicStats...');
    const snapshot = await getDocs(collection(db, publicStatsPath));
    
    const usersToFix = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.league === 'Đồng' && (data.level === 1 || !data.level || data.score === 0 || !data.score)) {
            usersToFix.push({
                uid: docSnap.id,
                displayName: data.displayName,
                level: data.level || 1,
                score: data.score || 0
            });
        }
    });

    console.log(`Found ${usersToFix.length} users stuck in 'Đồng' who should be in 'Sắt':`);
    usersToFix.forEach((u, i) => {
        console.log(`  ${i+1}. Name: ${u.displayName} | UID: ${u.uid} | Level: ${u.level} | Score: ${u.score}`);
    });

    if (usersToFix.length === 0) {
        console.log('No users need migration.');
        process.exit(0);
    }

    console.log('\nStarting migration...');
    let successCount = 0;
    
    for (const u of usersToFix) {
        try {
            // 1. Update settings/profile
            const profileRef = doc(db, `artifacts/${appId}/users/${u.uid}/settings/profile`);
            await updateDoc(profileRef, { league: 'Sắt' });

            // 2. Update userStats
            const statsRef = doc(db, publicStatsPath, u.uid);
            await updateDoc(statsRef, { league: 'Sắt' });

            console.log(`✅ Successfully migrated user: ${u.displayName} (${u.uid})`);
            successCount++;
        } catch (err) {
            console.error(`❌ Failed to migrate user ${u.displayName} (${u.uid}):`, err.message);
        }
    }

    console.log(`\nMigration completed. ${successCount}/${usersToFix.length} users updated successfully.`);
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
