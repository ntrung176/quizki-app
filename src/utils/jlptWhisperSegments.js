/**
 * Pure JLPT Whisper / Gemini audio transcript cue normalization,
 * Mondai keyword detection ("Mondai ichi", "Mondai ni", "問題1", etc.),
 * and question segmentation utilities.
 */

export const normalizeWhisperCueText = (raw = '') => {
    let s = String(raw || '')
        .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
        .replace(/モンダイ/g, '問題')
        .replace(/もんだい/g, '問題')
        .replace(/\bmondai\b/gi, '問題')
        .replace(/ばん/g, '番')
        .replace(/第\s*([1-9]|1[0-5])\s*番/g, '$1番');

    // Convert spoken romaji / katakana / hiragana / kanji numerals after 問題
    s = s
        .replace(/問題\s*(?:いち|いっち|位置|市|イチ|ichi|one|一)(?![0-9])/gi, '問題1')
        .replace(/問題\s*(?:にぃ?|荷|似|ニ|ni|two|二)(?!ついて|関|対|な|も|[0-9])/gi, '問題2')
        .replace(/問題\s*(?:さん|山|サン|san|three|三)(?![0-9])/gi, '問題3')
        .replace(/問題\s*(?:よん|ヨン|yon|four|四)(?![0-9])/gi, '問題4')
        .replace(/問題\s*(?:し)(?=\s|[。、．.,]|では|です|から|[1-9]|$)/g, '問題4')
        .replace(/問題\s*(?:ご|後|ゴ|go|five|五)(?![0-9]|ざ|存|覧|い|つ)/gi, '問題5');

    // Convert spoken kanji & unambiguous hiragana numerals directly preceding 番
    const numPairs = [
        ['じゅうご', '15'], ['じゅうよん', '14'], ['じゅうさん', '13'], ['じゅうに', '12'], ['じゅういち', '11'], ['じゅう', '10'],
        ['きゅう', '9'], ['はち', '8'], ['なな', '7'], ['しち', '7'], ['ろく', '6'], ['ご', '5'], ['よん', '4'], ['さん', '3'], ['に', '2'],
        ['十五', '15'], ['十四', '14'], ['十三', '13'], ['十二', '12'], ['十一', '11'],
        ['十', '10'], ['九', '9'], ['八', '8'], ['七', '7'], ['六', '6'],
        ['五', '5'], ['四', '4'], ['三', '3'], ['二', '2'], ['一', '1']
    ];
    numPairs.forEach(([k, d]) => {
        s = s.replace(new RegExp(`(^|[\\s。、．.「])${k}\\s*番`, 'g'), `$1${d}番`);
    });
    return s;
};

/**
 * Masks option-range narrator phrases ("1番から4番の中から") with equal-length spaces
 * so regex match indices still align 1:1 with the normalized transcript string.
 */
const maskNarratorOptionRanges = (norm = '') => norm
    .replace(/[1-4]\s*番\s*から\s*[2-4]\s*番\s*(?:の中|まで)/g, (m) => ' '.repeat(m.length))
    .replace(/選択肢\s*[1-4]\s*番/g, (m) => ' '.repeat(m.length));

const BAN_REGEX = /(?:^|[\s。、．.!！?？」])([1-9]|1[0-5])\s*番(?![目線好上下左右前後近遠からまでをがにはのとでもより])/g;
const EXPLICIT_MONDAI_REGEX = /問題\s*([1-5])(?:$|[\s。、．.,!！?？:：でではにはの])/;

/**
 * Fallback signature-phrase matcher if the exact spoken number after 問題 was distorted.
 */
const inferMondaiFromNarratorPrompt = (norm = '', level = 'N3') => {
    const isN4N5 = level === 'N4' || level === 'N5';
    if (!isN4N5 && /問題用紙に何も印刷されていません|全体のようす|全体の様子/.test(norm)) return 3;
    if (isN4N5 && /絵を見ながら/.test(norm) && /矢印/.test(norm)) return 3;
    if (/短い文|まず文を聞いて|1\s*(?:番)?\s*から\s*3\s*(?:番)?\s*の中/.test(norm)) return 4;
    if (!isN4N5 && /長い話を聞いて|質問\s*1\s*と\s*質問\s*2|メモをとっても/.test(norm)) return 5;
    return null;
};

/**
 * Extracts M1..M4/M5 boundary ranges & timeline cue pins from timestamped audio transcript segments.
 * Supports explicit ("Mondai ichi", "Mondai ni", "もんだい1", "問題2") and JLPT intro/outro cues.
 */
