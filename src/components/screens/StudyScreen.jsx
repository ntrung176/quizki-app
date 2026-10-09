import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, X, BookOpen, RotateCcw, Zap, ChevronRight, Settings, Maximize2, Minimize2 } from 'lucide-react'
import { speakJapanese, preloadAudio } from '../../utils/audio';
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';
import { launchFanfare } from '../../utils/celebrations';
import { getAuth } from 'firebase/auth';
import { saveStudyProgress, resetStudyProgress } from '../../utils/studyProgressService';
import FuriganaText from '../ui/FuriganaText';
import { shuffleArray } from '../../utils/textProcessing';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { normalize, toHiragana, extractReadings } from '../../utils/ankiDiff';
import UnifiedStudyCompleteModal from '../review/UnifiedStudyCompleteModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const checkJapaneseAnswer = (userInput, cardOrFront, pos) => {
    if (!userInput || !userInput.trim()) return false;
    const card = typeof cardOrFront === 'object' && cardOrFront !== null ? cardOrFront : { front: cardOrFront, pos };
    const rawFront = card.front || card.vocabulary || card.word || '';
    const actualPos = pos || card.pos;

    const kanjiPart = rawFront.split('（')[0].split('(')[0].trim();
    const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
    const kanaPart = kanaPartMatch ? kanaPartMatch[1].trim() : '';

    const readings = extractReadings(card);
    const normalizedReadings = readings.map(r => toHiragana(normalize(r))).filter(Boolean);

    const normalizedKanji = toHiragana(normalize(kanjiPart));
    const normalizedKana = toHiragana(normalize(kanaPart));
    const normalizedFull = toHiragana(normalize(rawFront));
    const normalizedInput = toHiragana(normalize(userInput));

    let isCorrect = normalizedInput === normalizedKanji || 
                    (kanaPart && normalizedInput === normalizedKana) || 
                    normalizedInput === normalizedFull ||
                    normalizedReadings.includes(normalizedInput);

    if (!isCorrect && actualPos === 'adj_na') {
        const buildAdjNa = (val) => {
            if (!val) return [];
            if (val.endsWith('な')) {
                return [val, val.slice(0, -1)];
            } else {
                return [val, val + 'な'];
            }
        };
        const accepted = new Set([
            ...buildAdjNa(normalizedKanji),
            ...(kanaPart ? buildAdjNa(normalizedKana) : []),
            ...buildAdjNa(normalizedFull),
            ...normalizedReadings.flatMap(r => buildAdjNa(r))
        ]);
        isCorrect = accepted.has(normalizedInput);
    }
    return isCorrect;
};

// Helper to format card with its authoritative reading so Furigana aligns accurately
const formatCardForOption = (c) => {
    if (!c) return '';
    const rawFront = (c.front || c.vocabulary || c.word || '').split('（')[0].split('(')[0].split('[')[0].trim();
    const reading = (c.reading || c.kana || c.reading_hiragana || '').trim();
    if (rawFront && reading) {
        return `${rawFront}（${reading}）`;
    }
    return c.frontWithFurigana || c.front || '';
};

// Build 4 MC options: 1 correct + 3 distractors from same language pool
const buildOptions = (correctCard, allCards) => {
    const targetLang = correctCard.targetLanguage || 'ja';
    const correct = formatCardForOption(correctCard);
    const sameLangCards = (allCards || []).filter(c => (c.targetLanguage || 'ja') === targetLang);
    const distractors = shuffleArray(
        sameLangCards
            .filter(c => c.id !== correctCard.id)
            .map(c => formatCardForOption(c))
            .filter((v, i, arr) => arr.indexOf(v) === i && normalize(v) !== normalize(correct))
    ).slice(0, 3);
    while (distractors.length < 3) distractors.push(`(lựa chọn ${distractors.length + 1})`);
    return shuffleArray([correct, ...distractors]);
};

// ─── Phase: Multiple Choice ────────────────────────────────────────────────

