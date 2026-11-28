import { getLevelExamBlueprint, resolveSectionMondaiMeta } from './jlptLevelBlueprints.js';
import { extractUnderlineTargetsFromQuestions, injectUnderlinesIntoHtml } from '../../utils/jlptExplanationParser.js';

export { getLevelExamBlueprint, resolveSectionMondaiMeta };

/**
 * Constants and metadata helpers for JLPT Yearly Exams (2010–2025)
 * and Level-specific Listening Mondai structure.
 */

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const JLPT_YEARS = Array.from({ length: 16 }, (_, idx) => 2025 - idx); // 2025 -> 2010

export const JLPT_SESSIONS = [
    { id: '12', label: 'Tháng 12', shortLabel: 'T12' },
    { id: '07', label: 'Tháng 07', shortLabel: 'T07' }
];

export const JLPT_TOTAL_TIME_BY_LEVEL = {
    N5: 90,
    N4: 115,
    N3: 140,
    N2: 155,
    N1: 165
};

export const JLPT_LISTENING_TIME_BY_LEVEL = {
    N5: 30,
    N4: 35,
    N3: 40,
    N2: 50,
    N1: 55
};

/**
 * Returns official JLPT exam timing breakdown (minutes) per level and exam period.
 * Reflects official jlpt.jp revisions:
 * - Dec 2020 (2020-12+): N5 -> 20/40/30 (90p), N4 -> 25/55/35 (115p)
 * - Dec 2022 (2022-12+): N1 Listening -> 55p (total 165p, down from 60p / 170p)
 */
export const getOfficialJlptTiming = (level = 'N3', testOrMeta = null) => {
    const lvl = String(level || 'N3').toUpperCase().trim();
    const meta = testOrMeta && (testOrMeta.year || testOrMeta.examYear)
        ? {
            year: Number(testOrMeta.year || testOrMeta.examYear) || null,
            session: String(testOrMeta.session || testOrMeta.examSession || '12').padStart(2, '0')
        }
        : parseYearlyExamMeta(testOrMeta);

    const year = meta?.year ? Number(meta.year) : null;
    const session = meta?.session ? String(meta.session).padStart(2, '0') : '12';
    const isPreDec2020 = Boolean(year && (year < 2020 || (year === 2020 && session === '07')));
    const isPreDec2022 = Boolean(year && (year < 2022 || (year === 2022 && session === '07')));

    switch (lvl) {
        case 'N5':
            return isPreDec2020
                ? { vocab: 25, grammarReading: 50, listening: 30, writtenTotal: 75, total: 105, era: 'legacy' }
                : { vocab: 20, grammarReading: 40, listening: 30, writtenTotal: 60, total: 90, era: 'modern' };
        case 'N4':
            return isPreDec2020
                ? { vocab: 30, grammarReading: 60, listening: 35, writtenTotal: 90, total: 125, era: 'legacy' }
                : { vocab: 25, grammarReading: 55, listening: 35, writtenTotal: 80, total: 115, era: 'modern' };
        case 'N3':
            return { vocab: 30, grammarReading: 70, listening: 40, writtenTotal: 100, total: 140, era: isPreDec2020 ? 'legacy' : 'modern' };
        case 'N2':
            return { langReading: 105, listening: 50, writtenTotal: 105, total: 155, era: 'modern' };
        case 'N1':
            return isPreDec2022
                ? { langReading: 110, listening: 60, writtenTotal: 110, total: 170, era: 'legacy' }
                : { langReading: 110, listening: 55, writtenTotal: 110, total: 165, era: 'modern' };
        default:
            return { vocab: 30, grammarReading: 70, listening: 40, writtenTotal: 100, total: 140, era: 'modern' };
    }
};

export const getOfficialJlptTotalMinutes = (test = null, hasAudioOverride = null) => {
    if (!test) return 60;
    const lvl = String(test.level || 'N3').toUpperCase().trim();
    const t = getOfficialJlptTiming(lvl, test);
    const hasAudio = typeof hasAudioOverride === 'boolean' ? hasAudioOverride : testHasListening(test);
    if (test.isSkillTest && test.skillType === 'listening') {
        return Number(test.timeLimit) || t.listening;
    }
    return hasAudio ? t.total : t.writtenTotal;
};

