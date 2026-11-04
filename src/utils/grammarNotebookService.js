import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { callAI } from './aiProvider';
import { updateCachedUserGrammarSrs } from './grammarService';

const stripHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
};

const LOCAL_STORAGE_KEY_PREFIX = 'quizki_grammar_notebooks_';

/**
 * Get local storage cache key for a user
 */
const getCacheKey = (userId) => `${LOCAL_STORAGE_KEY_PREFIX}${userId || 'guest'}`;

/**
 * Read cached notebooks from LocalStorage
 */
export const getCachedGrammarNotebooks = (userId) => {
    try {
        const raw = localStorage.getItem(getCacheKey(userId));
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn('Error reading cached grammar notebooks:', e);
        return [];
    }
};

/**
 * Write notebooks to LocalStorage cache
 */
export const setCachedGrammarNotebooks = (userId, notebooks) => {
    try {
        localStorage.setItem(getCacheKey(userId), JSON.stringify(notebooks || []));
    } catch (e) {
        console.warn('Error saving cached grammar notebooks:', e);
    }
};

/**
 * Fetch all grammar notebooks for a user (LocalStorage first, then Firestore)
 */
export const getGrammarNotebooks = async (userId) => {
    const cached = getCachedGrammarNotebooks(userId);
    if (!userId) return cached;

    try {
        const colPath = `artifacts/${appId}/users/${userId}/grammarNotebooks`;
        const snap = await getDocs(collection(db, colPath));
        const list = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt || Date.now(),
            updatedAt: d.data().updatedAt?.toMillis?.() || d.data().updatedAt || Date.now()
        }));

        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setCachedGrammarNotebooks(userId, list);
        return list;
    } catch (err) {
        if (err?.code !== 'permission-denied') {
            console.warn('Error fetching grammar notebooks from Firestore, using cache:', err);
        }
        return cached;
    }
};

/**
 * Fetch a single notebook by ID
 */
export const getGrammarNotebookById = async (userId, notebookId) => {
    const cached = getCachedGrammarNotebooks(userId);
    const fromCache = cached.find(nb => nb.id === notebookId);

    if (!userId) return fromCache || null;

    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/grammarNotebooks`, notebookId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return {
                id: snap.id,
                ...snap.data(),
                createdAt: snap.data().createdAt?.toMillis?.() || snap.data().createdAt || Date.now(),
                updatedAt: snap.data().updatedAt?.toMillis?.() || snap.data().updatedAt || Date.now()
            };
        }
    } catch (e) {
        if (e?.code !== 'permission-denied') {
            console.warn('Error fetching notebook by ID from Firestore:', e);
        }
    }

    return fromCache || null;
};

/**
 * Create or update a grammar notebook
 */
export const saveGrammarNotebook = async (userId, notebookData) => {
    const id = notebookData.id || `nb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const cleanedItems = (notebookData.items || []).map((item, idx) => ({
        id: item.id || `item_${Date.now()}_${idx}`,
        pattern: (item.pattern || '').trim(),
        meaning: (item.meaning || '').trim(),
        connection: (item.connection || '').trim(),
        usageScope: (item.usageScope || '').trim(),
        notes: (item.notes || '').trim(),
        examples: (item.examples || []).map(ex => ({
            ja: (ex.ja || '').trim(),
            vi: (ex.vi || '').trim()
        })).filter(ex => ex.ja || ex.vi)
    }));

    const finalNotebook = {
        ...notebookData,
        id,
        title: (notebookData.title || 'Sổ tay chưa đặt tên').trim(),
        description: (notebookData.description || '').trim(),
        items: cleanedItems,
        updatedAt: now,
        createdAt: notebookData.createdAt || now
    };

    // Update LocalStorage cache immediately for snappy UI
    const cached = getCachedGrammarNotebooks(userId);
    const existingIdx = cached.findIndex(nb => nb.id === id);
    let nextList = [];
    if (existingIdx >= 0) {
        nextList = [...cached];
        nextList[existingIdx] = finalNotebook;
    } else {
        nextList = [finalNotebook, ...cached];
    }
    setCachedGrammarNotebooks(userId, nextList);

    // Sync to Firestore
    if (userId) {
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/grammarNotebooks`, id);
            await setDoc(docRef, {
                ...finalNotebook,
                updatedAt: serverTimestamp(),
                createdAt: notebookData.createdAt ? notebookData.createdAt : serverTimestamp()
            }, { merge: true });
        } catch (e) {
            if (e?.code !== 'permission-denied') {
                console.warn('Error saving notebook to Firestore:', e);
            }
        }
    }

    return finalNotebook;
};

/**
 * Delete a grammar notebook
 */
export const deleteGrammarNotebook = async (userId, notebookId) => {
    // Update local cache
    const cached = getCachedGrammarNotebooks(userId);
    const nextList = cached.filter(nb => nb.id !== notebookId);
    setCachedGrammarNotebooks(userId, nextList);

    if (userId) {
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/grammarNotebooks`, notebookId);
            await deleteDoc(docRef);
        } catch (e) {
            if (e?.code !== 'permission-denied') {
                console.warn('Error deleting notebook from Firestore:', e);
            }
        }
    }
    return true;
};

