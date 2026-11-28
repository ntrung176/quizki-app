/**
 * JLPT Language Knowledge (文字・語彙・文法) & Reading (読解) AI Authoring Service.
 * Uses level- & era-aware blueprints and 1-page-overlap chunking so multi-page passages (Cloze / 情報検索) never split.
 */
import { callAI, getEffectiveModel } from '../../utils/aiProvider';
import { safeParseJsonWithRepair } from './aiPdfIngestorService';
import { normalizeAnswerIndex, detectBatchOneBasedIndexing } from '../../utils/jlptAnswerIndex';
import { normalizePassageBreakdownPayload } from './jlptExplanationAiService';
import {
    getLevelExamBlueprint,
    resolveQuestionMondai,
    resolveSectionMondaiMeta,
    isThreeOptionMondai,
    isBareNumberOptions
} from '../../components/jlptTest/jlptYearlyConstants';

/**
 * Splits full exam text on `[TRANG X]` boundaries into small chunks (max 3 pages / ~4200 chars)
 * with 1-page overlap so output never hits max_tokens while multi-page passages stay intact.
 */
export const buildOverlappingPageChunks = (fullText = '', maxChars = 4200, maxPagesPerChunk = 3) => {
    const raw = String(fullText || '').trim();
    if (!raw) return [];

    const pageBlocks = raw
        .split(/\n?(?=---\s*\[TRANG\s+[\d,]+\]\s*---)/g)
        .map((s) => s.trim())
        .filter(Boolean);

    if (pageBlocks.length <= 1) {
        const chunks = [];
        const step = Math.max(1500, maxChars - 600);
        for (let pos = 0; pos < raw.length; pos += step) {
            chunks.push({ text: raw.slice(pos, pos + maxChars), pageRange: `${chunks.length + 1}` });
            if (pos + maxChars >= raw.length) break;
        }
        return chunks;
    }

    const chunks = [];
    let current = [];
    let currentLen = 0;

    for (let i = 0; i < pageBlocks.length; i++) {
        const block = pageBlocks[i];
        const hitPageCap = current.length >= maxPagesPerChunk;
        const hitCharCap = current.length > 0 && currentLen + block.length + 2 > maxChars;
        if (hitPageCap || hitCharCap) {
            chunks.push({ text: current.join('\n\n'), pageRange: `${i}` });
            // Seed next chunk with the boundary page so cross-page passages & questions stay paired
            const overlap = current[current.length - 1];
            if (overlap.length + block.length + 2 <= maxChars + 1200) {
                current = [overlap, block];
                currentLen = overlap.length + block.length + 2;
            } else {
                current = [block];
                currentLen = block.length;
            }
        } else {
            current.push(block);
            currentLen += block.length + 2;
        }
    }

    if (current.length > 0) {
        chunks.push({ text: current.join('\n\n'), pageRange: 'end' });
    }

    return chunks;
};

const normalizeDedupeKey = (secType, q) => {
    const qNum = Number(q.questionNumber || 0);
    const qNorm = String(q.question || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '').slice(0, 64);
    if (secType === 'listening') {
        return `listening_m${q.mondai || 1}_num_${qNum || qNorm}`;
    }
    if (qNum > 0) return `${secType}_num_${qNum}`;
    return `${secType}_m${q.mondai || 0}_${qNorm}`;
};

const mergeRichQuestion = (existing, incoming) => {
    if (!existing) return incoming;
    const pickLonger = (a, b) => (String(b || '').length > String(a || '').length ? b : a);
    const mergedPd = (incoming.passageData?.sentences?.length ? incoming.passageData : existing.passageData) || null;
    const result = {
        ...existing,
        ...incoming,
        passage: pickLonger(existing.passage, incoming.passage),
        question: pickLonger(existing.question, incoming.question),
        explanation: pickLonger(existing.explanation, incoming.explanation),
        options: (incoming.options?.length >= 4 && !existing.options?.some((o) => o && o.length > 2))
            ? incoming.options
            : (existing.options?.length >= 4 ? existing.options : incoming.options),
        correctAnswer: existing.correctAnswer ?? incoming.correctAnswer ?? 0,
        answer: existing.answer ?? existing.correctAnswer ?? incoming.correctAnswer ?? 0
    };
    if (mergedPd) result.passageData = mergedPd;
    return result;
};

