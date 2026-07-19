import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingIndicator from '../ui/LoadingIndicator';
import { Search, Filter, Bookmark, BookOpen, ExternalLink } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getSharedGrammarPointsList, getSharedGrammarSrs, getCachedUserGrammarSrsData, updateCachedUserGrammarSrs, subscribeGrammarSrs } from '../../utils/grammarService';
import { showToast } from '../../utils/toast';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_COLORS = {
    N5: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/40',
    N4: 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/40',
    N3: 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/40',
    N2: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/40',
    N1: 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-900/40',
};

const LEVEL_BORDER_COLORS = {
    N5: 'border-emerald-500',
    N4: 'border-sky-500',
    N3: 'border-sky-500',
    N2: 'border-amber-500',
    N1: 'border-rose-500',
};

const GrammarListScreen = () => {
    const user = getAuth().currentUser;
    const userId = user?.uid;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [grammarList, setGrammarList] = useState([]);
    const [userGrammarSRS, setUserGrammarSRS] = useState(new Set());
    const [srsData, setSrsData] = useState({});
    const [loading, setLoading] = useState(true);

    const [selectedLevel, setSelectedLevel] = useState(() => searchParams.get('level') || 'N5');
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');

    useEffect(() => {
        const load = async () => {
            try {
                const [gps, srs] = await Promise.all([
                    getSharedGrammarPointsList(),
                    userId ? getSharedGrammarSrs(userId) : Promise.resolve({})
                ]);
                setGrammarList(gps || []);
                if (userId && srs) {
                    setSrsData(srs);
                    setUserGrammarSRS(new Set(Object.keys(srs)));
                }
            } catch (e) {
                console.error('Error loading grammar points:', e);
            } finally {
                setLoading(false);
            }
        };
        load();

        // Real-time listener for cross-device sync
        let unsubSrs = () => {};
        if (userId) {
            unsubSrs = subscribeGrammarSrs(userId, (freshSrs) => {
                setSrsData(freshSrs);
                setUserGrammarSRS(new Set(Object.keys(freshSrs)));
            });
        }
        return () => unsubSrs();
    }, [userId]);

    // Update query params in URL
    useEffect(() => {
        const params = {};
        if (selectedLevel) params.level = selectedLevel;
        if (searchQuery) params.search = searchQuery;
        setSearchParams(params);
    }, [selectedLevel, searchQuery]);

    const filteredGrammar = useMemo(() => {
        return grammarList.filter(gp => {
            const levelStr = gp.level || gp.jlpt || 'N5';
            const matchesLevel = levelStr.toUpperCase().includes(selectedLevel.toUpperCase());

            const query = searchQuery.trim().toLowerCase();
            const matchesSearch = query === '' || 
                (gp.pattern && gp.pattern.toLowerCase().includes(query)) ||
                (gp.meaningShort && gp.meaningShort.toLowerCase().includes(query)) ||
                (gp.meaning && gp.meaning.toLowerCase().includes(query)) ||
                (gp.textbookTitle && gp.textbookTitle.toLowerCase().includes(query));

            return matchesLevel && matchesSearch;
        });
    }, [grammarList, selectedLevel, searchQuery]);

    const toggleBookmark = async (e, gp) => {
        e.stopPropagation(); // Avoid card click navigation

        if (!userId) {
            showToast('Vui lòng đăng nhập để lưu cấu trúc ngữ pháp', 'error');
            return;
        }

        const isAdded = userGrammarSRS.has(gp.id);

        if (isAdded) {
            // Already bookmarked - we could prompt or redirect to the saved list,
            // but let's allow unfavoriting as well, just like bookmarks usually work.
            // Wait, in Kanji screen we didn't support removing here to prevent accidental losses,
            // but let's mirror that pattern to keep it aligned, OR let's add a small toast notification.
            showToast('Mẫu ngữ pháp này đã được thêm vào SRS. Bạn có thể quản lý tại tab "Đã lưu".', 'info');
            return;
        }

        // Optimistic UI Update
        setUserGrammarSRS(prev => {
            const next = new Set(prev);
            next.add(gp.id);
            return next;
        });
        showToast(`Đã thêm "${gp.pattern}" vào danh sách ôn tập SRS`);

        try {
            const now = Date.now();
            const newSrs = {
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
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, gp.id), newSrs, { merge: true });
            updateCachedUserGrammarSrs(userId, gp.id, newSrs);

            // Trigger daily activity count
            const todayDateString = new Date().toISOString().split('T')[0];
            const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
            await setDoc(activityRef, {
                newGrammarAdded: increment(1)
            }, { merge: true }).catch(() => {});

        } catch (e) {
            console.error('Error bookmarking grammar:', e);
            showToast('Lỗi khi lưu vào SRS', 'error');
            // Revert state
            setUserGrammarSRS(prev => {
                const next = new Set(prev);
                next.delete(gp.id);
                return next;
            });
        }
    };

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải dữ liệu tra cứu..." />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-8">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6 animate-fade-in">
                {/* Level selector tabs */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {JLPT_LEVELS.map(lvl => {
                        const isActive = selectedLevel === lvl;
                        return (
                            <button
                                key={lvl}
                                onClick={() => setSelectedLevel(lvl)}
                                className={`px-6 py-2.5 rounded-2xl text-sm font-extrabold transition-all duration-300 transform active:scale-95 ${isActive ? LEVEL_COLORS[lvl] : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
                            >
                                {lvl}
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left">
                        <h2 className="text-lg font-extrabold text-gray-800 dark:text-white">
                            Tra cứu cấu trúc Ngữ pháp
                        </h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Tìm kiếm qua các mẫu câu, dịch nghĩa hoặc các bài học trong sách giáo khoa.
                        </p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nhập mẫu câu hoặc nghĩa..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400"
                        />
                    </div>
                </div>

                {/* List Results */}
                {filteredGrammar.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredGrammar.map(gp => {
                            const isBookmarked = userGrammarSRS.has(gp.id);
                            return (
                                <div
                                    key={gp.id}
                                    onClick={() => {
                                        const currentParams = new URLSearchParams(searchParams);
                                        currentParams.set('from', 'list');
                                        currentParams.set('tb', gp.textbookId || '');
                                        currentParams.set('ls', gp.lessonId || '');
                                        navigate(`/grammar/detail/${gp.id}?${currentParams.toString()}`);
                                    }}
                                    className={`bg-white dark:bg-slate-800 border border-gray-250/70 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] relative group overflow-hidden`}
                                >
                                    {/* Bookmark indicator */}
                                    <button
                                        onClick={(e) => toggleBookmark(e, gp)}
                                        className={`absolute top-4 right-4 p-2 rounded-xl border transition-all duration-200 active:scale-95 ${isBookmarked ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 text-indigo-650 dark:text-indigo-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-750 text-slate-400 hover:text-indigo-500'}`}
                                    >
                                        <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-indigo-500' : ''}`} />
                                    </button>

                                    <div className="space-y-2 pr-10">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                            <span className="truncate max-w-[150px]">{gp.textbookTitle}</span>
                                        </div>

                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors font-japanese">
                                            {gp.pattern}
                                        </h3>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-750/70 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        <span className="line-clamp-1 flex-1 pr-2">{gp.meaningShort || gp.meaning}</span>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-16 shadow-sm border border-gray-200/60 dark:border-slate-700/60 text-center space-y-4">
                        <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                        <div className="space-y-1">
                            <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">Không tìm thấy mẫu ngữ pháp nào</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                                Hãy thử tìm kiếm bằng một từ khoá khác hoặc lọc các cấp độ JLPT khác.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarListScreen;