/**
 * Official JLPT Listening (聴解) Mondai definitions per level.
 * Note: N5/N4 have 4 Mondais, N3 has 5 Mondais (M4 = 発話表現, M5 = 即時応答),
 * while N2/N1 have 5 Mondais (M4 = 即時応答, M5 = 統合理解).
 */
export const JLPT_MONDAI_BY_LEVEL = {
    N5: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Nghe tình huống & câu hỏi, chọn hành động/tranh đúng.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Đọc sẵn 4 phương án và nghe thông tin cốt lõi.' },
        { mondai: 3, key: 'hatsuwa', ja: '発話表現', vi: 'Diễn đạt lời nói', desc: 'Nhìn tranh mũi tên, chọn câu nói mở đầu tự nhiên (3 lựa chọn).' },
        { mondai: 4, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Nghe 1 câu ngắn và chọn câu đáp lại phù hợp (3 lựa chọn).' }
    ],
    N4: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Nghe yêu cầu và chọn việc cần làm tiếp theo hoặc hình ảnh đúng.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Đọc trước các lựa chọn và bắt chi tiết quan trọng trong hội thoại.' },
        { mondai: 3, key: 'hatsuwa', ja: '発話表現', vi: 'Diễn đạt lời nói', desc: 'Quan sát tranh và chọn cách nói đúng ngữ cảnh (3 lựa chọn).' },
        { mondai: 4, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Phản hồi nhanh câu thoại ngắn trong đời sống (3 lựa chọn).' }
    ],
    N3: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Nghe câu hỏi và hội thoại để chọn việc cần làm chuẩn xác.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Đọc câu hỏi & 4 phương án, lọc thông tin trọng tâm.' },
        { mondai: 3, key: 'gaiyou', ja: '概要理解', vi: 'Hiểu khái quát', desc: 'Nghe hiểu chủ đề, ý chính hoặc quan điểm tổng quát (không in đề).' },
        { mondai: 4, key: 'hatsuwa', ja: '発話表現', vi: 'Diễn đạt lời nói', desc: 'Nhìn tranh hoàn cảnh, chọn lời thoại phù hợp với người chỉ mũi tên.' },
        { mondai: 5, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Nghe câu ngắn và chọn câu đối đáp tự nhiên (3 lựa chọn).' }
    ],
    N2: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Xác định hành động/quyết định chính xác sau cuộc trao đổi.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Đối chiếu lý do, điều kiện và dữ kiện cụ thể với 4 phương án.' },
        { mondai: 3, key: 'gaiyou', ja: '概要理解', vi: 'Hiểu khái quát', desc: 'Nắm bắt thông điệp, mục đích hoặc chủ đề toàn bài nghe.' },
        { mondai: 4, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Nghe câu nói giàu sắc thái/kính ngữ và chọn hồi đáp đúng (3 lựa chọn).' },
        { mondai: 5, key: 'tougou', ja: '統合理解', vi: 'Nghe tổng hợp', desc: 'Tổng hợp nhiều nguồn thông tin dài, phân tích điều kiện để chọn phương án.' }
    ],
    N1: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Xử lý hội thoại phức tạp và xác định hành động tiếp theo.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Bắt chính xác nguyên nhân, kết luận giữa nhiều thông tin gây nhiễu.' },
        { mondai: 3, key: 'gaiyou', ja: '概要理解', vi: 'Hiểu khái quát', desc: 'Hiểu luận điểm cốt lõi của bài thuyết trình, phỏng vấn, tin tức.' },
        { mondai: 4, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Phản xạ nhanh với câu nói tự nhiên, ẩn ý và kính ngữ N1.' },
        { mondai: 5, key: 'tougou', ja: '統合理解', vi: 'Nghe tổng hợp', desc: 'Nghe bài dài đa nhân vật và trả lời 1–2 câu hỏi tổng hợp lập luận.' }
    ]
};

export const getMondaiListForLevel = (level = 'N3') => {
    const norm = String(level || 'N3').toUpperCase().trim();
    return JLPT_MONDAI_BY_LEVEL[norm] || JLPT_MONDAI_BY_LEVEL.N3;
};

export const getMondaiMeta = (level = 'N3', mondaiNumber = 1) => {
    const list = getMondaiListForLevel(level);
    const num = Number(mondaiNumber) || 1;
    return list.find((m) => m.mondai === num) || list[0];
};

