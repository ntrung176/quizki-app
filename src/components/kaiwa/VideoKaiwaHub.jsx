import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Film, Sparkles, Search, Filter, Play, Plus, Trash2, Edit3, 
    ArrowLeft, Link as LinkIcon, BookOpen, Layers, CheckCircle2, 
    Bookmark, Zap, ShieldAlert, Award, ChevronDown
} from 'lucide-react';
import { KAIWA_LEVELS, KAIWA_CATEGORIES } from './videoKaiwaConstants';
import { getKaiwaVideos, saveKaiwaVideo, deleteKaiwaVideo, extractYoutubeId } from '../../services/videoKaiwaService';
import VideoKaiwaPlayer from './VideoKaiwaPlayer';
import VideoKaiwaTranscript from './VideoKaiwaTranscript';
import VideoKaiwaShadowingModal from './VideoKaiwaShadowingModal';
import VideoKaiwaAdminModal from './VideoKaiwaAdminModal';
import VideoKaiwaMovieCard from './VideoKaiwaMovieCard';
import VideoKaiwaCategoryRow from './VideoKaiwaCategoryRow';
import VideoKaiwaHeroBanner from './VideoKaiwaHeroBanner';
import LoadingIndicator from '../ui/LoadingIndicator';

const VideoKaiwaHub = ({ profile, isAdmin, awardXP }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [customUrl, setCustomUrl] = useState('');
    
    // Active Playing Video State
    const [currentVideo, setCurrentVideo] = useState(null);
    const [activeSubIndex, setActiveSubIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoopingSentence, setIsLoopingSentence] = useState(false);
    const [showFurigana, setShowFurigana] = useState(true);
    const [showVietnamese, setShowVietnamese] = useState(true);
    
    // Modals
    const [shadowingSub, setShadowingSub] = useState(null);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState(null);
    const [notification, setNotification] = useState('');

    const seekHandlerRef = useRef(null);
    const userIsAdmin = isAdmin || (profile?.email && ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(profile.email));

    // Fetch Videos on Mount
    const loadVideos = async () => {
        setLoading(true);
        try {
            const list = await getKaiwaVideos();
            setVideos(list || []);
        } catch (e) {
            console.error('Error loading kaiwa videos:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVideos();
    }, []);

    // Filter Videos
    const filteredVideos = videos.filter(v => {
        const matchesLevel = selectedLevel === 'all' || v.level === selectedLevel;
        const matchesCat = selectedCategory === 'all' || v.category === selectedCategory;
        const matchesSearch = !searchQuery.trim() || 
            v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesLevel && matchesCat && matchesSearch;
    });

    // Handle Custom YouTube Link Submission (Admin Only)
    const handleStartCustomVideo = () => {
        if (!userIsAdmin) return;
        const yId = extractYoutubeId(customUrl);
        if (!yId) {
            alert('Vui lòng nhập Link YouTube hợp lệ (ví dụ: https://www.youtube.com/watch?v=...)');
            return;
        }

        const customVideoObj = {
            id: `custom_${yId}`,
            youtubeId: yId,
            title: 'Video YouTube Tự Do',
            channelTitle: 'Người dùng tải lên',
            level: 'N3',
            category: 'daily',
            duration: 300,
            thumbnail: `https://img.youtube.com/vi/${yId}/hqdefault.jpg`,
            subtitles: [
                {
                    id: 1,
                    start: 0,
                    end: 300,
                    ja: 'YouTube Video Player (Đang phát video riêng của bạn)',
                    furigana: 'YouTube Video Player (Đang phát video riêng của bạn)',
                    vi: 'Bạn có thể xem video và luyện nghe theo phụ đề gốc trên YouTube.',
                    keywords: []
                }
            ]
        };

        setCurrentVideo(customVideoObj);
        setActiveSubIndex(0);
        setCurrentTime(0);
    };

    // Handle Delete Video (Admin)
    const handleDeleteVideo = async (e, videoId) => {
        e.stopPropagation();
        if (window.confirm('Bạn có chắc chắn muốn xóa video này khỏi hệ thống?')) {
            try {
                await deleteKaiwaVideo(videoId);
                setVideos(prev => prev.filter(v => v.id !== videoId));
                if (currentVideo?.id === videoId) setCurrentVideo(null);
                setNotification('Đã xóa video thành công!');
                setTimeout(() => setNotification(''), 3000);
            } catch (err) {
                alert('Lỗi khi xóa video: ' + err.message);
            }
        }
    };

    // Save word to flashcard handler
    const handleSaveToFlashcard = (kw) => {
        setNotification(`Đã lưu từ vựng "${kw.word}" vào sổ tay ôn tập!`);
        setTimeout(() => setNotification(''), 3000);
    };

    // Update single or all subtitles in current video (Admin inline editing)
    const handleUpdateSubtitles = async (updatedSubtitles) => {
        if (!currentVideo) return;
        const updatedVideo = {
            ...currentVideo,
            subtitles: updatedSubtitles
        };
        setCurrentVideo(updatedVideo);
        setVideos(prev => prev.map(v => v.id === currentVideo.id ? updatedVideo : v));
        try {
            await saveKaiwaVideo(updatedVideo);
            setNotification('Đã cập nhật câu thoại thành công!');
            setTimeout(() => setNotification(''), 3000);
        } catch (e) {
            console.error('Lỗi khi lưu câu thoại:', e);
            setNotification('Lỗi khi lưu câu thoại: ' + (e.message || ''));
            setTimeout(() => setNotification(''), 3000);
        }
    };

    // Format seconds to mm:ss
    const formatDuration = (sec) => {
        if (!sec) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    // Compute all unique keywords across the active video
    const allVideoKeywords = useMemo(() => {
        if (!currentVideo?.subtitles) return [];
        const keywords = [];
        const seenWords = new Set();
        currentVideo.subtitles.forEach(sub => {
            (sub.keywords || []).forEach(kw => {
                if (kw && kw.word && !seenWords.has(kw.word)) {
                    seenWords.add(kw.word);
                    keywords.push(kw);
                }
            });
        });
        return keywords;
    }, [currentVideo]);

    // Automatically pause video whenever Shadowing modal is opened
    useEffect(() => {
        if (shadowingSub) {
            setIsPlaying(false);
        }
    }, [shadowingSub]);

    if (loading) {
        return <LoadingIndicator text="Đang tải thư viện Video Kaiwa..." />;
    }

    return (
        <div className={`w-full ${currentVideo ? 'max-w-none h-full max-h-full flex-1 flex flex-col p-0 overflow-hidden' : 'max-w-7xl mx-auto px-3 sm:px-4 space-y-6 pb-20'} font-sans animate-fade-in`}>
            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white border border-emerald-500 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{notification}</span>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CASE A: VIDEO PLAYER & PRACTICE VIEW (WHEN A VIDEO IS SELECTED)           */}
            {/* ========================================================================= */}
            {currentVideo ? (
                <div className="w-full h-full max-h-full flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Main Video & Transcript Layout - Responsive flex on mobile, 12-col grid on desktop */}
                    <div className="flex-1 min-h-0 h-full max-h-full flex flex-col lg:grid lg:grid-cols-12 gap-0 lg:gap-2.5 items-stretch w-full overflow-hidden">
                        {/* Left / Top: Video Player with Web App Controls Only */}
                        <div className="w-full lg:col-span-8 xl:col-span-8 flex flex-col shrink-0 lg:shrink min-h-0 h-auto lg:h-full lg:max-h-full">
                            <VideoKaiwaPlayer
                                video={currentVideo}
                                activeSubIndex={activeSubIndex}
                                setActiveSubIndex={setActiveSubIndex}
                                isPlaying={isPlaying}
                                setIsPlaying={setIsPlaying}
                                onSeekTo={seekHandlerRef}
                                isLoopingSentence={isLoopingSentence}
                                setIsLoopingSentence={setIsLoopingSentence}
                                allKeywords={allVideoKeywords}
                                onOpenShadowingModal={() => {
                                    setIsPlaying(false);
                                    if (currentVideo.subtitles?.[activeSubIndex]) {
                                        setShadowingSub(currentVideo.subtitles[activeSubIndex]);
                                    }
                                }}
                                showFurigana={showFurigana}
                                setShowFurigana={setShowFurigana}
                                showVietnamese={showVietnamese}
                                setShowVietnamese={setShowVietnamese}
                                onWordLookup={(kanji, reading) => {
                                    setNotification(`Từ: ${kanji} (${reading})`);
                                    setTimeout(() => setNotification(''), 2500);
                                }}
                                onBack={() => {
                                    setCurrentVideo(null);
                                    setIsPlaying(false);
                                }}
                                isAdmin={userIsAdmin}
                                onEditVideo={() => {
                                    setEditingVideo(currentVideo);
                                    setIsAdminModalOpen(true);
                                }}
                            />
                        </div>

                        {/* Right / Bottom: Sidebar Transcript with Admin Inline Editing */}
                        <div className="w-full lg:col-span-4 xl:col-span-4 flex flex-col min-h-0 flex-1 h-auto lg:h-full lg:max-h-full overflow-hidden">
                            <VideoKaiwaTranscript
                                video={currentVideo}
                                allVideos={videos}
                                activeSubIndex={activeSubIndex}
                                isAdmin={userIsAdmin}
                                onUpdateSubtitles={handleUpdateSubtitles}
                                onSeekToSub={(startSec) => {
                                    seekHandlerRef.current?.(startSec, true);
                                }}
                                onSelectVideo={(newVid) => {
                                    setCurrentVideo(newVid);
                                    setActiveSubIndex(0);
                                    setCurrentTime(0);
                                }}
                                onOpenShadowing={(sub) => {
                                    setIsPlaying(false);
                                    setShadowingSub(sub);
                                }}
                                showFurigana={showFurigana}
                                showVietnamese={showVietnamese}
                                onSaveToFlashcard={handleSaveToFlashcard}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                /* ========================================================================= */
                /* CASE B: VIDEO HUB LIBRARY (CINEMA / MOVIE STREAMING LAYOUT)                */
                /* ========================================================================= */
                <div className="space-y-6 sm:space-y-8 pb-16">
                    {/* 1. Netflix Spotlight Hero Banner (Featured Top Video) - Luôn hiển thị kể cả khi tìm kiếm */}
                    {videos.length > 0 && (
                        <VideoKaiwaHeroBanner
                            video={videos[0]}
                            onSelectVideo={(v) => {
                                setCurrentVideo(v);
                                setActiveSubIndex(0);
                            }}
                            formatDuration={formatDuration}
                        />
                    )}

                    {/* 2. Admin Only: Custom YouTube Link Quick Learner & Admin Add Button */}
                    {userIsAdmin && (
                        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-amber-500" />
                                    <span>Tự học theo link YouTube riêng</span>
                                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                        BETA - ADMIN
                                    </span>
                                </span>
                                <button
                                    onClick={() => {
                                        setEditingVideo(null);
                                        setIsAdminModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> Thêm Video Mới (Admin)
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Dán đường dẫn YouTube tại đây (ví dụ: https://www.youtube.com/watch?v=...)"
                                    value={customUrl}
                                    onChange={(e) => setCustomUrl(e.target.value)}
                                    className="flex-1 p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                />
                                <button
                                    onClick={handleStartCustomVideo}
                                    className="px-6 py-2.5 sm:py-3 bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 font-black text-xs rounded-full flex items-center gap-1.5 shadow-[0_6px_18px_rgba(244,148,188,0.4)] hover:shadow-[0_10px_25px_rgba(244,148,188,0.7)] transition-all cursor-pointer shrink-0"
                                >
                                    <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                                    <span>Mở Video</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 3. Search & Filter Controls (Category & Level Dropdowns) */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm phim, video bài học, chủ đề..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center text-[10px] cursor-pointer font-bold"
                                    title="Xóa tìm kiếm"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Filter Dropdowns Container */}
                        <div className="flex items-center gap-2 flex-col sm:flex-row">
                            {/* Category Filter Dropdown */}
                            <div className="relative w-full sm:w-60">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full appearance-none pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition truncate"
                                >
                                    {KAIWA_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold py-1">
                                            {cat.title || cat.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Level Filter Dropdown */}
                            <div className="relative w-full sm:w-44">
                                <select
                                    value={selectedLevel}
                                    onChange={(e) => setSelectedLevel(e.target.value)}
                                    className="w-full appearance-none pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition"
                                >
                                    {KAIWA_LEVELS.map(lvl => (
                                        <option key={lvl.id} value={lvl.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold py-1">
                                            {lvl.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* VIEW 1: FILTERED / SEARCH GRID VIEW (WHEN SEARCH OR SPECIFIC FILTER ACTIVE) */}
                    {/* ========================================================================= */}
                    {(searchQuery || selectedCategory !== 'all' || selectedLevel !== 'all') ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-[#00d2ff] via-[#70bbfd] to-[#bfdbfe] bg-clip-text text-transparent select-none">
                                        {selectedCategory !== 'all' 
                                            ? (KAIWA_CATEGORIES.find(c => c.id === selectedCategory)?.title || 'Chủ đề đã chọn')
                                            : (searchQuery ? `Kết quả tìm kiếm: "${searchQuery}"` : 'Tất cả video')}
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                        {filteredVideos.length} video
                                    </span>
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedCategory('all');
                                        setSelectedLevel('all');
                                        setSearchQuery('');
                                    }}
                                    className="text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1"
                                >
                                    <span>← Quay lại rạp phim đầy đủ</span>
                                </button>
                            </div>

                            {filteredVideos.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                                    {filteredVideos.map(video => (
                                        <VideoKaiwaMovieCard
                                            key={video.id}
                                            video={video}
                                            onSelectVideo={(v) => {
                                                setCurrentVideo(v);
                                                setActiveSubIndex(0);
                                            }}
                                            userIsAdmin={userIsAdmin}
                                            onEditVideo={(v) => {
                                                setEditingVideo(v);
                                                setIsAdminModalOpen(true);
                                            }}
                                            onDeleteVideo={handleDeleteVideo}
                                            formatDuration={formatDuration}
                                            cardWidthClass="w-full"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                                    <Film className="w-12 h-12 text-slate-400 mx-auto opacity-40" />
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                        Không tìm thấy video nào phù hợp với bộ lọc hiện tại.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSelectedCategory('all');
                                            setSelectedLevel('all');
                                            setSearchQuery('');
                                        }}
                                        className="px-5 py-2.5 rounded-full bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 font-black text-xs cursor-pointer shadow-[0_6px_18px_rgba(244,148,188,0.4)] hover:shadow-[0_10px_25px_rgba(244,148,188,0.7)] transition-all"
                                    >
                                        Xóa tất cả bộ lọc
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ========================================================================= */
                        /* VIEW 2: STREAMING THEMED CATEGORY ROWS (NETFLIX / MOVIE THEATER STYLE)     */
                        /* ========================================================================= */
                        <div className="space-y-6 sm:space-y-8">
                            {/* Row 1: Mới cập nhật & Nổi bật */}
                            {videos.length > 0 && (
                                <VideoKaiwaCategoryRow
                                    title="Mới Cập Nhật & Thịnh Hành"
                                    titleGradient="from-[#00d2ff] via-[#70bbfd] to-[#bfdbfe]"
                                    videos={videos}
                                    onSelectVideo={(v) => {
                                        setCurrentVideo(v);
                                        setActiveSubIndex(0);
                                    }}
                                    onViewAll={() => setSelectedCategory('all')}
                                    userIsAdmin={userIsAdmin}
                                    onEditVideo={(v) => {
                                        setEditingVideo(v);
                                        setIsAdminModalOpen(true);
                                    }}
                                    onDeleteVideo={handleDeleteVideo}
                                    formatDuration={formatDuration}
                                />
                            )}

                            {/* Rows 2+: Themed Categories (Kaigo, Đời sống, Công sở, Phỏng vấn, Tin tức, Anime) */}
                            {KAIWA_CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                                const catVideos = videos.filter(v => v.category === cat.id);

                                return (
                                    <VideoKaiwaCategoryRow
                                        key={cat.id}
                                        title={cat.title || cat.label}
                                        titleGradient={cat.titleGradient}
                                        videos={catVideos}
                                        onSelectVideo={(v) => {
                                            setCurrentVideo(v);
                                            setActiveSubIndex(0);
                                        }}
                                        onViewAll={() => setSelectedCategory(cat.id)}
                                        userIsAdmin={userIsAdmin}
                                        onEditVideo={(v) => {
                                            setEditingVideo(v);
                                            setIsAdminModalOpen(true);
                                        }}
                                        onDeleteVideo={handleDeleteVideo}
                                        onAddNewVideo={() => {
                                            setEditingVideo({ category: cat.id, level: 'N3' });
                                            setIsAdminModalOpen(true);
                                        }}
                                        formatDuration={formatDuration}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Shadowing Practice Modal */}
            <VideoKaiwaShadowingModal
                isOpen={!!shadowingSub}
                onClose={() => setShadowingSub(null)}
                subtitle={shadowingSub}
                allKeywords={allVideoKeywords}
                onReplayAudio={() => {
                    if (shadowingSub) {
                        seekHandlerRef.current?.(shadowingSub.start, true, shadowingSub.end);
                    }
                }}
                awardXP={awardXP}
            />

            {/* Admin Add/Edit Video Modal */}
            <VideoKaiwaAdminModal
                isOpen={isAdminModalOpen}
                onClose={() => {
                    setIsAdminModalOpen(false);
                    setEditingVideo(null);
                }}
                editingVideo={editingVideo}
                onSaveSuccess={(savedVid) => {
                    setNotification('Đã xuất bản video thành công!');
                    loadVideos();
                    setTimeout(() => setNotification(''), 3000);
                }}
            />
        </div>
    );
};

export default VideoKaiwaHub;
