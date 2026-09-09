import React, { useState, useEffect, useRef } from 'react';
import {
    X, Plus, Trash2, Sparkles, Upload, Link as LinkIcon,
    Save, CheckCircle2, AlertCircle, FileText, Film, Eye, Edit3, StopCircle, RefreshCw
} from 'lucide-react';
import { KAIWA_LEVELS, KAIWA_CATEGORIES } from './videoKaiwaConstants';
import { extractYoutubeId, parseTextToSubtitles, parseSrtToSubtitles, generateAiSubtitles, saveKaiwaVideo } from '../../services/videoKaiwaService';

const VideoKaiwaAdminModal = ({
    isOpen,
    onClose,
    editingVideo = null,
    onSaveSuccess
}) => {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [youtubeId, setYoutubeId] = useState('');
    const [title, setTitle] = useState('');
    const [channelTitle, setChannelTitle] = useState('');
    const [level, setLevel] = useState('N3');
    const [category, setCategory] = useState('daily');
    const [description, setDescription] = useState('');
    const [subtitles, setSubtitles] = useState([]);

    // Subtitle input tabs: 'ai' | 'upload' | 'manual'
    const [subInputTab, setSubInputTab] = useState('ai');
    const [rawJapaneseText, setRawJapaneseText] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiProgress, setAiProgress] = useState(null); // { current, total, percent }
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const abortAiRef = useRef(false);

    useEffect(() => {
        if (editingVideo) {
            setYoutubeUrl(editingVideo.youtubeId ? `https://www.youtube.com/watch?v=${editingVideo.youtubeId}` : '');
            setYoutubeId(editingVideo.youtubeId || '');
            setTitle(editingVideo.title || '');
            setChannelTitle(editingVideo.channelTitle || '');
            setLevel(editingVideo.level || 'N3');
            setCategory(editingVideo.category || 'daily');
            setDescription(editingVideo.description || '');
            setSubtitles(editingVideo.subtitles || []);
        } else {
            setYoutubeUrl('');
            setYoutubeId('');
            setTitle('');
            setChannelTitle('');
            setLevel('N3');
            setCategory('daily');
            setDescription('');
            setSubtitles([]);
        }
        setErrorMsg('');
        setSuccessMsg('');
        setAiProgress(null);
        abortAiRef.current = false;
    }, [editingVideo, isOpen]);

    if (!isOpen) return null;

    // Handle YouTube URL change and auto extract ID
    const handleUrlChange = (e) => {
        const val = e.target.value;
        setYoutubeUrl(val);
        const extracted = extractYoutubeId(val);
        if (extracted) {
            setYoutubeId(extracted);
            setErrorMsg('');
        }
    };

    // Handle AI Auto Subtitle Generation & Translation
    const handleGenerateAiSubtitles = async (overrideInput = null) => {
        let input = overrideInput;

        if (!input) {
            if (!rawJapaneseText.trim()) {
                if (subtitles.length > 0) {
                    input = subtitles;
                } else {
                    setErrorMsg('Vui lòng dán văn bản tiếng Nhật hoặc tải file phụ đề/transcript để AI phân tích!');
                    return;
                }
            } else {
                // Try parsing the raw text (supports [0:01]: Text, SRT, VTT, or plain text)
                const parsed = parseTextToSubtitles(rawJapaneseText);
                if (parsed.length > 0) {
                    input = parsed;
                    setSubtitles(parsed);
                } else {
                    input = rawJapaneseText;
                }
            }
        }

        abortAiRef.current = false;
        setIsGeneratingAi(true);
        setErrorMsg('');
        setSuccessMsg('');

        const totalItems = Array.isArray(input) ? input.length : 1;
        setAiProgress({ current: 0, total: totalItems, percent: 0 });

        try {
            const topicStr = `${title || 'Video Kaiwa'} - Cấp độ ${level}`;
            const generated = await generateAiSubtitles(
                input,
                topicStr,
                (prog) => {
                    setAiProgress(prog);
                    if (prog.subtitles) {
                        setSubtitles([...prog.subtitles]);
                    }
                },
                abortAiRef
            );

            if (generated && generated.length > 0) {
                setSubtitles(generated);
                setSubInputTab('manual');
                setSuccessMsg(`✅ AI đã hoàn tất phiên âm Furigana và dịch nghĩa Tiếng Việt cho ${generated.length} câu phụ đề!`);
            }
        } catch (e) {
            console.error(e);
            setErrorMsg('Lỗi khi gọi AI sinh phụ đề: ' + (e.message || 'Vui lòng thử lại!'));
        } finally {
            setIsGeneratingAi(false);
            setAiProgress(null);
        }
    };

    // Quick import raw text/transcript directly into table without waiting for AI
    const handleQuickParseOnly = () => {
        if (!rawJapaneseText.trim()) {
            setErrorMsg('Vui lòng dán nội dung văn bản hoặc transcript tiếng Nhật!');
            return;
        }
        const parsed = parseTextToSubtitles(rawJapaneseText);
        if (parsed.length > 0) {
            setSubtitles(parsed);
            setSubInputTab('manual');
            setSuccessMsg(`📋 Đã trích xuất ${parsed.length} câu từ văn bản thành công! Bạn có thể bấm "⚡ Dịch AI" bất kỳ lúc nào.`);
        } else {
            setErrorMsg('Không thể nhận diện câu từ văn bản. Vui lòng kiểm tra lại!');
        }
    };

    // Stop ongoing AI Generation
    const handleStopAi = () => {
        abortAiRef.current = true;
        setIsGeneratingAi(false);
        setAiProgress(null);
        setSuccessMsg('Đã dừng tiến trình AI. Các câu đã dịch trước đó vẫn được lưu.');
    };

    // Handle Subtitle / Document / Transcript File Upload (.srt, .vtt, .txt)
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === 'string') {
                const parsed = parseTextToSubtitles(content);
                if (parsed.length > 0) {
                    setSubtitles(parsed);
                    setSubInputTab('manual');
                    setSuccessMsg(`📂 Đã nhập ${parsed.length} câu từ file văn bản/phụ đề thành công! Đang gọi AI gắn Furigana và dịch Tiếng Việt...`);

                    // Automatically trigger AI Furigana & Vietnamese translation for all parsed sentences
                    handleGenerateAiSubtitles(parsed);
                } else {
                    setErrorMsg('Không đọc được cấu trúc văn bản hoặc phụ đề từ file này. Vui lòng kiểm tra lại nội dung!');
                }
            }
        };
        reader.readAsText(file);
    };

    // Save Video to Firestore & Local Storage
    const handleSave = async () => {
        if (!youtubeId) {
            setErrorMsg('Vui lòng nhập Link YouTube hợp lệ!');
            return;
        }
        if (!title.trim()) {
            setErrorMsg('Vui lòng nhập Tiêu đề video!');
            return;
        }
        if (subtitles.length === 0) {
            setErrorMsg('Vui lòng thêm ít nhất 1 câu phụ đề cho video!');
            return;
        }

        setIsSaving(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const videoData = {
                id: editingVideo?.id || `video_${Date.now()}`,
                youtubeId,
                title: title.trim(),
                channelTitle: channelTitle.trim(),
                level,
                category,
                description: description.trim(),
                thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
                duration: subtitles[subtitles.length - 1]?.end ? Math.ceil(subtitles[subtitles.length - 1].end) : 300,
                subtitlesCount: subtitles.length,
                subtitles
            };

            await saveKaiwaVideo(videoData);
            onSaveSuccess?.(videoData);
            onClose();
        } catch (e) {
            console.error(e);
            setErrorMsg('Lỗi khi lưu video: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Add manual subtitle row
    const handleAddSubRow = () => {
        const lastEnd = subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 0;
        setSubtitles([
            ...subtitles,
            {
                id: subtitles.length + 1,
                start: lastEnd,
                end: lastEnd + 5,
                ja: '',
                furigana: '',
                vi: '',
                keywords: [],
                grammar: []
            }
        ]);
    };

    // Update specific subtitle field
    const handleSubChange = (idx, field, value) => {
        const updated = [...subtitles];
        updated[idx] = { ...updated[idx], [field]: value };
        setSubtitles(updated);
    };

    // Remove subtitle row
    const handleRemoveSubRow = (idx) => {
        setSubtitles(subtitles.filter((_, i) => i !== idx));
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                            <Film className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                {editingVideo ? 'Chỉnh Sửa Video Kaiwa' : 'Thêm Video Kaiwa YouTube Mới'}
                            </h3>
                            <p className="text-xs text-slate-400">Quản lý bài học video, phân tách phụ đề song ngữ và Furigana</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
                    {errorMsg && (
                        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* YouTube URL & Preview */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Link Video YouTube *
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                                    value={youtubeUrl}
                                    onChange={handleUrlChange}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                />
                            </div>
                        </div>

                        {youtubeId && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                <img
                                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                                    alt="Thumbnail"
                                    className="w-24 aspect-video rounded-lg object-cover bg-slate-800"
                                />
                                <div className="text-xs space-y-0.5">
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> ID YouTube hợp lệ: {youtubeId}
                                    </p>
                                    <p className="text-[11px] text-slate-400">Thumbnail tự động lấy từ YouTube CDN</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Basic Meta: Title, Channel, Level, Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tiêu đề Video *</label>
                            <input
                                type="text"
                                placeholder="Ví dụ: てこの原理を使った介助 (Kỹ thuật điều dưỡng...)"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cấp độ JLPT</label>
                            <select
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                            >
                                {KAIWA_LEVELS.filter(l => l.id !== 'all').map(lvl => (
                                    <option key={lvl.id} value={lvl.id}>{lvl.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chủ đề / Danh mục</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                            >
                                {KAIWA_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên Kênh / Tác giả</label>
                            <input
                                type="text"
                                placeholder="Ví dụ: 【プロが教える介護技術】やしのきチャンネル"
                                value={channelTitle}
                                onChange={(e) => setChannelTitle(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>

                    {/* Success & Error Notifications */}
                    {errorMsg && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-600 dark:text-rose-300 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* AI Translation Active Progress Bar */}
                    {isGeneratingAi && aiProgress && (
                        <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-500/40 rounded-2xl space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                                    <span>Đang AI dịch nghĩa & tạo Furigana: {aiProgress.current} / {aiProgress.total} câu ({aiProgress.percent}%)</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleStopAi}
                                    className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition cursor-pointer"
                                >
                                    <StopCircle className="w-3.5 h-3.5" />
                                    <span>Dừng lại</span>
                                </button>
                            </div>
                            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 rounded-full"
                                    style={{ width: `${aiProgress.percent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Subtitle Management Section */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <label className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Quản lý Phụ Đề ({subtitles.length} câu)
                            </label>
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setSubInputTab('ai')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${subInputTab === 'ai' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                >
                                    ⚡ AI Auto-Sub & Text
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSubInputTab('upload')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${subInputTab === 'upload' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                >
                                    📂 Tải file (.srt, .txt)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSubInputTab('manual')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${subInputTab === 'manual' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                >
                                    ✍️ Chỉnh sửa ({subtitles.length})
                                </button>
                            </div>
                        </div>

                        {/* TAB A: AI Auto Generation from pasted text */}
                        {subInputTab === 'ai' && (
                            <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl space-y-3">
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    Dán toàn bộ transcript có mốc thời gian dạng <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded text-amber-800 dark:text-amber-200 font-mono text-[11px]">[0:01]: câu tiếng Nhật...</code>, cấu trúc SRT hoặc văn bản thuần. Hệ thống sẽ tự động nhận diện mốc thời gian và dịch song ngữ:
                                </p>
                                <textarea
                                    rows={5}
                                    placeholder={`Ví dụ dán transcript:\n[0:01]: 今日から9月。\n[0:09]: 商品がスキャンされる度に鳴ってしまうほど...`}
                                    value={rawJapaneseText}
                                    onChange={(e) => setRawJapaneseText(e.target.value)}
                                    className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateAiSubtitles()}
                                        disabled={isGeneratingAi}
                                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span>{isGeneratingAi ? 'Đang gọi AI phân tích & dịch...' : '⚡ Bắt đầu tạo Phụ đề & Dịch AI'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleQuickParseOnly}
                                        disabled={isGeneratingAi}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                        <span>📋 Nhập vào bảng (Chưa dịch)</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB B: Upload SRT / Document */}
                        {subInputTab === 'upload' && (
                            <div className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-2 bg-slate-50 dark:bg-slate-950/40">
                                <Upload className="w-8 h-8 text-amber-500 mx-auto" />
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Chọn file .SRT, .VTT hoặc file văn bản .TXT từ máy tính</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Hỗ trợ nhận diện file phụ đề chuẩn và các file transcript dạng [0:01]: Text</p>
                                <input
                                    type="file"
                                    accept=".srt,.vtt,.txt,.doc,.docx,.json"
                                    onChange={handleFileUpload}
                                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 cursor-pointer"
                                />
                            </div>
                        )}

                        {/* TAB C: Manual Subtitle Editor Table */}
                        {subInputTab === 'manual' && (
                            <div className="space-y-3">
                                {/* Action Bar: AI Bulk Translate Button */}
                                {subtitles.length > 0 && (
                                    <div className="flex items-center justify-between gap-2 bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                                        <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                                            📊 {subtitles.filter(s => s.vi).length}/{subtitles.length} câu đã có Tiếng Việt
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleGenerateAiSubtitles(subtitles)}
                                            disabled={isGeneratingAi || subtitles.length === 0}
                                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>✨ AI Dịch & Furigana toàn bộ ({subtitles.length} câu)</span>
                                        </button>
                                    </div>
                                )}
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                    {subtitles.map((sub, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-400 font-mono">#{idx + 1}</span>
                                                    <div className="flex items-center gap-1 font-mono text-[11px]">
                                                        <span>Bắt đầu (s):</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={sub.start}
                                                            onChange={(e) => handleSubChange(idx, 'start', parseFloat(e.target.value) || 0)}
                                                            className="w-16 p-1 bg-white dark:bg-slate-900 border rounded text-center font-bold"
                                                        />
                                                        <span>Kết thúc (s):</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={sub.end}
                                                            onChange={(e) => handleSubChange(idx, 'end', parseFloat(e.target.value) || 0)}
                                                            className="w-16 p-1 bg-white dark:bg-slate-900 border rounded text-center font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSubRow(idx)}
                                                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <input
                                                type="text"
                                                placeholder="Tiếng Nhật (có Furigana: {漢字|かんじ}):"
                                                value={sub.furigana || sub.ja}
                                                onChange={(e) => {
                                                    handleSubChange(idx, 'furigana', e.target.value);
                                                    handleSubChange(idx, 'ja', e.target.value);
                                                }}
                                                className="w-full p-2 bg-white dark:bg-slate-900 border rounded text-xs font-bold text-amber-600 dark:text-amber-400"
                                            />

                                            <input
                                                type="text"
                                                placeholder="Bản dịch Tiếng Việt:"
                                                value={sub.vi}
                                                onChange={(e) => handleSubChange(idx, 'vi', e.target.value)}
                                                className="w-full p-2 bg-white dark:bg-slate-900 border rounded text-xs text-slate-700 dark:text-slate-300"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddSubRow}
                                    className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-xl text-xs font-bold text-slate-500 hover:text-amber-600 transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Thêm câu mới
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? 'Đang lưu vào Firestore...' : 'Lưu & Xuất Bản Video'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoKaiwaAdminModal;
