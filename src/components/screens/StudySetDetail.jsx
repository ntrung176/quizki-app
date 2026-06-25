import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit, Edit2, PlayCircle, BookOpen, Layers, Search, Volume2, Trash2, Users, Check, Plus, Headphones, FileText, RotateCcw, Settings, Shuffle } from 'lucide-react';
import { shuffleArray } from '../../utils/textProcessing';
import FuriganaText from '../ui/FuriganaText';
import Flashcard from '../ui/Flashcard';
import { playAudio, speakJapanese } from '../../utils/audio';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { syncStudyProgress, resetStudyProgress } from '../../utils/studyProgressService';
import { logKanjiActivity } from '../../utils/kanjiHistory';
import { showToast } from '../../utils/toast';
import { fetchJotobaWordData, accentNumberToPitchParts } from '../../utils/pitchAccent';
import { getSharedKanjiList } from '../../utils/kanjiService';
import EditCardModal from '../cards/EditCardModal';

const parseWordAndReading = (text) => {
    if (!text) return { word: '', reading: '' };
    const match = text.match(/^([^\s（\(\[）\)\]]+)[（\(\[]([\u3040-\u309F\u30A0-\u30FF\s]+)[）\)\]]$/);
    if (match) {
        return {
            word: match[1].trim(),
            reading: match[2].trim()
        };
    }
    const word = text.replace(/\s*[（(][^）)]*[）)]/g, '').trim();
    const parenMatch = text.match(/[（(]([^）)]+)[）)]/);
    const reading = parenMatch ? parenMatch[1].trim() : '';
    return { word, reading };
};

const hasKanji = (str) => /[\u4e00-\u9faf]/.test(str);

// Helper: derive human-readable SRS cycle stage from vocab SM-2 fields
const getSrsCycleLabel = (card) => {
    if (!card.srsEnabled) return null;
    const state = card.srsState || (card.srsReps === 0 && card.srsLearningStep === null ? 'NEW' : (card.srsIsLapsed ? 'RELEARNING' : (card.srsLearningStep !== null ? 'LEARNING' : 'REVIEW')));

    if (state === 'NEW') return 'Mới';
    if (state === 'RELEARNING') return 'Học lại';
    if (state === 'LEARNING') {
        return card.srsLearningStep === 0 ? '1 phút' : '10 phút';
    }

    // REVIEW state - interval is in days
    const days = card.srsInterval || 1;
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
                onClick={(e) => e.stopPropagation()}
                className={`w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg px-3 py-1.5 outline-none text-gray-900 dark:text-white ${isJapanese ? 'font-japanese' : ''} ${className}`}
            />
        );
    }

    return (
        <div
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
            className={`cursor-pointer rounded-lg px-3 py-1.5 -mx-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 ${className}`}
            title="Bấm để sửa"
        >
            {isJapanese ? <FuriganaText text={value} forceHide={true} /> : value}
        </div>
    );
};

