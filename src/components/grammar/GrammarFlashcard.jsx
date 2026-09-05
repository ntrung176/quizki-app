import React, { useMemo, useEffect, useRef } from 'react';
import { Volume2, BookOpen, Layers } from 'lucide-react';
import MaziiStructureCard from './MaziiStructureCard';
import MaziiExampleItem from './MaziiExampleItem';

/**
 * Tính toán tỷ lệ font chữ và khoảng cách tự động theo mật độ nội dung (Density Scaling)
 */
const getGrammarCardScaleStyles = (card, structuresList = [], examplesList = []) => {
    if (!card) return {};

    const patternLen = (card.pattern || '').length;
    const meaningLen = ((card.meaningShort || '') + ' ' + (card.meaning || '')).length;
    const structuresCount = structuresList.length;
    const examplesCount = examplesList.length;

    let densityScore = 0;
    if (examplesCount >= 2) densityScore += 3;
    else if (examplesCount === 1) densityScore += 1.5;

    if (structuresCount >= 3) densityScore += 2.5;
    else if (structuresCount >= 1) densityScore += 1.2;

    if (meaningLen > 90) densityScore += 2;
    else if (meaningLen > 45) densityScore += 1;

    if (patternLen > 14) densityScore += 2;
    else if (patternLen > 8) densityScore += 1;

    // Density tiers
    if (densityScore >= 6) {
        // High density: compact fonts and paddings to fit rich content elegantly
        return {
            frontPatternSize: 'text-3xl sm:text-4xl md:text-5xl',
            frontMeaningSize: 'text-xl sm:text-2xl md:text-3xl',
            backPatternSize: 'text-xl md:text-2xl',
            backMeaningSize: 'text-base md:text-lg',
            sectionGap: 'space-y-2.5',
            structureMaxItems: 4,
            exampleMaxItems: 2,
        };
    } else if (densityScore >= 3.5) {
        // Medium density: balanced comfortable reading
        return {
            frontPatternSize: 'text-4xl sm:text-5xl md:text-6xl',
            frontMeaningSize: 'text-2xl sm:text-3xl md:text-4xl',
            backPatternSize: 'text-2xl md:text-3xl',
            backMeaningSize: 'text-lg md:text-xl',
            sectionGap: 'space-y-3.5',
            structureMaxItems: 4,
            exampleMaxItems: 3,
        };
    } else {
        // Low density / Standard: bold, prominent typography
        return {
            frontPatternSize: 'text-4xl sm:text-6xl md:text-7xl',
            frontMeaningSize: 'text-2xl sm:text-4xl md:text-5xl',
            backPatternSize: 'text-2xl md:text-3xl',
            backMeaningSize: 'text-xl md:text-2xl',
            sectionGap: 'space-y-4',
            structureMaxItems: 5,
            exampleMaxItems: 3,
        };
    }
};

