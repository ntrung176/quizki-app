/**
 * Official JLPT Scoring Engine based on DungMori 2024+ per-Mondai point weights,
 * automatically extrapolated proportionally for legacy JLPT exams (2010–2021) or custom question counts.
 */
import { normalizeJlptLevel, getExamEra } from '../components/jlptTest/jlptLevelBlueprints.js';
import { resolveQuestionMondai, parseYearlyExamMeta, getOfficialJlptTiming } from '../components/jlptTest/jlptYearlyConstants.js';

/**
 * Per-Mondai base weights & expected 2024 question counts from DungMori scoring tables.
 * Keys inside `grammar` and `reading` support BOTH official booklet numbers (e.g. N2 Reading M10..M14)
 * and 1-based section-local numbers (e.g. M1..M5).
 */
export const JLPT_SCORING_BLUEPRINTS = {
    N5: {
        passTotal: 80,
        domains: [
            { id: 'lang_reading', label: 'Từ vựng · Ngữ pháp · Đọc hiểu', ja: '言語知識・読解', max: 120, minPass: 38, types: ['kanji', 'vocabulary', 'grammar', 'reading'] },
            { id: 'listening', label: 'Nghe hiểu', ja: '聴解', max: 60, minPass: 19, types: ['listening'] }
        ],
        weights: {
            vocabulary: {
                1: { ja: '漢字読み', vi: 'Đọc chữ Hán', weight: 2, modernCount: 7 },
                2: { ja: '表記', vi: 'Nhớ chữ Hán', weight: 2, modernCount: 5 },
                3: { ja: '文脈規定', vi: 'Chọn từ phù hợp với câu', weight: 2, modernCount: 6 },
                4: { ja: '言い換え類義', vi: 'Cách diễn đạt giống', weight: 3, modernCount: 3 }
            },
            grammar: {
                1: { ja: '文の文法1', vi: 'Chọn ngữ pháp phù hợp', weight: 3, modernCount: 9 },
                2: { ja: '文の文法2', vi: 'Sắp xếp câu ★', weight: 3, modernCount: 4 },
                3: { ja: '文章の文法', vi: 'Hoàn thành đoạn văn', weight: 3, modernCount: 4 }
            },
            reading: {
                4: { ja: '内容理解（短文）', vi: 'Đoạn văn ngắn', weight: 5, modernCount: 2 },
                5: { ja: '内容理解（中文）', vi: 'Trung văn', weight: 5, modernCount: 2 },
                6: { ja: '情報検索', vi: 'Tìm kiếm thông tin', weight: 4, modernCount: 1 }
            },
            listening: {
                1: { ja: '課題理解', vi: 'Hiểu đề bài', weight: 2.5, modernCount: 7 },
                2: { ja: 'ポイント理解', vi: 'Hiểu điểm chính', weight: 2.5, modernCount: 6 },
                3: { ja: '発話表現', vi: 'Diễn đạt bằng lời nói', weight: 2.5, modernCount: 5 },
                4: { ja: '即時応答', vi: 'Phản hồi tức thời', weight: 2.5, modernCount: 6 }
            }
        }
    },
    N4: {
        passTotal: 90,
        domains: [
            { id: 'lang_reading', label: 'Từ vựng · Ngữ pháp · Đọc hiểu', ja: '言語知識・読解', max: 120, minPass: 38, types: ['kanji', 'vocabulary', 'grammar', 'reading'] },
            { id: 'listening', label: 'Nghe hiểu', ja: '聴解', max: 60, minPass: 19, types: ['listening'] }
        ],
        weights: {
            vocabulary: {
                1: { ja: '漢字読み', vi: 'Đọc chữ Hán', weight: 1, modernCount: 7 },
                2: { ja: '表記', vi: 'Nhớ chữ Hán', weight: 2, modernCount: 5 },
                3: { ja: '文脈規定', vi: 'Chọn từ phù hợp với câu', weight: 2, modernCount: 8 },
                4: { ja: '言い換え類義', vi: 'Cách diễn đạt giống', weight: 2, modernCount: 4 },
                5: { ja: '用法', vi: 'Cách dùng đúng của từ', weight: 3, modernCount: 4 }
            },
            grammar: {
                1: { ja: '文の文法1', vi: 'Chọn ngữ pháp phù hợp', weight: 1, modernCount: 13 },
                2: { ja: '文の文法2', vi: 'Sắp xếp câu ★', weight: 3, modernCount: 4 },
                3: { ja: '文章の文法', vi: 'Hoàn thành đoạn văn', weight: 2.5, modernCount: 4 }
            },
            reading: {
                4: { ja: '内容理解（短文）', vi: 'Đoạn văn ngắn', weight: 3, modernCount: 3 },
                5: { ja: '内容理解（中文）', vi: 'Trung văn', weight: 5, modernCount: 3 },
                6: { ja: '情報検索', vi: 'Tìm kiếm thông tin', weight: 4, modernCount: 2 }
            },
            listening: {
                1: { ja: '課題理解', vi: 'Hiểu đề bài', weight: 2, modernCount: 8 },
                2: { ja: 'ポイント理解', vi: 'Hiểu điểm chính', weight: 2.5, modernCount: 7 },
                3: { ja: '発話表現', vi: 'Diễn đạt bằng lời nói', weight: 2.5, modernCount: 5 },
                4: { ja: '即時応答', vi: 'Phản hồi tức thời', weight: 1.75, modernCount: 8 }
            }
        }
    },
    N3: {
        passTotal: 95,
        domains: [
            { id: 'lang', label: 'Từ vựng · Ngữ pháp', ja: '言語知識', max: 60, minPass: 19, types: ['kanji', 'vocabulary', 'grammar'] },
            { id: 'reading', label: 'Đọc hiểu', ja: '読解', max: 60, minPass: 19, types: ['reading'] },
            { id: 'listening', label: 'Nghe hiểu', ja: '聴解', max: 60, minPass: 19, types: ['listening'] }
        ],
        weights: {
            vocabulary: {
                1: { ja: '漢字読み', vi: 'Đọc chữ Hán', weight: 1, modernCount: 8 },
                2: { ja: '表記', vi: 'Nhớ chữ Hán', weight: 1, modernCount: 6 },
                3: { ja: '文脈規定', vi: 'Chọn từ phù hợp với câu', weight: 1, modernCount: 11 },
                4: { ja: '言い換え類義', vi: 'Tìm từ đồng nghĩa', weight: 1, modernCount: 5 },
                5: { ja: '用法', vi: 'Cách dùng đúng của từ', weight: 1, modernCount: 5 }
            },
            grammar: {
                1: { ja: '文の文法1', vi: 'Chọn ngữ pháp phù hợp', weight: 1, modernCount: 13 },
                2: { ja: '文の文法2', vi: 'Sắp xếp câu ★', weight: 1, modernCount: 5 },
                3: { ja: '文章の文法', vi: 'Hoàn thành đoạn văn', weight: 1.75, modernCount: 4 }
            },
            reading: {
                4: { ja: '内容理解（短文）', vi: 'Đoạn văn ngắn', weight: 3.5, modernCount: 4 },
                5: { ja: '内容理解（中文）', vi: 'Trung văn', weight: 4, modernCount: 6 },
                6: { ja: '内容理解（長文）', vi: 'Trường văn', weight: 4, modernCount: 4 },
                7: { ja: '情報検索', vi: 'Tìm kiếm thông tin', weight: 3, modernCount: 2 }
            },
            listening: {
                1: { ja: '課題理解', vi: 'Hiểu đề bài', weight: 2, modernCount: 6 },
                2: { ja: 'ポイント理解', vi: 'Hiểu điểm chính', weight: 2, modernCount: 6 },
                3: { ja: '概要理解', vi: 'Hiểu bao quát', weight: 3, modernCount: 3 },
                4: { ja: '発話表現', vi: 'Diễn đạt bằng lời nói', weight: 2.25, modernCount: 4 },
                5: { ja: '即時応答', vi: 'Phản hồi tức thời', weight: 2, modernCount: 9 }
            }
        }
    },
    N2: {
        passTotal: 90,
        domains: [
            { id: 'lang', label: 'Từ vựng · Ngữ pháp', ja: '言語知識', max: 60, minPass: 19, types: ['kanji', 'vocabulary', 'grammar'] },
            { id: 'reading', label: 'Đọc hiểu', ja: '読解', max: 60, minPass: 19, types: ['reading'] },
            { id: 'listening', label: 'Nghe hiểu', ja: '聴解', max: 60, minPass: 19, types: ['listening'] }
        ],
        weights: {
            vocabulary: {
                1: { ja: '漢字読み', vi: 'Đọc chữ Hán', weight: 1, modernCount: 5 },
                2: { ja: '表記', vi: 'Nhớ chữ Hán', weight: 1, modernCount: 5 },
                3: { ja: '語形成', vi: 'Tiền tố, hậu tố', weight: 1, modernCount: 3 },
                4: { ja: '文脈規定', vi: 'Chọn từ phù hợp với câu', weight: 1, modernCount: 7 },
                5: { ja: '言い換え類義', vi: 'Tìm từ đồng nghĩa', weight: 1, modernCount: 5 },
                6: { ja: '用法', vi: 'Cách dùng đúng của từ', weight: 1, modernCount: 5 }
            },
            grammar: {
                7: { ja: '文の文法1', vi: 'Chọn ngữ pháp phù hợp', weight: 1, modernCount: 12 },
                8: { ja: '文の文法2', vi: 'Sắp xếp câu ★', weight: 2, modernCount: 5 },
                9: { ja: '文章の文法', vi: 'Hoàn thành đoạn văn', weight: 2, modernCount: 4 }
            },
            reading: {
                10: { ja: '内容理解（短文）', vi: 'Đoạn văn ngắn', weight: 3, modernCount: 5 },
                11: { ja: '内容理解（中文）', vi: 'Trung văn', weight: 3, modernCount: 8 },
                12: { ja: '総合理解', vi: 'Bài so sánh', weight: 3, modernCount: 2 },
                13: { ja: '主張理解（長文）', vi: 'Trường văn (luận điểm)', weight: 3, modernCount: 3 },
                14: { ja: '情報検索', vi: 'Tìm kiếm thông tin', weight: 3, modernCount: 2 }
            },
            listening: {
                1: { ja: '課題理解', vi: 'Hiểu đề bài', weight: 2, modernCount: 5 },
                2: { ja: 'ポイント理解', vi: 'Hiểu điểm chính', weight: 2.5, modernCount: 6 },
                3: { ja: '概要理解', vi: 'Hiểu bao quát', weight: 3, modernCount: 5 },
                4: { ja: '即時応答', vi: 'Phản hồi tức thời', weight: 1, modernCount: 11 },
                5: { ja: '統合理解', vi: 'Hiểu tổng hợp', weight: 3, modernCount: 3 }
            }
        }
    },
    N1: {
        passTotal: 100,
        domains: [
            { id: 'lang', label: 'Từ vựng · Ngữ pháp', ja: '言語知識', max: 60, minPass: 19, types: ['kanji', 'vocabulary', 'grammar'] },
            { id: 'reading', label: 'Đọc hiểu', ja: '読解', max: 60, minPass: 19, types: ['reading'] },
            { id: 'listening', label: 'Nghe hiểu', ja: '聴解', max: 60, minPass: 19, types: ['listening'] }
        ],
        weights: {
            vocabulary: {
                1: { ja: '漢字読み', vi: 'Đọc chữ Hán', weight: 1, modernCount: 6 },
                2: { ja: '文脈規定', vi: 'Chọn từ phù hợp với câu', weight: 1.5, modernCount: 7 },
                3: { ja: '言い換え類義', vi: 'Tìm từ đồng nghĩa', weight: 1, modernCount: 6 },
                4: { ja: '用法', vi: 'Cách dùng đúng của từ', weight: 1.25, modernCount: 6 }
            },
            grammar: {
                5: { ja: '文の文法1', vi: 'Chọn ngữ pháp phù hợp', weight: 1, modernCount: 10 },
                6: { ja: '文の文法2', vi: 'Sắp xếp câu ★', weight: 2, modernCount: 5 },
                7: { ja: '文章の文法', vi: 'Hoàn thành đoạn văn', weight: 2.5, modernCount: 4 }
            },
            reading: {
                8: { ja: '内容理解（短文）', vi: 'Đoạn văn ngắn', weight: 3, modernCount: 4 },
                9: { ja: '内容理解（中文）', vi: 'Trung văn', weight: 2.5, modernCount: 8 },
                10: { ja: '内容理解（長文）', vi: 'Trường văn (nội dung)', weight: 3, modernCount: 3 },
                11: { ja: '総合理解', vi: 'Bài so sánh', weight: 3, modernCount: 2 },
                12: { ja: '主張理解（長文）', vi: 'Trường văn (luận điểm)', weight: 3, modernCount: 3 },
                13: { ja: '情報検索', vi: 'Tìm kiếm thông tin', weight: 2, modernCount: 2 }
            },
            listening: {
                1: { ja: '課題理解', vi: 'Hiểu đề bài', weight: 2, modernCount: 5 },
                2: { ja: 'ポイント理解', vi: 'Hiểu điểm chính', weight: 2.5, modernCount: 6 },
                3: { ja: '概要理解', vi: 'Hiểu bao quát', weight: 3, modernCount: 5 },
                4: { ja: '即時応答', vi: 'Phản hồi tức thời', weight: 1, modernCount: 11 },
                5: { ja: '統合理解', vi: 'Hiểu tổng hợp', weight: 3, modernCount: 3 }
            }
        }
    }
};