/**
 * Extracts yearly exam metadata (year 2010–2025, session '07'|'12') from a test object.
 */
export const parseYearlyExamMeta = (test) => {
    if (!test) return { isYearly: false, year: null, session: null, periodKey: '' };

    if (test.examYear && (test.examSession === '07' || test.examSession === '12' || test.examSession === 7 || test.examSession === 12)) {
        const y = Number(test.examYear);
        const s = String(test.examSession).padStart(2, '0');
        return { isYearly: true, year: y, session: s, periodKey: `${y}-${s}` };
    }

    const hay = `${test.id || ''} ${test.title || ''} ${test.bookSlug || ''}`;

    // Match patterns like 2023-12, 2023_07, 12/2023, 07/2023, 2023年12月, Tháng 7 năm 2023
    const yFirst = hay.match(/(201[0-9]|202[0-6])\s*[-_/年.\s]+\s*(0?[7]|12)/);
    if (yFirst) {
        const y = Number(yFirst[1]);
        const s = String(Number(yFirst[2])).padStart(2, '0');
        return { isYearly: true, year: y, session: s, periodKey: `${y}-${s}` };
    }

    const sFirst = hay.match(/(?:tháng|kỳ|ky|month|t)?\s*(0?[7]|12)\s*[-_/年.\s]+(201[0-9]|202[0-6])/i);
    if (sFirst) {
        const y = Number(sFirst[2]);
        const s = String(Number(sFirst[1])).padStart(2, '0');
        return { isYearly: true, year: y, session: s, periodKey: `${y}-${s}` };
    }

    return { isYearly: false, year: null, session: null, periodKey: '' };
};

const FULLWIDTH_DIGIT_MAP = { '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9' };

const normalizeAsciiDigits = (raw = '') => String(raw).replace(/[０-９]/g, (ch) => FULLWIDTH_DIGIT_MAP[ch] ?? ch);

/**
 * Resolves Mondai number (1..15) from a question object or title.
 */
export const resolveQuestionMondai = (q = {}, fallbackTitle = '', maxMondai = 15) => {
    const explicit = Number(q.mondai ?? q.mondaiNumber ?? 0);
    if (explicit >= 1 && explicit <= maxMondai) return explicit;

    const text = `${q.mondaiTitle || ''} ${q.stem || ''} ${q.question || ''} ${fallbackTitle || ''}`;
    const match = text.match(/(?:mondai|問題|\bm)\s*([0-9０-９]{1,2})/i);
    if (match) {
        const parsed = Number(normalizeAsciiDigits(match[1]));
        if (parsed >= 1 && parsed <= maxMondai) return parsed;
    }
    return 1;
};

/**
 * Checks whether a test contains listening sections (safe even on summary-only test objects).
 */
export const testHasListening = (test) => {
    if (!test) return false;
    if (test.hasListening) return true;
    if (test.skillType === 'listening') return true;
    if (Array.isArray(test.sections)) {
        return test.sections.some((s) => s?.type === 'listening' || /聴解|nghe hiểu|listening/i.test(s?.title || ''));
    }
    return /nghe hiểu|聴解|listening/i.test(`${test.title || ''} ${test.description || ''}`);
};

/**
 * Checks whether a JLPT Mondai uses 3 choices by official exam convention.
 */
export const isThreeOptionMondai = (level = 'N3', mondai = 1) => {
    const lvl = String(level || 'N3').toUpperCase().trim();
    const m = Number(mondai) || 1;
    if (lvl === 'N5' || lvl === 'N4') return m === 3 || m === 4;
    if (lvl === 'N3') return m === 4 || m === 5;
    if (lvl === 'N2' || lvl === 'N1') return m === 4;
    return false;
};

/**
 * Returns true if choices contain only bare option numbers (e.g. ["1","2","3","4"] or ["1","2","3"]).
 */
export const isBareNumberOptions = (options = []) => {
    if (!Array.isArray(options) || options.length === 0) return false;
    return options.every((opt, idx) => {
        const clean = String(opt ?? '').replace(/<[^>]+>/g, '').trim();
        return clean === String(idx + 1) || clean === String(idx + 1) + '.' || /^[1-4]$/.test(clean);
    });
};

