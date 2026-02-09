import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import {
    List, Search, Upload, Download, ArrowDown, GraduationCap, Tag, Volume2,
    X, Edit, Trash2, Loader2, Check, Image as ImageIcon, Music
} from 'lucide-react';
import { JLPT_LEVELS, POS_TYPES, getPosLabel, getPosColor, getLevelColor } from '../../config/constants';
import { SearchInput } from '../ui';
import { SrsStatusCell } from '../ui';
import { playAudio } from '../../utils/audio';
import { compressImage } from '../../utils/image';

// Edit Modal Component
const EditCardModal = ({ card, onSave, onClose, onGeminiAssist }) => {
    const [front, setFront] = useState(card?.front || '');
    const [back, setBack] = useState(card?.back || '');
    const [synonym, setSynonym] = useState(card?.synonym || '');
    const [example, setExample] = useState(card?.example || '');
    const [exampleMeaning, setExampleMeaning] = useState(card?.exampleMeaning || '');
    const [nuance, setNuance] = useState(card?.nuance || '');
    const [pos, setPos] = useState(card?.pos || '');
    const [level, setLevel] = useState(card?.level || '');
    const [sinoVietnamese, setSinoVietnamese] = useState(card?.sinoVietnamese || '');
    const [synonymSinoVietnamese, setSynonymSinoVietnamese] = useState(card?.synonymSinoVietnamese || '');
    const [imagePreview, setImagePreview] = useState(card?.imageBase64 || null);
    const [customAudio, setCustomAudio] = useState(card?.audioBase64 || '');
    const [showAudioInput, setShowAudioInput] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setImagePreview(compressed);
            } catch (error) {
                console.error("Lỗi ảnh:", error);
            }
        }
    };

    const handleAudioFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const res = event.target.result;
            setCustomAudio(res.split(',')[1]);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!front.trim() || !back.trim()) return;
        setIsSaving(true);
        const hasOriginalAudio = card.audioBase64 && card.audioBase64.trim() !== '';
        const hasNewAudio = customAudio.trim() !== '';
        const audioToSave = hasNewAudio ? customAudio.trim() : (hasOriginalAudio ? undefined : null);
        await onSave({
            cardId: card.id,
            front, back, synonym, example, exampleMeaning, nuance, pos, level,
            sinoVietnamese, synonymSinoVietnamese,
            imageBase64: imagePreview,
            audioBase64: audioToSave
        });
        setIsSaving(false);
        onClose();
    };

    const handleAiAssist = async (e) => {
        e.preventDefault();
        if (!front.trim()) return;
        setIsAiLoading(true);
        const aiData = await onGeminiAssist(front, pos, level);
        if (aiData) {
            if (aiData.frontWithFurigana) setFront(aiData.frontWithFurigana);
            if (aiData.meaning) setBack(aiData.meaning);
            if (aiData.sinoVietnamese) setSinoVietnamese(aiData.sinoVietnamese);
            if (aiData.synonym) setSynonym(aiData.synonym);
            if (aiData.synonymSinoVietnamese) setSynonymSinoVietnamese(aiData.synonymSinoVietnamese);
            if (aiData.example) setExample(aiData.example);
            if (aiData.exampleMeaning) setExampleMeaning(aiData.exampleMeaning);
            if (aiData.nuance) setNuance(aiData.nuance);
            if (aiData.pos) setPos(aiData.pos);
            if (aiData.level) setLevel(aiData.level);
        }
        setIsAiLoading(false);
    };

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chỉnh Sửa Thẻ</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                            {/* Front (Japanese) */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Từ vựng (Nhật)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={front}
                                        onChange={(e) => setFront(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-gray-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAiAssist}
                                        className="px-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                                    >
                                        {isAiLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "AI"}
                                    </button>
                                </div>
                            </div>

                            {/* Level & POS */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl space-y-3">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {JLPT_LEVELS.map((lvl) => (
                                        <button
                                            key={lvl.value}
                                            type="button"
                                            onClick={() => setLevel(lvl.value)}
                                            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${level === lvl.value
                                                ? `${lvl.color} shadow-sm ring-1 ring-offset-1 ring-indigo-200 dark:ring-indigo-800`
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {lvl.label}
                                        </button>
                                    ))}
                                </div>
                                <select value={pos} onChange={(e) => setPos(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-100">
                                    <option value="">-- Chọn Từ Loại --</option>
                                    {Object.entries(POS_TYPES).map(([key, value]) => (<option key={key} value={key}>{value.label}</option>))}
                                </select>
                            </div>

                            {/* Meaning */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Ý nghĩa</label>
                                <input type="text" value={back} onChange={(e) => setBack(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                            </div>

                            {/* Sino-Vietnamese & Synonym */}
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder="Hán Việt" className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Đồng nghĩa" className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            {/* Example */}
                            <textarea value={example} onChange={(e) => setExample(e.target.value)} rows="2" placeholder="Ví dụ (Nhật)" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                            <textarea value={exampleMeaning} onChange={(e) => setExampleMeaning(e.target.value)} rows="2" placeholder="Nghĩa ví dụ" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                            <textarea value={nuance} onChange={(e) => setNuance(e.target.value)} rows="2" placeholder="Ghi chú" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />

                            {/* Media */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase">Media</h3>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="img-edit-modal" className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium text-sm flex items-center hover:text-indigo-800">
                                        <ImageIcon className="w-4 h-4 mr-2" /> {imagePreview ? "Thay đổi ảnh" : "Tải ảnh lên"}
                                    </label>
                                    <input id="img-edit-modal" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    {imagePreview && (
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={imagePreview} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setImagePreview(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <button type="button" onClick={() => setShowAudioInput(!showAudioInput)} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium flex items-center w-full justify-between">
                                        <div className="flex items-center"><Music className="w-4 h-4 mr-2" /> {customAudio ? "Có Audio" : "Thêm Audio"}</div>
                                        <span className="text-xs text-gray-400">{showAudioInput ? '▲' : '▼'}</span>
                                    </button>
                                    {showAudioInput && (
                                        <div className="mt-2 space-y-2">
                                            <label htmlFor="audio-edit-modal" className="cursor-pointer px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium inline-block">
                                                {customAudio ? "Chọn file khác" : "Chọn file .mp3/wav"}
                                            </label>
                                            <input id="audio-edit-modal" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={handleAudioFileChange} className="hidden" />
                                            {customAudio && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Đã có</span>
                                                    <button type="button" onClick={() => playAudio(customAudio)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Volume2 className="w-4 h-4" /></button>
                                                    <button type="button" onClick={() => setCustomAudio('')} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Lưu Thay Đổi
                    </button>
                    <button onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                        Hủy
                    </button>
                </div>
            </div>
        </div>
    );
};

const ListView = React.memo(({ allCards, onDeleteCard, onPlayAudio, onExport, onImportTSV, onSaveChanges, onGeminiAssist, onNavigateToImport, scrollToCardId, onScrollComplete, savedFilters, onFiltersChange }) => {
    // Edit modal state
    const [editingCard, setEditingCard] = useState(null);

    // Use savedFilters if available, otherwise use defaults
    const [filterLevel, setFilterLevel] = useState(savedFilters?.filterLevel || 'all');
    const [filterPos, setFilterPos] = useState(savedFilters?.filterPos || 'all');
    const [filterAudio, setFilterAudio] = useState(savedFilters?.filterAudio || 'all');
    const [sortOrder, setSortOrder] = useState(savedFilters?.sortOrder || 'newest');
    const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm || '');
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [inputValue, setInputValue] = useState('');

    // Progressive loading - show first 50 items immediately, load more on scroll
    const [displayedCount, setDisplayedCount] = useState(50);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const tableContainerRef = useRef(null);

    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);
    }, []);

    // Restore filters from savedFilters when returning from edit
    const previousSavedFiltersRef = useRef(null);
    const isRestoringRef = useRef(false);

    useEffect(() => {
        if (savedFilters && JSON.stringify(previousSavedFiltersRef.current) !== JSON.stringify(savedFilters)) {
            isRestoringRef.current = true;
            previousSavedFiltersRef.current = savedFilters;
            setFilterLevel(savedFilters.filterLevel || 'all');
            setFilterPos(savedFilters.filterPos || 'all');
            setFilterAudio(savedFilters.filterAudio || 'all');
            setSortOrder(savedFilters.sortOrder || 'newest');
            setSearchTerm(savedFilters.searchTerm || '');
            setTimeout(() => {
                isRestoringRef.current = false;
            }, 50);
        }
    }, [savedFilters]);

    // Update parent with filter changes
    useEffect(() => {
        if (isRestoringRef.current || !onFiltersChange) return;
        onFiltersChange({ filterLevel, filterPos, filterAudio, sortOrder, searchTerm });
    }, [filterLevel, filterPos, filterAudio, sortOrder, searchTerm, onFiltersChange]);

    const resetFilters = useCallback(() => {
        setFilterLevel('all');
        setFilterPos('all');
        setFilterAudio('all');
        setSortOrder('newest');
        setInputValue('');
        setSearchTerm('');
    }, []);

    // Pre-compute searchable text and timestamps
    const preprocessedCards = useMemo(() => {
        return allCards.map(card => {
            if (!card._searchableText) {
                card._searchableText = [
                    card.front?.toLowerCase() || '',
                    card.back?.toLowerCase() || '',
                    card.synonym?.toLowerCase() || '',
                    card.sinoVietnamese?.toLowerCase() || ''
                ].join(' ');
            }
            if (card._timestamp === undefined) {
                card._timestamp = card.createdAt?.getTime() || 0;
            }
            return card;
        });
    }, [allCards]);

    // Optimized filtering
    const filteredCards = useMemo(() => {
        const searchTermLower = deferredSearchTerm.trim().toLowerCase();
        const hasSearch = searchTermLower.length > 0;
        const hasLevelFilter = filterLevel !== 'all';
        const hasPosFilter = filterPos !== 'all';
        const hasAudioFilter = filterAudio !== 'all';
        const hasAnyFilter = hasSearch || hasLevelFilter || hasPosFilter || hasAudioFilter;

        if (!hasAnyFilter) {
            const sorted = [...preprocessedCards];
            if (sortOrder === 'newest') {
                sorted.sort((a, b) => b._timestamp - a._timestamp);
            } else {
                sorted.sort((a, b) => a._timestamp - b._timestamp);
            }
            return sorted;
        }

        const result = [];
        const cardsLength = preprocessedCards.length;

        for (let i = 0; i < cardsLength; i++) {
            const card = preprocessedCards[i];

            if (hasSearch && !card._searchableText.includes(searchTermLower)) continue;
            if (hasLevelFilter && card.level !== filterLevel) continue;
            if (hasPosFilter && card.pos !== filterPos) continue;
            if (hasAudioFilter) {
                if (filterAudio === 'with' && (!card.audioBase64 || card.audioBase64.trim() === '')) continue;
                if (filterAudio === 'without' && card.audioBase64 && card.audioBase64.trim() !== '') continue;
            }

            result.push(card);
        }

        if (sortOrder === 'newest') {
            result.sort((a, b) => b._timestamp - a._timestamp);
        } else {
            result.sort((a, b) => a._timestamp - b._timestamp);
        }

        return result;
    }, [preprocessedCards, filterLevel, filterPos, filterAudio, sortOrder, deferredSearchTerm]);

    // Reset displayedCount when filters change
    useEffect(() => {
        setDisplayedCount(50);
    }, [filterLevel, filterPos, filterAudio, sortOrder, deferredSearchTerm]);

    // Get displayed cards (progressive loading)
    const displayedCards = useMemo(() => {
        return filteredCards.slice(0, displayedCount);
    }, [filteredCards, displayedCount]);

    // Load more on scroll
    const handleScroll = useCallback(() => {
        const scrollY = window.scrollY || window.pageYOffset;
        const windowHeight = window.innerHeight;
        const documentHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        );

        if (scrollY + windowHeight >= documentHeight - 800 && displayedCount < filteredCards.length && !isLoadingMore) {
            setIsLoadingMore(true);
            requestAnimationFrame(() => {
                setDisplayedCount(prev => Math.min(prev + 50, filteredCards.length));
                setIsLoadingMore(false);
            });
        }
    }, [displayedCount, filteredCards.length, isLoadingMore]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('scroll', handleScroll);
        };
    }, [handleScroll]);

    // Manual load more function
    const loadMore = useCallback(() => {
        setDisplayedCount(prev => Math.min(prev + 100, filteredCards.length));
    }, [filteredCards.length]);

    // Scroll to card after returning from edit
    useEffect(() => {
        if (scrollToCardId) {
            // Ensure card is in displayed list
            const cardIndex = filteredCards.findIndex(c => c.id === scrollToCardId);
            if (cardIndex >= displayedCount) {
                setDisplayedCount(cardIndex + 10);
            }
            setTimeout(() => {
                const element = document.querySelector(`[data-card-id="${scrollToCardId}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-indigo-500');
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-indigo-500');
                    }, 2000);
                    if (onScrollComplete) onScrollComplete();
                }
            }, 100);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [scrollToCardId, filteredCards, onScrollComplete, displayedCount]);

    return (
        <div className="space-y-4">
            {/* Edit Modal */}
            {editingCard && (
                <EditCardModal
                    card={editingCard}
                    onSave={onSaveChanges}
                    onClose={() => setEditingCard(null)}
                    onGeminiAssist={onGeminiAssist}
                />
            )}

            {/* Header - matching HomeScreen style */}
            <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Danh Sách Từ Vựng
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    Quản lý và chỉnh sửa {allCards.length} thẻ ghi nhớ của bạn
                </p>
            </div>

            {/* Stats Card - solid color */}
            <div className="bg-indigo-500 rounded-xl p-4 text-white shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-3xl md:text-4xl font-bold">{allCards.length}</div>
                        <p className="text-indigo-100 text-sm">Tổng số từ vựng</p>
                    </div>
                    <div className="flex gap-2">
                        {onNavigateToImport && (
                            <button onClick={onNavigateToImport} className="px-3 py-2 text-xs font-bold rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center">
                                <Download className="w-3.5 h-3.5 mr-1.5" /> Nhập File
                            </button>
                        )}
                        {/* Hidden file input for TSV import */}
                        <input
                            type="file"
                            id="tsv-import-input"
                            accept=".tsv,.txt"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && onImportTSV) {
                                    onImportTSV(file);
                                    e.target.value = ''; // Reset để có thể chọn lại cùng file
                                }
                            }}
                        />
                        <button
                            onClick={() => document.getElementById('tsv-import-input')?.click()}
                            className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center"
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Nhập TSV
                        </button>
                        <button onClick={() => onExport(allCards)} className="px-3 py-2 text-xs font-bold rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Xuất Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filters - matching HomeScreen card style */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[10px]">🔍</span>
                    Tìm kiếm & Lọc
                </h3>

                <SearchInput
                    defaultValue={searchTerm}
                    onSearchChange={handleSearchChange}
                    onSearchClick={handleSearchChange}
                    placeholder="Tìm kiếm từ vựng, ý nghĩa, Hán Việt..."
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sắp xếp</label>
                        <div className="relative">
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-7 pr-2 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none text-gray-900 dark:text-gray-100">
                                <option value="newest">Mới nhất</option>
                                <option value="oldest">Cũ nhất</option>
                            </select>
                            <ArrowDown className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cấp độ</label>
                        <div className="relative">
                            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="w-full pl-7 pr-2 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none text-gray-900 dark:text-gray-100">
                                <option value="all">Tất cả</option>
                                {JLPT_LEVELS.map(l => (<option key={l.value} value={l.value}>{l.label}</option>))}
                            </select>
                            <GraduationCap className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Từ loại</label>
                        <div className="relative">
                            <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)} className="w-full pl-7 pr-2 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none text-gray-900 dark:text-gray-100">
                                <option value="all">Tất cả</option>
                                {Object.entries(POS_TYPES).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                            </select>
                            <Tag className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Âm thanh</label>
                        <div className="relative">
                            <select value={filterAudio} onChange={(e) => setFilterAudio(e.target.value)} className="w-full pl-7 pr-2 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none text-gray-900 dark:text-gray-100">
                                <option value="all">Tất cả</option>
                                <option value="with">Có âm thanh</option>
                                <option value="without">Chưa có</option>
                            </select>
                            <Volume2 className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>

                {(filterLevel !== 'all' || filterPos !== 'all' || filterAudio !== 'all' || searchTerm.trim() !== '') && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-500">
                            Tìm thấy <span className="font-bold text-indigo-600 dark:text-indigo-400">{filteredCards.length}</span> từ vựng
                        </span>
                        <button
                            onClick={resetFilters}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                        >
                            <X className="w-3.5 h-3.5" />
                            Bỏ lọc
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area - Vocabulary Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-0 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                        <thead className="bg-indigo-50 dark:bg-indigo-900/30">
                            <tr>
                                <th className="w-32 md:w-44 px-3 md:px-4 py-3 text-left text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Từ vựng</th>
                                <th className="w-16 md:w-20 px-2 md:px-4 py-3 text-left text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Tags</th>
                                <th className="w-12 md:w-14 px-1 md:px-2 py-3 text-center text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">🔊</th>
                                <th className="w-24 md:w-32 px-2 md:px-4 py-3 text-left text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Nghĩa</th>
                                <th className="w-16 md:w-20 px-1 md:px-2 py-3 text-left text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">SRS</th>
                                <th className="w-24 md:w-28 px-1 md:px-2 py-3 text-center text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                            {displayedCards.map((card) => (
                                <tr key={card.id} data-card-id={card.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group">
                                    <td className="px-2 md:px-4 py-2 md:py-3">
                                        <div className="font-bold text-gray-800 dark:text-gray-200 text-xs md:text-sm truncate" title={card.front}>{card.front}</div>
                                        {card.sinoVietnamese && <div className="text-[9px] md:text-[10px] font-medium text-pink-500 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 inline-block px-1 md:px-1.5 rounded mt-0.5 md:mt-1 truncate max-w-full" title={card.sinoVietnamese}>{card.sinoVietnamese}</div>}
                                    </td>
                                    <td className="px-2 md:px-4 py-2 md:py-3">
                                        <div className="flex flex-col gap-0.5 md:gap-1 items-start">
                                            {card.level && <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full border font-bold ${getLevelColor(card.level)}`}>{card.level}</span>}
                                            {card.pos ? <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full border font-semibold ${getPosColor(card.pos)} truncate`} title={getPosLabel(card.pos)}>{getPosLabel(card.pos)}</span> : <span className="text-[10px] md:text-xs text-gray-300 dark:text-gray-600">--</span>}
                                        </div>
                                    </td>
                                    <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                                        <button
                                            onClick={() => onPlayAudio(card.audioBase64, card.front)}
                                            className={`p-2 md:p-2.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors ${card.audioBase64 ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}
                                            title={card.audioBase64 ? 'Phát âm thanh' : 'Chưa có âm thanh'}
                                        >
                                            <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    </td>
                                    <td className="w-24 md:w-32 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate" title={card.back}>{card.back}</td>
                                    <SrsStatusCell intervalIndex={card.intervalIndex_back} nextReview={card.nextReview_back} hasData={true} />
                                    <td className="w-24 md:w-28 px-1 md:px-2 py-2 md:py-3 text-center">
                                        <div className="flex justify-center gap-1 md:gap-2">
                                            <button
                                                onClick={() => setEditingCard(card)}
                                                className="p-2 md:p-2.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                                title="Chỉnh sửa"
                                            >
                                                <Edit className="w-4 h-4 md:w-5 md:h-5" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteCard(card.id, card.front)}
                                                className="p-2 md:p-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Loading more indicator */}
                {displayedCount < filteredCards.length && (
                    <div className="py-4 text-center border-t border-gray-200 dark:border-gray-700 space-y-3">
                        {isLoadingMore ? (
                            <div className="flex items-center justify-center gap-2 text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs">Đang tải thêm...</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-gray-400">
                                    Đang hiển thị {displayedCount} / {filteredCards.length} từ vựng
                                </p>
                                <button
                                    onClick={loadMore}
                                    className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                >
                                    Tải thêm 100 từ vựng
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Empty state */}
                {filteredCards.length === 0 && (
                    <div className="py-10 text-center">
                        <div className="text-4xl mb-3">📚</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Không tìm thấy từ vựng nào</p>
                        <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    </div>
                )}
            </div>
        </div>
    );
});

ListView.displayName = 'ListView';

export default ListView;