export const extractMondaiBoundariesFromSegments = (segments = [], {
    totalDuration = 0,
    level = 'N3',
    trimIntroAndExample = false
} = {}) => {
    const maxMondai = (level === 'N4' || level === 'N5') ? 4 : 5;
    const markers = [];
    const mondaiMap = new Map(); // mNum -> { mondai, cueStartSec, firstQuestionSec, exampleSeen, sampleText }
    let currentMondai = 0;
    let outroSec = null;

    const sortedSegs = [...(segments || [])].sort((a, b) => Number(a.start || 0) - Number(b.start || 0));

    sortedSegs.forEach((seg) => {
        const start = Number(seg.start || 0);
        const end = Number(seg.end || start);
        const rawText = String(seg.text || '').trim();
        if (!rawText) return;
        const norm = normalizeWhisperCueText(rawText);

        // Outro cue ("これで聴解試験を終わります")
        if (/これで.*(?:聴解|問題).*(?:終わり|おわり)|試験は終わり/.test(norm)) {
            if (outroSec === null) outroSec = Number(start.toFixed(1));
            markers.push({
                kind: 'outro',
                mondai: currentMondai || maxMondai,
                timeSec: Number(start.toFixed(1)),
                label: 'Kết thúc',
                text: rawText
            });
            return;
        }

        // Check explicit or narrator-signature Mondai cue
        const explicitMatch = norm.match(EXPLICIT_MONDAI_REGEX);
        let detectedM = explicitMatch ? Number(explicitMatch[1]) : null;
        if (!detectedM && /問題|では|質問|絵を見|聴解/.test(norm)) {
            const inferred = inferMondaiFromNarratorPrompt(norm, level);
            if (inferred && inferred > currentMondai && inferred <= maxMondai) {
                detectedM = inferred;
            }
        }

        if (detectedM && detectedM >= 1 && detectedM <= maxMondai) {
            const lastInfo = currentMondai > 0 ? mondaiMap.get(currentMondai) : null;
            const prevEndSec = lastInfo?.cueStartSec ?? -999;

            // Accept monotonic ascending Mondai OR refined first announcement within 8s if not yet duplicated
            if (detectedM > currentMondai && (start - prevEndSec >= 20 || currentMondai === 0)) {
                currentMondai = detectedM;
                const cueStart = Number(Math.max(0, start - 0.3).toFixed(1));
                mondaiMap.set(detectedM, {
                    mondai: detectedM,
                    cueStartSec: cueStart,
                    firstQuestionSec: null,
                    exampleSeen: false,
                    sampleText: rawText
                });
                markers.push({
                    kind: 'mondai',
                    mondai: detectedM,
                    timeSec: cueStart,
                    label: `M${detectedM}`,
                    text: rawText
                });
            }
        }

        if (currentMondai > 0) {
            const info = mondaiMap.get(currentMondai);
            const sanitized = maskNarratorOptionRanges(norm);
            const banMatches = [...sanitized.matchAll(BAN_REGEX)];

            if (banMatches.length === 0 && /(?:^|[\s。、．.])(?:例|れい)(?:$|[\s。、．.：:])|問題用紙の.*例/.test(norm)) {
                if (info) info.exampleSeen = true;
                markers.push({
                    kind: 'example',
                    mondai: currentMondai,
                    timeSec: Number(start.toFixed(1)),
                    label: `M${currentMondai} Ví dụ`,
                    text: rawText
                });
            } else if (banMatches.length > 0 && info) {
                const qNum = Number(banMatches[0][1]);
                if (qNum === 1 && info.firstQuestionSec === null && (start - info.cueStartSec >= 3)) {
                    const segDur = Math.max(0, end - start);
                    const cueIndex = banMatches[0].index || 0;
                    const ratio = cueIndex > 4 && norm.length > 0 ? Math.min(0.85, (cueIndex / norm.length) * 0.9) : 0;
                    const exactQStart = Number(Math.max(0, start + segDur * ratio - 0.25).toFixed(1));
                    info.firstQuestionSec = exactQStart;
                    markers.push({
                        kind: 'ban',
                        mondai: currentMondai,
                        timeSec: exactQStart,
                        label: `M${currentMondai}·1番`,
                        text: rawText
                    });
                }
            }
        }
    });

    const detectedNums = Array.from(mondaiMap.keys()).sort((a, b) => a - b);
    const maxTime = Number((totalDuration || (sortedSegs.at(-1)?.end || 0)).toFixed(1));
    const boundaries = {};

    detectedNums.forEach((mNum, idx) => {
        const cur = mondaiMap.get(mNum);
        const nextM = detectedNums[idx + 1];
        const nextInfo = nextM ? mondaiMap.get(nextM) : null;

        const chosenStart = (trimIntroAndExample && typeof cur.firstQuestionSec === 'number')
            ? cur.firstQuestionSec
            : cur.cueStartSec;
        const rawEnd = nextInfo
            ? Math.max(chosenStart + 5, nextInfo.cueStartSec - 0.4)
            : (outroSec && outroSec > chosenStart ? outroSec : maxTime);

        boundaries[mNum] = {
            mondai: mNum,
            cueStartSec: Math.round(cur.cueStartSec),
            firstQuestionSec: cur.firstQuestionSec !== null ? Math.round(cur.firstQuestionSec) : null,
            startSec: Math.max(0, Math.floor(chosenStart)),
            endSec: Math.max(Math.floor(chosenStart) + 1, Math.ceil(Math.min(maxTime || rawEnd, rawEnd))),
            sampleText: cur.sampleText
        };
    });

    return {
        boundaries,
        markers,
        detectedCount: detectedNums.length,
        outroSec
    };
};

