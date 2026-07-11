import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

// Setup file paths
const JOTOBA_DATA_PATH = join(process.cwd(), 'src/data/jotobaKanjiData.js');
const OUTPUT_DATA_PATH = join(process.cwd(), 'src/data/kanjiComponents.js');
const CACHE_PATH = join(process.cwd(), 'scripts/crawler_cache.json');

// Decryption logic for Mazii response payload
function decryptMazii(encryptedStr) {
    const parts = encryptedStr.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid format: missing ":" separator');
    }
    const iv = Buffer.from(parts[0], 'base64');
    const ciphertext = Buffer.from(parts[1], 'base64');

    const publicKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAk+47ErEUkqhTJY8YdQ7jkYLe1WXhSsAwl/uWudmHuRMiFodTmd3R7xrQh3dYYTIlMFFn//mINIm8LdCJ2lIS1M6aXUyVS4OI551IS8Musrd2E8cGQDofixcxll/dspL+li15jXD4ktgQaHESvbedA9ppBrMLoetBD2p+gCKXfD8Rnrf/uFNIxJyW4WJJTns4JrbcWojy1JfVP91cs+61ScIPJN1RzMiM8rqL8lBF+AgEjEsOkUTStn0ELKzlOAyl+h81xw1PIFHGLNhTs+GcuQMQyXJrPTQrQsqBlm0LvxUl79ZhzesAxeNWfGQA+V95pKMyaMCuj5QbprID73858wIDAQAB";
    const salt = Buffer.from('mazii-search-v3');
    
    // Derive key using PBKDF2 (first 32 bytes)
    const keyMaterial = crypto.pbkdf2Sync(
        publicKey,
        salt,
        10000,
        48,
        'sha256'
    );
    const key = keyMaterial.subarray(0, 32);

    // AES-256-CBC decrypt
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return JSON.parse(decrypted.toString('utf8'));
}

// Extract all kanji keys from the jotoba file
function getKanjiList() {
    if (!existsSync(JOTOBA_DATA_PATH)) {
        console.error(`Error: Jotoba data file not found at ${JOTOBA_DATA_PATH}`);
        process.exit(1);
    }
    const content = readFileSync(JOTOBA_DATA_PATH, 'utf-8');
    const kanjiList = [];
    const regex = /'([^']+)':\s*\{/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const kanji = match[1];
        if (kanji.length === 1 && !kanjiList.includes(kanji)) {
            kanjiList.push(kanji);
        }
    }
    return kanjiList;
}

// Sleep utility to limit rate
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    console.log('🚀 Loading Kanji characters from jotobaKanjiData.js...');
    const kanjiList = getKanjiList();
    console.log(`📝 Found ${kanjiList.length} Kanji characters in database.`);

    // Load or initialize cache
    let cache = {};
    if (existsSync(CACHE_PATH)) {
        cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
        console.log(`📦 Loaded cache. ${Object.keys(cache).length} kanji already crawled.`);
    }

    const remaining = kanjiList.filter(k => !cache[k]);
    console.log(`⏳ ${remaining.length} kanji left to crawl.`);

    if (remaining.length === 0) {
        console.log('✅ All kanji already crawled!');
    } else {
        let count = 0;
        for (const char of remaining) {
            count++;
            console.log(`[${count}/${remaining.length}] Crawling "${char}"...`);
            try {
                const response = await fetch('https://mazii.net/api/search/kanji/v3', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/plain, */*'
                    },
                    body: JSON.stringify({
                        dict: 'javi',
                        type: 'kanji',
                        query: char,
                        page: 1
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP Status ${response.status}`);
                }

                const data = await response.json();
                if (data.encryptedData) {
                    const decrypted = decryptMazii(data.encryptedData);
                    
                    if (decrypted.results && decrypted.results.length > 0) {
                        const result = decrypted.results.find(r => r.kanji === char) || decrypted.results[0];
                        const components = (result.compDetail || []).map(c => c.w).filter(Boolean);
                        const meaning = result.mean || '';
                        
                        cache[char] = {
                            components,
                            meaning
                        };
                        console.log(`   └─ Components: [${components.join(', ')}] | Meaning: ${meaning}`);
                    } else {
                        cache[char] = { components: [], meaning: '' };
                        console.log(`   └─ No results found.`);
                    }
                } else {
                    console.log(`   └─ Response has no encryptedData.`);
                }
            } catch (err) {
                console.error(`   ❌ Failed to crawl "${char}":`, err.message);
                // Wait a bit longer before retrying or moving to next
                await sleep(2000);
            }

            // Save cache progress every 5 characters
            if (count % 5 === 0) {
                writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
            }

            // Politely sleep to avoid getting blocked
            await sleep(600);
        }
        
        // Final save to cache file
        writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    }

    // Generate output JS file
    console.log('💾 Generating src/data/kanjiComponents.js output file...');
    let outputContent = `// Auto-generated Kanji Components from Mazii crawler
// Generated: ${new Date().toISOString()}
// Total entries: ${Object.keys(cache).length}

export const KANJI_COMPONENTS = {\n`;

    const sortedKeys = Object.keys(cache).sort();
    sortedKeys.forEach((char, index) => {
        const item = cache[char];
        const compsStr = JSON.stringify(item.components);
        const entryLine = `    '${char}': { components: ${compsStr}, meaning: '${item.meaning.replace(/'/g, "\\'")}' }`;
        const sep = index < sortedKeys.length - 1 ? ',' : '';
        outputContent += entryLine + sep + '\n';
    });

    outputContent += `};\n`;
    writeFileSync(OUTPUT_DATA_PATH, outputContent, 'utf-8');
    console.log(`🎉 Finished successfully! Written file to: ${OUTPUT_DATA_PATH}`);
}

main().catch(err => {
    console.error('Fatal Error:', err);
});
