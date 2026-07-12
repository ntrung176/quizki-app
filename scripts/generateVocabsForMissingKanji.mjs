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
    console.log('Fetching Kanji from Firestore...');
    const kanjiSnap = await getDocs(collection(db, 'kanji'));
    const kanjiList = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Loaded ${kanjiList.length} Kanji characters.`);

    // Load Vocabularies
    console.log('Fetching Vocabularies from Firestore...');
    const vocabSnap = await getDocs(collection(db, 'kanjiVocab'));
    const vocabList = vocabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Loaded ${vocabList.length} vocabulary words.`);

    // Count vocabulary words for each Kanji (ignore book vocabularies starting with 📚)
    const kanjiVocabCount = {};
    kanjiList.forEach(k => {
        kanjiVocabCount[k.character] = 0;
    });

    const normalizeWord = (w) => {
        if (!w) return '';
        return w.replace(/（/g, '(').split('(')[0].trim();
    };

    const existingWordsNormalized = new Set(
        vocabList.map(v => normalizeWord(v.word))
    );

    vocabList.filter(v => !v.category || !v.category.startsWith('📚')).forEach(v => {
        const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
        chars.forEach(c => {
            if (c in kanjiVocabCount) {
                kanjiVocabCount[c]++;
            }
        });
    });

    const TARGET_VOCAB_COUNT = 10;
    const lackingKanji = kanjiList.filter(k => kanjiVocabCount[k.character] < TARGET_VOCAB_COUNT);

    // Prioritize Kanji with 0 vocabulary words, then sort ascending by number of existing words
    lackingKanji.sort((a, b) => {
        const countA = kanjiVocabCount[a.character] || 0;
        const countB = kanjiVocabCount[b.character] || 0;
        return countA - countB;
    });

    console.log(`Found ${lackingKanji.length} Kanji characters currently having less than ${TARGET_VOCAB_COUNT} vocabulary words.`);

    if (lackingKanji.length === 0) {
        console.log(`🎉 All Kanji characters in the database already have at least ${TARGET_VOCAB_COUNT} vocabulary words!`);
        process.exit(0);
    }

    const processList = lackingKanji.slice(0, limit);
    console.log(`Starting processing for the first ${processList.length} characters (Limit: ${limit})...\n`);

    for (let i = 0; i < processList.length; i++) {
        const kanjiObj = processList[i];
        const char = kanjiObj.character;
        const currentCount = kanjiVocabCount[char] || 0;
        const wordsNeeded = TARGET_VOCAB_COUNT - currentCount;
        console.log(`[${i + 1}/${processList.length}] Processing Kanji: ${char} (${kanjiObj.sinoViet || 'Không rõ Hán Việt'} - N${kanjiObj.level || '?'})`);
        console.log(`  Current vocab count: ${currentCount}. Needs ${wordsNeeded} more word(s).`);

        try {
            // Fetch word candidates from kanjiapi.dev
            const res = await fetch(`https://kanjiapi.dev/v1/words/${encodeURIComponent(char)}`);
            if (!res.ok) {
                console.log(`  ⚠️ Failed to fetch words for ${char} from kanjiapi.dev (Status: ${res.status}). Skipping.`);
                continue;
            }

            const data = await res.json();
            const filtered = data.filter(w => {
                const wordStr = w.variants[0].written;
                if (wordStr.length < 2 || wordStr.length > 4) return false;
                if (/[a-zA-Z]/.test(wordStr)) return false;
                if (existingWordsNormalized.has(normalizeWord(wordStr))) return false;
                return true;
            });

            if (filtered.length === 0) {
                console.log(`  ⚠️ No new suitable dictionary words found for ${char}. Skipping.`);
                continue;
            }

            // Sort: prioritize priority words, then shorter length
            filtered.sort((a, b) => {
                const aHasPriority = a.variants.some(v => v.priorities && v.priorities.length > 0);
                const bHasPriority = b.variants.some(v => v.priorities && v.priorities.length > 0);
                if (aHasPriority && !bHasPriority) return -1;
                if (!aHasPriority && bHasPriority) return 1;
                return a.variants[0].written.length - b.variants[0].written.length;
            });

            const candidates = filtered.slice(0, wordsNeeded);
            console.log(`  Selected ${candidates.length} candidate word(s) to generate.`);

            for (const cand of candidates) {
                const candidate = cand.variants[0].written;
                const pronounced = cand.variants[0].pronounced;
                const engMeaning = cand.meanings[0].glosses.slice(0, 2).join(', ');
                console.log(`  -> Generating card for: "${candidate}" (${pronounced}) - English: "${engMeaning}"`);

                // Use Gemini to generate full Vietnamese details
                const prompt = `Từ điển Nhật-Việt. Từ: "${candidate}" [Cấp độ dự kiến: ${kanjiObj.level || 'N2'}]
JSON only, không markdown/backtick:
{"frontWithFurigana":"水道（すいどう）","meaning":"đường ống nước","pos":"noun","level":"N3","sinoVietnamese":"THUỶ ĐẠO","synonym":"配管（hai かん）","synonymSinoVietnamese":"PHỐI QUẢN","example":"＿＿＿＿の水が止まった。","exampleMeaning":"Nước đường ống đã ngừng chảy.","nuance":"Chỉ hệ thống cấp nước sinh hoạt.","reading":"すいどう","accent":"0"}

QUY TẢC BẮT BUỘC:
1. Giữ nguyên cụm từ gốc: Hãy giữ nguyên vẹn từ gốc "${candidate}". TUYỆT ĐỐI KHÔNG được rút gọn thành từ khác. Tuy nhiên, nếu từ gốc "${candidate}" là một cách viết biến thể rất hiếm gặp, phi chuẩn hoặc do lỗi tự điển (ví dụ: "一七" thay vì "十七" để chỉ số 17, "一月" thay vì "正月" để chỉ tết...), bạn BẮT BUỘC phải sửa lại thành cách viết chuẩn và thông dụng nhất của tiếng Nhật hiện đại trong trường "frontWithFurigana" (ví dụ: sửa thành "十七（じゅうなな）") và dịch nghĩa, ví dụ theo từ chuẩn đó.
2. Từ vựng (frontWithFurigana) & Từ đồng nghĩa (synonym) định dạng cách đọc:
   - BẮT BUỘC dùng định dạng: "Từ gốc（cách đọc hiragana của CẢ TỪ）".
   - Ngoặc cách đọc phải đặt duy nhất ở CUỐI CÙNG sau toàn bộ từ gốc. Tuyệt đối KHÔNG chèn ngoặc cách đọc vào giữa các nhóm chữ trong từ gốc.
   - Ví dụ ĐÚNG: "顔認証（かおにnしょう）", "振り込む（ふりこむ）"
   - Ví dụ SAI: "顔（かお）認証（にnしょう）", "振（ふ）り込（こ）m"
3. meaning: Ngắn gọn, nghĩa khác nhau ngăn ";". Dịch sang tiếng Việt tự nhiên và chính xác nhất.
4. pos: Bắt buộc chọn một trong các chuỗi sau: "noun", "verb", "suru_verb", "adj-i", "adj-na", "noun/adj-na", "adverb", "conjunction", "particle", "grammar", "phrase", "other".
5. example: CHỈ 1 CÂU. Thay từ gốc "${candidate}" bằng ＿＿＿＿. Viết câu ví dụ tự nhiên bằng tiếng Nhật với ngữ cảnh phong phú, rõ ràng để thể hiện rõ nét nghĩa. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.
6. exampleMeaning: Dịch nghĩa tiếng Việt của câu ví dụ.
7. sinoVietnamese: BẮT BUỘC dịch ĐẦY ĐỦ TẤT CẢ các chữ Kanji xuất hiện trong từ vựng sang âm Hán Việt viết IN HOA, ngăn cách bằng dấu cách.
8. nuance: Chi tiết bối cảnh sử dụng.
9. level: N5-N1.
10. reading: Bắt buộc điền cách đọc chỉ bằng chữ Hiragana/Katakana của từ gốc (không chứa Kanji).
11. accent: Bắt buộc điền số biểu thị cao độ từ vựng (Pitch Accent), ví dụ: '0', '1', '2', '3'. Nếu không có hoặc không rõ, điền "0".`;

                console.log('     Generating card details with Gemini...');
                const aiData = await callOpenRouter(prompt);

                const vocabData = {
                    word: aiData.frontWithFurigana || `${candidate}（${pronounced}）`,
                    reading: aiData.reading || pronounced,
                    meaning: aiData.meaning || '',
                    level: aiData.level || kanjiObj.level || 'N2',
                    source: 'Tự động',
                    sinoViet: aiData.sinoVietnamese || '',
                    synonymSinoVietnamese: aiData.synonymSinoVietnamese || '',
                    accent: aiData.accent !== undefined ? String(aiData.accent) : '0',
                    pos: aiData.pos || 'noun',
                    synonym: aiData.synonym || '',
                    example: aiData.example || '',
                    exampleMeaning: aiData.exampleMeaning || '',
                    nuance: aiData.nuance || '',
                    category: '',
                    kanjiList: (aiData.frontWithFurigana || candidate).match(/[\u4e00-\u9faf]/g) || [char],
                    updatedAt: Date.now()
                };

                // Save to Firestore
                const docRef = await addDoc(collection(db, 'kanjiVocab'), vocabData);
                console.log(`     ✅ Successfully saved to Firestore! Doc ID: ${docRef.id}`);
                console.log(`     Word: ${vocabData.word} | Hán Việt: ${vocabData.sinoViet} | Nghĩa: ${vocabData.meaning}\n`);

                // Add to existingWordsNormalized to prevent duplicates in the same run
                existingWordsNormalized.add(normalizeWord(vocabData.word));

                // Slight pause to be polite to the APIs
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err) {
            console.error(`  ❌ Error processing Kanji ${char}:`, err.message);
        }
    }

    console.log('🎉 Done processing batch!');
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
