import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const baseDir = 'd:\\CODE GAME\\quizki-app-main\\scratch\\extracted';
const outDir = 'd:\\CODE GAME\\quizki-app-main\\public\\dictionary';
const vnRegex = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

console.log('=== Step 1: Loading JLPT tags ===');
const jlptMap = new Map();
const jlptFiles = fs.readdirSync(path.join(baseDir, 'jlpt')).filter(f => f.startsWith('term_meta_bank_'));
for (const f of jlptFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(baseDir, 'jlpt', f), 'utf8'));
    for (const item of data) {
        const term = item[0];
        const val = item[2]?.frequency?.displayValue || (item[2]?.frequency?.value ? `N${item[2].frequency.value}` : null);
        if (val) {
            const reading = item[2]?.reading || '';
            if (reading) jlptMap.set(`${term}|${reading}`, val);
            if (!jlptMap.has(term)) jlptMap.set(term, val);
        }
    }
}
console.log(`Loaded ${jlptMap.size} JLPT entries.`);

console.log('\n=== Step 2: Loading Pitch Accents ===');
const pitchMap = new Map();
const pitchFiles = fs.readdirSync(path.join(baseDir, 'pitch')).filter(f => f.startsWith('term_meta_bank_'));
for (const f of pitchFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(baseDir, 'pitch', f), 'utf8'));
    for (const item of data) {
        const term = item[0];
        const reading = item[2]?.reading || '';
        const pitches = item[2]?.pitches?.map(p => p.position) || [];
        if (pitches.length > 0) {
            if (reading) pitchMap.set(`${term}|${reading}`, pitches);
            if (!pitchMap.has(term)) pitchMap.set(term, pitches);
        }
    }
}
console.log(`Loaded ${pitchMap.size} Pitch entries.`);

console.log('\n=== Step 3: Loading JPDB Frequency ===');
const jpdbMap = new Map();
const jpdbData = JSON.parse(fs.readFileSync(path.join(baseDir, 'jpdb', 'term_meta_bank_1.json'), 'utf8'));
for (const item of jpdbData) {
    const term = item[0];
    const reading = item[2]?.reading || '';
    const rank = item[2]?.frequency?.value;
    if (rank) {
        if (reading) jpdbMap.set(`${term}|${reading}`, rank);
        if (!jpdbMap.has(term)) jpdbMap.set(term, rank);
    }
}
console.log(`Loaded ${jpdbMap.size} JPDB frequency entries.`);

console.log('\n=== Step 4: Loading Jitendex Examples & Antonyms ===');
function extractText(node, ignoreRubyRt = false) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(n => extractText(n, ignoreRubyRt)).join('');
    if (typeof node === 'object') {
        if (ignoreRubyRt && node.tag === 'rt') return '';
        if (node.content) return extractText(node.content, ignoreRubyRt);
    }
    return '';
}

function extractRubyReading(node) {
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractRubyReading).join('');
    if (typeof node === 'object') {
        if (node.tag === 'rt') return extractText(node);
        if (node.content) return extractRubyReading(node.content);
    }
    return '';
}

const jitendexMap = new Map();
const jitendexDir = path.join(baseDir, 'jitendex');
const translationCacheFile = path.join(process.cwd(), 'scratch', 'sentence_translations_en_vi.json');
let viTranslations = {};
if (fs.existsSync(translationCacheFile)) {
    try {
        viTranslations = JSON.parse(fs.readFileSync(translationCacheFile, 'utf8'));
        console.log(`Loaded ${Object.keys(viTranslations).length} translated Vietnamese sentences from cache.`);
    } catch (e) {
        console.warn('Could not load sentence translations cache:', e.message);
    }
}

const antonymCacheFile = path.join(process.cwd(), 'scratch', 'antonym_translations_en_vi.json');
let antTranslations = {};
if (fs.existsSync(antonymCacheFile)) {
    try {
        antTranslations = JSON.parse(fs.readFileSync(antonymCacheFile, 'utf8'));
        console.log(`Loaded ${Object.keys(antTranslations).length} translated Vietnamese antonyms from cache.`);
    } catch (e) {
        console.warn('Could not load antonym translations cache:', e.message);
    }
}

if (fs.existsSync(jitendexDir)) {
    const jitendexFiles = fs.readdirSync(jitendexDir).filter(f => f.startsWith('term_bank_'));
    console.log(`  Parsing ${jitendexFiles.length} Jitendex files...`);

    for (const f of jitendexFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(jitendexDir, f), 'utf8'));
        for (const item of data) {
            const term = item[0];
            const reading = item[1] || '';
            const contentArray = item[5];
            if (!Array.isArray(contentArray)) continue;

            let ex = null;
            let ant = null;

            function walk(node) {
                if (!node || typeof node !== 'object') return;

                if (node.data?.content === 'example-sentence') {
                    if (Array.isArray(node.content)) {
                        let ja = '';
                        let en = '';
                        for (const sub of node.content) {
                            if (sub.data?.content === 'example-sentence-a') {
                                ja = extractText(sub, true).trim();
                            } else if (sub.data?.content === 'example-sentence-b') {
                                en = extractText(sub).trim();
                            }
                        }
                        if (ja) {
                            const vi = (en && viTranslations[en]) ? viTranslations[en] : '';
                            ex = { ja, en, ...(vi ? { vi } : {}) };
                        }
                    }
                }

                if (node.data?.content === 'antonym') {
                    if (Array.isArray(node.content)) {
                        let w = '';
                        let r = '';
                        let m = '';
                        for (const sub of node.content) {
                            if (sub.data?.content === 'antonym-content') {
                                w = extractText(sub, true).replace(/^Antonym\s*/i, '').trim();
                                r = extractRubyReading(sub).trim();
                            } else if (sub.data?.content === 'antonym-glossary') {
                                m = extractText(sub).trim();
                            }
                        }
                        if (w) {
                            const viM = (m && antTranslations[m]) ? antTranslations[m] : m;
                            ant = { w, r, m: viM };
                        }
                    }
                }

                if (Array.isArray(node.content)) {
                    for (const child of node.content) walk(child);
                } else if (node.content && typeof node.content === 'object') {
                    walk(node.content);
                }
            }

            for (const c of contentArray) walk(c);

            if (ex || ant) {
                const keyWithReading = `${term}|${reading}`;
                const val = { ...(ex ? { ex } : {}), ...(ant ? { ant } : {}) };
                if (reading) jitendexMap.set(keyWithReading, val);
                if (!jitendexMap.has(term)) jitendexMap.set(term, val);
            }
        }
    }
    console.log(`Loaded ${jitendexMap.size} Jitendex example/antonym entries.`);
}