/**
 * Heuristically groups Whisper timestamped segments into JLPT Mondai/Question blocks,
 * cleanly discarding Mondai transition narrations, instructions, "例" examples, and outro announcements.
 */
export const groupWhisperSegmentsIntoBlocks = (segments = [], totalDuration = 0) => {
    if (!Array.isArray(segments) || segments.length === 0) return [];

    let currentMondai = 1;
    let inIntroOrExample = true;
    const blocks = [];
    let currentBlock = null;

    const flush = () => {
        if (currentBlock && currentBlock.segments.length > 0) {
            const cleanedSegs = currentBlock.segments;
            currentBlock.transcriptJa = cleanedSegs
                .map((s) => `[${Number(s.start).toFixed(1)}s] ${s.text}`)
                .join('\n');
            const firstStart = Number(cleanedSegs[0].adjustedStart ?? cleanedSegs[0].start);
            const lastEnd = Number(cleanedSegs.at(-1).end);
            currentBlock.startSec = Number(Math.max(0, firstStart - 0.25).toFixed(1));
            currentBlock.endSec = Number(Math.min(totalDuration || lastEnd + 2, lastEnd + 1.0).toFixed(1));
            blocks.push(currentBlock);
        }
        currentBlock = null;
    };

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const norm = normalizeWhisperCueText(seg.text || '');

        if (/これで.*(?:聴解|問題).*(?:終わり|おわり)|試験は終わり/.test(norm)) {
            flush();
            inIntroOrExample = true;
            continue;
        }

        const sanitizedForBan = maskNarratorOptionRanges(norm);

        const mondaiMatch = norm.match(EXPLICIT_MONDAI_REGEX);
        if (mondaiMatch) {
            const nextM = Number(mondaiMatch[1]);
            if (currentBlock && (nextM !== currentMondai || /では|質問|絵を見|正しい答え|聴解/.test(norm))) {
                flush();
                inIntroOrExample = true;
            }
            currentMondai = nextM;
            const inlineBanMatches = [...sanitizedForBan.matchAll(BAN_REGEX)];
            if (inlineBanMatches.length === 0) {
                inIntroOrExample = true;
                continue;
            }
        }

        const banMatches = [...sanitizedForBan.matchAll(BAN_REGEX)];
        const validBan = banMatches.length > 0 ? banMatches[banMatches.length - 1] : null;

        const isExampleLine = !validBan && (/(?:^|[\s。、．.])(?:例|れい)(?:$|[\s。、．.：:、])|問題用紙の.*例/.test(norm));
        if (isExampleLine) {
            flush();
            inIntroOrExample = true;
            continue;
        }

        const prevEnd = currentBlock?.segments?.at(-1)?.end ?? seg.start;
        const gapFromPrev = seg.start - prevEnd;
        const splitGapSec = currentMondai >= 4 ? 3.2 : 6.0;

        if (validBan) {
            flush();
            inIntroOrExample = false;
            const qNum = Number(validBan[1]);
            const cueIndex = validBan.index || 0;
            const segDur = Math.max(0, seg.end - seg.start);
            const trimRatio = cueIndex > 4 && norm.length > 0 ? Math.min(0.85, (cueIndex / norm.length) * 0.9) : 0;
            const adjustedStart = Number((seg.start + segDur * trimRatio).toFixed(2));
            const cleanText = cueIndex > 4 ? norm.slice(cueIndex).trim() : seg.text;

            currentBlock = {
                mondai: currentMondai,
                questionNumber: qNum,
                segments: [{ ...seg, text: cleanText || seg.text, adjustedStart }]
            };
        } else if (inIntroOrExample) {
            continue;
        } else if (!currentBlock) {
            currentBlock = {
                mondai: currentMondai,
                questionNumber: blocks.filter((b) => b.mondai === currentMondai).length + 1,
                segments: [seg]
            };
        } else if (gapFromPrev >= splitGapSec && currentBlock.segments.length >= 2) {
            flush();
            currentBlock = {
                mondai: currentMondai,
                questionNumber: (blocks.filter((b) => b.mondai === currentMondai).at(-1)?.questionNumber || 0) + 1,
                segments: [seg]
            };
        } else {
            currentBlock.segments.push(seg);
        }
    }
    flush();

    return blocks;
};
