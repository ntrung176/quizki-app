import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, appId } from '../config/firebase';
import { SEED_KAIWA_VIDEOS } from '../components/kaiwa/videoKaiwaConstants';
import { callAI, callKaiwaAI, parseJsonFromAI } from '../utils/aiProvider';
import { saveVideoBlobToIndexedDb, deleteVideoBlobFromIndexedDb } from '../utils/indexedDbVideoStorage';

const KAIWA_COLLECTION = `artifacts/${appId}/kaiwaVideos`;
const CACHE_KEY = 'quizki_kaiwa_videos_cache';

// Upload a video file to Firebase Storage with progress tracking
export const uploadKaiwaVideoFile = (file, videoId, onProgress = null) => {
    return new Promise((resolve, reject) => {
        if (!file || !storage) {
            return reject(new Error('Firebase Storage không khả dụng hoặc file không hợp lệ.'));
        }

        const cleanName = (file.name || `${videoId}.mp4`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `kaiwaVideos/${videoId}/${cleanName}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                console.warn('Lỗi upload video lên Firebase Storage:', error);
                reject(error);
            },
            async () => {
                try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        downloadUrl,
                        storagePath
                    });
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};

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

    // 2. Clean up IndexedDB blob if exists
    try {
        await deleteVideoBlobFromIndexedDb(videoId);
    } catch (idbErr) {
        console.warn('IndexedDB cleanup error:', idbErr);
    }

    // 3. Delete from Firestore
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

// Use AI to generate Furigana, Vietnamese Translation & Comprehensive Vocab/Grammar from raw Japanese Transcript / SRT
export const generateAiSubtitles = async (rawJapaneseTextOrSubtitles, topicContext = '', onProgress = null, abortRef = { current: false }) => {
    // Helper to call AI with OpenRouter -> Google Gemini fallback
    const executeAiPrompt = async (prompt) => {
        try {
            const aiResponse = await callKaiwaAI(prompt, [], 'Trả về mảng JSON phụ đề dịch nghĩa, furigana, từ vựng và ngữ pháp.');
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
        const BATCH_SIZE = 6; // Process 6 sentences per request for deep & 100% comprehensive linguistic extraction
        const updatedList = [...items];

        for (let i = 0; i < total; i += BATCH_SIZE) {
            if (abortRef.current) {
                console.log('AI Subtitle generation aborted by user.');
                break;
            }

            const chunk = items.slice(i, i + BATCH_SIZE);
            const chunkPromptData = chunk.map(c => ({
                id: c.id,
                ja: c.ja || c.furigana
            }));

            const prompt = `Bạn là chuyên gia ngôn ngữ học Tiếng Nhật và biên dịch viên phụ đề chuyên nghiệp (Japanese Linguistic & Subtitle Expert).
Nhiệm vụ: Hãy phân tích ngữ nghĩa TOÀN DIỆN từng câu thoại tiếng Nhật dưới đây:

1. GÁN FURIGANA CHO TẤT CẢ CHỮ HÁN (KANJI):
   - Cú pháp chuẩn: {Kanji|furigana} (Ví dụ: {小田急電鉄|おだきゅうでんてつ}, {抜|ぬ}き{取|と}り, {払|はら}い{戻|もど}し, {自然|しぜん}な, {考|かんが}えると).
   - TUYỆT ĐỐI KHÔNG chèn khoảng trắng thừa giữa các từ tiếng Nhật hoặc trong ngoặc furigana.

2. DỊCH NGHĨA TIẾNG VIỆT ("vi"):
   - Bản dịch tiếng Việt tự nhiên, mượt mà và chuẩn xác theo ngữ cảnh câu thoại (BẮT BUỘC có, KHÔNG để trống).

3. TRÍCH XUẤT TOÀN BỘ TẤT CẢ TỪ VỰNG TRONG CÂU ("keywords") - RẤT QUAN TRỌNG:
   - Mục tiêu: Bao phủ (cover) 100% các từ vựng có nghĩa trong câu để người học di chuột vào BẤT KỲ từ/cụm từ nào cũng xem được nghĩa tiếng Việt chi tiết.
   - Bóc tách ĐẦY ĐỦ:
     * Tất cả danh từ đơn & danh từ ghép (VD: 小田急電鉄, 駅員, 使用済み, 切符, 不正, 処理, 現金, 万円, 懲戒解雇...)
     * Tất cả động từ đơn & động từ ghép (dạng từ điển hoặc dạng xuất hiện: 抜き取る, 払い戻す, 処理する, 得る, 分かる, される...)
     * Tất cả tính từ, phó từ, lượng từ, liên từ (VD: およそ, 実は, だんだん...)
     * Các cụm từ/thành ngữ cố định
   - Mỗi item trong "keywords":
     * "word": từ vựng/cụm từ chuẩn Kanji/Kana (BẮT BUỘC đúng chính tả tiếng Nhật)
     * "reading": cách đọc Hiragana chuẩn
     * "meaning": nghĩa tiếng Việt súc tích, chính xác theo ngữ cảnh
     * "level": cấp độ JLPT ("N5", "N4", "N3", "N2", "N1")

4. TRÍCH XUẤT CÁC CẤU TRÚC NGỮ PHÁP ("grammar"):
   - Mọi cấu trúc ngữ pháp, mẫu câu, biến đổi động từ đặc biệt trong câu (VD: "〜に対して", "〜ている / 〜している", "〜ということです", "〜ていた", "〜される (thể bị động)", "〜て (nối câu)", "〜およそ", "〜において"...)
   - Mỗi item trong "grammar":
     * "point": mẫu ngữ pháp (VD: "〜に対して", "〜ということです")
     * "meaning": ý nghĩa và cách dùng ngắn gọn bằng tiếng Việt
     * "level": cấp độ JLPT ("N5", "N4", "N3", "N2", "N1")

Chủ đề video: ${topicContext || 'Hội thoại tiếng Nhật'}

Dữ liệu đầu vào:
${JSON.stringify(chunkPromptData, null, 2)}

BẮT BUỘC trả về ĐÚNG 1 mảng JSON thuần (KHÔNG kèm markdown ngoài JSON):
[
  {
    "id": 1,
    "furigana": "{小田急電鉄|おだきゅうでんてつ}の{駅員|えきいん}が{使用済|しようず|み}の{切符|きっぷ}を{不正|ふせい}に{処理|しょり}して{現金|げんきん}およそ1500{万円|まんえん}を{得|え}ていたことが{分|わ}かり、{懲戒解雇|ちょうかいかいこ}されました。",
    "vi": "Phát hiện nhân viên ga Odakyu xử lý bất hợp pháp vé đã qua sử dụng để chiếm đoạt khoảng 15 triệu yên tiền mặt và đã bị sa thải kỷ luật.",
    "keywords": [
      { "word": "小田急電鉄", "reading": "おだきゅうでんてつ", "meaning": "Công ty đường sắt Odakyu", "level": "N2" },
      { "word": "駅員", "reading": "えきいん", "meaning": "nhân viên nhà ga", "level": "N4" },
      { "word": "使用済み", "reading": "しようずみ", "meaning": "đã qua sử dụng", "level": "N3" },
      { "word": "切符", "reading": "きっぷ", "meaning": "vé", "level": "N5" },
      { "word": "不正", "reading": "ふせい", "meaning": "bất hợp pháp, gian lận", "level": "N3" },
      { "word": "処理する", "reading": "しょりする", "meaning": "xử lý, giải quyết", "level": "N3" },
      { "word": "現金", "reading": "げんきん", "meaning": "tiền mặt", "level": "N4" },
      { "word": "およそ", "reading": "およそ", "meaning": "khoảng, xấp xỉ", "level": "N3" },
      { "word": "万円", "reading": "まんえん", "meaning": "vạn yên (10.000 yên)", "level": "N5" },
      { "word": "得る", "reading": "える", "meaning": "thu được, kiếm được", "level": "N3" },
      { "word": "分かる", "reading": "わかる", "meaning": "hiểu, phát hiện ra", "level": "N5" },
      { "word": "懲戒解雇", "reading": "ちょうかいかいこ", "meaning": "sa thải kỷ luật", "level": "N1" }
    ],
    "grammar": [
      { "point": "〜ていた", "meaning": "diễn tả hành động đang diễn ra trong quá khứ", "level": "N5" },
      { "point": "〜ことが分かる", "meaning": "phát hiện ra sự việc / sự thật được sáng tỏ", "level": "N3" },
      { "point": "〜される", "meaning": "thể bị động (bị / được làm gì)", "level": "N4" }
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
    const prompt = `Bạn là chuyên gia ngôn ngữ học tiếng Nhật và dịch thuật phụ đề phim/video Kaiwa chuyên nghiệp.
Nhiệm vụ: Hãy phân tách đoạn văn bản tiếng Nhật dưới đây thành các câu phụ đề theo thứ tự, gán Furigana dạng {Kanji|furigana}, dịch nghĩa Tiếng Việt tự nhiên vào trường "vi" (BẮT BUỘC), và trích xuất TOÀN BỘ 100% từ vựng vào "keywords" cùng các cấu trúc ngữ pháp vào "grammar" cho từng câu thoại để phục vụ tính năng tra từ khi rê chuột.

Chủ đề video: ${topicContext || 'Hội thoại tiếng Nhật'}

Văn bản:
${rawJapaneseTextOrSubtitles.slice(0, 3000)}

BẮT BUỘC trả về định dạng JSON thuần (KHÔNG kèm markdown ngoài JSON):
[
  {
    "id": 1,
    "start": 0.0,
    "end": 5.0,
    "ja": "小田急電鉄の駅員が使用済みの切符を不正に処理して現金およそ1500万円を得ていたことが分かり、懲戒解雇されました。",
    "furigana": "{小田急電鉄|おだきゅうでんてつ}の{駅員|えきいん}が{使用済|しようず|み}の{切符|きっぷ}を{不正|ふせい}に{処理|しょり}して{現金|げんきん}およそ1500{万円|まんえん}を{得|え}ていたことが{分|わ}かり、{懲戒解雇|ちょうかいかいこ}されました。",
    "vi": "Phát hiện nhân viên ga Odakyu xử lý bất hợp pháp vé đã qua sử dụng để chiếm đoạt khoảng 15 triệu yên tiền mặt và đã bị sa thải kỷ luật.",
    "keywords": [
      { "word": "小田急電鉄", "reading": "おだきゅうでんてつ", "meaning": "Công ty đường sắt Odakyu", "level": "N2" },
      { "word": "駅員", "reading": "えきいん", "meaning": "nhân viên nhà ga", "level": "N4" },
      { "word": "使用済み", "reading": "しようずみ", "meaning": "đã qua sử dụng", "level": "N3" },
      { "word": "切符", "reading": "きっぷ", "meaning": "vé", "level": "N5" },
      { "word": "不正", "reading": "ふせい", "meaning": "bất hợp pháp, gian lận", "level": "N3" },
      { "word": "処理する", "reading": "しょりする", "meaning": "xử lý, giải quyết", "level": "N3" },
      { "word": "現金", "reading": "げんきん", "meaning": "tiền mặt", "level": "N4" },
      { "word": "およそ", "reading": "およそ", "meaning": "khoảng, xấp xỉ", "level": "N3" },
      { "word": "万円", "reading": "まんえん", "meaning": "vạn yên (10.000 yên)", "level": "N5" },
      { "word": "得る", "reading": "える", "meaning": "thu được, kiếm được", "level": "N3" },
      { "word": "分かる", "reading": "わかる", "meaning": "hiểu, phát hiện ra", "level": "N5" },
      { "word": "懲戒解雇", "reading": "ちょうかいかいこ", "meaning": "sa thải kỷ luật", "level": "N1" }
    ],
    "grammar": [
      { "point": "〜ていた", "meaning": "diễn tả hành động đang diễn ra trong quá khứ", "level": "N5" },
      { "point": "〜ことが分かる", "meaning": "phát hiện ra sự việc / sự thật được sáng tỏ", "level": "N3" },
      { "point": "〜される", "meaning": "thể bị động (bị / được làm gì)", "level": "N4" }
    ]
  }
]`;

    return await executeAiPrompt(prompt);
};

/**
 * Deeply analyzes all sentences in a video to extract comprehensive vocabulary (all content words)
 * and grammatical structures for hover lookup.
 * 
 * @param {Array} subtitles - Array of subtitle objects ({ id, start, end, ja, furigana, vi, keywords, grammar })
 * @param {string} topicContext - Video title or topic description
 * @param {Function} onProgress - Progress callback ({ current, total, percent, subtitles })
 * @param {Object} abortRef - Abort controller ref
 * @returns {Promise<Array>} Updated subtitles array with comprehensive keywords and grammar
 */
export const enrichVideoKeywordsAndGrammarWithAI = async (subtitles, topicContext = '', onProgress = null, abortRef = { current: false }) => {
    if (!Array.isArray(subtitles) || subtitles.length === 0) return [];

    const items = [...subtitles];
    const total = items.length;
    const BATCH_SIZE = 6;
    const updatedList = items.map(s => ({
        ...s,
        keywords: Array.isArray(s.keywords) ? [...s.keywords] : [],
        grammar: Array.isArray(s.grammar) ? [...s.grammar] : []
    }));

    for (let i = 0; i < total; i += BATCH_SIZE) {
        if (abortRef && abortRef.current) {
            console.log('AI enrichment aborted by user.');
            break;
        }

        const chunk = updatedList.slice(i, i + BATCH_SIZE);
        const chunkPromptData = chunk.map(c => ({
            id: c.id,
            ja: c.ja || c.furigana,
            vi: c.vi || ''
        }));

        const prompt = `Bạn là chuyên gia ngôn ngữ học Tiếng Nhật và từ điển học chuyên sâu (Japanese Linguistic Expert).
Nhiệm vụ: Hãy phân tích ngữ nghĩa TOÀN DIỆN từng câu tiếng Nhật dưới đây để phục vụ tính năng "Di chuột xem giải nghĩa từng từ (Hover Meaning Lookup)":

1. TRÍCH XUẤT TOÀN BỘ TẤT CẢ TỪ VỰNG TRONG CÂU ("keywords"):
   - Mục tiêu: Bao phủ (cover) 100% các từ vựng có nghĩa trong câu để người học di chuột vào BẤT KỲ từ/cụm từ nào cũng xem được nghĩa tiếng Việt chi tiết.
   - Bóc tách ĐẦY ĐỦ:
     * Tất cả danh từ đơn & danh từ ghép (VD: 小田急電鉄, 駅員, 使用済み, 切符, 不正, 処理, 現金, 万円, 懲戒解雇...)
     * Tất cả động từ (dạng nguyên thể hoặc dạng xuất hiện: 処理する, 得る, 分かる, される...)
     * Tất cả tính từ, phó từ, lượng từ, liên từ (VD: およそ, 実は, だんだん...)
     * Các cụm từ/thành ngữ cố định
   - Mỗi item trong "keywords":
     * "word": từ vựng/cụm từ chuẩn Kanji/Kana (BẮT BUỘC đúng chính tả tiếng Nhật)
     * "reading": cách đọc Hiragana chuẩn
     * "meaning": nghĩa tiếng Việt tự nhiên, chính xác theo ngữ cảnh câu
     * "level": cấp độ JLPT ("N5", "N4", "N3", "N2", "N1")

2. TRÍCH XUẤT CÁC CẤU TRÚC NGỮ PHÁP ("grammar"):
   - Mọi cấu trúc ngữ pháp, mẫu câu, biến đổi động từ đặc biệt trong câu (VD: "〜ていた", "〜が分かる", "〜される (thể bị động)", "〜て (nối câu)", "〜およそ", "〜において"...)
   - Mỗi item trong "grammar":
     * "point": mẫu ngữ pháp (VD: "〜ていた", "〜される")
     * "meaning": ý nghĩa và cách dùng ngắn gọn bằng tiếng Việt (VD: "diễn tả hành động đang diễn ra trong quá khứ", "thể bị động - bị/được")
     * "level": cấp độ JLPT ("N5", "N4", "N3", "N2", "N1")

3. CẬP NHẬT FURIGANA VÀ DỊCH NGHĨA:
   - "furigana": gán Furigana dạng {Kanji|furigana} cho tất cả chữ Hán.
   - "vi": bản dịch tiếng Việt chuẩn xác theo ngữ cảnh.

Chủ đề: ${topicContext || 'Hội thoại tiếng Nhật'}

Dữ liệu đầu vào:
${JSON.stringify(chunkPromptData, null, 2)}

BẮT BUỘC trả về định dạng JSON thuần (KHÔNG kèm markdown, KHÔNG bọc \`\`\`json):
[
  {
    "id": 1,
    "furigana": "{小田急電鉄|おだきゅうでんてつ}の{駅員|えきいん}が{使用済|しようず|み}の{切符|きっぷ}を{不正|ふせい}に{処理|しょり}して{現金|げんきん}およそ1500{万円|まんえん}を{得|え}ていたことが{分|わ}かり、{懲戒解雇|ちょうかいかいこ}されました。",
    "vi": "Phát hiện nhân viên ga Odakyu xử lý bất hợp pháp vé đã qua sử dụng để chiếm đoạt khoảng 15 triệu yên tiền mặt và đã bị sa thải kỷ luật.",
    "keywords": [
      { "word": "小田急電鉄", "reading": "おだきゅうでんてつ", "meaning": "Công ty đường sắt Odakyu", "level": "N2" },
      { "word": "駅員", "reading": "えきいん", "meaning": "nhân viên nhà ga", "level": "N4" },
      { "word": "使用済み", "reading": "しようずみ", "meaning": "đã qua sử dụng", "level": "N3" },
      { "word": "切符", "reading": "きっぷ", "meaning": "vé", "level": "N5" },
      { "word": "不正", "reading": "ふせい", "meaning": "bất hợp pháp, gian lận", "level": "N3" },
      { "word": "処理する", "reading": "しょりする", "meaning": "xử lý, giải quyết", "level": "N3" },
      { "word": "現金", "reading": "げんきん", "meaning": "tiền mặt", "level": "N4" },
      { "word": "およそ", "reading": "およそ", "meaning": "khoảng, xấp xỉ", "level": "N3" },
      { "word": "万円", "reading": "まんえん", "meaning": "vạn yên (10.000 yên)", "level": "N5" },
      { "word": "得る", "reading": "える", "meaning": "thu được, kiếm được", "level": "N3" },
      { "word": "分かる", "reading": "わかる", "meaning": "hiểu, phát hiện ra", "level": "N5" },
      { "word": "懲戒解雇", "reading": "ちょうかいかいこ", "meaning": "sa thải kỷ luật", "level": "N1" }
    ],
    "grammar": [
      { "point": "〜ていた", "meaning": "diễn tả hành động đang diễn ra trong quá khứ", "level": "N5" },
      { "point": "〜ことが分かる", "meaning": "phát hiện ra sự việc / sự thật được sáng tỏ", "level": "N3" },
      { "point": "〜される", "meaning": "thể bị động (bị / được làm gì)", "level": "N4" }
    ]
  }
]`;

        try {
            const aiResponse = await callAI(prompt, null, 'kaiwa_agent');
            const parsedChunk = parseJsonFromAI(aiResponse);

            if (Array.isArray(parsedChunk)) {
                parsedChunk.forEach(item => {
                    const idx = updatedList.findIndex(u => u.id === item.id);
                    if (idx >= 0) {
                        // Merge keywords (deduplicate by word)
                        const existingKws = updatedList[idx].keywords || [];
                        const newKws = Array.isArray(item.keywords) ? item.keywords : [];
                        const mergedKwMap = new Map();
                        existingKws.forEach(k => { if (k?.word) mergedKwMap.set(k.word, k); });
                        newKws.forEach(k => { if (k?.word) mergedKwMap.set(k.word, k); });

                        // Merge grammar
                        const existingGrammar = updatedList[idx].grammar || [];
                        const newGrammar = Array.isArray(item.grammar) ? item.grammar : [];
                        const mergedGrammarMap = new Map();
                        existingGrammar.forEach(g => {
                            const key = typeof g === 'object' ? (g.point || g.structure || g.grammar || g.meaning) : g;
                            if (key) mergedGrammarMap.set(key, g);
                        });
                        newGrammar.forEach(g => {
                            const key = typeof g === 'object' ? (g.point || g.structure || g.grammar || g.meaning) : g;
                            if (key) mergedGrammarMap.set(key, g);
                        });

                        updatedList[idx] = {
                            ...updatedList[idx],
                            furigana: item.furigana || updatedList[idx].furigana || updatedList[idx].ja,
                            vi: item.vi || updatedList[idx].vi,
                            keywords: Array.from(mergedKwMap.values()),
                            grammar: Array.from(mergedGrammarMap.values())
                        };
                    }
                });
            }
        } catch (chunkErr) {
            console.warn(`Lỗi khi AI phân tích cụm câu ${i + 1} - ${Math.min(i + BATCH_SIZE, total)}:`, chunkErr);
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
};

/**
 * Analyzes a single subtitle sentence to extract all keywords and grammar points.
 */
export const enrichSingleSubtitleWithAI = async (subtitle, topicContext = '') => {
    if (!subtitle) return subtitle;
    const res = await enrichVideoKeywordsAndGrammarWithAI([subtitle], topicContext);
    return res[0] || subtitle;
};

/**
 * Fetches YouTube video metadata (Title, Author/Channel, Thumbnail) without requiring an API key.
 */
export const fetchYoutubeMetadata = async (youtubeId) => {
    if (!youtubeId) return null;
    const cleanId = extractYoutubeId(youtubeId) || youtubeId;

    // 1. Try noembed.com
    try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${cleanId}`, {
            signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
            const data = await res.json();
            if (data && (data.title || data.author_name)) {
                return {
                    youtubeId: cleanId,
                    title: data.title || '',
                    channelTitle: data.author_name || '',
                    thumbnail: `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`,
                    authorUrl: data.author_url || ''
                };
            }
        }
    } catch (e) {
        console.warn('noembed fetch failed:', e?.message);
    }

    // 2. Try official YouTube oEmbed
    try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanId}&format=json`, {
            signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
            const data = await res.json();
            if (data && (data.title || data.author_name)) {
                return {
                    youtubeId: cleanId,
                    title: data.title || '',
                    channelTitle: data.author_name || '',
                    thumbnail: `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`,
                    authorUrl: data.author_url || ''
                };
            }
        }
    } catch (e) {
        console.warn('YouTube oEmbed fetch failed:', e?.message);
    }

    // Fallback default
    return {
        youtubeId: cleanId,
        title: '',
        channelTitle: '',
        thumbnail: `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`
    };
};

/**
 * Parses YouTube JSON3 timed text format into QuizKi subtitle format.
 */
export const parseJson3Subtitles = (jsonData) => {
    if (!jsonData || !Array.isArray(jsonData.events)) return [];
    const list = [];
    let count = 1;
    for (const ev of jsonData.events) {
        if (!ev.segs || ev.segs.length === 0) continue;
        const text = ev.segs
            .map(s => s.utf8 || '')
            .join('')
            .replace(/\[音楽\]|\[Music\]|[\r\n]+/gi, ' ')
            .trim();
        if (!text || /^[。、\.\,\s\d]+$/.test(text)) continue;
        const start = (ev.tStartMs || 0) / 1000;
        const dur = (ev.dDurationMs || 3000) / 1000;
        const end = start + dur;
        list.push({
            id: count++,
            start: Math.round(start * 10) / 10,
            end: Math.round(end * 10) / 10,
            ja: text,
            furigana: text,
            vi: '',
            keywords: [],
            grammar: []
        });
    }
    return list;
};

/**
 * Parses YouTube XML timed text format into QuizKi subtitle format.
 */
export const parseXmlTimedText = (xmlStr) => {
    if (!xmlStr || typeof xmlStr !== 'string') return [];
    const list = [];
    let count = 1;
    const regex = /<text\s+start="([0-9.]+)"\s+dur="([0-9.]+)"[^>]*>([\s\S]*?)<\/text>/gi;
    let match;
    while ((match = regex.exec(xmlStr)) !== null) {
        const start = parseFloat(match[1]) || 0;
        const dur = parseFloat(match[2]) || 3;
        let text = match[3] || '';
        text = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
            .replace(/\[音楽\]|\[Music\]/gi, '')
            .trim();
        if (text && !/^[。、\.\,\s\d]+$/.test(text)) {
            list.push({
                id: count++,
                start: Math.round(start * 10) / 10,
                end: Math.round((start + dur) * 10) / 10,
                ja: text,
                furigana: text,
                vi: '',
                keywords: [],
                grammar: []
            });
        }
    }
    return list;
};

/**
 * Multi-tiered YouTube subtitle fetcher.
 * Queries public mirrors, CORS proxies, and TimedText endpoints to find Japanese subtitles.
 */
export const fetchYoutubeSubtitles = async (youtubeId) => {
    if (!youtubeId) return { success: false, reason: 'invalid_id', message: 'ID YouTube không hợp lệ' };
    const cleanId = extractYoutubeId(youtubeId) || youtubeId;

    // Strategy 1: Invidious Instances
    const invidiousHosts = [
        'https://inv.nadeko.net',
        'https://invidious.nerdvpn.de',
        'https://vid.priv.au',
        'https://yt.drgnz.club',
        'https://invidious.private.coffee',
        'https://invidious.flokinet.to',
        'https://yt.artemislena.eu',
        'https://invidious.projectsegfau.lt',
        'https://yewtu.be',
        'https://invidious.jing.rocks',
        'https://invidious.lunar.icu',
        'https://invidious.einfachzocken.eu',
        'https://inv.tux.pizza'
    ];

    for (const host of invidiousHosts) {
        try {
            const res = await fetch(`${host}/api/v1/captions/${cleanId}`, {
                signal: AbortSignal.timeout(3000)
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.captions && Array.isArray(data.captions) && data.captions.length > 0) {
                    // Find Japanese caption track
                    const jaTrack = data.captions.find(c =>
                        (c.languageCode || '').startsWith('ja') ||
                        (c.label || '').includes('Japan') ||
                        (c.label || '').includes('Nhật') ||
                        (c.label || '').includes('日本語')
                    ) || data.captions[0];

                    const capUrl = jaTrack.url.startsWith('http') ? jaTrack.url : `${host}${jaTrack.url}`;
                    const capRes = await fetch(capUrl, { signal: AbortSignal.timeout(3500) });
                    if (capRes.ok) {
                        const content = await capRes.text();
                        if (content && content.length > 20) {
                            let parsed = [];
                            if (content.startsWith('WEBVTT') || content.includes('-->')) {
                                parsed = parseTextToSubtitles(content);
                            } else if (content.includes('<transcript') || content.includes('<text')) {
                                parsed = parseXmlTimedText(content);
                            } else {
                                try {
                                    parsed = parseJson3Subtitles(JSON.parse(content));
                                } catch (e) {
                                    parsed = parseTextToSubtitles(content);
                                }
                            }
                            if (parsed.length > 0) {
                                return {
                                    success: true,
                                    subtitles: parsed,
                                    trackLabel: jaTrack.label || 'Tiếng Nhật (YouTube CC)',
                                    source: host
                                };
                            }
                        }
                    }
                }
            }
        } catch (err) {
            // continue to next host
        }
    }

    // Strategy 2: Piped Instances
    const pipedHosts = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.privacydev.net',
        'https://piped-api.garudalinux.org',
        'https://api.piped.yt',
        'https://pipedapi.tokhmi.xyz',
        'https://pipedapi.leptons.xyz',
        'https://pipedapi.adminforge.de'
    ];

    for (const host of pipedHosts) {
        try {
            const res = await fetch(`${host}/streams/${cleanId}`, {
                signal: AbortSignal.timeout(3500)
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.subtitles && Array.isArray(data.subtitles) && data.subtitles.length > 0) {
                    const jaSub = data.subtitles.find(s =>
                        (s.code || '').startsWith('ja') ||
                        (s.name || '').includes('Japan') ||
                        (s.name || '').includes('Nhật') ||
                        (s.name || '').includes('日本語')
                    ) || data.subtitles[0];

                    if (jaSub?.url) {
                        const capRes = await fetch(jaSub.url, { signal: AbortSignal.timeout(4000) });
                        if (capRes.ok) {
                            const content = await capRes.text();
                            const parsed = parseTextToSubtitles(content);
                            if (parsed.length > 0) {
                                return {
                                    success: true,
                                    subtitles: parsed,
                                    trackLabel: jaSub.name || 'Tiếng Nhật (YouTube CC)',
                                    source: host
                                };
                            }
                        }
                    }
                }
            }
        } catch (err) {
            // continue
        }
    }

    // Strategy 3: CORS Proxies to YouTube timedtext
    const corsProxies = [
        (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`
    ];

    const timedTextUrls = [
        `https://www.youtube.com/api/timedtext?v=${cleanId}&lang=ja&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${cleanId}&lang=ja-JP&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${cleanId}&lang=ja&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${cleanId}&lang=ja`
    ];

    for (const proxyFn of corsProxies) {
        for (const targetUrl of timedTextUrls) {
            try {
                const proxyUrl = proxyFn(targetUrl);
                const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
                if (res.ok) {
                    const text = await res.text();
                    if (text && text.length > 20) {
                        let parsed = [];
                        if (text.startsWith('{')) {
                            try {
                                parsed = parseJson3Subtitles(JSON.parse(text));
                            } catch (e) {}
                        } else if (text.includes('<text') || text.includes('<transcript')) {
                            parsed = parseXmlTimedText(text);
                        } else if (text.includes('-->') || text.startsWith('WEBVTT')) {
                            parsed = parseTextToSubtitles(text);
                        }
                        if (parsed.length > 0) {
                            return {
                                success: true,
                                subtitles: parsed,
                                trackLabel: 'Tiếng Nhật (YouTube TimedText)',
                                source: 'timedtext'
                            };
                        }
                    }
                }
            } catch (e) {
                // continue
            }
        }
    }

    return {
        success: false,
        reason: 'no_subtitles',
        message: 'Không tìm thấy phụ đề có sẵn trên YouTube cho video này.'
    };
};

/**
 * Uses AI to analyze video title and subtitle sample to automatically deduce:
 * Level (N5-N1), Category (daily, news, kaigo, business, interview, anime), Vietnamese Title translation, Channel, and Summary description.
 */
export const analyzeVideoMetadataWithAI = async ({ title = '', channelTitle = '', subtitlesSample = [], rawText = '' }) => {
    // Construct sample text representation
    let sampleContent = '';
    if (Array.isArray(subtitlesSample) && subtitlesSample.length > 0) {
        sampleContent = subtitlesSample.slice(0, 15).map((s, idx) => `${idx + 1}. ${s.ja || s.furigana || ''}`).join('\n');
    } else if (typeof rawText === 'string' && rawText.trim()) {
        sampleContent = rawText.slice(0, 1500);
    }

    const prompt = `Bạn là chuyên gia giáo dục Tiếng Nhật JLPT và phân tích nội dung video Kaiwa chuyên nghiệp.
Nhiệm vụ: Dựa vào Tiêu đề video, Tên kênh và Mẫu các câu thoại trong video dưới đây, hãy tự động phân tích và xác định các thông tin sau:

1. "title": Tiêu đề tiếng Nhật chuẩn của video (có thể giữ nguyên hoặc rút gọn tinh gọn, loại bỏ các thẻ rác như [4K], (Official), #Shorts...).
2. "titleVi": Tiêu đề dịch sang Tiếng Việt tự nhiên, hấp dẫn, chuẩn nghĩa (BẮT BUỘC có).
3. "level": Cấp độ JLPT phù hợp nhất cho người học. BẮT BUỘC chọn 1 trong 5 giá trị: "N5", "N4", "N3", "N2", "N1" (Dựa vào độ phức tạp của ngữ pháp và từ vựng trong bài).
4. "category": Danh mục chủ đề của video. BẮT BUỘC chọn 1 trong các mã sau:
   - "kaigo": Kaigo (Điều dưỡng, Y tế, Chăm sóc người cao tuổi, Hộ lý)
   - "daily": Đời sống thường nhật & Giao tiếp thường ngày, mua sắm, nấu ăn, du lịch
   - "business": Công sở & Thương mại, Kính ngữ Keigo, phỏng vấn công việc, email công ty
   - "interview": Phỏng vấn xin việc, Arubaito, giới thiệu bản thân
   - "news": Tin tức Thời sự, phóng sự xã hội, khoa học, văn hóa Nhật
   - "anime": Anime, phim ngắn, hoạt hình, truyện tranh
5. "channelTitle": Tên kênh hoặc tác giả (loại bỏ các hậu tố không cần thiết).
6. "description": Tóm tắt ngắn gọn 1-2 câu bằng Tiếng Việt về nội dung chính của video và điểm trọng tâm người học sẽ tiếp thu được.

Thông tin đầu vào:
- Tiêu đề gốc: ${title || 'Chưa có'}
- Tên kênh gốc: ${channelTitle || 'Chưa có'}
- Mẫu các câu thoại trong video:
${sampleContent || 'Chưa có mẫu câu thoại'}

BẮT BUỘC trả về định dạng JSON thuần (KHÔNG kèm markdown ngoài JSON):
{
  "title": "...",
  "titleVi": "...",
  "level": "N3",
  "category": "daily",
  "channelTitle": "...",
  "description": "..."
}`;

    try {
        let aiResponse;
        try {
            aiResponse = await callKaiwaAI(prompt, [], 'Trả về đúng 1 object JSON chứa metadata video.');
        } catch (e) {
            aiResponse = await callAI(prompt, null, 'kaiwa_agent');
        }
        const parsed = parseJsonFromAI(aiResponse);
        if (parsed && typeof parsed === 'object') {
            const validLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
            const validCategories = ['kaigo', 'daily', 'business', 'interview', 'news', 'anime'];

            return {
                title: parsed.title || title || 'Video Kaiwa Tiếng Nhật',
                titleVi: parsed.titleVi || '',
                level: validLevels.includes(parsed.level) ? parsed.level : 'N3',
                category: validCategories.includes(parsed.category) ? parsed.category : 'daily',
                channelTitle: parsed.channelTitle || channelTitle || 'QuizKi Master',
                description: parsed.description || ''
            };
        }
    } catch (e) {
        console.warn('Lỗi khi AI phân tích metadata video:', e);
    }

    // Fallback if AI fails
    return {
        title: title || 'Video Kaiwa Tiếng Nhật',
        titleVi: '',
        level: 'N3',
        category: 'daily',
        channelTitle: channelTitle || 'QuizKi Master',
        description: ''
    };
};


