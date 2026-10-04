import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DATA_DIR = path.resolve(__dirname, '../public/data');
const JLPT_DIR = path.join(PUBLIC_DATA_DIR, 'jlpt');
if (!fs.existsSync(JLPT_DIR)) fs.mkdirSync(JLPT_DIR, { recursive: true });

const masterFilePath = path.join(PUBLIC_DATA_DIR, 'jlpt_data.json');
console.log('Loading master jlpt_data.json...');
const allTests = JSON.parse(fs.readFileSync(masterFilePath, 'utf-8'));
console.log(`Loaded ${allTests.length} tests.`);

// Separate base (original 591) and level-specific tests
const baseTests = [];
const levelBuckets = {
    n1: [],
    n2: [],
    n3: [],
    n4: [],
    n5: []
};

allTests.forEach(test => {
    const isNew = test.id && test.id.startsWith('quizki-jlpt-');
    const lvl = (test.level || 'N3').toLowerCase();

    if (!isNew) {
        // Original core roadmap tests stay in base jlpt_data.json
        baseTests.push(test);
    } else {
        if (levelBuckets[lvl]) {
            levelBuckets[lvl].push(test);
        } else {
            levelBuckets.n3.push(test);
        }
    }
});

console.log(`Base Tests: ${baseTests.length}`);
Object.entries(levelBuckets).forEach(([lvl, list]) => {
    console.log(`- Level ${lvl.toUpperCase()}: ${list.length} tests`);
});

// Write base tests to public/data/jlpt_data.json
fs.writeFileSync(masterFilePath, JSON.stringify(baseTests), 'utf-8');
console.log(`✅ Written base jlpt_data.json: ${(fs.statSync(masterFilePath).size / (1024 * 1024)).toFixed(2)} MB`);

// Write each level to public/data/jlpt/{level}.json
Object.entries(levelBuckets).forEach(([lvl, list]) => {
    const filePath = path.join(JLPT_DIR, `${lvl}.json`);
    fs.writeFileSync(filePath, JSON.stringify(list), 'utf-8');
    console.log(`✅ Written ${filePath}: ${list.length} tests (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB)`);
});

console.log('\n🎉 JLPT Level splitting completed successfully!');