const FlashcardPlayerSection = ({
    setCards,
    cardSettings,
    setShowSettingsMenu,
    onSaveCardAudio
}) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [isAnimatingFlip, setIsAnimatingFlip] = useState(true);
    const [slideDirection, setSlideDirection] = useState('');
    const [isShuffled, setIsShuffled] = useState(false);
    const [shuffledCards, setShuffledCards] = useState([]);

    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        if (!touchStart) return;
        const currentTouch = e.targetTouches[0].clientX;
        setTouchEnd(currentTouch);
        const diff = currentTouch - touchStart;
        const maxOffset = 200;
        setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, diff)));
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) {
            setTouchStart(null);
            setTouchEnd(null);
            setSwipeOffset(0);
            return;
        }

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentCardIndex < activeCardsList.length - 1) {
            changeCard(currentCardIndex + 1, 'left');
        } else if (isRightSwipe && currentCardIndex > 0) {
            changeCard(currentCardIndex - 1, 'right');
        }

        setTouchStart(null);
        setTouchEnd(null);
        setSwipeOffset(0);
    };

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

    // Preload adjacent cards' base64 images for seamless transitions
    useEffect(() => {
        if (!activeCardsList || activeCardsList.length === 0) return;
        const indicesToPreload = [currentCardIndex - 1, currentCardIndex + 1, currentCardIndex + 2];
        indicesToPreload.forEach(idx => {
            if (idx >= 0 && idx < activeCardsList.length) {
                const card = activeCardsList[idx];
                if (card && card.imageBase64) {
                    const img = new Image();
                    img.src = card.imageBase64;
                    if (typeof img.decode === 'function') {
                        img.decode().catch(() => {});
                    }
                }
            }
        });
    }, [currentCardIndex, activeCardsList]);

    const changeCard = (newIndex, direction = '') => {
        if (direction) {
            setIsAnimatingFlip(false);
            setSlideDirection(direction);
            setTimeout(() => {
                setIsCardFlipped(false);
                setCurrentCardIndex(newIndex);
                const oppositeDirection = direction === 'left' ? 'right' : 'left';
                setSlideDirection(oppositeDirection);
                setTouchStart(null);
                setTouchEnd(null);
                setSwipeOffset(0);
                setTimeout(() => {
                    setSlideDirection('');
                    setTimeout(() => {
                        setIsAnimatingFlip(true);
                    }, 110);
                }, 20);
            }, 70);
        } else {
            if (isCardFlipped) {
                setIsAnimatingFlip(false);
                setIsCardFlipped(false);
                setTimeout(() => {
                    setCurrentCardIndex(newIndex);
                    setIsAnimatingFlip(true);
                }, 250);
            } else {
                setCurrentCardIndex(newIndex);
            }
        }
    };

    const nextCard = (e) => { e?.stopPropagation(); if (currentCardIndex < activeCardsList.length - 1) changeCard(currentCardIndex + 1, 'left'); };
    const prevCard = (e) => { e?.stopPropagation(); if (currentCardIndex > 0) changeCard(currentCardIndex - 1, 'right'); };

    if (!setCards || setCards.length === 0) return null;

    return (
        <div className="w-full max-w-3xl mx-auto relative">
            <div
                className={`w-full relative card-slide ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{
                    width: '100%',
                    height: '460px',
                    transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                    transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.12s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.12s ease' : 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'),
                    touchAction: 'pan-y',
                }}
            >
                <Flashcard
                    card={activeCard}
                    cardSettings={cardSettings}
                    isFlipped={isCardFlipped}
                    onFlip={() => {
                        setIsAnimatingFlip(true);
                        const nextFlippedState = !isCardFlipped;
                        setIsCardFlipped(nextFlippedState);
                        if (activeCard && cardSettings.autoPlayAudio && cardSettings.audioEnabled !== false) {
                            if (nextFlippedState) {
                                speakJapanese(activeCard.front, activeCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(activeCard.id, b64, vid) : null);
                            }
                        }
                    }}
                    onSaveCardAudio={onSaveCardAudio}
                    transitionEnabled={isAnimatingFlip}
                />
            </div>

            {/* Speaker Button - OUTSIDE the flipping container */}
            {cardSettings.audioEnabled !== false && activeCard && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        speakJapanese(activeCard.front, activeCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(activeCard.id, b64, vid) : null);
                    }}
                    className="absolute top-6 right-18 p-2.5 bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/90 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-110 active:scale-95 z-30 shadow-md border border-slate-200 dark:border-slate-700"
                    title="Phát âm"
                >
                    <Volume2 className="w-4 h-4" />
                </button>
            )}

            {/* Settings Button - OUTSIDE the flipping container */}
            <button
                onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                className="absolute top-6 right-6 p-2.5 bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/90 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-110 active:scale-95 z-30 shadow-md border border-slate-200 dark:border-slate-700"
                title="Cấu hình hiển thị"
            >
                <Settings className="w-4 h-4" />
            </button>

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
                    className={`w-10 h-10 rounded-full shadow border flex items-center justify-center transition-all hover:scale-105 ${isShuffled
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
};

const StudySetDetail = ({
    folderId, folders, cardFolders, allCards,
    onBack, onEditSet, onStudySet, onFlashcardSet, onMeaningSet, onDictationSet, onExampleSet, onSynonymQuiz,
    onNavigateToAdd, onDeleteFolder, onSaveChanges, onSaveCardAudio,
    onDeleteCards, onDeleteCard, onToggleSrs, onGeminiAssist
}) => {
    const [expandedCardIds, setExpandedCardIds] = useState(new Set());
    const [isAddingKanji, setIsAddingKanji] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [cardToDelete, setCardToDelete] = useState(null);

    const handleAddKanjiToSrs = async () => {
        if (isAddingKanji) return;
        
        const userId = getAuth().currentUser?.uid;
        if (!userId) {
            showToast('Bạn cần đăng nhập để sử dụng tính năng này!', 'error');
            return;
        }

        setIsAddingKanji(true);
        try {
            // 1. Extract all Kanji characters from card.front
            const kanjiChars = new Set();
            setCards.forEach(card => {
                const matches = card.front?.match(/[\u4e00-\u9faf]/g) || [];
                matches.forEach(char => kanjiChars.add(char));
            });

            if (kanjiChars.size === 0) {
                showToast('Học phần này không chứa chữ Kanji nào!', 'warning');
                setIsAddingKanji(false);
                return;
            }

            // 2. Fetch all Kanji in the Firestore 'kanji' collection
            const kanjiList = await getSharedKanjiList();
            const allKanji = kanjiList.map(k => ({ id: k.id, character: k.character }));

            // Map character to doc ID
            const kanjiIdMap = {};
            allKanji.forEach(k => {
                if (k.character) {
                    kanjiIdMap[k.character] = k.id;
                }
            });

            // Find matching Kanji documents
            const matchingKanji = [];
            kanjiChars.forEach(char => {
                if (kanjiIdMap[char]) {
                    matchingKanji.push({ id: kanjiIdMap[char], character: char });
                }
            });

            if (matchingKanji.length === 0) {
                showToast('Không tìm thấy chữ Kanji tương ứng trong hệ thống để thêm!', 'warning');
                setIsAddingKanji(false);
                return;
            }

            // 3. Fetch user's existing kanjiSRS
            const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
            const existingKanjiIds = new Set(srsSnap.docs.map(doc => doc.id));

            // Filter out already added ones
            const newKanjiToInitialize = matchingKanji.filter(k => !existingKanjiIds.has(k.id));

            if (newKanjiToInitialize.length === 0) {
                showToast('Tất cả Kanji trong học phần này đã có trong danh sách học của bạn rồi!', 'info');
                setIsAddingKanji(false);
                return;
            }

            // Open preview modal instead of writing immediately
            setKanjiPreviewModal({
                isOpen: true,
                newKanji: newKanjiToInitialize,
                selectedIds: new Set(newKanjiToInitialize.map(k => k.id)),
                allExtractedCount: matchingKanji.length,
                existingCount: matchingKanji.length - newKanjiToInitialize.length
            });
        } catch (e) {
            console.error('Error preparing Kanji:', e);
            showToast('Đã xảy ra lỗi khi chuẩn bị danh sách Kanji: ' + e.message, 'error');
        } finally {
            setIsAddingKanji(false);
        }
    };

    const handleConfirmAddKanji = async () => {
        const userId = getAuth().currentUser?.uid;
        if (!userId || kanjiPreviewModal.selectedIds.size === 0) return;

        setIsAddingKanji(true);
        try {
            const now = Date.now();
            const batch = writeBatch(db);
            
            // Only write selected Kanji
            const selectedKanji = kanjiPreviewModal.newKanji.filter(k => kanjiPreviewModal.selectedIds.has(k.id));
            
            selectedKanji.forEach(k => {
                const ref = doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, k.id);
                batch.set(ref, {
                    interval: 0,
                    ease: 2.5,
                    nextReview: now,
                    lastReview: now,
                    reps: 0,
                    learningStep: null,
                    isLapsed: false,
                    lapseCount: 0,
                    prelapseInterval: null,
                }, { merge: true });
            });
            await batch.commit();

            // Log activity
            await logKanjiActivity(userId, {
                type: 'save',
                title: `Thêm ${selectedKanji.length} Kanji từ học phần`,
                details: `Thêm từ học phần: ${folder.name || 'Từ vựng lẻ'}`
            });

            showToast(`Đã thêm thành công ${selectedKanji.length} chữ Kanji mới vào danh sách học!`, 'success');
            setKanjiPreviewModal(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
            console.error('Error adding Kanji to SRS:', e);
            showToast('Đã xảy ra lỗi khi thêm Kanji vào danh sách: ' + e.message, 'error');
        } finally {
            setIsAddingKanji(false);
        }
    };

    const togglePreviewKanjiSelect = (id) => {
        setKanjiPreviewModal(prev => {
            const nextSelected = new Set(prev.selectedIds);
            if (nextSelected.has(id)) {
                nextSelected.delete(id);
            } else {
                nextSelected.add(id);
            }
            return { ...prev, selectedIds: nextSelected };
        });
    };

    const toggleCardExpanded = (cardId) => {
        setExpandedCardIds(prev => {
            const next = new Set(prev);
            if (next.has(cardId)) {
                next.delete(cardId);
            } else {
                next.add(cardId);
            }
            return next;
        });
    };
     const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Card Settings State (stored in localStorage with v2 version to apply new defaults)
    const [cardSettings, setCardSettings] = useState(() => {
        const defaultSettings = {
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
                example: false,
                word: false,
                furigana: false,
                reading: false,
                exampleFurigana: true,
                exampleMeaning: true,
                synonymFurigana: true,
                pitchAccent: true
            },
            swapSides: false,
            autoPlayAudio: true,
            audioEnabled: true
        };
        try {
            const saved = localStorage.getItem('quizki_flashcard_settings_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...defaultSettings,
                    ...parsed,
                    front: { ...defaultSettings.front, ...parsed.front },
                    back: { ...defaultSettings.back, ...parsed.back },
                    autoPlayAudio: parsed.autoPlayAudio !== undefined ? parsed.autoPlayAudio : true,
                    audioEnabled: parsed.audioEnabled !== undefined ? parsed.audioEnabled : true
                };
            }
        } catch (e) { }
        return defaultSettings;
    });

    const [showSettingsMenu, setShowSettingsMenu] = useState(false);


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
    const [kanjiPreviewModal, setKanjiPreviewModal] = useState({
        isOpen: false,
        newKanji: [],
        selectedIds: new Set(),
        allExtractedCount: 0,
        existingCount: 0
    });

    useEffect(() => {
        let isMounted = true;
        const fetchProgress = async () => {
            const userId = getAuth().currentUser?.uid;
            // First show what is currently in localStorage (instant load)
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

            // Then sync with Firestore
            const resolved = await syncStudyProgress(userId, folderId);
            if (isMounted) {
                setCompletedStates(resolved.completed);
                setProgressStates(resolved.progress);
            }
        };

        fetchProgress();
        return () => { isMounted = false; };
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
    // Fetch pitch accent and reading data from Jotoba for ALL cards in the set (loads hidden cards in the background)
    const [pitchAccentData, setPitchAccentData] = useState({});

    useEffect(() => {
        if (!setCards || setCards.length === 0) return;
        if (cardSettings.back.pitchAccent === false) {
            console.log("🔍 [Pitch Accent] Display is disabled in settings.");
            return;
        }

        // Extract base words that need fetching
        const wordsToFetch = [];
        setCards.forEach(card => {
            const frontText = card.frontWithFurigana || card.front || '';
            const baseWord = frontText.split('（')[0].split('(')[0].trim();
            const { reading } = parseWordAndReading(frontText);
            const hasLocalReading = card.reading || reading;
            const hasLocalPitch = card.pitch || (card.accent !== undefined && card.accent !== '' && card.accent !== null);
            if ((!hasLocalReading || !hasLocalPitch) && baseWord && !pitchAccentData[baseWord]) {
                wordsToFetch.push(baseWord);
            }
        });

        console.log(`🔍 [Pitch Accent] Checked ${setCards.length} cards. Words to fetch:`, wordsToFetch);

        if (wordsToFetch.length === 0) return;

        let isMounted = true;
        const fetchAll = async () => {
            try {
                const results = [];
                const chunkSize = 3;
                for (let i = 0; i < wordsToFetch.length; i += chunkSize) {
                    const chunk = wordsToFetch.slice(i, i + chunkSize);
                    const chunkResults = await Promise.all(
                        chunk.map(async (baseWord) => {
                            try {
                                const jotobaData = await fetchJotobaWordData(baseWord);
                                return { baseWord, jotobaData };
                            } catch (e) {
                                return { baseWord, jotobaData: null };
                            }
                        })
                    );
                    results.push(...chunkResults);
                    if (i + chunkSize < wordsToFetch.length) {
                        await new Promise(resolve => setTimeout(resolve, 80));
                    }
                }

                const auth = getAuth();
                const userId = auth.currentUser?.uid;
                const newData = {};
                results.forEach(({ baseWord, jotobaData }) => {
                    if (jotobaData) {
                        newData[baseWord] = {
                            pitch: jotobaData.pitch || null,
                            reading: jotobaData.reading || null
                        };

                        // Auto save to Firestore for cards that match this baseWord
                        if (userId) {
                            setCards.forEach(async (card) => {
                                const cardFrontText = card.frontWithFurigana || card.front || '';
                                const cardBaseWord = cardFrontText.split('（')[0].split('(')[0].trim();
                                if (cardBaseWord === baseWord) {
                                    const hasPitch = !!card.pitch || (card.accent !== undefined && card.accent !== '' && card.accent !== null);
                                    const hasReading = !!card.reading;
                                    const needsPitchSave = !hasPitch && !!jotobaData.pitch;
                                    const needsReadingSave = !hasReading && !!jotobaData.reading;
                                    if (needsPitchSave || needsReadingSave) {
                                        try {
                                            const cardRef = doc(db, `artifacts/${appId}/users/${userId}/vocabulary`, card.id);
                                            const updatePayload = {};
                                            if (needsPitchSave) {
                                                updatePayload.pitch = jotobaData.pitch;
                                                card.pitch = jotobaData.pitch;
                                            }
                                            if (needsReadingSave) {
                                                updatePayload.reading = jotobaData.reading;
                                                card.reading = jotobaData.reading;
                                            }
                                            await updateDoc(cardRef, updatePayload);
                                            console.log(`💾 Auto-saved missing pitch/reading to Firestore for card: ${baseWord}`);
                                        } catch (err) {
                                            console.warn(`Failed to auto-save missing pitch/reading for card ${card.id}:`, err);
                                        }
                                    }
                                }
                            });
                        }
                    } else {
                        newData[baseWord] = { pitch: null, reading: null };
                    }
                });

                if (isMounted) {
                    setPitchAccentData(prev => ({ ...prev, ...newData }));
                }
            } catch (e) {
                console.error('Error fetching pitch accent data in parallel:', e);
            }
        };
        fetchAll();
        return () => { isMounted = false; };
    }, [setCards, cardSettings.back.pitchAccent]);
    const renderPitchAccent = (card) => {
        if (cardSettings.back.pitchAccent === false) return null;

        const text = card.frontWithFurigana || card.front || '';
        const { word, reading } = parseWordAndReading(text);
        
        const jotobaData = pitchAccentData[word];
        const jotobaReading = jotobaData?.reading || null;
        
        // Fallback reading
        const finalReading = card.reading || reading || jotobaReading || word;
        if (!finalReading) return null;

        // Support local card pitch or accent if stored in Firestore
        const storedPitch = card.accent !== undefined && card.accent !== '' && card.accent !== null
            ? accentNumberToPitchParts(finalReading, card.accent)
            : null;
        const pitchParts = card.pitch || storedPitch || jotobaData?.pitch || null;

        const readingChars = [...finalReading];
        
        let pitchElements = null;
        if (pitchParts && pitchParts.length > 0) {
            const charPitchMap = [];
            for (const pp of pitchParts) {
                const partChars = [...pp.part];
                for (const c of partChars) {
                    charPitchMap.push({ char: c, high: pp.high });
                }
            }
            
            pitchElements = (
                <span className="font-japanese inline-flex items-end gap-0 animate-fade-in">
                    {readingChars.map((char, ci) => {
                        const pm = charPitchMap[ci];
                        const isHigh = pm ? pm.high : false;
                        const nextHigh = ci + 1 < charPitchMap.length ? charPitchMap[ci + 1]?.high : isHigh;
                        const showTransition = ci + 1 < charPitchMap.length && isHigh !== nextHigh;
                        const lineColor = '#ef4444'; // Standard NHK Red
                        
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
                                    <span className="text-gray-400 dark:text-gray-500">{char}</span>
                                </span>
                                {showTransition && (
                                    <span className="absolute -right-[0.75px] top-0 bottom-0 w-[1.5px]" style={{ backgroundColor: lineColor }}></span>
                                )}
                            </span>
                        );
                    })}
                </span>
            );
        } else {
            pitchElements = (
                <span className="font-japanese text-gray-400 dark:text-gray-500">
                    {finalReading}
                </span>
            );
        }
        
        return (
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500 font-sans ml-1 select-none">
                ({pitchElements})
            </span>
        );
    };

    useEffect(() => {
        setVisibleCount(30);
    }, [folderId, searchQuery]);

    // Scroll to top when study set (folderId) changes
    useEffect(() => {
        const resetScroll = () => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            document.body.scrollTo(0, 0);
            document.documentElement.scrollTo(0, 0);
            
            const mainContainer = document.querySelector('.main-with-header');
            if (mainContainer) {
                mainContainer.scrollTo(0, 0);
            }

            const mainEl = document.querySelector('main');
            if (mainEl) {
                mainEl.scrollTo(0, 0);
            }

            const elements = document.querySelectorAll('*');
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if (el.scrollTop > 0) {
                    el.scrollTop = 0;
                }
            }
        };

        resetScroll();
        requestAnimationFrame(resetScroll);
        const t1 = setTimeout(resetScroll, 50);
        const t2 = setTimeout(resetScroll, 150);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [folderId]);



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
                            <button 
                                onClick={handleAddKanjiToSrs} 
                                disabled={isAddingKanji}
                                className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors text-sm font-medium disabled:opacity-50"
                                title="Thêm các chữ Kanji trong học phần vào danh sách Kanji để học"
                            >
                                <BookOpen className="w-4 h-4" /> {isAddingKanji ? 'Đang thêm...' : 'Thêm Kanji học'}
                            </button>
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
                            <FlashcardPlayerSection
                                setCards={setCards}
                                cardSettings={cardSettings}
                                setShowSettingsMenu={setShowSettingsMenu}
                                onSaveCardAudio={onSaveCardAudio}
                            />
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
                                            className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500"
                                            title={`Chưa học: ${masteryStats.notLearnedPct}%`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Chưa học */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 flex items-center justify-between shadow-sm">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Chưa học</span>
                                            </div>
                                            <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
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
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'flashcard');
                                                setCompletedStates(prev => ({ ...prev, flashcard: false }));
                                                setProgressStates(prev => ({ ...prev, flashcard: false }));
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
                                                Đang học
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
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'study');
                                                setCompletedStates(prev => ({ ...prev, study: false }));
                                                setProgressStates(prev => ({ ...prev, study: false }));
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
                                                Đang học
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
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'meaning_input');
                                                setCompletedStates(prev => ({ ...prev, meaning_input: false }));
                                                setProgressStates(prev => ({ ...prev, meaning_input: false }));
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
                                                Đang học
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
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'dictation');
                                                setCompletedStates(prev => ({ ...prev, dictation: false }));
                                                setProgressStates(prev => ({ ...prev, dictation: false }));
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
                                                Đang học
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
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'example');
                                                setCompletedStates(prev => ({ ...prev, example: false }));
                                                setProgressStates(prev => ({ ...prev, example: false }));
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
                                                Đang học
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
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'synonym');
                                                setCompletedStates(prev => ({ ...prev, synonym: false }));
                                                setProgressStates(prev => ({ ...prev, synonym: false }));
                                            }}
                                            className="mt-3 text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 flex items-center gap-1 font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                        >
                                            <RotateCcw className="w-3 h-3" /> Làm lại
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onSynonymQuiz && onSynonymQuiz(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-sky-400 dark:hover:border-sky-600 shadow-sm hover:shadow-lg transition-all group relative">
                                        {progressStates.synonym && (
                                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-sky-500 text-[9px] text-white font-bold uppercase tracking-wider animate-pulse">
                                                Đang học
                                            </div>
                                        )}
                                        <div className="w-11 h-11 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Users className="w-5 h-5 text-sky-500" /></div>
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
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-800 dark:text-white transition-all shadow-sm"
                                            />
                                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                {filteredCards.length === 0 && searchQuery ? (
                                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700">
                                        <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Không tìm thấy từ vựng nào khớp với "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {visibleCards.map(card => {
                                            const isExpanded = expandedCardIds.has(card.id);
                                            return (
                                                <div
                                                    key={card.id}
                                                    onClick={() => toggleCardExpanded(card.id)}
                                                    className="flex flex-col bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-3 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer"
                                                >
                                                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch">
                                                        <div className="flex-1 md:w-1/2 flex flex-col justify-center md:border-r border-gray-100 dark:border-gray-700 md:pr-6">
                                                            <div className="font-bold text-lg text-gray-900 dark:text-white flex items-baseline gap-1.5 flex-wrap">
                                                                <InlineEditCell
                                                                    value={card.frontWithFurigana || card.front}
                                                                    isJapanese={true}
                                                                    onSave={(v) => handleInlineSave(card, 'front', v)}
                                                                    className="text-lg font-bold inline-block"
                                                                />
                                                                {renderPitchAccent(card)}
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
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); playAudio(card.audioBase64, card.front, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null); }}
                                                                        className="p-2.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors flex-shrink-0"
                                                                    >
                                                                        <Volume2 className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setEditingCard(card); }}
                                                                    className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors flex-shrink-0"
                                                                    title="Sửa từ vựng"
                                                                >
                                                                    <Edit className="w-5 h-5" />
                                                                </button>
                                                                {onDeleteCard && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setCardToDelete(card);
                                                                        }}
                                                                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors flex-shrink-0"
                                                                        title="Xóa từ vựng"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded details container */}
                                                    {isExpanded && (
                                                        <div className="mt-2 border-t border-gray-100 dark:border-gray-700/40 pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                                                            {card.synonym && (
                                                                <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                                    <span className="font-semibold text-indigo-500 shrink-0">Đồng nghĩa:</span>
                                                                    <span className="font-japanese font-medium"><FuriganaText text={card.synonym} /></span>
                                                                </div>
                                                            )}
                                                            {card.nuance && (
                                                                <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                                                                    <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">💡 Sắc thái/Ngữ cảnh:</span>
                                                                    <span className="leading-relaxed">{card.nuance}</span>
                                                                </div>
                                                            )}
                                                            {(card.example || card.exampleMeaning) && (
                                                                <div className="space-y-2 mt-1">
                                                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ví dụ minh họa:</div>
                                                                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2.5">
                                                                        {card.example ? (
                                                                            card.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                                                                const meaning = (card.exampleMeaning || '').split('\n')[idx]?.trim();
                                                                                return (
                                                                                    <div key={idx} className="border-l-2 border-indigo-500/30 pl-2.5">
                                                                                        <div className="text-sm text-slate-800 dark:text-slate-200 font-japanese leading-relaxed">
                                                                                            <FuriganaText text={ex} />
                                                                                        </div>
                                                                                        {meaning && (
                                                                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">{meaning}</div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            card.exampleMeaning && (
                                                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{card.exampleMeaning}</p>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* SRS Toggle Footer */}
                                                    <div className="border-t border-gray-100 dark:border-gray-700/60 pt-3 flex justify-between items-center">
                                                        <div className="flex items-center gap-4">
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

                                                        {/* Toggle details button */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleCardExpanded(card.id); }}
                                                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                                        >
                                                            {isExpanded ? (
                                                                <>Thu gọn <ChevronUp className="w-3.5 h-3.5" /></>
                                                            ) : (
                                                                <>Xem chi tiết <ChevronDown className="w-3.5 h-3.5" /></>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
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
                                    {showMasteryModal.status === 'not_learned' ? 'Chưa học' :
                                        showMasteryModal.status === 'learning' ? 'Đang học' :
                                            showMasteryModal.status === 'memorized' ? 'Đã nhớ' : 'Chưa học & Đang học'}
                                </span>
                            </p>
                        </div>

                        {/* List of 4 study modes */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSelectedMasteryMode('flashcard')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'flashcard' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Layers className="w-6 h-6" />
                                <span className="font-bold text-xs">Thẻ ghi nhớ</span>
                            </button>

                            <button
                                onClick={() => setSelectedMasteryMode('study')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'study' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                            >
                                <BookOpen className="w-6 h-6" />
                                <span className="font-bold text-xs">Học tập</span>
                            </button>

                            <button
                                onClick={() => setSelectedMasteryMode('meaning')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'meaning' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Edit2 className="w-6 h-6" />
                                <span className="font-bold text-xs">Nhập ý nghĩa</span>
                            </button>

                            <button
                                onClick={() => setSelectedMasteryMode('dictation')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'dictation' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Headphones className="w-6 h-6" />
                                <span className="font-bold text-xs">Nghe Chép</span>
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowMasteryModal(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
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
                                : <>Xoá <strong>"{folder.name}"</strong>? Toàn bộ từ vựng trong học phần này cũng sẽ bị xoá vĩnh viễn.</>
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
            {/* Delete Card Confirm Modal */}
            {cardToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCardToDelete(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-500" /></div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                                    Xoá từ vựng
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Không thể hoàn tác.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                            Bạn có chắc chắn muốn xoá từ vựng <strong className="text-red-500">"{cardToDelete.front}"</strong> khỏi học phần này?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setCardToDelete(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Huỷ</button>
                            <button
                                onClick={() => {
                                    onDeleteCard(cardToDelete.id, cardToDelete.front);
                                    setCardToDelete(null);
                                }}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
                            >Xoá</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kanji Preview and Add Confirmation Modal */}
            {kanjiPreviewModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setKanjiPreviewModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-gray-200 dark:border-slate-700 animate-fade-in text-slate-800 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-700/80 pb-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-gray-800 dark:text-white">
                                    Thêm Kanji vào ôn tập
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Học phần: {folder.name}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                                    <span className="block text-gray-400 dark:text-gray-500 font-semibold mb-0.5">Tổng số Kanji</span>
                                    <span className="text-base font-extrabold text-slate-700 dark:text-white">{kanjiPreviewModal.allExtractedCount} chữ</span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-150 dark:border-slate-700/50">
                                    <span className="block text-gray-400 dark:text-gray-500 font-semibold mb-0.5">Đã học (Bỏ qua)</span>
                                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-450">{kanjiPreviewModal.existingCount} chữ</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-550 dark:text-gray-400">
                                        Chọn các chữ muốn thêm ({kanjiPreviewModal.selectedIds.size}/{kanjiPreviewModal.newKanji.length} chữ):
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setKanjiPreviewModal(prev => {
                                                const allSelected = prev.selectedIds.size === prev.newKanji.length;
                                                return {
                                                    ...prev,
                                                    selectedIds: allSelected ? new Set() : new Set(prev.newKanji.map(k => k.id))
                                                };
                                            });
                                        }}
                                        className="text-indigo-650 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                                    >
                                        {kanjiPreviewModal.selectedIds.size === kanjiPreviewModal.newKanji.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-gray-150 dark:border-slate-700/80 no-scrollbar">
                                    {kanjiPreviewModal.newKanji.map(k => {
                                        const isSelected = kanjiPreviewModal.selectedIds.has(k.id);
                                        return (
                                            <button 
                                                key={k.id}
                                                type="button"
                                                onClick={() => togglePreviewKanjiSelect(k.id)}
                                                className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-xl font-japanese shadow-sm transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 scale-100 ring-2 ring-indigo-500/15'
                                                        : 'bg-white border-gray-200 text-gray-400 dark:bg-slate-800/60 dark:border-slate-700/60 opacity-40 line-through'
                                                }`}
                                                title={isSelected ? 'Click để bỏ chọn' : 'Click để chọn'}
                                            >
                                                {k.character}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setKanjiPreviewModal(prev => ({ ...prev, isOpen: false }))} 
                                className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={handleConfirmAddKanji}
                                disabled={isAddingKanji || kanjiPreviewModal.selectedIds.size === 0}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md cursor-pointer"
                            >
                                {isAddingKanji ? 'Đang lưu...' : `Xác nhận Lưu (${kanjiPreviewModal.selectedIds.size})`}
                            </button>
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
                        <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Đổi mặt trước/mặt sau</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.swapSides} onChange={(e) => setCardSettings(prev => ({ ...prev, swapSides: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Phát âm thanh từ vựng</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.audioEnabled !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, audioEnabled: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Tự động phát âm thanh khi lật</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.autoPlayAudio} onChange={(e) => setCardSettings(prev => ({ ...prev, autoPlayAudio: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt tiếng Nhật hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.word} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Chữ Hán / Từ vựng</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.furigana} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, furigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Phiên âm Furigana</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt nghĩa dịch hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.meaning} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Nghĩa tiếng Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.reading} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, reading: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Cách đọc (Hiragana)</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.pitchAccent !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, pitchAccent: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Hiển thị cao độ (Pitch Accent)</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonym} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Đồng nghĩa</span></label>
                                    {cardSettings.back.synonym && (
                                        <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonymFurigana !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonymFurigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Furigana đồng nghĩa</span></label>
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.example} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                    {cardSettings.back.example && (
                                        <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.exampleFurigana !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleFurigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Furigana ví dụ</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.exampleMeaning !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleMeaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Dịch câu ví dụ</span></label>
                                        </div>
                                    )}
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

            {editingCard && (
                <EditCardModal
                    card={editingCard}
                    onSave={onSaveChanges}
                    onClose={() => setEditingCard(null)}
                    onGeminiAssist={onGeminiAssist}
                    allCards={setCards}
                />
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
