import React, { useState, useMemo } from 'react';
import { Volume2 } from 'lucide-react';

/**
 * buildRubySegments
 * Pairs Kanji in Japanese sentence with its reading from the furigana transcription
 */
function buildRubySegments(ja, furigana) {
    if (!ja) return [];
    if (!furigana || furigana === ja) {
        return [{ text: ja, rt: '' }];
    }

    const isKanji = (ch) => /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch);

    // If ja has no kanji, return as is
    if (!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ja)) {
        return [{ text: ja, rt: '' }];
    }

    // Extract contiguous non-kanji anchor blocks and kanji blocks in ja
    const blocks = [];
    let idx = 0;
    while (idx < ja.length) {
        if (isKanji(ja[idx])) {
            let k = '';
            while (idx < ja.length && isKanji(ja[idx])) {
                k += ja[idx];
                idx++;
            }
            blocks.push({ type: 'kanji', text: k });
        } else {
            let nk = '';
            while (idx < ja.length && !isKanji(ja[idx])) {
                nk += ja[idx];
                idx++;
            }
            blocks.push({ type: 'kana', text: nk });
        }
    }

    let fIdx = 0;
    const segments = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'kana') {
            const found = furigana.indexOf(block.text, fIdx);
            if (found !== -1) {
                fIdx = found + block.text.length;
            }
            segments.push({ text: block.text, rt: '' });
        } else {
            // Kanji block
            const nextKanaBlock = blocks[i + 1];
            let rt = '';
            if (nextKanaBlock) {
                const minOffset = fIdx + Math.max(1, block.text.length);
                let nextPos = furigana.indexOf(nextKanaBlock.text, minOffset);
                if (nextPos === -1) {
                    nextPos = furigana.indexOf(nextKanaBlock.text, fIdx);
                }
                if (nextPos !== -1) {
                    rt = furigana.slice(fIdx, nextPos);
                    fIdx = nextPos;
                } else {
                    rt = '';
                }
            } else {
                rt = furigana.slice(fIdx);
                fIdx = furigana.length;
            }
            segments.push({ text: block.text, rt });
        }
    }

    return segments;
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