/**
 * AI Assistant for a single grammar pattern
 * Returns auto-generated { meaning, connection, usageScope, notes, examples }
 * If meaningHint is provided, strictly matches that exact usage/meaning of the pattern
 * Strictly concise, non-verbose, clean formatted
 */
export const aiAssistGrammarPoint = async (pattern, meaningHint = '') => {
    if (!pattern || !pattern.trim()) {
        throw new Error('Vui lòng nhập mẫu ngữ pháp trước khi gọi AI.');
    }

    const trimmedPattern = pattern.trim();
    const trimmedMeaning = (meaningHint || '').trim();

    // 1. Search local curriculum database for reference if available
    let dbMatchInfo = '';
    try {
        const { getSharedGrammarData } = await import('./grammarService');
        const allData = await getSharedGrammarData().catch(() => null);
        if (Array.isArray(allData)) {
            const cleanPat = trimmedPattern.replace(/[〜~～]/g, '').trim().toLowerCase();
            const matches = [];
            for (const tb of allData) {
                for (const ls of tb.lessons || []) {
                    for (const pt of ls.points || []) {
                        const ptClean = (pt.title || pt.pattern || '').replace(/[〜~～]/g, '').trim().toLowerCase();
                        if (ptClean === cleanPat || ptClean.includes(cleanPat) || cleanPat.includes(ptClean)) {
                            matches.push(pt);
                        }
                    }
                }
            }

            if (matches.length > 0) {
                let bestMatch = null;
                if (trimmedMeaning) {
                    const mClean = trimmedMeaning.toLowerCase();
                    bestMatch = matches.find(m => 
                        (m.meaning || '').toLowerCase().includes(mClean) || 
                        (m.meaningShort || '').toLowerCase().includes(mClean) ||
                        mClean.split(/\s+/).some(w => w.length > 2 && (m.meaning || '').toLowerCase().includes(w))
                    );
                }
                const targetMatch = bestMatch || matches[0];
                if (targetMatch) {
                    dbMatchInfo = `\n[TÀI LIỆU GIÁO TRÌNH CHUẨN ĐÃ LƯU]:
- Mẫu: ${targetMatch.title || targetMatch.pattern || ''}
- Ý nghĩa: ${targetMatch.meaningShort || targetMatch.meaning || ''}
- Cấu trúc/Kết nối: ${targetMatch.structureRaw || (Array.isArray(targetMatch.connection) ? targetMatch.connection.join(' / ') : targetMatch.connection || '')}
- Giải thích/Cách dùng: ${targetMatch.meaningFull || targetMatch.explanation || ''}
`;
                }
            }
        }
    } catch (_) {}

    const meaningInstruction = trimmedMeaning ? `
⚠️ QUAN TRỌNG NHẤT: NGƯỜI DÙNG ĐÃ CHỈ ĐỊNH Ý NGHĨA CỤ THỂ MUỐN TẠO LÀ: "${trimmedMeaning}"
Một mẫu ngữ pháp tiếng Nhật có thể có nhiều cách sử dụng hoặc sắc thái khác nhau. Vì người dùng đã nhập ý nghĩa cụ thể, bạn BẮT BUỘC phải:
1. "meaning": Giữ hoặc trau chuốt chuẩn xác theo đúng ý nghĩa "${trimmedMeaning}" mà người dùng yêu cầu (dưới 15 từ, ngắn gọn).
2. "connection": Đưa ra công thức kết nối (cách chia động từ/tính từ/danh từ) CỦA ĐÚNG CÁCH DÙNG NÀY.
3. "usageScope": Nêu rõ phạm vi và sắc thái sử dụng CỦA ĐÚNG CÁCH DÙNG NÀY (khi nào dùng, hạn chế vế sau, sắc thái cảm xúc...).
4. "notes": Ghi chú, mẹo nhớ hoặc phân biệt với mẫu tương đồng cho ĐÚNG CÁCH DÙNG NÀY.
5. "examples": BẮT BUỘC 2 câu ví dụ tiếng Nhật và bản dịch tiếng Việt PHẢI MINH HOẠ ĐÚNG Ý NGHĨA "${trimmedMeaning}" (TUYỆT ĐỐI không lấy ví dụ của cách dùng khác).
` : `
Nếu không có ý nghĩa cụ thể đi kèm, hãy chọn cách dùng phổ biến và trọng tâm nhất trong kỳ thi JLPT của mẫu ngữ pháp "${trimmedPattern}".
`;

    const prompt = `Bạn là giáo viên sư phạm tiếng Nhật JLPT chuyên nghiệp.
Hãy soạn nội dung chuẩn, ngắn gọn, súc tích cho mẫu ngữ pháp: "${trimmedPattern}".
${trimmedMeaning ? `- Ý nghĩa người dùng yêu cầu: "${trimmedMeaning}"` : ''}
${dbMatchInfo}
${meaningInstruction}

QUY TẮC BẮT BUỘC (CỰC KỲ QUAN TRỌNG):
1. meaning: Ý nghĩa tiếng Việt cốt lõi, ngắn gọn nhất (chỉ 1 câu, dưới 15 từ, tự nhiên, dễ hiểu, TUYỆT ĐỐI không viết dài dòng). ${trimmedMeaning ? `Bám sát ý nghĩa: "${trimmedMeaning}".` : ''}
2. connection: Công thức kết nối TỐI GIẢN, GỌN GÀNG NHẤT. Dùng dấu gạch chéo '/' để gom các thể từ loại. TUYỆT ĐỐI KHÔNG lặp lại tên mẫu ngữ pháp nhiều lần.
   - Ví dụ ĐÚNG: "V-る / V-ない / Nの / A-い / A-な + うちに"
   - Ví dụ SAI BỊ CẤM: "Vる + うちに Nの + うちに Aい + うちに..."
3. usageScope: Tối đa 1-2 câu ngắn, nêu thẳng vào tình huống dùng cốt lõi nhất của đúng cách dùng này.
4. notes: Mẹo nhớ hoặc lưu ý ngắn (tối đa 1 câu dưới 20 từ. Để trống "" nếu không có).
5. examples: Đúng 2 câu ví dụ ngắn, giao tiếp thực tế đời thường. 'ja' là tiếng Nhật có kanji kèm furigana trong ngoặc đơn nếu có chữ khó ví dụ: '若(わか)い'. 'vi' là dịch nghĩa tiếng Việt tự nhiên và PHẢI DỊCH THEO ĐÚNG Ý NGHĨA YÊU CẦU. TUYỆT ĐỐI KHÔNG chứa bất kỳ thẻ HTML nào như <b>, </b>, <i>.

ĐỊNH DẠNG TRẢ VỀ:
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ, KHÔNG có thẻ markdown bọc ngoài (\`\`\`json):
{
  "meaning": "...",
  "connection": "...",
  "usageScope": "...",
  "notes": "...",
  "examples": [
    { "ja": "...", "vi": "..." }
  ]
}`;

    const res = await callAI(prompt, null, 'grammar-notebook-ai');
    if (!res) throw new Error('Không nhận được phản hồi từ AI.');

    let clean = res.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    clean = clean.trim();

    try {
        const parsed = JSON.parse(clean);
        return {
            meaning: stripHtml(parsed.meaning || ''),
            connection: stripHtml(parsed.connection || ''),
            usageScope: stripHtml(parsed.usageScope || ''),
            notes: stripHtml(parsed.notes || ''),
            examples: Array.isArray(parsed.examples)
                ? parsed.examples.map(ex => ({
                    ja: stripHtml(ex.ja || ''),
                    vi: stripHtml(ex.vi || '')
                })).filter(ex => ex.ja || ex.vi)
                : []
        };
    } catch (e) {
        console.error('Failed to parse AI grammar response:', clean, e);
        throw new Error('Không thể phân tích phản hồi từ AI. Vui lòng thử lại.');
    }
};