const hasAudioQuestions = (sec = {}) => (
    Array.isArray(sec?.questions)
    && sec.questions.some((q) => Boolean(q?.audioUrl) || (typeof q?.audioStartSec === 'number' && q.audioStartSec >= 0))
);

const isCombinedWrittenSection = (sec = {}) => {
    const type = String(sec?.type || '').toLowerCase().trim();
    const title = String(sec?.title || '').toLowerCase();
    if (['full', 'mixed', 'lang_reading', 'written'].includes(type)) return true;
    return !type && (/tổng hợp|総合/.test(title) || (/言語知識/.test(title) && !/文字|語彙|vocabulary|từ vựng/.test(title)));
};

export const normalizeSectionSkill = (sec = {}) => {
    const type = String(sec?.type || '').toLowerCase().trim();
    const title = String(sec?.title || '').toLowerCase();
    if (type === 'listening' || type === 'audio' || type === 'choukai') return 'listening';
    const explicitWritten = ['vocabulary', 'kanji', 'grammar', 'reading', 'grammar_reading', 'lang_reading', 'full', 'mixed'].includes(type);
    if (explicitWritten) {
        if (Array.isArray(sec?.questions) && sec.questions.length > 0 && sec.questions.every((q) => Boolean(q?.audioUrl))) {
            return 'listening';
        }
        if (type === 'grammar_reading' || type === 'reading') return 'reading';
        if (type === 'grammar') return 'grammar';
        return 'vocabulary';
    }
    if (
        /聴解|ちょうかい|choukai|nghe hiểu|luyện nghe|phần nghe|listening/.test(title)
        || (/(?:mondai|問題)\s*[1-5]\s*[:：]\s*(?:課題理解|ポイント理解|概要理解|発話表現|即時応答|統合理解)/.test(title))
        || hasAudioQuestions(sec)
    ) {
        return 'listening';
    }
    if (/読解|đọc hiểu|reading/.test(title)) return 'reading';
    if (/文法|ngữ pháp|grammar/.test(title)) return 'grammar';
    return 'vocabulary';
};

