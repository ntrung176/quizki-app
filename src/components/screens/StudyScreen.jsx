import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Check, X, BookOpen, RotateCcw, Trophy, Zap, ChevronRight } from 'lucide-react';
import { speakJapanese } from '../../utils/audio';
import { playCorrectSound, playIncorrectSound, launchFireworks } from '../../utils/soundEffects';
import FuriganaText from '../ui/FuriganaText';
import { shuffleArray } from '../../utils/textProcessing';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalize = (text = '') =>
    text
        .replace(/（[^）]*）/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/[。、！？\s]/g, '')
        .toLowerCase()
        .trim();

// Build 4 MC options: 1 correct + 3 distractors from pool
const buildOptions = (correctCard, allCards) => {
    const correct = correctCard.frontWithFurigana || correctCard.front;
    const distractors = shuffleArray(
        allCards
            .filter(c => c.id !== correctCard.id)
            .map(c => c.frontWithFurigana || c.front)
            .filter((v, i, arr) => arr.indexOf(v) === i && normalize(v) !== normalize(correct))
    ).slice(0, 3);
    while (distractors.length < 3) distractors.push(`(lựa chọn ${distractors.length + 1})`);
    return shuffleArray([correct, ...distractors]);
};

// ─── Phase: Multiple Choice ────────────────────────────────────────────────

