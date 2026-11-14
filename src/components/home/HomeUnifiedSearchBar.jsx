import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Search, X, Sparkles, BookOpen, Layers, FileText, ChevronRight,
    Loader2, PenTool
} from 'lucide-react';
import { searchDictionary } from '../../services/dictionaryService';
import { JOTOBA_KANJI_DATA } from '../../data/jotobaKanjiData';
import {
    getSharedGrammarPointsList,
    subscribeGrammarSrs,
    getCachedUserGrammarSrsData,
    updateCachedUserGrammarSrs
} from '../../utils/grammarService';
import {
    subscribeKanjiSrs,
    getCachedUserSrsData,
    updateCachedUserSrs,
    getSharedVocabList
} from '../../utils/kanjiService';
import { db, appId } from '../../config/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { showToast } from '../../utils/toast';
import { VocabResultCard, KanjiResultCard, GrammarResultCard } from './HomeSearchCards';
import HomeSaveVocabModal from './HomeSaveVocabModal';
import HomeVocabDetailModal from './HomeVocabDetailModal';
import HomeKanjiDetailModal from './HomeKanjiDetailModal';
import HomeGrammarDetailModal from './HomeGrammarDetailModal';
import HomeKanjiHandwritingModal from './HomeKanjiHandwritingModal';

const removeTones = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
};

const normalizePattern = (str) => {
    if (!str) return '';
    return str.replace(/[~～〜\.\.\.…/・\s\(\)（）\-\+]/g, '').toLowerCase().trim();
};

const cleanWord = (text) => {
    if (!text) return '';
    return String(text).split('（')[0].split('(')[0].trim().toLowerCase();
};