/**
 * AI Batch Generator for a topic or raw list
 */
export const aiBatchGenerateGrammarNotebook = async (topicOrText, count = 5) => {
    if (!topicOrText || !topicOrText.trim()) {
        throw new Error('Vui lòng nhập chủ đề hoặc văn bản.');
    }

    const prompt = `Bạn là giáo viên sư phạm tiếng Nhật JLPT chuyên nghiệp.
Hãy tạo danh sách khoảng ${count} mẫu ngữ pháp tiếng Nhật dựa trên chủ đề hoặc văn bản sau:
"${topicOrText.trim()}"

QUY TẮC BẮT BUỘC:
- pattern: Mẫu ngữ pháp tiếng Nhật (VD: 〜てから, 〜うちに)
- meaning: Ý nghĩa tiếng Việt cốt lõi, ngắn gọn (chỉ 1 câu, dưới 15 từ)
- connection: Công thức tối giản, gom thể bằng '/' (VD: "V-る / V-ない / Nの + うちに"), TUYỆT ĐỐI KHÔNG lặp lại tên mẫu ngữ pháp
- usageScope: Tối đa 1-2 câu ngắn gọn
- notes: Tối đa 1 câu ngắn hoặc để trống ""
- examples: 1-2 câu ví dụ ngắn, thực tế, KHÔNG chứa bất kỳ thẻ HTML nào (<b>, </b>)

ĐỊNH DẠNG TRẢ VỀ:
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ là một mảng [] các object, KHÔNG có thẻ markdown:
[
  {
    "pattern": "...",
    "meaning": "...",
    "connection": "...",
    "usageScope": "...",
    "notes": "...",
    "examples": [
      { "ja": "...", "vi": "..." }
    ]
  }
]`;

    const res = await callAI(prompt, null, 'grammar-notebook-batch');
    if (!res) throw new Error('Không nhận được phản hồi từ AI.');

    let clean = res.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    clean = clean.trim();

    try {
        const parsed = JSON.parse(clean);
        if (!Array.isArray(parsed)) throw new Error('Dữ liệu trả về không phải là mảng.');
        return parsed.map(item => ({
            pattern: stripHtml(item.pattern || ''),
            meaning: stripHtml(item.meaning || ''),
            connection: stripHtml(item.connection || ''),
            usageScope: stripHtml(item.usageScope || ''),
            notes: stripHtml(item.notes || ''),
            examples: Array.isArray(item.examples)
                ? item.examples.map(ex => ({
                    ja: stripHtml(ex.ja || ''),
                    vi: stripHtml(ex.vi || '')
                })).filter(ex => ex.ja || ex.vi)
                : []
        }));
    } catch (e) {
        console.error('Failed to parse batch AI response:', clean, e);
        throw new Error('Không thể phân tích danh sách từ AI. Vui lòng thử lại.');
    }
};

