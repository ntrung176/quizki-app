import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { callAI } from './aiProvider';

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
        console.error('Error fetching grammar notebooks from Firestore, using cache:', err);
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
        console.warn('Error fetching notebook by ID from Firestore:', e);
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
            console.error('Error saving notebook to Firestore:', e);
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
            console.error('Error deleting notebook from Firestore:', e);
        }
    }
    return true;
};

/**
 * AI Assistant for a single grammar pattern
 * Returns auto-generated { meaning, connection, usageScope, notes, examples }
 */
export const aiAssistGrammarPoint = async (pattern) => {
    if (!pattern || !pattern.trim()) {
        throw new Error('Vui lòng nhập mẫu ngữ pháp trước khi gọi AI.');
    }

    const prompt = `Bạn là một giáo viên sư phạm tiếng Nhật JLPT chuyên nghiệp (tác giả các bộ sách Shinkanzen Master, Soumatome, Try!).
Hãy phân tích và tự động điền thông tin chi tiết cho mẫu ngữ pháp tiếng Nhật sau:
"${pattern.trim()}"

YÊU CẦU:
1. meaning: Ý nghĩa súc tích, tự nhiên bằng tiếng Việt.
2. connection: Công thức kết nối chuẩn (Cách nối/接続) rõ ràng, sử dụng ký hiệu chuẩn (V-て, V-た, V-る, V-ない, N, A-い, A-な, v.v.).
3. usageScope: Phạm vi sử dụng (Khi nào dùng, sắc thái cảm xúc, văn viết hay văn nói, hạn chế đối tượng).
4. notes: Ghi chú quan trọng (Dễ nhầm với mẫu nào, mẹo ghi nhớ nhanh, bẫy thường gặp trong JLPT).
5. examples: Mảng gồm 2-3 câu ví dụ tiêu biểu (mỗi câu có 'ja' tiếng Nhật có furigana nếu cần hoặc Kanji chuẩn, và 'vi' dịch nghĩa tiếng Việt).

ĐỊNH DẠNG TRẢ VỀ:
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ, KHÔNG có thẻ markdown bọc ngoài (\`\`\`json), KHÔNG giải thích thêm:
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
            meaning: parsed.meaning || '',
            connection: parsed.connection || '',
            usageScope: parsed.usageScope || '',
            notes: parsed.notes || '',
            examples: Array.isArray(parsed.examples) ? parsed.examples : []
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

    const prompt = `Bạn là một giáo viên sư phạm tiếng Nhật JLPT chuyên nghiệp.
Hãy tạo danh sách khoảng ${count} mẫu ngữ pháp tiếng Nhật dựa trên chủ đề hoặc văn bản sau:
"${topicOrText.trim()}"

Mỗi mẫu ngữ pháp cần đầy đủ các trường:
- pattern: Mẫu ngữ pháp tiếng Nhật (VD: 〜てから, 〜うちに)
- meaning: Ý nghĩa tiếng Việt súc tích
- connection: Cách kết nối công thức (VD: V-て + から)
- usageScope: Phạm vi sử dụng & sắc thái
- notes: Ghi chú mẹo nhớ / lưu ý
- examples: Mảng 1-2 câu ví dụ gồm { "ja": "câu tiếng Nhật", "vi": "dịch tiếng Việt" }

ĐỊNH DẠNG TRẢ VỀ:
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ là một mảng [] các object:
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
        return parsed;
    } catch (e) {
        console.error('Failed to parse batch AI response:', clean, e);
        throw new Error('Không thể phân tích danh sách từ AI. Vui lòng thử lại.');
    }
};