const propagateSharedPassageData = (questions = []) => {
    const sharedByPassage = new Map();
    questions.forEach((q) => {
        if (!q?.passage || !q?.passageData) return;
        const key = String(q.passage).replace(/\s+/g, ' ').trim();
        if (key && !sharedByPassage.has(key)) sharedByPassage.set(key, q.passageData);
    });
    return questions.map((q) => {
        if (!q?.passage || q?.passageData) return q;
        const key = String(q.passage).replace(/\s+/g, ' ').trim();
        const sharedPd = sharedByPassage.get(key);
        return sharedPd ? { ...q, passageData: sharedPd } : q;
    });
};

/**
 * Generates level-aware Vocabulary / Grammar / Reading sections separated by Mondai from exam text.
 */
export const generateReadingLangSectionsWithAI = async ({
    level = 'N3',
    examYear = null,
    langPaperText = '',
    answerKeyText = '',
    model = 'google/gemini-2.5-flash',
    onProgress = () => {},
    onLog = () => {},
    signal = null
} = {}) => {
    if (!langPaperText?.trim()) return [];
    const effectiveModel = getEffectiveModel(model);
    const bp = getLevelExamBlueprint(level, examYear);
    const chunks = buildOverlappingPageChunks(langPaperText, 4200, 3);
    const questionBucketBySec = new Map();

    const extractChunkText = async (chunkText, labelSuffix, allowSplitRetry = true) => {
        const prompt = `Bạn là chuyên gia khảo thí JLPT cấp độ ${bp.level}. Hãy trích xuất ĐẦY ĐỦ TOÀN BỘ KHÔNG BỎ SÓT BẤT KỲ CÂU NÀO trong đoạn đề thi dưới đây (${labelSuffix}) sang JSON chuẩn.

${bp.langReadingPromptRules}

${answerKeyText ? `BẢNG ĐÁP ÁN / SCRIPT THAM CHIẾU (tìm đúng số thứ tự câu hỏi để khớp correctAnswer 0..3):\n"""\n${answerKeyText.slice(0, 16000)}\n"""\n` : ''}
VĂN BẢN ĐỀ THI (có đánh dấu [TRANG X], bỏ qua các phần ví dụ "例" nếu không phải câu hỏi thi):
"""
${chunkText}
"""

QUY TẮC BẮT BUỘC:
1. Phân đúng "type": "vocabulary" (文字・語彙), "grammar" (文法), hoặc "reading" (読解). Lưu ý riêng ${bp.level} (${bp.blueprint.continuousLangReadingMondai ? 'đánh số Mondai liên tục từ từ vựng sang đọc hiểu' : 'phần Văn phạm/Đọc hiểu bắt đầu lại từ 問題1'}).
2. BẮT BUỘC lấy ĐỦ TẤT CẢ mọi câu hỏi có đủ 4 lựa chọn trong đoạn văn bản trên (không bỏ sót bất kỳ câu Từ vựng, Chữ Hán, Ngữ pháp nào!). Ghi đúng "mondai", "mondaiTitle" (ví dụ "問題1：漢字読み"), và "questionNumber" (1, 2, 3...).
3. Chỉ bỏ qua câu nào thực sự bị cắt ngang chưa thấy đủ 4 lựa chọn ở mép trang (vì đoạn gối trang sau sẽ lấy trọn câu đó).
4. Định dạng câu hỏi chuẩn:
   - Gạch chân từ trọng tâm bằng <u>...</u>.
   - Câu sắp xếp ★: ghi đủ "<u>\u3000</u> <u>\u3000</u> <u>★</u> <u>\u3000</u>".
   - Bài đọc hiểu ("reading") & bài đục lỗ ("文章の文法"): BẮT BUỘC copy ĐẦY ĐỦ đoạn văn (bao gồm cả đoạn A và đoạn B ở 総合理解, lẫn bảng biểu HTML <table> và ghi chú (注) ở 情報検索) vào "passage" của từng câu!
5. "options": 4 phương án nguyên văn tiếng Nhật, KHÔNG kèm số thứ tự "1.", "2." ở đầu.
6. "correctAnswer": index 0..3 (ưu tiên đối chiếu BẢNG ĐÁP ÁN THAM CHIẾU); "explanation": viết siêu ngắn gọn để người làm đọc 5 giây hình dung được ngay theo form:
   "✅ Lựa chọn chính xác: [1 câu trọng tâm]\\n\\n📖 Dịch câu hỏi: [Dịch tự nhiên câu đề/ý chính]\\n\\n📌 Phân tích các phương án:\\n✗ (b) [nghĩa & lý do sai]\\n...\\n\\n💡 Mẹo làm bài: [1 mẹo ngắn tránh bẫy]" (chỉ liệt kê phương án sai bằng ✗).

TRẢ VỀ DUY NHẤT 1 JSON:
{
  "sections": [
    {
      "type": "vocabulary",
      "title": "Từ vựng (文字・語彙)",
      "questions": [
        {
          "mondai": 1,
          "mondaiTitle": "問題1：漢字読み",
          "questionNumber": 1,
          "passage": "",
          "question": "...",
          "options": ["...", "...", "...", "..."],
          "correctAnswer": 0,
          "explanation": "..."
        }
      ]
    }
  ]
}`;

        try {
            const raw = await callAI(prompt, effectiveModel, 'pdf_ingest', 24576);
            const parsed = safeParseJsonWithRepair(raw);
            let extractedCount = 0;
            (parsed?.sections || []).forEach((sec) => {
                const secType = ['vocabulary', 'grammar', 'kanji', 'reading'].includes(sec.type) ? sec.type : 'vocabulary';
                if (!questionBucketBySec.has(secType)) {
                    questionBucketBySec.set(secType, {
                        type: secType,
                        title: sec.title || secType,
                        map: new Map()
                    });
                }
                const target = questionBucketBySec.get(secType);
                const secOneBased = detectBatchOneBasedIndexing(sec.questions || [], false);
                (sec.questions || []).forEach((q) => {
                    const opts = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
                    if (opts.length < 3 || !q.question) return;

                    const mNum = resolveQuestionMondai(q, q.mondaiTitle || '', 15);
                    const mMeta = resolveSectionMondaiMeta(bp.level, secType, mNum, sec.title || '');
                    const normAns = normalizeAnswerIndex(q.correctAnswer ?? q.answer ?? 0, opts, { oneBased: secOneBased });

                    const cleanQ = {
                        mondai: mNum,
                        mondaiTitle: q.mondaiTitle || `問題${mNum}：${mMeta.ja}`,
                        questionNumber: Number(q.questionNumber) || 0,
                        question: String(q.question || '').trim(),
                        options: opts,
                        correctAnswer: normAns,
                        answer: normAns,
                        explanation: String(q.explanation || '').trim()
                    };
                    if (q.passage) cleanQ.passage = String(q.passage).trim();

                    const dedupeKey = normalizeDedupeKey(secType, cleanQ);
                    target.map.set(dedupeKey, mergeRichQuestion(target.map.get(dedupeKey), cleanQ));
                    extractedCount++;
                });
            });
            onLog(`✅ Ngôn ngữ/Đọc (${labelSuffix}) trích được ${extractedCount} câu.`);
        } catch (err) {
            if (allowSplitRetry && chunkText.length > 1600) {
                onLog(`🔄 Đoạn (${labelSuffix}) phản hồi bị ngắt JSON (${err.message}), tự động chia nhỏ làm đôi để thử lại...`);
                const mid = Math.floor(chunkText.length / 2);
                const splitPos = chunkText.indexOf('\n', mid);
                const cut = splitPos !== -1 && splitPos < chunkText.length - 200 ? splitPos : mid;
                await extractChunkText(chunkText.slice(0, cut + 200), `${labelSuffix}-a`, false);
                await extractChunkText(chunkText.slice(Math.max(0, cut - 200)), `${labelSuffix}-b`, false);
            } else {
                onLog(`⚠️ Lỗi AI phần Ngôn ngữ/Đọc (${labelSuffix}): ${err.message}`);
            }
        }
    };

    for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) throw new Error('Đã hủy xử lý phần Kiến thức ngôn ngữ & Đọc hiểu.');
        const chunk = chunks[i];
        onProgress({
            stage: 'AI_LANG_READING',
            percent: Math.round((i / chunks.length) * 100),
            detail: `Đang phân tích Kiến thức ngôn ngữ & Đọc hiểu phần ${i + 1}/${chunks.length}...`
        });
        onLog(`📘 ${bp.level} (${bp.eraLabel}) · Từ vựng/Ngữ pháp/Đọc hiểu [${i + 1}/${chunks.length}]...`);
        await extractChunkText(chunk.text, `Đoạn ${i + 1}/${chunks.length}`, true);
    }

    onProgress({ stage: 'AI_LANG_READING', percent: 100, detail: `Hoàn tất chuẩn hóa ${bp.level} (${bp.eraLabel}).` });

    const defaultOrder = { kanji: 1, vocabulary: 2, grammar: 3, reading: 4 };
    return Array.from(questionBucketBySec.values())
        .sort((a, b) => (defaultOrder[a.type] || 9) - (defaultOrder[b.type] || 9))
        .map((bucket) => {
            const qs = Array.from(bucket.map.values()).sort((a, b) => {
                if (a.questionNumber && b.questionNumber) return a.questionNumber - b.questionNumber;
                return (a.mondai || 0) - (b.mondai || 0);
            });
            return {
                type: bucket.type,
                title: bucket.title,
                questions: qs
            };
        })
        .filter((s) => s.questions.length > 0);
};

