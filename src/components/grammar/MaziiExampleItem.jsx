import React, { useState, useMemo } from 'react';
import { Volume2 } from 'lucide-react';

function kataToHira(str) {
    return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
}

const isKanji = (ch) => /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch);
const isDigit = (ch) => /[0-9０-９]/.test(ch);
const isKana = (ch) => /[\u3040-\u309f\u30a0-\u30ff]/.test(ch);
const isRubyTarget = (ch) => isKanji(ch) || isDigit(ch);

/**
 * buildRubySegments
 * Uses dynamic programming alignment to pair Kanji & number counters
 * with their exact phonetic readings from furigana transcription.
 */
function buildRubySegments(ja, furigana) {
    if (!ja) return [];
    if (!furigana || furigana === ja) {
        return [{ text: ja, rt: '' }];
    }

    if (!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ja)) {
        return [{ text: ja, rt: '' }];
    }

    const N = ja.length;
    const M = furigana.length;

    const dp = Array.from({ length: N + 1 }, () => new Int32Array(M + 1).fill(-100000));
    const parent = Array.from({ length: N + 1 }, () => new Array(M + 1));

    dp[0][0] = 0;

    for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= M; j++) {
            const score = dp[i][j];
            if (score < -50000) continue;

            const jChar = i < N ? ja[i] : null;
            const fChar = j < M ? furigana[j] : null;

            if (i < N && j < M) {
                const jHira = kataToHira(jChar);
                const fHira = kataToHira(fChar);

                // 1. Exact character match (kana or punctuation or alphanumeric)
                if (jChar === fChar || (isKana(jChar) && isKana(fChar) && jHira === fHira)) {
                    if (score + 30 > dp[i + 1][j + 1]) {
                        dp[i + 1][j + 1] = score + 30;
                        parent[i + 1][j + 1] = { i, j, type: 'match' };
                    }
                }

                // 2. Ruby target (Kanji or Digit)
                if (isRubyTarget(jChar)) {
                    for (let step = 1; step <= 8 && j + step <= M; step++) {
                        let allKana = true;
                        for (let s = 0; s < step; s++) {
                            if (!isKana(furigana[j + s])) {
                                allKana = false;
                                break;
                            }
                        }
                        if (allKana) {
                            const bonus = 10;
                            if (score + bonus > dp[i + 1][j + step]) {
                                dp[i + 1][j + step] = score + bonus;
                                parent[i + 1][j + step] = { i, j, type: 'ruby', len: step };
                            }
                        }
                    }
                }
            }

            // Skip non-matching character in ja if not kanji
            if (i < N && !isKanji(jChar)) {
                if (score - 2 > dp[i + 1][j]) {
                    dp[i + 1][j] = score - 2;
                    parent[i + 1][j] = { i, j, type: 'skip_ja' };
                }
            }
        }
    }

    // Backtrack from (N, M)
    let curI = N;
    let curJ = M;
    const alignedOps = [];

    if (dp[N][M] < -50000) {
        let bestJ = M;
        let maxS = -Infinity;
        for (let j = 0; j <= M; j++) {
            if (dp[N][j] > maxS) {
                maxS = dp[N][j];
                bestJ = j;
            }
        }
        curJ = bestJ;
    }

    while (curI > 0 || curJ > 0) {
        const p = parent[curI]?.[curJ];
        if (!p) break;
        alignedOps.push({
            jIdx: p.i,
            jText: ja.slice(p.i, curI),
            fText: furigana.slice(p.j, curJ),
            type: p.type
        });
        curI = p.i;
        curJ = p.j;
    }

    alignedOps.reverse();

    const segments = [];
    for (const op of alignedOps) {
        if (op.type === 'ruby') {
            segments.push({ text: op.jText, rt: op.fText });
        } else {
            segments.push({ text: op.jText, rt: '' });
        }
    }

    // Merge contiguous ruby blocks (kanji/digits) and contiguous kana
    const merged = [];
    for (const seg of segments) {
        if (!seg.text) continue;
        if (merged.length > 0) {
            const prev = merged[merged.length - 1];
            if (!seg.rt && !prev.rt) {
                prev.text += seg.text;
                continue;
            }
            if (seg.rt && prev.rt && isRubyTarget(seg.text) && isRubyTarget(prev.text)) {
                prev.text += seg.text;
                prev.rt += seg.rt;
                continue;
            }
        }
        merged.push(seg);
    }

    // If a segment is purely digits with no kanji, drop rt to avoid redundant reading on raw numbers
    return merged.map(seg => {
        if (/^[0-9０-９]+$/.test(seg.text)) {
            return { text: seg.text, rt: '' };
        }
        return seg;
    });
}