console.log('\n=== Step 5: Compiling all Mazii entries ===');
const maziiFiles = fs.readdirSync(path.join(baseDir, 'mazii'))
    .filter(f => f.startsWith('term_bank_'))
    .sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ''), 10);
        const nb = parseInt(b.replace(/\D/g, ''), 10);
        return na - nb;
    });

const allEntries = [];
let idCounter = 1;

const glossCacheFile = path.join(process.cwd(), 'scratch', 'gloss_translations_en_vi.json');
let glossTranslations = {};
if (fs.existsSync(glossCacheFile)) {
    try {
        glossTranslations = JSON.parse(fs.readFileSync(glossCacheFile, 'utf8'));
        console.log(`Loaded ${Object.keys(glossTranslations).length} translated Vietnamese glosses from cache.`);
    } catch (e) {
        console.warn('Could not load gloss translations cache:', e.message);
    }
}

for (const f of maziiFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(baseDir, 'mazii', f), 'utf8'));
    for (const item of data) {
        const term = item[0];
        const reading = item[1] || '';
        const pos = item[2] ? item[2].trim().split(/\s+/) : [];
        const rawGloss = item[5]?.[0] || '';
        
        let sino = '';
        let meanings = [];
        const lines = rawGloss.split('\n').map(l => l.trim()).filter(Boolean);
        
        if (lines.length > 0) {
            const isSino = /^[A-ZÀ-Ỹ\s]+$/.test(lines[0]) && !/^\d+\./.test(lines[0]);
            if (isSino) {
                sino = lines[0];
                meanings = lines.slice(1).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
            } else {
                meanings = lines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
            }
        }
        
        // Translate English meanings to Vietnamese if cached
        const hasAnyVietnamese = meanings.some(m => vnRegex.test(m));
        if (!hasAnyVietnamese && meanings.length > 0) {
            meanings = meanings.map(m => glossTranslations[m] || m);
        }
        
        const keyWithReading = `${term}|${reading}`;
        const jlpt = jlptMap.get(keyWithReading) || jlptMap.get(term) || null;
        const pitch = pitchMap.get(keyWithReading) || pitchMap.get(term) || null;
        const freq = jpdbMap.get(keyWithReading) || jpdbMap.get(term) || null;
        const jitData = jitendexMap.get(keyWithReading) || jitendexMap.get(term) || null;
        
        allEntries.push({
            id: idCounter++,
            w: term,
            r: reading,
            hv: sino,
            m: meanings,
            p: pos,
            ...(jlpt ? { j: jlpt } : {}),
            ...(pitch ? { pi: pitch } : {}),
            ...(freq ? { f: freq } : {}),
            ...(jitData?.ex ? { ex: jitData.ex } : {}),
            ...(jitData?.ant ? { ant: jitData.ant } : {})
        });
    }
}

console.log(`Total compiled entries: ${allEntries.length}`);

// Split into 8 chunk files for smooth downloading
const CHUNKS = 8;
const chunkSize = Math.ceil(allEntries.length / CHUNKS);
console.log(`Splitting into ${CHUNKS} chunks of ~${chunkSize} entries...`);

const manifest = {
    totalEntries: allEntries.length,
    chunks: CHUNKS,
    version: '1.3.1',
    hasExamples: true,
    hasVietnameseExamples: true,
    hasVietnameseGlosses: true,
    hasVietnameseAntonyms: true,
    updatedAt: new Date().toISOString()
};

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

for (let i = 0; i < CHUNKS; i++) {
    const chunkData = allEntries.slice(i * chunkSize, (i + 1) * chunkSize);
    const fileName = `chunk_${i + 1}.json`;
    const jsonStr = JSON.stringify(chunkData);
    fs.writeFileSync(path.join(outDir, fileName), jsonStr);
    
    const gz = zlib.gzipSync(jsonStr);
    fs.writeFileSync(path.join(outDir, `${fileName}.gz`), gz);
    
    console.log(`  Chunk ${i + 1}: ${chunkData.length} entries | ${(jsonStr.length / (1024 * 1024)).toFixed(2)} MB raw | ${(gz.length / (1024 * 1024)).toFixed(2)} MB gzipped`);
}

console.log('\n=== Compilation with Examples Complete! ===');