const DEFAULT_SEC_TITLES = {
    vocabulary: 'Từ vựng (文字・語彙)',
    grammar: 'Ngữ pháp (文法)',
    reading: 'Đọc hiểu (読解)',
    listening: 'Nghe hiểu (聴解)'
};

const stripOptionLeadingNumber = (raw = '') => String(raw ?? '')
    .replace(/^\s*[1-4１-４][.)．、:\s]+/, '')
    .trim();

const normalizeListeningItemFromExternal = (q = {}, idx = 0, level = 'N3', secTitle = '', mondaiAudioUrls = {}, oneBased = false) => {
    const mNum = resolveQuestionMondai(q, q.mondaiTitle || secTitle || '', 5);
    const mMeta = resolveSectionMondaiMeta(level, 'listening', mNum, secTitle || '');
    const isThreeOpt = isThreeOptionMondai(level, mNum);
    const expectedOptLen = isThreeOpt ? 3 : 4;

    const rawOpts = Array.isArray(q.options) ? q.options.map(stripOptionLeadingNumber).filter(Boolean) : [];
    const bareFallback = Array.from({ length: expectedOptLen }, (_, k) => String(k + 1));
    let opts = rawOpts.length >= 3 ? rawOpts : bareFallback;
    if (isThreeOpt && opts.length > 3) opts = opts.slice(0, 3);

    const subQuestions = Array.isArray(q.subQuestions) && q.subQuestions.length > 0
        ? q.subQuestions.map((sq, sqIdx) => {
            const sqRaw = Array.isArray(sq.options) ? sq.options.map(stripOptionLeadingNumber).filter(Boolean) : [];
            const sqOpts = sqRaw.length >= 3 ? sqRaw : bareFallback;
            return {
                question: String(sq.question || `質問${sqIdx + 1}`).trim(),
                options: sqOpts,
                correctAnswer: normalizeAnswerIndex(sq.correctAnswer ?? sq.answer ?? 0, sqOpts, { oneBased }),
                explanation: String(sq.explanation || '').trim()
            };
        })
        : null;

    const qNum = Number(q.questionNumber) || (idx + 1);
    const banFallback = `${qNum}番`;
    const rawQClean = String(q.question || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const looksSpokenSpoiler = Boolean(rawQClean) && (
        /(?:話しています|話して|聞いて|質問|か[。？?]|何[をが]|どう[しす])/.test(rawQClean)
        || /<p>/i.test(String(q.question || ''))
        || (q.stem && rawQClean.includes(String(q.stem).trim()))
        || (q.spokenQuestion && rawQClean.includes(String(q.spokenQuestion).trim()))
    );
    const questionText = (looksSpokenSpoiler && !q.paperPrompt)
        ? banFallback
        : String(q.question || q.paperPrompt || banFallback).trim();
    if (!questionText && !subQuestions?.length && !(Array.isArray(q.script) && q.script.length > 0)) return null;

    const normAns = normalizeAnswerIndex(q.correctAnswer ?? q.answer ?? 0, opts, { oneBased });
    const cleanScript = Array.isArray(q.script)
        ? q.script
            .map((line) => ({
                speaker: String(line?.speaker || 'Narrator').trim() || 'Narrator',
                ja: String(line?.ja || '').trim(),
                vi: String(line?.vi || '').trim()
            }))
            .filter((line) => line.ja || line.vi)
        : [];

    const item = {
        mondai: mNum,
        mondaiTitle: q.mondaiTitle || `問題${mNum}：${mMeta.ja}`,
        questionNumber: qNum,
        question: questionText,
        options: opts,
        correctAnswer: normAns,
        answer: normAns,
        audioUrl: String(mondaiAudioUrls?.[mNum] || q.audioUrl || '').trim(),
        explanation: String(q.explanation || '').trim(),
        script: cleanScript
    };

    if (q.paperPrompt) item.paperPrompt = String(q.paperPrompt).trim();
    if (q.stem) item.stem = String(q.stem).trim();
    else if (looksSpokenSpoiler && rawQClean) item.stem = rawQClean;
    if (q.spokenQuestion) item.spokenQuestion = String(q.spokenQuestion).trim();
    if (Array.isArray(q.spokenOptions) && q.spokenOptions.length > 0) {
        item.spokenOptions = q.spokenOptions.map((s) => String(s || '').trim()).filter(Boolean);
    }
    if (subQuestions) item.subQuestions = subQuestions;
    if (q.imageUrl) item.imageUrl = String(q.imageUrl).trim();
    return item;
};

/**
 * Parses external JSON from Gemini Web (Pro / 4 Neon) into both non-listening sections AND listening questions.
 */
export const parseGeminiExternalJsonBundle = (rawText = '', level = 'N3', mondaiAudioUrls = {}) => {
    const parsed = safeParseJsonWithRepair(rawText);
    if (!parsed) throw new Error('Không tìm thấy JSON hợp lệ trong văn bản dán vào.');

    let rawSections = [];
    if (Array.isArray(parsed)) {
        const looksLikeListening = parsed.some((item) => Array.isArray(item?.script) || item?.audioUrl !== undefined);
        rawSections = parsed[0]?.questions
            ? parsed
            : [{
                type: looksLikeListening ? 'listening' : 'vocabulary',
                title: looksLikeListening ? DEFAULT_SEC_TITLES.listening : DEFAULT_SEC_TITLES.vocabulary,
                questions: parsed
            }];
    } else if (Array.isArray(parsed.sections)) {
        rawSections = parsed.sections;
    } else if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const looksLikeListening = parsed.questions.some(
            (item) => Array.isArray(item?.script) || item?.audioUrl !== undefined || item?.spokenQuestion !== undefined
        );
        rawSections = [{
            type: looksLikeListening ? 'listening' : 'vocabulary',
            title: looksLikeListening ? DEFAULT_SEC_TITLES.listening : DEFAULT_SEC_TITLES.vocabulary,
            questions: parsed.questions
        }];
    } else {
        ['vocabulary', 'grammar', 'reading', 'listening'].forEach((k) => {
            if (Array.isArray(parsed[k]) && parsed[k].length > 0) {
                rawSections.push({ type: k, title: DEFAULT_SEC_TITLES[k], questions: parsed[k] });
            }
        });
    }

    const allSamplesForIndexDetection = rawSections.flatMap((sec) => {
        const isListen = sec?.type === 'listening' || /聴解|nghe|listening/i.test(sec?.title || '');
        return (sec.questions || []).map((q) => {
            if (!isListen || (Array.isArray(q?.options) && q.options.length >= 2)) return q;
            const mNum = resolveQuestionMondai(q, q?.mondaiTitle || sec?.title || '', 5);
            const expectedLen = isThreeOptionMondai(level, mNum) ? 3 : 4;
            return { ...q, options: Array.from({ length: expectedLen }, (_, k) => String(k + 1)) };
        });
    });
    const bundleOneBased = detectBatchOneBasedIndexing(allSamplesForIndexDetection, false);

    const bucketMap = new Map();
    const listeningBucket = new Map();

    rawSections.forEach((sec) => {
        const secType = ['vocabulary', 'grammar', 'kanji', 'reading', 'listening'].includes(sec?.type)
            ? sec.type
            : (/聴解|nghe|listening/i.test(sec?.title || '') ? 'listening' : 'vocabulary');

        if (secType === 'listening') {
            (sec.questions || []).forEach((q, idx) => {
                const cleanListen = normalizeListeningItemFromExternal(q, idx, level, sec.title || '', mondaiAudioUrls, bundleOneBased);
                if (!cleanListen) return;
                const dedupeKey = normalizeDedupeKey('listening', cleanListen);
                listeningBucket.set(dedupeKey, cleanListen);
            });
            return;
        }

        if (!bucketMap.has(secType)) {
            bucketMap.set(secType, {
                type: secType,
                title: sec.title || DEFAULT_SEC_TITLES[secType] || secType,
                map: new Map()
            });
        }
        const bucket = bucketMap.get(secType);

        (sec.questions || []).forEach((q, idx) => {
            const rawOpts = Array.isArray(q.options) ? q.options : [];
            const opts = rawOpts.map(stripOptionLeadingNumber).filter(Boolean);
            if (opts.length < 3 || !q.question) return;

            const mNum = resolveQuestionMondai(q, q.mondaiTitle || sec.title || '', 15);
            const mMeta = resolveSectionMondaiMeta(level, secType, mNum, sec.title || '');
            const normAns = normalizeAnswerIndex(q.correctAnswer ?? q.answer ?? 0, opts, { oneBased: bundleOneBased });

            const cleanQ = {
                mondai: mNum,
                mondaiTitle: q.mondaiTitle || `問題${mNum}：${mMeta.ja}`,
                questionNumber: Number(q.questionNumber) || (idx + 1),
                question: String(q.question || '').trim(),
                options: opts,
                correctAnswer: normAns,
                answer: normAns,
                explanation: String(q.explanation || '').trim()
            };
            if (q.passage) cleanQ.passage = String(q.passage).trim();
            if (q.passageData) {
                const pd = normalizePassageBreakdownPayload(q.passageData, cleanQ.passage || '');
                if (pd) cleanQ.passageData = pd;
            }

            const dedupeKey = normalizeDedupeKey(secType, cleanQ);
            bucket.map.set(dedupeKey, mergeRichQuestion(bucket.map.get(dedupeKey), cleanQ));
        });
    });

    const defaultOrder = { kanji: 1, vocabulary: 2, grammar: 3, reading: 4 };
    const nonListeningSections = Array.from(bucketMap.values())
        .sort((a, b) => (defaultOrder[a.type] || 9) - (defaultOrder[b.type] || 9))
        .map((bucket) => ({
            type: bucket.type,
            title: bucket.title,
            questions: propagateSharedPassageData(Array.from(bucket.map.values()).sort((a, b) => {
                if (a.questionNumber && b.questionNumber) return a.questionNumber - b.questionNumber;
                return (a.mondai || 0) - (b.mondai || 0);
            }))
        }))
        .filter((s) => s.questions.length > 0);

    const listeningQuestions = Array.from(listeningBucket.values()).sort((a, b) => {
        if ((a.mondai || 0) !== (b.mondai || 0)) return (a.mondai || 0) - (b.mondai || 0);
        return (a.questionNumber || 0) - (b.questionNumber || 0);
    });

    if (nonListeningSections.length === 0 && listeningQuestions.length === 0) {
        throw new Error('JSON hợp lệ nhưng chưa có câu hỏi nào ở định dạng { sections: [{ type, questions }] }.');
    }

    return {
        nonListeningSections,
        listeningQuestions
    };
};