/**
 * Computes offset when a grammar or reading section uses 1-based numbering (1..N) instead of booklet numbering.
 */
const resolveSectionMondaiOffset = (level, skillKey, questions = []) => {
    const bp = JLPT_SCORING_BLUEPRINTS[normalizeJlptLevel(level)];
    const table = bp?.weights?.[skillKey];
    if (!table || !questions.length) return 0;

    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    const minCanonical = keys[0];
    if (minCanonical <= 1) return 0;

    const rawNums = questions.map((q) => resolveQuestionMondai(q, q.mondaiTitle || '', 15));
    const maxFound = Math.max(...rawNums);
    const minFound = Math.min(...rawNums);
    const count = keys.length;

    if (minFound >= 1 && maxFound <= count && minFound < minCanonical) {
        return minCanonical - 1;
    }
    return 0;
};

/**
 * Resolves base weight and Mondai label for a single JLPT question using the level's DungMori blueprint.
 */
export const resolveQuestionScoringWeight = (level = 'N3', secSkill = 'vocabulary', q = {}, localOffset = 0) => {
    const lvl = normalizeJlptLevel(level);
    const bp = JLPT_SCORING_BLUEPRINTS[lvl] || JLPT_SCORING_BLUEPRINTS.N3;
    const skillKey = secSkill === 'kanji' ? 'vocabulary' : secSkill;
    const weightTable = bp.weights[skillKey] || {};
    const rawM = resolveQuestionMondai(q, q.mondaiTitle || '', skillKey === 'listening' ? 5 : 15);
    const mNum = rawM + localOffset;
    const entry = weightTable[mNum] || weightTable[rawM];
    if (entry) {
        const canonicalM = weightTable[mNum] ? mNum : rawM;
        return { mondai: canonicalM, ...entry };
    }

    // Semantic fallback by Japanese title when mondai index is shifted
    const title = `${q.mondaiTitle || ''} ${q.question || ''}`;
    const byKeyword = Object.entries(weightTable).find(([, def]) => (
        (/情報検索/.test(title) && /情報検索/.test(def.ja))
        || (/総合/.test(title) && /総合/.test(def.ja))
        || (/短文/.test(title) && /短文/.test(def.ja))
        || (/中文/.test(title) && /中文/.test(def.ja))
        || (/主張/.test(title) && /主張/.test(def.ja))
        || (/長文/.test(title) && /長文/.test(def.ja))
        || (/文章の文法/.test(title) && /文章の文法/.test(def.ja))
        || (/文の文法2/.test(title) && /文の文法2/.test(def.ja))
    ));
    if (byKeyword) {
        return { mondai: Number(byKeyword[0]), ...byKeyword[1] };
    }

    const fallbackWeight = skillKey === 'reading' ? 3 : (skillKey === 'listening' ? 2 : 1);
    return { mondai: mNum, ja: `問題${mNum}`, vi: `Mondai ${mNum}`, weight: fallbackWeight };
};

