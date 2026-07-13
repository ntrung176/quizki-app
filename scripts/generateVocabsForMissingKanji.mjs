/**
 * Generate Vocabulary Cards for Kanji Lacking Vocab
 * 
 * Usage: node scripts/generateVocabsForMissingKanji.mjs <admin-password> [limit]
 * 
 * - Finds Kanjis in the Firebase database that do not have any vocabulary
 * - Fetches candidates from kanjiapi.dev API
 * - Uses OpenRouter Gemini to translate, generate Hán Việt, Pitch Accent, and Examples
 * - Saves them directly to Firestore 'kanjiVocab' collection
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

// Read Firebase config from .env
const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}

const password = process.argv[2];
const limitArg = process.argv[3];
const limit = limitArg ? parseInt(limitArg, 10) : 10;

if (!password) {
    console.error('Usage: node scripts/generateVocabsForMissingKanji.mjs <admin-password> [limit]');
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// OpenRouter Settings
const openRouterKey = getEnv('VITE_OPENROUTER_API_KEY') || getEnv('VITE_OPENROUTER_API_KEY_1');
const openRouterModel = 'google/gemini-2.5-flash';

if (!openRouterKey) {
    console.error('❌ Error: VITE_OPENROUTER_API_KEY not found in .env file.');
    process.exit(1);
}

// Call OpenRouter
async function callOpenRouter(prompt) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'X-Title': 'Quizki Script Auto Vocab'
        },
        body: JSON.stringify({
            model: openRouterModel,
            messages: [
                { role: 'system', content: 'You are a Japanese-Vietnamese dictionary assistant. Always respond with valid JSON only, no markdown, no explanation.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content || '';

    // Clean markdown
    text = text.trim();
    if (text.startsWith('```json')) text = text.slice(7);
    if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    text = text.trim();

    return JSON.parse(text);
}

const kanjiCachePath = 'scripts/.cache_kanji.json';
const vocabCachePath = 'scripts/.cache_vocab.json';

async function getCachedData(cachePath, fetchFn, maxAgeMs = 1800000) { // 30 minutes
    try {
        if (fs.existsSync(cachePath)) {
            const stats = fs.statSync(cachePath);
            const age = Date.now() - stats.mtimeMs;
            if (age < maxAgeMs) {
                console.log(`  [Cache] Loaded from local cache: ${cachePath} (Age: ${Math.round(age / 1000)}s)`);
                return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            }
        }
    } catch (e) {
        console.warn(`  ⚠️ Failed to read cache at ${cachePath}:`, e.message);
    }
    
    console.log(`  [Firestore] Fetching fresh data from network...`);
    const data = await fetchFn();
    
    try {
        fs.writeFileSync(cachePath, JSON.stringify(data), 'utf8');
        console.log(`  [Cache] Saved fresh data to: ${cachePath}`);
    } catch (e) {
        console.warn(`  ⚠️ Failed to write cache to ${cachePath}:`, e.message);
    }
    return data;
}

async function main() {
    // Authenticate as admin
    const adminEmail = getEnv('VITE_ADMIN_EMAIL');
    console.log(`Signing in as: ${adminEmail}...`);

    try {
        await signInWithEmailAndPassword(auth, adminEmail, password);
        console.log('✅ Authenticated successfully.');
    } catch (e) {
        console.error('❌ Authentication failed:', e.message);
        process.exit(1);
    }

    // Load Kanjis
    console.log('Loading Kanjis...');
    const kanjiList = await getCachedData(kanjiCachePath, async () => {
        const snap = await getDocs(collection(db, 'kanji'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    console.log(`Loaded ${kanjiList.length} Kanji characters.`);

    // Load Vocabularies
    console.log('Loading Vocabularies...');
    const vocabList = await getCachedData(vocabCachePath, async () => {
        const snap = await getDocs(collection(db, 'kanjiVocab'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    console.log(`Loaded ${vocabList.length} vocabulary words.`);

    // Helper function to convert Katakana to Hiragana
    function katakanaToHiragana(str) {
        if (!str) return '';
        return str.replace(/[\u30a1-\u30f6]/g, function (match) {
            const chr = match.charCodeAt(0) - 0x60;
            return String.fromCharCode(chr);
        });
    }

    // Helper to parse readings from onyomi/kunyomi fields
    function parseReadings(fieldValue) {
        if (!fieldValue) return [];
        if (Array.isArray(fieldValue)) {
            return fieldValue.flatMap(x => parseReadings(x));
        }
        if (typeof fieldValue === 'string') {
            return fieldValue.split(/[、,.\/]/).map(x => {
                const part = x.split('-')[0].split('.')[0].trim();
                return part;
            }).filter(Boolean);
        }
        return [];
    }

    // Helper to get raw Kunyomi readings containing okurigana dots
    function getRawKunyomi(kanjiObj) {
        if (!kanjiObj.kunyomi) return [];
        let kunyomiField = kanjiObj.kunyomi;
        if (Array.isArray(kunyomiField)) {
            kunyomiField = kunyomiField.join('、');
        }
        return kunyomiField.split(/[、,;\/]/).map(x => x.trim()).filter(Boolean);
    }

    // Helper to match a word and its pronunciation against a specific Kunyomi reading (e.g. "い.きる")
    function matchKunReading(wordStr, pronounced, kanjiChar, rawKun) {
        const cleanWord = normalizeWord(wordStr);
        const cleanPron = katakanaToHiragana(pronounced);
        const cleanRaw = katakanaToHiragana(rawKun);
        
        if (!cleanWord.includes(kanjiChar)) return false;
        
        if (cleanRaw.includes('.')) {
            const [kanjiPart, okurigana] = cleanRaw.split('.');
            const kanjiIdx = cleanWord.indexOf(kanjiChar);
            if (kanjiIdx === -1) return false;
            
            const suffixWord = cleanWord.slice(kanjiIdx + 1);
            if (suffixWord.startsWith(okurigana)) {
                const expectedSegment = kanjiPart + okurigana;
                if (cleanPron.includes(expectedSegment)) {
                    return true;
                }
            }
            return false;
        } else {
            if (cleanWord === kanjiChar) {
                return cleanPron === cleanRaw;
            }
            if (cleanWord.startsWith(kanjiChar)) {
                return cleanPron.startsWith(cleanRaw);
            }
            if (cleanWord.endsWith(kanjiChar)) {
                return cleanPron.endsWith(cleanRaw);
            }
            return cleanPron.includes(cleanRaw);
        }
    }

    const normalizeWord = (w) => {
        if (!w) return '';
        return w.replace(/（/g, '(').split('(')[0].trim();
    };

    const existingWordsNormalized = new Set(
        vocabList.map(v => normalizeWord(v.word))
    );

    // Identify Kanji that have missing Kunyomi readings
    const lackingKanji = [];
    for (const k of kanjiList) {
        const char = k.character;
        const rawKunList = getRawKunyomi(k);
        if (rawKunList.length === 0) continue;
        
        const existingVocabsForKanji = vocabList.filter(v => 
            !v.category?.startsWith('📚') && 
            normalizeWord(v.word).includes(char)
        );
        
        const missingKun = [];
        for (const rawKun of rawKunList) {
            const isCovered = existingVocabsForKanji.some(v => 
                matchKunReading(v.word, v.reading, char, rawKun)
            );
            if (!isCovered) {
                missingKun.push(rawKun);
            }
        }
        
        if (missingKun.length > 0) {
            lackingKanji.push({
                kanjiObj: k,
                missingKunReadings: missingKun
            });
        }
    }

    // Prioritize Kanji by level (N5 -> N1)
    const levelOrder = { 'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5 };
    lackingKanji.sort((a, b) => {
        const lvlA = levelOrder[a.kanjiObj.level] || 99;
        const lvlB = levelOrder[b.kanjiObj.level] || 99;
        return lvlA - lvlB;
    });

    console.log(`Found ${lackingKanji.length} Kanji characters with missing Kunyomi readings.`);

    if (lackingKanji.length === 0) {
        console.log(`🎉 All Kanji characters in the database already have all their Kunyomi readings covered!`);
        process.exit(0);
    }

    const processList = lackingKanji.slice(0, limit);
    console.log(`Starting processing for the first ${processList.length} characters (Limit: ${limit})...\n`);

    for (let i = 0; i < processList.length; i++) {
        const item = processList[i];
        const kanjiObj = item.kanjiObj;
        const char = kanjiObj.character;
        const missingKuns = item.missingKunReadings;

        console.log(`[${i + 1}/${processList.length}] Processing Kanji: ${char} (${kanjiObj.sinoViet || 'Không rõ Hán Việt'} - N${kanjiObj.level || '?'})`);
        console.log(`  Missing Kunyomi readings: ${missingKuns.join(', ')}`);

        // Fetch dictionary words from kanjiapi.dev
        let kanjiApiWords = [];
        try {
            const res = await fetch(`https://kanjiapi.dev/v1/words/${encodeURIComponent(char)}`);
            if (res.ok) {
                kanjiApiWords = await res.json();
            } else {
                console.log(`  ⚠️ Failed to fetch words from kanjiapi.dev (Status: ${res.status}). Will fall back to direct AI generation.`);
            }
        } catch (e) {
            console.log(`  ⚠️ Error fetching from kanjiapi.dev: ${e.message}. Will fall back to direct AI generation.`);
        }

        for (const rawKun of missingKuns) {
            console.log(`  -> Targeting Kunyomi reading: "${rawKun}"`);

            // Filter candidates from dictionary matching this specific reading
            const candidates = kanjiApiWords.filter(w => {
                const wordStr = w.variants[0].written;
                const pronounced = w.variants[0].pronounced;
                if (wordStr.length < 1 || wordStr.length > 4) return false;
                if (/[a-zA-Z]/.test(wordStr)) return false;
                if (/[\u30a0-\u30ff]/.test(pronounced)) return false;
                if (existingWordsNormalized.has(normalizeWord(wordStr))) return false;
                return matchKunReading(wordStr, pronounced, char, rawKun);
            });

            // Prioritize candidates with priorities in dictionary
            candidates.sort((a, b) => {
                const aWord = a.variants[0].written;
                const bWord = b.variants[0].written;
                const aHasPriority = a.variants.some(v => v.priorities && v.priorities.length > 0);
                const bHasPriority = b.variants.some(v => v.priorities && v.priorities.length > 0);
                
                if (aHasPriority && !bHasPriority) return -1;
                if (!aHasPriority && bHasPriority) return 1;
                return aWord.length - bWord.length;
            });

            const bestCandidate = candidates[0] || null;
            let prompt = '';

            if (bestCandidate) {
                const candidateWord = bestCandidate.variants[0].written;
                const pronounced = bestCandidate.variants[0].pronounced;
                const engMeaning = bestCandidate.meanings[0].glosses.slice(0, 2).join(', ');

                console.log(`     Candidate found in dictionary: "${candidateWord}" (${pronounced}) - "${engMeaning}"`);
                prompt = `Bạn là một chuyên gia từ điển Nhật-Việt. Hãy tạo một từ vựng tiếng Nhật cho từ gốc "${candidateWord}" (đọc là "${pronounced}", nghĩa tiếng Anh: "${engMeaning}").
Chữ Hán chính là "${char}", và âm Kunyomi mục tiêu là "${rawKun}".

Lưu ý:
1. Bạn PHẢI sử dụng chính xác từ gốc "${candidateWord}".
2. Bạn BẮT BUỘC phải dịch nghĩa chuẩn, tự nhiên sang tiếng Việt.
3. pos (từ loại) phải là một trong các chuỗi sau: "noun", "verb", "suru_verb", "adj-i", "adj-na", "noun/adj-na", "adverb", "conjunction", "particle", "grammar", "phrase", "other". Ưu tiên phân loại chính xác động từ (verb/suru_verb) hoặc tính từ (adj-i/adj-na) nếu từ gốc là động từ/tính từ.
4. example: CHỈ 1 CÂU. Thay từ gốc bằng ＿＿＿＿. Viết câu ví dụ tự nhiên bằng tiếng Nhật. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.
5. exampleMeaning: Dịch nghĩa tiếng Việt của câu ví dụ.
6. sinoVietnamese: Dịch ĐẦY ĐỦ các chữ Kanji trong từ gốc sang âm Hán Việt viết IN HOA, ngăn cách bằng dấu cách.
7. nuance: Chi tiết bối cảnh sử dụng.
8. level: Cấp độ JLPT (N5 đến N1).
9. reading: Cách đọc chỉ bằng chữ Hiragana/Katakana của từ gốc.
10. accent: Số biểu thị cao độ từ vựng (Pitch Accent), ví dụ: '0', '1', '2', '3'. Nếu không rõ, điền "0".
11. frontWithFurigana: Định dạng "Từ gốc（cách đọc hiragana của CẢ TỪ）". Ví dụ: "生きる（いきる）". Ngoặc cách đọc phải ở CUỐI CÙNG sau từ gốc.

Trả về duy nhất định dạng JSON sau (không giải thích, không markdown):
{
  "frontWithFurigana": "...",
  "meaning": "...",
  "pos": "...",
  "level": "...",
  "sinoVietnamese": "...",
  "synonym": "...",
  "synonymSinoVietnamese": "...",
  "example": "...",
  "exampleMeaning": "...",
  "nuance": "...",
  "reading": "...",
  "accent": "..."
}`;
            } else {
                console.log(`     No candidate found. Asking AI to generate a standard common word for Kunyomi: "${rawKun}"...`);
                prompt = `Bạn là một chuyên gia từ điển Nhật-Việt. Hãy tìm và tạo một từ vựng tiếng Nhật thông dụng nhất (ƯU TIÊN ĐỘNG TỪ, TÍNH TỪ nếu thích hợp) chứa chữ Hán "${char}" và được đọc bằng âm Kunyomi là "${rawKun}".

Ví dụ: Nếu chữ Hán là "生" và âm Kunyomi mục tiêu là "う.まれる", bạn nên tạo từ "生まれる" (đọc là "うまれる", từ loại là "verb").

Lưu ý:
1. Từ vựng được chọn phải là từ chuẩn, thông dụng trong đời sống hoặc kỳ thi JLPT.
2. Bạn BẮT BUỘC phải dịch nghĩa chuẩn, tự nhiên sang tiếng Việt.
3. pos (từ loại) phải là một trong các chuỗi sau: "noun", "verb", "suru_verb", "adj-i", "adj-na", "noun/adj-na", "adverb", "conjunction", "particle", "grammar", "phrase", "other". Ưu tiên phân loại chính xác động từ (verb) hoặc tính từ (adj-i/adj-na) nếu thích hợp.
4. example: CHỈ 1 CÂU. Thay từ vựng bằng ＿＿＿＿. Viết câu ví dụ tự nhiên bằng tiếng Nhật. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.
5. exampleMeaning: Dịch nghĩa tiếng Việt của câu ví dụ.
6. sinoVietnamese: Dịch ĐẦY ĐỦ các chữ Kanji trong từ vựng sang âm Hán Việt viết IN HOA, ngăn cách bằng dấu cách.
7. nuance: Chi tiết bối cảnh sử dụng.
8. level: Cấp độ JLPT (N5 đến N1).
9. reading: Cách đọc chỉ bằng chữ Hiragana/Katakana của từ vựng.
10. accent: Số biểu thị cao độ từ vựng (Pitch Accent), ví dụ: '0', '1', '2', '3'. Nếu không rõ, điền "0".
11. frontWithFurigana: Định dạng "Từ vựng（cách đọc hiragana của CẢ TỪ）". Ngoặc cách đọc phải ở CUỐI CÙNG sau từ vựng.

Trả về duy nhất định dạng JSON sau (không giải thích, không markdown):
{
  "frontWithFurigana": "...",
  "meaning": "...",
  "pos": "...",
  "level": "...",
  "sinoVietnamese": "...",
  "synonym": "...",
  "synonymSinoVietnamese": "...",
  "example": "...",
  "exampleMeaning": "...",
  "nuance": "...",
  "reading": "...",
  "accent": "..."
}`;
            }

            try {
                const aiData = await callOpenRouter(prompt);
                const generatedWordClean = normalizeWord(aiData.frontWithFurigana);

                if (existingWordsNormalized.has(generatedWordClean)) {
                    console.log(`     ⚠️ Generated word "${generatedWordClean}" already exists in DB. Skipping to prevent duplicate.`);
                    continue;
                }

                const vocabData = {
                    word: aiData.frontWithFurigana || `${generatedWordClean}（${aiData.reading}）`,
                    reading: aiData.reading || '',
                    meaning: aiData.meaning || '',
                    level: aiData.level || kanjiObj.level || 'N2',
                    source: 'Tự động (Kunyomi)',
                    sinoViet: aiData.sinoVietnamese || '',
                    synonymSinoVietnamese: aiData.synonymSinoVietnamese || '',
                    accent: aiData.accent !== undefined ? String(aiData.accent) : '0',
                    pos: aiData.pos || 'noun',
                    synonym: aiData.synonym || '',
                    example: aiData.example || '',
                    exampleMeaning: aiData.exampleMeaning || '',
                    nuance: aiData.nuance || '',
                    category: '',
                    kanjiList: (aiData.frontWithFurigana || generatedWordClean).match(/[\u4e00-\u9faf]/g) || [char],
                    updatedAt: Date.now()
                };

                // Save to Firestore
                const docRef = await addDoc(collection(db, 'kanjiVocab'), vocabData);
                console.log(`     ✅ Successfully saved to Firestore! Doc ID: ${docRef.id}`);
                console.log(`     Word: ${vocabData.word} | Hán Việt: ${vocabData.sinoViet} | Nghĩa: ${vocabData.meaning}\n`);

                // Prevent duplicates in same session
                existingWordsNormalized.add(generatedWordClean);

                // Update local cached vocabList & save file
                vocabList.push({ id: docRef.id, ...vocabData });
                try {
                    fs.writeFileSync(vocabCachePath, JSON.stringify(vocabList), 'utf8');
                } catch (e) {
                    console.warn(`  ⚠️ Failed to update cache:`, e.message);
                }

                // Slight pause to be polite to APIs
                await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.error(`     ❌ Error generating/saving word for ${char} (${rawKun}):`, err.message);
            }
        }
    }


    console.log('🎉 Done processing batch!');
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