/**
 * Smartly merges imported Listening questions (e.g. from Neon AI Script + Explanation JSON)
 * into existing listening questions while ALWAYS preserving existing sliced audio URLs and illustrations,
 * even when `mergeMode === 'replace'` ("Thay thế phần tương ứng").
 */
export const mergeListeningScriptAndQuestions = (
    existingList = [],
    incomingList = [],
    mergeMode = 'append',
    knownMondaiAudioUrls = {},
    fallbackAudioUrl = ''
) => {
    const existingAudioByMondai = { ...(knownMondaiAudioUrls || {}) };
    const existingByKey = new Map();
    const existingBySeq = new Map();

    existingList.forEach((q) => {
        const mNum = resolveQuestionMondai(q, '', 5);
        const qNum = q.questionNumber || 0;
        const key = `${mNum}_${qNum}`;
        existingByKey.set(key, q);
        if (!existingBySeq.has(mNum)) existingBySeq.set(mNum, []);
        existingBySeq.get(mNum).push(q);
        if (q.audioUrl && !existingAudioByMondai[mNum]) {
            existingAudioByMondai[mNum] = q.audioUrl;
        }
    });

    const seqCursorByMondai = new Map();
    const pickOldMatch = (inc) => {
        const mNum = resolveQuestionMondai(inc, '', 5);
        const byExactKey = existingByKey.get(`${mNum}_${inc.questionNumber || 0}`);
        if (byExactKey) return byExactKey;
        const list = existingBySeq.get(mNum) || [];
        const cur = seqCursorByMondai.get(mNum) || 0;
        seqCursorByMondai.set(mNum, cur + 1);
        return list[cur] || null;
    };

    if (mergeMode === 'replace' || existingList.length === 0) {
        return incomingList.map((inc) => {
            const mNum = resolveQuestionMondai(inc, '', 5);
            const old = pickOldMatch(inc);
            const resolvedAudioUrl = inc.audioUrl
                || knownMondaiAudioUrls?.[mNum]
                || old?.audioUrl
                || existingAudioByMondai[mNum]
                || fallbackAudioUrl
                || '';
            const next = {
                ...inc,
                audioUrl: resolvedAudioUrl,
                imageUrl: inc.imageUrl || old?.imageUrl || ''
            };
            // Preserve per-question timestamps only if incoming didn't set them and audioUrl was not replaced by a dedicated Mondai slice
            const hasDedicatedMondaiSlice = Boolean(knownMondaiAudioUrls?.[mNum]);
            if (!hasDedicatedMondaiSlice && !inc.audioUrl && typeof old?.audioStartSec === 'number' && typeof next.audioStartSec !== 'number') {
                next.audioStartSec = old.audioStartSec;
            }
            if (!hasDedicatedMondaiSlice && !inc.audioUrl && typeof old?.audioEndSec === 'number' && typeof next.audioEndSec !== 'number') {
                next.audioEndSec = old.audioEndSec;
            }
            return next;
        });
    }

    const map = new Map(existingByKey);

    incomingList.forEach((inc) => {
        const mNum = resolveQuestionMondai(inc, '', 5);
        const key = `${mNum}_${inc.questionNumber || 0}`;
        const old = map.get(key);
        const resolvedAudioUrl = inc.audioUrl
            || knownMondaiAudioUrls?.[mNum]
            || old?.audioUrl
            || existingAudioByMondai[mNum]
            || fallbackAudioUrl
            || '';

        if (!old) {
            map.set(key, {
                ...inc,
                audioUrl: resolvedAudioUrl
            });
            return;
        }

        const oldHasRealOpts = Array.isArray(old.options) && old.options.length > 0 && !isBareNumberOptions(old.options);
        const incIsBareOpts = !Array.isArray(inc.options) || inc.options.length === 0 || isBareNumberOptions(inc.options);
        const pickOptions = (oldHasRealOpts && incIsBareOpts) ? old.options : (inc.options?.length ? inc.options : old.options);

        const pickSubQuestions = Array.isArray(inc.subQuestions) && inc.subQuestions.length > 0
            ? inc.subQuestions.map((sq, sqi) => {
                const oldSq = Array.isArray(old.subQuestions) ? old.subQuestions[sqi] : null;
                if (!oldSq) return sq;
                const oldSqReal = Array.isArray(oldSq.options) && oldSq.options.length > 0 && !isBareNumberOptions(oldSq.options);
                const incSqBare = !Array.isArray(sq.options) || sq.options.length === 0 || isBareNumberOptions(sq.options);
                return {
                    ...oldSq,
                    ...sq,
                    options: (oldSqReal && incSqBare) ? oldSq.options : sq.options,
                    explanation: sq.explanation || oldSq.explanation || ''
                };
            })
            : old.subQuestions;

        const merged = {
            ...old,
            ...inc,
            question: (old.question && String(old.question).length > String(inc.question || '').length && incIsBareOpts)
                ? old.question
                : (inc.question || old.question),
            paperPrompt: inc.paperPrompt || old.paperPrompt || '',
            stem: inc.stem || old.stem || '',
            spokenQuestion: inc.spokenQuestion || old.spokenQuestion || '',
            spokenOptions: (inc.spokenOptions?.length > 0) ? inc.spokenOptions : (old.spokenOptions || []),
            options: pickOptions,
            script: (Array.isArray(inc.script) && inc.script.length > 0) ? inc.script : (old.script || []),
            explanation: (inc.explanation && inc.explanation.length >= (old.explanation || '').length)
                ? inc.explanation
                : (old.explanation || inc.explanation || ''),
            audioUrl: resolvedAudioUrl,
            imageUrl: inc.imageUrl || old.imageUrl || ''
        };
        if (pickSubQuestions) merged.subQuestions = pickSubQuestions;
        if (typeof old.audioStartSec === 'number') merged.audioStartSec = old.audioStartSec;
        if (typeof old.audioEndSec === 'number') merged.audioEndSec = old.audioEndSec;

        map.set(key, merged);
    });

    return Array.from(map.values()).sort(
        (a, b) => (resolveQuestionMondai(a, '', 5) - resolveQuestionMondai(b, '', 5)) || ((a.questionNumber || 0) - (b.questionNumber || 0))
    );
};

/**
 * Parses and normalizes external non-listening JSON sections generated by Gemini Web.
 */
export const parseGeminiExternalJsonSections = (rawText = '', level = 'N3') => {
    return parseGeminiExternalJsonBundle(rawText, level).nonListeningSections;
};
