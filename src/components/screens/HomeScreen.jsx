import React, { useState } from 'react';
import {
    Zap, Repeat2, MessageSquare, FileText, GraduationCap, Layers,
    Clock, Sparkles, Settings, Plus, Upload, List, FileCheck, HelpCircle
} from 'lucide-react';
import { ActionCard } from '../cards';
import { shuffleArray } from '../../utils/textProcessing';

const HomeScreen = ({
    displayName,
    dueCounts,
    totalCards,
    allCards,
    studySessionData,
    setStudySessionData,
    setNotification,
    setReviewMode,
    setView,
    onStartReview,
    onNavigate
}) => {
    const [activeFilter, setActiveFilter] = useState('review'); // 'study' or 'review'
    const [reviewCategory, setReviewCategory] = useState('all'); // 'all', 'old', 'new', 'grammar'

    const handleStartStudy = () => {
        // Prepare study cards - chỉ từ vựng chưa có SRS (chỉ cần intervalIndex_back === -1)
        const noSrsCards = allCards.filter(card => {
            return card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;
        });

        if (noSrsCards.length === 0) {
            setNotification('Không có từ vựng nào chưa có cấp độ SRS để học.');
            return;
        }

        // Tạo batch đầu tiên (5 từ) - ưu tiên Learning > New > Reviewing
        const learning = studySessionData.learning.filter(card =>
            noSrsCards.some(c => c.id === card.id)
        );
        const newCards = noSrsCards.filter(card =>
            !learning.some(c => c.id === card.id) &&
            !studySessionData.reviewing.some(c => c.id === card.id)
        );
        const reviewing = studySessionData.reviewing.filter(card =>
            noSrsCards.some(c => c.id === card.id) &&
            !learning.some(c => c.id === card.id)
        );

        // Tạo batch đầu tiên (5 từ) - đảm bảo shuffle đúng cách
        const firstBatch = [];
        // Ưu tiên 1: Learning (từ đã sai)
        if (learning.length > 0) {
            firstBatch.push(...shuffleArray(learning).slice(0, Math.min(5, learning.length)));
        }
        // Ưu tiên 2: New cards (từ mới chưa học)
        if (firstBatch.length < 5 && newCards.length > 0) {
            const shuffledNew = shuffleArray(newCards);
            firstBatch.push(...shuffledNew.slice(0, Math.min(5 - firstBatch.length, shuffledNew.length)));
        }
        // Ưu tiên 3: Reviewing (từ cần review)
        if (firstBatch.length < 5 && reviewing.length > 0) {
            const shuffledReviewing = shuffleArray(reviewing);
            firstBatch.push(...shuffledReviewing.slice(0, Math.min(5 - firstBatch.length, shuffledReviewing.length)));
        }

        if (firstBatch.length === 0) {
            setNotification('Không có từ vựng nào để học.');
            return;
        }

        setStudySessionData({
            learning: learning,
            new: newCards,
            reviewing: reviewing,
            currentBatch: firstBatch,
            currentPhase: 'multipleChoice',
            batchIndex: 0,
            allNoSrsCards: noSrsCards
        });
        setReviewMode('study');
        setView('STUDY');
    };

    return (
        <div className="space-y-1 md:space-y-2">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-1 md:gap-2 pb-1 border-b border-gray-100 dark:border-gray-700">
                <div className="flex-shrink-0 min-w-0">
                    <h2 className="text-sm md:text-lg lg:text-xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight break-words">
                        Chào, <span className="text-black dark:text-white">{displayName || 'bạn'}</span>! 👋
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-xs font-medium">Bạn đã sẵn sàng chinh phục mục tiêu hôm nay chưa?</p>
                </div>
                <div className="flex items-center space-x-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">{totalCards} từ vựng</span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl backdrop-blur-sm">
                <button
                    onClick={() => setActiveFilter('review')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 ${activeFilter === 'review'
                            ? 'bg-white dark:bg-gray-700 shadow-md text-amber-600 dark:text-amber-400 font-bold'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                        }`}
                >
                    <Zap className="w-4 h-4" />
                    <span className="text-xs md:text-sm">Chế độ Ôn tập</span>
                </button>
                <button
                    onClick={() => setActiveFilter('study')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 ${activeFilter === 'study'
                            ? 'bg-white dark:bg-gray-700 shadow-md text-teal-600 dark:text-teal-400 font-bold'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                        }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-xs md:text-sm">Chế độ Học</span>
                </button>
            </div>

            {/* Chế độ Học */}
            {activeFilter === 'study' && (
                <div className="space-y-1 md:space-y-1.5">
                    <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
                        <ActionCard
                            onClick={() => onStartReview('flashcard')}
                            icon={Layers}
                            title="Flashcard"
                            description="Từ vựng mới"
                            count={dueCounts.flashcard}
                            gradient="from-purple-600 to-pink-600"
                            disabled={dueCounts.flashcard === 0}
                        />
                        <ActionCard
                            onClick={handleStartStudy}
                            icon={GraduationCap}
                            title="Học"
                            description="Học từ mới"
                            count={dueCounts.study}
                            gradient="from-teal-500 to-emerald-600"
                            disabled={dueCounts.study === 0}
                        />
                    </div>
                </div>
            )}

            {/* Chế độ Ôn tập */}
            {activeFilter === 'review' && (
                <div className="space-y-1.5 md:space-y-2">
                    {/* 4 Action Cards dựa trên category đã chọn */}
                    <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
                        <ActionCard
                            onClick={() => onStartReview('mixed', reviewCategory)}
                            icon={Zap}
                            title="Hỗn hợp"
                            description="Tất cả loại câu hỏi"
                            count={reviewCategory === 'all' ? dueCounts.mixed : reviewCategory === 'old' ? dueCounts.old.mixed : reviewCategory === 'new' ? dueCounts.new.mixed : dueCounts.grammar.mixed}
                            gradient="from-amber-500 to-orange-600"
                            disabled={reviewCategory === 'all' ? dueCounts.mixed === 0 : reviewCategory === 'old' ? dueCounts.old.mixed === 0 : reviewCategory === 'new' ? dueCounts.new.mixed === 0 : dueCounts.grammar.mixed === 0}
                        />
                        <ActionCard
                            onClick={() => onStartReview('back', reviewCategory)}
                            icon={Repeat2}
                            title="Ý nghĩa"
                            description="Nhớ nghĩa từ vựng"
                            count={reviewCategory === 'all' ? dueCounts.back : reviewCategory === 'old' ? dueCounts.old.back : reviewCategory === 'new' ? dueCounts.new.back : dueCounts.grammar.back}
                            gradient="from-emerald-500 to-green-600"
                            disabled={reviewCategory === 'all' ? dueCounts.back === 0 : reviewCategory === 'old' ? dueCounts.old.back === 0 : reviewCategory === 'new' ? dueCounts.new.back === 0 : dueCounts.grammar.back === 0}
                        />
                        <ActionCard
                            onClick={() => onStartReview('synonym', reviewCategory)}
                            icon={MessageSquare}
                            title="Đồng nghĩa"
                            description="Từ tương tự"
                            count={reviewCategory === 'all' ? dueCounts.synonym : reviewCategory === 'old' ? dueCounts.old.synonym : reviewCategory === 'new' ? dueCounts.new.synonym : dueCounts.grammar.synonym}
                            gradient="from-blue-500 to-cyan-600"
                            disabled={reviewCategory === 'all' ? dueCounts.synonym === 0 : reviewCategory === 'old' ? dueCounts.old.synonym === 0 : reviewCategory === 'new' ? dueCounts.new.synonym === 0 : dueCounts.grammar.synonym === 0}
                        />
                        <ActionCard
                            onClick={() => onStartReview('example', reviewCategory)}
                            icon={FileText}
                            title="Ngữ cảnh"
                            description="Điền vào chỗ trống"
                            count={reviewCategory === 'all' ? dueCounts.example : reviewCategory === 'old' ? dueCounts.old.example : reviewCategory === 'new' ? dueCounts.new.example : dueCounts.grammar.example}
                            gradient="from-purple-600 to-pink-600"
                            disabled={reviewCategory === 'all' ? dueCounts.example === 0 : reviewCategory === 'old' ? dueCounts.old.example === 0 : reviewCategory === 'new' ? dueCounts.new.example === 0 : dueCounts.grammar.example === 0}
                        />
                    </div>

                    {/* 4 Button lọc ở dưới */}
                    <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center pt-1">
                        <button
                            onClick={() => setReviewCategory('all')}
                            className={`flex-1 min-w-[calc(50%-0.75rem)] md:min-w-[calc(25%-1.5rem)] px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${reviewCategory === 'all'
                                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                                <Repeat2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span>Tổng hợp</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setReviewCategory('old')}
                            className={`flex-1 min-w-[calc(50%-0.75rem)] md:min-w-[calc(25%-1.5rem)] px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${reviewCategory === 'old'
                                    ? 'bg-amber-600 dark:bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/50'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span>Từ cũ</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setReviewCategory('new')}
                            className={`flex-1 min-w-[calc(50%-0.75rem)] md:min-w-[calc(25%-1.5rem)] px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${reviewCategory === 'new'
                                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span>Từ mới</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setReviewCategory('grammar')}
                            className={`flex-1 min-w-[calc(50%-0.75rem)] md:min-w-[calc(25%-1.5rem)] px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${reviewCategory === 'grammar'
                                    ? 'bg-purple-600 dark:bg-purple-500 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/50'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span>Ngữ pháp</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Management Section */}
            <div className="pt-0.5 md:pt-1 space-y-1 md:space-y-1.5">
                <h3 className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center">
                    <Settings className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 text-gray-500 dark:text-gray-400" />
                    Quản lý & Tiện ích
                </h3>
                <div className="grid grid-cols-5 gap-1.5 md:gap-2">
                    <button
                        onClick={() => onNavigate('ADD_CARD')}
                        className="flex flex-col items-center justify-center p-2 md:p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-600 transition-all group min-h-[70px]"
                    >
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-1.5 md:p-2 rounded-lg mb-1.5 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 text-center leading-tight">Thêm từ mới</span>
                    </button>

                    <button
                        onClick={() => onNavigate('IMPORT')}
                        className="flex flex-col items-center justify-center p-2 md:p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-600 transition-all group min-h-[70px]"
                    >
                        <div className="bg-teal-50 dark:bg-teal-900/30 p-1.5 md:p-2 rounded-lg mb-1.5 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
                            <Upload className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-teal-700 dark:group-hover:text-teal-400 text-center leading-tight">Nhập File</span>
                    </button>

                    <button
                        onClick={() => onNavigate('LIST')}
                        className="flex flex-col items-center justify-center p-2 md:p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-600 transition-all group min-h-[70px]"
                    >
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 md:p-2 rounded-lg mb-1.5 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                            <List className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 text-center leading-tight">Xem Danh sách</span>
                    </button>

                    <button
                        onClick={() => setView('TEST')}
                        className="flex flex-col items-center justify-center p-2 md:p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-600 transition-all group min-h-[70px] disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={allCards.length === 0}
                    >
                        <div className="bg-rose-50 dark:bg-rose-900/30 p-1.5 md:p-2 rounded-lg mb-1.5 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 transition-colors">
                            <FileCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-rose-700 dark:group-hover:text-rose-400 text-center leading-tight">Kiểm Tra JLPT</span>
                    </button>

                    <button
                        onClick={() => onNavigate('HELP')}
                        className="flex flex-col items-center justify-center p-2 md:p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-600 transition-all group min-h-[70px]"
                    >
                        <div className="bg-orange-50 dark:bg-orange-900/30 p-1.5 md:p-2 rounded-lg mb-1.5 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                            <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-orange-700 dark:group-hover:text-orange-400 text-center leading-tight">Hướng dẫn</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomeScreen;
