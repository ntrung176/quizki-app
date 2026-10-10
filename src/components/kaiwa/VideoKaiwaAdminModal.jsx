import React, { useState, useEffect, useRef } from 'react';
import {
    X, Plus, Trash2, Wand2, Upload, Link as LinkIcon,
    Save, CheckCircle2, AlertCircle, FileText, Film, Eye, Edit3, StopCircle, RefreshCw,
    Video, Globe, HardDrive, Check, Zap, ArrowRight, Info, Layers, CheckCircle
} from 'lucide-react';
import { KAIWA_LEVELS, KAIWA_CATEGORIES } from './videoKaiwaConstants';
import {
    extractYoutubeId,
    parseTextToSubtitles,
    parseSrtToSubtitles,
    generateAiSubtitles,
    saveKaiwaVideo,
    uploadKaiwaVideoFile,
    fetchYoutubeMetadata,
    fetchYoutubeSubtitles,
    analyzeVideoMetadataWithAI
} from '../../services/videoKaiwaService';
import { extractVideoThumbnailAndMetadata } from '../../utils/videoThumbnailHelper';
import { saveVideoBlobToIndexedDb } from '../../utils/indexedDbVideoStorage';

const VideoKaiwaAdminModal = ({
    isOpen,
    onClose,
    editingVideo = null,
    onSaveSuccess
}) => {
    // Mode: 'auto' (Tự động YouTube & Sub) | 'manual' (Thủ công)
    const [processMode, setProcessMode] = useState('auto');

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
    const [titleVi, setTitleVi] = useState('');
    const [channelTitle, setChannelTitle] = useState('');
    const [level, setLevel] = useState('N3');
    const [category, setCategory] = useState('daily');
    const [description, setDescription] = useState('');
    const [subtitles, setSubtitles] = useState([]);

    // Subtitle input tabs for manual mode: 'paste' | 'upload' | 'editor'
    const [manualSubTab, setManualSubTab] = useState('paste');
    const [rawJapaneseText, setRawJapaneseText] = useState('');

    // Auto Mode Processing State
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const [autoStep, setAutoStep] = useState(0); // 0: Idle, 1: Fetch Meta, 2: Fetch Sub, 3: AI Meta, 4: AI Trans, 5: Done
    const [autoStepDetails, setAutoStepDetails] = useState({
        metaDone: false,
        subDone: false,
        aiMetaDone: false,
        aiTransDone: false,
        subCount: 0,
        trackLabel: ''
    });

    // AI Translation & Progress State
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiProgress, setAiProgress] = useState(null); // { current, total, percent }
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [subWarningMsg, setSubWarningMsg] = useState('');
    const [quickPasteTranscript, setQuickPasteTranscript] = useState('');

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

            setProcessMode('manual'); // Editing existing video defaults to manual mode for precision
            setYoutubeUrl(editingVideo.youtubeId ? `https://www.youtube.com/watch?v=${editingVideo.youtubeId}` : '');
            setYoutubeId(editingVideo.youtubeId || '');
            setCustomThumbnail(editingVideo.thumbnail || '');
            setExtractedDuration(editingVideo.duration || 0);
            setTitle(editingVideo.title || '');
            setTitleVi(editingVideo.titleVi || '');
            setChannelTitle(editingVideo.channelTitle || '');
            setLevel(editingVideo.level || 'N3');
            setCategory(editingVideo.category || 'daily');
            setDescription(editingVideo.description || '');
            setSubtitles(editingVideo.subtitles || []);
            setSelectedVideoFile(null);
        } else {
            setProcessMode('auto');
            setSourceType('youtube');
            setYoutubeUrl('');
            setYoutubeId('');
            setSelectedVideoFile(null);
            setFilePreviewUrl('');
            setDirectVideoUrl('');
            setCustomThumbnail('');
            setExtractedDuration(0);
            setTitle('');
            setTitleVi('');
            setChannelTitle('');
            setLevel('N3');
            setCategory('daily');
            setDescription('');
            setSubtitles([]);
            setAutoStep(0);
            setAutoStepDetails({
                metaDone: false,
                subDone: false,
                aiMetaDone: false,
                aiTransDone: false,
                subCount: 0,
                trackLabel: ''
            });
        }
        setErrorMsg('');
        setSuccessMsg('');
        setSubWarningMsg('');
        setQuickPasteTranscript('');
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
            setSubWarningMsg('');
        }
    };

    // ==========================================
    // MODE 1: AUTO PROCESS YOUTUBE & SUBTITLES
    // ==========================================
    const handleStartAutoProcess = async () => {
        const extracted = extractYoutubeId(youtubeUrl);
        if (!extracted) {
            setErrorMsg('Vui lòng nhập đường dẫn YouTube hợp lệ!');
            return;
        }

        setIsAutoProcessing(true);
        setErrorMsg('');
        setSuccessMsg('');
        setSubWarningMsg('');
        abortAiRef.current = false;
        setAutoStep(1);

        try {
            // STEP 1: Fetch Video Metadata from YouTube
            let ytMeta = await fetchYoutubeMetadata(extracted);
            if (ytMeta) {
                if (ytMeta.title) setTitle(ytMeta.title);
                if (ytMeta.channelTitle) setChannelTitle(ytMeta.channelTitle);
                if (ytMeta.thumbnail) setCustomThumbnail(ytMeta.thumbnail);
            }
            setAutoStepDetails(prev => ({ ...prev, metaDone: true }));

            // STEP 2: Fetch Subtitles from YouTube
            setAutoStep(2);
            const subResult = await fetchYoutubeSubtitles(extracted);

            let rawSubs = [];
            if (subResult.success && Array.isArray(subResult.subtitles) && subResult.subtitles.length > 0) {
                rawSubs = subResult.subtitles;
                setSubtitles(rawSubs);
                setAutoStepDetails(prev => ({
                    ...prev,
                    subDone: true,
                    subCount: rawSubs.length,
                    trackLabel: subResult.trackLabel || 'YouTube CC'
                }));
            } else {
                // If YouTube blocked automated timedtext downloading (PoToken protection)
                // We still perform Step 3: AI Metadata Analysis on the video title so the user gets all metadata prefilled
                const aiMeta = await analyzeVideoMetadataWithAI({
                    title: ytMeta?.title || title || '',
                    channelTitle: ytMeta?.channelTitle || channelTitle || '',
                    subtitlesSample: []
                });

                if (aiMeta) {
                    if (aiMeta.title) setTitle(aiMeta.title);
                    if (aiMeta.titleVi) setTitleVi(aiMeta.titleVi);
                    if (aiMeta.level) setLevel(aiMeta.level);
                    if (aiMeta.category) setCategory(aiMeta.category);
                    if (aiMeta.channelTitle) setChannelTitle(aiMeta.channelTitle);
                    if (aiMeta.description) setDescription(aiMeta.description);
                }

                setSubWarningMsg('potoken_blocked');
                setIsAutoProcessing(false);
                setAutoStep(0);
                return;
            }

            // STEP 3: AI Metadata Analysis (Level, Category, TitleVi, Channel, Description)
            setAutoStep(3);
            const aiMeta = await analyzeVideoMetadataWithAI({
                title: ytMeta?.title || title || '',
                channelTitle: ytMeta?.channelTitle || channelTitle || '',
                subtitlesSample: rawSubs
            });

            if (aiMeta) {
                if (aiMeta.title) setTitle(aiMeta.title);
                if (aiMeta.titleVi) setTitleVi(aiMeta.titleVi);
                if (aiMeta.level) setLevel(aiMeta.level);
                if (aiMeta.category) setCategory(aiMeta.category);
                if (aiMeta.channelTitle) setChannelTitle(aiMeta.channelTitle);
                if (aiMeta.description) setDescription(aiMeta.description);
            }
            setAutoStepDetails(prev => ({ ...prev, aiMetaDone: true }));

            // STEP 4: AI Furigana, Vietnamese Translation & Keywords/Grammar extraction
            setAutoStep(4);
            setIsGeneratingAi(true);
            setAiProgress({ current: 0, total: rawSubs.length, percent: 0 });

            const topicContext = `${aiMeta?.title || title || 'Video Kaiwa'} - Cấp độ ${aiMeta?.level || level}`;
            const enrichedSubs = await generateAiSubtitles(
                rawSubs,
                topicContext,
                (prog) => {
                    setAiProgress(prog);
                    if (prog.subtitles) {
                        setSubtitles([...prog.subtitles]);
                    }
                },
                abortAiRef
            );

            if (enrichedSubs && enrichedSubs.length > 0) {
                setSubtitles(enrichedSubs);
                setAutoStep(5);
                setAutoStepDetails(prev => ({ ...prev, aiTransDone: true }));
                setSuccessMsg(`🎉 Hoàn tất tự động 100%! Đã lấy phụ đề, phân tích cấp độ ${aiMeta?.level || level} và dịch nghĩa Tiếng Việt cho ${enrichedSubs.length} câu.`);
            }
        } catch (err) {
            console.error('Lỗi khi tự động xử lý video:', err);
            setErrorMsg('Lỗi trong quá trình tự động xử lý: ' + (err?.message || 'Vui lòng thử lại!'));
        } finally {
            setIsAutoProcessing(false);
            setIsGeneratingAi(false);
            setAiProgress(null);
        }
    };

    // Quick process pasted transcript from warning card
    const handleQuickProcessPastedTranscript = async () => {
        if (!quickPasteTranscript.trim()) {
            setErrorMsg('Vui lòng dán nội dung transcript đã copy từ YouTube!');
            return;
        }

        const parsed = parseTextToSubtitles(quickPasteTranscript);
        if (parsed.length === 0) {
            setErrorMsg('Không thể nhận diện các mốc thời gian hoặc câu thoại từ đoạn văn bản đã dán.');
            return;
        }

        setSubtitles(parsed);
        setSubWarningMsg('');
        setIsGeneratingAi(true);
        setErrorMsg('');
        setSuccessMsg('');
        abortAiRef.current = false;

        try {
            // AI Metadata
            const aiMeta = await analyzeVideoMetadataWithAI({
                title: title.trim(),
                channelTitle: channelTitle.trim(),
                subtitlesSample: parsed
            });

            if (aiMeta) {
                if (!title.trim() || title === 'Video Kaiwa Tiếng Nhật') setTitle(aiMeta.title || title);
                if (aiMeta.titleVi) setTitleVi(aiMeta.titleVi);
                if (aiMeta.level) setLevel(aiMeta.level);
                if (aiMeta.category) setCategory(aiMeta.category);
                if (aiMeta.channelTitle) setChannelTitle(aiMeta.channelTitle);
                if (aiMeta.description) setDescription(aiMeta.description);
            }

            // AI Subtitle translation & Furigana
            setAiProgress({ current: 0, total: parsed.length, percent: 0 });
            const topicContext = `${title || aiMeta?.title || 'Video Kaiwa'} - Cấp độ ${aiMeta?.level || level}`;
            const enriched = await generateAiSubtitles(
                parsed,
                topicContext,
                (prog) => {
                    setAiProgress(prog);
                    if (prog.subtitles) setSubtitles([...prog.subtitles]);
                },
                abortAiRef
            );

            if (enriched && enriched.length > 0) {
                setSubtitles(enriched);
                setSuccessMsg(`Đã dịch nghĩa và gán Furigana hoàn tất cho ${enriched.length} câu từ transcript YouTube!`);
            }
        } catch (e) {
            console.error(e);
            setErrorMsg('Lỗi khi AI dịch transcript: ' + (e?.message || 'Thử lại!'));
        } finally {
            setIsGeneratingAi(false);
            setAiProgress(null);
        }
    };


    // ==========================================
    // MODE 2: MANUAL SUBTITLES + AI AUTO-FILL
    // ==========================================
    const handleAiAutoFillAll = async () => {
        if (!title.trim() && subtitles.length === 0 && !rawJapaneseText.trim()) {
            setErrorMsg('Vui lòng nhập Tiêu đề, dán transcript hoặc tải file phụ đề trước khi AI tự động điền!');
            return;
        }

        setIsGeneratingAi(true);
        setErrorMsg('');
        setSuccessMsg('');
        abortAiRef.current = false;

        try {
            // 1. If user pasted raw text, parse it first
            let currentSubs = [...subtitles];
            if (currentSubs.length === 0 && rawJapaneseText.trim()) {
                const parsed = parseTextToSubtitles(rawJapaneseText);
                if (parsed.length > 0) {
                    currentSubs = parsed;
                    setSubtitles(parsed);
                }
            }

            // 2. Call AI to analyze metadata (Level, Category, TitleVi, Channel, Description)
            setSuccessMsg('🧠 AI đang phân tích cấp độ, chủ đề và tiêu đề...');
            const aiMeta = await analyzeVideoMetadataWithAI({
                title: title.trim(),
                channelTitle: channelTitle.trim(),
                subtitlesSample: currentSubs,
                rawText: rawJapaneseText
            });

            if (aiMeta) {
                if (!title.trim() || title === 'Video Kaiwa Tiếng Nhật') setTitle(aiMeta.title || title);
                if (aiMeta.titleVi) setTitleVi(aiMeta.titleVi);
                if (aiMeta.level) setLevel(aiMeta.level);
                if (aiMeta.category) setCategory(aiMeta.category);
                if (aiMeta.channelTitle && !channelTitle.trim()) setChannelTitle(aiMeta.channelTitle);
                if (aiMeta.description) setDescription(aiMeta.description);
            }

            // 3. If there are subtitles, enrich Furigana, Vietnamese Translation, and Vocab/Grammar
            if (currentSubs.length > 0) {
                setAiProgress({ current: 0, total: currentSubs.length, percent: 0 });
                const topicContext = `${title || aiMeta?.title || 'Video Kaiwa'} - Cấp độ ${aiMeta?.level || level}`;
                const enriched = await generateAiSubtitles(
                    currentSubs,
                    topicContext,
                    (prog) => {
                        setAiProgress(prog);
                        if (prog.subtitles) setSubtitles([...prog.subtitles]);
                    },
                    abortAiRef
                );

                if (enriched && enriched.length > 0) {
                    setSubtitles(enriched);
                    setManualSubTab('editor');
                    setSuccessMsg(`AI đã tự động điền thông tin và dịch nghĩa hoàn tất cho ${enriched.length} câu phụ đề!`);
                }
            } else {
                setSuccessMsg(`AI đã tự động điền Cấp độ (${aiMeta?.level}), Chủ đề và Tiêu đề dịch thành công!`);
            }
        } catch (e) {
            console.error(e);
            setErrorMsg('Lỗi khi AI tự động điền thông tin: ' + (e?.message || 'Thử lại!'));
        } finally {
            setIsGeneratingAi(false);
            setAiProgress(null);
        }
    };

    // Quick parse text into subtitles table
    const handleQuickParseOnly = () => {
        if (!rawJapaneseText.trim()) {
            setErrorMsg('Vui lòng dán nội dung văn bản hoặc transcript tiếng Nhật!');
            return;
        }
        const parsed = parseTextToSubtitles(rawJapaneseText);
        if (parsed.length > 0) {
            setSubtitles(parsed);
            setManualSubTab('editor');
            setSuccessMsg(`📋 Đã trích xuất ${parsed.length} câu từ văn bản thành công! Bấm "AI Tự Điền & Dịch" để dịch song ngữ.`);
        } else {
            setErrorMsg('Không thể nhận diện câu từ văn bản. Vui lòng kiểm tra lại!');
        }
    };

    // Handle Subtitle File Upload (.srt, .vtt, .txt)
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
                    setManualSubTab('editor');
                    setSuccessMsg(`📂 Đã nạp ${parsed.length} câu từ file phụ đề! Bạn có thể bấm "AI Tự Điền & Dịch Sub" để AI dịch tự động.`);
                } else {
                    setErrorMsg('Không đọc được cấu trúc văn bản hoặc phụ đề từ file này.');
                }
            }
        };
        reader.readAsText(file);
    };

    // Handle Video File Selection (.mp4, .webm, .mov, etc.)
    const handleVideoFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedVideoFile(file);
        setErrorMsg('');
        setIsExtractingMetadata(true);

        if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
            try { URL.revokeObjectURL(filePreviewUrl); } catch (err) {}
        }

        const objectUrl = URL.createObjectURL(file);
        setFilePreviewUrl(objectUrl);

        if (!title.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setTitle(cleanName);
        }
        if (!channelTitle.trim()) {
            setChannelTitle('Video máy tính');
        }

        try {
            const meta = await extractVideoThumbnailAndMetadata(file);
            if (meta.thumbnail) setCustomThumbnail(meta.thumbnail);
            if (meta.duration) setExtractedDuration(Math.ceil(meta.duration));
            setSuccessMsg(`📹 Đã nhận file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)!`);
        } catch (err) {
            console.warn('Lỗi trích xuất thumbnail video:', err);
        } finally {
            setIsExtractingMetadata(false);
        }
    };

    // Stop ongoing AI Generation
    const handleStopAi = () => {
        abortAiRef.current = true;
        setIsAutoProcessing(false);
        setIsGeneratingAi(false);
        setAiProgress(null);
        setSuccessMsg('Đã dừng tiến trình AI.');
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
            if (selectedVideoFile) {
                await saveVideoBlobToIndexedDb(videoId, selectedVideoFile, {
                    title: title.trim(),
                    level,
                    category
                });

                try {
                    setSuccessMsg('Đang tải video lên bộ nhớ đám mây...');
                    const uploadRes = await uploadKaiwaVideoFile(selectedVideoFile, videoId, (p) => {
                        setUploadProgress(p);
                    });
                    if (uploadRes?.downloadUrl) {
                        finalVideoUrl = uploadRes.downloadUrl;
                    }
                } catch (uploadErr) {
                    console.warn('Firebase Storage upload error (saved locally to IndexedDB):', uploadErr);
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
                titleVi: titleVi.trim(),
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

    // Subtitle table row operations
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

    const handleSubChange = (idx, field, value) => {
        const updated = [...subtitles];
        updated[idx] = { ...updated[idx], [field]: value };
        setSubtitles(updated);
    };

    const handleRemoveSubRow = (idx) => {
        setSubtitles(subtitles.filter((_, i) => i !== idx));
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* Header with Mode Switcher */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 shrink-0">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
                                <Film className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    {editingVideo ? 'Chỉnh Sửa Video Kaiwa' : 'Thêm Video Kaiwa Mới'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Tự động lấy phụ đề YouTube hoặc nhập thủ công kèm AI dịch song ngữ</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 2 DISTINCT MODES TOGGLE */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setProcessMode('auto')}
                            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                processMode === 'auto'
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md scale-[1.01]'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Zap className="w-4 h-4" />
                            <span>Chế Độ Tự Động (YouTube có Sub)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setProcessMode('manual')}
                            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                processMode === 'manual'
                                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md scale-[1.01]'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Edit3 className="w-4 h-4" />
                            <span>Chế Độ Thủ Công (+ AI Hỗ Trợ)</span>
                        </button>
                    </div>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
                    
                    {/* Error and Alert Messages */}
                    {errorMsg && (
                        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* PoToken / YouTube Subtitle Assistance Card */}
                    {subWarningMsg === 'potoken_blocked' ? (
                        <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 border-2 border-amber-500/40 rounded-3xl space-y-4 animate-fade-in shadow-lg">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shrink-0 shadow-md">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center gap-2">
                                        <span>YouTube bảo vệ chống tải tự động (PoToken Protected)</span>
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        Hệ thống đã nhận diện tiêu đề, cấp độ và chủ đề của video. Video này có phụ đề trên YouTube nhưng bị Google giới hạn tải ngầm. Bạn chỉ cần copy transcript từ YouTube dán vào đây:
                                    </p>
                                </div>
                            </div>

                            {/* 3-Step Guide */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-1">
                                    <span className="font-bold text-amber-600 dark:text-amber-400">1. Mở video YouTube</span>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Bấm nút bên dưới để mở trang video trên tab mới</p>
                                </div>
                                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-1">
                                    <span className="font-bold text-amber-600 dark:text-amber-400">2. Copy bản chép lời</span>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Dưới mô tả video, bấm <b>"Hiện bản chép lời"</b> rồi bôi đen copy</p>
                                </div>
                                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-1">
                                    <span className="font-bold text-amber-600 dark:text-amber-400">3. Dán & AI dịch</span>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Dán vào ô dưới, AI sẽ tự động định dạng & dịch 100%</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {youtubeId && (
                                    <>
                                        <a
                                            href={`https://www.youtube.com/watch?v=${youtubeId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
                                        >
                                            <Video className="w-4 h-4" />
                                            <span>↗️ Mở YouTube: "{title || youtubeId}"</span>
                                        </a>

                                        <a
                                            href={`https://downsub.com/?url=https://www.youtube.com/watch?v=${youtubeId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
                                        >
                                            <Globe className="w-4 h-4" />
                                            <span>📥 Tải nhanh SRT từ DownSub</span>
                                        </a>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setProcessMode('manual')}
                                    className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <HardDrive className="w-4 h-4" />
                                    <span>Tải file phụ đề (.srt, .vtt)</span>
                                </button>
                            </div>

                            {/* Direct Paste Box */}
                            <div className="space-y-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                    Dán bản chép lời (transcript) vừa copy từ YouTube vào đây:
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder={`Dán nội dung transcript copy từ YouTube vào đây (hỗ trợ định dạng:\n0:01\nCâu tiếng Nhật\n0:05\nCâu tiếp theo...)`}
                                    value={quickPasteTranscript}
                                    onChange={(e) => setQuickPasteTranscript(e.target.value)}
                                    className="w-full p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-amber-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleQuickProcessPastedTranscript}
                                    disabled={isGeneratingAi || !quickPasteTranscript.trim()}
                                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                                >
                                    {isGeneratingAi ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>AI Đang Gán Furigana & Dịch Nghĩa...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            <span>AI Dịch & Gán Furigana Toàn Bộ Ngay</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : subWarningMsg ? (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 space-y-2">
                            <div className="flex items-center gap-2 font-bold">
                                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                                <span>{subWarningMsg}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setProcessMode('manual')}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>Chuyển sang Chế Độ Thủ Công ngay</span>
                            </button>
                        </div>
                    ) : null}

                    {successMsg && (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* MODE 1 UI: AUTO MODE (YouTube URL + One-Click AI Flow) */}
                    {/* ======================================================== */}
                    {processMode === 'auto' && (
                        <div className="space-y-4">
                            <div className="p-5 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border border-amber-500/30 rounded-3xl space-y-4">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        <span>Tự Động Trích Xuất Phụ Đề & AI Dịch Hóa Video YouTube</span>
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Dán link YouTube (đã có phụ đề tiếng Nhật). AI sẽ tự lấy file sub, phân loại cấp độ JLPT, dịch tiêu đề, chủ đề, tên kênh và gán Furigana hoàn toàn tự động.
                                    </p>
                                </div>

                                {/* YouTube Link Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                        Đường dẫn YouTube *
                                    </label>
                                    <div className="relative">
                                        <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                                            value={youtubeUrl}
                                            onChange={handleUrlChange}
                                            className="w-full pl-10 pr-3 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Main Auto Action Button */}
                                <button
                                    type="button"
                                    onClick={handleStartAutoProcess}
                                    disabled={isAutoProcessing || !youtubeUrl.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                                >
                                    {isAutoProcessing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Đang Tự Động Xử Lý Toàn Diện...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            <span>🚀 Bắt Đầu Tự Động Xử Lý (Lấy Sub & AI Dịch Hóa)</span>
                                        </>
                                    )}
                                </button>

                                {/* Auto Processing Stepper Progress */}
                                {autoStep > 0 && (
                                    <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                Tiến Trình Xử Lý Tự Động
                                            </span>
                                            {isAutoProcessing && (
                                                <button
                                                    type="button"
                                                    onClick={handleStopAi}
                                                    className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded-md flex items-center gap-1 cursor-pointer"
                                                >
                                                    <StopCircle className="w-3 h-3" /> Dừng lại
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                            {/* Step 1 */}
                                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                                autoStepDetails.metaDone
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300'
                                                    : autoStep === 1
                                                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-800 dark:text-amber-200 animate-pulse'
                                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 text-slate-400'
                                            }`}>
                                                {autoStepDetails.metaDone ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <RefreshCw className={`w-4 h-4 ${autoStep === 1 ? 'animate-spin' : ''}`} />}
                                                <span>1. Lấy thông tin video & Thumbnail</span>
                                            </div>

                                            {/* Step 2 */}
                                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                                autoStepDetails.subDone
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300'
                                                    : autoStep === 2
                                                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-800 dark:text-amber-200 animate-pulse'
                                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 text-slate-400'
                                            }`}>
                                                {autoStepDetails.subDone ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <RefreshCw className={`w-4 h-4 ${autoStep === 2 ? 'animate-spin' : ''}`} />}
                                                <span>2. Lấy phụ đề tiếng Nhật ({autoStepDetails.subCount || '...'} câu)</span>
                                            </div>

                                            {/* Step 3 */}
                                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                                autoStepDetails.aiMetaDone
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300'
                                                    : autoStep === 3
                                                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-800 dark:text-amber-200 animate-pulse'
                                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 text-slate-400'
                                            }`}>
                                                {autoStepDetails.aiMetaDone ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <RefreshCw className={`w-4 h-4 ${autoStep === 3 ? 'animate-spin' : ''}`} />}
                                                <span>3. AI phân loại JLPT, Dịch tiêu đề & Chủ đề</span>
                                            </div>

                                            {/* Step 4 */}
                                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                                autoStepDetails.aiTransDone
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300'
                                                    : autoStep === 4
                                                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-800 dark:text-amber-200 animate-pulse'
                                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 text-slate-400'
                                            }`}>
                                                {autoStepDetails.aiTransDone ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <RefreshCw className={`w-4 h-4 ${autoStep === 4 ? 'animate-spin' : ''}`} />}
                                                <span>4. AI Furigana, Dịch nghĩa & Từ vựng ({aiProgress?.percent || 0}%)</span>
                                            </div>
                                        </div>

                                        {/* Translation active progress bar */}
                                        {aiProgress && (
                                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                                                    style={{ width: `${aiProgress.percent}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* MODE 2 UI: MANUAL MODE (Source Selection + Sub Upload) */}
                    {/* ======================================================== */}
                    {processMode === 'manual' && (
                        <div className="space-y-4">
                            {/* SOURCE TYPE SELECTOR */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                                    Nguồn Video
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

                            {/* Source Input */}
                            {sourceType === 'youtube' && (
                                <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Đường Dẫn YouTube</label>
                                    <div className="relative">
                                        <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={youtubeUrl}
                                            onChange={handleUrlChange}
                                            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                        />
                                    </div>
                                </div>
                            )}

                            {sourceType === 'file' && (
                                <div 
                                    onClick={() => videoInputRef.current?.click()}
                                    className="p-5 border-2 border-dashed border-amber-300 dark:border-amber-700/80 hover:border-amber-500 rounded-2xl text-center space-y-1 bg-amber-50/20 dark:bg-amber-950/10 cursor-pointer transition-all"
                                >
                                    <HardDrive className="w-7 h-7 text-amber-500 mx-auto" />
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {selectedVideoFile ? selectedVideoFile.name : 'Bấm vào đây để chọn file video từ thiết bị (.mp4, .webm, .mov)'}
                                    </p>
                                    <input
                                        ref={videoInputRef}
                                        type="file"
                                        accept="video/*,.mp4,.webm,.mov,.m4v,.mkv"
                                        onChange={handleVideoFileChange}
                                        className="hidden"
                                    />
                                </div>
                            )}

                            {sourceType === 'direct' && (
                                <div className="space-y-2 p-3.5 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Đường dẫn Direct URL (.mp4 / .webm)</label>
                                    <input
                                        type="text"
                                        placeholder="https://example.com/video.mp4"
                                        value={directVideoUrl}
                                        onChange={(e) => setDirectVideoUrl(e.target.value)}
                                        className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            )}

                            {/* Manual Subtitle Tabs */}
                            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Nhập Phụ Đề / Lời Thoại
                                    </label>
                                    <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setManualSubTab('paste')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${manualSubTab === 'paste' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                                        >
                                            📝 Dán Transcript
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setManualSubTab('upload')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${manualSubTab === 'upload' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                                        >
                                            📂 Tải file (.srt, .vtt)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setManualSubTab('editor')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${manualSubTab === 'editor' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                                        >
                                            ✍️ Chỉnh sửa ({subtitles.length})
                                        </button>
                                    </div>
                                </div>

                                {manualSubTab === 'paste' && (
                                    <div className="space-y-2">
                                        <textarea
                                            rows={4}
                                            placeholder={`Dán nội dung transcript có mốc thời gian [0:01]: câu... hoặc văn bản tiếng Nhật:\n[0:01]: 今日から9月。\n[0:09]: 商品がスキャンされる度に鳴ってしまう...`}
                                            value={rawJapaneseText}
                                            onChange={(e) => setRawJapaneseText(e.target.value)}
                                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleQuickParseOnly}
                                                className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                                            >
                                                📋 Trích xuất vào bảng câu
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {manualSubTab === 'upload' && (
                                    <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-1 bg-white/60 dark:bg-slate-900/60">
                                        <Upload className="w-6 h-6 text-indigo-500 mx-auto" />
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Chọn file .SRT, .VTT hoặc .TXT từ máy tính</p>
                                        <input
                                            type="file"
                                            accept=".srt,.vtt,.txt,.json"
                                            onChange={handleFileUpload}
                                            className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white cursor-pointer"
                                        />
                                    </div>
                                )}

                                {manualSubTab === 'editor' && (
                                    <div className="space-y-2">
                                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                            {subtitles.map((sub, idx) => (
                                                <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                            <span className="font-bold text-slate-400">#{idx + 1}</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={sub.start}
                                                                onChange={(e) => handleSubChange(idx, 'start', parseFloat(e.target.value) || 0)}
                                                                className="w-14 p-1 bg-slate-50 dark:bg-slate-800 border rounded text-center font-bold"
                                                            />
                                                            <span>→</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={sub.end}
                                                                onChange={(e) => handleSubChange(idx, 'end', parseFloat(e.target.value) || 0)}
                                                                className="w-14 p-1 bg-slate-50 dark:bg-slate-800 border rounded text-center font-bold"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSubRow(idx)}
                                                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Tiếng Nhật ({漢字|かんじ}):"
                                                        value={sub.furigana || sub.ja}
                                                        onChange={(e) => {
                                                            handleSubChange(idx, 'furigana', e.target.value);
                                                            handleSubChange(idx, 'ja', e.target.value);
                                                        }}
                                                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded text-xs font-bold text-amber-600 dark:text-amber-400"
                                                    />

                                                    <input
                                                        type="text"
                                                        placeholder="Bản dịch Tiếng Việt:"
                                                        value={sub.vi}
                                                        onChange={(e) => handleSubChange(idx, 'vi', e.target.value)}
                                                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded text-xs text-slate-700 dark:text-slate-300"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAddSubRow}
                                            className="w-full py-1.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 transition flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Thêm câu thoại mới
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SMART AI AUTO-FILL BUTTON FOR MANUAL MODE */}
                            <button
                                type="button"
                                onClick={handleAiAutoFillAll}
                                disabled={isGeneratingAi}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                            >
                                {isGeneratingAi ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>AI Đang Tự Động Phân Tích & Dịch Thuật...</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" />
                                        <span>AI Tự Điền Thông Tin (Level, Chủ đề, Dịch sub & Furigana)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* COMMON METADATA FORM (Auto-filled by AI & Editable)    */}
                    {/* ======================================================== */}
                    <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Thông Tin Video (AI Tự Điền / Tùy Chỉnh)
                            </label>
                            {subtitles.length > 0 && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    ✓ Đã có {subtitles.length} câu phụ đề
                                </span>
                            )}
                        </div>

                        {/* Title (Japanese) and TitleVi (Vietnamese translation) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tiêu đề gốc (Tiếng Nhật) *</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: てこの原理を使った介助 (Kỹ thuật điều dưỡng...)"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bản dịch Tiêu đề (Tiếng Việt)</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Kỹ thuật điều dưỡng ứng dụng nguyên lý đòn bẩy..."
                                    value={titleVi}
                                    onChange={(e) => setTitleVi(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        {/* Level and Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
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

                            <div className="space-y-1">
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
                        </div>

                        {/* Channel and Description */}
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên Kênh / Tác giả</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: 【プロが教える介護技術】やしのきチャンネル"
                                    value={channelTitle}
                                    onChange={(e) => setChannelTitle(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mô tả tóm tắt nội dung video</label>
                                <textarea
                                    rows={2}
                                    placeholder="Tóm tắt ngắn 1-2 câu về nội dung và điểm học tập của video..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        {/* Video Thumbnail Preview */}
                        {customThumbnail && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                <img
                                    src={customThumbnail}
                                    alt="Thumbnail Preview"
                                    className="w-24 aspect-video rounded-lg object-cover bg-slate-800 border"
                                />
                                <div className="text-xs space-y-0.5">
                                    <p className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{title || 'Ảnh bìa video'}</p>
                                    <p className="text-[11px] text-slate-400">Kênh: {channelTitle || 'QuizKi'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-500 text-slate-950">{level}</span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{category}</span>
                                    </div>
                                </div>
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
                        disabled={isSaving || isAutoProcessing || isGeneratingAi}
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