/**
 * Toggle saving a notebook grammar item to SRS
 */
export const toggleNotebookItemSrs = async (userId, item, notebookTitle, isCurrentlyBookmarked) => {
    if (!userId || !item || !item.id) return false;
    const srsDocRef = doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, item.id);
    const nextState = !isCurrentlyBookmarked;

    if (nextState) {
        const now = Date.now();
        const payload = {
            id: item.id,
            pattern: item.pattern,
            meaning: item.meaning,
            meaningShort: item.meaning,
            connection: item.connection || '',
            structure: item.connection || '',
            usageScope: item.usageScope || '',
            notes: item.notes || '',
            examples: item.examples || [],
            textbookTitle: notebookTitle || 'Sổ tay ngữ pháp',
            lessonTitle: 'Sổ tay',
            level: 'Custom',
            isNotebookPoint: true,
            interval: 0,
            ease: 2.5,
            nextReview: now,
            lastReview: now,
            reps: 0,
            learningStep: null,
            isLapsed: false,
            lapseCount: 0,
            prelapseInterval: null,
            state: 'NEW'
        };

        // 1. Optimistic 0ms cache update so UI and review tabs react instantly
        updateCachedUserGrammarSrs(userId, item.id, payload);

        // 2. Background Firestore sync
        try {
            await setDoc(srsDocRef, payload, { merge: true });
        } catch (err) {
            console.warn('[toggleNotebookItemSrs] Cloud sync fallback:', err?.message || err);
        }

        const today = new Date().toISOString().split('T')[0];
        setDoc(doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, today), {
            newGrammarAdded: increment(1)
        }, { merge: true }).catch(() => {});
    } else {
        // 1. Optimistic removal
        updateCachedUserGrammarSrs(userId, item.id, null);

        // 2. Background deletion
        try {
            await deleteDoc(srsDocRef);
        } catch (err) {
            console.warn('[toggleNotebookItemSrs] Cloud delete fallback:', err?.message || err);
        }
    }

    return nextState;
};