const MCPhase = ({ card, allCards, onCorrect, onWrong, onSaveCardAudio, furiganaEnabled, audioEnabled }) => {
    const [options] = useState(() => buildOptions(card, allCards));
    const [selected, setSelected] = useState(null);
    const [answered, setAnswered] = useState(false);
    const correct = formatCardForOption(card);

    useEffect(() => {
        if (card) preloadAudio(card).catch(() => {});
    }, [card]);

    const handleSelect = (opt) => {
        if (answered) return;
        setSelected(opt);
        setAnswered(true);
        const isCorrect = normalize(opt) === normalize(correct);
        if (isCorrect) {
            playCorrectSound();
            if (audioEnabled) {
                setTimeout(() => {
                    speakJapanese(card, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
                }, 500);
            }
            setTimeout(() => onCorrect(), 1200);
        } else {
            playIncorrectSound();
            if (audioEnabled) {
                setTimeout(() => {
                    speakJapanese(card, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
                }, 500);
            }
        }
    };
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (!answered) {
                const key = parseInt(e.key);
                if (key >= 1 && key <= 4 && options[key - 1]) {
                    e.preventDefault();
                    handleSelect(options[key - 1]);
                }
            } else if (normalize(selected) !== normalize(correct)) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onWrong();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [answered, options, selected, correct, onWrong]);

    const promptLen = (card.back || '').length;
    let promptSize = 'text-2xl md:text-3xl font-bold';
    if (promptLen > 70) promptSize = 'text-base sm:text-lg md:text-xl font-semibold';
    else if (promptLen > 35) promptSize = 'text-lg sm:text-xl md:text-2xl font-bold';

    const maxOptLen = Math.max(...options.map(o => (typeof o === 'string' ? o : (o?.front || '')).length || 0), 0);
    let optTextSize = 'text-base sm:text-lg font-bold';
    let optPadding = 'px-4 sm:px-5 py-3.5 sm:py-4';
    if (maxOptLen > 20) {
        optTextSize = 'text-xs sm:text-sm font-semibold';
        optPadding = 'px-3 py-2.5 sm:py-3';
    } else if (maxOptLen > 10) {
        optTextSize = 'text-sm sm:text-base font-bold';
        optPadding = 'px-3.5 sm:px-4 py-3 sm:py-3.5';
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Prompt: show Vietnamese meaning */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 text-center border border-slate-200 dark:border-slate-800 shadow-md min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Nghĩa tiếng Việt</p>
                <p className={`text-gray-800 dark:text-white break-words ${promptSize}`}>{card.back}</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-2.5">
                {options.map((opt, i) => {
                    const isCorrectOpt = normalize(opt) === normalize(correct);
                    const isSelected = selected === opt;
                    let cls = `w-full text-left ${optPadding} rounded-xl border-2 font-medium transition-all flex items-center gap-3 shadow-sm `;
                    if (!answered) {
                        cls += 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-slate-800 dark:text-slate-200 cursor-pointer';
                    } else if (isCorrectOpt) {
                        cls += 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-300 cursor-default';
                    } else if (isSelected && !isCorrectOpt) {
                        cls += 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-800 dark:text-rose-300 cursor-default';
                    } else {
                        cls += 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60 cursor-default';
                    }
                    return (
                        <div key={i} onClick={() => { if (!answered) handleSelect(opt); }} className={cls}>
                            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-black flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400 select-none border border-slate-200/60 dark:border-slate-700">
                                {i + 1}
                            </span>
                            <span className={`font-japanese break-words ${optTextSize}`}>
                                <FuriganaText text={opt} forceHide={!furiganaEnabled} />
                            </span>
                            {answered && isCorrectOpt && <Check className="ml-auto w-5 h-5 text-emerald-500 flex-shrink-0" />}
                            {answered && isSelected && !isCorrectOpt && <X className="ml-auto w-5 h-5 text-rose-500 flex-shrink-0" />}
                        </div>
                    );
                })}
            </div>
            {!answered && (
                <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-1 opacity-70">
                    ⌨️ Nhấn phím 1-4 để chọn nhanh
                </p>
            )}
            {answered && normalize(selected) !== normalize(correct) && (
                <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-1 opacity-70">
                    ⌨️ Nhấn phím Enter để tiếp tục
                </p>
            )}

            {/* Wrong answer: Single row compact status bar with correct answer and Continue button */}
            {answered && normalize(selected) !== normalize(correct) && (
                <div className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 shadow-sm animate-fade-in bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 mt-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
                        </div>
                        <span className="font-extrabold text-xs sm:text-sm text-rose-700 dark:text-rose-300 whitespace-nowrap">Chưa đúng</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0 max-w-[50%] sm:max-w-[55%] text-xs sm:text-sm">
                        <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px] sm:text-xs shrink-0">
                            Đáp án:
                        </span>
                        <span className="font-bold font-japanese truncate px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/20" title={correct}>
                            <FuriganaText text={correct} knownReading={card.reading} forceHide={!furiganaEnabled} />
                        </span>
                    </div>

                    <button
                        onClick={() => onWrong()}
                        className="px-3 sm:px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
                    >
                        <span>Tiếp tục</span>
                        <span className="hidden sm:inline opacity-75 font-normal text-[10px]">(Enter)</span>
                        <span className="text-xs">→</span>
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Phase: Written (type the answer) ────────────────────────────────────────

const WrittenPhase = ({ card, onCorrect, onWrong, onSaveCardAudio, furiganaEnabled, audioEnabled }) => {
    const [input, setInput] = useState('');
    const [feedback, setFeedback] = useState(null); // null | 'correct' | 'incorrect'
    const [needsRetype, setNeedsRetype] = useState(false);
    const [lastWrongInput, setLastWrongInput] = useState('');
    const inputRef = useRef(null);
    const correct = formatCardForOption(card);
    const correctFront = card.front;

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
        if (card) preloadAudio(card).catch(() => {});
    }, [card]);

    const check = () => {
        if (!input.trim()) return;
        const isCorrect = checkJapaneseAnswer(input, card, card.pos);
        if (isCorrect) {
            setFeedback('correct');
            playCorrectSound();
            if (audioEnabled) {
                setTimeout(() => {
                    speakJapanese(card, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
                }, 500);
            }
            setTimeout(() => onCorrect(), 1200);
        } else {
            setFeedback('incorrect');
            setNeedsRetype(true);
            setLastWrongInput(input);
            setInput('');
            playIncorrectSound();
            if (audioEnabled) {
                setTimeout(() => {
                    speakJapanese(card, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
                }, 500);
            }
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    const handleRetypeCheck = () => {
        if (!input.trim()) return;
        const isCorrect = checkJapaneseAnswer(input, card, card.pos);
        if (isCorrect) {
            setNeedsRetype(false);
            setFeedback(null);
            setInput('');
            setLastWrongInput('');
            onWrong();
        } else {
            setInput('');
            playIncorrectSound();
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    const promptLen = (card.back || '').length;
    let promptSize = 'text-2xl md:text-3xl font-bold';
    if (promptLen > 70) promptSize = 'text-base sm:text-lg md:text-xl font-semibold';
    else if (promptLen > 35) promptSize = 'text-lg sm:text-xl md:text-2xl font-bold';

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Prompt */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 text-center border border-slate-200 dark:border-slate-800 shadow-md min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Nhập từ tiếng Nhật</p>
                <p className={`text-gray-800 dark:text-white break-words ${promptSize}`}>{card.back}</p>
                {card.sinoVietnamese && (
                    <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 mt-1.5 font-medium">Hán Việt: {card.sinoVietnamese}</p>
                )}
            </div>

            {/* Input */}
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (needsRetype) {
                            handleRetypeCheck();
                        } else if (!feedback) {
                            check();
                        }
                    }
                }}
                disabled={feedback === 'correct'}
                placeholder={needsRetype ? "Nhập lại đáp án đúng để tiếp tục..." : "Nhập từ vựng tiếng Nhật..."}
                className={`w-full px-4 sm:px-5 py-3 text-base sm:text-lg font-japanese font-bold rounded-xl border-2 outline-none transition-all shadow-sm focus:ring-4 focus:ring-blue-500/15
                    ${feedback === 'correct' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : needsRetype ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 focus:border-rose-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500'}`}
            />

            {!feedback && !needsRetype && (
                <div className="space-y-1">
                    <button
                        onClick={check}
                        disabled={!input.trim()}
                        className="w-full py-3 text-base bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer active:scale-95"
                    >
                        Kiểm tra
                    </button>
                    <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 opacity-70">
                        ⌨️ Nhấn Enter để kiểm tra nhanh
                    </p>
                </div>
            )}

            {feedback === 'correct' && (
                <div className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 shadow-sm animate-fade-in bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200">
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                        </div>
                        <span className="font-extrabold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 whitespace-nowrap">Chính xác!</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[50%] sm:max-w-[55%] text-xs sm:text-sm">
                        <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px] sm:text-xs shrink-0">Đáp án:</span>
                        <span className="font-bold font-japanese truncate px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20">
                            <FuriganaText text={correct} knownReading={card.reading} forceHide={!furiganaEnabled} />
                        </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium ml-auto">
                        Đang chuyển tiếp...
                    </div>
                </div>
            )}

            {needsRetype && (
                <div className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 shadow-sm animate-fade-in bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-200">
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
                        </div>
                        <span className="font-extrabold text-xs sm:text-sm text-rose-700 dark:text-rose-300 whitespace-nowrap">Chưa đúng</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[50%] sm:max-w-[55%] text-xs sm:text-sm">
                        <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px] sm:text-xs shrink-0">Đáp án:</span>
                        <span className="font-bold font-japanese truncate px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/20" title={correct}>
                            <FuriganaText text={correct} knownReading={card.reading} forceHide={!furiganaEnabled} />
                        </span>
                    </div>
                    <button
                        onClick={handleRetypeCheck}
                        disabled={!input.trim()}
                        className="px-3 sm:px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
                    >
                        <span>Gõ lại</span>
                        <span className="hidden sm:inline opacity-75 font-normal text-[10px]">(Enter)</span>
                        <span className="text-xs">→</span>
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Batch Complete Screen ──────────────────────────────────────────────────
const BatchComplete = ({ batchNum, totalBatches, wordCount, onNext }) => (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-10 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50">
            <Check className="w-10 h-10 text-white stroke-[3px]" />
        </div>
        <div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Nhóm {batchNum}/{totalBatches} hoàn thành!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-base">
                Bạn đã ghi nhớ thành công <span className="font-black text-emerald-600 dark:text-emerald-400">{wordCount}</span> từ vựng tiếp theo
            </p>
        </div>
        <button
            onClick={onNext}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
        >
            {batchNum < totalBatches ? 'Học nhóm tiếp theo →' : 'Xem kết quả →'}
        </button>
    </div>
);

// ─── Session Complete ──────────────────────────────────────────────────────
const SessionComplete = ({ totalCards, onBack, onRestart }) => {
    useEffect(() => {
        launchFanfare();
        const timer = setTimeout(() => {
            onBack();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onBack]);
    return (
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-8 animate-fade-in">
            <div className="text-6xl mb-2">🎉</div>
            <div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Xuất sắc!</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                    Bạn đã thuần thục <span className="font-black text-emerald-600 dark:text-emerald-400">{totalCards}</span> từ vựng
                </p>
            </div>
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-md">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                    <Zap className="w-5 h-5" />
                    <span>100% Thuần thục</span>
                </div>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
                <button onClick={onRestart} className="flex-1 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex items-center justify-center gap-1 cursor-pointer">
                    <RotateCcw className="w-4 h-4" /> Học lại
                </button>
                <button onClick={onBack} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1 cursor-pointer">
                    Xong <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ─── Main StudyScreen ──────────────────────────────────────────────────────
const StudyScreen = ({ studySessionData, setStudySessionData, allCards, onUpdateCard, onSaveCardAudio, onCompleteStudy, onBack, awardXP }) => {
    const { isEnglishMode } = useTargetLanguage();
    const originalCards = useMemo(() => studySessionData?.cards || [], [studySessionData]);
    const [furiganaEnabled, setFuriganaEnabled] = useState(() => localStorage.getItem('study_furigana_enabled') !== 'false');
    const [audioEnabled, setAudioEnabled] = useState(() => localStorage.getItem('study_audio_enabled') !== 'false');
    const [showSettings, setShowSettings] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFSChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);

    const [batches, setBatches] = useState([]);
    const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
    const [currentBatch, setCurrentBatch] = useState([]);

    // Sub-phases: 'mc', 'written', 'batchComplete'
    const [batchPhase, setBatchPhase] = useState('mc');

    // MC queue for current batch
    const [mcQueue, setMcQueue] = useState([]);
    const [mcIdx, setMcIdx] = useState(0);
    const [mcWrong, setMcWrong] = useState([]);

    // Written queue for current batch (including wrong ones)
    const [writtenQueue, setWrittenQueue] = useState([]);
    const [writtenIdx, setWrittenIdx] = useState(0);
    const [writtenWrong, setWrittenWrong] = useState([]);

    const [done, setDone] = useState(false);
    const sessionWrongCardIdsRef = useRef(new Set());

    const getSavedProgress = useCallback(() => {
        if (!studySessionData?.setId) return null;
        try {
            const key = `study_progress_${studySessionData.setId}_study`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                if (data && (data.batches || data.cardIds)) {
                    return data;
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    }, [studySessionData?.setId]);

    // Initialize/Restart batches
    const initializeBatches = useCallback(() => {
        if (!originalCards.length) return;

        const saved = getSavedProgress();
        if (saved) {
            const cardMap = new Map(originalCards.map(c => [c.id, c]));

            const restoreCards = (savedList) => {
                if (!savedList) return [];
                return savedList.map(item => {
                    if (typeof item === 'string') {
                        return cardMap.get(item);
                    }
                    if (item && item.id) {
                        return cardMap.get(item.id) || item;
                    }
                    return null;
                }).filter(Boolean);
            };

            const restoreBatches = (savedBatches) => {
                if (!savedBatches) return [];
                return savedBatches.map(batch => restoreCards(batch));
            };

            let restoredBatches = restoreBatches(saved.batches);
            const trackedCardIds = new Set();
            restoredBatches.forEach(batch => batch.forEach(c => trackedCardIds.add(c.id)));

            const brandNewCards = originalCards.filter(c => !trackedCardIds.has(c.id));
            if (brandNewCards.length > 0) {
                const shuffledNew = shuffleArray([...brandNewCards]);
                for (let i = 0; i < shuffledNew.length; i += 5) {
                    restoredBatches.push(shuffledNew.slice(i, i + 5));
                }
            }

            setBatches(restoredBatches);
            const savedBatchIdx = saved.currentBatchIndex || 0;
            const isPrevDone = saved.done || false;

            if (isPrevDone && brandNewCards.length > 0) {
                const firstNewBatchIdx = saved.batches ? saved.batches.length : 0;
                setCurrentBatchIndex(firstNewBatchIdx);
                const nextBatch = restoredBatches[firstNewBatchIdx] || [];
                setCurrentBatch(nextBatch);
                setBatchPhase('mc');
                setMcQueue(shuffleArray([...nextBatch]));
                setMcIdx(0);
                setMcWrong([]);
                setWrittenQueue([]);
                setWrittenIdx(0);
                setWrittenWrong([]);
                setDone(false);
            } else {
                setCurrentBatchIndex(savedBatchIdx);
                setCurrentBatch(restoreCards(saved.currentBatch));
                setBatchPhase(saved.batchPhase || 'mc');
                setMcQueue(restoreCards(saved.mcQueue));
                setMcIdx(saved.mcIdx || 0);
                setMcWrong(restoreCards(saved.mcWrong));
                setWrittenQueue(restoreCards(saved.writtenQueue));
                setWrittenIdx(saved.writtenIdx || 0);
                setWrittenWrong(restoreCards(saved.writtenWrong));
                setDone(isPrevDone && brandNewCards.length === 0);
            }
            return;
        }

        const shuffled = shuffleArray([...originalCards]);
        const b = [];
        for (let i = 0; i < shuffled.length; i += 5) {
            b.push(shuffled.slice(i, i + 5));
        }
        setBatches(b);
        setCurrentBatchIndex(0);
        setDone(false);
        if (b.length > 0) {
            setCurrentBatch(b[0]);
            setBatchPhase('mc');
            setMcQueue(shuffleArray([...b[0]]));
            setMcIdx(0);
            setMcWrong([]);
            setWrittenQueue([]);
            setWrittenIdx(0);
            setWrittenWrong([]);
        }
    }, [originalCards, getSavedProgress]);

    useEffect(() => {
        if (originalCards.length > 0 && batches.length === 0) {
            initializeBatches();
        }
    }, [originalCards, batches.length, initializeBatches]);

    // Save progress to localStorage whenever state changes
    useEffect(() => {
        if (!studySessionData?.setId || batches.length === 0) return;
        const progressData = {
            cardIds: originalCards.map(c => c.id),
            batches: (batches || []).map(batch => (batch || []).map(c => c?.id).filter(Boolean)),
            currentBatchIndex,
            currentBatch: (currentBatch || []).map(c => c?.id).filter(Boolean),
            batchPhase,
            mcQueue: (mcQueue || []).map(c => c?.id).filter(Boolean),
            mcIdx,
            mcWrong: (mcWrong || []).map(c => c?.id).filter(Boolean),
            writtenQueue: (writtenQueue || []).map(c => c?.id).filter(Boolean),
            writtenIdx,
            writtenWrong: (writtenWrong || []).map(c => c?.id).filter(Boolean),
            done,
            timestamp: Date.now(),
        };
        const key = `study_progress_${studySessionData.setId}_study`;
        localStorage.setItem(key, JSON.stringify(progressData));
        if (studySessionData?.setId) {
            const userId = getAuth().currentUser?.uid;
            saveStudyProgress(userId, studySessionData.setId, 'study', progressData);
        }
    }, [
        studySessionData?.setId,
        originalCards,
        batches,
        currentBatchIndex,
        currentBatch,
        batchPhase,
        mcQueue,
        mcIdx,
        mcWrong,
        writtenQueue,
        writtenIdx,
        writtenWrong,
        done
    ]);

    const currentCard = batchPhase === 'mc' ? mcQueue[mcIdx]
        : batchPhase === 'written' ? writtenQueue[writtenIdx]
            : null;

    // Overall Progress Calculation
    const progress = useMemo(() => {
        if (!batches.length) return 0;
        const totalSteps = originalCards.length * 2;

        // Steps from completed batches
        let completedSteps = 0;
        for (let i = 0; i < currentBatchIndex; i++) {
            completedSteps += batches[i].length * 2;
        }

        // Steps in current batch
        if (batchPhase === 'mc') {
            completedSteps += mcIdx;
        } else if (batchPhase === 'written') {
            completedSteps += currentBatch.length;
            completedSteps += Math.min(writtenIdx, currentBatch.length);
        } else if (batchPhase === 'batchComplete') {
            completedSteps += currentBatch.length * 2;
        }

        return Math.min(100, Math.round((completedSteps / totalSteps) * 100));
    }, [batches, currentBatchIndex, batchPhase, mcIdx, writtenIdx, currentBatch.length, originalCards.length]);

    // ── MC handlers ──────────────────────────────────────────────────────────

    const handleMCCorrect = useCallback(() => {
        if (awardXP) awardXP(15);
        const cCard = mcQueue[mcIdx];
        if (onUpdateCard && cCard?.id && !sessionWrongCardIdsRef.current.has(cCard.id)) {
            onUpdateCard(cCard.id, true, 'back', 'study_mc');
        }
        const nextIdx = mcIdx + 1;
        if (nextIdx >= mcQueue.length) {
            if (mcWrong.length === 0) {
                setBatchPhase('written');
                setWrittenQueue(shuffleArray([...currentBatch]));
                setWrittenIdx(0);
                setWrittenWrong([]);
            } else {
                setMcQueue(shuffleArray([...mcWrong]));
                setMcIdx(0);
                setMcWrong([]);
            }
        } else {
            setMcIdx(nextIdx);
        }
    }, [mcIdx, mcQueue, currentBatch, onUpdateCard, mcWrong]);

    const handleMCWrong = useCallback(() => {
        const cCard = mcQueue[mcIdx];
        if (cCard?.id) {
            sessionWrongCardIdsRef.current.add(cCard.id);
            if (onUpdateCard) {
                onUpdateCard(cCard.id, false, 'back', 'study_mc');
            }
        }
        setMcWrong(prev => {
            if (prev.some(c => c.id === cCard.id)) return prev;
            return [...prev, cCard];
        });

        const nextIdx = mcIdx + 1;
        if (nextIdx >= mcQueue.length) {
            setMcWrong(prev => {
                const updated = [...prev];
                if (!updated.some(c => c.id === cCard.id)) {
                    updated.push(cCard);
                }
                setMcQueue(shuffleArray(updated));
                return [];
            });
            setMcIdx(0);
        } else {
            setMcIdx(nextIdx);
        }
    }, [mcIdx, mcQueue, onUpdateCard]);

    // ── Written handlers ─────────────────────────────────────────────────────

    const handleWrittenCorrect = useCallback(() => {
        if (awardXP) awardXP(15);
        const cCard = writtenQueue[writtenIdx];
        if (onUpdateCard && cCard?.id && !sessionWrongCardIdsRef.current.has(cCard.id)) {
            onUpdateCard(cCard.id, true, 'back', 'study_written');
        }
        const nextIdx = writtenIdx + 1;
        if (nextIdx >= writtenQueue.length) {
            // Current round of written finished
            if (writtenWrong.length === 0) {
                setBatchPhase('batchComplete');
            } else {
                setWrittenQueue(shuffleArray([...writtenWrong]));
                setWrittenIdx(0);
                setWrittenWrong([]);
            }
        } else {
            setWrittenIdx(nextIdx);
        }
    }, [writtenIdx, writtenQueue.length, writtenWrong, onUpdateCard, writtenQueue]);

    const handleWrittenWrong = useCallback(() => {
        const cCard = writtenQueue[writtenIdx];
        if (cCard?.id) {
            sessionWrongCardIdsRef.current.add(cCard.id);
            if (onUpdateCard) {
                onUpdateCard(cCard.id, false, 'back', 'study_written');
            }
        }
        setWrittenWrong(prev => {
            if (prev.some(c => c.id === cCard.id)) return prev;
            return [...prev, cCard];
        });

        const nextIdx = writtenIdx + 1;
        if (nextIdx >= writtenQueue.length) {
            // Include current wrong card if not already added
            setWrittenWrong(prev => {
                const updated = [...prev];
                if (!updated.some(c => c.id === cCard.id)) {
                    updated.push(cCard);
                }
                setWrittenQueue(shuffleArray(updated));
                return [];
            });
            setWrittenIdx(0);
        } else {
            setWrittenIdx(nextIdx);
        }
    }, [writtenIdx, writtenQueue, onUpdateCard]);

    const handleNextBatch = useCallback(() => {
        const nextBatchIdx = currentBatchIndex + 1;
        if (nextBatchIdx >= batches.length) {
            setDone(true);
        } else {
            setCurrentBatchIndex(nextBatchIdx);
            const nextBatch = batches[nextBatchIdx];
            setCurrentBatch(nextBatch);
            setBatchPhase('mc');
            setMcQueue(shuffleArray([...nextBatch]));
            setMcIdx(0);
            setMcWrong([]);
            setWrittenQueue([]);
            setWrittenIdx(0);
            setWrittenWrong([]);
        }
    }, [currentBatchIndex, batches]);

    const handleRestart = useCallback(() => {
        if (studySessionData?.setId) {
            const userId = getAuth().currentUser?.uid;
            resetStudyProgress(userId, studySessionData.setId, 'study');
        }
        const shuffled = shuffleArray([...originalCards]);
        const b = [];
        for (let i = 0; i < shuffled.length; i += 5) {
            b.push(shuffled.slice(i, i + 5));
        }
        setBatches(b);
        setCurrentBatchIndex(0);
        setDone(false);
        if (b.length > 0) {
            setCurrentBatch(b[0]);
            setBatchPhase('mc');
            setMcQueue(shuffleArray([...b[0]]));
            setMcIdx(0);
            setMcWrong([]);
            setWrittenQueue([]);
            setWrittenIdx(0);
            setWrittenWrong([]);
        }
    }, [originalCards, studySessionData?.setId]);

    // Handle Enter key for BatchComplete and SessionComplete screens
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            const activeTag = e.target ? e.target.tagName : '';
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || e.target?.isContentEditable) {
                return;
            }
            if (e.key === 'Enter') {
                if (done) {
                    e.preventDefault();
                    if (onCompleteStudy) {
                        onCompleteStudy();
                    } else if (onBack) {
                        onBack();
                    }
                } else if (batchPhase === 'batchComplete') {
                    e.preventDefault();
                    handleNextBatch();
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [done, batchPhase, onCompleteStudy, onBack, handleNextBatch]);

    if (!originalCards.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Không có thẻ nào để học.</p>
                <button onClick={onBack} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 cursor-pointer">Trở lại</button>
            </div>
        );
    }

    const phaseLabel = batchPhase === 'mc' 
        ? `🟦 Trắc nghiệm (Nhóm ${currentBatchIndex + 1}/${batches.length})` 
        : `✏️ Tự luận (Nhóm ${currentBatchIndex + 1}/${batches.length})`;

    const phaseDesc = batchPhase === 'mc'
        ? `${mcIdx + 1} / ${mcQueue.length}`
        : `${writtenIdx + 1} / ${writtenQueue.length}`;

    if (done) {
        return (
            <UnifiedStudyCompleteModal
                totalCards={originalCards.length}
                onBack={onBack}
                onComplete={onCompleteStudy || onBack}
                onRestart={handleRestart}
            />
        );
    }

    return (
        <div className={isFullscreen 
            ? "fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto w-screen h-screen" 
            : "relative w-full flex-1 min-h-0 flex flex-col items-center justify-center px-3 sm:px-4 py-2 sm:py-3.5 overflow-y-auto animate-fade-in"
        }>
            <div className="w-full max-w-3xl mx-auto my-auto flex flex-col justify-center items-center space-y-3 sm:space-y-4">
                {/* Back Button - outside frame */}
                {onBack && (
                    <div className="w-full flex justify-start mb-1">
                        <button
                            onClick={onBack}
                            className="p-2 flex items-center gap-1.5 justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105"
                            title="Trở lại"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-xs font-medium">Trở lại</span>
                        </button>
                    </div>
                )}

                <div className="w-full flex flex-col space-y-4 sm:space-y-5 p-4 sm:p-6 md:p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-2 border-blue-400/30 dark:border-blue-500/20 rounded-3xl shadow-xl overflow-hidden">
                    {/* Progress bar inside the box */}
                    {!done && batchPhase !== 'batchComplete' && (
                        <div className="space-y-1.5 w-full flex-shrink-0">
                            <div className="flex justify-between items-center text-xs font-bold text-blue-500 dark:text-blue-400">
                                <span>{phaseLabel}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 dark:text-gray-400">{phaseDesc}</span>
                                    <button
                                        type="button"
                                        onClick={toggleFullscreen}
                                        className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                        title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"}
                                    >
                                        {isFullscreen ? <Minimize2 className="w-4 h-4 text-blue-400" /> : <Maximize2 className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                        title="Cài đặt"
                                    >
                                        <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-sky-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="w-full">
                        {done ? (
                            <SessionComplete
                                totalCards={originalCards.length}
                                onBack={onCompleteStudy || onBack}
                                onRestart={handleRestart}
                            />
                        ) : batchPhase === 'batchComplete' ? (
                            <BatchComplete
                                batchNum={currentBatchIndex + 1}
                                totalBatches={batches.length}
                                wordCount={currentBatch.length}
                                onNext={handleNextBatch}
                            />
                        ) : batchPhase === 'mc' && currentCard ? (
                            <>
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">Nhóm {currentBatchIndex + 1} · Trắc nghiệm</span>
                                </div>
                                <MCPhase
                                    key={currentCard.id + '-mc-' + mcIdx}
                                    card={currentCard}
                                    allCards={allCards?.length > 1 ? allCards : originalCards}
                                    onCorrect={handleMCCorrect}
                                    onWrong={handleMCWrong}
                                    onSaveCardAudio={onSaveCardAudio}
                                    furiganaEnabled={furiganaEnabled}
                                    audioEnabled={audioEnabled}
                                />
                            </>
                        ) : batchPhase === 'written' && currentCard ? (
                            <>
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">Nhóm {currentBatchIndex + 1} · Tự luận</span>
                                </div>
                                <WrittenPhase
                                    key={currentCard.id + '-written-' + writtenIdx + '-b' + currentBatchIndex}
                                    card={currentCard}
                                    onCorrect={handleWrittenCorrect}
                                    onWrong={handleWrittenWrong}
                                    onSaveCardAudio={onSaveCardAudio}
                                    furiganaEnabled={furiganaEnabled}
                                    audioEnabled={audioEnabled}
                                />
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Settings Modal Popup */}
            {showSettings && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 border border-gray-200 dark:border-slate-700"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-blue-500" />
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Cài đặt học tập</h3>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-all cursor-pointer">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-350">{isEnglishMode ? 'Hiện phiên âm IPA' : 'Hiển thị Furigana'}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={furiganaEnabled}
                                        onChange={(e) => {
                                            setFuriganaEnabled(e.target.checked);
                                            localStorage.setItem('study_furigana_enabled', String(e.target.checked));
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-350">Phát âm thanh từ vựng</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={audioEnabled}
                                        onChange={(e) => {
                                            setAudioEnabled(e.target.checked);
                                            localStorage.setItem('study_audio_enabled', String(e.target.checked));
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-sm cursor-pointer"
                        >
                            Xong
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default StudyScreen;
