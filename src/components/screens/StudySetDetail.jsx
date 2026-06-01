import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronDown, Edit2, PlayCircle, BookOpen, Layers, Search, Volume2, Trash2, Users, Check, Plus, Headphones, FileText, RotateCcw, Settings, Shuffle } from 'lucide-react';
import { shuffleArray } from '../../utils/textProcessing';
import FuriganaText from '../ui/FuriganaText';
import { playAudio, speakJapanese } from '../../utils/audio';
import { getSrsProgressText } from '../../utils/srs';

// Helper: derive human-readable SRS cycle stage from vocab SM-2 fields
const getSrsCycleLabel = (card) => {
    if (!card.srsEnabled) return null;
    const interval = card.srsInterval || 0;
    const reps = card.srsReps || 0;
    const learningStep = card.srsLearningStep;
    if (reps === 0 && (learningStep === undefined || learningStep === null)) return 'Mới';
    if (card.srsIsLapsed) return 'Học lại';
    if (typeof learningStep === 'number' && learningStep >= 0) {
        return learningStep === 0 ? '1 phút' : '10 phút';
    }
    if (interval < 1440) return `${Math.round(interval / 60)} giờ`;
    const days = Math.round(interval / 1440);
    if (days === 1) return '1 ngày';
    if (days < 30) return `${days} ngày`;
    return `${Math.round(days / 30)} tháng`;
};

const InlineEditCell = ({ value, onSave, className = '', isJapanese = false }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    const startEdit = () => { setDraft(value); setEditing(true); };
    const cancel = () => { setDraft(value); setEditing(false); };
    const save = () => { if (draft.trim() !== value.trim()) onSave(draft.trim()); setEditing(false); };
    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') cancel(); };

    if (editing) {
        return (
            <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={handleKeyDown}
                className={`w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg px-3 py-1.5 outline-none text-gray-900 dark:text-white ${isJapanese ? 'font-japanese' : ''} ${className}`}
            />
        );
    }

    return (
        <div
            onClick={startEdit}
            className={`cursor-pointer rounded-lg px-3 py-1.5 -mx-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 ${className}`}
            title="Bấm để sửa"
        >
            {isJapanese ? <FuriganaText text={value} forceHide={true} /> : value}
        </div>
    );
};

const getCardScaleStyles = (card, cardSettings) => {
    if (!card) return {};
    
    // Check if example display setting is enabled
    const hasFrontExample = !!(cardSettings?.front?.example && card.example);
    const hasBackExample = !!(cardSettings?.back?.example && card.example);
    const showExamples = hasFrontExample || hasBackExample;
    
    let wordSize = "text-3xl md:text-4xl";
    let titleSize = "text-xl";
    let meaningSize = "text-lg";
    let exampleBoxPadding = "p-4";
    let exampleItemGap = "space-y-3";
    let exampleTitleSize = "text-xs";
    let exampleTextSize = "text-sm";
    let exampleMeaningSize = "text-xs font-sans mt-0.5";
    let cardPadding = "p-6";
    
    // Only scale down if the user has enabled example display setting
    if (showExamples) {
        let textLength = card.example.length + (card.exampleMeaning?.length || 0) + card.back.length;
        const exampleLines = card.example.split('\n').filter(e => e.trim()).length;
        
        if (textLength > 240 || exampleLines >= 3) {
            wordSize = "text-[20px] md:text-[22px] leading-tight font-extrabold";
            titleSize = "text-sm font-extrabold";
            meaningSize = "text-xs px-4 py-2 rounded-xl mt-1.5 font-medium";
            exampleBoxPadding = "p-2";
            exampleItemGap = "space-y-1";
            exampleTitleSize = "text-[9px]";
            exampleTextSize = "text-[10px] leading-tight";
            exampleMeaningSize = "text-[9px] font-sans mt-0 leading-tight";
            cardPadding = "p-4 pb-12";
        } else if (textLength > 150 || exampleLines >= 2) {
            wordSize = "text-2xl leading-snug font-extrabold";
            titleSize = "text-base font-extrabold";
            meaningSize = "text-sm px-5 py-2.5 rounded-2xl mt-2 font-medium";
            exampleBoxPadding = "p-2.5";
            exampleItemGap = "space-y-1.5";
            exampleTitleSize = "text-[10px]";
            exampleTextSize = "text-[11.5px] leading-snug";
            exampleMeaningSize = "text-[10px] font-sans mt-0.5 leading-snug";
            cardPadding = "p-5 pb-12";
        } else {
            wordSize = "text-2xl md:text-3xl leading-normal font-extrabold";
            titleSize = "text-xl font-extrabold";
            meaningSize = "text-base px-5 py-2.5 rounded-2xl mt-2 font-medium";
            exampleBoxPadding = "p-3";
            exampleItemGap = "space-y-2";
            exampleTitleSize = "text-[11px]";
            exampleTextSize = "text-[12.5px] leading-normal";
            exampleMeaningSize = "text-[11px] font-sans mt-0.5";
            cardPadding = "p-6 pb-12";
        }
    }
    
    return {
        wordSize,
        titleSize,
        meaningSize,
        exampleBoxPadding,
        exampleItemGap,
        exampleTitleSize,
        exampleTextSize,
        exampleMeaningSize,
        cardPadding
    };
};

