import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, Play, Lightbulb, PenTool, Layers, Settings, Save, Trash2, Plus, X, 
    Volume2, HelpCircle, AlertCircle, Bookmark, ChevronLeft, ChevronRight, Sparkles, Clock, CheckCircle
} from 'lucide-react';
import { fetchGrammarPointById, updateGrammarPoint, subscribeGrammarPoints } from '../../utils/grammarService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';

// Fallback illustration data for ~あげく
const FALLBACK_VISUAL = {
    active: true,
    title: "Học Ngữ pháp Trực quan Zen",
    imageLabel: "KẾT QUẢ ĐÁNG TIẾC",
    image: "/images/grammar/ageku_miss.png",
    descriptionVi: "Sau một hồi chạy thục mạng, cuối cùng tôi lại bị lỡ chuyến xe buýt.",
    sentenceJa: "必死で走ったあげく、バスに乗り遅れてしまった。",
    sentenceJaUnderline: "あげく"
};

const FALLBACK_TIPS = [
    { text: "Thường đi kèm với kết quả tiêu cực, đáng tiếc. Không dùng cho những kết quả tốt hoặc hành động trung tính bình thường." }
];

const FALLBACK_EXAMPLES = [
    { ja: "けんかのあげく、私たちは口 các きかなくなりました。", vi: "Sau nhiều lần cãi vã, chúng tôi đã không còn nói chuyện với nhau nữa." },
    { ja: "散々迷ったあげく、何も買わずに店を出た。", vi: "Sau một hồi phân vân mãi, cuối cùng tôi đã rời cửa hàng mà không mua gì cả." }
];

