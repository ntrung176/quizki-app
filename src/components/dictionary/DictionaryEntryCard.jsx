import React, { useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { speakExampleSentence } from '../../utils/audio';
import { aiTranslateSentence } from '../../utils/aiProvider';
import { accentNumberToPitchParts } from '../../utils/pitchAccent';

// Map common Japanese POS abbreviations to friendly Vietnamese labels
const POS_LABELS = {
    'n': 'Danh từ',
    'vs': 'Động từ Suru',
    'v1': 'Động từ nhóm 2',
    'v5k': 'Động từ nhóm 1 (k)',
    'v5s': 'Động từ nhóm 1 (s)',
    'v5t': 'Động từ nhóm 1 (t)',
    'v5n': 'Động từ nhóm 1 (n)',
    'v5m': 'Động từ nhóm 1 (m)',
    'v5r': 'Động từ nhóm 1 (r)',
    'v5w': 'Động từ nhóm 1 (w)',
    'v5g': 'Động từ nhóm 1 (g)',
    'v5b': 'Động từ nhóm 1 (b)',
    'adj-i': 'Tính từ đuôi い',
    'adj-na': 'Tính từ đuôi な',
    'adj-no': 'Danh từ bổ nghĩa đuôi の',
    'adv': 'Phó từ',
    'int': 'Thán từ',
    'exp': 'Cụm từ / Thành ngữ',
    'prt': 'Trợ từ',
    'pn': 'Đại từ',
    'vt': 'Tha động từ',
    'vi': 'Tự động từ'
};

const JLPT_COLORS = {
    'N5': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    'N4': 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    'N3': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    'N2': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    'N1': 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800'
};

const DictionaryEntryCard = ({
    entry,
    onAddWithAi,
    onQuickAdd,
    isAiLoading = false,
    isSaved = false
}) => {
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isPlayingExAudio, setIsPlayingExAudio] = useState(false);
    const [translatedVi, setTranslatedVi] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);

    if (!entry) return null;

    const handlePlayAudio = async (e) => {
        e.stopPropagation();
        if (isPlayingAudio) return;
        setIsPlayingAudio(true);
        try {
            await speakExampleSentence(entry.w || entry.r, 'ja');
        } catch (err) {
            console.warn('Audio playback error:', err);
        } finally {
            setIsPlayingAudio(false);
        }
    };

    const handlePlayExAudio = async (e) => {
        e.stopPropagation();
        if (!entry.ex?.ja || isPlayingExAudio) return;
        setIsPlayingExAudio(true);
        try {
            await speakExampleSentence(entry.ex.ja, 'ja');
        } catch (err) {
            console.warn('Example audio playback error:', err);
        } finally {
            setIsPlayingExAudio(false);
        }
    };

    const handleTranslateExample = async (e) => {
        e.stopPropagation();
        if (translatedVi || isTranslating || !entry.ex?.ja) return;
        setIsTranslating(true);
        try {
            const res = await aiTranslateSentence(entry.ex.ja);
            if (res && res.translation) {
                setTranslatedVi(res.translation);
            }
        } catch (err) {
            console.error('Failed to translate example sentence:', err);
        } finally {
            setIsTranslating(false);
        }
    };

    const readingDisplay = entry.r || (entry.w && !/[\u4e00-\u9faf]/.test(entry.w) ? entry.w : '');
    const pitchVal = entry.pi && entry.pi.length > 0 ? entry.pi[0] : null;

    // Render red NHK Pitch Accent line over reading (matching QuizKi StudySetDetail style)
    const renderReadingWithPitch = () => {
        if (!readingDisplay) return null;
        if (pitchVal === null) {
            return <span>{readingDisplay}</span>;
        }

        const pitchParts = accentNumberToPitchParts(readingDisplay, pitchVal);
        if (!pitchParts || pitchParts.length === 0) {
            return <span>{readingDisplay}</span>;
        }

        const readingChars = [...readingDisplay];
        const charPitchMap = [];
        for (const pp of pitchParts) {
            const partChars = [...pp.part];
            for (const c of partChars) {
                charPitchMap.push({ char: c, high: pp.high });
            }
        }

        const lineColor = '#ef4444'; // Standard NHK Red line

        return (
            <span className="font-japanese inline-flex items-end gap-0">
                {readingChars.map((char, ci) => {
                    const pm = charPitchMap[ci];
                    const isHigh = pm ? pm.high : false;
                    const nextHigh = ci + 1 < charPitchMap.length ? charPitchMap[ci + 1]?.high : isHigh;
                    const showTransition = ci + 1 < charPitchMap.length && isHigh !== nextHigh;

                    return (
                        <span key={ci} className="relative inline-block" style={{ marginRight: '0px' }}>
                            <span
                                className="block"
                                style={{
                                    borderTop: `1.5px solid ${isHigh ? lineColor : 'transparent'}`,
                                    borderBottom: `1.5px solid ${!isHigh ? lineColor : 'transparent'}`,
                                    paddingTop: '0px',
                                    paddingBottom: '0px',
                                    paddingLeft: '1px',
                                    paddingRight: '1px',
                                    lineHeight: '1.1',
                                }}
                            >
                                <span className="text-slate-600 dark:text-slate-300">{char}</span>
                            </span>
                            {showTransition && (
                                <span className="absolute -right-[0.75px] top-0 bottom-0 w-[1.5px]" style={{ backgroundColor: lineColor }}></span>
                            )}
                        </span>
                    );
                })}
            </span>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 relative group">
            {/* Header: Term, Reading with Pitch Graph, Badges, Audio */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex-1 min-w-0">
                    {/* Furigana Reading with visual pitch accent & pitch number */}
                    {readingDisplay && (
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 tracking-wide flex items-center gap-2 flex-wrap">
                            {renderReadingWithPitch()}
                            {pitchVal !== null && (
                                <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800" title={`Trọng âm Pitch Accent: kiểu ${pitchVal}`}>
                                    [{pitchVal}]
                                </span>
                            )}
                        </div>
                    )}

                    {/* Kanji / Main Term */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {entry.w}
                        </h3>

                        {/* Speaker Audio Button */}
                        <button
                            type="button"
                            onClick={handlePlayAudio}
                            disabled={isPlayingAudio}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            title="Phát âm"
                        >
                            <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse text-blue-600' : ''}`} />
                        </button>
                    </div>

                    {/* Sino-Vietnamese (Hán Việt) styled in amber text to match QuizKi native study style */}
                    {entry.hv && (
                        <div className="mt-1">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 tracking-wider uppercase">
                                {entry.hv}
                            </span>
                        </div>
                    )}
                </div>

                {/* Badges: JLPT Level, Frequency Rank */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {entry.j && (
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border uppercase tracking-wider ${JLPT_COLORS[entry.j] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'}`}>
                            JLPT {entry.j}
                        </span>
                    )}
                    {entry.f && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800" title="Thứ hạng tần suất sử dụng thực tế (JPDB)">
                            #{entry.f}
                        </span>
                    )}
                </div>
            </div>

            {/* Part of Speech Pills */}
            {entry.p && entry.p.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {entry.p.map((pos, idx) => (
                        <span
                            key={idx}
                            className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200/60 dark:border-slate-700/60"
                            title={POS_LABELS[pos] || pos}
                        >
                            {POS_LABELS[pos] || pos}
                        </span>
                    ))}
                </div>
            )}

            {/* Meanings List */}
            <div className="space-y-1.5 mb-4 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                {entry.m && entry.m.length > 0 ? (
                    entry.m.map((meaning, mIdx) => (
                        <div key={mIdx} className="flex items-start gap-2">
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-xs mt-0.5 shrink-0 select-none">
                                {mIdx + 1}.
                            </span>
                            <span className="font-medium">{meaning}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-slate-400 italic">Chưa có giải nghĩa chi tiết.</p>
                )}
            </div>

            {/* Example Sentence Section */}
            {entry.ex && entry.ex.ja && (
                <div className="mb-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                            Câu ví dụ
                        </span>
                        <button
                            type="button"
                            onClick={handlePlayExAudio}
                            disabled={isPlayingExAudio}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            title="Nghe câu ví dụ"
                        >
                            <Volume2 className={`w-3.5 h-3.5 ${isPlayingExAudio ? 'animate-pulse text-blue-600' : ''}`} />
                        </button>
                    </div>

                    {/* Japanese sentence */}
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-normal">
                        {entry.ex.ja}
                    </p>

                    {/* Translation: Vietnamese with English reference */}
                    {(translatedVi || entry.ex.vi) ? (
                        <div className="space-y-1 pt-1">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-start gap-1.5 leading-snug">
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shrink-0 mt-0.5">
                                    VI
                                </span>
                                <span>{translatedVi || entry.ex.vi}</span>
                            </p>
                            {entry.ex.en && (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic pl-6 leading-tight">
                                    {entry.ex.en}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-2 pt-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                {entry.ex.en}
                            </p>
                            <button
                                type="button"
                                onClick={handleTranslateExample}
                                disabled={isTranslating}
                                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors shrink-0 cursor-pointer"
                            >
                                {isTranslating ? 'Đang dịch...' : 'Dịch tiếng Việt'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Antonym Section (if exists) */}
            {entry.ant && entry.ant.w && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] shrink-0">
                        Từ trái nghĩa:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                        {entry.ant.w}
                        {entry.ant.r && <span className="font-normal text-slate-500 text-[11px] ml-1">({entry.ant.r})</span>}
                    </span>
                    {entry.ant.m && (
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                            — {entry.ant.m}
                        </span>
                    )}
                </div>
            )}

            {/* Action Buttons: Solid blue action, no purple, no gradient, no star icon */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                <div>
                    {onQuickAdd && (
                        <button
                            type="button"
                            onClick={() => onQuickAdd({ ...entry, translatedVi: entry.ex?.vi || translatedVi })}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                isSaved
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                            title={isSaved ? 'Từ này đã có trong danh sách (Bấm để lưu thêm nếu muốn)' : 'Lưu nhanh vào học phần'}
                        >
                            {isSaved ? '✓ Đã lưu' : 'Lưu nhanh'}
                        </button>
                    )}
                </div>

                {onAddWithAi && (
                    <button
                        type="button"
                        onClick={() => onAddWithAi({ ...entry, translatedVi: entry.ex?.vi || translatedVi })}
                        disabled={isAiLoading}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                        {isAiLoading ? 'AI đang tạo...' : 'Tạo thẻ học với AI'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default DictionaryEntryCard;
