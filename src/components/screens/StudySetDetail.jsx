import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit, Edit2, PlayCircle, BookOpen, Layers, Search, Volume2, Trash2, Users, Check, Plus, Headphones, FileText, RotateCcw, Settings, Shuffle, RefreshCw } from 'lucide-react';
import { shuffleArray } from '../../utils/textProcessing';
import FuriganaText from '../ui/FuriganaText';
import Flashcard from '../ui/Flashcard';
import { playAudio, speakJapanese, speakExampleSentence, preloadAudio } from '../../utils/audio';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { syncStudyProgress, resetStudyProgress } from '../../utils/studyProgressService';
import { logKanjiActivity } from '../../utils/kanjiHistory';
import { showToast } from '../../utils/toast';
import { fetchJotobaWordData, accentNumberToPitchParts } from '../../utils/pitchAccent';
import { getSharedKanjiList, updateCachedUserSrs } from '../../utils/kanjiService';
import { getSharedBookGroups } from '../../utils/bookService';
import EditCardModal from '../cards/EditCardModal';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { useLanguage } from '../../context/LanguageContext';
import VocabCardSettingsModal from '../srs/VocabCardSettingsModal';
import { POS_TYPES, getPosLabel } from '../../config/constants';
import { formatIPA, isEnglishCard as checkIsEnglishCard, shouldRunJapaneseFeatures } from '../../utils/englishVocab';
import { isKoreanCard as checkIsKoreanCard } from '../../languages/ko/hangul';
import { normalizeSRSState, isVocabCardMastered, isVocabCardLearning } from '../../utils/srs';

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
const getSrsCycleLabel = (card, t) => {
    if (card.srsEnabled === false) return null;
    const normalized = normalizeSRSState(card);
    const hasBeenReviewed = !!(card.lastReview || card.srsLastReview || card.lastReviewed_back || normalized.reps > 0 || (card.intervalIndex_back !== undefined && card.intervalIndex_back >= 0));

    if (!hasBeenReviewed || normalized.state === 'NEW') {
        return t ? t('srs.newCard') : 'Mới';
    }

    if (normalized.state === 'RELEARNING') return t ? t('srs.relearning') : 'Học lại';
    if (normalized.state === 'LEARNING') {
        return normalized.learningStep === 0 ? (t ? t('intervals.1m') : '1 phút') : (t ? t('intervals.10m') : '10 phút');
    }

    // REVIEW state - interval is in days
    const days = normalized.interval || 1;
    if (days < 30) return t ? `${days} ${t('common.days', 'ngày')}` : `${days} ngày`;
    return t ? `${Math.round(days / 30)} ${t('common.months', 'tháng')}` : `${Math.round(days / 30)} tháng`;
};

const InlineEditCell = ({ value, onSave, className = '', isJapanese = false, placeholder = '' }) => {
    const { t } = useLanguage();
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
                placeholder={placeholder}
                className={`w-full bg-blue-50/60 dark:bg-slate-800 border-2 border-blue-500 dark:border-blue-400 rounded-lg px-3 py-1 outline-none text-gray-900 dark:text-white shadow-xs ${isJapanese ? 'font-japanese' : ''} ${className}`}
            />
        );
    }

    return (
        <div
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
            className={`cursor-pointer rounded-lg px-3 py-1 -mx-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700/60 ${className}`}
            title={t('common.clickToEdit')}
        >
            {isJapanese ? (
                value ? <FuriganaText text={value} forceHide={true} /> : <span className="text-slate-400 dark:text-slate-500 italic text-sm">{placeholder || t('common.empty')}</span>
            ) : (
                value || <span className="text-slate-400 dark:text-slate-500 italic text-sm">{placeholder || t('common.empty')}</span>
            )}
        </div>
    );
};