const GrammarDetailScreen = ({ isAdmin, profile = null }) => {
    const { grammarId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [gp, setGp] = useState(null);
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const tb = searchParams.get('tb');
    const ls = searchParams.get('ls');

    // Image uploading state for single visual
    const [uploadingState, setUploadingState] = useState(false);

    // Admin editing states
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        pattern: '',
        meaningShort: '',
        meaningFull: '',
        structureRaw: '',
        tips: [],
        examples: [],
        visual: {
            title: '',
            imageLabel: '',
            image: '',
            sentenceJa: '',
            sentenceJaUnderline: '',
            descriptionVi: ''
        }
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            setGp(null);
            setLoading(true);
            const data = await fetchGrammarPointById(grammarId);
            setGp(data);
            setLoading(false);
        })();
    }, [grammarId]);

    // Fetch sibling points to calculate indexes and next/prev
    useEffect(() => {
        if (tb && ls) {
            const unsub = subscribeGrammarPoints(tb, ls, setPoints, isAdmin || true);
            return () => unsub?.();
        }
    }, [tb, ls, isAdmin]);

    const backUrl = (tb && ls) ? `/grammar/textbook/${tb}/lesson/${ls}` : '/grammar';

    useEffect(() => {
        if (gp && profile) {
            const userIsAdmin = profile?.email && ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(profile.email);
            const isLocked = gp.lesson?.isPremium && !userIsAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('grammar_zen');
            if (isLocked) {
                navigate(backUrl);
            }
        }
    }, [gp, profile, backUrl, navigate]);

    // Populate edit form when edit mode is toggled or gp changes
    useEffect(() => {
        if (gp) {
            setEditForm({
                pattern: gp.pattern || '',
                meaningShort: gp.meaningShort || '',
                meaningFull: gp.meaningFull || '',
                structureRaw: gp.structure ? gp.structure.map(s => s.type === 'highlight' ? `*${s.text}` : s.text).join(' + ') : '',
                tips: gp.tips ? [...gp.tips] : [],
                examples: gp.examples ? [...gp.examples] : [],
                visual: gp.visual ? {
                    title: gp.visual.title || '',
                    imageLabel: gp.visual.imageLabel || '',
                    image: gp.visual.image || gp.visual.leftImage || '', // Migration fallback from leftImage
                    sentenceJa: gp.visual.sentenceJa || '',
                    sentenceJaUnderline: gp.visual.sentenceJaUnderline || '',
                    descriptionVi: gp.visual.descriptionVi || ''
                } : {
                    title: '',
                    imageLabel: '',
                    image: '',
                    sentenceJa: '',
                    sentenceJaUnderline: '',
                    descriptionVi: ''
                }
            });
        }
    }, [gp, isEditing]);

    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;
    if (!gp) return <div className="p-8 text-center text-slate-500">Không tìm thấy ngữ pháp.</div>;

    const totalExercises = (gp.exercises?.length || 0) + (gp.quizzes?.length || 0);

    const parseStructure = (raw) => {
        if (!raw) return [];
        return raw.split('+').map(s => {
            const t = s.trim();
            if (t.startsWith('*')) return { text: t.slice(1), type: 'highlight' };
            if (t.startsWith('V')) return { text: t, type: 'verb' };
            if (t.startsWith('N') || t.startsWith('A')) return { text: t, type: 'noun' };
            return { text: t, type: 'connector' };
        });
    };

    // Firebase Storage upload helper
    const uploadImageFile = async (file) => {
        try {
            const fileExt = file.name ? file.name.split('.').pop() : 'png';
            const storageRef = ref(storage, `grammar_visuals/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            return downloadUrl;
        } catch (error) {
            console.error("Upload error:", error);
            throw error;
        }
    };

    // Paste & drop handler
    const handleImagePasteOrDrop = async (e) => {
        e.preventDefault();
        let file = null;

        if (e.type === 'paste') {
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        file = items[i].getAsFile();
                        break;
                    }
                }
            }
        } else if (e.type === 'drop') {
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                if (files[0].type.indexOf('image') !== -1) {
                    file = files[0];
                }
            }
        }

        if (file) {
            try {
                setUploadingState(true);
                const url = await uploadImageFile(file);
                setEditForm(f => ({
                    ...f,
                    visual: {
                        ...f.visual,
                        image: url
                    }
                }));
            } catch (err) {
                alert("Lỗi khi tải ảnh lên: " + err.message);
            } finally {
                setUploadingState(false);
            }
        }
    };

    const handleSaveDetail = async () => {
        setSaving(true);
        const updatedData = {
            ...gp,
            pattern: editForm.pattern.trim(),
            meaningShort: editForm.meaningShort.trim(),
            meaningFull: editForm.meaningFull.trim(),
            structure: parseStructure(editForm.structureRaw),
            tips: editForm.tips.map(t => ({ ...t, text: t.text.trim() })).filter(t => t.text),
            examples: editForm.examples.map(ex => ({ ja: ex.ja.trim(), vi: ex.vi.trim() })).filter(ex => ex.ja || ex.vi),
            visual: {
                active: !!(editForm.visual.image.trim() || editForm.visual.sentenceJa.trim()),
                title: editForm.visual.title.trim() || "Học Ngữ pháp Trực quan Zen",
                imageLabel: editForm.visual.imageLabel.trim(),
                image: editForm.visual.image.trim(),
                sentenceJa: editForm.visual.sentenceJa.trim(),
                sentenceJaUnderline: editForm.visual.sentenceJaUnderline.trim(),
                descriptionVi: editForm.visual.descriptionVi.trim()
            }
        };

        const success = await updateGrammarPoint(gp.textbookId, gp.lessonId, grammarId, updatedData);
        if (success) {
            setGp(updatedData);
            setIsEditing(false);
        } else {
            alert("Lỗi khi lưu ngữ pháp vào Firestore.");
        }
        setSaving(false);
    };

    const handleAddExample = () => {
        setEditForm(f => ({
            ...f,
            examples: [...f.examples, { ja: '', vi: '' }]
        }));
    };

    const handleRemoveExample = (idx) => {
        setEditForm(f => ({
            ...f,
            examples: f.examples.filter((_, i) => i !== idx)
        }));
    };

    const handleAddTip = () => {
        setEditForm(f => ({
            ...f,
            tips: [...f.tips, { icon: '💡', text: '' }]
        }));
    };

    const handleRemoveTip = (idx) => {
        setEditForm(f => ({
            ...f,
            tips: f.tips.filter((_, i) => i !== idx)
        }));
    };

    // Calculate progression details
    const currentIndex = points.findIndex(p => p.id === grammarId);
    const hasProgress = points.length > 0 && currentIndex !== -1;
    const nextGp = hasProgress && currentIndex < points.length - 1 ? points[currentIndex + 1] : null;

    const handleNextClick = () => {
        if (nextGp) {
            navigate(`/grammar/detail/${nextGp.id}?tb=${tb}&ls=${ls}`);
        } else {
            setShowCompletionModal(true);
        }
    };

    // Text to Speech
    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            window.speechSynthesis.speak(utterance);
        }
    };

    // Helper to highlight N, A, V symbols
    const highlightNAV = (text) => {
        if (!text) return text;
        const navRegex = /([NAV])/g;
        const parts = text.split(navRegex);
        if (parts.length <= 1) return text;
        
        return (
            <>
                {parts.map((part, index) => {
                    if (index % 2 === 1) {
                        if (part === 'V') {
                            return (
                                <span key={index} className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 px-1.5 py-0.5 rounded-md mx-0.5 text-xs font-black align-middle leading-none">
                                    V
                                </span>
                            );
                        }
                        if (part === 'N') {
                            return (
                                <span key={index} className="inline-flex items-center justify-center bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 px-1.5 py-0.5 rounded-md mx-0.5 text-xs font-black align-middle leading-none">
                                    N
                                </span>
                            );
                        }
                        if (part === 'A') {
                            return (
                                <span key={index} className="inline-flex items-center justify-center bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded-md mx-0.5 text-xs font-black align-middle leading-none">
                                    A
                                </span>
                            );
                        }
                    }
                    return part;
                })}
            </>
        );
    };

    // Helper to highlight targeted patterns in sentences automatically
    const renderHighlightedText = (text, highlight, isStructure = false) => {
        if (!highlight || !text) return isStructure ? highlightNAV(text) : text;
        
        // Clean the pattern: remove leading tildes
        let basePattern = highlight.replace(/^[~〜]/, '').trim();
        if (!basePattern) return isStructure ? highlightNAV(text) : text;

        // Escape regex special chars and convert optional parentheses to optional groups
        let regexStr = basePattern.replace(/\(([^)]+)\)/g, '(?:$1)?');

        try {
            const regex = new RegExp(`(${regexStr})`, 'g');
            const parts = text.split(regex);
            if (parts.length > 1) {
                return (
                    <>
                        {parts.map((part, index) => {
                            if (index % 2 === 1) {
                                return (
                                    <span key={index} className="underline decoration-2 underline-offset-4 font-bold text-indigo-650 dark:text-indigo-400">
                                        {part}
                                    </span>
                                );
                            }
                            return isStructure ? highlightNAV(part) : part;
                        })}
                    </>
                );
            }
        } catch (e) {
            console.error("Highlight regex error:", e);
        }

        // Fallback to simple inclusion match
        let simplePattern = basePattern.replace(/\([^)]+\)/g, '');
        if (simplePattern && text.includes(simplePattern)) {
            const parts = text.split(simplePattern);
            return (
                <>
                    {isStructure ? highlightNAV(parts[0]) : parts[0]}
                    <span className="underline decoration-2 underline-offset-4 font-bold text-indigo-650 dark:text-indigo-400">
                        {simplePattern}
                    </span>
                    {isStructure ? highlightNAV(parts[1]) : parts[1]}
                </>
            );
        }

        return isStructure ? highlightNAV(text) : text;
    };

    // Get the visual illustration details
    const hasVisualData = gp.visual && (gp.visual.active || gp.visual.image || gp.visual.leftImage || gp.visual.sentenceJa);
    const visualData = hasVisualData 
        ? {
            title: gp.visual.title,
            imageLabel: gp.visual.imageLabel || gp.visual.themeRight || gp.visual.themeLeft || '',
            image: gp.visual.image || gp.visual.rightImage || gp.visual.leftImage || '',
            descriptionVi: gp.visual.descriptionVi,
            sentenceJa: gp.visual.sentenceJa,
            sentenceJaUnderline: gp.visual.sentenceJaUnderline
          }
        : ((gp.pattern?.includes('あげく') || gp.pattern?.includes('あげk')) ? FALLBACK_VISUAL : null);

    const displayTips = gp.tips?.length > 0 
        ? gp.tips 
        : ((gp.pattern?.includes('あげk') || gp.pattern?.includes('あげく')) ? FALLBACK_TIPS : []);

    const displayExamples = gp.examples?.length > 0 
        ? gp.examples 
        : ((gp.pattern?.includes('あげk') || gp.pattern?.includes('あげく')) ? FALLBACK_EXAMPLES : []);

    // Reconstruct the full structure formula string from the database
    const fullStructure = gp.structure?.map(s => s.text).join(' + ') || '';

    // Smart language-detection to handle swapped admin database fields
    const isJapanese = (t) => {
        if (!t) return false;
        return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(t);
    };

    let jpText = '';
    let viText = '';
    if (visualData) {
        const text1 = visualData.descriptionVi || '';
        const text2 = visualData.sentenceJa || '';
        if (isJapanese(text1)) {
            jpText = text1;
            viText = text2;
        } else if (isJapanese(text2)) {
            jpText = text2;
            viText = text1;
        } else {
            jpText = text2 || text1;
            viText = text2 ? text1 : '';
        }
    }

    return (
        <div className="max-w-4xl mx-auto pb-16 animate-fade-in space-y-6 w-full px-4 md:px-0">
            
            {/* Breadcrumbs & Header controls */}
            <div className="flex items-center justify-between w-full">
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest break-all">
                        NGỮ PHÁP {gp.textbook?.levels?.[0] || 'N2'} &gt; {gp.lesson?.sectionLabel || 'BÀI 1'}: {gp.lesson?.title || '~ あげく'}
                    </p>
                    <button 
                        onClick={() => navigate(backUrl)} 
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>

                {isAdmin && (
                    <div className="flex gap-2 shrink-0">
                        {isEditing ? (
                            <>
                                <button onClick={handleSaveDetail} disabled={saving}
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all">
                                    <Save className="w-3.5 h-3.5" /> Lưu ngữ pháp
                                </button>
                                <button onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1 transition-all">
                                    <X className="w-3.5 h-3.5" /> Huỷ
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-900/40 shadow-sm transition-all">
                                <Settings className="w-3.5 h-3.5" /> Sửa ngữ pháp
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Editing mode layout */}
            {isEditing ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-3xl p-6 space-y-4 shadow-sm w-full">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Chỉnh sửa thông tin</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Mẫu ngữ pháp</label>
                            <input value={editForm.pattern} onChange={e => setEditForm(f => ({ ...f, pattern: e.target.value }))}
                                placeholder="Mẫu (VD: 〜際(に))"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Nghĩa ngắn</label>
                            <input value={editForm.meaningShort} onChange={e => setEditForm(f => ({ ...f, meaningShort: e.target.value }))}
                                placeholder="Nghĩa ngắn (VD: Nhân dịp / Khi)"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Giải thích chi tiết (GIẢI THÍCH)</label>
                        <textarea value={editForm.meaningFull} onChange={e => setEditForm(f => ({ ...f, meaningFull: e.target.value }))} rows={3}
                            placeholder="Ý nghĩa chi tiết..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Cấu trúc (dùng + ngăn cách, *đọc highlight): VD: V-た + *際(ni) + N-no</label>
                        <input value={editForm.structureRaw} onChange={e => setEditForm(f => ({ ...f, structureRaw: e.target.value }))}
                            placeholder="Cấu trúc..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-mono" />
                    </div>

                    {/* Tips Editor */}
                    <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500">Lưu ý sử dụng (mỗi dòng 1 lưu ý)</label>
                            <button onClick={handleAddTip} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Thêm lưu ý
                            </button>
                        </div>
                        {editForm.tips.map((tip, idx) => (
                            <div key={idx} className="flex items-center gap-2 w-full">
                                <input value={tip.icon || '💡'} onChange={e => {
                                    const newTips = [...editForm.tips];
                                    newTips[idx].icon = e.target.value;
                                    setEditForm(f => ({ ...f, tips: newTips }));
                                }} className="w-10 px-2 py-1 text-center bg-slate-50 border rounded-lg text-sm shrink-0" placeholder="💡" />
                                <input value={tip.text} onChange={e => {
                                    const newTips = [...editForm.tips];
                                    newTips[idx].text = e.target.value;
                                    setEditForm(f => ({ ...f, tips: newTips }));
                                }} className="flex-1 px-3 py-1 bg-slate-50 border rounded-lg text-sm outline-none" placeholder="Nhập nội dung lưu ý..." />
                                <button onClick={() => handleRemoveTip(idx)} className="text-slate-405 hover:text-red-500 shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Examples Editor */}
                    <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500">Các ví dụ khác</label>
                            <button onClick={handleAddExample} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Thêm ví dụ
                            </button>
                        </div>
                        {editForm.examples.map((ex, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl relative border border-slate-200 dark:border-slate-800 space-y-2 w-full">
                                <button onClick={() => handleRemoveExample(idx)} className="absolute top-2 right-2 text-slate-450 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Tiếng Nhật</label>
                                    <input value={ex.ja} onChange={e => {
                                        const newExs = [...editForm.examples];
                                        newExs[idx].ja = e.target.value;
                                        setEditForm(f => ({ ...f, examples: newExs }));
                                    }} placeholder="Câu tiếng Nhật..."
                                        className="w-full px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Tiếng Việt</label>
                                    <input value={ex.vi} onChange={e => {
                                        const newExs = [...editForm.examples];
                                        newExs[idx].vi = e.target.value;
                                        setEditForm(f => ({ ...f, examples: newExs }));
                                    }} placeholder="Bản dịch tiếng Việt..."
                                        className="w-full px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Visual Editor integrated directly */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6 space-y-4 w-full">
                        <h3 className="text-base font-bold text-slate-855 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" /> Giao diện trực quan (Zen Visual Grammar)
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 w-full">

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Đường dẫn ảnh minh hoạ</label>
                                <input 
                                    value={editForm.visual.image} 
                                    onChange={e => setEditForm(f => ({ ...f, visual: { ...f.visual, image: e.target.value } }))}
                                    placeholder="VD: /images/grammar/ageku_miss.png hoặc URL"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                                />
                            </div>

                            {/* Image Paste/Drop zone */}
                            <div 
                                onPaste={handleImagePasteOrDrop}
                                onDrop={handleImagePasteOrDrop}
                                onDragOver={e => e.preventDefault()}
                                className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors relative"
                            >
                                {uploadingState ? (
                                    <p className="text-xs text-indigo-500 font-bold animate-pulse py-4">Đang tải ảnh lên...</p>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500 font-bold">Bấm vào đây rồi dán ảnh (Ctrl+V) hoặc kéo thả file để tải lên</p>
                                        {editForm.visual.image && (
                                            <img src={editForm.visual.image} alt="preview" className="max-h-24 mx-auto object-contain rounded border border-slate-200 shadow-sm" />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nghĩa tiếng Việt giải thích cho ảnh</label>
                                <textarea 
                                    value={editForm.visual.descriptionVi} 
                                    onChange={e => setEditForm(f => ({ ...f, visual: { ...f.visual, descriptionVi: e.target.value } }))}
                                    placeholder="VD: Sau một hồi chạy thục mạng, cuối cùng tôi lại bị lỡ chuyến xe buýt."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Câu tiếng Nhật minh hoạ</label>
                                <input 
                                    value={editForm.visual.sentenceJa} 
                                    onChange={e => setEditForm(f => ({ ...f, visual: { ...f.visual, sentenceJa: e.target.value } }))}
                                    placeholder="VD: 必死で走ったあげく、バスに乗り遅れてしまった。"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                
                /* Reading/Study Layout */
                <>
                    {/* Badge & Pattern Title */}
                    <div className="flex flex-col gap-2 mt-4 w-full">
                        <span className="w-fit px-3 py-1 text-[11px] font-bold rounded-lg bg-purple-100 text-purple-750 dark:bg-purple-950/40 dark:text-purple-300">
                            {gp.lesson?.sectionLabel ? (gp.lesson.sectionLabel.includes('課') || gp.lesson.sectionLabel.includes('部') || gp.lesson.sectionLabel.includes('BÀI') ? gp.lesson.sectionLabel : `BÀI ${gp.lesson.sectionLabel}`) : 'BÀI 1'}
                        </span>
                        <div className="flex flex-wrap items-center gap-3.5 w-full">
                            <div className="w-9 h-9 rounded-full bg-[#3b6070] dark:bg-slate-700 text-white flex items-center justify-center font-bold text-lg shrink-0">
                                {hasProgress ? currentIndex + 1 : 1}
                            </div>
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-white break-all">
                                {gp.pattern}
                            </h1>
                            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 px-3.5 py-1 rounded-xl text-sm font-bold tracking-wide break-all">
                                {gp.meaningShort}
                            </span>
                        </div>
                        {/* Structure formula under the title */}
                        {fullStructure && (
                            <div className="mt-2.5 pl-[50px] w-fit">
                                <div className="bg-sky-50 dark:bg-sky-950/35 border border-sky-100 dark:border-sky-900/30 px-3 py-1 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-350 font-japanese tracking-wide shadow-sm flex items-center gap-1.5 w-fit">
                                    {renderHighlightedText(fullStructure, gp.pattern, true)}
                                    <span className="text-slate-400 dark:text-slate-500 font-normal mx-0.5">+</span>
                                    <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 px-2 py-0.5 rounded-md text-sm font-black align-middle leading-none">
                                        {gp.pattern}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Zen Visual Grammar Card */}
                    {visualData && (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-6 w-full">

                            {/* Centered Single Column Layout */}
                            <div className="space-y-4 flex flex-col items-center justify-center min-w-0 w-full">
                                {visualData.image && (
                                    <div className="flex justify-center w-full">
                                        <img 
                                            src={visualData.image} 
                                            alt={visualData.imageLabel || "Visual illustration"}
                                            className="max-h-[480px] max-w-full object-contain rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/10 dark:bg-slate-900/20 shadow-sm p-2"
                                        />
                                    </div>
                                )}

                                {jpText && (
                                    <div 
                                        className="bg-[#f1f5f9] dark:bg-slate-700/50 hover:bg-[#e2e8f0] dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-3 flex items-center w-fit mx-auto cursor-pointer transition-all active:scale-[0.98] shadow-sm"
                                        onClick={() => speakText(jpText)}
                                    >
                                        <p className="text-base md:text-lg font-bold text-slate-855 dark:text-slate-200 tracking-wide break-words w-full font-japanese text-center">
                                            {renderHighlightedText(jpText, gp.pattern)}
                                        </p>
                                    </div>
                                )}

                                {viText && (
                                    <p className="text-center text-slate-500 dark:text-slate-400 italic text-xs md:text-sm px-6 max-w-2xl leading-relaxed break-words w-full mt-2">
                                        "{viText}"
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Explanations & Warnings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {/* GIẢI THÍCH Box */}
                        <div className="bg-[#f5ebff] dark:bg-purple-950/20 border border-purple-200/40 dark:border-purple-900/30 rounded-2xl p-5 relative pl-16 shadow-sm min-w-0 w-full">
                            <div className="absolute left-4 top-5 w-9 h-9 rounded-xl bg-[#c084fc] text-white flex items-center justify-center shrink-0">
                                <Lightbulb className="w-5 h-5" />
                            </div>
                            <div className="space-y-1 min-w-0 w-full">
                                <h4 className="text-[10px] font-bold text-purple-650 dark:text-purple-400 uppercase tracking-widest">
                                    GIẢI THÍCH
                                </h4>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed break-words w-full">
                                    {gp.meaningFull || gp.meaningShort}
                                </p>
                            </div>
                        </div>

                        {/* LƯU Ý SỬ DỤNG Box */}
                        <div className="bg-[#fff1f2] dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/30 rounded-2xl p-5 relative pl-16 shadow-sm min-w-0 w-full">
                            <div className="absolute left-4 top-5 w-9 h-9 rounded-xl bg-[#f43f5e] text-white flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1 min-w-0 w-full">
                                <h4 className="text-[10px] font-bold text-rose-650 dark:text-rose-455 uppercase tracking-widest">
                                    LƯU Ý SỬ DỤNG
                                </h4>
                                <div className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed break-words w-full">
                                    {displayTips.length > 0 ? (
                                        displayTips.map((t, idx) => (
                                            <p key={idx} className="break-words w-full">{t.text || t}</p>
                                        ))
                                    ) : (
                                        <p className="break-words w-full">Chưa có lưu ý đặc biệt cho cấu trúc này.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Other Examples Section */}
                    {displayExamples.length > 0 && (
                        <div className="w-full">
                            <div className="flex items-center gap-3 mt-10 mb-5">
                                <div className="w-1.5 h-6 bg-[#3b6070] dark:bg-teal-600 rounded-full"></div>
                                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    CÁC VÍ DỤ KHÁC (EXAMPLES)
                                </h2>
                            </div>

                            <div className="space-y-4 w-full">
                                {displayExamples.map((ex, i) => {
                                    // Circular styles index styling
                                    const circleStyles = [
                                        "border-emerald-500/30 text-emerald-600 dark:text-emerald-455 bg-emerald-50/50 dark:bg-emerald-950/20",
                                        "border-purple-500/30 text-purple-650 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20",
                                        "border-sky-500/30 text-sky-600 dark:text-sky-455 bg-sky-50/50 dark:bg-sky-950/20",
                                    ];
                                    const style = circleStyles[i % circleStyles.length];

                                    return (
                                        <div 
                                            key={i} 
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex items-start shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer w-full min-w-0"
                                            onClick={() => speakText(ex.ja)}
                                        >
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 mr-4 ${style}`}>
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-base md:text-lg text-slate-800 dark:text-white leading-relaxed break-words w-full font-japanese">
                                                    {renderHighlightedText(ex.ja, gp.pattern)}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 break-words w-full">
                                                    {ex.vi}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Bottom Progress Bar & Completed/Next Action */}
                    {hasProgress && (
                        <div className="flex flex-col items-center gap-5 pt-8 w-full">
                            {/* Finish & Next button */}
                            <button 
                                onClick={handleNextClick}
                                className="bg-[#3b6070] hover:bg-[#2c4956] text-white font-bold rounded-2xl px-10 py-3.5 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
                            >
                                {nextGp ? 'HOÀN THÀNH & TIẾP TỤC' : 'HOÀN THÀNH BÀI HỌC'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Lesson Completed Overlay Modal */}
            {showCompletionModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl text-center space-y-6 animate-scale-up">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-455 shadow-sm">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Tuyệt vời! 🎉</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Bạn đã hoàn thành việc học toàn bộ mẫu câu ngữ pháp trong bài học này!
                            </p>
                        </div>

                        {gp.lesson && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{gp.lesson.sectionLabel}</p>
                                <p className="text-base font-bold text-slate-800 dark:text-white mt-0.5">{gp.lesson.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">{gp.lesson.meaning}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-2">
                            {totalExercises > 0 ? (
                                <button 
                                    onClick={() => {
                                        setShowCompletionModal(false);
                                        navigate(`/grammar/practice/${grammarId}?tb=${tb || gp.textbookId}&ls=${ls || gp.lessonId}`);
                                    }}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm text-sm"
                                >
                                    <PenTool className="w-4 h-4" /> Luyện tập bài tập ({totalExercises} câu)
                                </button>
                            ) : (
                                <button 
                                    onClick={() => {
                                        setShowCompletionModal(false);
                                        navigate(`/grammar/practice/${grammarId}?tb=${tb || gp.textbookId}&ls=${ls || gp.lessonId}`);
                                    }}
                                    className="w-full py-3 bg-indigo-655 hover:bg-indigo-755 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm text-sm"
                                >
                                    <PenTool className="w-4 h-4" /> Luyện tập bài tập ngay
                                </button>
                            )}
                            
                            <button 
                                onClick={() => {
                                    setShowCompletionModal(false);
                                    navigate(backUrl);
                                }}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer text-sm"
                            >
                                Quay lại danh sách bài học
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrammarDetailScreen;
