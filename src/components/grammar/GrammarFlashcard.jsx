import React, { useMemo, useEffect, useRef } from 'react';
import { Volume2, Eye, RotateCcw } from 'lucide-react';
import FuriganaText from '../ui/FuriganaText';
import { speakExampleSentence } from '../../utils/audio';

/**
 * Safely parse and render formatted text containing HTML tags like <s>, <del>, <b>, <i>, <br>, <u>.
 * Renders strikethrough for <s> / <del> without leaking raw HTML tags.
 */
export const renderFormattedContent = (str, keyPrefix = 'fmt') => {
    if (!str) return null;
    if (typeof str !== 'string') return String(str);
    if (!/<[a-z][\s\S]*>/i.test(str)) {
        return str;
    }

    const tokens = str.split(/(<\/?(?:s|del|strike|b|strong|i|em|u|br\s*\/?)>)/gi);
    let inStrike = false;
    let inBold = false;
    let inItalic = false;
    let inUnderline = false;

    return tokens.map((part, idx) => {
        const lower = part.toLowerCase();
        if (lower === '<s>' || lower === '<del>' || lower === '<strike>') {
            inStrike = true;
            return null;
        }
        if (lower === '</s>' || lower === '</del>' || lower === '</strike>') {
            inStrike = false;
            return null;
        }
        if (lower === '<b>' || lower === '<strong>') {
            inBold = true;
            return null;
        }
        if (lower === '</b>' || lower === '</strong>') {
            inBold = false;
            return null;
        }
        if (lower === '<i>' || lower === '<em>') {
            inItalic = true;
            return null;
        }
        if (lower === '</i>' || lower === '</em>') {
            inItalic = false;
            return null;
        }
        if (lower === '<u>') {
            inUnderline = true;
            return null;
        }
        if (lower === '</u>') {
            inUnderline = false;
            return null;
        }
        if (lower === '<br>' || lower === '<br/>' || lower === '<br />') {
            return <br key={`${keyPrefix}-br-${idx}`} />;
        }
        if (!part) return null;

        const cleanText = part.replace(/<[^>]*>/g, '');
        if (!cleanText) return null;

        let node = <span key={`${keyPrefix}-${idx}`}>{cleanText}</span>;
        if (inStrike) {
            node = (
                <del
                    key={`${keyPrefix}-del-${idx}`}
                    className="line-through opacity-75 decoration-rose-500/80 decoration-2 font-semibold px-0.5"
                >
                    {cleanText}
                </del>
            );
        }
        if (inBold) {
            node = <strong key={`${keyPrefix}-b-${idx}`} className="font-black">{node}</strong>;
        }
        if (inItalic) {
            node = <em key={`${keyPrefix}-i-${idx}`} className="italic">{node}</em>;
        }
        if (inUnderline) {
            node = <u key={`${keyPrefix}-u-${idx}`} className="underline underline-offset-2">{node}</u>;
        }
        return node;
    }).filter(Boolean);
};

/**
 * Helper trích xuất chuỗi cách nối / liên kết của điểm ngữ pháp
 */
const getConnectionText = (card) => {
    if (!card) return '';
    if (typeof card.connection === 'string' && card.connection.trim()) {
        return card.connection.trim();
    }
    if (Array.isArray(card.connection) && card.connection.length > 0) {
        return card.connection
            .map(c => typeof c === 'string' ? c : (c?.text || c?.structure || c?.formula || ''))
            .filter(Boolean)
            .join(' / ');
    }
    if (typeof card.structureRaw === 'string' && card.structureRaw.trim()) {
        return card.structureRaw.trim();
    }
    if (typeof card.structure === 'string' && card.structure.trim()) {
        return card.structure.trim();
    }
    if (Array.isArray(card.structures) && card.structures.length > 0) {
        return card.structures
            .map(s => typeof s === 'string' ? s : (s?.structure || s?.text || s?.formula || ''))
            .filter(Boolean)
            .join(' / ');
    }
    if (Array.isArray(card.structure) && card.structure.length > 0) {
        return card.structure
            .map(s => typeof s === 'string' ? s : (s?.structure || s?.text || ''))
            .filter(Boolean)
            .join(' / ');
    }
    return '';
};

/**
 * Helper trích xuất danh sách câu ví dụ
 */