const resolveDomainForSkill = (domains, secSkill) => {
    return domains.find((d) => d.types.includes(secSkill)) || domains[0];
};

/**
 * Computes full official JLPT scaled scores (0..180, domain cutoffs 19/38, pass/fail, & per-Mondai breakdown).
 * Automatically handles 2022–2025 standard counts (1:1 DungMori weights) AND scales legacy 2010–2021
 * or custom question counts proportionally to exact 60/120 domain totals.
 */
export const computeJlptScoreBreakdown = ({
    test = null,
    answers = {},
    answerKeyFn = (si, qi) => `s${si}_q${qi}`,
    subAnswerKeyFn = (si, qi, sqi) => `s${si}_q${qi}_sq${sqi}`
} = {}) => {
    if (!test || !Array.isArray(test.sections) || test.sections.length === 0) return null;

    const lvl = normalizeJlptLevel(test.level || 'N3');
    const bp = JLPT_SCORING_BLUEPRINTS[lvl] || JLPT_SCORING_BLUEPRINTS.N3;
    const yearlyMeta = parseYearlyExamMeta(test);
    const examEra = yearlyMeta.isYearly && yearlyMeta.year ? getExamEra(yearlyMeta.year) : 'modern';

    const domainBuckets = new Map(
        bp.domains.map((d) => [d.id, {
            ...d,
            presentSkills: new Set(),
            rawEarned: 0,
            rawMax: 0,
            correctCount: 0,
            totalQuestions: 0,
            mondaiMap: new Map()
        }])
    );

    test.sections.forEach((sec, si) => {
        const secSkill = normalizeSectionSkill(sec);
        const domainDef = resolveDomainForSkill(bp.domains, secSkill);
        const dBucket = domainBuckets.get(domainDef.id);
        dBucket.presentSkills.add(secSkill);
        const localOffset = resolveSectionMondaiOffset(lvl, secSkill, sec.questions || []);

        (sec.questions || []).forEach((q, qi) => {
            const wInfo = resolveQuestionScoringWeight(lvl, secSkill, q, localOffset);
            const mKey = `${secSkill}_m${wInfo.mondai}`;
            if (!dBucket.mondaiMap.has(mKey)) {
                dBucket.mondaiMap.set(mKey, {
                    skill: secSkill,
                    mondai: wInfo.mondai,
                    ja: wInfo.ja,
                    vi: wInfo.vi,
                    baseWeight: wInfo.weight,
                    correctCount: 0,
                    totalQuestions: 0,
                    rawEarned: 0,
                    rawMax: 0
                });
            }
            const mBucket = dBucket.mondaiMap.get(mKey);

            if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                q.subQuestions.forEach((sq, sqi) => {
                    const userAns = answers[subAnswerKeyFn(si, qi, sqi)];
                    const isRight = userAns !== undefined && userAns === sq.correctAnswer;
                    dBucket.totalQuestions += 1;
                    dBucket.rawMax += wInfo.weight;
                    mBucket.totalQuestions += 1;
                    mBucket.rawMax += wInfo.weight;
                    if (isRight) {
                        dBucket.correctCount += 1;
                        dBucket.rawEarned += wInfo.weight;
                        mBucket.correctCount += 1;
                        mBucket.rawEarned += wInfo.weight;
                    }
                });
            } else {
                const userAns = answers[answerKeyFn(si, qi)];
                const isRight = userAns !== undefined && userAns === q.correctAnswer;
                dBucket.totalQuestions += 1;
                dBucket.rawMax += wInfo.weight;
                mBucket.totalQuestions += 1;
                mBucket.rawMax += wInfo.weight;
                if (isRight) {
                    dBucket.correctCount += 1;
                    dBucket.rawEarned += wInfo.weight;
                    mBucket.correctCount += 1;
                    mBucket.rawEarned += wInfo.weight;
                }
            }
        });
    });

    const activeDomains = Array.from(domainBuckets.values()).filter((d) => d.totalQuestions > 0);
    if (activeDomains.length === 0) return null;

    // Determine whether N5/N4 lang_reading domain actually contains BOTH reading and vocab/grammar (complete domain)
    const isCompleteDomain = (d) => {
        if (d.id !== 'lang_reading') return d.totalQuestions >= 10 || activeDomains.length === bp.domains.length;
        const hasReading = d.presentSkills.has('reading');
        const hasLang = d.presentSkills.has('vocabulary') || d.presentSkills.has('grammar');
        return hasReading && hasLang;
    };

    const isFullJlptExam = activeDomains.length === bp.domains.length && activeDomains.every(isCompleteDomain);

    let anyScaledFromLegacy = false;
    const domains = activeDomains.map((d) => {
        const complete = isCompleteDomain(d);
        const scaleTarget = complete ? d.max : d.rawMax;
        const scaleFactor = d.rawMax > 0 ? scaleTarget / d.rawMax : 1;
        const usesProportionalScaling = complete && Math.abs(scaleFactor - 1) > 0.005;
        if (usesProportionalScaling) anyScaledFromLegacy = true;

        const scaledScore = d.rawMax > 0
            ? Math.min(scaleTarget, Math.round((d.rawEarned / d.rawMax) * scaleTarget))
            : 0;

        const mondais = Array.from(d.mondaiMap.values()).map((m) => ({
            ...m,
            scaledPerQuestion: Number((m.baseWeight * scaleFactor).toFixed(2)),
            scaledMax: Number((m.rawMax * scaleFactor).toFixed(1)),
            scaledEarned: Number((m.rawEarned * scaleFactor).toFixed(1))
        }));

        const passedCutoff = complete ? scaledScore >= d.minPass : (scaledScore / Math.max(1, scaleTarget)) >= 0.5;
        return {
            id: d.id,
            label: d.label,
            ja: d.ja,
            score: scaledScore,
            max: Number(scaleTarget.toFixed(1)),
            minPass: complete ? d.minPass : Math.round(scaleTarget * 0.32),
            passedCutoff,
            complete,
            correctCount: d.correctCount,
            totalQuestions: d.totalQuestions,
            rawEarned: Number(d.rawEarned.toFixed(2)),
            rawMax: Number(d.rawMax.toFixed(2)),
            scaleFactor: Number(scaleFactor.toFixed(3)),
            usesProportionalScaling,
            mondais
        };
    });

    const totalScore = domains.reduce((s, d) => s + d.score, 0);
    const maxScore = domains.reduce((s, d) => s + d.max, 0);
    const effectivePassTarget = isFullJlptExam
        ? bp.passTotal
        : Math.round((bp.passTotal / 180) * maxScore);

    const cutoffFailedDomains = domains.filter((d) => !d.passedCutoff);
    const meetsTotal = totalScore >= effectivePassTarget;
    const meetsAllCutoffs = cutoffFailedDomains.length === 0;
    const passed = meetsTotal && meetsAllCutoffs;

    return {
        level: lvl,
        examEra,
        examYear: yearlyMeta.year || null,
        isFullJlptExam,
        anyScaledFromLegacy,
        totalScore: Number(totalScore.toFixed(1)),
        maxScore: Number(maxScore.toFixed(1)),
        passThreshold: effectivePassTarget,
        officialPassTotal: bp.passTotal,
        passed,
        meetsTotal,
        meetsAllCutoffs,
        failedByCutoffOnly: meetsTotal && !meetsAllCutoffs,
        cutoffFailedLabels: cutoffFailedDomains.map((d) => `${d.label} (${d.score}/${d.max} < ${d.minPass})`),
        domains
    };
};

