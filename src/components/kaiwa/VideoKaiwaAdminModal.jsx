import React, { useState, useEffect, useRef } from 'react';
import {
    X, Plus, Trash2, Sparkles, Upload, Link as LinkIcon,
    Save, CheckCircle2, AlertCircle, FileText, Film, Eye, Edit3, StopCircle, RefreshCw,
    Video, Globe, HardDrive, Check
} from 'lucide-react';
import { KAIWA_LEVELS, KAIWA_CATEGORIES } from './videoKaiwaConstants';
import { extractYoutubeId, parseTextToSubtitles, parseSrtToSubtitles, generateAiSubtitles, saveKaiwaVideo, uploadKaiwaVideoFile } from '../../services/videoKaiwaService';
import { extractVideoThumbnailAndMetadata } from '../../utils/videoThumbnailHelper';
import { saveVideoBlobToIndexedDb } from '../../utils/indexedDbVideoStorage';

const VideoKaiwaAdminModal = ({
    isOpen,
    onClose,
    editingVideo = null,
    onSaveSuccess
}) => {
    // Source Type: 'youtube' | 'file' | 'direct'
    const [sourceType, setSourceType] = useState('youtube');

    // YouTube State
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [youtubeId, setYoutubeId] = useState('');

    // File Upload State
    const [selectedVideoFile, setSelectedVideoFile] = useState(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState('');
    const [directVideoUrl, setDirectVideoUrl] = useState('');
    const [customThumbnail, setCustomThumbnail] = useState('');
    const [extractedDuration, setExtractedDuration] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);

    // Meta State
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
    const videoInputRef = useRef(null);

    useEffect(() => {
        if (editingVideo) {
            const isFile = Boolean(editingVideo.videoUrl || editingVideo.fileUrl || editingVideo.videoType === 'file' || (!editingVideo.youtubeId && editingVideo.videoUrl));
            const isDirect = Boolean(editingVideo.videoUrl && editingVideo.videoUrl.startsWith('http') && !editingVideo.youtubeId);

            if (isDirect) {
                setSourceType('direct');
                setDirectVideoUrl(editingVideo.videoUrl);
            } else if (isFile) {
                setSourceType('file');
                setFilePreviewUrl(editingVideo.videoUrl || editingVideo.fileUrl || '');
            } else {
                setSourceType('youtube');
            }

            setYoutubeUrl(editingVideo.youtubeId ? `https://www.youtube.com/watch?v=${editingVideo.youtubeId}` : '');
            setYoutubeId(editingVideo.youtubeId || '');
            setCustomThumbnail(editingVideo.thumbnail || '');
            setExtractedDuration(editingVideo.duration || 0);
            setTitle(editingVideo.title || '');
            setChannelTitle(editingVideo.channelTitle || '');
            setLevel(editingVideo.level || 'N3');
            setCategory(editingVideo.category || 'daily');
            setDescription(editingVideo.description || '');
            setSubtitles(editingVideo.subtitles || []);
            setSelectedVideoFile(null);
        } else {
            setSourceType('youtube');
            setYoutubeUrl('');
            setYoutubeId('');
            setSelectedVideoFile(null);
            setFilePreviewUrl('');
            setDirectVideoUrl('');
            setCustomThumbnail('');
            setExtractedDuration(0);
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
        setUploadProgress(null);
        abortAiRef.current = false;
    }, [editingVideo, isOpen]);

    // Clean up preview object URL on unmount
    useEffect(() => {
        return () => {
            if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
                try { URL.revokeObjectURL(filePreviewUrl); } catch (e) {}
            }
        };
    }, [filePreviewUrl]);

    if (!isOpen) return null;

    // Handle YouTube URL change and auto extract ID
    const handleUrlChange = (e) => {
        const val = e.target.value;
        setYoutubeUrl(val);
        const extracted = extractYoutubeId(val);
        if (extracted) {
            setYoutubeId(extracted);
            setCustomThumbnail(`https://img.youtube.com/vi/${extracted}/hqdefault.jpg`);
            setErrorMsg('');
        }
    };

    // Handle Video File Selection (.mp4, .webm, .mov, etc.)
    const handleVideoFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedVideoFile(file);
        setErrorMsg('');
        setIsExtractingMetadata(true);

        // Revoke previous blob if any
        if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
            try { URL.revokeObjectURL(filePreviewUrl); } catch (err) {}
        }

        const objectUrl = URL.createObjectURL(file);
        setFilePreviewUrl(objectUrl);

        // Auto-fill title if empty
        if (!title.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setTitle(cleanName);
        }
        if (!channelTitle.trim()) {
            setChannelTitle('Video máy tính');
        }

        try {
            const meta = await extractVideoThumbnailAndMetadata(file);
            if (meta.thumbnail) {
                setCustomThumbnail(meta.thumbnail);
            }
            if (meta.duration) {
                setExtractedDuration(Math.ceil(meta.duration));
            }
            setSuccessMsg(`📹 Đã nhận file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)!`);
        } catch (err) {
            console.warn('Lỗi trích xuất thumbnail video:', err);
        } finally {
            setIsExtractingMetadata(false);
        }
    };

    // Handle Direct Video URL change
    const handleDirectUrlChange = async (e) => {
        const val = e.target.value;
        setDirectVideoUrl(val);
        setErrorMsg('');

        if (val.trim().startsWith('http')) {
            setIsExtractingMetadata(true);
            try {
                const meta = await extractVideoThumbnailAndMetadata(val.trim());
                if (meta.thumbnail) setCustomThumbnail(meta.thumbnail);
                if (meta.duration) setExtractedDuration(Math.ceil(meta.duration));
            } catch (err) {
                console.warn(err);
            } finally {
                setIsExtractingMetadata(false);
            }
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

    // Save Video to Firestore & Local Storage & IndexedDB
    const handleSave = async () => {
        if (sourceType === 'youtube' && !youtubeId) {
            setErrorMsg('Vui lòng nhập Link YouTube hợp lệ!');
            return;
        }
        if (sourceType === 'file' && !selectedVideoFile && !filePreviewUrl && !editingVideo?.videoUrl) {
            setErrorMsg('Vui lòng chọn file video từ máy tính (.mp4, .webm, .mov)!');
            return;
        }
        if (sourceType === 'direct' && !directVideoUrl.trim()) {
            setErrorMsg('Vui lòng nhập đường dẫn video trực tiếp hợp lệ!');
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

        const videoId = editingVideo?.id || `video_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        let finalVideoUrl = editingVideo?.videoUrl || editingVideo?.fileUrl || '';

        try {
            // If user selected a new video file:
            if (selectedVideoFile) {
                // 1. Save blob to IndexedDB for local instant playback
                await saveVideoBlobToIndexedDb(videoId, selectedVideoFile, {
                    title: title.trim(),
                    level,
                    category
                });

                // 2. Attempt to upload to Firebase Storage if available (optional for CDN cloud access)
                try {
                    setSuccessMsg('Đang tải video lên bộ nhớ đám mây...');
                    const uploadRes = await uploadKaiwaVideoFile(selectedVideoFile, videoId, (p) => {
                        setUploadProgress(p);
                    });
                    if (uploadRes?.downloadUrl) {
                        finalVideoUrl = uploadRes.downloadUrl;
                    }
                } catch (uploadErr) {
                    console.warn('Firebase Storage upload error (video will still work locally via IndexedDB):', uploadErr);
                }
            } else if (sourceType === 'direct') {
                finalVideoUrl = directVideoUrl.trim();
            }

            const lastSubEnd = subtitles[subtitles.length - 1]?.end;
            const finalDuration = extractedDuration || (lastSubEnd ? Math.ceil(lastSubEnd) : 300);

            const videoData = {
                id: videoId,
                videoType: sourceType,
                sourceType,
                youtubeId: sourceType === 'youtube' ? youtubeId : null,
                videoUrl: sourceType === 'youtube' ? null : (finalVideoUrl || filePreviewUrl || ''),
                fileUrl: sourceType === 'file' ? (finalVideoUrl || filePreviewUrl || '') : null,
                title: title.trim(),
                channelTitle: channelTitle.trim() || (sourceType === 'file' ? 'Video máy tính' : 'QuizKi Master'),
                level,
                category,
                description: description.trim(),
                thumbnail: customThumbnail || (sourceType === 'youtube' ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : ''),
                duration: finalDuration,
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
            setUploadProgress(null);
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
                                {editingVideo ? 'Chỉnh Sửa Video Kaiwa' : 'Thêm Video Kaiwa Mới'}
                            </h3>
                            <p className="text-xs text-slate-400">Hỗ trợ import video từ File (.mp4, .webm) hoặc YouTube kèm phụ đề song ngữ</p>
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

                    {/* SOURCE TYPE SELECTOR TABS */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                            Chọn Nguồn Video
                        </label>
                        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => setSourceType('youtube')}
                                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    sourceType === 'youtube'
                                        ? 'bg-red-600 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Video className="w-4 h-4" />
                                <span>YouTube URL</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSourceType('file')}
                                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    sourceType === 'file'
                                        ? 'bg-amber-500 text-slate-950 shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <HardDrive className="w-4 h-4" />
                                <span>File Video (.mp4)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSourceType('direct')}
                                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    sourceType === 'direct'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Globe className="w-4 h-4" />
                                <span>Direct Link URL</span>
                            </button>
                        </div>
                    </div>

                    {/* SOURCE OPTION A: YOUTUBE */}
                    {sourceType === 'youtube' && (
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                Đường Dẫn YouTube *
                            </label>
                            <div className="relative">
                                <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                                    value={youtubeUrl}
                                    onChange={handleUrlChange}
                                    className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                />
                            </div>

                            {youtubeId && (
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
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
                    )}

                    {/* SOURCE OPTION B: FILE VIDEO (.MP4, .WEBM, .MOV) */}
                    {sourceType === 'file' && (
                        <div className="space-y-3 p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                Chọn File Video Từ Máy Tính (.mp4, .webm, .mov, .mkv) *
                            </label>
                            
                            <div 
                                onClick={() => videoInputRef.current?.click()}
                                className="p-6 border-2 border-dashed border-amber-300 dark:border-amber-700/80 hover:border-amber-500 rounded-2xl text-center space-y-2 bg-white/60 dark:bg-slate-900/60 cursor-pointer transition-all"
                            >
                                <HardDrive className="w-8 h-8 text-amber-500 mx-auto" />
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {selectedVideoFile ? selectedVideoFile.name : 'Bấm vào đây để chọn file video từ thiết bị của bạn'}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Hỗ trợ MP4, WebM, MOV, M4V, MKV. Tự động trích xuất khung hình và thời lượng.
                                </p>
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/*,.mp4,.webm,.mov,.m4v,.mkv,.avi,.ogg"
                                    onChange={handleVideoFileChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Video File Preview & Metadata Snapshot */}
                            {(filePreviewUrl || customThumbnail) && (
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center gap-3">
                                    {customThumbnail ? (
                                        <img
                                            src={customThumbnail}
                                            alt="Thumbnail Frame"
                                            className="w-24 aspect-video rounded-lg object-cover bg-slate-800 border"
                                        />
                                    ) : (
                                        <div className="w-24 aspect-video rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                            <Film className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div className="text-xs space-y-0.5 flex-1">
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> File Video Đã Sẵn Sàng
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Thời lượng: {extractedDuration ? `${Math.floor(extractedDuration / 60)}:${String(extractedDuration % 60).padStart(2, '0')}` : 'Tự động tính'}
                                            {selectedVideoFile ? ` • ${(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                                        </p>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                            ✓ Tự động lưu an toàn trong IndexedDB của máy và đồng bộ lên đám mây khi xuất bản.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isExtractingMetadata && (
                                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 animate-pulse">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Đang trích xuất ảnh bìa thumbnail và thời lượng video...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SOURCE OPTION C: DIRECT VIDEO URL */}
                    {sourceType === 'direct' && (
                        <div className="space-y-3 p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                Đường Dẫn Video Trực Tiếp (Direct URL .mp4 / .webm) *
                            </label>
                            <div className="relative">
                                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="https://example.com/videos/lesson01.mp4"
                                    value={directVideoUrl}
                                    onChange={handleDirectUrlChange}
                                    className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>

                            {customThumbnail && (
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <img
                                        src={customThumbnail}
                                        alt="Thumbnail"
                                        className="w-24 aspect-video rounded-lg object-cover bg-slate-800"
                                    />
                                    <div className="text-xs space-y-0.5">
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết nối luồng video trực tiếp
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên Kênh / Tác giả / Nguồn</label>
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

                    {/* Upload Cloud Progress Bar */}
                    {uploadProgress !== null && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                <span>Đang tải video lên Firebase Storage: {uploadProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                            </div>
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
                                        <span>{isGeneratingAi ? 'Đang gọi AI phân tích & trích xuất từ vựng...' : '⚡ Phân tích AI (Furigana, Dịch & Từ vựng)'}</span>
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
                                            <span>✨ AI Dịch, Furigana & Trích xuất từ vựng ({subtitles.length} câu)</span>
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
                        <span>{isSaving ? 'Đang lưu video...' : 'Lưu & Xuất Bản Video'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoKaiwaAdminModal;
