import { spawnSync } from 'child_process';
import fs from 'fs';

// Read config from .env
const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}

const password = process.argv[2];
const limitArg = process.argv[3] || '5';
const delaySeconds = parseInt(process.argv[4] || '10', 10);

if (!password) {
    console.error('Usage: node scripts/loopGenerateVocabs.mjs <admin-password> [limit-per-run] [delay-seconds]');
    console.error('  Password for admin email:', getEnv('VITE_ADMIN_EMAIL'));
    process.exit(1);
}

console.log(`🚀 Starting infinite loop runner for vocabulary generation...`);
console.log(`Admin email: ${getEnv('VITE_ADMIN_EMAIL')}`);
console.log(`Limit per iteration: ${limitArg}`);
console.log(`Delay between iterations: ${delaySeconds} seconds\n`);

let iteration = 1;

async function runLoop() {
    while (true) {
        console.log(`=========================================`);
        console.log(`🔄 ITERATION #${iteration} starting at: ${new Date().toLocaleString()}`);
        console.log(`=========================================`);

        const result = spawnSync('node', [
            'scripts/generateVocabsForMissingKanji.mjs',
            password,
            limitArg
        ], { stdio: 'inherit' });

        if (result.error) {
            console.error('❌ Error executing script:', result.error.message);
        } else {
            console.log(`\n✅ Iteration #${iteration} finished with exit code ${result.status}`);
        }

        iteration++;

        console.log(`\n😴 Sleeping for ${delaySeconds} seconds...\n`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
}

runLoop().catch(e => {
    console.error('Fatal loop runner error:', e);
    process.exit(1);
});