/**
 * MaziiExampleItem
 * Renders an example sentence in a clean 2-tier layout:
 * - Top: Japanese sentence with furigana directly above the Kanji
 * - Bottom: Vietnamese translation
 */
const MaziiExampleItem = ({ example, pattern, index, onPlayAudio }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    if (!example) return null;

    const jaText = typeof example === 'string' ? example : (example.ja || '');
    const viText = typeof example === 'object' ? (example.vi || '') : '';
    const furigana = typeof example === 'object' ? (example.furigana || '') : '';

    if (!jaText && !viText) return null;

    const handlePlay = (e) => {
        e?.stopPropagation?.();
        if (onPlayAudio && jaText) {
            setIsPlaying(true);
            onPlayAudio(jaText);
            setTimeout(() => setIsPlaying(false), 2000);
        }
    };

    const segments = useMemo(() => {
        return buildRubySegments(jaText, furigana);
    }, [jaText, furigana]);

    const basePattern = (pattern || '')
        .replace(/^[~〜]/, '')
        .replace(/\([^)]+\)/g, '')
        .trim();

    return (
        <div
            onClick={handlePlay}
            className="group bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-600/70 rounded-2xl p-4 md:p-5 flex items-start gap-3.5 transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer w-full"
        >
            {/* Audio speaker button */}
            <button
                type="button"
                onClick={handlePlay}
                title="Nghe phát âm"
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-150 cursor-pointer mt-0.5 ${
                    isPlaying
                        ? 'bg-[#1d70b8] text-white border-[#1d70b8] scale-105 shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 group-hover:text-[#1d70b8] dark:group-hover:text-sky-300 group-hover:border-blue-200 dark:group-hover:border-blue-800'
                }`}
            >
                <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
            </button>

            {/* Content area: 2 Tiers */}
            <div className="flex-1 min-w-0 space-y-1.5">
                {/* Tier 1: Japanese sentence with Ruby furigana */}
                <div className="text-base md:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed break-words font-japanese">
                    {segments.map((seg, idx) => {
                        const isPatternMatch = basePattern && seg.text.includes(basePattern);
                        if (seg.rt) {
                            return (
                                <ruby key={idx} className={`ruby-group ${isPatternMatch ? 'text-[#1d70b8] dark:text-sky-400 font-bold' : ''}`}>
                                    {seg.text}
                                    <rt className="text-[10px] md:text-[11px] text-slate-400 dark:text-slate-400 font-normal select-none leading-none">
                                        {seg.rt}
                                    </rt>
                                </ruby>
                            );
                        }
                        if (isPatternMatch) {
                            return (
                                <span key={idx} className="text-[#1d70b8] dark:text-sky-400 font-bold">
                                    {seg.text}
                                </span>
                            );
                        }
                        return <span key={idx}>{seg.text}</span>;
                    })}
                </div>

                {/* Tier 2: Vietnamese translation */}
                {viText && (
                    <p className="text-sm md:text-[14.5px] text-slate-600 dark:text-slate-300 leading-relaxed break-words font-normal pt-0.5 border-t border-slate-100 dark:border-slate-800/60 mt-1">
                        {viText}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MaziiExampleItem;
