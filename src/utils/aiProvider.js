// --- AI Provider: OpenRouter Only ---
// Sử dụng duy nhất OpenRouter (Gemini 2.5 Flash) cho tất cả AI generation

// ============== KANJI → HÁN VIỆT LOOKUP ==============
export { getSinoVietnamese } from './kanjiHVLookup';
import { getSinoVietnamese } from './kanjiHVLookup';
import { generateFuriganaText, ensureFuriganaFormat } from './furiganaHelper';
import { db } from '../config/firebase';
import { doc, getDoc, getDocs, collection, query, collectionGroup, setDoc, updateDoc, where } from 'firebase/firestore';
import { normalizePosKey } from '../config/constants';
// ============== KEY MANAGEMENT ==============

// Lấy tất cả OpenRouter keys
export const getOpenRouterKeys = () => {
    const keys = [];
    let i = 1;
    while (true) {
        const key = import.meta.env[`VITE_OPENROUTER_API_KEY_${i}`];
        if (key) {
            keys.push(key);
            i++;
        } else {
            break;
        }
    }
    const singleKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (singleKey && !keys.includes(singleKey)) {
        keys.unshift(singleKey);
    }
    return keys;
};


// ============== OPENROUTER API CALL ==============

const OPENROUTER_MODELS = [
    'google/gemini-2.5-flash',
    'google/gemini-3.1-flash-lite',
    'google/gemini-2.5-pro',
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'anthropic/claude-sonnet-4.6',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-sonnet-4',
    '~anthropic/claude-sonnet-latest',
    'anthropic/claude-3.5-haiku',
    'anthropic/claude-3.5-sonnet',
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.1-8b-instruct'
];

const MODEL_ALIASES = {
    'anthropic/claude-3.5-sonnet': 'anthropic/claude-sonnet-4.6'
};

const getEffectiveModel = (model) => {
    return MODEL_ALIASES[model] || model;
};


const buildOpenRouterRequest = (prompt, model, apiKey) => ({
    url: 'https://openrouter.ai/api/v1/chat/completions',
    options: {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Quizki Vocab'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: 'You are a Japanese-Vietnamese dictionary assistant. Always respond with valid JSON only, no markdown, no explanation.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2048,
            provider: {
                sort: 'price',
                allow_fallbacks: true
            }
        })
    }
});

const extractOpenRouterText = (result) => result?.choices?.[0]?.message?.content || null;


// Core API call with retry across keys and models
const callWithRetry = async (prompt, keyIndex = 0, modelIndex = 0, preferredModel = null) => {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        throw new Error('Không có OpenRouter API key. Vui lòng thêm VITE_OPENROUTER_API_KEY vào file .env');
    }

    let models = [...OPENROUTER_MODELS];
    const effectivePreferred = getEffectiveModel(preferredModel);
    if (effectivePreferred) {
        models = [effectivePreferred, ...models.filter(m => m !== effectivePreferred)];
    }

    const currentKey = keys[keyIndex];
    const currentModel = models[modelIndex];

    const { url, options } = buildOpenRouterRequest(prompt, currentModel, currentKey);

    try {
        const response = await fetch(url, options);

        if (response.ok) {
            const result = await response.json();
            const text = extractOpenRouterText(result);
            if (text) {
                console.log(`✅ OpenRouter (${currentModel}) thành công!`);
                return text;
            }
        }

        const status = response.status;

        // Rate limited → thử key tiếp theo
        if ((status === 429 || status === 503) && keyIndex < keys.length - 1) {
            console.log(`⚠️ OpenRouter key ${keyIndex + 1} rate limited, thử key ${keyIndex + 2}...`);
            await new Promise(r => setTimeout(r, 500));
            return callWithRetry(prompt, keyIndex + 1, modelIndex, preferredModel);
        }

        // Hết key cho model này → thử model tiếp
        if ((status === 429 || status === 503) && modelIndex < models.length - 1) {
            console.log(`⚠️ Hết quota cho ${currentModel}, thử ${models[modelIndex + 1]}...`);
            await new Promise(r => setTimeout(r, 500));
            return callWithRetry(prompt, 0, modelIndex + 1, preferredModel);
        }

        // Model not found
        if (status === 404 && modelIndex < models.length - 1) {
            console.log(`⚠️ Model ${currentModel} không tồn tại, thử ${models[modelIndex + 1]}...`);
            return callWithRetry(prompt, keyIndex, modelIndex + 1, preferredModel);
        }

        const errorText = await response.text().catch(() => '');
        console.error(`❌ OpenRouter error (${status}):`, errorText);
        throw new Error(`OpenRouter API error: ${status}`);

    } catch (error) {
        if (error.message?.startsWith('OpenRouter API error')) throw error;
        console.error(`❌ OpenRouter network error:`, error.message);
        if (keyIndex < keys.length - 1) {
            return callWithRetry(prompt, keyIndex + 1, modelIndex, preferredModel);
        }
        throw error;
    }
};


// ============== UNIFIED AI CALL ==============

export const callAI = async (prompt, forcedOpenRouterModel = null, featureId = null) => {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        throw new Error('Không có OpenRouter API key. Vui lòng thêm VITE_OPENROUTER_API_KEY vào file .env');
    }

    let activeModel = forcedOpenRouterModel;
    if (!activeModel) {
        try {
            const { loadAdminConfig } = await import('./adminSettings');
            const config = await loadAdminConfig();
            if (featureId && config?.aiFeatureModels?.[featureId]) {
                activeModel = config.aiFeatureModels[featureId];
            }
        } catch (e) {
            console.warn('Failed to load admin config for AI model:', e);
        }
    }
    if (!activeModel) {
        const FEATURE_DEFAULTS = {
            vocab_gen: 'openai/gpt-4o-mini',
            grammar_gen: 'google/gemini-2.5-flash',
            vocab_sino_viet: 'google/gemini-3.1-flash-lite',
            more_examples: 'openai/gpt-4o-mini',
            ocr_image: 'openai/gpt-4o-mini',
            grammar_check: 'openai/gpt-4o-mini',
            kaiwa_agent: 'google/gemini-2.5-flash'
        };
        activeModel = FEATURE_DEFAULTS[featureId] || 'google/gemini-2.5-flash';
    }

    activeModel = getEffectiveModel(activeModel);
    console.log(`🤖 OpenRouter (${keys.length} keys) — Feature: ${featureId || 'default'} — Model: ${activeModel}`);
    return callWithRetry(prompt, 0, 0, activeModel);
};


// ============== PARSE JSON RESPONSE ==============

export const parseJsonFromAI = (text) => {
    if (!text) return null;

    let jsonStr = text.trim();

    // Remove markdown code blocks
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    let candidate = jsonStr;
    const firstChar = jsonStr.charAt(0);
    if (firstChar === '[') {
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (arrayMatch) candidate = arrayMatch[0];
    } else if (firstChar === '{') {
        const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objectMatch) candidate = objectMatch[0];
    } else {
        const firstBrace = jsonStr.indexOf('{');
        const firstBracket = jsonStr.indexOf('[');
        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (arrayMatch) candidate = arrayMatch[0];
        } else if (firstBrace !== -1) {
            const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (objectMatch) candidate = objectMatch[0];
        }
    }

    try {
        return JSON.parse(candidate);
    } catch (e1) {
        // Try repairing truncated JSON
        try {
            const repaired = repairTruncatedJson(jsonStr);
            const parsed = JSON.parse(repaired);
            console.warn('⚠️ Repaired truncated AI JSON response successfully:', parsed);
            return parsed;
        } catch (e2) {
            console.error('Error parsing AI response JSON:', e2, 'Raw text:', text);
            return null;
        }
    }
};


// ============== VOCAB GENERATION PROMPT ==============

