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

const MCPhase = ({ card, allCards, onCorrect, onWrong }) => {
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
            setTimeout(() => onCorrect(), 700);
        } else {
            playIncorrectSound();
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
            speakJapanese(correctFront, card.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
            setTimeout(() => onCorrect(), 900);
        } else {
            playIncorrectSound();
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

// ─── Round Complete Screen ─────────────────────────────────────────────────

const RoundComplete = ({ roundNum, correct, total, onNext }) => (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/50">
            <Trophy className="w-12 h-12 text-white" />
        </div>
        <div>
            <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Vòng {roundNum} hoàn thành!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
                Trả lời đúng <span className="font-black text-indigo-600 dark:text-indigo-400">{correct}/{total}</span> câu
            </p>
        </div>
        {correct < total && (
            <p className="text-sm text-orange-500 font-medium bg-orange-50/80 dark:bg-orange-900/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-orange-200/60 dark:border-orange-800/60">
                🔄 {total - correct} từ chưa thuần thục sẽ luyện lại
            </p>
        )}
        <button
            onClick={onNext}
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
            {correct < total ? 'Luyện lại từ sai →' : 'Tiếp tục →'}
        </button>
    </div>
);

// ─── Session Complete ──────────────────────────────────────────────────────

const SessionComplete = ({ totalCards, onBack, onRestart }) => {
    useEffect(() => { launchFireworks(); }, []);
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

    // phases: 'mc' → 'written' → 'roundComplete' → loop back, or 'done'
    const [phase, setPhase] = useState('mc');
    const [round, setRound] = useState(1);

    // Queue of cards remaining in current phase
    const [queue, setQueue] = useState(() => shuffleArray([...originalCards]));
    const [currentIdx, setCurrentIdx] = useState(0);

    // Track correct per round
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCards, setWrongCards] = useState([]); // cards to re-queue in written phase

    // Written phase re-queue tracking
    const [writtenQueue, setWrittenQueue] = useState([]);
    const [writtenIdx, setWrittenIdx] = useState(0);
    const [writtenCorrect, setWrittenCorrect] = useState(0);
    const [writtenWrong, setWrittenWrong] = useState([]);

    const [roundSummary, setRoundSummary] = useState(null); // { correct, total }
    const [done, setDone] = useState(false);

    const currentCard = phase === 'mc' ? queue[currentIdx]
        : phase === 'written' ? writtenQueue[writtenIdx]
        : null;

    // Progress
    const progress = useMemo(() => {
        if (phase === 'mc') return queue.length > 0 ? (currentIdx / queue.length) * 100 : 0;
        if (phase === 'written') return writtenQueue.length > 0 ? (writtenIdx / writtenQueue.length) * 100 : 0;
        return 100;
    }, [phase, queue, currentIdx, writtenQueue, writtenIdx]);

    // ── MC handlers ──────────────────────────────────────────────────────────

    const handleMCCorrect = useCallback(() => {
        const nextIdx = currentIdx + 1;
        if (nextIdx >= queue.length) {
            // MC phase complete — move to written phase with all cards
            setPhase('written');
            setWrittenQueue(shuffleArray([...originalCards]));
            setWrittenIdx(0);
            setWrittenCorrect(0);
            setWrittenWrong([]);
        } else {
            setCurrentIdx(nextIdx);
        }
        setCorrectCount(p => p + 1);
    }, [currentIdx, queue.length, originalCards]);

    const handleMCWrong = useCallback(() => {
        // Wrong — move on but note it
        setWrongCards(p => [...p, queue[currentIdx]]);
        const nextIdx = currentIdx + 1;
        if (nextIdx >= queue.length) {
            setPhase('written');
            setWrittenQueue(shuffleArray([...originalCards]));
            setWrittenIdx(0);
            setWrittenCorrect(0);
            setWrittenWrong([]);
        } else {
            setCurrentIdx(nextIdx);
        }
    }, [currentIdx, queue, originalCards]);

    // ── Written handlers ─────────────────────────────────────────────────────

    const handleWrittenCorrect = useCallback(() => {
        const nextIdx = writtenIdx + 1;
        const newCorrect = writtenCorrect + 1;
        if (nextIdx >= writtenQueue.length) {
            // Written phase complete
            if (writtenWrong.length === 0) {
                // All mastered!
                setDone(true);
            } else {
                // Show round summary, then re-queue wrong cards
                setRoundSummary({ correct: newCorrect, total: writtenQueue.length, wrongCount: writtenWrong.length });
                setPhase('roundComplete');
            }
            setWrittenCorrect(newCorrect);
        } else {
            setWrittenIdx(nextIdx);
            setWrittenCorrect(newCorrect);
        }
    }, [writtenIdx, writtenQueue.length, writtenCorrect, writtenWrong]);

    const handleWrittenWrong = useCallback(() => {
        setWrittenWrong(p => [...p, writtenQueue[writtenIdx]]);
        const nextIdx = writtenIdx + 1;
        if (nextIdx >= writtenQueue.length) {
            setRoundSummary({ correct: writtenCorrect, total: writtenQueue.length, wrongCount: writtenWrong.length + 1 });
            setPhase('roundComplete');
        } else {
            setWrittenIdx(nextIdx);
        }
    }, [writtenIdx, writtenQueue, writtenCorrect, writtenWrong]);

    // ── Round complete → next round ───────────────────────────────────────────

    const handleNextRound = useCallback(() => {
        const wrongList = writtenWrong.length > 0 ? writtenWrong : [];
        if (wrongList.length === 0) {
            setDone(true);
            return;
        }
        // New round: re-queue wrong cards in written phase
        setRound(r => r + 1);
        setWrittenQueue(shuffleArray([...wrongList]));
        setWrittenIdx(0);
        setWrittenCorrect(0);
        setWrittenWrong([]);
        setPhase('written');
        setRoundSummary(null);
    }, [writtenWrong]);

    const handleRestart = useCallback(() => {
        setPhase('mc');
        setRound(1);
        setQueue(shuffleArray([...originalCards]));
        setCurrentIdx(0);
        setCorrectCount(0);
        setWrongCards([]);
        setWrittenQueue([]);
        setWrittenIdx(0);
        setWrittenCorrect(0);
        setWrittenWrong([]);
        setRoundSummary(null);
        setDone(false);
    }, [originalCards]);

    if (!originalCards.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Không có thẻ nào để học.</p>
                <button onClick={onBack} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Trở lại</button>
            </div>
        );
    }

    const phaseLabel = phase === 'mc' ? '🟦 Trắc nghiệm' : '✏️ Tự luận';
    const phaseDesc = phase === 'mc'
        ? `${currentIdx + 1} / ${queue.length}`
        : `${writtenIdx + 1} / ${writtenQueue.length}`;

    return (
        <div className="relative w-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-white/30 dark:border-slate-700/50">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100/60 dark:hover:bg-slate-800/60 text-gray-500 dark:text-gray-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="h-2 bg-gray-200/70 dark:bg-slate-700/70 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{phaseLabel}</span>
                        {!done && phase !== 'roundComplete' && (
                            <span className="text-xs text-gray-400 ml-1">{phaseDesc}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
                {done ? (
                    <SessionComplete
                        totalCards={originalCards.length}
                        onBack={onCompleteStudy || onBack}
                        onRestart={handleRestart}
                    />
                ) : phase === 'roundComplete' && roundSummary ? (
                    <RoundComplete
                        roundNum={round}
                        correct={roundSummary.correct}
                        total={roundSummary.total}
                        onNext={handleNextRound}
                    />
                ) : phase === 'mc' && currentCard ? (
                    <>
                        <div className="mb-4 flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">Vòng {round} · Trắc nghiệm</span>
                        </div>
                        <MCPhase
                            key={currentCard.id + '-mc-' + currentIdx}
                            card={currentCard}
                            allCards={allCards?.length > 1 ? allCards : originalCards}
                            onCorrect={handleMCCorrect}
                            onWrong={handleMCWrong}
                        />
                    </>
                ) : phase === 'written' && currentCard ? (
                    <>
                        <div className="mb-4 flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">Vòng {round} · Tự luận</span>
                        </div>
                        <WrittenPhase
                            key={currentCard.id + '-written-' + writtenIdx + '-r' + round}
                            card={currentCard}
                            onCorrect={handleWrittenCorrect}
                            onWrong={handleWrittenWrong}
                            onSaveCardAudio={onSaveCardAudio}
                        />
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default StudyScreen;
