import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { SEED_KAIWA_VIDEOS } from '../components/kaiwa/videoKaiwaConstants';
import { callAI, callKaiwaAI, parseJsonFromAI } from '../utils/aiProvider';

const KAIWA_COLLECTION = `artifacts/${appId}/kaiwaVideos`;
const CACHE_KEY = 'quizki_kaiwa_videos_cache';

// Extract YouTube Video ID from any standard URL, short link, or embed URL
export const extractYoutubeId = (url) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    // Direct ID check (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;

    // Regex for youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const MOCK_SEED_IDS = new Set(['kaigo_leverage_01', 'konbini_daily_02', 'business_meeting_03']);

// Fetch all Kaiwa videos (Firestore only, purging mock data)
export const getKaiwaVideos = async () => {
    try {
        const q = collection(db, KAIWA_COLLECTION);
        const snapshot = await getDocs(q);

        let firestoreVideos = [];
        if (!snapshot.empty) {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (!MOCK_SEED_IDS.has(docSnap.id)) {
                    firestoreVideos.push({ id: docSnap.id, ...data });
                }
            });
        }

        const finalVideos = firestoreVideos;

        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(finalVideos));
        } catch (e) {
            console.warn('Failed to cache kaiwa videos in localStorage:', e);
        }

        return finalVideos;
    } catch (error) {
        console.warn('Error loading kaiwa videos from Firestore, fallback to cache:', error);
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                return parsed.filter(v => !MOCK_SEED_IDS.has(v.id));
            }
        } catch (e) {
            console.warn('Cache read error:', e);
        }
        return [];
    }
};