const getExamplesList = (card) => {
    if (!card) return [];
    const raw = card.examples || card.example || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(ex => {
        if (typeof ex === 'string') {
            const lines = ex.split('\n').map(l => l.trim()).filter(Boolean);
            return { ja: lines[0] || '', vi: lines[1] || '', furigana: '' };
        }
        if (ex && typeof ex === 'object') {
            return {
                ja: (ex.ja || ex.japanese || ex.sentence || '').trim(),
                vi: (ex.vi || ex.vietnamese || ex.meaning || '').trim(),
                furigana: (ex.furigana || '').trim(),
            };
        }
        return null;
    }).filter(ex => ex && (ex.ja || ex.vi));
};

const GrammarFlashcard = ({
    card,
    isFlipped = false,
    onFlip,
    disableFrontClick = false,
    isAnimatingFlip = true,
    slideDirection = '',
    settings = {},
    onSpeak,
}) => {
    const lastPlayedCardIdRef = useRef(null);

    // Xác định chiều học thực tế của thẻ (JP -> VN | VN -> JP | Ngẫu nhiên)
    const effectiveStudyMode = useMemo(() => {
        if (!settings.studyMode || settings.studyMode === 'ja_to_vi') return 'ja_to_vi';
        if (settings.studyMode === 'vi_to_ja') return 'vi_to_ja';
        // Random mode: ổn định theo ID thẻ
        if (settings.studyMode === 'random' && card?.id) {
            const sum = String(card.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return sum % 2 === 0 ? 'ja_to_vi' : 'vi_to_ja';
        }
        return 'ja_to_vi';
    }, [settings.studyMode, card?.id]);

    const isJaToVi = effectiveStudyMode === 'ja_to_vi';

    // Trích xuất dữ liệu thẻ
    const patternText = card?.pattern || card?.title || '—';
    const connectionText = useMemo(() => getConnectionText(card), [card]);
    const meaningText = card?.meaning || card?.meaningShort || card?.meaningFull || card?.mean || '—';
    const usageText = card?.usageScope || card?.usage || card?.explanation || card?.desc || '';
    const notesText = card?.notes || card?.note || card?.attention || '';
    const examplesList = useMemo(() => getExamplesList(card), [card]);
    const levelBadge = card?.level || card?.jlpt || 'N3';

    // Tự động phát âm thanh khi lật thẻ
    useEffect(() => {
        if (
            isFlipped &&
            settings.autoPlayAudio &&
            settings.audioEnabled &&
            card &&
            lastPlayedCardIdRef.current !== `${card.id}-flipped`
        ) {
            lastPlayedCardIdRef.current = `${card.id}-flipped`;
            const textToSpeak = card.pattern || examplesList[0]?.ja || '';
            if (textToSpeak) {
                const timer = setTimeout(() => {
                    if (onSpeak) onSpeak(textToSpeak);
                    else speakExampleSentence(textToSpeak);
                }, 150);
                return () => clearTimeout(timer);
            }
        }
    }, [isFlipped, settings.autoPlayAudio, settings.audioEnabled, card, onSpeak, examplesList]);

    const handlePlayAudio = (text, e) => {
        e?.stopPropagation?.();
        if (settings.audioEnabled && text) {
            if (onSpeak) onSpeak(text);
            else speakExampleSentence(text);
        }
    };

    if (!card) return null;

    return (
        <div
            className="w-full relative select-none"
            style={{ perspective: '1200px', minHeight: '430px', height: '460px', maxHeight: '72vh' }}
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
                    onClick={() => {
                        if (disableFrontClick && !isFlipped) return;
                        if (onFlip) onFlip();
                    }}
                    className={disableFrontClick && !isFlipped ? 'cursor-default' : 'cursor-pointer'}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        transformStyle: 'preserve-3d',
                        WebkitTransformStyle: 'preserve-3d',
                        transition: isAnimatingFlip
                            ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
                            : 'none',
                        WebkitTransition: isAnimatingFlip
                            ? '-webkit-transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
                            : 'none',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        WebkitTransform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                >
                    {/* ========================================================= */}
                    {/* ==================== MẶT TRƯỚC (FRONT) ================== */}
                    {/* ========================================================= */}
                    <div
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 md:p-8 flex flex-col justify-between shadow-sm hover:border-sky-300 dark:hover:border-sky-700 transition-colors overflow-hidden w-full max-w-full"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(0deg) translateZ(1px)',
                            WebkitTransform: 'rotateY(0deg) translateZ(1px)',
                            transformStyle: 'preserve-3d',
                            WebkitTransformStyle: 'preserve-3d',
                            zIndex: isFlipped ? 1 : 2,
                            pointerEvents: isFlipped ? 'none' : 'auto',
                        }}
                    >
                        {/* Header Mặt trước */}
                        <div className="flex items-center justify-between w-full shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                                    {isJaToVi ? 'Mặt trước (Mẫu câu)' : 'Mặt trước (Ý nghĩa tiếng Việt)'}
                                </span>
                                {settings.showLevel !== false && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300">
                                        JLPT {levelBadge}
                                    </span>
                                )}
                            </div>
                            {!disableFrontClick && (
                                <span className="text-xs text-slate-400 font-medium">
                                    Nhấn để lật thẻ (Space)
                                </span>
                            )}
                        </div>

                        {/* Nội dung chính Mặt trước */}
                        <div className="my-auto py-3 text-center space-y-4 flex-1 flex flex-col justify-center items-center">
                            {isJaToVi ? (
                                /* Chiều JP -> VN: Hiện Mẫu câu to rõ + Cách nối */
                                <>
                                    <div className="flex items-center justify-center gap-3.5 flex-wrap">
                                        <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white font-japanese tracking-tight break-words">
                                            {settings.showFurigana !== false ? (
                                                <FuriganaText text={patternText} />
                                            ) : (
                                                patternText.replace(/[\(（\[【][^\)）\]】]+[\)）\]】]/g, '').trim()
                                            )}
                                        </h2>
                                        {settings.audioEnabled && settings.showAudioButton !== false && (
                                            <button
                                                type="button"
                                                onClick={(e) => handlePlayAudio(patternText, e)}
                                                className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border-2 border-b-4 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer shadow-xs shrink-0"
                                                title="Nghe phát âm mẫu câu"
                                            >
                                                <Volume2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Khung Cách nối (Cấu trúc liên kết) */}
                                    {settings.showConnection !== false && connectionText && (
                                        <div className="flex justify-center pt-1 w-full max-w-xl">
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 bg-sky-50/80 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/80 rounded-2xl font-japanese font-bold text-sky-700 dark:text-sky-300 shadow-2xs max-w-full text-center break-words ${
                                                connectionText.length > 70
                                                    ? 'text-xs sm:text-sm leading-relaxed max-h-32 overflow-y-auto custom-scrollbar'
                                                    : 'text-sm sm:text-base'
                                            }`}>
                                                <span>
                                                    {settings.showFurigana !== false ? (
                                                        <FuriganaText text={connectionText} />
                                                    ) : (
                                                        renderFormattedContent(connectionText, 'conn-front')
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium pt-1">
                                        Bấm vào thẻ hoặc nhấn Space để lật xem ý nghĩa & ví dụ
                                    </p>
                                </>
                            ) : (
                                /* Chiều VN -> JP: Hiện Ý nghĩa tiếng Việt + Gợi ý */
                                <>
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                        HÃY NHỚ MẪU NGỮ PHÁP TIẾNG NHẬT TƯƠNG ỨNG:
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 leading-snug break-words max-w-xl">
                                        {renderFormattedContent(meaningText, 'mean-front')}
                                    </h2>

                                    {usageText && (
                                        <div className="max-w-md p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic break-words">
                                            {renderFormattedContent(usageText, 'usage-front')}
                                        </div>
                                    )}

                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium pt-1">
                                        Bấm vào thẻ hoặc nhấn Space để lật xem mẫu câu & cấu trúc
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Footer Mặt trước */}
                        <div className="flex items-center justify-center text-xs text-slate-400 gap-1.5 pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800/80">
                            <Eye className="w-4 h-4 text-sky-500" />
                            <span>
                                {isJaToVi
                                    ? 'Nhấn để xem giải thích, cách dùng & ví dụ'
                                    : 'Nhấn để xem mẫu câu tiếng Nhật & cách nối'}
                            </span>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* ==================== MẶT SAU (BACK) ===================== */}
                    {/* ========================================================= */}
                    <div
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 md:p-8 flex flex-col justify-between shadow-sm hover:border-sky-300 dark:hover:border-sky-700 transition-colors overflow-hidden w-full max-w-full"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            WebkitBackfaceVisibility: 'hidden',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg) translateZ(1px)',
                            WebkitTransform: 'rotateY(180deg) translateZ(1px)',
                            transformStyle: 'preserve-3d',
                            WebkitTransformStyle: 'preserve-3d',
                            zIndex: isFlipped ? 2 : 1,
                            pointerEvents: isFlipped ? 'auto' : 'none',
                        }}
                    >
                        {/* Header Mặt sau */}
                        <div className="flex items-center justify-between shrink-0 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                    {isJaToVi ? 'Mặt sau (Ý nghĩa & Chi tiết)' : 'Mặt sau (Mẫu câu & Chi tiết)'}
                                </span>
                                {settings.showLevel !== false && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        JLPT {levelBadge}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-slate-400 font-medium">
                                Nhấn để lật lại (Space)
                            </span>
                        </div>

                        {/* Vùng nội dung cuộn Mặt sau */}
                        <div
                            className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0 custom-scrollbar my-2.5 sm:my-3 pr-1 space-y-3.5 text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Chiều VN -> JP: Header mẫu câu tiếng Nhật to rõ ở mặt sau */}
                            {!isJaToVi && (
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                                    <div className="space-y-0.5 min-w-0">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                            MẪU NGỮ PHÁP TIẾNG NHẬT
                                        </span>
                                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-japanese break-words">
                                            {settings.showFurigana !== false ? (
                                                <FuriganaText text={patternText} />
                                            ) : (
                                                patternText.replace(/[\(（\[【][^\)）\]】]+[\)）\]】]/g, '').trim()
                                            )}
                                        </h2>
                                    </div>
                                    {settings.audioEnabled && (
                                        <button
                                            type="button"
                                            onClick={(e) => handlePlayAudio(patternText, e)}
                                            className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border-2 border-b-4 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer shadow-xs shrink-0"
                                            title="Nghe phát âm"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Ý NGHĨA (luôn hiển thị rõ ràng nếu bật setting) */}
                            {settings.showMeaning !== false && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                        Ý NGHĨA
                                    </span>
                                    <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-snug break-words">
                                        {renderFormattedContent(meaningText, 'mean-back')}
                                    </p>
                                </div>
                            )}

                            {/* CÁCH NỐI / LIÊN KẾT (Hiển thị ở mặt sau khi học chiều VN -> JP) */}
                            {!isJaToVi && connectionText && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                        CÁCH NỐI (CẤU TRÚC)
                                    </span>
                                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-sky-50/80 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/80 rounded-2xl text-xs sm:text-sm font-japanese font-bold text-sky-700 dark:text-sky-300 shadow-2xs max-w-full break-words">
                                        <span>
                                            {settings.showFurigana !== false ? (
                                                <FuriganaText text={connectionText} />
                                            ) : (
                                                renderFormattedContent(connectionText, 'conn-back')
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* CÁCH DÙNG / PHẠM VI SỬ DỤNG */}
                            {settings.showUsage !== false && usageText && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 mr-1.5">Cách dùng:</span>
                                    {renderFormattedContent(usageText, 'usage-back')}
                                </div>
                            )}

                            {/* 💡 CHÚ Ý */}
                            {settings.showNotes !== false && notesText && (
                                <div className="p-3 bg-amber-500/10 dark:bg-amber-950/20 rounded-2xl border border-amber-500/30 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                                    <span className="font-bold text-amber-600 dark:text-amber-400 mr-1.5">💡 Chú ý:</span>
                                    {renderFormattedContent(notesText, 'notes-back')}
                                </div>
                            )}

                            {/* VÍ DỤ TIÊU BIỂU */}
                            {settings.showExamples !== false && examplesList.length > 0 && (
                                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                        VÍ DỤ TIÊU BIỂU
                                    </span>
                                    <div className="space-y-2.5">
                                        {examplesList.slice(0, 3).map((ex, exIdx) => {
                                            const cleanJa = (ex.ja || '').replace(/<[^>]*>/g, '');
                                            const cleanVi = (ex.vi || '').replace(/<[^>]*>/g, '');
                                            return (
                                                <div
                                                    key={exIdx}
                                                    className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 w-full max-w-full overflow-hidden"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 font-japanese leading-relaxed break-words min-w-0 flex-1">
                                                            {settings.showFurigana !== false ? (
                                                                <FuriganaText text={cleanJa} />
                                                            ) : (
                                                                cleanJa.replace(/[\(（\[【][^\)）\]】]+[\)）\]】]/g, '').trim()
                                                            )}
                                                        </div>
                                                        {settings.audioEnabled && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const audioJa = cleanJa.replace(/[\(（\[【][^\)）\]】]+[\)）\]】]/g, '').trim();
                                                                    handlePlayAudio(audioJa || cleanJa, e);
                                                                }}
                                                                className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-sky-500 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer shadow-2xs active:translate-y-0.5"
                                                                title="Nghe câu ví dụ"
                                                            >
                                                                <Volume2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {settings.showExampleVi !== false && cleanVi && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words">
                                                            {renderFormattedContent(cleanVi, `ex-vi-${exIdx}`)}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Mặt sau */}
                        <div className="flex items-center justify-center text-xs text-slate-400 gap-1.5 pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800/80">
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Nhấn để xem lại mặt trước</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrammarFlashcard;