/**
 * Returns normalized display metadata for a JLPT question (listening Mondai code, label, etc.).
 */
export const getListeningDisplayMeta = (question = {}, fallbackIndex = 0, sectionTitle = '', sectionType = '') => {
    const isExplicitNonListening = ['vocabulary', 'grammar', 'reading'].includes(sectionType) && !question.audioUrl;
    const isListening = !isExplicitNonListening && (
        sectionType === 'listening'
        || Boolean(question.audioUrl)
        || (Number(question.mondai) >= 1 && Number(question.mondai) <= 5)
        || /聴解|nghe hiểu|listening/i.test(sectionTitle || '')
    );

    const mondaiNum = resolveQuestionMondai(question, sectionTitle, isListening ? 5 : 15);
    const qNumInMondai = Number(question.questionNumber) || (fallbackIndex + 1);
    const pairCode = `${mondaiNum}-${qNumInMondai}`;
    const banLabel = `${qNumInMondai}番`;

    // Prevent spoken Whisper/Script text from leaking before listening on properly structured listening items
    const rawQText = String(question.question || '').replace(/<[^>]+>/g, '').trim();
    const stemClean = String(question.stem || '').trim();
    const spokenQClean = String(question.spokenQuestion || '').trim();
    const looksLikeSpokenAudio = isListening && (
        /(?:話しています|話して|聞いて|質問|何をしますか|どうしますか|何と言いますか)/.test(rawQText)
        || /<p>/i.test(String(question.question || ''))
        || (stemClean && rawQText.includes(stemClean))
        || (spokenQClean && rawQText.includes(spokenQClean))
    );
    const isPlaceholderOrSpoiler = !rawQText
        || rawQText === banLabel
        || rawQText === `${mondaiNum}-${qNumInMondai}`
        || looksLikeSpokenAudio;

    const paperPrompt = question.paperPrompt
        ? String(question.paperPrompt).trim()
        : (isListening && !isPlaceholderOrSpoiler ? question.question : (!isListening ? question.question : ''));

    return {
        isListening,
        mondaiNum,
        qNumInMondai,
        pairCode,
        banLabel,
        paperPrompt,
        hasExplicitMondai: Number(question.mondai ?? question.mondaiNumber ?? 0) >= 1
    };
};

/**
 * Groups an array of section questions by Mondai, supporting both Listening (1..5) and Lang/Reading (1..15).
 */
export const groupQuestionsByMondai = (questions = [], level = 'N3', sectionTitle = '', sectionType = '') => {
    const isListening = sectionType === 'listening'
        || (!['vocabulary', 'grammar', 'reading'].includes(sectionType) && /聴解|nghe hiểu|listening/i.test(sectionTitle || ''));
    const maxMondai = isListening ? 5 : 15;
    const groupsMap = new Map();
    const perMondaiCounter = {};

    questions.forEach((q, qIdx) => {
        const mNum = resolveQuestionMondai(q, sectionTitle, maxMondai);
        perMondaiCounter[mNum] = (perMondaiCounter[mNum] || 0) + 1;
        const qNumInMondai = Number(q.questionNumber) || perMondaiCounter[mNum];
        if (!groupsMap.has(mNum)) {
            groupsMap.set(mNum, {
                mondai: mNum,
                meta: isListening ? getMondaiMeta(level, mNum) : resolveSectionMondaiMeta(level, sectionType, mNum, sectionTitle),
                items: []
            });
        }
        groupsMap.get(mNum).items.push({
            question: q,
            qIdx,
            mondai: mNum,
            qNumInMondai,
            pairCode: `${mNum}-${qNumInMondai}`,
            banLabel: isListening ? `${qNumInMondai}番` : `Câu ${qNumInMondai}`
        });
    });

    const groups = Array.from(groupsMap.values()).sort((a, b) => a.mondai - b.mondai);
    const hasExplicitMondais = questions.some((q) => Number(q?.mondai ?? q?.mondaiNumber) >= 1);
    return {
        groups,
        hasMondaiStructure: groups.length > 1 || hasExplicitMondais,
        isListening
    };
};