const FlashcardPlayerSection = ({
    setCards,
    cardSettings,
    setShowSettingsMenu,
    onSaveCardAudio,
    onUpdateCard,
    onSaveChanges
}) => {
    const { t } = useLanguage();
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

    // Reset shuffle state ONLY when the set content actually changes (e.g. switching sets or deleting all cards), avoiding resets on background ID/pitch syncs
    const setFingerprint = useMemo(() => {
        if (!setCards || setCards.length === 0) return '';
        return setCards.map(c => c.front || c.id).slice(0, 5).join('|') + `_${setCards.length}`;
    }, [setCards]);
    const prevSetFingerprintRef = useRef(setFingerprint);

    useEffect(() => {
        if (prevSetFingerprintRef.current !== setFingerprint) {
            prevSetFingerprintRef.current = setFingerprint;
            setIsShuffled(false);
            setShuffledCards([]);
            setCurrentCardIndex(0);
            setIsCardFlipped(false);
        }
    }, [setFingerprint]);

    const activeCardsList = useMemo(() => {
        return isShuffled ? shuffledCards : setCards;
    }, [isShuffled, shuffledCards, setCards]);

    const activeCard = activeCardsList[currentCardIndex];

    // Preload adjacent cards' base64 images and audio for seamless transitions and instant playback
    useEffect(() => {
        if (!activeCardsList || activeCardsList.length === 0) return;
        const indicesToPreload = [currentCardIndex, currentCardIndex + 1, currentCardIndex + 2];
        indicesToPreload.forEach(idx => {
            if (idx >= 0 && idx < activeCardsList.length) {
                const card = activeCardsList[idx];
                if (card) {
                    if (card.imageBase64) {
                        const img = new Image();
                        img.src = card.imageBase64;
                        if (typeof img.decode === 'function') {
                            img.decode().catch(() => { });
                        }
                    }
                    preloadAudio(card).catch(() => { });
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
                    transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                    transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.12s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.12s ease' : 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'),
                    touchAction: 'pan-y',
                }}
            >
                <Flashcard
                    key={activeCard.id}
                    card={activeCard}
                    cardSettings={{ ...cardSettings, reviewType: 'flashcard' }}
                    isFlipped={isCardFlipped}
                    onFlip={() => {
                        setIsAnimatingFlip(true);
                        const nextFlippedState = !isCardFlipped;
                        setIsCardFlipped(nextFlippedState);
                        if (activeCard && cardSettings.autoPlayAudio && cardSettings.audioEnabled !== false) {
                            if (nextFlippedState) {
                                speakJapanese(activeCard, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(activeCard.id, b64, vid) : null);
                            }
                        }
                    }}
                    onSaveCardAudio={onSaveCardAudio}
                    onSaveMnemonic={async (c, newText) => {
                        if (onUpdateCard && c) {
                            await onUpdateCard(c.id, { userMnemonic: newText, mnemonic: newText, customMnemonic: newText });
                        } else if (onSaveChanges && c) {
                            await onSaveChanges(c.id, { userMnemonic: newText, mnemonic: newText, customMnemonic: newText });
                        }
                    }}
                    transitionEnabled={isAnimatingFlip}
                />

                {/* Top Right Action Buttons Header (Speaker, Settings) */}
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-30">
                    {cardSettings.audioEnabled !== false && activeCard && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                speakJapanese(activeCard, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(activeCard.id, b64, vid) : null);
                            }}
                            className="p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
                            title={t('common.pronounce')}
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                        className="p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
                        title={t('common.cardSettings')}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-3.5 mt-3.5">
                <button
                    onClick={prevCard}
                    disabled={currentCardIndex === 0}
                    className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300 stroke-[2.5]" />
                </button>

                <span className="text-xs font-black text-slate-500 dark:text-slate-400 tracking-wider px-3.5 py-2 bg-white dark:bg-slate-900 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs">
                    {currentCardIndex + 1} / {activeCardsList.length}
                </span>

                <button
                    onClick={nextCard}
                    disabled={currentCardIndex === activeCardsList.length - 1}
                    className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
                >
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300 stroke-[2.5]" />
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
                    className={`w-10 h-10 rounded-2xl shadow-xs border-2 border-b-4 flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer ${
                        isShuffled
                            ? 'bg-sky-500 border-sky-700 text-white shadow-sky-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    title={isShuffled ? t('studyModes.unshuffle') : t('studyModes.shuffle')}
                >
                    <Shuffle className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const StudySetDetail = ({
    folderId, folders, cardFolders, allCards,
    onBack, onEditSet, onStudySet, onFlashcardSet, onMeaningSet, onDictationSet, onExampleSet, onSynonymQuiz,
    onNavigateToAdd, onDeleteFolder, onSaveChanges, onSaveCardAudio,
    onDeleteCards, onDeleteCard, onToggleSrs, onGeminiAssist, canUserUseAI, onUpdateCard
}) => {
    const { isEnglishMode, isKoreanMode } = useTargetLanguage();
    const { t, language } = useLanguage();
    const [expandedCardIds, setExpandedCardIds] = useState(new Set());
    const [isAddingKanji, setIsAddingKanji] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [cardToDelete, setCardToDelete] = useState(null);

    const handleAddKanjiToSrs = async () => {
        if (isAddingKanji) return;

        const userId = getAuth().currentUser?.uid;
        if (!userId) {
            showToast(language === 'vi' ? 'Bạn cần đăng nhập để sử dụng tính năng này!' : 'You need to be signed in to use this feature!', 'error');
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
                showToast(language === 'vi' ? 'Học phần này không chứa chữ Kanji nào!' : 'This set does not contain any Kanji characters!', 'warning');
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
                showToast(language === 'vi' ? 'Không tìm thấy chữ Kanji tương ứng trong hệ thống để thêm!' : 'No matching Kanji characters found in system to add!', 'warning');
                setIsAddingKanji(false);
                return;
            }

            // 3. Fetch user's existing kanjiSRS
            const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
            const existingKanjiIds = new Set(srsSnap.docs.map(doc => doc.id));

            // Filter out already added ones
            const newKanjiToInitialize = matchingKanji.filter(k => !existingKanjiIds.has(k.id));

            if (newKanjiToInitialize.length === 0) {
                showToast(language === 'vi' ? 'Tất cả Kanji trong học phần này đã có trong danh sách học của bạn rồi!' : 'All Kanji in this set are already in your study list!', 'info');
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
            showToast((language === 'vi' ? 'Đã xảy ra lỗi khi chuẩn bị danh sách Kanji: ' : 'Error preparing Kanji list: ') + e.message, 'error');
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
                const srsPayload = {
                    interval: 0,
                    ease: 2.5,
                    nextReview: now,
                    lastReview: now,
                    reps: 0,
                    learningStep: null,
                    isLapsed: false,
                    lapseCount: 0,
                    prelapseInterval: null,
                    state: 'NEW'
                };
                batch.set(ref, srsPayload, { merge: true });
                updateCachedUserSrs(userId, k.id, srsPayload, k.character);
            });
            await batch.commit();

            // Log activity
            await logKanjiActivity(userId, {
                type: 'save',
                title: language === 'vi' ? `Thêm ${selectedKanji.length} Kanji từ học phần` : `Added ${selectedKanji.length} Kanji from study set`,
                details: (language === 'vi' ? 'Thêm từ học phần: ' : 'Added from set: ') + (folder.name || t('vocab.unfiled'))
            });

            showToast(language === 'vi' ? `Đã thêm thành công ${selectedKanji.length} chữ Kanji mới vào danh sách học!` : `Successfully added ${selectedKanji.length} new Kanji characters to study list!`, 'success');
            setKanjiPreviewModal(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
            console.error('Error adding Kanji to SRS:', e);
            showToast((language === 'vi' ? 'Đã xảy ra lỗi khi thêm Kanji vào danh sách: ' : 'Error adding Kanji to study list: ') + e.message, 'error');
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
                image: true,
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
        if (folderId === 'unfiled') return { id: 'unfiled', name: t('vocab.unfiled'), description: t('vocab.unfiledDesc') };
        return folders.find(f => f.id === folderId) || { name: t('vocab.unknownSet') };
    }, [folderId, folders]);

    const setCards = useMemo(() => {
        if (folderId === 'unfiled') return allCards.filter(c => !c.folderId || c.folderId === 'unfiled' || !cardFolders[c.id] || cardFolders[c.id] === 'unfiled');
        return allCards.filter(c => c.folderId === folderId || cardFolders[c.id] === folderId);
    }, [folderId, allCards, cardFolders]);

    const notLearnedCards = useMemo(() => setCards.filter(c => (!c.masteryState || c.masteryState === 'not_learned') && !isVocabCardMastered(c) && !isVocabCardLearning(c)), [setCards]);
    const learningCards = useMemo(() => setCards.filter(c => (c.masteryState === 'learning' || isVocabCardLearning(c)) && !isVocabCardMastered(c)), [setCards]);
    const memorizedCards = useMemo(() => setCards.filter(c => c.masteryState === 'memorized' || isVocabCardMastered(c)), [setCards]);

    const [isSyncingFromLesson, setIsSyncingFromLesson] = useState(false);

    const handleSyncFromSourceLesson = async () => {
        const auth = getAuth();
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId || !folderId || folderId === 'unfiled') return;

        setIsSyncingFromLesson(true);
        try {
            const groups = await getSharedBookGroups(false);
            let targetLesson = null;

            // 1. Try finding by folder.sourceLesson
            if (folder?.sourceLesson) {
                const { groupId, bookId, chapterId, lessonId } = folder.sourceLesson;
                const g = groups.find(x => x.id === groupId);
                const b = g?.books?.find(x => x.id === bookId);
                const c = b?.chapters?.find(x => x.id === chapterId);
                const l = c?.lessons?.find(x => x.id === lessonId);
                if (l && l.vocabulary && l.vocabulary.length > 0) {
                    targetLesson = l;
                }
            }

            // 2. If not found by sourceLesson ID, search by matching folder.name in book lessons
            if (!targetLesson && folder?.name) {
                const cleanFolderName = folder.name.toLowerCase().trim();
                for (const g of groups) {
                    for (const b of (g.books || [])) {
                        for (const c of (b.chapters || [])) {
                            for (const l of (c.lessons || [])) {
                                const lessonTitle = (l.title || l.name || '').toLowerCase().trim();
                                const fullBookTitle = `${b.title || ''} - ${l.title || l.name || ''}`.toLowerCase().trim();
                                if (cleanFolderName.includes(lessonTitle) || lessonTitle.includes(cleanFolderName) || fullBookTitle.includes(cleanFolderName)) {
                                    if (l.vocabulary && l.vocabulary.length > 0) {
                                        targetLesson = l;
                                        break;
                                    }
                                }
                            }
                            if (targetLesson) break;
                        }
                        if (targetLesson) break;
                    }
                    if (targetLesson) break;
                }
            }

            if (!targetLesson || !targetLesson.vocabulary || targetLesson.vocabulary.length === 0) {
                showToast(language === 'vi' ? 'Không tìm thấy bài học tương ứng trong Thư viện Sách' : 'No matching lesson found in Book Library', 'warning');
                return;
            }

            const currentTargetLang = localStorage.getItem('quizki_target_language') || 'ja';
            const batch = writeBatch(db);
            const vocabColRef = collection(db, `artifacts/${appId}/users/${currentUserId}/vocabulary`);
            let count = 0;

            for (const v of targetLesson.vocabulary) {
                const word = v.word || v.front || '';
                if (!word.trim()) continue;
                const displayWord = word.split('（')[0].split('(')[0].trim();
                const existingCard = allCards.find(c => (c.front || '').split('（')[0].split('(')[0].trim() === displayWord);

                if (existingCard) {
                    const cardDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/vocabulary`, existingCard.id);
                    const updatePayload = { folderId: folderId };
                    const vEx = (v.example || '').trim();
                    const cEx = (existingCard.example || '').trim();
                    if (vEx && (cEx !== vEx || !cEx)) {
                        updatePayload.example = vEx;
                        updatePayload.exampleMeaning = (v.exampleMeaning || '').trim();
                        if (v.exampleAudioBase64) updatePayload.exampleAudioBase64 = v.exampleAudioBase64;
                        if (existingCard.intervalIndex_example === -999 || existingCard.intervalIndex_example === undefined) {
                            updatePayload.intervalIndex_example = -1;
                            updatePayload.nextReview_example = new Date();
                            updatePayload.correctStreak_example = 0;
                        }
                    }
                    batch.update(cardDocRef, updatePayload);
                    count++;
                } else {
                    const cardDocRef = doc(vocabColRef);
                    batch.set(cardDocRef, {
                        front: word.trim(),
                        back: (v.meaning || v.back || '').trim(),
                        ipa: (v.ipa || '').trim(),
                        targetLanguage: currentTargetLang,
                        synonym: (v.synonym || '').trim(),
                        sinoVietnamese: (v.sinoVietnamese || '').trim(),
                        synonymSinoVietnamese: '',
                        example: (v.example || '').trim(),
                        exampleMeaning: (v.exampleMeaning || '').trim(),
                        nuance: (v.nuance || v.note || '').trim(),
                        pos: v.pos || '',
                        level: v.level || '',
                        audioBase64: v.audioBase64 || null,
                        imageBase64: v.imageUrl || null,
                        createdAt: new Date(),
                        userId: currentUserId,
                        folderId: folderId,
                        intervalIndex_back: -1,
                        correctStreak_back: 0,
                        nextReview_back: new Date(),
                        intervalIndex_synonym: v.synonym ? -1 : -999,
                        correctStreak_synonym: 0,
                        nextReview_synonym: v.synonym ? new Date() : new Date(9999, 0, 1),
                        intervalIndex_example: v.example ? -1 : -999,
                        correctStreak_example: 0,
                        nextReview_example: v.example ? new Date() : new Date(9999, 0, 1),
                        easeFactor: 2.5,
                        totalReps: 0,
                    });
                    count++;
                }
            }

            await batch.commit();
            showToast(language === 'vi' ? `🎉 Đã đồng bộ thành công ${count} từ vựng từ sách vào học phần!` : `🎉 Successfully synced ${count} vocabulary words from book into set!`, 'success');
        } catch (err) {
            console.error('Lỗi đồng bộ từ sách:', err);
            showToast(language === 'vi' ? 'Lỗi khi đồng bộ từ sách' : 'Error syncing from book', 'error');
        } finally {
            setIsSyncingFromLesson(false);
        }
    };

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
            onStudySet(folderId, showMasteryModal.cards, { customType: showMasteryModal.status });
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
        if (isEnglishMode) return; // Do NOT run Japanese pitch accent fetching for English study mode!
        if (!setCards || setCards.length === 0) return;
        if (cardSettings.back.pitchAccent === false) {
            console.log("🔍 [Pitch Accent] Display is disabled in settings.");
            return;
        }

        // Extract base words that need fetching
        const wordsToFetch = [];
        setCards.forEach(card => {
            if (!shouldRunJapaneseFeatures(card, isEnglishMode)) return; // Skip English cards!
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
            ipa: field === 'ipa' ? newValue : (card.ipa || ''),
            targetLanguage: card.targetLanguage || (isEnglishMode ? 'en' : 'ja'),
            synonym: card.synonym || '', example: card.example || '',
            exampleMeaning: card.exampleMeaning || '', nuance: card.nuance || '',
            pos: card.pos || '', level: card.level || '',
            imageBase64: card.imageBase64,
            sinoVietnamese: field === 'sinoVietnamese' ? newValue : (card.sinoVietnamese || ''),
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
            <div className="w-full pb-20 min-h-screen bg-transparent animate-fade-in">
                {/* Header */}
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2 border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 font-black text-xs uppercase tracking-wider rounded-2xl border-2 border-b-3 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-1 transition-all cursor-pointer select-none"
                        >
                            <ChevronLeft className="w-4 h-4 stroke-[3]" /> {t('library.backToLibrary')}
                        </button>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            {!isEnglishMode && (
                                <button
                                    onClick={handleAddKanjiToSrs}
                                    disabled={isAddingKanji}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-2xl border-2 border-b-3 border-sky-300 dark:border-sky-800 font-black text-xs uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer select-none disabled:opacity-50"
                                    title={t('studyModes.addKanjiTooltip')}
                                >
                                    <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" /> {isAddingKanji ? t('common.adding') : t('studyModes.addKanjiToStudy')}
                                </button>
                            )}
                            <button
                                onClick={() => onEditSet && onEditSet(folderId)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl border-b-3 border-emerald-700 font-black text-xs uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer select-none shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" /> {t('vocab.addVocab')}
                            </button>
                            {/* Folder delete — or unfiled bulk delete */}
                            {folderId === 'unfiled' ? (
                                onDeleteCards && setCards.length > 0 && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border-2 border-b-3 border-rose-200 dark:border-rose-900 font-black text-xs uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer select-none"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> {t('vocab.deleteAllUnfiled')}
                                    </button>
                                )
                            ) : (
                                onDeleteFolder && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border-2 border-b-3 border-rose-200 dark:border-rose-900 font-black text-xs uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer select-none"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> {t('library.deleteSet')}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6 space-y-6 sm:space-y-8">
                    {setCards.length > 0 ? (
                        <>
                            <FlashcardPlayerSection
                                setCards={setCards}
                                cardSettings={cardSettings}
                                setShowSettingsMenu={setShowSettingsMenu}
                                onSaveCardAudio={onSaveCardAudio}
                                onUpdateCard={onUpdateCard}
                                onSaveChanges={onSaveChanges}
                            />
                            {/* Bảng trạng thái ghi nhớ (Mastery Status) - Compact Duolingo Style */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-4 border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs sm:text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                                            {t('vocab.vocabStatus')}
                                        </h3>
                                        <span className="hidden sm:inline text-[11px] font-bold text-slate-400">
                                            · {t('vocab.vocabStatusSub')}
                                        </span>
                                    </div>
                                    {/* Consolidated multi-segment progress bar */}
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <div className="flex-1 sm:w-56 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700 shadow-inner">
                                            <div
                                                style={{ width: `${masteryStats.memorizedPct}%` }}
                                                className="h-full bg-emerald-500 transition-all duration-500"
                                                title={`${t('vocab.memorized')}: ${masteryStats.memorizedPct}%`}
                                            />
                                            <div
                                                style={{ width: `${masteryStats.learningPct}%` }}
                                                className="h-full bg-amber-500 transition-all duration-500"
                                                title={`${t('vocab.learning')}: ${masteryStats.learningPct}%`}
                                            />
                                            <div
                                                style={{ width: `${masteryStats.notLearnedPct}%` }}
                                                className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500"
                                                title={`${t('vocab.notLearned')}: ${masteryStats.notLearnedPct}%`}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">
                                            {masteryStats.memorizedPct}% {t('vocab.memorized')}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    {/* Chưa học */}
                                    <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border-2 border-b-3 border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                                        <div className="min-w-0 pr-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight truncate">{t('vocab.notLearned')}</span>
                                            </div>
                                            <p className="text-base sm:text-lg font-black text-slate-850 dark:text-white leading-none mt-1">
                                                {masteryStats.notLearned} <span className="text-[10px] font-bold text-slate-400">{t('common.wordsUnit')}</span>
                                            </p>
                                        </div>
                                        <button
                                            disabled={masteryStats.notLearned === 0}
                                            onClick={() => openMasteryTest('not_learned', notLearnedCards)}
                                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white dark:bg-slate-800 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:border-sky-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer shrink-0 shadow-2xs"
                                            title={t('studyModes.reviewUnlearnedGroup', { defaultValue: 'Review unlearned cards' })}
                                        >
                                            <PlayCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                        </button>
                                    </div>

                                    {/* Đang học */}
                                    <div className="p-2 sm:p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border-2 border-b-3 border-amber-200 dark:border-amber-900/50 flex items-center justify-between shadow-2xs">
                                        <div className="min-w-0 pr-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                                <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight truncate">{t('vocab.learning')}</span>
                                            </div>
                                            <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 leading-none mt-1">
                                                {masteryStats.learning} <span className="text-[10px] font-bold text-slate-400">{t('common.wordsUnit')}</span>
                                            </p>
                                        </div>
                                        <button
                                            disabled={masteryStats.learning === 0}
                                            onClick={() => openMasteryTest('learning', learningCards)}
                                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white dark:bg-slate-800 border-2 border-b-3 border-amber-300 dark:border-amber-800/80 text-amber-500 hover:text-amber-600 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer shrink-0 shadow-2xs"
                                            title={t('studyModes.reviewLearningGroup', { defaultValue: 'Review learning cards' })}
                                        >
                                            <PlayCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                        </button>
                                    </div>

                                    {/* Đã nhớ */}
                                    <div className="p-2 sm:p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border-2 border-b-3 border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between shadow-2xs">
                                        <div className="min-w-0 pr-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight truncate">{t('vocab.memorized')}</span>
                                            </div>
                                            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">
                                                {masteryStats.memorized} <span className="text-[10px] font-bold text-slate-400">{t('common.wordsUnit')}</span>
                                            </p>
                                        </div>
                                        <button
                                            disabled={masteryStats.memorized === 0}
                                            onClick={() => openMasteryTest('memorized', memorizedCards)}
                                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white dark:bg-slate-800 border-2 border-b-3 border-emerald-300 dark:border-emerald-800/80 text-emerald-500 hover:text-emerald-600 hover:border-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer shrink-0 shadow-2xs"
                                            title={t('studyModes.reviewMasteredGroup', { defaultValue: 'Review mastered cards' })}
                                        >
                                            <PlayCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons - Compact Duolingo Study Modes */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                                {/* Chế độ 1: Thẻ ghi nhớ */}
                                {completedStates.flashcard ? (
                                    <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden group select-none min-h-[96px]">
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xs">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/40 flex items-center justify-center mb-1"><Layers className="w-4 h-4 text-sky-500" /></div>
                                        <span className="font-bold text-xs text-slate-400 dark:text-slate-500 text-center leading-tight">{t('studyModes.flashcards')}</span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-center leading-tight">{t('common.completed')}</span>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'flashcard');
                                                setCompletedStates(prev => ({ ...prev, flashcard: false }));
                                                setProgressStates(prev => ({ ...prev, flashcard: false }));
                                            }}
                                            className="mt-1 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-lg border-b-2 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-0 flex items-center gap-1 font-bold transition-all cursor-pointer"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> {t('common.redo')}
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onFlashcardSet(folderId)} className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 border-b-4 hover:border-sky-300 dark:hover:border-sky-700 active:translate-y-0.5 active:border-b-2 shadow-xs transition-all group relative cursor-pointer select-none min-h-[96px]">
                                        {progressStates.flashcard && (
                                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-sky-500 text-[8px] text-white font-black uppercase tracking-wider">
                                                {t('vocab.learning')}</div>
                                        )}
                                        <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/40 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform"><Layers className="w-4 h-4 text-sky-500" /></div>
                                        <span className="font-extrabold text-xs text-slate-900 dark:text-white text-center leading-tight line-clamp-1">{t('studyModes.flashcards')}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight line-clamp-1">{t('studyModes.flashcardSub')}</span>
                                    </button>
                                )}

                                {/* Chế độ 2: Học tập */}
                                {completedStates.study ? (
                                    <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden group select-none min-h-[96px]">
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xs">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center mb-1"><BookOpen className="w-4 h-4 text-emerald-500" /></div>
                                        <span className="font-bold text-xs text-slate-400 dark:text-slate-500 text-center leading-tight">{t('studyModes.learn')}</span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-center leading-tight">{t('common.completed')}</span>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'study');
                                                setCompletedStates(prev => ({ ...prev, study: false }));
                                                setProgressStates(prev => ({ ...prev, study: false }));
                                            }}
                                            className="mt-1 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-lg border-b-2 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-0 flex items-center gap-1 font-bold transition-all cursor-pointer"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> {t('common.redo')}
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onStudySet(folderId)} className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 border-b-4 hover:border-emerald-300 dark:hover:border-emerald-700 active:translate-y-0.5 active:border-b-2 shadow-xs transition-all group relative cursor-pointer select-none min-h-[96px]">
                                        {progressStates.study && (
                                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-[8px] text-white font-black uppercase tracking-wider">
                                                {t('vocab.learning')}</div>
                                        )}
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform"><BookOpen className="w-4 h-4 text-emerald-500" /></div>
                                        <span className="font-extrabold text-xs text-slate-900 dark:text-white text-center leading-tight line-clamp-1">{t('studyModes.learn')}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight line-clamp-1">{t('studyModes.learnSub')}</span>
                                    </button>
                                )}

                                {/* Chế độ 3: Nhập ý nghĩa */}
                                {completedStates.meaning_input ? (
                                    <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden group select-none min-h-[96px]">
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xs">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40 flex items-center justify-center mb-1"><Edit2 className="w-4 h-4 text-teal-600" /></div>
                                        <span className="font-bold text-xs text-slate-400 dark:text-slate-500 text-center leading-tight">{t('studyModes.meaning')}</span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-center leading-tight">{t('common.completed')}</span>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'meaning_input');
                                                setCompletedStates(prev => ({ ...prev, meaning_input: false }));
                                                setProgressStates(prev => ({ ...prev, meaning_input: false }));
                                            }}
                                            className="mt-1 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-lg border-b-2 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-0 flex items-center gap-1 font-bold transition-all cursor-pointer"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> {t('common.redo')}
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onMeaningSet(folderId)} className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 border-b-4 hover:border-teal-300 dark:hover:border-teal-700 active:translate-y-0.5 active:border-b-2 shadow-xs transition-all group relative cursor-pointer select-none min-h-[96px]">
                                        {progressStates.meaning_input && (
                                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-teal-500 text-[8px] text-white font-black uppercase tracking-wider">
                                                {t('vocab.learning')}</div>
                                        )}
                                        <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform"><Edit2 className="w-4 h-4 text-teal-600" /></div>
                                        <span className="font-extrabold text-xs text-slate-900 dark:text-white text-center leading-tight line-clamp-1">{t('studyModes.meaning')}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight line-clamp-1">{t('studyModes.meaningSub')}</span>
                                    </button>
                                )}

                                {/* Chế độ 4: Nghe Chép */}
                                {completedStates.dictation ? (
                                    <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden group select-none min-h-[96px]">
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xs">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center mb-1"><Headphones className="w-4 h-4 text-amber-500" /></div>
                                        <span className="font-bold text-xs text-slate-400 dark:text-slate-500 text-center leading-tight">{t('studyModes.dictation')}</span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-center leading-tight">{t('common.completed')}</span>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'dictation');
                                                setCompletedStates(prev => ({ ...prev, dictation: false }));
                                                setProgressStates(prev => ({ ...prev, dictation: false }));
                                            }}
                                            className="mt-1 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-lg border-b-2 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-0 flex items-center gap-1 font-bold transition-all cursor-pointer"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> {t('common.redo')}
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onDictationSet(folderId)} className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 border-b-4 hover:border-amber-300 dark:hover:border-amber-700 active:translate-y-0.5 active:border-b-2 shadow-xs transition-all group relative cursor-pointer select-none min-h-[96px]">
                                        {progressStates.dictation && (
                                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-[8px] text-white font-black uppercase tracking-wider">
                                                {t('vocab.learning')}</div>
                                        )}
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform"><Headphones className="w-4 h-4 text-amber-500" /></div>
                                        <span className="font-extrabold text-xs text-slate-900 dark:text-white text-center leading-tight line-clamp-1">{t('studyModes.dictation')}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight line-clamp-1">{t('studyModes.dictationSub')}</span>
                                    </button>
                                )}

                                {/* Chế độ 5: Câu ví dụ */}
                                {completedStates.example ? (
                                    <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden group select-none min-h-[96px]">
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xs">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-800/40 flex items-center justify-center mb-1"><FileText className="w-4 h-4 text-cyan-500" /></div>
                                        <span className="font-bold text-xs text-slate-400 dark:text-slate-500 text-center leading-tight">{t('studyModes.example')}</span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-center leading-tight">{t('common.completed')}</span>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'example');
                                                setCompletedStates(prev => ({ ...prev, example: false }));
                                                setProgressStates(prev => ({ ...prev, example: false }));
                                            }}
                                            className="mt-1 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-lg border-b-2 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-0 flex items-center gap-1 font-bold transition-all cursor-pointer"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> {t('common.redo')}
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onExampleSet(folderId)} className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 border-b-4 hover:border-cyan-300 dark:hover:border-cyan-700 active:translate-y-0.5 active:border-b-2 shadow-xs transition-all group relative cursor-pointer select-none min-h-[96px]">
                                        {progressStates.example && (
                                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-cyan-500 text-[8px] text-white font-black uppercase tracking-wider">
                                                {t('vocab.learning')}</div>
                                        )}
                                        <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-800/40 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform"><FileText className="w-4 h-4 text-cyan-500" /></div>
                                        <span className="font-extrabold text-xs text-slate-900 dark:text-white text-center leading-tight line-clamp-1">{t('studyModes.example')}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight line-clamp-1">{t('studyModes.exampleSub')}</span>
                                    </button>
                                )}

                                {/* Chế độ 6: Đồng nghĩa */}
                                {completedStates.synonym ? (
                                    <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden group select-none min-h-[96px]">
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xs">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center mb-1"><Users className="w-4 h-4 text-rose-500" /></div>
                                        <span className="font-bold text-xs text-slate-400 dark:text-slate-500 text-center leading-tight">{t('studyModes.synonymQuiz')}</span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-center leading-tight">{t('common.completed')}</span>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const userId = getAuth().currentUser?.uid;
                                                await resetStudyProgress(userId, folderId, 'synonym');
                                                setCompletedStates(prev => ({ ...prev, synonym: false }));
                                                setProgressStates(prev => ({ ...prev, synonym: false }));
                                            }}
                                            className="mt-1 text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-lg border-b-2 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-0 flex items-center gap-1 font-bold transition-all cursor-pointer"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> {t('common.redo')}
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onSynonymQuiz && onSynonymQuiz(folderId)} className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 border-b-4 hover:border-rose-300 dark:hover:border-rose-700 active:translate-y-0.5 active:border-b-2 shadow-xs transition-all group relative cursor-pointer select-none min-h-[96px]">
                                        {progressStates.synonym && (
                                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-[8px] text-white font-black uppercase tracking-wider">
                                                {t('vocab.learning')}</div>
                                        )}
                                        <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform"><Users className="w-4 h-4 text-rose-500" /></div>
                                        <span className="font-extrabold text-xs text-slate-900 dark:text-white text-center leading-tight line-clamp-1">{t('studyModes.synonymQuiz')}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight line-clamp-1">{t('studyModes.synonymQuizSub')}</span>
                                    </button>
                                )}
                            </div>

                            {/* Term List - Inline Editable */}
                            <div className="pt-2">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-sm sm:text-base font-black text-slate-850 dark:text-white uppercase tracking-wider">
                                            {t('studyModes.terms')}
                                        </h2>
                                        <span className="bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-2 border-sky-300 dark:border-sky-800 rounded-full px-2.5 py-0.5 text-xs font-black shadow-2xs">
                                            {filteredCards.length} / {setCards.length}
                                        </span>
                                    </div>

                                    {setCards.length > 5 && (
                                        <div className="relative w-full md:w-72">
                                            <input
                                                type="text"
                                                placeholder={t('common.searchVocabPlaceholder')}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-2xl pl-9 pr-4 py-2 text-xs sm:text-sm font-bold outline-none focus:border-sky-500 text-slate-850 dark:text-white transition-all shadow-xs"
                                            />
                                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        </div>
                                    )}
                                </div>

                                {filteredCards.length === 0 && searchQuery ? (
                                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-xs">
                                        <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                                            {language === 'vi' ? `Không tìm thấy từ vựng nào khớp với "${searchQuery}"` : `No vocabulary found matching "${searchQuery}"`}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {visibleCards.map((card, idx) => {
                                            const isExpanded = expandedCardIds.has(card.id);
                                            const cardIsKo = checkIsKoreanCard(card, isKoreanMode);
                                            const cardIsEng = !cardIsKo && checkIsEnglishCard(card, isEnglishMode);
                                            return (
                                                <div
                                                    key={card.id ? `${card.id}-${idx}` : idx}
                                                    onClick={() => toggleCardExpanded(card.id)}
                                                    className="flex flex-col bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 gap-3 hover:border-sky-400 dark:hover:border-sky-500 shadow-xs transition-all cursor-pointer"
                                                >
                                                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch">
                                                        <div className="flex-1 md:w-1/2 flex flex-col justify-center md:border-r-2 border-slate-100 dark:border-slate-800 md:pr-6">
                                                            <div className="font-bold text-lg text-slate-850 dark:text-white flex items-center gap-2 flex-wrap">
                                                                <InlineEditCell
                                                                    value={cardIsEng || cardIsKo ? card.front : (card.frontWithFurigana || card.front)}
                                                                    isJapanese={!cardIsEng && !cardIsKo}
                                                                    onSave={(v) => handleInlineSave(card, 'front', v)}
                                                                    className="text-lg font-black inline-block"
                                                                />
                                                                {cardIsKo ? (
                                                                    card.reading && (
                                                                        <div className="inline-flex items-center gap-1">
                                                                            <InlineEditCell
                                                                                value={card.reading}
                                                                                placeholder={t('vocab.addRomaja')}
                                                                                onSave={(v) => handleInlineSave(card, 'reading', v)}
                                                                                className="text-xs font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-xl border border-sky-200 dark:border-sky-800/60 inline-block min-w-[70px]"
                                                                            />
                                                                        </div>
                                                                    )
                                                                ) : cardIsEng ? (
                                                                    <div className="inline-flex items-center gap-1">
                                                                        <InlineEditCell
                                                                            value={formatIPA(card.ipa)}
                                                                            placeholder={t('vocab.addIpa')}
                                                                            onSave={(v) => handleInlineSave(card, 'ipa', v)}
                                                                            className="text-xs font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-xl border border-sky-200 dark:border-sky-800/60 inline-block min-w-[70px]"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    renderPitchAccent(card)
                                                                )}
                                                            </div>
                                                            {cardIsKo ? (
                                                                <div className="text-amber-700 dark:text-amber-400 text-sm mt-1 font-bold min-h-[1.5rem] flex items-center">
                                                                    <InlineEditCell
                                                                        value={card.sinoVietnamese || ''}
                                                                        placeholder={t('vocab.addHanhan')}
                                                                        onSave={(v) => handleInlineSave(card, 'sinoVietnamese', v)}
                                                                        className="text-sm font-bold inline-block min-w-[100px]"
                                                                    />
                                                                </div>
                                                            ) : !cardIsEng ? (
                                                                <div className="text-amber-700 dark:text-amber-400 text-sm mt-1 font-bold min-h-[1.5rem] flex items-center">
                                                                    <InlineEditCell
                                                                        value={card.sinoVietnamese || ''}
                                                                        placeholder={t('vocab.addHanviet')}
                                                                        onSave={(v) => handleInlineSave(card, 'sinoVietnamese', v)}
                                                                        className="text-sm font-bold inline-block min-w-[100px]"
                                                                    />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex-1 md:w-1/2 flex items-center justify-between gap-4">
                                                            <div className="flex-1 flex flex-col justify-center text-base sm:text-lg font-bold text-sky-700 dark:text-sky-300">
                                                                <InlineEditCell
                                                                    value={card.back}
                                                                    onSave={(v) => handleInlineSave(card, 'back', v)}
                                                                    className="text-base sm:text-lg font-bold text-sky-700 dark:text-sky-300"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {card.imageBase64 && (
                                                                    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-2xs border-2 border-slate-200 dark:border-slate-700">
                                                                        <img src={card.imageBase64} alt={card.front} className="w-full h-full object-cover" />
                                                                    </div>
                                                                )}
                                                                {card.audioBase64 && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); playAudio(card.audioBase64, card.front, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null); }}
                                                                        className="w-8 h-8 rounded-xl bg-sky-100 hover:bg-sky-200 border-2 border-b-3 border-sky-300 text-sky-600 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-400 flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-1 font-black shrink-0 cursor-pointer shadow-2xs"
                                                                    >
                                                                        <Volume2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setEditingCard(card); }}
                                                                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-b-3 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer shrink-0"
                                                                    title={t('vocab.editCard')}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                {onDeleteCard && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setCardToDelete(card);
                                                                        }}
                                                                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-b-3 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-1 cursor-pointer shrink-0"
                                                                        title={t('vocab.deleteCard')}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded details container */}
                                                    {isExpanded && (
                                                        <div className="mt-2 border-t-2 border-slate-100 dark:border-slate-800 pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                                                            {card.synonym && (
                                                                <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                                    <span className="font-black text-sky-600 shrink-0">{t('vocab.synonym')}:</span>
                                                                    <span className="font-japanese font-bold"><FuriganaText text={card.synonym} /></span>
                                                                </div>
                                                            )}
                                                            {card.nuance && (
                                                                <div className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-200 bg-amber-50 dark:bg-amber-950/20 border-2 border-b-3 border-amber-200 dark:border-amber-900/50 rounded-2xl p-2.5">
                                                                    <span className="text-amber-700 dark:text-amber-400 font-black shrink-0">💡 {t('vocab.nuance')}:</span>
                                                                    <span className="leading-relaxed font-bold">{card.nuance}</span>
                                                                </div>
                                                            )}
                                                            {(card.example || card.exampleMeaning) && (
                                                                <div className="space-y-1.5 mt-1">
                                                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">{t('vocab.exampleSentences')}:</div>
                                                                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-3 border-2 border-slate-100 dark:border-slate-800 space-y-2">
                                                                        {card.example ? (
                                                                            card.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                                                                const meaning = (card.exampleMeaning || '').split('\n')[idx]?.trim();
                                                                                return (
                                                                                    <div key={idx} className="relative group/ex border-l-3 border-sky-400 dark:border-sky-500 pl-3 pr-8">
                                                                                        <div className="text-xs sm:text-sm text-slate-850 dark:text-slate-200 font-japanese leading-relaxed font-bold">
                                                                                            <FuriganaText text={ex} />
                                                                                        </div>
                                                                                        {meaning && (
                                                                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5 font-medium">{meaning}</div>
                                                                                        )}
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                speakExampleSentence(ex);
                                                                                            }}
                                                                                            className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                                                            title={language === 'vi' ? 'Nghe câu ví dụ' : 'Play example sentence audio'}
                                                                                        >
                                                                                            <Volume2 className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            card.exampleMeaning && (
                                                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic font-medium">{card.exampleMeaning}</p>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* SRS Toggle Footer */}
                                                    <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-2.5 flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            {card.srsEnabled !== false ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                                        {t('srs.title')} · {getSrsCycleLabel(card, t)}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                                                                    {t('srs.title')}
                                                                </span>
                                                            )}
                                                            {/* Duolingo tactile toggle switch */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onToggleSrs && onToggleSrs(card.id, !(card.srsEnabled !== false)); }}
                                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${card.srsEnabled !== false ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                                role="switch"
                                                                aria-checked={card.srsEnabled !== false}
                                                            >
                                                                <span
                                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${card.srsEnabled !== false ? 'translate-x-4' : 'translate-x-0'}`}
                                                                />
                                                            </button>
                                                        </div>

                                                        {/* Toggle details button */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleCardExpanded(card.id); }}
                                                            className="flex items-center gap-1 text-xs font-black text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors uppercase tracking-wider"
                                                        >
                                                            {isExpanded ? (
                                                                <>{t('common.collapse')} <ChevronUp className="w-3.5 h-3.5 stroke-[3]" /></>
                                                            ) : (
                                                                <>{t('common.viewDetails')} <ChevronDown className="w-3.5 h-3.5 stroke-[3]" /></>
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
                                            className="px-6 py-2.5 bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 hover:border-sky-400 text-sky-600 dark:text-sky-400 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xs active:translate-y-0.5 active:border-b-2 cursor-pointer inline-flex items-center gap-2"
                                        >
                                            {t('vocab.loadMoreCards', { count: filteredCards.length - visibleCount })}
                                            <ChevronDown className="w-4 h-4 stroke-[3]" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700">
                            <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('vocab.emptySet')}</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">{t('vocab.emptySetSub')}</p>
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                {folderId !== 'unfiled' && (
                                    <button
                                        onClick={handleSyncFromSourceLesson}
                                        disabled={isSyncingFromLesson}
                                        className="px-6 py-3 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-amber-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isSyncingFromLesson ? 'animate-spin' : ''}`} />
                                        {isSyncingFromLesson ? t('common.loading') : t('books.syncFromBook')}
                                    </button>
                                )}
                                <button onClick={folderId !== 'unfiled' ? () => onEditSet(folderId) : onNavigateToAdd} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none">
                                    <Plus className="w-4 h-4" /> {folderId !== 'unfiled' ? t('vocab.addVocabNow') : t('library.newSet')}
                                </button>
                            </div>
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
                                {t('studyModes.selectReviewMode')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {language === 'vi' ? 'Ôn tập' : 'Review'} {showMasteryModal.cards.length} {language === 'vi' ? 'từ ở trạng thái' : 'cards in state'} <span className="font-bold text-blue-600 dark:text-blue-400">
                                    {showMasteryModal.status === 'not_learned' ? t('vocab.notLearned') :
                                        showMasteryModal.status === 'learning' ? t('vocab.learning') :
                                            showMasteryModal.status === 'memorized' ? t('vocab.memorized') : (t('vocab.notLearned') + ' & ' + t('vocab.learning'))}
                                </span>
                            </p>
                        </div>

                        {/* List of 4 study modes */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSelectedMasteryMode('flashcard')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'flashcard' ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Layers className="w-6 h-6" />
                                <span className="font-bold text-xs">{t('studyModes.flashcards')}</span>
                            </button>

                            <button
                                onClick={() => setSelectedMasteryMode('study')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'study' ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                            >
                                <BookOpen className="w-6 h-6" />
                                <span className="font-bold text-xs">{t('studyModes.learn')}</span>
                            </button>

                            <button
                                onClick={() => setSelectedMasteryMode('meaning')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'meaning' ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Edit2 className="w-6 h-6" />
                                <span className="font-bold text-xs">{t('studyModes.meaning')}</span>
                            </button>

                            <button
                                onClick={() => setSelectedMasteryMode('dictation')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMasteryMode === 'dictation' ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Headphones className="w-6 h-6" />
                                <span className="font-bold text-xs">{t('studyModes.dictation')}</span>
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowMasteryModal(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleStartMasteryTest}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md cursor-pointer"
                            >
                                {t('studyModes.startReview')}
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
                                    {folderId === 'unfiled' ? t('vocab.deleteAllUnfiled') : t('library.deleteSet')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.cannotUndo')}</p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                            {folderId === 'unfiled'
                                ? (language === 'vi' ? <>Xoá vĩnh viễn <strong className="text-red-500">{setCards.length} từ vựng lẻ</strong>? Thao tác này không thể hoàn tác.</> : <>Permanently delete <strong className="text-red-500">{setCards.length} unfiled cards</strong>? This cannot be undone.</>)
                                : (language === 'vi' ? <>Xoá <strong>"{folder.name}"</strong>? Toàn bộ từ vựng trong học phần này cũng sẽ bị xoá vĩnh viễn.</> : <>Delete <strong>"{folder.name}"</strong>? All cards in this set will be permanently removed.</>)
                            }
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">{t('common.cancel')}</button>
                            <button
                                onClick={folderId === 'unfiled' ? handleDeleteUnfiledCards : handleDeleteFolder}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
                            >{t('common.delete')}</button>
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
                                    {t('vocab.deleteCard')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.cannotUndo')}</p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                            {language === 'vi' ? <>Bạn có chắc chắn muốn xoá từ vựng <strong className="text-red-500">"{cardToDelete.front}"</strong> khỏi học phần này?</> : <>Are you sure you want to delete <strong className="text-red-500">"{cardToDelete.front}"</strong> from this set?</>}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setCardToDelete(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">{t('common.cancel')}</button>
                            <button
                                onClick={() => {
                                    onDeleteCard(cardToDelete.id, cardToDelete.front);
                                    setCardToDelete(null);
                                }}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
                            >{t('common.delete')}</button>
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
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-gray-800 dark:text-white">
                                    {t('kanji.addKanjiToReview')}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {t('library.studySet')}: {folder.name}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                                    <span className="block text-gray-400 dark:text-gray-500 font-semibold mb-0.5">{t('kanji.totalKanji')}</span>
                                    <span className="text-base font-extrabold text-slate-700 dark:text-white">{kanjiPreviewModal.allExtractedCount} {t('kanji.charactersUnit')}</span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-150 dark:border-slate-700/50">
                                    <span className="block text-gray-400 dark:text-gray-500 font-semibold mb-0.5">{t('kanji.alreadyLearned')}</span>
                                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-450">{kanjiPreviewModal.existingCount} {t('kanji.charactersUnit')}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-550 dark:text-gray-400">
                                        {t('kanji.selectCharactersToAdd')} ({kanjiPreviewModal.selectedIds.size}/{kanjiPreviewModal.newKanji.length} {t('kanji.charactersUnit')}):
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
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                                    >
                                        {kanjiPreviewModal.selectedIds.size === kanjiPreviewModal.newKanji.length ? t('common.deselectAll') : t('common.selectAll')}
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
                                                className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-xl font-japanese shadow-sm transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer ${isSelected
                                                    ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-400 scale-100 ring-2 ring-blue-500/15'
                                                    : 'bg-white border-gray-200 text-gray-400 dark:bg-slate-800/60 dark:border-slate-700/60 opacity-40 line-through'
                                                    }`}
                                                title={isSelected ? t('kanji.clickToDeselect') : t('kanji.clickToSelect')}
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
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleConfirmAddKanji}
                                disabled={isAddingKanji || kanjiPreviewModal.selectedIds.size === 0}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md cursor-pointer"
                            >
                                {isAddingKanji ? t('common.saving') : `${t('common.confirmSave')} (${kanjiPreviewModal.selectedIds.size})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Flashcard Settings Modal */}
            <VocabCardSettingsModal
                isOpen={showSettingsMenu}
                onClose={() => setShowSettingsMenu(false)}
                cardSettings={cardSettings}
                setCardSettings={setCardSettings}
                isKoreanMode={isKoreanMode}
                isEnglishMode={isEnglishMode}
            />

            {editingCard && (
                <EditCardModal
                    card={editingCard}
                    onSave={async (updatedCardData) => {
                        if (onSaveChanges) await onSaveChanges(updatedCardData);
                        setEditingCard(null);
                    }}
                    onClose={() => setEditingCard(null)}
                    onGeminiAssist={onGeminiAssist}
                    canUserUseAI={canUserUseAI}
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
