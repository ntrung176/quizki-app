import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import {
    List, Search, Upload, Download, ArrowDown, GraduationCap, Tag, Volume2,
    X, Edit, Trash2, Loader2
} from 'lucide-react';
import { JLPT_LEVELS, POS_TYPES, getPosLabel, getPosColor, getLevelColor } from '../../config/constants';
import { SearchInput } from '../ui';
import { SrsStatusCell } from '../ui';

const ListView = React.memo(({ allCards, onDeleteCard, onPlayAudio, onExport, onNavigateToEdit, onNavigateToImport, scrollToCardId, onScrollComplete, savedFilters, onFiltersChange }) => {
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
        <div className="h-full flex flex-col space-y-2 md:space-y-6">
            <div className="flex flex-col gap-2 md:gap-4 pb-2 md:pb-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100">Danh Sách Từ Vựng</h2>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Quản lý {allCards.length} thẻ ghi nhớ của bạn</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <SearchInput
                        defaultValue={searchTerm}
                        onSearchChange={handleSearchChange}
                        onSearchClick={handleSearchChange}
                        placeholder="Tìm kiếm từ vựng, ý nghĩa, Hán Việt... (Nhấn Enter để tìm)"
                    />
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {onNavigateToImport && (
                            <button onClick={onNavigateToImport} className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center">
                                <Download className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" /> Nhập File
                            </button>
                        )}
                        <button onClick={() => onExport(allCards)} className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors flex items-center">
                            <Upload className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" /> Xuất Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 md:gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-3 bg-gray-50 dark:bg-gray-800 p-2 md:p-4 rounded-lg md:rounded-xl border border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div className="space-y-0.5 md:space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sắp xếp</label>
                        <div className="relative">
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-6 md:pl-9 pr-2 md:pr-4 py-1.5 md:py-2 text-xs md:text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md md:rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 appearance-none text-gray-900 dark:text-gray-100">
                                <option value="newest">Mới nhất</option>
                                <option value="oldest">Cũ nhất</option>
                            </select>
                            <ArrowDown className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                        </div>
                    </div>
                    <div className="space-y-0.5 md:space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cấp độ</label>
                        <div className="relative">
                            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="w-full pl-6 md:pl-9 pr-2 md:pr-4 py-1.5 md:py-2 text-xs md:text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md md:rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 appearance-none text-gray-900 dark:text-gray-100">
                                <option value="all">Tất cả</option>
                                {JLPT_LEVELS.map(l => (<option key={l.value} value={l.value}>{l.label}</option>))}
                            </select>
                            <GraduationCap className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                        </div>
                    </div>
                    <div className="space-y-0.5 md:space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Từ loại</label>
                        <div className="relative">
                            <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)} className="w-full pl-6 md:pl-9 pr-2 md:pr-4 py-1.5 md:py-2 text-xs md:text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md md:rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 appearance-none text-gray-900 dark:text-gray-100">
                                <option value="all">Tất cả</option>
                                {Object.entries(POS_TYPES).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                            </select>
                            <Tag className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                        </div>
                    </div>
                    <div className="space-y-0.5 md:space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Âm thanh</label>
                        <div className="relative">
                            <select value={filterAudio} onChange={(e) => setFilterAudio(e.target.value)} className="w-full pl-6 md:pl-9 pr-2 md:pr-4 py-1.5 md:py-2 text-xs md:text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md md:rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 appearance-none text-gray-900 dark:text-gray-100">
                                <option value="all">Tất cả</option>
                                <option value="with">Có âm thanh</option>
                                <option value="without">Chưa có âm thanh</option>
                            </select>
                            <Volume2 className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                        </div>
                    </div>
                </div>

                {(filterLevel !== 'all' || filterPos !== 'all' || filterAudio !== 'all' || searchTerm.trim() !== '') && (
                    <div className="flex justify-end">
                        <button
                            onClick={resetFilters}
                            className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                            title="Bỏ tất cả bộ lọc"
                        >
                            <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span>Bỏ lọc</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area - List View Only */}
            <div className="flex-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-100 dark:divide-gray-700 table-fixed">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="w-32 md:w-44 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Từ vựng</th>
                                    <th className="w-16 md:w-20 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
                                    <th className="w-12 md:w-14 px-1 md:px-2 py-2 md:py-3 text-center text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">🔊</th>
                                    <th className="w-24 md:w-32 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nghĩa</th>
                                    <th className="w-16 md:w-20 px-1 md:px-2 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">SRS</th>
                                    <th className="w-24 md:w-28 px-1 md:px-2 py-2 md:py-3 text-center text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700">
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
                                                    onClick={() => onNavigateToEdit(card, { filterLevel, filterPos, filterAudio, sortOrder, searchTerm })}
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
                        <div className="py-4 text-center border-t border-gray-100 dark:border-gray-700 space-y-3">
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
                                        className="px-4 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                    >
                                        Tải thêm 100 từ vựng
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {filteredCards.length === 0 && <div className="p-6 md:p-10 text-center text-xs md:text-sm text-gray-400">Không tìm thấy từ vựng nào.</div>}
        </div>
    );
});

ListView.displayName = 'ListView';

export default ListView;