export default function HomeUnifiedSearchBar({
    userId,
    allCards = [],
    folders = [],
    parentFolders = [],
    onSaveCard,
    onGeminiAssist,
    canUserUseAI = true,
    awardXP
}) {
    const [query, setQuery] = useState('');
    // Default to 'vocab' (Mazii-style, no 'all')
    const [activeTab, setActiveTab] = useState('vocab'); // 'vocab' | 'kanji' | 'grammar'
    const [isLoading, setIsLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Results state
    const [vocabResults, setVocabResults] = useState([]);
    const [kanjiResults, setKanjiResults] = useState([]);
    const [grammarResults, setGrammarResults] = useState([]);

    // Modal states
    const [isHandwritingOpen, setIsHandwritingOpen] = useState(false);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [selectedVocabForSave, setSelectedVocabForSave] = useState(null);
    const [isAiSaveAction, setIsAiSaveAction] = useState(false);

    // Popup Detail Modals (User stays on search bar when closing)
    const [selectedVocabForDetail, setSelectedVocabForDetail] = useState(null);
    const [selectedKanjiForDetail, setSelectedKanjiForDetail] = useState(null);
    const [selectedGrammarForDetail, setSelectedGrammarForDetail] = useState(null);

    // User SRS states for instant bookmarking feedback
    const [userKanjiSRS, setUserKanjiSRS] = useState(() => {
        const cached = getCachedUserSrsData(userId);
        return new Set(cached ? Object.keys(cached) : []);
    });

    const [userGrammarSRS, setUserGrammarSRS] = useState(() => {
        const cached = getCachedUserGrammarSrsData(userId);
        return new Set(cached ? Object.keys(cached) : []);
    });

    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Set of words already in user's flashcards
    const savedVocabSet = useMemo(() => {
        const set = new Set();
        (allCards || []).forEach(card => {
            const w = cleanWord(card.front);
            if (w) set.add(w);
        });
        return set;
    }, [allCards]);

    // Pre-cache all kanji entries
    const allKanjiEntries = useMemo(() => {
        return Object.values(JOTOBA_KANJI_DATA || {});
    }, []);

    // Cached shared grammar points
    const grammarListRef = useRef([]);
    useEffect(() => {
        getSharedGrammarPointsList()
            .then(list => {
                if (Array.isArray(list)) grammarListRef.current = list;
            })
            .catch(() => {});
    }, []);

    // Cached shared vocab list for Vietnamese meaning search
    const sharedVocabListRef = useRef([]);
    useEffect(() => {
        getSharedVocabList()
            .then(list => {
                if (Array.isArray(list)) sharedVocabListRef.current = list;
            })
            .catch(() => {});
    }, []);

    // Live subscriptions to user's SRS progress
    useEffect(() => {
        if (!userId) return;
        const unsubKanji = subscribeKanjiSrs(userId, (freshSrs) => {
            if (freshSrs) setUserKanjiSRS(new Set(Object.keys(freshSrs)));
        });
        const unsubGrammar = subscribeGrammarSrs(userId, (freshSrs) => {
            if (freshSrs) setUserGrammarSRS(new Set(Object.keys(freshSrs)));
        });
        return () => {
            unsubKanji?.();
            unsubGrammar?.();
        };
    }, [userId]);

    // Keyboard shortcut to focus search bar ('/' or 'Ctrl+K' / 'Cmd+K')
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                if (e.key === 'Escape' && isDropdownOpen) {
                    setIsDropdownOpen(false);
                    inputRef.current?.blur();
                }
                return;
            }
            if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                inputRef.current?.focus();
                setIsDropdownOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDropdownOpen]);

    // Click outside listener to collapse dropdown (only when no modal is open)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                !selectedVocabForDetail &&
                !selectedKanjiForDetail &&
                !selectedGrammarForDetail &&
                !saveModalOpen &&
                !isHandwritingOpen &&
                containerRef.current &&
                !containerRef.current.contains(e.target)
            ) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedVocabForDetail, selectedKanjiForDetail, selectedGrammarForDetail, saveModalOpen, isHandwritingOpen]);

    // Multi-pillar search handler with Vietnamese search support (Debounced)
    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            setVocabResults([]);
            setKanjiResults([]);
            setGrammarResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const normQ = removeTones(trimmed);
                const normPatternQ = normalizePattern(trimmed);
                const hasLatin = /[a-zA-Zà-ỹÀ-Ỹ]/.test(trimmed);

                // 1. Vocabulary Search: Yomitan IndexedDB + Shared Vocab (Vietnamese meanings)
                const yomitanPromise = searchDictionary(trimmed, 25).catch(() => []);

                // In-memory Vietnamese search over 17,000+ JLPT vocabulary items
                let viVocabMatches = [];
                const sVocab = sharedVocabListRef.current || [];
                if (sVocab.length > 0 && hasLatin) {
                    for (const v of sVocab) {
                        if (!v) continue;
                        const mRaw = (v.meaning || '').toLowerCase();
                        const mNorm = removeTones(mRaw);
                        const sinoNorm = removeTones(v.sinoViet || v.sinoVietnamese || '');
                        const wRaw = (v.word || '').toLowerCase();

                        let score = 0;
                        if (mRaw === trimmed.toLowerCase() || mNorm === normQ) {
                            score = 1200; // Exact Vietnamese meaning match
                        } else if (mNorm.startsWith(normQ + ';') || mNorm.startsWith(normQ + ' ') || mNorm.startsWith(normQ + ',')) {
                            score = 1000;
                        } else if (sinoNorm === normQ) {
                            score = 950;
                        } else if (mNorm.includes(normQ)) {
                            score = 750;
                        } else if (sinoNorm.includes(normQ)) {
                            score = 650;
                        } else if (wRaw.includes(trimmed.toLowerCase())) {
                            score = 600;
                        }

                        if (score > 0) {
                            const cleanW = v.word ? v.word.split('（')[0].split('(')[0].trim() : (v.reading || '');
                            viVocabMatches.push({
                                w: cleanW,
                                r: v.reading || '',
                                m: Array.isArray(v.meaning) ? v.meaning : [v.meaning],
                                hv: v.sinoViet || v.sinoVietnamese || '',
                                j: v.level ? v.level.replace('N', '') : null,
                                ex: (v.example || v.exampleSentence) ? {
                                    ja: v.example || v.exampleSentence,
                                    vi: v.exampleMeaning || v.exampleTranslation || ''
                                } : null,
                                _score: score
                            });
                        }
                    }
                    viVocabMatches.sort((a, b) => b._score - a._score);
                    viVocabMatches = viVocabMatches.slice(0, 20);
                }

                // 2. Kanji Search via In-Memory JOTOBA_KANJI_DATA
                const matchingKanji = [];
                for (const k of allKanjiEntries) {
                    const char = k.literal || '';
                    if (!char) continue;

                    let score = 0;
                    if (char === trimmed) score = 100;
                    else if (trimmed.includes(char)) score = 80;
                    else {
                        const sino = removeTones(k.sinoViet || '');
                        const mVi = removeTones(k.meaningVi || '');
                        if (sino === normQ) score = 90;
                        else if (sino.startsWith(normQ)) score = 70;
                        else if (sino.includes(normQ)) score = 50;
                        else if (mVi === normQ) score = 65;
                        else if (mVi.includes(normQ)) score = 45;
                        else {
                            const onyomi = (k.onyomi || []).join(' ').toLowerCase();
                            const kunyomi = (k.kunyomi || []).join(' ').toLowerCase();
                            if (onyomi.includes(normPatternQ) || kunyomi.includes(normPatternQ)) {
                                score = 40;
                            }
                        }
                    }

                    if (score > 0) {
                        matchingKanji.push({ ...k, _score: score });
                    }
                }
                matchingKanji.sort((a, b) => b._score - a._score);
                const topKanji = matchingKanji.slice(0, 20);

                // 3. Grammar Search via In-Memory Grammar Points
                const gList = grammarListRef.current || [];
                const matchingGrammar = [];
                for (const gp of gList) {
                    if (!gp) continue;
                    const patNorm = normalizePattern(gp.pattern || gp.title || '');
                    const mNorm = removeTones([gp.meaningShort || '', gp.meaning || '', gp.meaningVi || ''].join(' '));

                    let score = 0;
                    if (patNorm === normPatternQ) score = 100;
                    else if (patNorm.startsWith(normPatternQ)) score = 80;
                    else if (patNorm.includes(normPatternQ)) score = 60;
                    else if (mNorm.includes(normQ)) score = 45;

                    if (score > 0) {
                        matchingGrammar.push({ ...gp, _score: score });
                    }
                }
                matchingGrammar.sort((a, b) => b._score - a._score);
                const topGrammar = matchingGrammar.slice(0, 20);

                const yomitanRes = await yomitanPromise;

                // Merge Yomitan results with Vietnamese matches, prioritizing highest score
                const vocabMap = new Map();
                for (const item of [...viVocabMatches, ...(yomitanRes || [])]) {
                    const key = `${item.w}|${item.r || ''}`;
                    if (!vocabMap.has(key) || (vocabMap.get(key)._score || 0) < (item._score || 0)) {
                        vocabMap.set(key, item);
                    }
                }
                const mergedVocab = Array.from(vocabMap.values()).sort((a, b) => (b._score || 0) - (a._score || 0));

                setVocabResults(mergedVocab.slice(0, 25));
                setKanjiResults(topKanji);
                setGrammarResults(topGrammar);
            } catch (err) {
                console.warn('Search execution failed:', err);
            } finally {
                setIsLoading(false);
            }
        }, 120);

        return () => clearTimeout(timer);
    }, [query, allKanjiEntries]);

    // Quick Kanji SRS bookmark toggle
    const handleToggleKanjiBookmark = async (kanji) => {
        if (!userId) {
            showToast('Vui lòng đăng nhập để lưu Kanji vào SRS', 'error');
            return;
        }
        const char = kanji.literal || kanji.character;
        const docId = kanji.id || `kanji_${char}`;
        const isSaved = userKanjiSRS.has(char) || userKanjiSRS.has(docId);

        try {
            const srsDocRef = doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, docId);
            if (isSaved) {
                await deleteDoc(srsDocRef);
                updateCachedUserSrs(userId, docId, null, char);
                setUserKanjiSRS(prev => {
                    const next = new Set(prev);
                    next.delete(char);
                    next.delete(docId);
                    return next;
                });
                showToast(`Đã bỏ lưu Kanji "${char}" khỏi SRS`, 'info');
            } else {
                const now = Date.now();
                const newSrs = {
                    interval: 0,
                    ease: 2.5,
                    nextReview: now,
                    lastReview: now,
                    reps: 0,
                    character: char,
                    state: 'NEW'
                };
                await setDoc(srsDocRef, newSrs, { merge: true });
                updateCachedUserSrs(userId, docId, newSrs, char);
                setUserKanjiSRS(prev => new Set([...prev, char, docId]));
                awardXP?.(15);
                showToast(`Đã lưu Kanji "${char}" vào danh sách ôn tập SRS`, 'success');
            }
        } catch (e) {
            console.warn('Error toggling Kanji bookmark:', e);
            showToast('Không thể cập nhật SRS lúc này', 'error');
        }
    };

    // Quick Grammar SRS bookmark toggle
    const handleToggleGrammarBookmark = async (gp) => {
        if (!userId) {
            showToast('Vui lòng đăng nhập để lưu ngữ pháp vào SRS', 'error');
            return;
        }
        const isSaved = userGrammarSRS.has(gp.id);
        const srsDocRef = doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, gp.id);

        try {
            if (isSaved) {
                await deleteDoc(srsDocRef);
                updateCachedUserGrammarSrs(userId, gp.id, null);
                setUserGrammarSRS(prev => {
                    const next = new Set(prev);
                    next.delete(gp.id);
                    return next;
                });
                showToast(`Đã bỏ lưu mẫu "${gp.pattern || gp.title}"`, 'info');
            } else {
                const now = Date.now();
                const newSrs = {
                    interval: 0,
                    ease: 2.5,
                    nextReview: now,
                    lastReview: now,
                    reps: 0,
                    state: 'NEW'
                };
                await setDoc(srsDocRef, newSrs, { merge: true });
                updateCachedUserGrammarSrs(userId, gp.id, newSrs);
                setUserGrammarSRS(prev => new Set([...prev, gp.id]));
                awardXP?.(15);
                showToast(`Đã lưu mẫu "${gp.pattern || gp.title}" vào SRS`, 'success');
            }
        } catch (e) {
            console.warn('Error toggling Grammar bookmark:', e);
            showToast('Không thể cập nhật SRS lúc này', 'error');
        }
    };

    const hasSearchText = query.trim().length > 0;

    return (
        <div ref={containerRef} className="relative w-full z-40">
            {/* Main Search Container */}
            <div className={`relative flex flex-col bg-white dark:bg-slate-900 border-2 rounded-2xl sm:rounded-3xl shadow-sm transition-all duration-200 overflow-hidden ${
                isDropdownOpen
                    ? 'border-emerald-500 ring-4 ring-emerald-500/10 dark:border-emerald-400'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}>
                {/* Search Input Row */}
                <div className="flex items-center">
                    <div className="pl-4 sm:pl-5 text-slate-400 dark:text-slate-500 flex items-center">
                        <Search className={`w-5 h-5 transition-colors ${isDropdownOpen ? 'text-emerald-500' : ''}`} />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (!isDropdownOpen) setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="日本, nihon, Nhật Bản, nước, yêu..."
                        className="w-full py-3.5 sm:py-4 px-3 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                    />

                    {isLoading && (
                        <div className="pr-2 text-emerald-500 animate-spin">
                            <Loader2 className="w-4 h-4" />
                        </div>
                    )}

                    {/* Handwriting Draw Kanji Button */}
                    <button
                        type="button"
                        onClick={() => setIsHandwritingOpen(true)}
                        className="p-2 mr-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Vẽ chữ Kanji để tra cứu"
                    >
                        <PenTool className="w-4 h-4" />
                    </button>

                    {/* Clear Button */}
                    {hasSearchText && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            className="p-1.5 mr-3 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Mazii-style Filter Tabs directly inside search bar header */}
                <div className="flex items-center gap-1 px-3 sm:px-4 pb-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-850/40 overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setActiveTab('vocab')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'vocab'
                                ? 'bg-sky-500 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                    >
                        <span>Từ vựng</span>
                        {vocabResults.length > 0 && hasSearchText && (
                            <span className="text-[10px] opacity-80 font-black">({vocabResults.length})</span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('kanji')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'kanji'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                    >
                        <span>Hán tự</span>
                        {kanjiResults.length > 0 && hasSearchText && (
                            <span className="text-[10px] opacity-80 font-black">({kanjiResults.length})</span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('grammar')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'grammar'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                    >
                        <span>Ngữ pháp</span>
                        {grammarResults.length > 0 && hasSearchText && (
                            <span className="text-[10px] opacity-80 font-black">({grammarResults.length})</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Dropdown Container */}
            {isDropdownOpen && hasSearchText && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[70vh] flex flex-col z-40">
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                        {/* TAB 1: VOCABULARY */}
                        {activeTab === 'vocab' && (
                            <>
                                {vocabResults.length === 0 && !isLoading ? (
                                    <div className="text-center py-10 px-4">
                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center text-xl mb-3">
                                            📖
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                            Không tìm thấy từ vựng nào cho "{query}"
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                            Thử tìm bằng Kanji, Hiragana, Romaji hoặc nghĩa tiếng Việt (có dấu/không dấu)
                                        </p>
                                    </div>
                                ) : (
                                    vocabResults.map((v, idx) => {
                                        const w = cleanWord(v.w || v.r);
                                        const isSaved = savedVocabSet.has(w);
                                        return (
                                            <VocabResultCard
                                                key={`vocab-${idx}-${w}`}
                                                entry={v}
                                                isSaved={isSaved}
                                                onSelectVocab={(entry) => setSelectedVocabForDetail(entry)}
                                                onOpenSave={(entry) => {
                                                    setSelectedVocabForSave(entry);
                                                    setIsAiSaveAction(false);
                                                    setSaveModalOpen(true);
                                                }}
                                                onOpenAiSave={(entry) => {
                                                    setSelectedVocabForSave(entry);
                                                    setIsAiSaveAction(true);
                                                    setSaveModalOpen(true);
                                                }}
                                                canUserUseAI={canUserUseAI}
                                            />
                                        );
                                    })
                                )}
                            </>
                        )}

                        {/* TAB 2: KANJI */}
                        {activeTab === 'kanji' && (
                            <>
                                {kanjiResults.length === 0 && !isLoading ? (
                                    <div className="text-center py-10 px-4">
                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center text-xl mb-3">
                                            🈸
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                            Không tìm thấy chữ Hán nào cho "{query}"
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                            Thử gõ âm Hán Việt (như HÁN, THỰC) hoặc bấm icon cây bút vẽ Kanji
                                        </p>
                                    </div>
                                ) : (
                                    kanjiResults.map((k) => {
                                        const char = k.literal || k.character;
                                        const isBookmarked = userKanjiSRS.has(char) || userKanjiSRS.has(k.id || `kanji_${char}`);
                                        return (
                                            <KanjiResultCard
                                                key={`kanji-${char}`}
                                                kanji={k}
                                                isBookmarked={isBookmarked}
                                                onToggleBookmark={handleToggleKanjiBookmark}
                                                onSelectKanji={(kanjiData) => setSelectedKanjiForDetail(kanjiData)}
                                            />
                                        );
                                    })
                                )}
                            </>
                        )}

                        {/* TAB 3: GRAMMAR */}
                        {activeTab === 'grammar' && (
                            <>
                                {grammarResults.length === 0 && !isLoading ? (
                                    <div className="text-center py-10 px-4">
                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center text-xl mb-3">
                                            📑
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                            Không tìm thấy mẫu ngữ pháp nào cho "{query}"
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                            Thử tìm bằng cách kết hợp như "にあたって", "thể bị động", "vì"...
                                        </p>
                                    </div>
                                ) : (
                                    grammarResults.map((gp) => {
                                        const isBookmarked = userGrammarSRS.has(gp.id);
                                        return (
                                            <GrammarResultCard
                                                key={`grammar-${gp.id}`}
                                                point={gp}
                                                isBookmarked={isBookmarked}
                                                onToggleBookmark={handleToggleGrammarBookmark}
                                                onSelectGrammar={(grammarData) => setSelectedGrammarForDetail(grammarData)}
                                            />
                                        );
                                    })
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Handwriting Canvas Modal */}
            <HomeKanjiHandwritingModal
                isOpen={isHandwritingOpen}
                onClose={() => setIsHandwritingOpen(false)}
                onSelectKanji={(char) => {
                    setQuery(char);
                    setActiveTab('kanji');
                    setIsDropdownOpen(true);
                    inputRef.current?.focus();
                }}
            />

            {/* Vocabulary Detail Pop up Modal */}
            <HomeVocabDetailModal
                isOpen={!!selectedVocabForDetail}
                onClose={() => setSelectedVocabForDetail(null)}
                entry={selectedVocabForDetail}
                isSaved={selectedVocabForDetail ? savedVocabSet.has(cleanWord(selectedVocabForDetail.w || selectedVocabForDetail.r)) : false}
                onOpenSave={(entry) => {
                    setSelectedVocabForSave(entry);
                    setIsAiSaveAction(false);
                    setSaveModalOpen(true);
                }}
                onOpenAiSave={(entry) => {
                    setSelectedVocabForSave(entry);
                    setIsAiSaveAction(true);
                    setSaveModalOpen(true);
                }}
                canUserUseAI={canUserUseAI}
            />

            {/* Kanji Detail Pop up Modal */}
            <HomeKanjiDetailModal
                isOpen={!!selectedKanjiForDetail}
                onClose={() => setSelectedKanjiForDetail(null)}
                kanji={selectedKanjiForDetail}
                isBookmarked={selectedKanjiForDetail ? (userKanjiSRS.has(selectedKanjiForDetail.literal || selectedKanjiForDetail.character) || userKanjiSRS.has(selectedKanjiForDetail.id || `kanji_${selectedKanjiForDetail.literal || selectedKanjiForDetail.character}`)) : false}
                onToggleBookmark={handleToggleKanjiBookmark}
            />

            {/* Grammar Detail Pop up Modal */}
            <HomeGrammarDetailModal
                isOpen={!!selectedGrammarForDetail}
                onClose={() => setSelectedGrammarForDetail(null)}
                point={selectedGrammarForDetail}
                isBookmarked={selectedGrammarForDetail ? userGrammarSRS.has(selectedGrammarForDetail.id) : false}
                onToggleBookmark={handleToggleGrammarBookmark}
            />

            {/* Save Vocab to Study Set Modal */}
            <HomeSaveVocabModal
                isOpen={saveModalOpen}
                onClose={() => {
                    setSaveModalOpen(false);
                    setSelectedVocabForSave(null);
                }}
                targetEntry={selectedVocabForSave}
                isAiAction={isAiSaveAction}
                folders={folders}
                parentFolders={parentFolders}
                allCards={allCards}
                onSaveCard={onSaveCard}
                onGeminiAssist={onGeminiAssist}
                canUserUseAI={canUserUseAI}
                onSuccess={() => {
                    awardXP?.(10);
                }}
            />
        </div>
    );
}