const extractQuestionPassage = (q = {}, sectionPassages = null) => {
    const rawFromIndex = Array.isArray(sectionPassages) && typeof q.passageIndex === 'number'
        ? sectionPassages[q.passageIndex]
        : null;
    const passageHtml = q.passage || rawFromIndex?.passage || '';
    const passageData = q.passageData || rawFromIndex?.passageData || null;
    const normalizedKey = String(passageHtml || passageData?.japanese || '')
        .replace(/\s+/g, ' ')
        .trim();
    const hasPassage = Boolean(passageData || normalizedKey.length > 0);
    return { passageHtml, passageData, normalizedKey, hasPassage };
};

/**
 * Groups consecutive section questions sharing a reading passage into unified display clusters
 * so the reading passage sits cleanly ABOVE all of its questions rather than splitting Question 1 or detaching Question 2+.
 */
export const buildSectionDisplayClusters = ({
    questions = [],
    sectionPassages = null,
    sectionTitle = '',
    sectionType = '',
    mondaiFilter = 'all',
    hasMondaiStructure = false,
    mondaiGroups = []
}) => {
    const clusters = [];
    let lastShownMondai = null;

    questions.forEach((q, qIdx) => {
        const qMeta = getListeningDisplayMeta(q, qIdx, sectionTitle, sectionType);
        if (hasMondaiStructure && mondaiFilter !== 'all' && String(mondaiFilter) !== String(qMeta.mondaiNum)) {
            return;
        }

        const mondaiGroup = hasMondaiStructure && lastShownMondai !== qMeta.mondaiNum
            ? (mondaiGroups.find((g) => g.mondai === qMeta.mondaiNum) || null)
            : null;
        if (hasMondaiStructure) lastShownMondai = qMeta.mondaiNum;

        const passageInfo = extractQuestionPassage(q, sectionPassages);
        const entry = { question: q, qIdx, qMeta };

        if (!qMeta.isListening && passageInfo.hasPassage) {
            const prevCluster = clusters[clusters.length - 1];
            const canMergeWithPrev = prevCluster
                && prevCluster.isPassageCluster
                && prevCluster.mondaiNum === qMeta.mondaiNum
                && passageInfo.normalizedKey.length >= 10
                && prevCluster.passageKey === passageInfo.normalizedKey;

            if (canMergeWithPrev) {
                prevCluster.items.push(entry);
                return;
            }

            clusters.push({
                id: `cluster_${qIdx}`,
                isPassageCluster: true,
                mondaiNum: qMeta.mondaiNum,
                mondaiGroup,
                passageKey: passageInfo.normalizedKey,
                passageHtml: passageInfo.passageHtml,
                passageData: passageInfo.passageData,
                explanationText: q.explanation || q.detail || '',
                firstQuestion: q,
                items: [entry]
            });
            return;
        }

        clusters.push({
            id: `single_${qIdx}`,
            isPassageCluster: false,
            mondaiNum: qMeta.mondaiNum,
            mondaiGroup,
            items: [entry]
        });
    });

    return clusters.map((cluster) => {
        if (!cluster.isPassageCluster || !cluster.passageHtml) return cluster;
        const targets = extractUnderlineTargetsFromQuestions(
            cluster.items.map((it) => it.question),
            cluster.passageHtml
        );
        if (targets.length === 0) return cluster;
        return {
            ...cluster,
            passageHtml: injectUnderlinesIntoHtml(cluster.passageHtml, targets)
        };
    });
};

/**
 * Returns a single shared audioUrl when a Mondai group (>= 2 questions) shares one whole-Mondai audio
 * file with no per-question start/end timestamps (e.g. sliced per Mondai). Returns '' otherwise.
 */
export const resolveSharedMondaiAudioUrl = (mondaiGroup) => {
    const items = mondaiGroup?.items;
    if (!Array.isArray(items) || items.length < 2) return '';
    const firstUrl = String(items[0]?.question?.audioUrl || '').trim();
    if (!firstUrl) return '';
    const allSameWholeTrack = items.every(({ question }) => {
        if (!question) return false;
        const url = String(question.audioUrl || '').trim();
        const hasTimestampSlice = typeof question.audioStartSec === 'number'
            && typeof question.audioEndSec === 'number'
            && question.audioEndSec > question.audioStartSec;
        return url === firstUrl && !hasTimestampSlice;
    });
    return allSameWholeTrack ? firstUrl : '';
};