/**
 * Save all grammar items of a notebook to SRS in a single batch
 */
export const saveAllNotebookItemsToSrs = async (userId, items, notebookTitle) => {
    if (!userId || !items || items.length === 0) return 0;
    const batch = writeBatch(db);
    const now = Date.now();
    let count = 0;

    items.forEach(item => {
        if (!item || !item.pattern || !item.meaning) return;
        const ref = doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, item.id);
        const payload = {
            id: item.id,
            pattern: item.pattern,
            meaning: item.meaning,
            meaningShort: item.meaning,
            connection: item.connection || '',
            structure: item.connection || '',
            usageScope: item.usageScope || '',
            notes: item.notes || '',
            examples: item.examples || [],
            textbookTitle: notebookTitle || 'Sổ tay ngữ pháp',
            lessonTitle: 'Sổ tay',
            level: 'Custom',
            isNotebookPoint: true,
            interval: 0,
            ease: 2.5,
            nextReview: now,
            lastReview: now,
            reps: 0,
            learningStep: null,
            isLapsed: false,
            lapseCount: 0,
            prelapseInterval: null,
            state: 'NEW'
        };
        batch.set(ref, payload, { merge: true });
        // Optimistic cache update immediately for each item
        updateCachedUserGrammarSrs(userId, item.id, payload);
        count++;
    });

    if (count > 0) {
        try {
            await batch.commit();
            const today = new Date().toISOString().split('T')[0];
            setDoc(doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, today), {
                newGrammarAdded: increment(count)
            }, { merge: true }).catch(() => {});
        } catch (err) {
            console.warn('[saveAllNotebookItemsToSrs] Batch commit fallback:', err?.message || err);
        }
    }

    return count;
};