/**
 * Official JLPT Real-Exam Timed Phases by Level & Exam Era (per jlpt.jp).
 * - N5/N4 revised Dec 2020 (2020-12+): N5 20/40/30 (90p), N4 25/55/35 (115p)
 * - N1 revised Dec 2022 (2022-12+): Listening 55p (110+55=165p, down from 60p/170p)
 * Always places Listening (聴解) into its own separate timed phase just like real JLPT exam rules.
 */
export const JLPT_OFFICIAL_PHASE_MINUTES = {
    N5: { legacy: { vocab: 25, grammarReading: 50, listening: 30 }, modern: { vocab: 20, grammarReading: 40, listening: 30 } },
    N4: { legacy: { vocab: 30, grammarReading: 60, listening: 35 }, modern: { vocab: 25, grammarReading: 55, listening: 35 } },
    N3: { legacy: { vocab: 30, grammarReading: 70, listening: 40 }, modern: { vocab: 30, grammarReading: 70, listening: 40 } },
    N2: { legacy: { langReading: 105, listening: 50 }, modern: { langReading: 105, listening: 50 } },
    N1: { legacy: { langReading: 110, listening: 60 }, modern: { langReading: 110, listening: 55 } }
};

/**
 * Splits a JLPT test's `sections` into official JLPT timed exam phases for Real Exam mode.
 * Guarantees Listening (聴解) ALWAYS runs on its own dedicated final clock across N5–N1,
 * while preserving explicit durations on standalone skill drills and book worksheets.
 * Returns `{ id, label, shortLabel, ja, minutes, seconds, sectionIndices, isListening }[]`.
 */