const GrammarFlashcard = ({
    card,
    isFlipped = false,
    onFlip,
    isAnimatingFlip = true,
    slideDirection = '',
    settings = {},
    onSpeak,
    hasCheckedTyping,
}) => {
    const lastPlayedCardIdRef = useRef(null);
    const isTypingMode = settings?.reviewType === 'typing';

    // Determine study mode for this card
    const effectiveStudyMode = useMemo(() => {
        if (!settings.studyMode || settings.studyMode === 'ja_to_vi') return 'ja_to_vi';
        if (settings.studyMode === 'vi_to_ja') return 'vi_to_ja';
        // Random mode: stable based on card ID
        if (settings.studyMode === 'random' && card?.id) {
            const sum = String(card.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return sum % 2 === 0 ? 'ja_to_vi' : 'vi_to_ja';
        }
        return 'ja_to_vi';
    }, [settings.studyMode, card?.id]);

    // Auto-play audio on flip
    useEffect(() => {
        if (
            isFlipped &&
            settings.autoPlayAudio &&
            settings.audioEnabled &&
            card &&
            onSpeak &&
            lastPlayedCardIdRef.current !== `${card.id}-flipped`
        ) {
            lastPlayedCardIdRef.current = `${card.id}-flipped`;
            const textToSpeak = card.pattern || card.examples?.[0]?.ja || '';
            if (textToSpeak) {
                const timer = setTimeout(() => {
                    onSpeak(textToSpeak);
                }, 150);
                return () => clearTimeout(timer);
            }
        }
    }, [isFlipped, settings.autoPlayAudio, settings.audioEnabled, card, onSpeak]);

    // Normalizing meaning to avoid duplicate display
    const { cleanShortMeaning, cleanExtendedMeaning } = useMemo(() => {
        if (!card) return { cleanShortMeaning: '—', cleanExtendedMeaning: '' };
        const short = (card.meaningShort || '').trim();
        let full = (card.meaning || card.meaningFull || '').trim();

        if (!short && !full) return { cleanShortMeaning: '—', cleanExtendedMeaning: '' };
        if (!short) return { cleanShortMeaning: full, cleanExtendedMeaning: '' };
        if (!full) return { cleanShortMeaning: short, cleanExtendedMeaning: '' };

        if (full.toLowerCase() === short.toLowerCase()) {
            return { cleanShortMeaning: short, cleanExtendedMeaning: '' };
        }

        if (full.toLowerCase().startsWith(short.toLowerCase())) {
            const remaining = full.slice(short.length).replace(/^[\s,:\-–—\.]+/i, '').trim();
            return { cleanShortMeaning: short, cleanExtendedMeaning: remaining };
        }

        return { cleanShortMeaning: short, cleanExtendedMeaning: full };
    }, [card?.meaningShort, card?.meaning, card?.meaningFull]);

    // Extracting structures / connection list
    const structuresList = useMemo(() => {
        if (!card) return [];
        let list = [];
        if (Array.isArray(card.connection) && card.connection.length > 0) {
            list = card.connection;
        } else if (Array.isArray(card.structures) && card.structures.length > 0) {
            list = card.structures;
        } else if (card.structure) {
            if (Array.isArray(card.structure)) {
                list = card.structure;
            } else if (typeof card.structure === 'string' && card.structure.trim()) {
                list = card.structure.split(/\r?\n/);
            }
        } else if (card.structureRaw && typeof card.structureRaw === 'string') {
            list = card.structureRaw.split(/\r?\n/);
        }

        return list
            .map(item => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item === 'object') return (item.text || item.formula || item.structure || '').trim();
                return '';
            })
            .filter(Boolean);
    }, [card?.connection, card?.structures, card?.structure, card?.structureRaw]);

    // Extracting examples list
    const examplesList = useMemo(() => {
        if (!card) return [];
        const raw = card.examples || [];
        if (!Array.isArray(raw) || raw.length === 0) return [];
        const result = [];
        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (typeof item === 'string') {
                const lines = item.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length >= 2) {
                    result.push({ ja: lines[0], vi: lines[1], furigana: '' });
                } else if (lines.length === 1) {
                    result.push({ ja: lines[0], vi: '', furigana: '' });
                }
            } else if (item && typeof item === 'object') {
                result.push({
                    ja: (item.ja || '').trim(),
                    vi: (item.vi || '').trim(),
                    furigana: (item.furigana || '').trim(),
                });
            }
        }
        return result.filter(ex => ex.ja || ex.vi);
    }, [card?.examples]);

    // Density-based dynamic scaling styles
    const scale = useMemo(() => {
        return getGrammarCardScaleStyles(card, structuresList, examplesList);
    }, [card, structuresList, examplesList]);

    if (!card) return null;

    const levelBadge = card.level || card.jlpt || 'N3';
    const isFrontShowingPattern = effectiveStudyMode === 'ja_to_vi' && !isTypingMode;
    const showPatternOnBack = !isFrontShowingPattern;

    const handlePlayAudio = (text, e) => {
        e?.stopPropagation?.();
        if (settings.audioEnabled && onSpeak && text) {
            onSpeak(text);
        }
    };

    const handleCardClick = () => {
        if (isTypingMode && !hasCheckedTyping) return;
        if (onFlip) onFlip();
    };

    return (
        <div
            className="w-full relative select-none"
            style={{ perspective: '1200px', minHeight: '480px', height: '520px', maxHeight: '72vh' }}
        >
            <div
                className={`w-full h-full relative card-slide ${
                    slideDirection === 'left'
                        ? 'slide-out-left'
                        : slideDirection === 'right'
                        ? 'slide-out-right'
                        : ''
                }`}
                style={{
                    width: '100%',
                    height: '100%',
                    transition: slideDirection
                        ? 'transform 0.12s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.12s ease'
                        : 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                }}
            >
                <div
                    onClick={handleCardClick}
                    className={isTypingMode && !hasCheckedTyping ? 'cursor-default' : 'cursor-pointer'}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        transformStyle: 'preserve-3d',
                        transition: isAnimatingFlip
                            ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
                            : 'none',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                >
                    {/* ==================== FRONT SIDE ==================== */}
                    <div
                        className="bg-white dark:bg-slate-900 rounded-[28px] md:rounded-[36px] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 md:p-8 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all duration-200 group"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                        }}
                    >
                        {/* Front Header */}
                        <div className="flex items-center justify-between w-full">
                            {settings.showLevel !== false ? (
                                <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 shadow-2xs">
                                    JLPT {levelBadge}
                                </span>
                            ) : (
                                <span />
                            )}

                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    {isTypingMode
                                        ? '⌨️ Chế độ Gõ Phím'
                                        : effectiveStudyMode === 'ja_to_vi'
                                        ? '🇯🇵 Mẫu Ngữ Pháp'
                                        : '🇻🇳 Ý Nghĩa Tiếng Việt'}
                                </span>
                                {effectiveStudyMode === 'ja_to_vi' &&
                                    !isTypingMode &&
                                    settings.audioEnabled &&
                                    settings.showAudioButton !== false && (
                                        <button
                                            type="button"
                                            onClick={(e) => handlePlayAudio(card.pattern, e)}
                                            title="Nghe phát âm"
                                            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                        </button>
                                    )}
                            </div>
                        </div>

                        {/* Front Center Content (Scaled dynamically!) */}
                        <div className="flex-1 flex flex-col items-center justify-center my-4 text-center px-4 overflow-y-auto no-scrollbar">
                            {effectiveStudyMode === 'ja_to_vi' && !isTypingMode ? (
                                <div className="space-y-3">
                                    <h2
                                        className={`${scale.frontPatternSize || 'text-4xl md:text-6xl'} font-black text-slate-800 dark:text-white font-japanese tracking-tight leading-relaxed group-hover:scale-102 transition-transform duration-200`}
                                    >
                                        {card.pattern}
                                    </h2>
                                </div>
                            ) : (
                                <div className="space-y-3 max-w-xl">
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                        {isTypingMode
                                            ? 'Hãy gõ mẫu ngữ pháp tương ứng:'
                                            : 'Hãy nhớ mẫu ngữ pháp tương ứng:'}
                                    </span>
                                    <h2
                                        className={`${scale.frontMeaningSize || 'text-2xl md:text-4xl'} font-black text-[#1d70b8] dark:text-sky-400 leading-snug`}
                                    >
                                        {cleanShortMeaning}
                                    </h2>
                                </div>
                            )}
                        </div>

                        {/* Front Footer / Flip Hint */}
                        <div className="w-full text-center">
                            {!isTypingMode ? (
                                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 dark:group-hover:text-white transition-all">
                                    Nhấn thẻ hoặc bấm Space để lật
                                </span>
                            ) : (
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                    Nhập đáp án ở ô bên dưới và nhấn <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-600 dark:text-slate-300">Enter</kbd>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ==================== BACK SIDE ==================== */}
                    <div
                        className="bg-white dark:bg-slate-900 rounded-[28px] md:rounded-[36px] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 md:p-7 flex flex-col justify-start hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all duration-200 overflow-y-auto"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                        }}
                    >
                        <div className={`${scale.sectionGap || 'space-y-4'} w-full`}>
                            {/* Back Header: Reveal Japanese Pattern when front was Vietnamese meaning */}
                            {showPatternOnBack && (
                                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                                    <div className="flex items-center gap-3">
                                        {settings.showLevel !== false && (
                                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400">
                                                JLPT {levelBadge}
                                            </span>
                                        )}
                                        <h3
                                            className={`${scale.backPatternSize || 'text-2xl md:text-3xl'} font-black text-emerald-600 dark:text-emerald-400 font-japanese`}
                                        >
                                            {card.pattern}
                                        </h3>
                                    </div>

                                    {settings.audioEnabled && (
                                        <button
                                            type="button"
                                            onClick={(e) => handlePlayAudio(card.pattern, e)}
                                            title="Nghe phát âm mẫu câu"
                                            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Back Meaning Box (Deduplicated & Auto-fit) */}
                            {settings.showMeaning !== false && (
                                <div className="bg-gradient-to-r from-sky-50/80 to-indigo-50/60 dark:from-sky-950/30 dark:to-indigo-950/20 border border-sky-200/70 dark:border-sky-800/50 rounded-2xl p-4 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-bold text-[#1d70b8] dark:text-sky-400 uppercase tracking-wider">
                                            Ý nghĩa:
                                        </div>
                                        {!showPatternOnBack && settings.audioEnabled && (
                                            <button
                                                type="button"
                                                onClick={(e) => handlePlayAudio(card.pattern, e)}
                                                title="Nghe phát âm mẫu câu"
                                                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/80 dark:bg-slate-800/80 border border-sky-200/60 dark:border-sky-700/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        className={`${scale.backMeaningSize || 'text-lg md:text-xl'} font-bold text-slate-800 dark:text-slate-100 leading-snug`}
                                    >
                                        「{cleanShortMeaning}」
                                    </div>
                                    {cleanExtendedMeaning && (
                                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium pt-1 border-t border-sky-200/40 dark:border-sky-800/40 leading-relaxed">
                                            {cleanExtendedMeaning}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Back Structure Box */}
                            {settings.showStructure !== false && structuresList.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Cấu trúc / Kết nối:</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {structuresList
                                            .slice(0, scale.structureMaxItems || 4)
                                            .map((st, idx) => (
                                                <MaziiStructureCard
                                                    key={idx}
                                                    formula={typeof st === 'string' ? st : (st?.text || '')}
                                                    structure={st}
                                                    pattern={card.pattern}
                                                    index={idx}
                                                    isFirst={idx === 0}
                                                />
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Back Examples Box */}
                            {settings.showExamples !== false && examplesList.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Câu ví dụ:</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {examplesList
                                            .slice(0, scale.exampleMaxItems || 3)
                                            .map((ex, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MaziiExampleItem
                                                        example={{
                                                             ja: ex.ja,
                                                             vi:
                                                                 settings.showExampleVi !== false
                                                                     ? ex.vi
                                                                     : '',
                                                             furigana:
                                                                 settings.showFurigana !== false
                                                                     ? ex.furigana
                                                                     : '',
                                                         }}
                                                         pattern={card.pattern}
                                                         index={idx}
                                                         onPlayAudio={(jaText) =>
                                                             handlePlayAudio(jaText)
                                                         }
                                                     />
                                                 </div>
                                             ))}
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             </div>
         </div>
     );
 };

 export default GrammarFlashcard;