// Save or Update a Kaiwa Video (Admin only)
export const saveKaiwaVideo = async (videoData) => {
    if (!videoData.id) {
        videoData.id = `video_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    videoData.updatedAt = new Date().toISOString();
    if (!videoData.createdAt) {
        videoData.createdAt = new Date().toISOString();
    }

    // 1. Update local cache immediately so data is always accessible instantly
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        let list = cached ? JSON.parse(cached).filter(v => !MOCK_SEED_IDS.has(v.id)) : [];
        const existingIdx = list.findIndex(v => v.id === videoData.id);
        if (existingIdx >= 0) {
            list[existingIdx] = videoData;
        } else {
            list.unshift(videoData);
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('Cache update error:', e);
    }

    // 2. Persist to Firestore
    try {
        const docRef = doc(db, KAIWA_COLLECTION, videoData.id);
        await setDoc(docRef, videoData, { merge: true });
    } catch (firestoreErr) {
        console.warn('Firestore write permission error (saved to local cache):', firestoreErr);
        // Note: If permissions fail, the video is still safely preserved in localStorage cache
    }

    return videoData;
};

// Delete a Kaiwa Video (Admin only)
export const deleteKaiwaVideo = async (videoId) => {
    // 1. Update cache first
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const list = JSON.parse(cached).filter(v => v.id !== videoId);
            localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        }
    } catch (e) {
        console.warn('Cache delete error:', e);
    }

    // 2. Delete from Firestore
    try {
        const docRef = doc(db, KAIWA_COLLECTION, videoId);
        await deleteDoc(docRef);
    } catch (firestoreErr) {
        console.warn('Firestore delete error:', firestoreErr);
    }
};

// Parse Time string into total seconds (supports "0:01", "00:01", "01:23.456", "01:02:03", etc.)
export const parseTimeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const clean = timeStr.trim().replace(/[\[\]\(\)]/g, '').replace(',', '.');
    const parts = clean.split(':');
    if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    } else if (parts.length === 1) {
        return parseFloat(parts[0]) || 0;
    }
    return 0;
};

// Universal Subtitle & Transcript Parser: Supports SRT, VTT, and timestamped text documents like [0:01]: Text
export const parseTextToSubtitles = (content) => {
    if (!content || typeof content !== 'string') return [];

    // Normalize line endings
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!normalized) return [];

    const results = [];
    let count = 1;

    // 1. Check if it's standard SRT / VTT with `-->`
    if (normalized.includes('-->')) {
        const blocks = normalized.split(/\n\s*\n/);
        blocks.forEach(block => {
            const lines = block.trim().split('\n').filter(Boolean);
            if (lines.length >= 2) {
                let timeLine = lines[0];
                let textLines = lines.slice(1);

                if (!timeLine.includes('-->') && lines.length >= 3) {
                    timeLine = lines[1];
                    textLines = lines.slice(2);
                }

                if (timeLine.includes('-->')) {
                    const [startStr, endStr] = timeLine.split('-->');
                    const start = parseTimeToSeconds(startStr);
                    const end = parseTimeToSeconds(endStr);
                    const fullText = textLines.join(' ').replace(/\[音楽\]|\[Music\]/gi, '').trim();

                    if (fullText && end > start) {
                        results.push({
                            id: count++,
                            start: Math.round(start * 10) / 10,
                            end: Math.round(end * 10) / 10,
                            ja: fullText,
                            furigana: fullText,
                            vi: '',
                            keywords: [],
                            grammar: []
                        });
                    }
                }
            }
        });

        if (results.length > 0) return results;
    }

    // 2. Check line-by-line for timestamped transcript or document format
    // Matches: [0:01]: Text, [00:01] Text, 0:01: Text, 0:01 - Text, 01:23 Text, (0:01) Text
    const timeLineRegex = /^\s*[\[\(]?\s*(\d{1,2}(?::\d{1,2}){1,2}(?:[.,]\d{1,3})?)\s*[\]\)]?\s*[:\-\s]?\s*(.*)$/;
    const rawLines = normalized.split('\n');
    const parsedEntries = [];

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        const match = line.match(timeLineRegex);
        if (match) {
            const timeStr = match[1];
            let text = match[2]?.trim() || '';

            // If text is empty on the same line, check if the next line is the text (YouTube transcript two-line format)
            if (!text && i + 1 < rawLines.length) {
                const nextLine = rawLines[i + 1].trim();
                if (nextLine && !nextLine.match(timeLineRegex)) {
                    text = nextLine;
                    i++; // skip next line as it was consumed
                }
            }

            // Clean noise markers like [音楽] or [Music]
            text = text.replace(/\[音楽\]|\[Music\]/gi, '').trim();

            // Ignore lines that are only punctuation or numbers
            if (text && !/^[。、\.\,\s\d]+$/.test(text)) {
                const startSec = parseTimeToSeconds(timeStr);
                parsedEntries.push({
                    start: startSec,
                    text: text
                });
            }
        }
    }

    if (parsedEntries.length > 0) {
        // Calculate realistic end times
        for (let i = 0; i < parsedEntries.length; i++) {
            const entry = parsedEntries[i];
            const start = entry.start;
            let end;

            if (i < parsedEntries.length - 1) {
                const nextStart = parsedEntries[i + 1].start;
                if (nextStart > start) {
                    end = nextStart;
                } else {
                    end = start + Math.min(Math.max(entry.text.length * 0.35, 3), 8);
                }
            } else {
                end = start + Math.min(Math.max(entry.text.length * 0.35, 4), 10);
            }

            if (end <= start) end = start + 3;

            results.push({
                id: count++,
                start: Math.round(start * 10) / 10,
                end: Math.round(end * 10) / 10,
                ja: entry.text,
                furigana: entry.text,
                vi: '',
                keywords: [],
                grammar: []
            });
        }

        return results;
    }

    // 3. Fallback: Plain text sentences (split by lines or Japanese periods)
    const sentences = normalized
        .split(/[\n\r]+/)
        .map(s => s.trim().replace(/\[音楽\]|\[Music\]/gi, ''))
        .filter(s => s.length > 0 && !/^[。、\.\,\s\d]+$/.test(s));

    if (sentences.length > 0) {
        let currentTime = 0;
        sentences.forEach(sent => {
            const duration = Math.min(Math.max(sent.length * 0.35, 3.5), 8);
            results.push({
                id: count++,
                start: Math.round(currentTime * 10) / 10,
                end: Math.round((currentTime + duration) * 10) / 10,
                ja: sent,
                furigana: sent,
                vi: '',
                keywords: [],
                grammar: []
            });
            currentTime += duration;
        });
    }

    return results;
};

// Backward-compatible alias
export const parseSrtToSubtitles = parseTextToSubtitles;

// Use AI to generate Furigana, Vietnamese Translation & Vocab from raw Japanese Transcript (supports chunking for any list size)
export const generateAiSubtitles = async (rawJapaneseTextOrSubtitles, topicContext = '', onProgress = null, abortRef = { current: false }) => {
    // Helper to call AI with OpenRouter -> Google Gemini fallback
    const executeAiPrompt = async (prompt) => {
        try {
            const aiResponse = await callKaiwaAI(prompt, [], 'Trả về mảng JSON phụ đề dịch nghĩa và furigana.');
            const parsed = parseJsonFromAI(aiResponse);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            console.warn('callKaiwaAI failed, trying direct callAI fallback...', e?.message);
        }
        // Direct callAI fallback
        const aiResponse = await callAI(prompt, null, 'kaiwa_agent');
        const parsed = parseJsonFromAI(aiResponse);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        throw new Error('Không thể phân tích dữ liệu JSON từ phản hồi AI.');
    };

    // If input is an array of subtitles (e.g. from SRT upload or existing subtitle list)
    if (Array.isArray(rawJapaneseTextOrSubtitles)) {
        const items = [...rawJapaneseTextOrSubtitles];
        const total = items.length;
        const BATCH_SIZE = 8; // Process 8 sentences per request for fast & high-precision extraction
        const updatedList = [...items];

        for (let i = 0; i < total; i += BATCH_SIZE) {
            if (abortRef.current) {
                console.log('AI Subtitle generation aborted by user.');
                break;
            }

            const chunk = items.slice(i, i + BATCH_SIZE);
            const chunkPromptData = chunk.map(c => ({
                id: c.id,
                ja: c.ja
            }));

            const prompt = `Bạn là chuyên gia ngôn ngữ tiếng Nhật và biên dịch viên phụ đề chuyên nghiệp (Japanese -> Vietnamese).
Nhiệm vụ: Hãy phân tích kỹ từng câu thoại tiếng Nhật sau:
1. Gán Furigana cho TẤT CẢ chữ Hán (Kanji) theo cú pháp chuẩn: {Kanji|furigana} (Ví dụ: {皆|みな}さん, {元気|げんき}ですか, {自然|しぜん}な, {考|かんが}えると). TUYỆT ĐỐI KHÔNG tự ý chèn thêm khoảng trắng giữa các từ tiếng Nhật hoặc trong cú pháp furigana.
2. Dịch nghĩa tiếng Việt tự nhiên, mượt mà và chuẩn xác theo ngữ cảnh hội thoại vào trường "vi" (BẮT BUỘC có bản dịch tiếng Việt, KHÔNG để trống).
3. TRÍCH XUẤT CHI TIẾT TỪ VỰNG & CỤM TỪ (KEYWORDS) - RẤT QUAN TRỌNG:
   - Trích xuất ĐẦY ĐỦ từ 2 đến 6 từ vựng cốt lõi, động từ (dạng từ điển hoặc cụm phổ biến: 考える, 聞き取る, 練習する, 話し合う), tính từ (自然な, 難しい), danh từ ghép/cụm danh từ (リスニング, 日本語, 練習), phó từ (実は, だんだん), và các cụm quán ngữ giao tiếp quan trọng xuất hiện trong câu vào mảng "keywords".
   - Mục đích: Giúp học viên khi rê chuột/hover vào bất kỳ từ/cụm từ nào trong câu thoại đều được hiển thị giải nghĩa tiếng Việt chi tiết.
   - Mỗi item trong keywords phải gồm:
     * "word": từ vựng/cụm từ dạng Kanji/Kana chuẩn (VD: "考える", "自然な", "皆さん", "日本語", "聞き取る")
     * "reading": cách đọc Hiragana chuẩn (VD: "かんがえる", "しぜんな", "みなさん", "にほんご", "ききとる")
     * "meaning": nghĩa tiếng Việt súc tích, dễ hiểu theo đúng ngữ cảnh câu (VD: "suy nghĩ, cân nhắc", "tự nhiên", "mọi người", "tiếng Nhật", "nghe hiểu")
     * "level": cấp độ JLPT ("N5", "N4", "N3", "N2", "N1")
4. Trích xuất mẫu ngữ pháp quan trọng (nếu có) vào mảng "grammar": [{ "point": "...", "meaning": "...", "level": "N3" }].

Chủ đề video: ${topicContext || 'Hội thoại giao tiếp tiếng Nhật'}

Dữ liệu đầu vào:
${JSON.stringify(chunkPromptData, null, 2)}

BẮT BUỘC trả về ĐÚNG 1 mảng JSON thuần (KHÔNG kèm markdown ngoài JSON):
[
  {
    "id": 1,
    "furigana": "{皆|みな}さん、{自然|しぜん}な{日本語|にほんご}を{一緒|いっしょ}に{考|かんが}えましょう！",
    "vi": "Mọi người ơi, hãy cùng nhau suy nghĩ về tiếng Nhật tự nhiên nhé!",
    "keywords": [
      { "word": "皆さん", "reading": "みなさん", "meaning": "mọi người, các bạn", "level": "N5" },
      { "word": "自然な", "reading": "しぜんな", "meaning": "tự nhiên", "level": "N3" },
      { "word": "日本語", "reading": "にほんご", "meaning": "tiếng Nhật", "level": "N5" },
      { "word": "一緒に", "reading": "いっしょに", "meaning": "cùng nhau", "level": "N5" },
      { "word": "考える", "reading": "かんがえる", "meaning": "suy nghĩ, cân nhắc", "level": "N4" }
    ],
    "grammar": [
      { "point": "〜ましょう", "meaning": "hãy cùng nhau (lời rủ rê, đề nghị lịch sự)", "level": "N5" }
    ]
  }
]`;

            try {
                const parsedChunk = await executeAiPrompt(prompt);

                if (Array.isArray(parsedChunk)) {
                    parsedChunk.forEach(item => {
                        const idx = updatedList.findIndex(u => u.id === item.id);
                        if (idx >= 0) {
                            updatedList[idx] = {
                                ...updatedList[idx],
                                furigana: item.furigana || updatedList[idx].ja,
                                vi: item.vi || updatedList[idx].vi || '',
                                keywords: Array.isArray(item.keywords) && item.keywords.length > 0 ? item.keywords : (updatedList[idx].keywords || []),
                                grammar: Array.isArray(item.grammar) && item.grammar.length > 0 ? item.grammar : (updatedList[idx].grammar || [])
                            };
                        }
                    });
                }
            } catch (chunkErr) {
                console.warn(`Lỗi khi AI dịch cụm câu ${i + 1} - ${Math.min(i + BATCH_SIZE, total)}:`, chunkErr);
            }

            if (onProgress) {
                const current = Math.min(i + BATCH_SIZE, total);
                onProgress({
                    current,
                    total,
                    percent: Math.round((current / total) * 100),
                    subtitles: updatedList
                });
            }
        }

        return updatedList;
    }

    // If input is raw text string (user pasted raw text)
    const prompt = `Bạn là chuyên gia ngôn ngữ tiếng Nhật và dịch thuật phụ đề phim/video Kaiwa.
Nhiệm vụ: Hãy phân tách đoạn văn bản tiếng Nhật dưới đây thành các câu phụ đề theo thứ tự, gán Furigana dạng {Kanji|furigana}, dịch nghĩa Tiếng Việt tự nhiên theo ngữ cảnh vào trường "vi" (BẮT BUỘC), và trích xuất chi tiết từ 2-6 từ vựng/cụm từ quan trọng vào "keywords" cho từng câu thoại.

Chủ đề video: ${topicContext || 'Hội thoại giao tiếp tiếng Nhật'}

Văn bản:
${rawJapaneseTextOrSubtitles.slice(0, 3000)}

BẮT BUỘC trả về định dạng JSON thuần (KHÔNG kèm markdown ngoài JSON):
[
  {
    "id": 1,
    "start": 0.0,
    "end": 5.0,
    "ja": "自然な日本語を一緒に考えましょう！",
    "furigana": "{自然|しぜん}な{日本語|にほんご}を{一緒|いっしょ}に{考|かんが}えましょう！",
    "vi": "Hãy cùng nhau suy nghĩ về tiếng Nhật tự nhiên nhé!",
    "keywords": [
      { "word": "自然な", "reading": "しぜんな", "meaning": "tự nhiên", "level": "N3" },
      { "word": "日本語", "reading": "にほんご", "meaning": "tiếng Nhật", "level": "N5" },
      { "word": "一緒に", "reading": "いっしょに", "meaning": "cùng nhau", "level": "N5" },
      { "word": "考える", "reading": "かんがえる", "meaning": "suy nghĩ, cân nhắc", "level": "N4" }
    ],
    "grammar": []
  }
]`;

    return await executeAiPrompt(prompt);
};
