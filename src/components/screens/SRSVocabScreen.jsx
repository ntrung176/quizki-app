import React, { useState, useEffect, useMemo } from 'react';
import { Layers, ArrowRight, CheckCircle2, RotateCw, BookOpen, AlertCircle, Calendar, Play, Plus, Zap, Award } from 'lucide-react';
import { TopTabBar } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../router';
import OnboardingTour from '../ui/OnboardingTour';
import { shuffleArray } from '../../utils/textProcessing';

const SRSVocabScreen = ({
    displayName,
    allCards = [],
    folders = [],
    cardFolders = {},
    setReviewCards,
    setStudySessionData,
    setFlashcardCards,
    setReviewMode,
    onStartReview
}) => {
    const navigate = useNavigate();

    // Calculate comprehensive stats for each folder (including completed ones)
    const folderStats = useMemo(() => {
        const stats = {};
        
        // Initialize stats for all folders
        folders.forEach(f => {
            stats[f.id] = { id: f.id, name: f.name, newCards: [], dueCards: [], synonymDueCards: [], total: 0, masteredCount: 0 };
        });
        
        // Unfiled folder
        stats['unfiled'] = { id: 'unfiled', name: 'Từ vựng lẻ', newCards: [], dueCards: [], synonymDueCards: [], total: 0, masteredCount: 0 };

        allCards.forEach(card => {
            const fId = cardFolders[card.id] || 'unfiled';
            if (!stats[fId]) {
                stats[fId] = { id: fId, name: 'Học phần ẩn', newCards: [], dueCards: [], synonymDueCards: [], total: 0, masteredCount: 0 };
            }
            stats[fId].total++;
            
            // Seen / Mastered calculation
            if ((card.seenCount || 0) > 0) {
                stats[fId].masteredCount++;
            }

            // Check if New
            if (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined) {
                stats[fId].newCards.push(card);
            } 
            // Check if Due
            else {
                const nextReview = card.nextReview_back;
                if (nextReview && nextReview <= Date.now()) {
                    const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
                    const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
                    const dictationStreak = typeof card.correctStreak_dictation === 'number' ? card.correctStreak_dictation : 0;
                    
                    if (backStreak < 1 || (card.example && card.example.trim() !== '' && exampleStreak < 1) || dictationStreak < 1) {
                        stats[fId].dueCards.push(card);
                    }
                }
            }

            // Check if Synonym Due
            if (card.synonym && card.synonym.trim() !== '') {
                const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
                if (synonymStreak < 1) {
                    stats[fId].synonymDueCards.push(card);
                }
            }
        });

        return Object.values(stats)
            .filter(f => f.total > 0) // only folders that have cards
            .map(f => {
                const masteredPct = f.total > 0 ? Math.round((f.masteredCount / f.total) * 100) : 0;
                
                // Nice default badges based on name
                let levelBadge = 'VOCAB';
                const nameLower = f.name.toLowerCase();
                if (nameLower.includes('n1')) levelBadge = 'N1 LEVEL';
                else if (nameLower.includes('n2')) levelBadge = 'N2 LEVEL';
                else if (nameLower.includes('n3')) levelBadge = 'N3 LEVEL';
                else if (nameLower.includes('n4')) levelBadge = 'N4 LEVEL';
                else if (nameLower.includes('n5')) levelBadge = 'N5 LEVEL';
                else if (nameLower.includes('giao tiếp') || nameLower.includes('daily')) levelBadge = 'COMMUNICATION';
                else if (nameLower.includes('kinh doanh') || nameLower.includes('business')) levelBadge = 'BUSINESS';

                return {
                    ...f,
                    levelBadge,
                    masteredPct,
                    hasAction: f.newCards.length > 0 || f.dueCards.length > 0 || f.synonymDueCards.length > 0
                };
            })
            .sort((a, b) => b.total - a.total); // Sort by largest count
    }, [allCards, folders, cardFolders]);

    const globalStats = useMemo(() => {
        return folderStats.reduce((acc, curr) => ({
            new: acc.new + curr.newCards.length,
            due: acc.due + curr.dueCards.length,
            synonym: acc.synonym + curr.synonymDueCards.length,
        }), { new: 0, due: 0, synonym: 0 });
    }, [folderStats]);

    const handleAction = (folderId, actionType, cards) => {
        if (cards.length === 0) return;
        
        switch(actionType) {
            case 'new':
                // For learning new cards, use Flashcard mode
                if (setFlashcardCards) {
                    setFlashcardCards(cards);
                    navigate(ROUTES.FLASHCARD);
                }
                break;
            case 'due': {
                // Build mixed review cards with proper reviewType for each card
                const today = new Date();
                const isNew = (card) => card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;

                const dueBackCards = cards
                    .filter(card => {
                        const streak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
                        if (streak >= 1) return false;
                        return isNew(card) || card.nextReview_back <= today;
                    })
                    .map(card => ({ ...card, reviewType: 'back' }));

                const dueExampleCards = cards
                    .filter(card => {
                        if (!card.example || card.example.trim() === '') return false;
                        const streak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
                        if (streak >= 1) return false;
                        return isNew(card) || card.nextReview_back <= today;
                    })
                    .map(card => ({ ...card, reviewType: 'example' }));

                const dueDictationCards = cards
                    .filter(card => {
                        const streak = typeof card.correctStreak_dictation === 'number' ? card.correctStreak_dictation : 0;
                        if (streak >= 1) return false;
                        return isNew(card) || card.nextReview_back <= today;
                    })
                    .map(card => ({ ...card, reviewType: 'dictation' }));

                const mixed = shuffleArray([...dueBackCards, ...dueExampleCards, ...dueDictationCards]);
                if (mixed.length > 0) {
                    if (setReviewCards) setReviewCards(mixed);
                    if (setReviewMode) setReviewMode('mixed');
                    navigate(ROUTES.REVIEW);
                }
                break;
            }
            case 'synonym':
                if (setReviewCards) setReviewCards(cards);
                if (setReviewMode) setReviewMode('synonym');
                navigate(ROUTES.REVIEW);
                break;
        }
    };

    const handleResumeGlobal = () => {
        // Collect all due cards across all folders
        const allDue = folderStats.flatMap(f => f.dueCards);
        if (allDue.length > 0) {
            handleAction(null, 'due', allDue);
        } else {
            const allNew = folderStats.flatMap(f => f.newCards);
            if (allNew.length > 0) {
                handleAction(null, 'new', allNew);
            }
        }
    };

    return (
        <div className="min-h-[calc(100vh-140px)] animate-fade-in pb-24 bg-gray-50 dark:bg-gray-900">
            <TopTabBar tabs={VOCAB_TABS} />
            <div className="max-w-5xl mx-auto space-y-8 px-4 md:px-8 mt-6">
                
                {/* Today's Focus Overview Banner (Matches Screenshot 4) */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col lg:flex-row gap-6 justify-between items-stretch">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                    
                    <div className="flex-1 space-y-6 z-10 flex flex-col justify-between">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/20 border border-sky-500/30 rounded-full text-[10px] font-black text-sky-300 tracking-wider uppercase mb-3">
                                <Zap className="w-3 h-3 text-sky-400 fill-current" />
                                Mục tiêu hôm nay
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black mb-1.5 tracking-tight">Mục tiêu hôm nay</h1>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">
                                Bạn đang tiến bộ rất tốt, {displayName || 'người dùng'}.
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                            <div className="flex gap-4">
                                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1 min-w-[120px]">
                                    <div className="text-2xl font-black text-orange-400 mb-0.5">{globalStats.due}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cần ôn tập</div>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1 min-w-[120px]">
                                    <div className="text-2xl font-black text-cyan-400 mb-0.5">{globalStats.new}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Từ mới</div>
                                </div>
                            </div>
                            {(globalStats.due > 0 || globalStats.new > 0) && (
                                <button 
                                    onClick={handleResumeGlobal}
                                    className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-4 rounded-2xl font-black text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Tiếp tục phiên học
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right side Mastery Streak panel */}
                    <div className="w-full lg:w-80 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col justify-between z-10 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-200">Chuỗi học tập</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Hãy tiếp tục học để duy trì chuỗi học tập!</p>
                            </div>
                            <Award className="w-8 h-8 text-amber-400" />
                        </div>
                        <div className="space-y-2">
                            <div className="text-3xl font-black text-white flex items-baseline gap-1">
                                12 <span className="text-xs font-bold text-slate-400 uppercase">Ngày</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: '80%' }} />
                            </div>
                            <p className="text-[10px] text-amber-300 font-bold tracking-wide">12 ngày liên tục học tập chăm chỉ!</p>
                        </div>
                    </div>
                </div>

                {/* Vocabulary Sets Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight">Học phần từ vựng</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Chọn một học phần để bắt đầu phiên học tập.</p>
                        </div>
                        <button 
                            onClick={() => navigate(ROUTES.VOCAB_LIST)}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                            Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    
                    {folderStats.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 text-center border border-gray-100 dark:border-slate-700/50 shadow-sm">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Tuyệt vời!</h3>
                            <p className="text-gray-500 dark:text-gray-400">Bạn chưa có thẻ từ vựng nào trong thư viện.</p>
                            <button onClick={() => navigate(ROUTES.BOOK)} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-75 transition-colors text-xs">
                                Đến Thư viện Sách
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {folderStats.map(folder => (
                                <div key={folder.id} className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-305 flex flex-col justify-between space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start">
                                            <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                {folder.levelBadge}
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{folder.total} Thẻ</span>
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-lg text-gray-800 dark:text-white leading-tight">{folder.name}</h3>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-wide">
                                                Đã thuộc {folder.masteredPct}%
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons inside Card */}
                                    <div className="space-y-2 pt-2">
                                        {folder.newCards.length > 0 && (
                                            <button 
                                                onClick={() => handleAction(folder.id, 'new', folder.newCards)}
                                                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 transition-colors border border-cyan-100 dark:border-cyan-900/50 group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Layers className="w-4 h-4" />
                                                    <span className="font-bold text-xs">Học từ mới</span>
                                                </div>
                                                <span className="bg-cyan-200/60 dark:bg-cyan-900/80 px-2 py-0.5 rounded-full text-[10px] font-black">{folder.newCards.length}</span>
                                            </button>
                                        )}
                                        
                                        {folder.dueCards.length > 0 && (
                                            <button 
                                                onClick={() => handleAction(folder.id, 'due', folder.dueCards)}
                                                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-colors border border-orange-100 dark:border-orange-900/50 group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <RotateCw className="w-4 h-4 animate-spin-slow" />
                                                    <span className="font-bold text-xs">Ôn tập thẻ cũ</span>
                                                </div>
                                                <span className="bg-orange-200/60 dark:bg-orange-900/80 px-2 py-0.5 rounded-full text-[10px] font-black">{folder.dueCards.length}</span>
                                            </button>
                                        )}

                                        {folder.synonymDueCards.length > 0 && folder.dueCards.length === 0 && folder.newCards.length === 0 && (
                                            <button 
                                                onClick={() => handleAction(folder.id, 'synonym', folder.synonymDueCards)}
                                                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 transition-colors border border-purple-100 dark:border-purple-900/50 group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span className="font-bold text-xs">Luyện đồng nghĩa</span>
                                                </div>
                                                <span className="bg-purple-200/60 dark:bg-purple-900/80 px-2 py-0.5 rounded-full text-[10px] font-black">{folder.synonymDueCards.length}</span>
                                            </button>
                                        )}

                                        {!folder.hasAction && (
                                            <div className="w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs border border-dashed border-slate-200 dark:border-slate-700/60">
                                                ✓ Đã hoàn thành học phần này
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions (Matches Screenshot 4) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate(ROUTES.BOOK)}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white">Thêm từ vựng mới</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Học danh sách từ vựng mới hoặc nhập từ các bộ sách.</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={() => {
                            // Find all cards with seenCount > 0 and low success stats, or just mixed reviews
                            const lowCards = allCards.filter(c => (c.correctStreak_back || 0) < 2 && (c.seenCount || 0) > 0);
                            if (lowCards.length > 0) {
                                handleAction(null, 'due', lowCards);
                            } else {
                                handleResumeGlobal();
                            }
                        }}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                                <RotateCw className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white">Ôn tập lỗi sai</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Tập trung ôn tập những thẻ bạn vừa trả lời sai.</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Last Studied Section (Matches Screenshot 4) */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-gray-800 dark:text-white text-base">Học gần đây</h3>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700/60 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                                <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-white">Ngữ pháp N2: Động từ truyền ý</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Đã hoàn thành phiên ôn tập</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">2 giờ trước</span>
                    </div>
                </div>

                <OnboardingTour section="vocabReview" />
            </div>
        </div>
    );
};

export default SRSVocabScreen;
