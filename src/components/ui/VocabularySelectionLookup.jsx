import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, Sparkle, BookOpen, Plus, Loader2, X, ChevronDown, Check, AlertCircle, Crown, Folder, ArrowLeft, AlertTriangle } from 'lucide-react';
import PremiumLockedModal from './PremiumLockedModal';
import { aiAssistVocab, aiTranslateSentence } from '../../utils/aiProvider';
import { getSinoVietnamese } from '../../utils/kanjiHVLookup';
import { ensureFuriganaFormat } from '../../utils/furiganaHelper';
import { playAudio } from '../../utils/audio';
import { convertToDictionaryForm } from '../../utils/textProcessing';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Helper to format Japanese readings: e.g. "日本語（にほんご）" -> "日本語 (にほんご)"
const formatReading = (text) => {
    if (!text) return '';
    return text.replace(/（/g, ' (').replace(/）/g, ')');
};

const isLongSentence = (text) => {
    if (!text) return false;
    const cleanText = text.trim();
    return cleanText.length > 12 ||
        cleanText.includes('。') ||
        cleanText.includes('、') ||
        cleanText.includes('？') ||
        cleanText.includes('！') ||
        cleanText.includes('\n');
};

// Helper to check if a node is partially or fully inside a range
const isNodeInSelection = (range, node) => {
    if (!range || !node) return false;
    try {
        const nodeRange = document.createRange();
        nodeRange.selectNode(node);

        const endToStart = range.compareBoundaryPoints(Range.END_TO_START, nodeRange);
        const startToEnd = range.compareBoundaryPoints(Range.START_TO_END, nodeRange);

        return endToStart <= 0 && startToEnd >= 0;
    } catch (e) {
        return false;
    }
};

// Helper function to extract selected text while ignoring Furigana (<rt>, <rp> elements)
const getSelectedTextClean = (selection) => {
    if (!selection || selection.rangeCount === 0) return '';
    try {
        const range = selection.getRangeAt(0);
        if (range.collapsed) return '';

        const clone = range.cloneContents();

        // Remove furigana elements (<rt> and <rp>) from the cloned fragment
        const rts = clone.querySelectorAll('rt, rp');
        rts.forEach(el => el.remove());

        let cleaned = clone.textContent || '';

        // If there's any fallback parenthesized furigana remaining (e.g. 漢字（かんじ）), strip it out
        cleaned = cleaned.replace(/([\u4E00-\u9FAF\u3400-\u4DBF]+)[（\(\[].*?[）\)\]]/g, '$1');

        return cleaned.trim();
    } catch (e) {
        console.warn('Failed to parse selection with DOM clone:', e);
        try {
            return selection.toString().trim().replace(/([\u4E00-\u9FAF\u3400-\u4DBF]+)[（\(\[].*?[）\)\]]/g, '$1');
        } catch (err) {
            return '';
        }
    }
};