export const generateVocabPrompt = (frontText, contextPos = '', contextLevel = '', contextMeaning = '') => {
    const isGrammar = contextPos === 'grammar';
    const hasMeaning = contextMeaning && contextMeaning.trim() !== '';

    let grammarInstruction = '';
    let exampleRule = '';
    let exampleMeaningRule = '5. exampleMeaning: Nghĩa tiếng Việt đầy đủ của câu ví dụ.';

    if (isGrammar) {
        if (hasMeaning) {
            grammarInstruction = `Bạn đang tạo thẻ ngữ pháp cho cấu trúc "${frontText}" với nghĩa cụ thể được yêu cầu là: "${contextMeaning}".
Yêu cầu cấu trúc kết quả:
- meaning: Giữ nguyên nghĩa "${contextMeaning}".
- nuance: Giải thích cấu trúc ngữ pháp kết hợp chính xác (cách chia động từ/danh từ/tính từ đi kèm với ngữ pháp này) và cách dùng/sắc thái cụ thể của nghĩa này.`;

            exampleRule = `4. example: CHỈ 1 CÂU ví dụ tiêu biểu xuất sắc nhất thể hiện ĐÚNG nghĩa "${contextMeaning}" của ngữ pháp "${frontText}". Hãy thay thế cấu trúc ngữ pháp "${frontText}" (bao gồm cả các hậu tố/cách chia nếu có) bằng ＿＿＿＿. Câu ví dụ phải tự nhiên, chuẩn Nhật Bản, có ngữ cảnh rõ ràng, phản ánh đúng cấu trúc ngữ pháp kết hợp chính xác. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
        } else {
            grammarInstruction = `Bạn đang tạo thẻ ngữ pháp cho cấu trúc "${frontText}". Vì cấu trúc ngữ pháp này có thể có nhiều nghĩa khác nhau, bạn phải:
Yêu cầu cấu trúc kết quả:
- meaning: Liệt kê đầy đủ và chính xác tất cả các nghĩa phổ biến của ngữ pháp này, đánh số thứ tự rõ ràng (Ví dụ: "1. Nghĩa A; 2. Nghĩa B; 3. Nghĩa C").
- nuance: Với mỗi nghĩa ở trên, hãy giải thích rõ cấu trúc ngữ pháp kết hợp chính xác (cách chia động từ, danh từ, tính từ đi kèm) và bối cảnh/sắc thái sử dụng tương ứng.`;

            exampleRule = `4. example: Đối với MỖI nghĩa của ngữ pháp được liệt kê ở trường "meaning", hãy viết 1 câu ví dụ tương ứng tiêu biểu nhất thể hiện đặc trưng của nghĩa đó (đánh số 1, 2, 3... tương ứng trên từng dòng). Hãy thay thế cấu trúc ngữ pháp "${frontText}" trong mỗi câu ví dụ bằng ＿＿＿＿. Các câu ví dụ phải có cấu trúc kết hợp chuẩn xác tuyệt đối, tự nhiên, chuẩn Nhật Bản. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
            exampleMeaningRule = `5. exampleMeaning: Dịch nghĩa tiếng Việt tương ứng cho từng câu ví dụ ở trên, phân dòng và đánh số 1, 2, 3... khớp hoàn toàn với các câu ví dụ ở trường "example".`;
        }
    } else {
        // Build example rule dynamically based on level
        exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết câu ví dụ tự nhiên bằng tiếng Nhật với ngữ cảnh phong phú, rõ ràng để thể hiện rõ nét nghĩa được nêu trong trường "meaning", giúp người học dễ hiểu và phân biệt bối cảnh sử dụng của từ này. Tránh các câu quá ngắn hoặc chung chung (như "Đây là...", "Tôi thích..."). KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
        if (contextLevel === 'N5') {
            exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết bằng HIRAGANA chủ yếu, câu ngắn đơn giản dễ hiểu (tối đa 8-10 từ) nhưng có ngữ cảnh rõ ràng thể hiện đúng nghĩa, phân cách từ rõ ràng. KHÔNG thêm ngoặc phiên âm furigana.`;
        }
    }

    return `Từ điển Nhật-Việt. Từ: "${frontText}"${contextPos ? ` (Từ loại: ${contextPos})` : ''}${contextLevel ? ` [Cấp độ: ${contextLevel}]` : ''}${hasMeaning ? ` [Nghĩa yêu cầu: ${contextMeaning}]` : ''}
JSON only, không markdown/backtick:
{"frontWithFurigana":"水道（すいどう）","meaning":"đường ống nước","pos":"noun","level":"N3","sinoVietnamese":"THUỶ ĐẠO","synonym":"配管（はいかん）","synonymSinoVietnamese":"PHỐI QUẢN","example":"＿＿＿＿の水が止まった。","exampleMeaning":"Nước đường ống đã ngừng chảy.","nuance":"Chỉ hệ thống cấp nước sinh hoạt.","reading":"すいどう","accent":"0"}

${grammarInstruction}

QUY TẮC BẮT BUỘC:
1. Giữ nguyên cụm từ dài: Nếu người dùng nhập cụm từ dài hoặc cả câu (Ví dụ: "日本語を勉強する", "お腹gã空いた"), TUYỆT ĐỐI KHÔNG được rút gọn thành từ vựng đơn (như "勉強する", "空く"). Hãy giữ nguyên vẹn cụm từ gốc đó. Nếu cụm từ nhập có lỗi chính tả/ngữ pháp, hãy chuẩn hóa/sửa nó thành cụm từ chuẩn chính xác nhưng giữ nguyên độ dài và ý định gốc.
2. Từ vựng (frontWithFurigana) & Từ đồng nghĩa (synonym) định dạng cách đọc:
   - BẮT BUỘC dùng định dạng: "Từ gốc（cách đọc hiragana của CẢ TỪ）".
   - Ngoặc cách đọc phải đặt duy nhất ở CUỐI CÙNG sau toàn bộ từ gốc. Tuyệt đối KHÔNG chèn ngoặc cách đọc vào giữa các nhóm chữ trong từ gốc.
   - Đối với các cụm từ dài hoặc cụm động từ/tính từ chứa nhiều từ/nhiều chữ Kanji (Ví dụ: "お土産を届ける"), TUYỆT ĐỐI KHÔNG được chia thành nhiều ngoặc như "お土産（おみやげ）を届ける（おとどける）", mà BẮT BUỘC phải viết một ngoặc đọc duy nhất ở cuối cùng cho toàn bộ cụm: "お土産を届ける（おみやげをとどける）".
   - Đối với từ gốc có chứa Katakana xen lẫn Kanji/Hiragana (Ví dụ: "スマホを使う"), trong ngoặc đọc phải giữ nguyên phần chữ Katakana tương ứng và chuyển các chữ Kanji sang Hiragana (Ví dụ: "スマホを使う（スマホをつかう）", chứ không viết là "スマホを使う（すまほをつかう）" hay cắt ngắn).
   - Ví dụ ĐÚNG: "顔認証（かおにんしょう）", "振り込む（ふりこむ）", "スマホを使う（スマホをつかう）", "お土産を届ける（おみやげをとどける）"
   - Ví dụ SAI: "顔（かお）認証（にんしょう）", "振（ふ）り込（こ）む", "スマホ（すまほ）を使う（つかう）", "お土産（おみやげ）を届ける（おとどける）"
   - Trả về trường "frontWithFurigana" cho từ gốc và "synonym" cho từ đồng nghĩa.

2. meaning: ${isGrammar ? 'Định nghĩa ngữ pháp theo hướng dẫn ở trên.' : 'Ngắn gọn, nghĩa khác nhau ngăn ";". Không liệt kê nghĩa gần giống. Đặc biệt, nếu từ gốc là một cụm từ dài, câu, collocation hoặc có pos là "phrase" (Ví dụ: "進学を契機にテニス部に入った"), thì trường "meaning" BẮT BUỘC phải là một bản dịch tiếng Việt tự nhiên, thoát ý duy nhất cho TOÀN BỘ cụm từ/câu đó. TUYỆT ĐỐI KHÔNG dịch tách nhỏ từng vế hoặc liệt kê nhiều nghĩa rời rạc phân cách bởi dấu chấm phẩy (;).'}
3. pos/level: Phải khớp ngữ cảnh nếu đã chọn. Grammar→giải thích như ngữ pháp.
   - pos: Bắt buộc chọn một trong các chuỗi sau: "noun" (danh từ), "verb" (động từ), "suru_verb" (danh động từ - suru verb), "adj-i" (tính từ -い), "adj-na" (tính từ -な), "noun/adj-na" (danh từ kiêm tính từ -な), "adverb" (trạng từ), "conjunction" (liên từ), "particle" (trợ từ), "grammar" (ngữ pháp), "phrase" (cụm từ), "other" (khác).

${exampleRule}
${exampleMeaningRule}
6. sinoVietnamese: BẮT BUỘC dịch ĐẦY ĐỦ TẤT CẢ các chữ Kanji xuất hiện trong từ vựng/cụm từ (bao gồm cả tiền tố, hậu tố hay các Kanji phụ trong cụm dài) sang âm Hán Việt viết IN HOA, ngăn cách bằng dấu cách. Tuyệt đối không được lược bỏ, rút gọn hay dịch thiếu bất kỳ chữ Kanji nào. Không Kanji→"". KHÔNG bịa.
7. nuance: ${isGrammar ? 'Chi tiết cấu trúc ngữ pháp kết hợp chính xác và sắc thái sử dụng theo hướng dẫn ở trên.' : 'Chi tiết bối cảnh sử dụng.'}
8. synonym/synonymSinoVietnamese: Cùng/dễ hơn JLPT. N5→"". Không bịa. synonymSinoVietnamese = BẮT BUỘC dịch đầy đủ tất cả chữ Kanji của synonym sang âm Hán Việt.
9. level: N5-N1, không rõ→"".
10. reading: Bắt buộc điền cách đọc chỉ bằng chữ Hiragana/Katakana của từ gốc (không chứa Kanji, ví dụ: "すいどう", "たべる").
11. accent: Bắt buộc điền số biểu thị cao độ từ vựng (Pitch Accent), ví dụ: '0', '1', '2', '3' (0=bình bình Heiban, 1=đầu cao Atamadaka, v.v.). Nếu không có hoặc không rõ, điền "0".

Không trả lời gì ngoài JSON.`;
};

export const generateMoreExamplePrompt = (frontText, targetMeaning) => {
    return `Bạn là giáo viên tiếng Nhật. Hãy tạo 1 câu ví dụ ngắn gọn, tự nhiên và dễ hiểu cho từ vựng "${frontText}" với nghĩa cụ thể là "${targetMeaning}".

YÊU CẦU:
1. Ngắn gọn & Tự nhiên: Câu ví dụ phải tự nhiên nhưng NGẮN GỌN, súc tích (tối đa 12-15 từ), có ngữ cảnh rõ ràng thể hiện đúng nghĩa "${targetMeaning}" của từ "${frontText}". Tránh các câu quá dài dòng, dông dài hoặc quá phức tạp.
2. Thay thế từ gốc: Trong câu tiếng Nhật, bắt buộc thay thế từ "${frontText}" (hoặc dạng chia của nó) bằng ký tự "＿＿＿＿" (4 dấu gạch dưới).
3. Không thêm phiên âm/furigana/romaji hay bất kỳ dấu ngoặc nào vào câu tiếng Nhật.
4. "exampleMeaning": Dịch nghĩa tiếng Việt ngắn gọn, tự nhiên và chính xác với câu ví dụ.

JSON ONLY (không markdown, không giải thích):
{"example":"[câu tiếng Nhật ngắn gọn có chứa ＿＿＿＿]","exampleMeaning":"[nghĩa tiếng Việt ngắn gọn]"}`;
};


// Helpers for DB updates inside aiProvider.js
const updateBookVocabInFirestore = async (docPath, originalWord, updatedFields) => {
    if (!docPath || !originalWord) return;
    try {
        const docRef = doc(db, docPath);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.vocab && Array.isArray(data.vocab)) {
                let changed = false;
                const updatedVocab = data.vocab.map(v => {
                    const word = v.word || v.front || '';
                    if (word === originalWord) {
                        changed = true;
                        return {
                            ...v,
                            word: updatedFields.front || v.word,
                            front: updatedFields.front || v.front,
                            synonym: updatedFields.synonym !== undefined ? updatedFields.synonym : (v.synonym || ''),
                            pos: updatedFields.pos || v.pos || '',
                            sinoVietnamese: updatedFields.sinoVietnamese || v.sinoVietnamese || '',
                            meaning: updatedFields.meaning || v.meaning || '',
                            example: updatedFields.example || v.example || '',
                            exampleMeaning: updatedFields.exampleMeaning || v.exampleMeaning || '',
                            nuance: updatedFields.nuance || v.nuance || '',
                        };
                    }
                    return v;
                });

                if (changed) {
                    await updateDoc(docRef, { vocab: updatedVocab });
                    console.log(`✅ [aiAssistVocab] Automatically updated/standardized book vocabulary in Firestore path: ${docPath} for "${originalWord}"`);
                }
            }
        }
    } catch (e) {
        console.warn(`[aiAssistVocab] Failed to update book vocabulary in Firestore:`, e);
    }
};

const saveSharedVocab = async (word, data) => {
    try {
        const normalized = word.split('（')[0].split('(')[0].trim();
        const normalizedLower = normalized.toLowerCase();
        
        let matchedId = null;
        
        // 1. Kiểm tra ID normalized chính xác
        let docRef = doc(db, 'sharedVocabulary', normalized);
        let docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            matchedId = normalized;
        } else {
            // 2. Kiểm tra ID normalized chữ thường
            if (normalized !== normalizedLower) {
                docRef = doc(db, 'sharedVocabulary', normalizedLower);
                docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    matchedId = normalizedLower;
                }
            }
            // 3. Kiểm tra ID nguyên bản đầy đủ
            if (!matchedId) {
                const originalTrimmed = word.trim();
                if (originalTrimmed !== normalized) {
                    docRef = doc(db, 'sharedVocabulary', originalTrimmed);
                    docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        matchedId = originalTrimmed;
                    }
                }
            }
            // 4. Tìm qua query range (prefix)
            if (!matchedId) {
                const q = query(
                    collection(db, 'sharedVocabulary'),
                    where('front', '>=', normalized),
                    where('front', '<=', normalized + '\uf8ff')
                );
                const querySnap = await getDocs(q);
                if (!querySnap.empty) {
                    const matchedDoc = querySnap.docs.find(doc => {
                        const dbFront = doc.data().front || doc.data().frontWithFurigana || '';
                        const dbNormalized = dbFront.split('（')[0].split('(')[0].trim().toLowerCase();
                        return dbNormalized === normalizedLower;
                    });
                    if (matchedDoc) {
                        matchedId = matchedDoc.id;
                    }
                }
            }
        }

        if (!matchedId) {
            console.log(`⚠️ [aiAssistVocab] saveSharedVocab: "${word}" không tồn tại trong sharedVocabulary. Bỏ qua không lưu.`);
            return;
        }

        const finalDocRef = doc(db, 'sharedVocabulary', matchedId);
        await setDoc(finalDocRef, {
            front: data.front || data.frontWithFurigana || word,
            back: data.back || data.meaning || '',
            synonym: data.synonym || '',
            sinoVietnamese: data.sinoVietnamese || '',
            synonymSinoVietnamese: data.synonymSinoVietnamese || '',
            example: data.example || '',
            exampleMeaning: data.exampleMeaning || '',
            nuance: data.nuance || '',
            pos: data.pos || '',
            level: data.level || '',
            reading: data.reading || '',
            accent: data.accent !== undefined && data.accent !== null ? String(data.accent) : '',
            updatedAt: Date.now(),
        }, { merge: true });
        console.log(`✅ [aiAssistVocab] Saved/Updated sharedVocabulary: ${matchedId}`);
    } catch (e) {
        console.warn('[aiAssistVocab] Error saving shared vocab:', e);
    }
};

// Variable to store cached lesson documents for book vocab lookup
let cachedLessons = null;

const lookupBookVocabInAI = async (key) => {
    try {
        const normalizedKey = key.split('（')[0].split('(')[0].trim().toLowerCase();
        
        if (!cachedLessons) {
            const lessonsQuery = query(collectionGroup(db, 'lessons'));
            const lessonsSnap = await getDocs(lessonsQuery);
            cachedLessons = lessonsSnap.docs.map(doc => ({
                id: doc.id,
                _docPath: doc.ref.path,
                ...doc.data()
            }));
        }
        
        for (const lessonData of cachedLessons) {
            if (lessonData.vocab && Array.isArray(lessonData.vocab)) {
                const match = lessonData.vocab.find(v => {
                    const word = v.word || v.front || '';
                    const normalizedWord = word.split('（')[0].split('(')[0].trim().toLowerCase();
                    return normalizedWord === normalizedKey;
                });
                
                if (match) {
                    console.log(`📚 aiAssistVocab: Found "${key}" in book database!`);
                    const rawFront = match.word || match.front || key;
                    const formattedFront = await ensureFuriganaFormat(rawFront, match.reading);
                    const formattedSynonym = match.synonym ? await ensureFuriganaFormat(match.synonym) : '';
                    
                    return {
                        front: formattedFront,
                        frontWithFurigana: formattedFront,
                        meaning: match.meaning || match.back || match.meaningVi || match.vietnamese || '',
                        synonym: formattedSynonym,
                        example: match.example || '',
                        exampleMeaning: match.exampleMeaning || '',
                        nuance: match.nuance || match.note || '',
                        pos: match.pos || '',
                        level: match.level || '',
                        sinoVietnamese: match.sinoVietnamese || '',
                        synonymSinoVietnamese: '',
                        reading: match.reading || '',
                        accent: match.accent !== undefined && match.accent !== null ? String(match.accent) : '',
                        _fromBook: true,
                        _docPath: lessonData._docPath,
                        _originalWord: match.word || match.front || key
                    };
                }
            }
        }
    } catch (e) {
        console.warn('Error in lookupBookVocabInAI:', e);
    }
    return null;
};

const lookupSharedVocabInAI = async (key) => {
    try {
        if (!key) return null;
        const normalized = key.split('（')[0].split('(')[0].trim();
        const normalizedLower = normalized.toLowerCase();
        
        // 1. Tìm theo ID normalized chính xác (phân biệt hoa thường)
        let docRef = doc(db, 'sharedVocabulary', normalized);
        let docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log(`📚 aiAssistVocab: Found "${key}" in sharedVocabulary (exact ID)!`);
            const data = docSnap.data();
            const formattedFront = await ensureFuriganaFormat(data.front || data.frontWithFurigana || key);
            const formattedSynonym = data.synonym ? await ensureFuriganaFormat(data.synonym) : '';
            return {
                front: formattedFront,
                frontWithFurigana: formattedFront,
                meaning: data.back || data.meaning || '',
                synonym: formattedSynonym,
                example: data.example || '',
                exampleMeaning: data.exampleMeaning || '',
                nuance: data.nuance || '',
                pos: data.pos || '',
                level: data.level || '',
                sinoVietnamese: data.sinoVietnamese || '',
                synonymSinoVietnamese: data.synonymSinoVietnamese || '',
                reading: data.reading || '',
                accent: data.accent !== undefined && data.accent !== null ? String(data.accent) : '',
                _fromShared: true
            };
        }
        
        // 2. Tìm theo ID normalized chữ thường (nếu khác biệt)
        if (normalized !== normalizedLower) {
            docRef = doc(db, 'sharedVocabulary', normalizedLower);
            docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                console.log(`📚 aiAssistVocab: Found "${key}" in sharedVocabulary (lower ID)!`);
                const data = docSnap.data();
                const formattedFront = await ensureFuriganaFormat(data.front || data.frontWithFurigana || key);
                const formattedSynonym = data.synonym ? await ensureFuriganaFormat(data.synonym) : '';
                return {
                    front: formattedFront,
                    frontWithFurigana: formattedFront,
                    meaning: data.back || data.meaning || '',
                    synonym: formattedSynonym,
                    example: data.example || '',
                    exampleMeaning: data.exampleMeaning || '',
                    nuance: data.nuance || '',
                    pos: data.pos || '',
                    level: data.level || '',
                    sinoVietnamese: data.sinoVietnamese || '',
                    synonymSinoVietnamese: data.synonymSinoVietnamese || '',
                    reading: data.reading || '',
                    accent: data.accent !== undefined && data.accent !== null ? String(data.accent) : '',
                    _fromShared: true
                };
            }
        }

        // 3. Tìm theo ID nguyên bản đầy đủ (chứa cả ngoặc đọc nếu có)
        const originalTrimmed = key.trim();
        if (originalTrimmed !== normalized) {
            docRef = doc(db, 'sharedVocabulary', originalTrimmed);
            docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                console.log(`📚 aiAssistVocab: Found "${key}" in sharedVocabulary (original ID)!`);
                const data = docSnap.data();
                const formattedFront = await ensureFuriganaFormat(data.front || data.frontWithFurigana || key);
                const formattedSynonym = data.synonym ? await ensureFuriganaFormat(data.synonym) : '';
                return {
                    front: formattedFront,
                    frontWithFurigana: formattedFront,
                    meaning: data.back || data.meaning || '',
                    synonym: formattedSynonym,
                    example: data.example || '',
                    exampleMeaning: data.exampleMeaning || '',
                    nuance: data.nuance || '',
                    pos: data.pos || '',
                    level: data.level || '',
                    sinoVietnamese: data.sinoVietnamese || '',
                    synonymSinoVietnamese: data.synonymSinoVietnamese || '',
                    reading: data.reading || '',
                    accent: data.accent !== undefined && data.accent !== null ? String(data.accent) : '',
                    _fromShared: true
                };
            }
        }

        // 4. Tìm bằng câu lệnh truy vấn range (prefix) để khớp các từ có ngoặc cách đọc (ví dụ: "段目" khớp "段目（だんめ）")
        const q = query(
            collection(db, 'sharedVocabulary'),
            where('front', '>=', normalized),
            where('front', '<=', normalized + '\uf8ff')
        );
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
            const matchedDoc = querySnap.docs.find(doc => {
                const dbFront = doc.data().front || doc.data().frontWithFurigana || '';
                const dbNormalized = dbFront.split('（')[0].split('(')[0].trim().toLowerCase();
                return dbNormalized === normalizedLower;
            });
            if (matchedDoc) {
                console.log(`📚 aiAssistVocab: Found "${key}" in sharedVocabulary via query!`);
                const data = matchedDoc.data();
                const formattedFront = await ensureFuriganaFormat(data.front || data.frontWithFurigana || key);
                const formattedSynonym = data.synonym ? await ensureFuriganaFormat(data.synonym) : '';
                return {
                    front: formattedFront,
                    frontWithFurigana: formattedFront,
                    meaning: data.back || data.meaning || '',
                    synonym: formattedSynonym,
                    example: data.example || '',
                    exampleMeaning: data.exampleMeaning || '',
                    nuance: data.nuance || '',
                    pos: data.pos || '',
                    level: data.level || '',
                    sinoVietnamese: data.sinoVietnamese || '',
                    synonymSinoVietnamese: data.synonymSinoVietnamese || '',
                    reading: data.reading || '',
                    accent: data.accent !== undefined && data.accent !== null ? String(data.accent) : '',
                    _fromShared: true
                };
            }
        }
    } catch (e) {
        console.warn('Error in lookupSharedVocabInAI:', e);
    }
    return null;
};

// Variable to track duplicate clicks to force AI recreate
let lastAssistedWordInAI = { word: '', timestamp: 0 };

// Hàm chính để tạo vocab với AI
export const aiAssistVocab = async (frontText, contextPos = '', contextLevel = '', contextMeaning = '') => {
    if (!frontText || frontText.trim() === '') return null;

    const now = Date.now();
    let forceRefresh = false;
    if (lastAssistedWordInAI.word === frontText && (now - lastAssistedWordInAI.timestamp) < 15000) {
        forceRefresh = true;
        console.log(`🔄 [aiAssistVocab] Same word "${frontText}" requested again within 15s. Forcing AI generation (Retry/Recreate mode).`);
    }
    lastAssistedWordInAI = { word: frontText, timestamp: now };

    const enableDbLookup = false; // Tạm thời vô hiệu hoá lấy dữ liệu từ kho sách và kho từ vựng chung
    if (!forceRefresh && enableDbLookup) {
        // 1. Kiểm tra kho sách trước
    try {
        const bookMatch = await lookupBookVocabInAI(frontText);
        if (bookMatch) {
            const cachedPosNormalized = bookMatch.pos ? normalizePosKey(bookMatch.pos) : '';
            const contextPosNormalized = contextPos ? normalizePosKey(contextPos) : '';
            const posMatch = !contextPosNormalized || cachedPosNormalized === contextPosNormalized;
            const levelMatch = !contextLevel || bookMatch.level === contextLevel;

            if (posMatch && levelMatch) {
                const result = { ...bookMatch };
                if (result.pos) result.pos = normalizePosKey(result.pos);

            let isBookVocabUpdated = false;

            // Điền từ loại nếu thiếu
            if (!result.pos || result.pos.trim() === '') {
                try {
                    const posPrompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật.
Hãy xác định từ loại (Part of Speech - POS) cho từ vựng tiếng Nhật dưới đây.
Từ gốc: "${result.front || frontText}"
Nghĩa: "${result.meaning}"
Ví dụ: "${result.example || ''}"

Lưu ý: Từ loại (pos) BẮT BUỘC phải là một trong các chuỗi sau:
- "noun"
- "verb"
- "suru_verb"
- "adj-i"
- "adj-na"
- "noun/adj-na"
- "adverb"
- "conjunction"
- "particle"
- "grammar"
- "phrase"
- "other"

Chỉ trả về JSON định dạng sau (không giải thích, không markdown):
{"pos": "..."}`;
                    const responseText = await callAI(posPrompt, 'google/gemini-2.5-flash');
                    const parsedJson = parseJsonFromAI(responseText);
                    if (parsedJson && parsedJson.pos) {
                        result.pos = normalizePosKey(parsedJson.pos);
                        isBookVocabUpdated = true;
                    }
                } catch (e) {
                    console.warn('AI POS generation in aiAssistVocab (Book) failed:', e);
                }
            }

            // Điền Hán Việt nếu thiếu
            if (!result.sinoVietnamese || result.sinoVietnamese.trim() === '') {
                const lookupHV = getSinoVietnamese(result.front || frontText);
                if (lookupHV) {
                    result.sinoVietnamese = lookupHV;
                    isBookVocabUpdated = true;
                } else {
                    try {
                        const hvPrompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật và Hán Việt.
Hãy tìm chữ Hán (Kanji) tương ứng và dịch sang âm Hán Việt (IN HOA) cho từ vựng tiếng Nhật dưới đây.
Từ gốc: "${result.front || frontText}"
Nghĩa: "${result.meaning}"
Từ loại: "${result.pos || ''}"
Ví dụ: "${result.example || ''}"

Lưu ý:
1. Trả về âm Hán Việt IN HOA, cách nhau bởi dấu cách.
2. Nếu không có chữ Hán, trả về chuỗi rỗng "".

Chỉ trả về JSON định dạng sau:
{"sinoVietnamese": "..."}`;
                        const responseText = await callAI(hvPrompt, 'google/gemini-3.1-flash-lite');
                        const parsedJson = parseJsonFromAI(responseText);
                        if (parsedJson && parsedJson.sinoVietnamese) {
                            result.sinoVietnamese = parsedJson.sinoVietnamese;
                            isBookVocabUpdated = true;
                        }
                    } catch (e) {
                        console.warn('AI Sino-Vietnamese generation in aiAssistVocab (Book) failed:', e);
                    }
                }
            }

            // Ghi đè lại nếu thay đổi
            if (isBookVocabUpdated || result.front !== bookMatch.front || result.synonym !== bookMatch.synonym) {
                const updatedFields = {
                    front: result.front,
                    synonym: result.synonym,
                    pos: result.pos,
                    sinoVietnamese: result.sinoVietnamese,
                    meaning: result.meaning,
                    example: result.example,
                    exampleMeaning: result.exampleMeaning,
                    nuance: result.nuance,
                };
                if (bookMatch._docPath && bookMatch._originalWord) {
                    updateBookVocabInFirestore(bookMatch._docPath, bookMatch._originalWord, updatedFields)
                        .catch(e => console.warn('Error updating book vocab back in aiAssistVocab:', e));
                }
            }

            // Đồng bộ sang shared vocab
            saveSharedVocab(frontText, result, true)
                .catch(e => console.warn('Error syncing book vocab to shared in aiAssistVocab:', e));

            return result;
            }
        }
    } catch (e) {
        console.warn('aiAssistVocab: Book lookup error:', e);
    }

    // 2. Kiểm tra kho shared vocab
    try {
        const sharedMatch = await lookupSharedVocabInAI(frontText);
        if (sharedMatch) {
            const cachedPosNormalized = sharedMatch.pos ? normalizePosKey(sharedMatch.pos) : '';
            const contextPosNormalized = contextPos ? normalizePosKey(contextPos) : '';
            const posMatch = !contextPosNormalized || cachedPosNormalized === contextPosNormalized;
            const levelMatch = !contextLevel || sharedMatch.level === contextLevel;

            if (posMatch && levelMatch) {
                const result = { ...sharedMatch };
                if (result.pos) result.pos = normalizePosKey(result.pos);

            let isSharedVocabUpdated = false;

            // Điền từ loại nếu thiếu
            if (!result.pos || result.pos.trim() === '') {
                try {
                    const posPrompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật.
Hãy xác định từ loại (Part of Speech - POS) cho từ vựng tiếng Nhật dưới đây.
Từ gốc: "${result.front || frontText}"
Nghĩa: "${result.meaning}"
Ví dụ: "${result.example || ''}"

Lưu ý: Từ loại (pos) BẮT BUỘC phải là một trong các chuỗi sau:
- "noun"
- "verb"
- "suru_verb"
- "adj-i"
- "adj-na"
- "noun/adj-na"
- "adverb"
- "conjunction"
- "particle"
- "grammar"
- "phrase"
- "other"

Chỉ trả về JSON định dạng sau:
{"pos": "..."}`;
                    const responseText = await callAI(posPrompt, 'google/gemini-2.5-flash');
                    const parsedJson = parseJsonFromAI(responseText);
                    if (parsedJson && parsedJson.pos) {
                        result.pos = normalizePosKey(parsedJson.pos);
                        isSharedVocabUpdated = true;
                    }
                } catch (e) {
                    console.warn('AI POS generation in aiAssistVocab (Shared) failed:', e);
                }
            }

            // Điền Hán Việt nếu thiếu
            if (!result.sinoVietnamese || result.sinoVietnamese.trim() === '') {
                const lookupHV = getSinoVietnamese(result.front || frontText);
                if (lookupHV) {
                    result.sinoVietnamese = lookupHV;
                    isSharedVocabUpdated = true;
                } else {
                    try {
                        const hvPrompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật và Hán Việt.
Hãy tìm chữ Hán (Kanji) tương ứng và dịch sang âm Hán Việt (IN HOA) cho từ vựng tiếng Nhật dưới đây.
Từ gốc: "${result.front || frontText}"
Nghĩa: "${result.meaning}"
Từ loại: "${result.pos || ''}"
Ví dụ: "${result.example || ''}"

Lưu ý:
1. Trả về âm Hán Việt IN HOA, cách nhau bởi dấu cách.
2. Nếu không có chữ Hán, trả về chuỗi rỗng "".

Chỉ trả về JSON định dạng sau:
{"sinoVietnamese": "..."}`;
                        const responseText = await callAI(hvPrompt, 'google/gemini-3.1-flash-lite');
                        const parsedJson = parseJsonFromAI(responseText);
                        if (parsedJson && parsedJson.sinoVietnamese) {
                            result.sinoVietnamese = parsedJson.sinoVietnamese;
                            isSharedVocabUpdated = true;
                        }
                    } catch (e) {
                        console.warn('AI Sino-Vietnamese generation in aiAssistVocab (Shared) failed:', e);
                    }
                }
            }

            // Ghi đè lại nếu thay đổi
            if (isSharedVocabUpdated || result.front !== sharedMatch.front || result.synonym !== sharedMatch.synonym) {
                saveSharedVocab(frontText, result, true)
                    .catch(e => console.warn('Error updating shared vocab back in aiAssistVocab:', e));
            }

            return result;
            }
        }
    } catch (e) {
        console.warn('aiAssistVocab: Shared lookup error:', e);
    }
    }

    // 3. Không tìm thấy ở cả 2 kho -> Gọi AI để tạo mới
    const prompt = generateVocabPrompt(frontText, contextPos, contextLevel, contextMeaning);
    const featureId = contextPos === 'grammar' ? 'grammar_gen' : 'vocab_gen';
    const responseText = await callAI(prompt, null, featureId);
    const result = parseJsonFromAI(responseText);

    if (result) {
        if (result.pos) result.pos = normalizePosKey(result.pos);

        // Ghi đè âm Hán Việt bằng bảng tra cứu cứng (ưu tiên hơn AI)
        const lookupHV = getSinoVietnamese(frontText);
        if (lookupHV) {
            console.log(`📘 Hán Việt lookup: "${frontText}" → "${lookupHV}" (AI: "${result.sinoVietnamese || ''}")`);
            result.sinoVietnamese = lookupHV;
        }

        try {
            if (!result.frontWithFurigana) {
                result.frontWithFurigana = result.frontText || frontText;
            }

            // Định dạng ngoặc Hiragana
            if (result.frontWithFurigana) {
                result.frontWithFurigana = await ensureFuriganaFormat(result.frontWithFurigana);
            }
            if (result.synonym) {
                result.synonym = await ensureFuriganaFormat(result.synonym);
            }

            // Xử lý câu ví dụ
            if (result.example) {
                result.example = await generateFuriganaText(result.example);
            }
        } catch (e) {
            console.error("Kuroshiro conversion failed:", e);
        }

        // Lưu vào shared vocab để lưu trữ chung
        saveSharedVocab(frontText, result, forceRefresh)
            .catch(e => console.warn('Error saving newly generated vocab in aiAssistVocab:', e));
    }

    return result;
};

// ============== KANJI BATCH FORMAT (AI clean up) ==============

export const aiBatchFormatKanji = async (kanjiItems) => {
    // kanjiItems: [{character, meaning, sinoViet}, ...]
    const listStr = kanjiItems.map((k, i) =>
        `${i + 1}. ${k.character} | meaning: "${k.meaning}" | sinoViet: "${k.sinoViet}"`
    ).join('\n');

    const prompt = `Bạn là chuyên gia Hán tự và bộ thủ. Hãy format lại dữ liệu Kanji/bộ thủ sau:
${listStr}

QUY TẮC:
1. "meaning": Sửa ý nghĩa tiếng Việt ngắn gọn (DƯỚI 5 từ). Xoá nghĩa trùng lặp, chỉ giữ nghĩa phổ biến nhất. Viết thường.
   - Nếu meaning trống hoặc là "-", hãy ĐIỀN ý nghĩa đúng cho chữ đó.
   VD: "Anh, Anh, anh hùng, xuất sắc, đài hoa" → "anh hùng, xuất sắc"
   VD: "nặng nề, quan trọng, quý trọng, kính trọng, chất đống" → "nặng, quan trọng"
2. "sinoViet": Chỉ giữ 1-2 âm Hán Việt PHỔ BIẾN NHẤT, IN HOA. Xoá âm hiếm dùng.
   - Nếu sinoViet trống hoặc là "-", hãy ĐIỀN âm Hán Việt đúng cho chữ đó.
   - Với bộ thủ, dùng tên bộ thủ Hán Việt phổ biến nhất.
   VD: "TRỌNG, TRÙNG" → "TRỌNG"
   VD: "" (trống) cho 木 → "MỘC"

JSON only, không markdown/backtick. Trả về MẢNG JSON:
[{"character":"英","meaning":"anh hùng, xuất sắc","sinoViet":"ANH"}]`;

    const responseText = await callAI(prompt, null, 'kanji_format');
    if (!responseText) return null;

    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    // Try to extract JSON array
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrMatch) jsonStr = arrMatch[0];

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Error parsing AI batch format response:', e, 'Raw:', responseText);
        return null;
    }
};

// ============== OCR IMAGE EXTRACTION ==============

export const extractVocabFromImage = async (imageBase64) => {
    if (!imageBase64) return null;

    const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    const promptText = `Hãy trích xuất tất cả các từ vựng tiếng Nhật (Kanji, Hiragana, Katakana hoặc chữ Hán đơn) xuất hiện trong ảnh này.
Yêu cầu trả về duy nhất một mảng JSON các chuỗi chứa các từ được tìm thấy (array of strings), ví dụ: ["単語1", "単語2"].
Không trả về bất kỳ văn bản giải thích nào khác ngoài mảng JSON này.`;

    const prompt = [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: imageUrl } }
    ];

    const responseText = await callAI(prompt, null, 'ocr_image');
    if (!responseText) return null;

    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    // Try to extract JSON array
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrMatch) jsonStr = arrMatch[0];

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Lỗi khi phân tích danh sách từ vựng từ AI:', e, 'Văn bản gốc:', responseText);
        return null;
    }
};

// ============== INFO ==============

export const getAIProviderInfo = () => {
    const keys = getOpenRouterKeys();
    return {
        available: [{
            id: 'openrouter',
            name: 'OpenRouter (Gemini)',
            models: OPENROUTER_MODELS,
            keyCount: keys.length
        }],
        totalKeys: keys.length,
        summary: keys.length > 0
            ? `OpenRouter(${keys.length} keys)`
            : 'Chưa cấu hình OpenRouter API key'
    };
};

// ============== GRAMMAR ANSWER CHECK ==============

export const aiCheckGrammarAnswer = async (userAnswer, questionVi, correctAnswers, grammarPattern) => {
    if (!userAnswer || !userAnswer.trim()) return null;

    const answersStr = correctAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n');

    const prompt = `Bạn là giáo viên tiếng Nhật. Hãy chấm điểm và phân tích chi tiết bản dịch của học sinh.

NGỮ PHÁP ĐANG HỌC: ${grammarPattern}
CÂU TIẾNG VIỆT: ${questionVi}
ĐÁP ÁN MẪU:
${answersStr}

BÀI LÀM CỦA HỌC SINH: ${userAnswer}

Hãy đánh giá bài làm và trả về JSON (không markdown, không bọc ngoài bằng từ khóa):
{
  "score": <0-100>,
  "isCorrect": <true/false>,
  "feedback": "<Nhận xét tổng quát ngắn gọn bằng tiếng Việt>",
  "errors": ["<Danh sách lỗi sai cụ thể bằng tiếng Việt, ví dụ: 'Sai trợ từ に thành は', 'Chưa chia đúng thể động từ V-ta', hoặc mảng rỗng [] nếu không có lỗi nào>"],
  "explanation": "<Phân tích so sánh ngắn gọn, súc tích (không viết dông dài) dưới dạng các gạch đầu dòng ngắn. Sử dụng cấu trúc markdown '**A** vs **B**: giải thích ngắn 1 câu'. Đối chiếu trực tiếp từ vựng học sinh đã dùng với từ vựng trong đáp án mẫu và sắc thái ngữ cảnh của chúng (ví dụ: '**登録する** vs **申し込む**: 登録する là đăng ký tài khoản/hệ thống, còn 申し込む là đăng ký tham gia sự kiện/khóa học').>",
  "correction": "<Câu tiếng Nhật đúng gợi ý hoàn chỉnh để sửa lại bài làm của học sinh, hoặc null nếu học sinh viết đúng hoàn toàn>",
  "grammarUsed": <true/false nếu học sinh có dùng đúng cấu trúc ngữ pháp ${grammarPattern}>
}

QUY TẮC CHẤM ĐIỂM (CỰC KỲ KHÁCH QUAN VÀ HỢP LÝ):
- 90-100: Câu viết hoàn hảo, đúng hoàn toàn cả về từ vựng, ngữ pháp và ngữ cảnh, có sử dụng chính xác mẫu ngữ pháp đang học.
- 70-89: Viết đúng ý, có sử dụng mẫu ngữ pháp đang học nhưng mắc lỗi nhỏ không nghiêm trọng (như sai nhẹ trợ từ, nhầm lẫn nhỏ về kanji hoặc cách chia thể động từ nhẹ).
- 50-69: Dịch đúng nghĩa tiếng Việt nhưng không sử dụng mẫu ngữ pháp đang học, hoặc sử dụng mẫu ngữ pháp nhưng mắc lỗi nghiêm trọng về cấu trúc liên kết.
- 30-49: Sai nhiều về cấu trúc ngữ pháp, diễn đạt lủng củng, dùng sai từ vựng quan trọng mặc dù vẫn hiểu được đại ý.
- 0-29: Sai hoàn toàn nghĩa của câu, không sử dụng mẫu ngữ pháp đang học và sai ngữ pháp tiếng Nhật cơ bản.

Chỉ trả về JSON hợp lệ.`;

    try {
        const responseText = await callAI(prompt, null, 'grammar_check');
        return parseJsonFromAI(responseText);
    } catch (e) {
        console.error('AI grammar check error:', e);
        return null;
    }
};

// ============== SENTENCE TRANSLATION ==============
export const aiTranslateSentence = async (japaneseText) => {
    if (!japaneseText || japaneseText.trim() === '') return null;
    const prompt = `Dịch câu/đoạn văn tiếng Nhật sau sang tiếng Việt tự nhiên và giải thích ngắn gọn các cấu trúc ngữ pháp và từ vựng chính.
VĂN BẢN TIẾNG NHẬT: "${japaneseText}"

Hãy trả về JSON (không markdown, không bọc ngoài bằng bất cứ gì khác):
{
  "translation": "<Bản dịch tiếng Việt tự nhiên, trau chuốt>",
  "grammarNotes": ["<Giải thích từ vựng hoặc cấu trúc chính 1>", "<Giải thích từ vựng hoặc cấu trúc chính 2>"]
}

Chỉ trả về JSON hợp lệ.`;

    try {
        const responseText = await callAI(prompt, null, 'sentence_translate');
        return parseJsonFromAI(responseText);
    } catch (e) {
        console.error('AI sentence translation error:', e);
        return null;
    }
};

// ============== KAIWA MULTI-TURN AGENT CALL ==============
export const callKaiwaAI = async (systemPrompt, conversationHistory = [], userMessage = '', forcedModel = null) => {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        throw new Error('Không có OpenRouter API key. Vui lòng thêm VITE_OPENROUTER_API_KEY vào file .env');
    }

    let activeModel = forcedModel;
    if (!activeModel) {
        try {
            const { loadAdminConfig } = await import('./adminSettings');
            const config = await loadAdminConfig();
            if (config?.aiFeatureModels?.kaiwa_agent) {
                activeModel = config.aiFeatureModels.kaiwa_agent;
            }
        } catch (e) {
            console.warn('Failed to load admin config for Kaiwa model:', e);
        }
    }
    if (!activeModel) {
        activeModel = 'google/gemini-2.5-flash';
    }
    activeModel = getEffectiveModel(activeModel);

    // Build message list
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];

    const callWithMessagesRetry = async (messagesList, keyIndex = 0, modelIndex = 0, preferredModel = null) => {
        const currentKey = keys[keyIndex];
        let models = [...OPENROUTER_MODELS];
        const effectivePreferred = getEffectiveModel(preferredModel);
        if (effectivePreferred) {
            models = [effectivePreferred, ...models.filter(m => m !== effectivePreferred)];
        }
        const currentModel = models[modelIndex];

        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Quizki Kaiwa'
            },
            body: JSON.stringify({
                model: currentModel,
                messages: messagesList,
                temperature: 0.7,
                max_tokens: 2048,
                response_format: { type: 'json_object' },
                provider: {
                    sort: 'price',
                    allow_fallbacks: true
                }
            })
        };

        try {
            const response = await fetch(url, options);
            if (response.ok) {
                const result = await response.json();
                const text = extractOpenRouterText(result);
                if (text) {
                    console.log(`✅ OpenRouter Kaiwa (${currentModel}) thành công!`);
                    return text;
                }
            }

            const status = response.status;
            if ((status === 429 || status === 503) && keyIndex < keys.length - 1) {
                console.log(`⚠️ OpenRouter Kaiwa key ${keyIndex + 1} rate limited, thử key ${keyIndex + 2}...`);
                await new Promise(r => setTimeout(r, 500));
                return callWithMessagesRetry(messagesList, keyIndex + 1, modelIndex, preferredModel);
            }
            if ((status === 429 || status === 503) && modelIndex < models.length - 1) {
                console.log(`⚠️ Hết quota cho ${currentModel}, thử ${models[modelIndex + 1]}...`);
                await new Promise(r => setTimeout(r, 500));
                return callWithMessagesRetry(messagesList, 0, modelIndex + 1, preferredModel);
            }
            if (status === 404 && modelIndex < models.length - 1) {
                console.log(`⚠️ Model ${currentModel} không tồn tại, thử ${models[modelIndex + 1]}...`);
                return callWithMessagesRetry(messagesList, keyIndex, modelIndex + 1, preferredModel);
            }

            const errorText = await response.text().catch(() => '');
            console.error(`❌ OpenRouter Kaiwa error (${status}):`, errorText);
            throw new Error(`OpenRouter API error: ${status}`);
        } catch (error) {
            if (error.message?.startsWith('OpenRouter API error')) throw error;
            console.error(`❌ OpenRouter Kaiwa network error:`, error.message);
            if (keyIndex < keys.length - 1) {
                return callWithMessagesRetry(messagesList, keyIndex + 1, modelIndex, preferredModel);
            }
            throw error;
        }
    };

    return callWithMessagesRetry(messages, 0, 0, activeModel);
};

// ============== WHISPER STT CALL ==============
export const callWhisperSTT = async (audioBlob) => {
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!groqKey && !openaiKey) {
        throw new Error('Thiếu API Key cho Whisper STT. Vui lòng cấu hình VITE_GROQ_API_KEY trong file .env');
    }

    const formData = new FormData();
    // Name the file 'audio.webm' or 'audio.wav' so the API maps the container type
    const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' });
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3'); // Whisper v3 on Groq
    formData.append('language', 'ja');

    let url = 'https://api.groq.com/openai/v1/audio/transcriptions';
    let apiKey = groqKey;

    if (openaiKey) {
        url = 'https://api.openai.com/v1/audio/transcriptions';
        apiKey = openaiKey;
        formData.set('model', 'whisper-1');
    }

    console.log(`🎙️ Sending speech to Whisper STT via ${openaiKey ? 'OpenAI' : 'Groq'}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('Whisper STT Error:', errText);
        throw new Error(`Whisper API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.log('🎙️ Whisper STT result:', data.text);
    return data.text || '';
};

// ============== OPENAI / AZURE TTS CALL ==============
export const callOpenAITTS = async (text, gender = 'female') => {
    const azureProxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

    // 1. Try Azure Speech Proxy first if configured (premium native Japanese voices)
    if (azureProxyUrl) {
        try {
            const baseProxy = azureProxyUrl.replace(/\/+$/, '');
            const azureVoiceName = gender === 'female' ? 'ja-JP-NanamiNeural' : 'ja-JP-KeitaNeural';
            const response = await fetch(baseProxy, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    voiceName: azureVoiceName
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            } else {
                console.warn(`Azure TTS Proxy error status: ${response.status}`);
            }
        } catch (error) {
            console.error('Azure TTS via Proxy failed, trying fallback:', error);
        }
    }

    // 2. Fallback to OpenAI TTS if key is configured
    if (openaiKey) {
        // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
        // Female options: nova, shimmer
        // Male options: onyx, echo
        const voice = gender === 'female' ? 'shimmer' : 'onyx';

        try {
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: voice
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            } else {
                throw new Error(`TTS API error: ${response.status}`);
            }
        } catch (error) {
            console.error('OpenAI TTS failed:', error);
        }
    }

    return null;
};

// ============== AI VERB NORMALIZATION TOOL ==============
export const aiNormalizeVerbs = async (verbsInput) => {
    if (!verbsInput) return null;
    const verbsList = Array.isArray(verbsInput) ? verbsInput : [verbsInput];
    
    const prompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật. Hãy chuẩn hoá các động từ tiếng Nhật đã bị chia ở các thể khác nhau dưới đây trở về thể từ điển (dictionary form - jishokei).
Danh sách động từ cần chuẩn hoá:
${verbsList.map((v, i) => `${i + 1}. ${v}`).join('\n')}

QUY TẮC PHẢN HỒI:
1. Hãy trả về kết quả dưới dạng JSON hợp lệ duy nhất, KHÔNG chứa thêm giải thích hay chữ thừa nào khác ngoài JSON block.
2. Cấu trúc JSON trả về là một mảng các đối tượng có định dạng sau:
[
  {
    "original": "Động từ đã chia gốc mà người dùng nhập vào",
    "dictionaryForm": "Thể từ điển của động từ đó (ví dụ: 行く, 食べる, 勉強する)",
    "reading": "Thể từ điển kèm cách đọc furigana định dạng '漢字（かんじ）' hoặc viết bằng Hiragana nếu không có Kanji (ví dụ: 行く（いく）, 食べる（たべる）)",
    "meaning": "Nghĩa tiếng Việt chính xác và ngắn gọn của động từ thể từ điển đó",
    "sinoVietnamese": "Âm Hán Việt viết hoa của động từ (ví dụ: HÀNH, THỰC, MIỄN CƯỜNG)",
    "pos": "Từ loại động từ, chỉ chọn 1 trong: 'verb' (động từ nhóm 1/2) hoặc 'suru_verb' (động từ nhóm 3/suru)",
    "level": "Cấp độ JLPT phù hợp nhất (N5, N4, N3, N2, N1)",
    "conjugation": "Tên tiếng Việt của thể/cách chia mà động từ gốc đang sử dụng (ví dụ: thể bị động sai khiến, thể lịch sự quá khứ ます, thể tiếp diễn ている)",
    "example": "Một câu ví dụ tiếng Nhật ngắn gọn sử dụng động từ đó (sử dụng thể từ điển hoặc thể đã chia, ưu tiên dạng hay dùng thực tế)",
    "exampleMeaning": "Dịch nghĩa tiếng Việt câu ví dụ trên"
  }
]
`;

    try {
        const responseText = await callAI(prompt, null, 'vocab_gen');
        const result = parseJsonFromAI(responseText);
        return result;
    } catch (e) {
        console.error('Error in aiNormalizeVerbs:', e);
        throw e;
    }
};

// ============== AI VERB SCANNER TOOL ==============
export const aiScanVerbsForNormalization = async (items) => {
    if (!items || items.length === 0) return [];
    
    const prompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật. Dưới đây là danh sách các mục từ vựng trong từ điển. Hãy quét và phát hiện các động từ đã bị chia thể hoặc các cụm từ chứa động từ chưa ở thể từ điển, sau đó gợi ý sửa chúng về thể từ điển gốc (Jishokei).

LƯU Ý QUAN TRỌNG:
1. Hãy bỏ qua (không sửa, gắn hành động là "bo_qua") các cụm từ giao tiếp (Kaiwa), từ chào hỏi, cụm cố định hoặc câu chúc phổ biến (ví dụ: "ありがとうございます", "こんにちは", "すみません", "おめでとうございます", "よろしくおねがいします", "ありがとうございます"). Đối với các cụm này, TUYỆT ĐỐI không đưa về thể từ điển.
2. Chỉ gợi ý sửa cho các động từ đơn hoặc cụm động từ thực sự bị chia và cần đưa về thể từ điển (ví dụ: "行きました" -> "行く", "食べさせる" -> "食べる", "勉強している" -> "勉強する").
3. Đối với mỗi mục từ, hãy trả về kết quả phân tích.

Danh sách từ vựng cần quét:
${items.map((it, i) => `${i + 1}. ID: ${it.id} | Chữ: ${it.front} | Nghĩa: ${it.back}`).join('\n')}

QUY TẮC PHẢN HỒI:
Trả về duy nhất một mảng JSON có định dạng sau:
[
  {
    "id": "ID tương ứng từ danh sách đầu vào",
    "front": "Từ gốc đầu vào",
    "action": "chon_sua" hoặc "bo_qua",
    "dictionaryForm": "Từ điển gốc gợi ý (ví dụ: 行く, 食べる) nếu action là chon_sua, còn lại để trống",
    "reading": "Cách đọc furigana gợi ý dạng '漢字（かんじ）' (ví dụ: 行く（いく）) nếu action là chon_sua, còn lại để trống",
    "meaning": "Nghĩa tiếng Việt của thể từ điển",
    "sinoVietnamese": "Âm Hán Việt",
    "reason": "Giải thích ngắn gọn lý do (ví dụ: thể bị động, cụm giao tiếp chào hỏi, đã là thể từ điển...)"
  }
]
`;

    try {
        const responseText = await callAI(prompt, null, 'vocab_gen');
        const result = parseJsonFromAI(responseText);
        return result || [];
    } catch (e) {
        console.error('Error in aiScanVerbsForNormalization:', e);
        throw e;
    }
};

// ============== AI FURIGANA FORMAT FIXER ==============
export const aiFixFuriganaFormat = async (items) => {
    if (!items || items.length === 0) return [];
    
    const prompt = `Bạn là một chuyên gia tiếng Nhật. Dưới đây là danh sách từ vựng có cách viết phiên âm/Furigana không chuẩn (ví dụ: thiếu phiên âm ở cuối, viết sai vị trí mở ngoặc hoặc lẫn lộn).
Hãy chuyển đổi/sửa các từ này về định dạng từ vựng tiếng Nhật chuẩn:
- Nếu từ có chứa chữ Hán (Kanji), định dạng chuẩn bắt buộc phải là: 'ChữHán漢字（かな）' ở cuối từ (ví dụ: '日本語（にほんご）', '勉強する（べんきょうする）').
- Không được đặt dấu ngoặc ở giữa từ (ví dụ: '勉強（べんきょう）する' phải chuyển thành '勉強する（べんきょうする）').
- Nếu từ thuần chữ Kana (Hiragana/Katakana) không có Kanji, thì giữ nguyên từ đó không cần ngoặc (ví dụ: 'あたま', 'カメラ').

Danh sách từ vựng cần sửa định dạng:
${items.map((it, i) => `${i + 1}. ID: ${it.id} | Chữ hiện tại: ${it.front} | Nghĩa: ${it.back || it.meaning || ''}`).join('\n')}

QUY TẮC PHẢN HỒI:
Trả về duy nhất một mảng JSON có định dạng sau:
[
  {
    "id": "ID tương ứng từ danh sách đầu vào",
    "front": "Từ gốc đầu vào",
    "dictionaryForm": "Từ vựng định dạng chuẩn (ví dụ: '勉強する（べんきょうする）' hoặc '日本語（にほんご）')",
    "reading": "Chỉ phần cách đọc Hiragana/Katakana (ví dụ: 'べんきょうする' hoặc 'にほんご')",
    "meaning": "Nghĩa tiếng Việt",
    "sinoVietnamese": "Âm Hán Việt tương ứng",
    "reason": "Giải thích ngắn gọn lỗi định dạng đã sửa (ví dụ: Chuyển ngoặc từ giữa về cuối, Thêm phiên âm bị thiếu...)"
  }
]
`;

    try {
        const responseText = await callAI(prompt, null, 'vocab_gen');
        const result = parseJsonFromAI(responseText);
        return result || [];
    } catch (e) {
        console.error('Error in aiFixFuriganaFormat:', e);
        throw e;
    }
};

// ============== AI RECREATE VOCABULARY ==============
export const aiRecreateVocabulary = async (item) => {
    if (!item) return null;
    
    const prompt = `Bạn là một chuyên gia tiếng Nhật kiêm biên dịch viên Nhật-Việt xuất sắc.
Dưới đây là một từ vựng đang bị lỗi hoặc thiếu thông tin trong hệ thống:
- Chữ Kanji/Kana gốc: ${item.front || ''}
- Nghĩa tiếng Việt: ${item.back || item.meaning || ''}
- Hán Việt: ${item.sinoVietnamese || ''}
- Part of Speech: ${item.pos || ''}
- Trình độ: ${item.level || ''}

Hãy dùng trí tuệ nhân tạo để sửa chữa, hoàn thiện và tạo lại từ vựng này thành một từ vựng tiếng Nhật chuẩn chỉnh, đầy đủ trường thông tin.

QUY TẮC PHÁN HỒI:
Trả về duy nhất một đối tượng JSON có định dạng sau:
{
  "front": "Từ gốc chuẩn hóa định dạng Kanji(Hiragana) hoặc Katakana, bắt buộc đặt ngoặc phiên âm ở cuối từ nếu chứa Kanji (ví dụ: '勉強する（べんきょうする）', '日本語（にほんご）', '美味しい（おいしい）'). Nếu thuần Kana thì không cần ngoặc (ví dụ: 'あたま', 'カメラ').",
  "back": "Nghĩa tiếng Việt chuẩn, gọn gàng, dịch đúng ngữ pháp/ngữ nghĩa. Nếu là cụm từ/câu dài, hãy dịch thoát ý nguyên cụm/câu thành một bản dịch tự nhiên duy nhất, tuyệt đối không tách rời hay liệt kê các nghĩa nhỏ phân cách bởi dấu chấm phẩy (;).",
  "sinoVietnamese": "Chữ Hán Việt viết hoa của từ (ví dụ: 'MIỄN CƯỜNG', 'NHẬT BẢN', 'MỸ VỊ'). Nếu từ không chứa Kanji thì để trống.",
  "pos": "Một trong các phân loại sau: 'noun', 'verb', 'adjective_i', 'adjective_na', 'adverb', 'pronoun', 'phrase', 'suru_verb'. Hãy chọn phân loại chính xác nhất.",
  "level": "Trình độ JLPT tương ứng của từ ('N5', 'N4', 'N3', 'N2', 'N1'), hoặc để trống nếu không rõ.",
  "nuance": "Giải thích ngắn gọn sắc thái hoặc ngữ cảnh sử dụng (ví dụ: Dùng lịch sự, Dùng thân mật, Chỉ cảm giác...), nếu không có thì để trống.",
  "example": "Một câu ví dụ bằng tiếng Nhật đơn giản, thực tế, có kèm ngoặc phiên âm ở cuối câu nếu chứa Kanji (ví dụ: '日本語を勉強する（にほんごをべんきょうする）。')",
  "exampleMeaning": "Nghĩa tiếng Việt của câu ví dụ.",
  "synonym": "Từ đồng nghĩa tiếng Nhật nếu có, cũng theo định dạng Kanji(Hiragana) hoặc để trống.",
  "synonymSinoVietnamese": "Hán Việt của từ đồng nghĩa viết hoa nếu có, hoặc để trống."
}
`;

    try {
        const responseText = await callAI(prompt, null, 'vocab_gen');
        const result = parseJsonFromAI(responseText);
        if (result) {
            if (result.front) {
                result.front = await ensureFuriganaFormat(result.front);
            }
            if (result.synonym) {
                result.synonym = await ensureFuriganaFormat(result.synonym);
            }
        }
        return result || null;
    } catch (e) {
        console.error('Error in aiRecreateVocabulary:', e);
        throw e;
    }
};

export const fetchPitchAccentWithAI = async (word) => {
    try {
        if (!word) return null;
        const cleanWord = word.split('（')[0].split('(')[0].trim();
        if (!cleanWord) return null;

        const prompt = `Bạn là chuyên gia tiếng Nhật. Hãy tìm cách đọc (Hiragana/Katakana) và cao độ (accent - một số nguyên biểu thị accent, ví dụ: 0 cho heiban, 1 cho atamadaka, 2 cho nakadaka, v.v.) của từ vựng dưới đây.
Từ vựng: "${cleanWord}"

Chỉ trả về duy nhất JSON theo định dạng sau (không viết markdown, không giải thích):
{"reading": "...", "accent": "..."}`;

        const responseText = await callAI(prompt, 'google/gemini-2.5-flash', 'vocab_sino_viet');
        if (!responseText) return null;
        
        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        
        return {
            reading: parsed.reading || null,
            accent: parsed.accent !== undefined && parsed.accent !== null ? String(parsed.accent) : null
        };
    } catch (e) {
        console.warn('Error fetching pitch accent with AI:', e);
        return null;
    }
};

export const fetchPitchAccentBatchWithAI = async (words) => {
    if (!words || words.length === 0) return {};
    try {
        const cleanWords = words.map(w => w.split('（')[0].split('(')[0].trim()).filter(Boolean);
        if (cleanWords.length === 0) return {};

        const prompt = `Bạn là chuyên gia tiếng Nhật. Hãy tìm cách đọc (Hiragana/Katakana) và cao độ (accent - một số nguyên biểu thị accent, ví dụ: 0 cho heiban, 1 cho atamadaka, 2 cho nakadaka, v.v.) của danh sách từ vựng dưới đây.
Danh sách từ vựng: ${JSON.stringify(cleanWords)}

Chỉ trả về duy nhất một đối tượng JSON với các khóa là các từ vựng và giá trị là cách đọc và accent tương ứng (không viết markdown, không giải thích):
{
  "từ_1": {"reading": "...", "accent": "..."},
  "từ_2": {"reading": "...", "accent": "..."}
}`;

        // Use google/gemini-3.1-flash-lite for maximum speed and lower latency
        const responseText = await callAI(prompt, 'google/gemini-3.1-flash-lite', 'vocab_sino_viet');
        if (!responseText) return {};
        
        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        
        const results = {};
        cleanWords.forEach(w => {
            const item = parsed[w];
            if (item) {
                results[w] = {
                    reading: item.reading || null,
                    accent: item.accent !== undefined && item.accent !== null ? String(item.accent) : null
                };
            }
        });
        return results;
    } catch (e) {
        console.warn('Error fetching batch pitch accent with AI:', e);
        return {};
    }
};