const MCPhase = ({ card, allCards, onCorrect, onWrong, onSaveCardAudio }) => {
    const [options] = useState(() => buildOptions(card, allCards));
    const [selected, setSelected] = useState(null);
    const [answered, setAnswered] = useState(false);
    const correct = card.frontWithFurigana || card.front;

    const handleSelect = (opt) => {
        if (answered) return;
        setSelected(opt);
        setAnswered(true);
        const isCorrect = normalize(opt) === normalize(correct);
        if (isCorrect) {
            playCorrectSound();
            setTimeout(() => {
                speakJapanese(card.front, card.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
            }, 500);
            setTimeout(() => onCorrect(), 1200);
        } else {
            playIncorrectSound();
            setTimeout(() => {
                speakJapanese(card.front, card.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
            }, 500);
        }
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Prompt: show Vietnamese meaning */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 text-center border border-white/60 dark:border-slate-700/60 shadow-lg min-h-[140px] flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Nghĩa tiếng Việt</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{card.back}</p>
                {card.example && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 italic">"{card.example}"</p>
                )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
                {options.map((opt, i) => {
                    const isCorrectOpt = normalize(opt) === normalize(correct);
                    const isSelected = selected === opt;
                    let cls = 'w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all flex items-center gap-3 shadow-sm ';
                    if (!answered) {
                        cls += 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-gray-200/80 dark:border-slate-600/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200 cursor-pointer';
                    } else if (isCorrectOpt) {
                        cls += 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-800 dark:text-emerald-300';
                    } else if (isSelected && !isCorrectOpt) {
                        cls += 'bg-red-50 dark:bg-red-900/30 border-red-400 text-red-800 dark:text-red-300';
                    } else {
                        cls += 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 opacity-60';
                    }
                    return (
                        <button key={i} onClick={() => handleSelect(opt)} className={cls} disabled={answered}>
                            <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs font-black flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400">
                                {i + 1}
                            </span>
                            <span className="font-japanese text-lg font-bold">
                                <FuriganaText text={opt} />
                            </span>
                            {answered && isCorrectOpt && <Check className="ml-auto w-5 h-5 text-emerald-500 flex-shrink-0" />}
                            {answered && isSelected && !isCorrectOpt && <X className="ml-auto w-5 h-5 text-red-500 flex-shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {/* Wrong answer: show continue */}
            {answered && normalize(selected) !== normalize(correct) && (
                <div className="space-y-3 animate-fade-in">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                        Đáp án đúng: <span className="font-japanese font-bold text-lg"><FuriganaText text={correct} /></span>
                        {card.sinoVietnamese && <span className="ml-2 text-yellow-600 dark:text-yellow-400">({card.sinoVietnamese})</span>}
                    </div>
                    <button onClick={() => onWrong()} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all">
                        Tiếp tục →
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Phase: Written (type the answer) ────────────────────────────────────────

const WrittenPhase = ({ card, onCorrect, onWrong, onSaveCardAudio }) => {
    const [input, setInput] = useState('');
    const [feedback, setFeedback] = useState(null); // null | 'correct' | 'incorrect'
    const inputRef = useRef(null);
    const correct = card.frontWithFurigana || card.front;
    const correctFront = card.front;

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const check = () => {
        if (!input.trim()) return;
        const isCorrect = normalize(input) === normalize(correctFront) || normalize(input) === normalize(correct);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        if (isCorrect) {
            playCorrectSound();
            setTimeout(() => {
                speakJapanese(correctFront, card.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
            }, 500);
            setTimeout(() => onCorrect(), 1200);
        } else {
            playIncorrectSound();
            setTimeout(() => {
                speakJapanese(correctFront, card.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
            }, 500);
        }
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Prompt */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 text-center border border-white/60 dark:border-slate-700/60 shadow-lg min-h-[140px] flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Nhập từ tiếng Nhật</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{card.back}</p>
                {card.sinoVietnamese && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 font-medium">Hán Việt: {card.sinoVietnamese}</p>
                )}
            </div>

            {/* Input */}
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); feedback ? (feedback === 'incorrect' ? onWrong() : null) : check(); } }}
                disabled={!!feedback}
                placeholder="Nhập từ vựng tiếng Nhật..."
                className={`w-full px-5 py-4 text-xl font-japanese font-bold rounded-xl border-2 outline-none transition-all shadow-sm
                    ${feedback === 'correct' ? 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                        : feedback === 'incorrect' ? 'border-red-400 bg-red-50/80 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            : 'border-gray-200/80 dark:border-slate-600/80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800'}`}
            />

            {!feedback && (
                <button
                    onClick={check}
                    disabled={!input.trim()}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                >
                    Kiểm tra
                </button>
            )}

            {feedback === 'correct' && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold text-center animate-fade-in">
                    ✅ Chính xác! <span className="font-japanese"><FuriganaText text={correct} /></span>
                </div>
            )}

            {feedback === 'incorrect' && (
                <div className="space-y-3 animate-fade-in">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-sm text-red-500 font-medium mb-1">Bạn nhập: <span className="font-bold">{input}</span></p>
                        <p className="text-red-700 dark:text-red-300 font-bold">
                            Đáp án đúng: <span className="font-japanese text-lg"><FuriganaText text={correct} /></span>
                        </p>
                    </div>
                    <button onClick={() => onWrong()} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all">
                        Tiếp tục →
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
        launchFireworks();
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
            <div className="w-full max-w-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-200/60 dark:border-emerald-800/60 shadow-lg">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                    <Zap className="w-5 h-5" />
                    <span>100% Thuần thục</span>
                </div>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
                <button onClick={onRestart} className="flex-1 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-center gap-1">
                    <RotateCcw className="w-4 h-4" /> Học lại
                </button>
                <button onClick={onBack} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1">
                    Xong <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ─── Main StudyScreen ──────────────────────────────────────────────────────
const StudyScreen = ({ studySessionData, setStudySessionData, allCards, onUpdateCard, onSaveCardAudio, onCompleteStudy, onBack }) => {
    const originalCards = useMemo(() => studySessionData?.cards || [], [studySessionData]);
    const [batches, setBatches] = useState([]);
    const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
    const [currentBatch, setCurrentBatch] = useState([]);
    
    // Sub-phases: 'mc', 'written', 'batchComplete'
    const [batchPhase, setBatchPhase] = useState('mc');

    // MC queue for current batch
    const [mcQueue, setMcQueue] = useState([]);
    const [mcIdx, setMcIdx] = useState(0);

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
                const savedIds = new Set(data.cardIds || []);
                const currentIds = originalCards.map(c => c.id);
                if (currentIds.length === savedIds.size && currentIds.every(id => savedIds.has(id))) {
                    return data;
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    }, [studySessionData?.setId, originalCards]);

    // Initialize/Restart batches
    const initializeBatches = useCallback(() => {
        if (!originalCards.length) return;

        const saved = getSavedProgress();
        if (saved) {
            setBatches(saved.batches || []);
            setCurrentBatchIndex(saved.currentBatchIndex || 0);
            setCurrentBatch(saved.currentBatch || []);
            setBatchPhase(saved.batchPhase || 'mc');
            setMcQueue(saved.mcQueue || []);
            setMcIdx(saved.mcIdx || 0);
            setWrittenQueue(saved.writtenQueue || []);
            setWrittenIdx(saved.writtenIdx || 0);
            setWrittenWrong(saved.writtenWrong || []);
            setDone(saved.done || false);
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
            batches,
            currentBatchIndex,
            currentBatch,
            batchPhase,
            mcQueue,
            mcIdx,
            writtenQueue,
            writtenIdx,
            writtenWrong,
            done,
            timestamp: Date.now(),
        };
        const key = `study_progress_${studySessionData.setId}_study`;
        localStorage.setItem(key, JSON.stringify(progressData));
    }, [
        studySessionData?.setId,
        originalCards,
        batches,
        currentBatchIndex,
        currentBatch,
        batchPhase,
        mcQueue,
        mcIdx,
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
        const cCard = mcQueue[mcIdx];
        if (onUpdateCard && cCard?.id && !sessionWrongCardIdsRef.current.has(cCard.id)) {
            onUpdateCard(cCard.id, true, 'back', 'study_mc');
        }
        const nextIdx = mcIdx + 1;
        if (nextIdx >= mcQueue.length) {
            setBatchPhase('written');
            setWrittenQueue(shuffleArray([...currentBatch]));
            setWrittenIdx(0);
            setWrittenWrong([]);
        } else {
            setMcIdx(nextIdx);
        }
    }, [mcIdx, mcQueue.length, currentBatch, onUpdateCard, mcQueue]);
 
    const handleMCWrong = useCallback(() => {
        const cCard = mcQueue[mcIdx];
        if (cCard?.id) {
            sessionWrongCardIdsRef.current.add(cCard.id);
            if (onUpdateCard) {
                onUpdateCard(cCard.id, false, 'back', 'study_mc');
            }
        }
        const nextIdx = mcIdx + 1;
        if (nextIdx >= mcQueue.length) {
            setBatchPhase('written');
            setWrittenQueue(shuffleArray([...currentBatch]));
            setWrittenIdx(0);
            setWrittenWrong([]);
        } else {
            setMcIdx(nextIdx);
        }
    }, [mcIdx, mcQueue.length, currentBatch, onUpdateCard, mcQueue]);
 
    // ── Written handlers ─────────────────────────────────────────────────────
 
    const handleWrittenCorrect = useCallback(() => {
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
            setWrittenQueue([]);
            setWrittenIdx(0);
            setWrittenWrong([]);
        }
    }, [currentBatchIndex, batches]);
 
    const handleRestart = useCallback(() => {
        if (studySessionData?.setId) {
            localStorage.removeItem(`study_progress_${studySessionData.setId}_study`);
            localStorage.removeItem(`study_completed_${studySessionData.setId}_study`);
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
            setWrittenQueue([]);
            setWrittenIdx(0);
            setWrittenWrong([]);
        }
    }, [originalCards, studySessionData?.setId]);

    if (!originalCards.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Không có thẻ nào để học.</p>
                <button onClick={onBack} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Trở lại</button>
            </div>
        );
    }

    const phaseLabel = batchPhase === 'mc' 
        ? `🟦 Trắc nghiệm (Nhóm ${currentBatchIndex + 1}/${batches.length})` 
        : `✏️ Tự luận (Nhóm ${currentBatchIndex + 1}/${batches.length})`;

    const phaseDesc = batchPhase === 'mc'
        ? `${mcIdx + 1} / ${mcQueue.length}`
        : `${writtenIdx + 1} / ${writtenQueue.length}`;

    return (
        <div className="relative w-full h-full flex flex-col justify-center py-6 animate-fade-in">
            <div className="w-[800px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3">
                {/* Back Button - outside frame */}
                {onBack && (
                    <div className="w-full flex justify-start mb-1">
                        <button
                            onClick={onBack}
                            className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105"
                            title="Trở lại"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium ml-1">Trở lại</span>
                        </button>
                    </div>
                )}
                
                <div className="w-full flex flex-col space-y-5 p-6 md:p-8 bg-white dark:bg-slate-900 border-2 border-indigo-400/30 rounded-3xl shadow-xl">
                    {/* Progress bar inside the box */}
                    {!done && batchPhase !== 'batchComplete' && (
                        <div className="space-y-1.5 w-full flex-shrink-0">
                            <div className="flex justify-between items-center text-xs font-bold text-indigo-500 dark:text-indigo-400">
                                <span>{phaseLabel}</span>
                                <span className="text-gray-500 dark:text-gray-400">{phaseDesc}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
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
                                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">Nhóm {currentBatchIndex + 1} · Trắc nghiệm</span>
                                </div>
                                <MCPhase
                                    key={currentCard.id + '-mc-' + mcIdx}
                                    card={currentCard}
                                    allCards={allCards?.length > 1 ? allCards : originalCards}
                                    onCorrect={handleMCCorrect}
                                    onWrong={handleMCWrong}
                                    onSaveCardAudio={onSaveCardAudio}
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
                                />
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyScreen;