const VocabularySelectionLookup = ({ allCards = [], folders = [], handleAddCard, setNotification, disabled, isPremiumUnlocked }) => {
    const [pendingWord, setPendingWord] = useState('');
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    useEffect(() => {
        if (disabled) {
            setShowButton(false);
            setShowDetails(false);
            setPendingWord('');
            setAiResult(null);
            setError('');
            setSavedSuccessfully(false);
        }
    }, [disabled]);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [showButton, setShowButton] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [loading, setLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [error, setError] = useState('');

    // Save to folder state
    const [selectedFolderId, setSelectedFolderId] = useState('unfiled');
    const [saving, setSaving] = useState(false);
    const [savedSuccessfully, setSavedSuccessfully] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [selectedModalFolderId, setSelectedModalFolderId] = useState(null);

    const popupRef = useRef(null);
    const cardRef = useRef(null);
    const triggerRef = useRef(null);
    const [horizontalOffset, setHorizontalOffset] = useState(0);
    const [placeBelow, setPlaceBelow] = useState(false);
    const [maxHeight, setMaxHeight] = useState('85vh');

    // Get Sino-Vietnamese reading for the selected text locally if it has Kanji
    const localSinoVietnamese = useMemo(() => {
        if (!pendingWord) return '';
        return getSinoVietnamese(pendingWord) || '';
    }, [pendingWord]);

    // Check if the word already exists in the user's dictionary
    const localMatch = useMemo(() => {
        if (!pendingWord) return null;
        const cleanWord = pendingWord.toLowerCase().trim();
        return allCards.find(c => {
            const fClean = (c.front || '').split('（')[0].split('(')[0].toLowerCase().trim();
            const bClean = (c.back || '').toLowerCase().trim();
            return fClean === cleanWord || bClean === cleanWord;
        });
    }, [pendingWord, allCards]);

    useEffect(() => {
        const handleMouseUp = (e) => {
            if (disabled) return;
            // Ignore if clicking inside our own popup
            if (popupRef.current && popupRef.current.contains(e.target)) {
                return;
            }

            // Small timeout to ensure window.getSelection() is populated
            setTimeout(() => {
                const selection = window.getSelection();
                const rawText = getSelectedTextClean(selection);
                const text = isLongSentence(rawText) ? rawText : convertToDictionaryForm(rawText);

                // Only trigger if selection contains Japanese characters and is between 1 and 300 characters (typical word/phrase/sentence length)
                const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(text);
                if (hasJapanese && text && text.length > 0 && text.length <= 300) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();

                    const isFullscreen = !!document.fullscreenElement;
                    const scrollX = isFullscreen ? 0 : window.scrollX;
                    const scrollY = isFullscreen ? 0 : window.scrollY;

                    // Position popup above the middle of selection
                    setPopupPosition({
                        x: rect.left + rect.width / 2 + scrollX,
                        y: rect.top + scrollY,
                        height: rect.height,
                        rectTop: rect.top,
                        rectBottom: rect.bottom
                    });

                    setPendingWord(text);
                    setShowButton(true);

                    // Keep details hidden until they click "Tra từ"
                    if (!showDetails) {
                        setAiResult(null);
                        setError('');
                        setSavedSuccessfully(false);
                    }
                } else {
                    // Close the popup trigger if they click somewhere else without selection
                    if (!showDetails) {
                        setShowButton(false);
                        setPendingWord('');
                    }
                }
            }, 80);
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchend', handleMouseUp, { passive: true });
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [showDetails, disabled]);


    // Close everything when clicking completely outside of popup when details are open
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (disabled) return;
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                // Ensure selection is actually gone
                const selection = window.getSelection();
                const text = getSelectedTextClean(selection);
                if (!text) {
                    setShowButton(false);
                    setShowDetails(false);
                    setAiResult(null);
                    setPendingWord('');
                    setError('');
                    setSavedSuccessfully(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [disabled]);

    // Intercept copy event to strip furigana cleanly when copying text
    useEffect(() => {
        const handleCopy = (e) => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                const cleanedText = getSelectedTextClean(selection);
                if (cleanedText) {
                    // Check if selection contains any ruby text to prevent intercepting normal copy
                    let hasRuby = false;
                    try {
                        const range = selection.getRangeAt(0);
                        const clone = range.cloneContents();
                        hasRuby = clone.querySelector('ruby') !== null;
                    } catch (err) {
                        // Fallback check
                        if (selection.anchorNode && selection.anchorNode.parentElement) {
                            hasRuby = selection.anchorNode.parentElement.closest('ruby') !== null;
                        }
                    }

                    if (hasRuby) {
                        e.clipboardData.setData('text/plain', cleanedText);
                        e.preventDefault(); // Override standard browser copy behavior
                    }
                }
            }
        };

        document.addEventListener('copy', handleCopy);
        return () => document.removeEventListener('copy', handleCopy);
    }, []);

    // Update selection coordinate position dynamically on scroll, resize or pinch zoom (visual viewport)
    useEffect(() => {
        if (disabled) return;
        if (!showButton && !showDetails) return;

        const updatePosition = () => {
            try {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                if (range.collapsed) return;

                const rect = range.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) return;

                const isFullscreen = !!document.fullscreenElement;
                const scrollX = isFullscreen ? 0 : window.scrollX;
                const scrollY = isFullscreen ? 0 : window.scrollY;

                setPopupPosition({
                    x: rect.left + rect.width / 2 + scrollX,
                    y: rect.top + scrollY,
                    height: rect.height,
                    rectTop: rect.top,
                    rectBottom: rect.bottom
                });
            } catch (err) {
                console.warn('Error updating selection lookup position:', err);
            }
        };

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, { capture: true, passive: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updatePosition);
            window.visualViewport.addEventListener('scroll', updatePosition);
        }

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, { capture: true });
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updatePosition);
                window.visualViewport.removeEventListener('scroll', updatePosition);
            }
        };
    }, [showButton, showDetails, disabled]);

    // Keep popup fully within screen boundaries
    useEffect(() => {
        const isFullscreen = !!document.fullscreenElement;
        const scrollX = isFullscreen ? 0 : window.scrollX;
        const scrollY = isFullscreen ? 0 : window.scrollY;

        if (showDetails && cardRef.current) {
            const cardEl = cardRef.current;
            const rect = cardEl.getBoundingClientRect();
            const cardWidth = rect.width || 320;
            const cardHeight = cardEl.scrollHeight || 400; // Use scrollHeight to avoid layout feedback loop

            const currentViewportX = popupPosition.x - scrollX;
            const currentLeft = currentViewportX - cardWidth / 2;
            const currentRight = currentViewportX + cardWidth / 2;

            let newOffset = 0;
            const padding = 12; // safe margin from viewport edges

            if (currentLeft < padding) {
                newOffset = padding - currentLeft;
            } else if (currentRight > window.innerWidth - padding) {
                newOffset = (window.innerWidth - padding) - currentRight;
            }

            setHorizontalOffset(newOffset);

            const selectionTop = popupPosition.rectTop !== undefined ? popupPosition.rectTop : (popupPosition.y - scrollY);
            const selectionBottom = popupPosition.rectBottom !== undefined ? popupPosition.rectBottom : (selectionTop + (popupPosition.height || 0));

            const spaceAbove = selectionTop - padding;
            const spaceBelow = window.innerHeight - selectionBottom - padding;

            // Determine placement above or below, and enforce maxHeight to prevent screen overflow
            if (spaceAbove >= cardHeight) {
                setPlaceBelow(false);
                setMaxHeight('85vh');
            } else if (spaceBelow >= cardHeight) {
                setPlaceBelow(true);
                setMaxHeight('85vh');
            } else {
                // Not enough space in either direction, place where there is more space and constrain maxHeight
                if (spaceBelow > spaceAbove) {
                    setPlaceBelow(true);
                    const maxPossibleHeight = spaceBelow - 16;
                    setMaxHeight(`${Math.max(120, maxPossibleHeight)}px`);
                } else {
                    setPlaceBelow(false);
                    const maxPossibleHeight = spaceAbove - 16;
                    setMaxHeight(`${Math.max(120, maxPossibleHeight)}px`);
                }
            }
        } else if (showButton && triggerRef.current) {
            const btnEl = triggerRef.current;
            const rect = btnEl.getBoundingClientRect();
            const btnWidth = rect.width || 150;

            const currentViewportX = popupPosition.x - scrollX;
            const currentLeft = currentViewportX - btnWidth / 2;
            const currentRight = currentViewportX + btnWidth / 2;

            let newOffset = 0;
            const padding = 12;

            if (currentLeft < padding) {
                newOffset = padding - currentLeft;
            } else if (currentRight > window.innerWidth - padding) {
                newOffset = (window.innerWidth - padding) - currentRight;
            }
            setHorizontalOffset(newOffset);
            setPlaceBelow(false);
            setMaxHeight('85vh');
        } else {
            setHorizontalOffset(0);
            setPlaceBelow(false);
            setMaxHeight('85vh');
        }
    }, [showDetails, showButton, pendingWord, aiResult, loading, error, popupPosition]);

    const handlePlayAudio = (e) => {
        e.stopPropagation();
        if (pendingWord) {
            playAudio(null, pendingWord);
        }
    };

    const handleLookup = async (e) => {
        e.stopPropagation();
        if (!isPremiumUnlocked) {
            setShowPremiumModal(true);
            return;
        }
        setShowButton(false); // Hide the small button
        setShowDetails(true); // Open the details card
        setLoading(true);
        setError('');
        setAiResult(null);
        setSavedSuccessfully(false);

        try {
            if (isLongSentence(pendingWord)) {
                const translation = await aiTranslateSentence(pendingWord);
                if (translation && translation.translation) {
                    setAiResult({
                        isSentence: true,
                        meaning: translation.translation,
                        grammarNotes: translation.grammarNotes || []
                    });
                } else {
                    setError('Không thể dịch câu này.');
                }
            } else {
                // Check shared dictionary first
                const normalizedKey = pendingWord.split('（')[0].split('(')[0].trim().toLowerCase();
                const docRef = doc(db, 'sharedVocabulary', normalizedKey);
                let fetchedResult = null;

                try {
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        fetchedResult = {
                            frontWithFurigana: data.front || data.frontWithFurigana || pendingWord,
                            meaning: data.back || data.meaning || '',
                            synonym: data.synonym || '',
                            sinoVietnamese: data.sinoVietnamese || '',
                            synonymSinoVietnamese: data.synonymSinoVietnamese || '',
                            example: data.example || '',
                            exampleMeaning: data.exampleMeaning || '',
                            nuance: data.nuance || '',
                            pos: data.pos || '',
                            level: data.level || '',
                            isShared: true,
                            reportedError: data.reportedError || false
                        };
                        console.log('📚 Found shared dictionary match:', fetchedResult);
                    }
                } catch (dbErr) {
                    console.warn('Error reading from sharedVocabulary:', dbErr);
                }

                if (fetchedResult) {
                    // Standardize front and synonym with ensureFuriganaFormat
                    const oldFront = fetchedResult.frontWithFurigana;
                    const oldSynonym = fetchedResult.synonym;
                    const oldSino = fetchedResult.sinoVietnamese;

                    fetchedResult.frontWithFurigana = await ensureFuriganaFormat(fetchedResult.frontWithFurigana);
                    if (fetchedResult.synonym) {
                        fetchedResult.synonym = await ensureFuriganaFormat(fetchedResult.synonym);
                    }
                    if (!fetchedResult.sinoVietnamese && fetchedResult.frontWithFurigana) {
                        const lookupSino = getSinoVietnamese(fetchedResult.frontWithFurigana);
                        if (lookupSino) {
                            fetchedResult.sinoVietnamese = lookupSino;
                        }
                    }

                    // If changed, save back to sharedVocabulary
                    if (fetchedResult.frontWithFurigana !== oldFront || fetchedResult.synonym !== oldSynonym || fetchedResult.sinoVietnamese !== oldSino) {
                        try {
                            await setDoc(docRef, {
                                front: fetchedResult.frontWithFurigana,
                                back: fetchedResult.meaning,
                                synonym: fetchedResult.synonym,
                                sinoVietnamese: fetchedResult.sinoVietnamese,
                                synonymSinoVietnamese: fetchedResult.synonymSinoVietnamese || '',
                                example: fetchedResult.example || '',
                                exampleMeaning: fetchedResult.exampleMeaning || '',
                                nuance: fetchedResult.nuance || '',
                                pos: fetchedResult.pos || '',
                                level: fetchedResult.level || '',
                                updatedAt: Date.now()
                            }, { merge: true });
                            console.log('📚 Auto-healed and updated sharedVocabulary in lookup:', normalizedKey);
                        } catch (saveErr) {
                            console.warn('Error saving healed sharedVocab:', saveErr);
                        }
                    }

                    setAiResult(fetchedResult);
                } else {
                    const result = await aiAssistVocab(pendingWord);
                    if (result) {
                        setAiResult(result);
                        // Save to shared dictionary so other users can fetch it
                        try {
                            await setDoc(docRef, {
                                front: result.frontWithFurigana || pendingWord,
                                back: result.meaning || '',
                                synonym: result.synonym || '',
                                sinoVietnamese: result.sinoVietnamese || '',
                                synonymSinoVietnamese: result.synonymSinoVietnamese || '',
                                example: result.example || '',
                                exampleMeaning: result.exampleMeaning || '',
                                nuance: result.nuance || '',
                                pos: result.pos || '',
                                level: result.level || '',
                                updatedAt: Date.now()
                            }, { merge: true });
                            console.log('📚 Saved vocabulary to sharedVocabulary:', normalizedKey);
                        } catch (saveErr) {
                            console.warn('Error saving to sharedVocabulary:', saveErr);
                        }
                    } else {
                        setError('Không thể tra cứu từ vựng này bằng AI.');
                    }
                }
            }
        } catch (err) {
            console.error('Selection lookup error:', err);
            setError(err.message || 'Lỗi kết nối máy chủ AI.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFolderModal = (e) => {
        e.stopPropagation();
        setShowFolderModal(true);
        setSelectedModalFolderId(null);
    };

    const handleReportError = async (e) => {
        e.stopPropagation();
        if (!aiResult || !aiResult.isShared) return;
        const normalizedKey = pendingWord.split('（')[0].split('(')[0].trim().toLowerCase();
        const docRef = doc(db, 'sharedVocabulary', normalizedKey);
        try {
            await updateDoc(docRef, { reportedError: true });
            if (setNotification) {
                setNotification("Cảm ơn bạn! Đã gửi báo cáo lỗi từ vựng đến hệ thống.");
            }
            setAiResult(prev => prev ? { ...prev, reportedError: true } : null);
        } catch (err) {
            console.error("Error reporting vocabulary:", err);
            if (setNotification) {
                setNotification("Lỗi khi báo cáo: " + err.message);
            }
        }
    };

    const handleConfirmSave = async (folderId) => {
        setShowFolderModal(false);
        setSelectedModalFolderId(null);
        if (!pendingWord || !handleAddCard) return;

        setSaving(true);
        try {
            // Extract values to save
            const rawFront = aiResult?.frontWithFurigana || pendingWord;
            const front = await ensureFuriganaFormat(rawFront);
            const back = aiResult?.meaning || localMatch?.back || '';
            const rawSynonym = aiResult?.synonym || localMatch?.synonym || '';
            const synonym = rawSynonym ? await ensureFuriganaFormat(rawSynonym) : '';
            const example = aiResult?.example || localMatch?.example || '';
            const exampleMeaning = aiResult?.exampleMeaning || localMatch?.exampleMeaning || '';
            const nuance = aiResult?.nuance || localMatch?.nuance || '';
            const pos = aiResult?.pos || localMatch?.pos || '';
            const level = aiResult?.level || localMatch?.level || '';
            const sinoVietnamese = aiResult?.sinoVietnamese || localSinoVietnamese || '';
            const synonymSinoVietnamese = aiResult?.synonymSinoVietnamese || '';

            const success = await handleAddCard({
                front,
                back,
                synonym,
                example,
                exampleMeaning,
                nuance,
                pos,
                level,
                sinoVietnamese,
                synonymSinoVietnamese,
                folderId: folderId,
                action: 'keep' // Keep screen state as is
            });

            if (success) {
                setSavedSuccessfully(true);
                if (setNotification) {
                    setNotification(`Đã thêm "${front.split('（')[0]}" vào thư viện từ vựng!`);
                }
            }
        } catch (err) {
            console.error('Save card from lookup error:', err);
            if (setNotification) {
                setNotification('Không thể lưu từ vựng.');
            }
        } finally {
            setSaving(false);
        }
    };

    // Close lookup popups manually
    const handleCloseAll = (e) => {
        e.stopPropagation();
        setShowButton(false);
        setShowDetails(false);
        setPendingWord('');
        setAiResult(null);
        setError('');
        setSavedSuccessfully(false);

        // Clear window selection
        try {
            window.getSelection().removeAllRanges();
        } catch (err) { }
    };

    if (disabled || !pendingWord) return null;

    const target = (typeof document !== 'undefined' && (document.fullscreenElement || document.body)) || null;
    if (!target) return null;

    return createPortal(
        <div
            ref={popupRef}
            className="absolute z-[9999] select-none font-sans"
            style={{
                left: `${popupPosition.x}px`,
                top: `${popupPosition.y}px`
            }}
        >
            {/* 1. Small Floating Trigger Button */}
            {showButton && !showDetails && (
                <button
                    ref={triggerRef}
                    onClick={handleLookup}
                    className="backdrop-blur-md bg-indigo-600/95 dark:bg-indigo-500/95 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-full px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-[0_8px_24px_rgba(99,102,241,0.4)] transition-all transform hover:scale-105 active:scale-95 duration-200 absolute -translate-x-1/2 -translate-y-full mb-3 cursor-pointer whitespace-nowrap animate-fade-in"
                    style={{ left: `${horizontalOffset}px` }}
                >
                    {isPremiumUnlocked ? (
                        <Sparkle className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                    ) : (
                        <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    )}
                    <span>Tra cứu: "{pendingWord.length > 15 ? pendingWord.substring(0, 15) + '...' : pendingWord}"</span>
                </button>
            )}

            {/* 2. Vocabulary Details Card */}
            {showDetails && (
                <div
                    ref={cardRef}
                    className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl p-5 w-80 md:w-96 absolute -translate-x-1/2 animate-fade-in text-slate-800 dark:text-slate-200 ${placeBelow ? 'translate-y-0 mt-2' : '-translate-y-full mb-4'}`}
                    style={{
                        left: `${horizontalOffset}px`,
                        top: placeBelow ? `${(popupPosition.height || 0) + 8}px` : undefined,
                        maxHeight: maxHeight,
                        overflowY: 'auto'
                    }}
                >
                    {/* Header: Title and controls */}
                    <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-japanese">
                                        {aiResult?.isSentence ? "Dịch câu dài" : formatReading(aiResult?.frontWithFurigana || localMatch?.frontWithFurigana || localMatch?.front || pendingWord)}
                                    </h3>
                                    <button
                                        onClick={handlePlayAudio}
                                        className="p-1.5 rounded-lg bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                                        title="Phát âm tiếng Nhật"
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Sino Vietnamese or Reading */}
                                {!aiResult?.isSentence && (localSinoVietnamese || aiResult?.sinoVietnamese) && (
                                    <p className="text-xs font-bold text-pink-500 mt-0.5 tracking-wide uppercase">
                                        Hán Việt: {aiResult?.sinoVietnamese || localSinoVietnamese}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handleCloseAll}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Adjust Selection / Search Term Input */}
                        <div className="flex gap-1.5 items-center w-full">
                            <input
                                type="text"
                                value={pendingWord}
                                onChange={(e) => setPendingWord(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleLookup(e);
                                    }
                                }}
                                placeholder="Sửa lại từ cần tra..."
                                className="flex-1 px-2.5 py-1 text-xs font-bold font-japanese border border-slate-200 dark:border-slate-700/60 rounded-xl bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                                onClick={handleLookup}
                                disabled={loading}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                                Tra lại
                            </button>
                        </div>
                    </div>

                    {/* Content Section */}
                    {loading && (
                        <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                            <span className="text-xs font-bold animate-pulse">AI đang tra cứu nghĩa chi tiết...</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-start gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Lỗi tra cứu AI</p>
                                <p className="opacity-90 mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Local Match Badge */}
                    {!aiResult?.isSentence && localMatch && !loading && !aiResult && (
                        <div className="mb-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-full text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                                <BookOpen className="w-3 h-3" />
                                <span>Có trong thư viện của bạn</span>
                            </div>

                            <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850/60 text-xs">
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Ý nghĩa:</span>
                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{localMatch.back}</span>
                                </div>
                                {localMatch.example && (
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Ví dụ:</span>
                                        <p className="font-japanese text-sm text-slate-800 dark:text-slate-200 font-bold mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: localMatch.example }} />
                                        {localMatch.exampleMeaning && (
                                            <p className="text-slate-500 italic leading-relaxed">{localMatch.exampleMeaning}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleLookup}
                                className="w-full mt-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Sparkle className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                Tra cứu mở rộng bằng AI
                            </button>
                        </div>
                    )}

                    {/* AI Lookup Results */}
                    {aiResult && !loading && (
                        <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350">
                            {aiResult.isSentence ? (
                                <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/30">
                                    <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block mb-1.5">Bản dịch:</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed font-sans">{aiResult.meaning}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Badges row */}
                                    <div className="flex gap-2">
                                        {aiResult.pos && (
                                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/40 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                                                {aiResult.pos}
                                            </span>
                                        )}
                                        {aiResult.level && (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-100/50 dark:border-amber-900/40 text-[10px] font-black text-amber-600 dark:text-amber-400">
                                                {aiResult.level}
                                            </span>
                                        )}
                                    </div>

                                    {/* Meaning */}
                                    <div className="p-3 bg-indigo-50/40 dark:bg-slate-950/40 rounded-xl border border-indigo-100/30 dark:border-slate-850/60">
                                        <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider block mb-1">Ý nghĩa:</span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">{aiResult.meaning}</span>
                                    </div>

                                    {/* Nuance / context */}
                                    {aiResult.nuance && (
                                        <div className="px-1">
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Sắc thái / Cách dùng:</span>
                                            <p className="leading-relaxed font-medium text-slate-700 dark:text-slate-300">{aiResult.nuance}</p>
                                        </div>
                                    )}

                                    {/* Example */}
                                    {aiResult.example && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-850/40">
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Câu ví dụ:</span>
                                            <p
                                                className="font-japanese text-sm text-slate-850 dark:text-slate-100 font-bold mb-1 leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: aiResult.example }}
                                            />
                                            {aiResult.exampleMeaning && (
                                                <p className="text-slate-500 dark:text-slate-455 italic leading-relaxed">{aiResult.exampleMeaning}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Synonym */}
                                    {aiResult.synonym && (
                                        <div className="px-1 border-t border-slate-100 dark:border-slate-850 pt-3 flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Từ đồng nghĩa:</span>
                                                <span className="font-japanese font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{aiResult.synonym}</span>
                                            </div>
                                            {aiResult.synonymSinoVietnamese && (
                                                <div className="text-right">
                                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Hán Việt đồng nghĩa:</span>
                                                    <span className="text-[11px] font-bold text-pink-500 uppercase tracking-wider block mt-0.5">{aiResult.synonymSinoVietnamese}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* 3. Add to Study Set Section */}
                    {handleAddCard && !loading && !aiResult?.isSentence && (
                        <div className="border-t border-slate-150 dark:border-slate-800 pt-4 mt-4 space-y-3">
                            {savedSuccessfully ? (
                                <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-black">
                                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-450 stroke-[3px]" />
                                    <span>Đã thêm từ vựng thành công!</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleOpenFolderModal}
                                    disabled={saving}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Đang lưu...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                                            <span>Lưu vào thư viện</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {aiResult?.isShared && (
                                <div className="flex justify-center pt-1">
                                    {aiResult.reportedError ? (
                                        <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl p-2 w-full justify-center">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <span>Đã báo cáo lỗi từ vựng này</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleReportError}
                                            className="w-full py-2 border border-red-200 dark:border-red-900/45 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
                                        >
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <span>Báo cáo lỗi từ vựng</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Folder Select Modal overlay */}
            {showFolderModal && (() => {
                const activeFolder = folders.find(f => f.id === selectedModalFolderId);
                const parentFolderId = activeFolder ? (activeFolder.parentId || null) : null;
                const itemsToShow = folders.filter(f => (f.parentId || null) === selectedModalFolderId);

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl animate-bounce-in text-left" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {selectedModalFolderId ? `Thư mục: ${activeFolder?.name}` : 'Thêm vào học phần nào?'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {selectedModalFolderId
                                    ? 'Chọn một học phần bên trong thư mục này để lưu từ vựng.'
                                    : 'Chọn học phần hoặc thư mục bạn muốn lưu từ vựng này vào để bắt đầu ôn tập.'
                                }
                            </p>
                            <div className="max-h-60 overflow-y-auto space-y-2 mb-6 custom-scrollbar pr-1">
                                {selectedModalFolderId && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedModalFolderId(parentFolderId); }}
                                        className="w-full text-left p-2.5 rounded-xl border border-dashed border-gray-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-500 dark:hover:text-sky-400 transition-all flex items-center gap-2 mb-2 font-medium text-xs text-gray-500 dark:text-gray-400"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        Quay lại {parentFolderId ? '' : '(Thư mục chính)'}
                                    </button>
                                )}

                                {folders.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                                        Chưa có học phần nào. Vui lòng tạo học phần ở trang Thư viện để lưu từ vựng.
                                    </p>
                                ) : itemsToShow.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                                        Không tìm thấy học phần hoặc thư mục con nào ở đây.
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {itemsToShow.map(folder => (
                                            <button
                                                key={folder.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (folder.type === 'folder') {
                                                        setSelectedModalFolderId(folder.id);
                                                    } else {
                                                        handleConfirmSave(folder.id);
                                                    }
                                                }}
                                                className="w-full text-left p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex items-center gap-2"
                                            >
                                                {folder.type === 'folder' ? (
                                                    <span className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-500 dark:text-amber-400 rounded-lg">
                                                        <Folder className="w-3.5 h-3.5" />
                                                    </span>
                                                ) : (
                                                    <span className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400 rounded-lg">
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                                                        {folder.name}
                                                        <span className="text-[9px] px-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded font-normal">
                                                            {folder.type === 'folder' ? 'Thư mục' : 'Học phần'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFolderModal(false);
                                        setSelectedModalFolderId(null);
                                    }}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <PremiumLockedModal
                isOpen={showPremiumModal}
                onClose={() => setShowPremiumModal(false)}
                pkgName="Premium"
            />
        </div>,
        target
    );
};

export default VocabularySelectionLookup;