const StudySetDetail = ({
    folderId, folders, cardFolders, allCards,
    onBack, onEditSet, onStudySet, onFlashcardSet, onMeaningSet, onDictationSet, onExampleSet, onSynonymQuiz,
    onNavigateToAdd, onDeleteFolder, onSaveChanges, onSaveCardAudio,
    onDeleteCards, onToggleSrs
}) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [isAnimatingFlip, setIsAnimatingFlip] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Card Settings State (stored in localStorage with v2 version to apply new defaults)
    const [cardSettings, setCardSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('quizki_flashcard_settings_v2');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            front: {
                word: true,
                furigana: false,
                hanviet: false,
                example: false
            },
            back: {
                meaning: true,
                hanviet: true,
                synonym: false,
                example: false
            },
            swapSides: false
        };
    });

    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    // Card Shuffling State
    const [isShuffled, setIsShuffled] = useState(false);
    const [shuffledCards, setShuffledCards] = useState([]);

    useEffect(() => {
        localStorage.setItem('quizki_flashcard_settings_v2', JSON.stringify(cardSettings));
    }, [cardSettings]);

    const [visibleCount, setVisibleCount] = useState(30);
    const [searchQuery, setSearchQuery] = useState('');

    const [completedStates, setCompletedStates] = useState({
        flashcard: false,
        study: false,
        meaning_input: false,
        dictation: false,
        example: false,
        synonym: false
    });
    const [progressStates, setProgressStates] = useState({
        flashcard: false,
        study: false,
        meaning_input: false,
        dictation: false,
        example: false,
        synonym: false
    });
    const [showMasteryModal, setShowMasteryModal] = useState({
        isOpen: false,
        status: '',
        cards: []
    });
    const [selectedMasteryMode, setSelectedMasteryMode] = useState('flashcard');

    useEffect(() => {
        setCompletedStates({
            flashcard: localStorage.getItem(`study_completed_${folderId}_flashcard`) === 'true',
            study: localStorage.getItem(`study_completed_${folderId}_study`) === 'true',
            meaning_input: localStorage.getItem(`study_completed_${folderId}_meaning_input`) === 'true',
            dictation: localStorage.getItem(`study_completed_${folderId}_dictation`) === 'true',
            example: localStorage.getItem(`study_completed_${folderId}_example`) === 'true',
            synonym: localStorage.getItem(`study_completed_${folderId}_synonym`) === 'true'
        });
        setProgressStates({
            flashcard: !!localStorage.getItem(`study_progress_${folderId}_flashcard`),
            study: !!localStorage.getItem(`study_progress_${folderId}_study`),
            meaning_input: !!localStorage.getItem(`study_progress_${folderId}_meaning_input`),
            dictation: !!localStorage.getItem(`study_progress_${folderId}_dictation`),
            example: !!localStorage.getItem(`study_progress_${folderId}_example`),
            synonym: !!localStorage.getItem(`study_progress_${folderId}_synonym`)
        });
    }, [folderId]);

    const folder = useMemo(() => {
        if (folderId === 'unfiled') return { id: 'unfiled', name: 'Từ vựng lẻ', description: 'Các từ vựng chưa được phân loại vào học phần nào.' };
        return folders.find(f => f.id === folderId) || { name: 'Học phần không xác định' };
    }, [folderId, folders]);

    const setCards = useMemo(() => {
        if (folderId === 'unfiled') return allCards.filter(c => !cardFolders[c.id] || cardFolders[c.id] === 'unfiled');
        return allCards.filter(c => cardFolders[c.id] === folderId);
    }, [folderId, allCards, cardFolders]);

    const notLearnedCards = useMemo(() => setCards.filter(c => !c.masteryState || c.masteryState === 'not_learned'), [setCards]);
    const learningCards = useMemo(() => setCards.filter(c => c.masteryState === 'learning'), [setCards]);
    const memorizedCards = useMemo(() => setCards.filter(c => c.masteryState === 'memorized'), [setCards]);

    const masteryStats = useMemo(() => {
        const total = setCards.length || 1;
        return {
            notLearned: notLearnedCards.length,
            learning: learningCards.length,
            memorized: memorizedCards.length,
            notLearnedPct: Math.round((notLearnedCards.length / total) * 100),
            learningPct: Math.round((learningCards.length / total) * 100),
            memorizedPct: Math.round((memorizedCards.length / total) * 100),
        };
    }, [setCards, notLearnedCards, learningCards, memorizedCards]);

    const openMasteryTest = (status, cards) => {
        setShowMasteryModal({
            isOpen: true,
            status,
            cards
        });
    };

    const handleStartMasteryTest = () => {
        if (!showMasteryModal.cards || showMasteryModal.cards.length === 0) return;
        
        setShowMasteryModal(prev => ({ ...prev, isOpen: false }));

        if (selectedMasteryMode === 'flashcard') {
            onFlashcardSet(folderId, showMasteryModal.cards);
        } else if (selectedMasteryMode === 'study') {
            onStudySet(folderId, showMasteryModal.cards);
        } else if (selectedMasteryMode === 'meaning') {
            onMeaningSet(folderId, showMasteryModal.cards);
        } else if (selectedMasteryMode === 'dictation') {
            onDictationSet(folderId, showMasteryModal.cards);
        }
    };

    const filteredCards = useMemo(() => {
        if (!searchQuery.trim()) return setCards;
        const query = searchQuery.toLowerCase().trim();
        return setCards.filter(c => 
            (c.front || '').toLowerCase().includes(query) ||
            (c.back || '').toLowerCase().includes(query) ||
            (c.sinoVietnamese || '').toLowerCase().includes(query) ||
            (c.example || '').toLowerCase().includes(query)
        );
    }, [setCards, searchQuery]);

    const visibleCards = useMemo(() => {
        return filteredCards.slice(0, visibleCount);
    }, [filteredCards, visibleCount]);

    useEffect(() => {
        setVisibleCount(30);
    }, [folderId, searchQuery]);

    // Reset shuffle state when setCards changes
    useEffect(() => {
        setIsShuffled(false);
        setShuffledCards([]);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
    }, [setCards]);

    const activeCardsList = useMemo(() => {
        return isShuffled ? shuffledCards : setCards;
    }, [isShuffled, shuffledCards, setCards]);

    const activeCard = activeCardsList[currentCardIndex];

    const changeCard = (newIndex) => {
        if (isCardFlipped) {
            setIsAnimatingFlip(false);
            setIsCardFlipped(false);
            setCurrentCardIndex(newIndex);
            setTimeout(() => setIsAnimatingFlip(true), 50);
        } else {
            setCurrentCardIndex(newIndex);
        }
    };

    const nextCard = (e) => { e?.stopPropagation(); if (currentCardIndex < activeCardsList.length - 1) changeCard(currentCardIndex + 1); };
    const prevCard = (e) => { e?.stopPropagation(); if (currentCardIndex > 0) changeCard(currentCardIndex - 1); };

    const handleInlineSave = (card, field, newValue) => {
        if (!onSaveChanges) return;
        onSaveChanges({
            cardId: card.id,
            front: field === 'front' ? newValue : card.front,
            back: field === 'back' ? newValue : card.back,
            synonym: card.synonym || '', example: card.example || '',
            exampleMeaning: card.exampleMeaning || '', nuance: card.nuance || '',
            pos: card.pos || '', level: card.level || '',
            imageBase64: card.imageBase64,
            sinoVietnamese: card.sinoVietnamese || '',
            synonymSinoVietnamese: card.synonymSinoVietnamese || ''
        });
    };

    const handleDeleteFolder = () => { if (onDeleteFolder) onDeleteFolder(folderId); setShowDeleteConfirm(false); if (onBack) onBack(); };

    // Delete all unfiled cards permanently
    const handleDeleteUnfiledCards = () => {
        if (onDeleteCards) {
            onDeleteCards(setCards.map(c => c.id));
        }
        setShowDeleteConfirm(false);
    };

    return (
        <>
            <div className="w-full pb-20 min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 font-medium transition-colors">
                        <ChevronLeft className="w-5 h-5" /> Trở về Thư viện
                    </button>
                    <div className="flex items-center gap-4">
                        <button onClick={() => onEditSet && onEditSet(folderId)} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors text-sm font-medium">
                            <Plus className="w-4 h-4" /> Thêm từ vựng
                        </button>
                        {/* Folder delete — or unfiled bulk delete */}
                        {folderId === 'unfiled' ? (
                            onDeleteCards && setCards.length > 0 && (
                                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-sm">
                                    <Trash2 className="w-4 h-4" /> Xoá tất cả từ lẻ
                                </button>
                            )
                        ) : (
                            onDeleteFolder && (
                                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-sm">
                                    <Trash2 className="w-4 h-4" /> Xoá học phần
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8 space-y-10">
                {setCards.length > 0 ? (
                    <>
                        {(() => {
                            const scale = getCardScaleStyles(activeCard, cardSettings);

                            const renderFrontContent = () => {
                                if (!activeCard) return null;
                                return (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 w-full">
                                        {cardSettings.front.word && (
                                            <div className={`${scale.wordSize} font-bold text-slate-850 dark:text-white font-japanese select-none leading-relaxed`}>
                                                <FuriganaText text={activeCard.frontWithFurigana || activeCard.front || ''} forceHide={!cardSettings.front.furigana} />
                                            </div>
                                        )}
                                        {cardSettings.front.hanviet && activeCard.sinoVietnamese && (
                                            <p className="text-amber-600 dark:text-yellow-300 text-sm font-semibold">
                                                <span className="text-slate-450 dark:text-slate-400 font-normal">Hán Việt: </span>{activeCard.sinoVietnamese}
                                            </p>
                                        )}
                                        {cardSettings.front.example && activeCard.example && (
                                            <div className={`mt-3 ${scale.exampleItemGap} text-left w-full max-w-md mx-auto ${scale.exampleBoxPadding} bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl`}>
                                                {activeCard.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                                    const meaning = (activeCard.exampleMeaning || '').split('\n')[idx]?.trim();
                                                    return (
                                                        <div key={idx} className="border-l-2 border-indigo-500/30 pl-3">
                                                            <div className={`${scale.exampleTextSize} text-slate-700 dark:text-slate-350 font-japanese leading-relaxed`}>
                                                                <FuriganaText text={ex} />
                                                            </div>
                                                            {meaning && (
                                                                <p className={scale.exampleMeaningSize}>{meaning}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            };

                            const renderBackContent = () => {
                                if (!activeCard) return null;
                                return (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 w-full">
                                        {cardSettings.back.meaning && (
                                            <div className={`${scale.meaningSize} font-bold text-slate-850 dark:text-white leading-relaxed break-words max-w-full`}>{activeCard.back}</div>
                                        )}
                                        {cardSettings.back.hanviet && activeCard.sinoVietnamese && (
                                            <p className="text-amber-600 dark:text-yellow-300 text-base font-semibold">
                                                <span className="text-slate-450 dark:text-slate-400 font-normal">Hán Việt: </span>{activeCard.sinoVietnamese}
                                            </p>
                                        )}
                                        {cardSettings.back.synonym && activeCard.synonym && (
                                            <p className="text-sm text-slate-750 dark:text-slate-350 mt-2 font-bold">
                                                <span className="font-semibold text-slate-450 dark:text-slate-400">Đồng nghĩa: </span>
                                                <FuriganaText text={activeCard.synonym} className="font-japanese" />
                                            </p>
                                        )}
                                        {cardSettings.back.example && activeCard.example && (
                                            <div className={`mt-3 ${scale.exampleItemGap} text-left w-full max-w-md mx-auto ${scale.exampleBoxPadding} bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl`}>
                                                {activeCard.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                                    const meaning = (activeCard.exampleMeaning || '').split('\n')[idx]?.trim();
                                                    return (
                                                        <div key={idx} className="border-l-2 border-indigo-500/30 pl-3">
                                                            <div className={`${scale.exampleTextSize} text-slate-700 dark:text-slate-350 font-japanese leading-relaxed`}>
                                                                <FuriganaText text={ex} />
                                                            </div>
                                                            {meaning && (
                                                                <p className={scale.exampleMeaningSize}>{meaning}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            };

                            return (
                                <div className="w-full max-w-3xl mx-auto relative">
                                    <div className="perspective-1000 w-full" style={{ height: '380px' }}>
                                        <div
                                            onClick={() => {
                                                setIsAnimatingFlip(true);
                                                const nextFlippedState = !isCardFlipped;
                                                setIsCardFlipped(nextFlippedState);
                                                const isJapaneseSideVisible = !cardSettings.swapSides ? !nextFlippedState : nextFlippedState;
                                                if (isJapaneseSideVisible && activeCard) {
                                                    speakJapanese(activeCard.front, activeCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(activeCard.id, b64, vid) : null);
                                                }
                                            }}
                                            className={`relative w-full cursor-pointer transform-style-preserve-3d ${isAnimatingFlip ? 'transition-transform duration-500' : ''} ${isCardFlipped ? 'rotate-y-180' : ''}`}
                                            style={{ height: '380px' }}
                                        >
                                            {/* Front Side Card Layout */}
                                            <div className={`absolute inset-0 backface-hidden bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none flex flex-col items-center overflow-hidden ${scale.cardPadding || 'p-6'} text-center`}>
                                                <div className="flex flex-col items-center justify-center min-h-full w-full py-4 pb-14 relative">
                                                    {!cardSettings.swapSides ? renderFrontContent() : renderBackContent()}
                                                </div>

                                                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                                                    <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full text-xs font-semibold shadow-sm tracking-wide">
                                                        Nhấn để lật thẻ
                                                    </span>
                                                </div>

                                                {/* Settings Button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                                                    className="absolute bottom-4 right-4 p-2.5 bg-slate-100/80 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-355 rounded-full transition-all hover:scale-110 z-30 shadow-md border border-gray-200 dark:border-slate-700"
                                                    title="Cấu hình hiển thị"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Back Side Card Layout */}
                                            <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none flex flex-col items-center overflow-hidden ${scale.cardPadding || 'p-6'} text-center`}>
                                                <div className="flex flex-col items-center justify-center min-h-full w-full py-4 pb-14 relative">
                                                    {!cardSettings.swapSides ? renderBackContent() : renderFrontContent()}
                                                </div>

                                                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                                                    <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full text-xs font-semibold shadow-sm tracking-wide">
                                                        Nhấn để lật thẻ
                                                    </span>
                                                </div>

                                                {/* Settings Button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                                                    className="absolute bottom-4 right-4 p-2.5 bg-slate-100/80 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-355 rounded-full transition-all hover:scale-110 z-30 shadow-md border border-gray-200 dark:border-slate-700"
                                                    title="Cấu hình hiển thị"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Navigation */}
                                    <div className="flex items-center justify-center gap-6 mt-5">
                                        <button onClick={prevCard} disabled={currentCardIndex === 0} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow border border-gray-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                        </button>
                                        
                                        <span className="text-sm font-bold text-gray-400 tracking-widest">{currentCardIndex + 1} / {activeCardsList.length}</span>
                                        
                                        <button onClick={nextCard} disabled={currentCardIndex === activeCardsList.length - 1} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow border border-gray-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                        </button>

                                        {/* Shuffle Button */}
                                        <button
                                            onClick={() => {
                                                if (isShuffled) {
                                                    setIsShuffled(false);
                                                    const originalIndex = setCards.findIndex(c => c.id === activeCard?.id);
                                                    setCurrentCardIndex(originalIndex !== -1 ? originalIndex : 0);
                                                } else {
                                                    const shuffled = shuffleArray([...setCards]);
                                                    setShuffledCards(shuffled);
                                                    setIsShuffled(true);
                                                    setCurrentCardIndex(0);
                                                }
                                                setIsCardFlipped(false);
                                            }}
                                            className={`w-10 h-10 rounded-full shadow border flex items-center justify-center transition-all hover:scale-105 ${
                                                isShuffled
                                                    ? 'bg-indigo-650 border-indigo-650 text-white hover:bg-indigo-700'
                                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                            }`}
                                            title={isShuffled ? "Tắt trộn thẻ" : "Trộn thẻ"}
                                        >
                                            <Shuffle className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                        {/* Bảng trạng thái ghi nhớ (Mastery Status) */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-200 dark:border-slate-700/80 shadow-sm space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Trạng thái từ vựng</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Theo dõi mức độ ghi nhớ của các từ vựng trong học phần này</p>
                                </div>
                                {/* Consolidated multi-segment progress bar */}
                                <div className="flex-1 max-w-md bg-gray-100 dark:bg-gray-700 h-4 rounded-full overflow-hidden flex shadow-inner">
                                    <div 
                                        style={{ width: `${masteryStats.memorizedPct}%` }} 
                                        className="h-full bg-emerald-500 transition-all duration-500" 
                                        title={`Đã nhớ: ${masteryStats.memorizedPct}%`}
                                    />
                                    <div 
                                        style={{ width: `${masteryStats.learningPct}%` }} 
                                        className="h-full bg-amber-500 transition-all duration-500" 
                                        title={`Đang học: ${masteryStats.learningPct}%`}
                                    />
                                    <div 
                                        style={{ width: `${masteryStats.notLearnedPct}%` }} 
                                        className="h-full bg-slate-450 dark:bg-slate-650 transition-all duration-500" 
                                        title={`Chưa học: ${masteryStats.notLearnedPct}%`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Chưa học */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-650" />
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Chưa học</span>
                                        </div>
                                        <p className="text-2xl font-black text-slate-700 dark:text-slate-350 mt-1">
                                            {masteryStats.notLearned} <span className="text-xs font-normal text-gray-400">từ</span>
                                        </p>
                                    </div>
                                    <button 
                                        disabled={masteryStats.notLearned === 0}
                                        onClick={() => openMasteryTest('not_learned', notLearnedCards)}
                                        className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
                                        title="Kiểm tra lại nhóm từ Chưa học"
                                    >
                                        <PlayCircle className="w-5 h-5 text-indigo-500" />
                                    </button>
                                </div>

                                {/* Đang học */}
                                <div className="p-4 bg-amber-50/20 dark:bg-amber-950/10 rounded-2xl border border-amber-100/60 dark:border-amber-900/20 flex items-center justify-between shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Đang học</span>
                                        </div>
                                        <p className="text-2xl font-black text-amber-605 dark:text-amber-450 mt-1">
                                            {masteryStats.learning} <span className="text-xs font-normal text-gray-400">từ</span>
                                        </p>
                                    </div>
                                    <button 
                                        disabled={masteryStats.learning === 0}
                                        onClick={() => openMasteryTest('learning', learningCards)}
                                        className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow border border-amber-250/30 dark:border-amber-900/30 hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
                                        title="Kiểm tra lại nhóm từ Đang học"
                                    >
                                        <PlayCircle className="w-5 h-5 text-amber-500" />
                                    </button>
                                </div>

                                {/* Đã nhớ */}
                                <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/20 flex items-center justify-between shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Đã nhớ</span>
                                        </div>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1">
                                            {masteryStats.memorized} <span className="text-xs font-normal text-gray-400">từ</span>
                                        </p>
                                    </div>
                                    <button 
                                        disabled={masteryStats.memorized === 0}
                                        onClick={() => openMasteryTest('memorized', memorizedCards)}
                                        className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow border border-emerald-250/30 dark:border-emerald-900/30 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
                                        title="Kiểm tra lại nhóm từ Đã nhớ"
                                    >
                                        <PlayCircle className="w-5 h-5 text-emerald-500" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {/* Chế độ 1: Thẻ ghi nhớ */}
                            {completedStates.flashcard ? (
                                <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-green-500/20 dark:border-green-500/10 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-2 opacity-55"><Layers className="w-5 h-5 text-green-500" /></div>
                                    <span className="font-bold text-sm text-gray-400 dark:text-gray-500 text-center">Thẻ ghi nhớ</span>
                                    <span className="text-[11px] text-green-650 dark:text-green-400 mt-0.5 font-semibold text-center">Đã hoàn thành</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            localStorage.removeItem(`study_completed_${folderId}_flashcard`);
                                            localStorage.removeItem(`study_progress_${folderId}_flashcard`);
                                            setCompletedStates(prev => ({ ...prev, flashcard: false }));
                                        }}
                                        className="mt-3 text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 flex items-center gap-1 font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Làm lại
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => onFlashcardSet(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-600 shadow-sm hover:shadow-lg transition-all group relative">
                                    {progressStates.flashcard && (
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-blue-500 text-[9px] text-white font-bold uppercase tracking-wider animate-pulse">
                                            Học dở
                                        </div>
                                    )}
                                    <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Layers className="w-5 h-5 text-blue-500" /></div>
                                    <span className="font-bold text-sm text-gray-800 dark:text-white text-center">Thẻ ghi nhớ</span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 text-center">Lướt thẻ nhanh</span>
                                </button>
                            )}

                            {/* Chế độ 2: Học tập */}
                            {completedStates.study ? (
                                <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-green-500/20 dark:border-green-500/10 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-2 opacity-55"><BookOpen className="w-5 h-5 text-green-500" /></div>
                                    <span className="font-bold text-sm text-gray-400 dark:text-gray-500 text-center">Học tập</span>
                                    <span className="text-[11px] text-green-650 dark:text-green-400 mt-0.5 font-semibold text-center">Đã hoàn thành</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            localStorage.removeItem(`study_completed_${folderId}_study`);
                                            localStorage.removeItem(`study_progress_${folderId}_study`);
                                            setCompletedStates(prev => ({ ...prev, study: false }));
                                        }}
                                        className="mt-3 text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 flex items-center gap-1 font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Làm lại
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => onStudySet(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm hover:shadow-lg transition-all group relative">
                                    {progressStates.study && (
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-500 text-[9px] text-white font-bold uppercase tracking-wider animate-pulse">
                                            Học dở
                                        </div>
                                    )}
                                    <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><BookOpen className="w-5 h-5 text-emerald-500" /></div>
                                    <span className="font-bold text-sm text-gray-800 dark:text-white text-center">Học tập</span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 text-center">Trắc nghiệm + Tự luận</span>
                                </button>
                            )}

                            {/* Chế độ 3: Nhập ý nghĩa */}
                            {completedStates.meaning_input ? (
                                <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-green-500/20 dark:border-green-500/10 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-2 opacity-55"><Edit2 className="w-5 h-5 text-green-500" /></div>
                                    <span className="font-bold text-sm text-gray-400 dark:text-gray-500 text-center">Nhập ý nghĩa</span>
                                    <span className="text-[11px] text-green-650 dark:text-green-400 mt-0.5 font-semibold text-center">Đã hoàn thành</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            localStorage.removeItem(`study_completed_${folderId}_meaning_input`);
                                            localStorage.removeItem(`study_progress_${folderId}_meaning_input`);
                                            setCompletedStates(prev => ({ ...prev, meaning_input: false }));
                                        }}
                                        className="mt-3 text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 flex items-center gap-1 font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Làm lại
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => onMeaningSet(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-pink-400 dark:hover:border-pink-600 shadow-sm hover:shadow-lg transition-all group relative">
                                    {progressStates.meaning_input && (
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-pink-500 text-[9px] text-white font-bold uppercase tracking-wider animate-pulse">
                                            Học dở
                                        </div>
                                    )}
                                    <div className="w-11 h-11 rounded-full bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Edit2 className="w-5 h-5 text-pink-500" /></div>
                                    <span className="font-bold text-sm text-gray-800 dark:text-white text-center">Nhập ý nghĩa</span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 text-center">Tự luận dịch nghĩa</span>
                                </button>
                            )}

                            {/* Chế độ 4: Nghe Chép */}
                            {completedStates.dictation ? (
                                <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-green-500/20 dark:border-green-500/10 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-2 opacity-55"><Headphones className="w-5 h-5 text-green-500" /></div>
                                    <span className="font-bold text-sm text-gray-400 dark:text-gray-500 text-center">Nghe Chép</span>
                                    <span className="text-[11px] text-green-650 dark:text-green-400 mt-0.5 font-semibold text-center">Đã hoàn thành</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            localStorage.removeItem(`study_completed_${folderId}_dictation`);
                                            localStorage.removeItem(`study_progress_${folderId}_dictation`);
                                            setCompletedStates(prev => ({ ...prev, dictation: false }));
                                        }}
                                        className="mt-3 text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 flex items-center gap-1 font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Làm lại
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => onDictationSet(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm hover:shadow-lg transition-all group relative">
                                    {progressStates.dictation && (
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-500 text-[9px] text-white font-bold uppercase tracking-wider animate-pulse">
                                            Học dở
                                        </div>
                                    )}
                                    <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Headphones className="w-5 h-5 text-indigo-500" /></div>
                                    <span className="font-bold text-sm text-gray-800 dark:text-white text-center">Nghe Chép</span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 text-center">Nghe và viết lại</span>
                                </button>
                            )}

                            {/* Chế độ 5: Câu ví dụ */}
                            {completedStates.example ? (
                                <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-green-500/20 dark:border-green-500/10 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-2 opacity-55"><FileText className="w-5 h-5 text-green-500" /></div>
                                    <span className="font-bold text-sm text-gray-400 dark:text-gray-500 text-center">Câu ví dụ</span>
                                    <span className="text-[11px] text-green-650 dark:text-green-400 mt-0.5 font-semibold text-center">Đã hoàn thành</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            localStorage.removeItem(`study_completed_${folderId}_example`);
                                            localStorage.removeItem(`study_progress_${folderId}_example`);
                                            setCompletedStates(prev => ({ ...prev, example: false }));
                                        }}
                                        className="mt-3 text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 flex items-center gap-1 font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Làm lại
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => onExampleSet(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-amber-400 dark:hover:border-amber-600 shadow-sm hover:shadow-lg transition-all group relative">
                                    {progressStates.example && (
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-[9px] text-white font-bold uppercase tracking-wider animate-pulse">
                                            Học dở
                                        </div>
                                    )}
                                    <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><FileText className="w-5 h-5 text-amber-500" /></div>
                                    <span className="font-bold text-sm text-gray-800 dark:text-white text-center">Câu ví dụ</span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 text-center">Điền từ vào câu</span>
                                </button>
                            )}

                            {/* Chế độ 6: Đồng nghĩa */}
                            {completedStates.synonym ? (
                                <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-green-500/20 dark:border-green-500/10 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-2 opacity-55"><Users className="w-5 h-5 text-green-500" /></div>
                                    <span className="font-bold text-sm text-gray-400 dark:text-gray-500 text-center">Đồng nghĩa</span>
                                    <span className="text-[11px] text-green-650 dark:text-green-400 mt-0.5 font-semibold text-center">Đã hoàn thành</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            localStorage.removeItem(`study_completed_${folderId}_synonym`);
                                            localStorage.removeItem(`study_progress_${folderId}_synonym`);
                                            setCompletedStates(prev => ({ ...prev, synonym: false }));
                                        }}
                                        className="mt-3 text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 flex items-center gap-1 font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Làm lại
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => onSynonymQuiz && onSynonymQuiz(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-purple-400 dark:hover:border-purple-600 shadow-sm hover:shadow-lg transition-all group relative">
                                    {progressStates.synonym && (
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-purple-500 text-[9px] text-white font-bold uppercase tracking-wider animate-pulse">
                                            Học dở
                                        </div>
                                    )}
                                    <div className="w-11 h-11 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Users className="w-5 h-5 text-purple-500" /></div>
                                    <span className="font-bold text-sm text-gray-800 dark:text-white text-center">Đồng nghĩa</span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 text-center">Trắc nghiệm đồng nghĩa</span>
                                </button>
                            )}
                        </div>

                        {/* Term List - Inline Editable */}
                        <div className="pt-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Thuật ngữ ({filteredCards.length} / {setCards.length})
                                    </h2>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">Bấm vào từ để sửa trực tiếp</p>
                                </div>

                                {setCards.length > 5 && (
                                    <div className="relative w-full md:w-72">
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm từ vựng..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-850 dark:text-white transition-all shadow-sm"
                                        />
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {filteredCards.length === 0 && searchQuery ? (
                                <div className="text-center py-12 bg-white dark:bg-gray-850 rounded-2xl border border-gray-150 dark:border-gray-700">
                                    <Search className="w-12 h-12 text-gray-300 dark:text-gray-650 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">Không tìm thấy từ vựng nào khớp với "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {visibleCards.map(card => (
                                        <div key={card.id} className="flex flex-col bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-3">
                                            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch">
                                                <div className="flex-1 md:w-1/2 flex flex-col justify-center md:border-r border-gray-100 dark:border-gray-700 md:pr-6">
                                                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                                                        <InlineEditCell
                                                            value={card.frontWithFurigana || card.front}
                                                            isJapanese={true}
                                                            onSave={(v) => handleInlineSave(card, 'front', v)}
                                                            className="text-lg font-bold"
                                                        />
                                                    </div>
                                                    {card.sinoVietnamese && (
                                                        <div className="text-yellow-600 dark:text-yellow-500 text-sm mt-1 font-medium">
                                                            <InlineEditCell
                                                                value={card.sinoVietnamese}
                                                                onSave={(v) => handleInlineSave(card, 'sinoVietnamese', v)}
                                                                className="text-sm font-medium inline-block"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 md:w-1/2 flex items-center justify-between gap-4">
                                                    <div className="flex-1 flex flex-col justify-center text-lg text-gray-800 dark:text-gray-200">
                                                        <InlineEditCell
                                                            value={card.back}
                                                            onSave={(v) => handleInlineSave(card, 'back', v)}
                                                            className="text-lg"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {card.imageBase64 && (
                                                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 dark:border-gray-700">
                                                                <img src={card.imageBase64} alt={card.front} className="w-full h-full object-cover" />
                                                            </div>
                                                        )}
                                                        {card.audioBase64 && (
                                                            <button onClick={() => playAudio(card.audioBase64)} className="p-2.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors flex-shrink-0">
                                                                <Volume2 className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Example sentence row */}
                                            {(card.example || card.exampleMeaning) && (
                                                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl px-4 py-2.5 space-y-2">
                                                    {card.example ? (
                                                        card.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                                            const meaning = (card.exampleMeaning || '').split('\n')[idx]?.trim();
                                                            return (
                                                                <div key={idx} className="border-l border-indigo-500/20 pl-2">
                                                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-japanese leading-relaxed">
                                                                        <FuriganaText text={ex} />
                                                                    </p>
                                                                    {meaning && (
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-sans">{meaning}</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        card.exampleMeaning && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{card.exampleMeaning}</p>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            {/* SRS Toggle Footer */}
                                            <div className="border-t border-gray-100 dark:border-gray-700/60 pt-3 flex justify-between items-center">
                                                {card.srsEnabled ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                            Ngắt quãng · {getSrsCycleLabel(card)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                                        Ôn tập ngắt quãng
                                                    </span>
                                                )}
                                                {/* Toggle switch */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggleSrs && onToggleSrs(card.id, !card.srsEnabled); }}
                                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${card.srsEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                                                    role="switch"
                                                    aria-checked={!!card.srsEnabled}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${card.srsEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {filteredCards.length > visibleCount && (
                                <div className="text-center pt-6">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 30)}
                                        className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer inline-flex items-center gap-2 text-sm"
                                    >
                                        Xem thêm từ vựng ({filteredCards.length - visibleCount} từ ẩn)
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700">
                        <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Học phần này trống</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Chưa có từ vựng nào trong học phần này.</p>
                        <button onClick={folderId !== 'unfiled' ? () => onEditSet(folderId) : onNavigateToAdd} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-indigo-700 transition-colors">
                            <Plus className="w-5 h-5" /> {folderId !== 'unfiled' ? 'Thêm từ vựng ngay' : 'Tạo học phần mới'}
                        </button>
                    </div>
                )}
            </div>
            </div>

            {/* Mastery Test Selection Modal */}
            {showMasteryModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowMasteryModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-6 border border-gray-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="font-extrabold text-xl text-gray-905 dark:text-white">
                                Chọn chế độ ôn tập
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Ôn tập {showMasteryModal.cards.length} từ ở trạng thái <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                    {showMasteryModal.status === 'not_learned' ? 'Chưa học' : showMasteryModal.status === 'learning' ? 'Đang học' : 'Đã nhớ'}
                                </span>
                            </p>
                        </div>

                        {/* List of 4 study modes */}
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setSelectedMasteryMode('flashcard')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'flashcard' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-605 dark:text-indigo-400' : 'border-gray-205 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-650 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Layers className="w-6 h-6" />
                                <span className="font-bold text-xs">Thẻ ghi nhớ</span>
                            </button>

                            <button 
                                onClick={() => setSelectedMasteryMode('study')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'study' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-605 dark:text-indigo-400' : 'border-gray-205 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-650 text-gray-700 dark:text-gray-300'}`}
                            >
                                <BookOpen className="w-6 h-6" />
                                <span className="font-bold text-xs">Học tập</span>
                            </button>

                            <button 
                                onClick={() => setSelectedMasteryMode('meaning')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'meaning' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-605 dark:text-indigo-400' : 'border-gray-205 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-650 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Edit2 className="w-6 h-6" />
                                <span className="font-bold text-xs">Nhập ý nghĩa</span>
                            </button>

                            <button 
                                onClick={() => setSelectedMasteryMode('dictation')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'dictation' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400' : 'border-gray-205 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-650 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Headphones className="w-6 h-6" />
                                <span className="font-bold text-xs">Nghe Chép</span>
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setShowMasteryModal(prev => ({ ...prev, isOpen: false }))} 
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-750 text-gray-750 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-650 transition-colors text-sm cursor-pointer"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={handleStartMasteryTest}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md cursor-pointer"
                            >
                                Bắt đầu ôn
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-500" /></div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                                    {folderId === 'unfiled' ? 'Xoá tất cả từ vựng lẻ' : 'Xoá học phần'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Không thể hoàn tác.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                            {folderId === 'unfiled'
                                ? <>Xoá vĩnh viễn <strong className="text-red-500">{setCards.length} từ vựng lẻ</strong>? Thao tác này không thể hoàn tác.</>
                                : <>Xoá <strong>"{folder.name}"</strong>? Từ vựng sẽ thành từ lẻ.</>
                            }
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Huỷ</button>
                            <button
                                onClick={folderId === 'unfiled' ? handleDeleteUnfiledCards : handleDeleteFolder}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
                            >Xoá</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Flashcard Settings Modal */}
            {showSettingsMenu && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsMenu(false)}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                        <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">Cấu hình thẻ ghi nhớ</h4>
                        <div className="space-y-4 text-xs font-semibold text-slate-750 dark:text-slate-350">
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Đổi mặt trước/mặt sau</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.swapSides} onChange={(e) => setCardSettings(prev => ({ ...prev, swapSides: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt tiếng Nhật hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.word} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Chữ Hán / Từ vựng</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.furigana} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, furigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Phiên âm Furigana</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.example} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt nghĩa dịch hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.meaning} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Nghĩa tiếng Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonym} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Đồng nghĩa</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.example} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                </div>
                            </div>
                        </div>
                        <div className="pt-3">
                            <button onClick={() => setShowSettingsMenu(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </>
    );
};

export default StudySetDetail;