export const buildJlptExamPhases = (test = null) => {
    if (!test || !Array.isArray(test.sections) || test.sections.length === 0) return [];
    const lvl = normalizeJlptLevel(test.level || 'N3');
    const yearlyMeta = parseYearlyExamMeta(test);
    const timing = getOfficialJlptTiming(lvl, test);
    const isYearlyExam = Boolean(yearlyMeta.isYearly || test.category === 'yearly');

    const buckets = { vocab: [], grammarReading: [], langReading: [], listening: [] };
    let hasCombinedWritten = false;
    test.sections.forEach((sec, idx) => {
        const skill = normalizeSectionSkill(sec);
        if (skill === 'listening') {
            buckets.listening.push(idx);
        } else if (lvl === 'N2' || lvl === 'N1') {
            buckets.langReading.push(idx);
        } else {
            if (isCombinedWrittenSection(sec)) {
                hasCombinedWritten = true;
            }
            if (skill === 'vocabulary') {
                buckets.vocab.push(idx);
            } else {
                buckets.grammarReading.push(idx);
            }
        }
    });

    const isListeningOnlyDrill = buckets.listening.length > 0
        && buckets.vocab.length === 0
        && buckets.grammarReading.length === 0
        && buckets.langReading.length === 0
        && (Boolean(test.isSkillTest) || test.category === 'mondai_listening' || (test.timeLimit > 0 && test.timeLimit < timing.listening));

    if (isListeningOnlyDrill) {
        const mins = Math.max(1, Number(test.timeLimit) || timing.listening);
        return [{
            id: 'listening',
            label: 'Nghe hiểu (Tính giờ riêng)',
            shortLabel: 'Nghe hiểu',
            ja: '聴解',
            minutes: mins,
            seconds: mins * 60,
            sectionIndices: buckets.listening,
            isListening: true
        }];
    }

    const isStandaloneBookOrDrill = !isYearlyExam
        && buckets.listening.length === 0
        && (
            Boolean(test.isSkillTest)
            || String(test.id || '').includes('roadmap')
            || String(test.id || '').includes('worksheet')
            || (buckets.vocab.length === 0 && buckets.grammarReading.length === 0 && buckets.langReading.length <= 1)
            || (buckets.vocab.length > 0 && buckets.grammarReading.length === 0)
            || (buckets.grammarReading.length > 0 && buckets.vocab.length === 0)
        )
        && Number(test.timeLimit) > 0;

    if (isStandaloneBookOrDrill) {
        const mins = Math.max(1, Number(test.timeLimit) || 60);
        const allIndices = test.sections.map((_, idx) => idx);
        return [{
            id: 'drill',
            label: test.sections.length === 1 ? (test.sections[0].title || 'Làm bài chuẩn giờ') : 'Tổng thời gian bài thi',
            shortLabel: 'Làm bài',
            ja: '試験時間',
            minutes: mins,
            seconds: mins * 60,
            sectionIndices: allIndices,
            isListening: false
        }];
    }

    const phases = [];
    if (lvl === 'N2' || lvl === 'N1') {
        if (buckets.langReading.length > 0) {
            const mins = timing.langReading;
            phases.push({
                id: 'lang_reading',
                label: 'Kiến thức ngôn ngữ & Đọc hiểu',
                shortLabel: 'Ngôn ngữ & Đọc',
                ja: '言語知識（文字・語彙・文法）・読解',
                minutes: mins,
                seconds: mins * 60,
                sectionIndices: buckets.langReading,
                isListening: false
            });
        }
    } else if (hasCombinedWritten && buckets.vocab.length > 0 && buckets.grammarReading.length === 0) {
        const mins = timing.writtenTotal;
        phases.push({
            id: 'lang_reading',
            label: 'Kiến thức ngôn ngữ & Đọc hiểu',
            shortLabel: 'Ngôn ngữ & Đọc',
            ja: '言語知識・読解',
            minutes: mins,
            seconds: mins * 60,
            sectionIndices: buckets.vocab,
            isListening: false
        });
    } else {
        if (buckets.vocab.length > 0) {
            const mins = timing.vocab;
            phases.push({
                id: 'vocab',
                label: 'Từ vựng · Chữ Hán',
                shortLabel: 'Từ vựng',
                ja: '言語知識（文字・語彙）',
                minutes: mins,
                seconds: mins * 60,
                sectionIndices: buckets.vocab,
                isListening: false
            });
        }
        if (buckets.grammarReading.length > 0) {
            const mins = timing.grammarReading;
            phases.push({
                id: 'grammar_reading',
                label: 'Ngữ pháp & Đọc hiểu',
                shortLabel: 'Ngữ pháp & Đọc',
                ja: '言語知識（文法）・読解',
                minutes: mins,
                seconds: mins * 60,
                sectionIndices: buckets.grammarReading,
                isListening: false
            });
        }
    }

    if (buckets.listening.length > 0) {
        const mins = timing.listening;
        phases.push({
            id: 'listening',
            label: 'Nghe hiểu (Tính giờ riêng)',
            shortLabel: 'Nghe hiểu',
            ja: '聴解',
            minutes: mins,
            seconds: mins * 60,
            sectionIndices: buckets.listening,
            isListening: true
        });
    }

    return phases;
};
