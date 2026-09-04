import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Play, Lightbulb, PenTool, Layers, Settings, Save, Trash2, Plus, X,
    Volume2, HelpCircle, AlertCircle, Bookmark, ChevronLeft, ChevronRight, Sparkles, Clock, CheckCircle
} from 'lucide-react';
import { fetchGrammarPointById, updateGrammarPoint, subscribeGrammarPoints, deleteGrammarPoint } from '../../utils/grammarService';
import { speakExampleSentence } from '../../utils/audio';
import { showToast } from '../../utils/toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { getAuth } from 'firebase/auth';
import { recordRecentGrammar } from '../../utils/grammarHistory';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import MaziiStructureCard from '../grammar/MaziiStructureCard';
import MaziiExampleItem from '../grammar/MaziiExampleItem';
import MaziiSectionRow from '../grammar/MaziiSectionRow';

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
    { ja: "けんかのあげく、私たちは口をきかなくなりました。", vi: "Sau nhiều lần cãi vã, chúng tôi đã không còn nói chuyện với nhau nữa." },
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
        meaning: '',
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
            const data = await fetchGrammarPointById(grammarId, tb, ls);
            setGp(data);
            setLoading(false);
            if (data?.id) {
                const uid = getAuth().currentUser?.uid;
                if (uid) {
                    recordRecentGrammar(uid, data.id);
                }
            }
        })();
    }, [grammarId, tb, ls]);

    // Fetch sibling points to calculate indexes and next/prev
    useEffect(() => {
        if (tb && ls) {
            const unsub = subscribeGrammarPoints(tb, ls, setPoints, isAdmin || true);
            return () => unsub?.();
        }
    }, [tb, ls, isAdmin]);

    const from = searchParams.get('from');
    let backUrl = '/grammar';
    if (from === 'list') {
        const listParams = new URLSearchParams();
        searchParams.forEach((value, key) => {
            if (key !== 'tb' && key !== 'ls' && key !== 'from') {
                listParams.set(key, value);
            }
        });
        const queryStr = listParams.toString();
        backUrl = `/grammar/list${queryStr ? `?${queryStr}` : ''}`;
    } else if (from === 'saved') {
        backUrl = '/grammar/saved';
    } else if (tb && ls) {
        backUrl = `/grammar/textbook/${tb}/lesson/${ls}`;
    }

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
                meaning: gp.meaning || '',
                meaningFull: gp.meaningFull || '',
                structureRaw: gp.structureRaw || (gp.connection ? gp.connection.join('\n') : (gp.structure ? (Array.isArray(gp.structure) ? gp.structure.map(s => s.text || s).join(' + ') : gp.structure) : '')),
                tips: gp.tips ? [...gp.tips] : [],
                examples: gp.examples ? [...gp.examples] : [],
                visual: gp.visual ? {
                    title: gp.visual.title || '',
                    imageLabel: gp.visual.imageLabel || '',
                    image: gp.visual.image || gp.visual.leftImage || '',
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

    // Reconstruct the structure formula lines cleanly for Mazii display
    const structureLines = useMemo(() => {
        if (!gp) return [];
        const cleanLines = (arrOrStr) => {
            if (!arrOrStr) return [];
            if (Array.isArray(arrOrStr)) {
                return arrOrStr
                    .map(item => typeof item === 'string' ? item : item?.text || '')
                    .map(s => s.trim())
                    .filter(Boolean);
            }
            if (typeof arrOrStr === 'string') {
                return arrOrStr.split(/\n+/).map(s => s.trim()).filter(Boolean);
            }
            return [];
        };

        if (Array.isArray(gp.connection) && gp.connection.length > 0) {
            const lines = cleanLines(gp.connection);
            if (lines.length > 0) return lines;
        }
        if (gp.structureRaw && typeof gp.structureRaw === 'string') {
            const lines = cleanLines(gp.structureRaw);
            if (lines.length > 0) return lines;
        }
        if (gp.structure) {
            if (Array.isArray(gp.structure)) {
                const tokens = gp.structure.map(s => typeof s === 'string' ? s : s?.text || '').filter(Boolean);
                if (tokens.length > 0) {
                    return [tokens.join(' + ')];
                }
            } else if (typeof gp.structure === 'string') {
                return cleanLines(gp.structure);
            }
        }
        return [];
    }, [gp]);

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="animate-fade-in text-center p-8 text-slate-500">Đang tải...</div>
            </div>
        );
    }
    if (!gp) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="animate-fade-in text-center p-8 text-slate-500">Không tìm thấy ngữ pháp.</div>
            </div>
        );
    }

    const totalExercises = (gp.exercises?.length || 0) + (gp.quizzes?.length || 0);

    const parseStructure = (raw) => {
        if (!raw) return [];
        return raw.split('\n').map(s => s.trim()).filter(Boolean).map(line => ({ text: line, type: 'connector' }));
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
            meaning: editForm.meaning.trim(),
            meaningFull: editForm.meaningFull.trim(),
            structureRaw: editForm.structureRaw.trim(),
            connection: editForm.structureRaw.split('\n').map(s => s.trim()).filter(Boolean),
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
            showToast("Lưu ngữ pháp thành công", "success");
        } else {
            alert("Lỗi khi lưu ngữ pháp vào Firestore.");
        }
        setSaving(false);
    };

    const handleDeleteDetail = async () => {
        const confirmed = window.showConfirm
            ? await window.showConfirm(`Bạn có chắc chắn muốn xóa mẫu ngữ pháp "${gp.pattern}" không? Hành động này không thể hoàn tác.`, { type: 'danger', confirmText: 'Xóa vĩnh viễn' })
            : window.confirm(`Bạn có chắc chắn muốn xóa mẫu ngữ pháp "${gp.pattern}" không?`);
        if (confirmed) {
            setSaving(true);
            const targetTb = gp.textbookId || tb;
            const targetLs = gp.lessonId || ls;
            const ok = await deleteGrammarPoint(targetTb, targetLs, grammarId);
            if (ok) {
                showToast(`Đã xóa ngữ pháp "${gp.pattern}"`, 'success');
                navigate(backUrl);
            } else {
                showToast('Xóa ngữ pháp thất bại', 'error');
                setSaving(false);
            }
        }
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
        if (text) {
            speakExampleSentence(text);
        }
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

    const isJapanese = (t) => {
        if (!t) return false;
        return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(t);
    };

    const normalizedExamples = (() => {
        if (!displayExamples || displayExamples.length === 0) return [];
        const result = [];
        for (let i = 0; i < displayExamples.length; i++) {
            const item = displayExamples[i];
            if (typeof item === 'string') {
                const lines = item.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length >= 2) {
                    result.push({ ja: lines[0], vi: lines[1] });
                } else if (lines.length === 1) {
                    if (i + 1 < displayExamples.length && typeof displayExamples[i + 1] === 'string' && !isJapanese(displayExamples[i + 1])) {
                        result.push({ ja: lines[0], vi: displayExamples[i + 1].trim() });
                        i++;
                    } else {
                        result.push({ ja: lines[0], vi: '' });
                    }
                }
            } else if (item && typeof item === 'object') {
                const jaText = (item.ja || '').trim();
                const viText = (item.vi || '').trim();
                const furigana = (item.furigana || '').trim();

                if (jaText && !viText && isJapanese(jaText) && i + 1 < displayExamples.length) {
                    const nextItem = displayExamples[i + 1];
                    const nextJa = (typeof nextItem === 'object' ? (nextItem?.ja || '') : String(nextItem || '')).trim();
                    const nextVi = (nextItem?.vi || '').trim();

                    if (nextJa && !isJapanese(nextJa) && !nextVi) {
                        result.push({ ja: jaText, vi: nextJa, furigana });
                        i++;
                        continue;
                    }
                }
                if (jaText || viText) {
                    result.push({ ja: jaText, vi: viText, furigana });
                }
            }
        }
        return result;
    })();

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
        <div className="w-full pb-8">
            <TopTabBar tabs={GRAMMAR_TABS} />
            <div className="max-w-4xl mx-auto pb-16 animate-fade-in space-y-6 w-full px-4 md:px-0 mt-6">

            {/* Header controls when editing */}
            {isEditing && (
                <div className="flex items-center justify-between w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Chế độ chỉnh sửa</div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={handleSaveDetail} disabled={saving}
                            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all">
                            <Save className="w-3.5 h-3.5" /> Lưu ngữ pháp
                        </button>
                        <button onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1 transition-all">
                            <X className="w-3.5 h-3.5" /> Huỷ
                        </button>
                    </div>
                </div>
            )}

            {/* Editing mode layout */}
            {isEditing ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-4 shadow-sm w-full">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Chỉnh sửa thông tin</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Mẫu ngữ pháp</label>
                            <input value={editForm.pattern} onChange={e => setEditForm(f => ({ ...f, pattern: e.target.value }))}
                                placeholder="Mẫu (VD: 〜際(に))"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-bold font-japanese" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Dịch ngữ pháp (Nghĩa ngắn)</label>
                            <input value={editForm.meaningShort} onChange={e => setEditForm(f => ({ ...f, meaningShort: e.target.value }))}
                                placeholder="Dịch ngữ pháp (VD: Nhân dịp / Khi)"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Ý nghĩa ngữ pháp</label>
                            <input value={editForm.meaning} onChange={e => setEditForm(f => ({ ...f, meaning: e.target.value }))}
                                placeholder="Ý nghĩa ngữ pháp"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-bold" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Câu ví dụ đại diện (Tiếng Nhật)</label>
                            <input value={editForm.visual.sentenceJa} onChange={e => setEditForm(f => ({ ...f, visual: { ...f.visual, sentenceJa: e.target.value } }))}
                                placeholder="Câu ví dụ đại diện (VD: 必死で走ったあげく、バスに乗り遅れてしまった。)"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-bold font-japanese" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Ý nghĩa ngữ pháp / Dịch câu ví dụ (Tiếng Việt)</label>
                            <input value={editForm.visual.descriptionVi} onChange={e => setEditForm(f => ({ ...f, visual: { ...f.visual, descriptionVi: e.target.value } }))}
                                placeholder="Ý nghĩa / Bản dịch của ví dụ đại diện"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-bold" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Cấu trúc công thức (Mỗi dòng 1 công thức)</label>
                        <textarea value={editForm.structureRaw} onChange={e => setEditForm(f => ({ ...f, structureRaw: e.target.value }))} rows={3}
                            placeholder={"V (root form) + のにひきかえ\nN + （である）のにひきかえ\nなadj + な/である + のにひきかえ"}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-mono" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Giải thích chi tiết (GIẢI THÍCH)</label>
                        <textarea value={editForm.meaningFull} onChange={e => setEditForm(f => ({ ...f, meaningFull: e.target.value }))} rows={4}
                            placeholder="Ý nghĩa chi tiết..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none" />
                    </div>

                    {/* Examples Editor */}
                    <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500">Các ví dụ</label>
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
                                        className="w-full px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold font-japanese" />
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
                </div>
            ) : (

                /* Mazii Form Reading/Study Layout */
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 w-full">
                    {/* Header: Back button, Pattern Title, Meaning in corner brackets, JLPT badge, Audio button, Admin actions */}
                    <div className="flex items-start justify-between gap-4 w-full">
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            {/* Back Button */}
                            <button
                                onClick={() => navigate(backUrl)}
                                className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs shrink-0 mt-0.5 cursor-pointer"
                                title="Quay lại"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {/* Main Title & Description */}
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                {/* Pattern Title in Mazii Blue */}
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-2xl md:text-3xl font-bold text-[#1d70b8] dark:text-sky-400 font-japanese tracking-normal">
                                        {gp.pattern}
                                    </h1>

                                    {/* Audio button for the pattern */}
                                    <button
                                        type="button"
                                        onClick={() => speakText(gp.pattern)}
                                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                                        title="Nghe phát âm mẫu câu"
                                    >
                                        <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Short Meaning enclosed in Japanese brackets 「...」 */}
                                {(gp.meaningShort || gp.meaning) && (
                                    <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-normal font-japanese leading-relaxed">
                                        <span className="text-slate-400 dark:text-slate-500 select-none font-light mr-0.5">「</span>
                                        <span>{gp.meaningShort || gp.meaning}</span>
                                        <span className="text-slate-400 dark:text-slate-500 select-none font-light ml-0.5">」</span>
                                    </p>
                                )}

                                {/* JLPT Level Badge (Mazii Orange) */}
                                <div className="pt-0.5 flex items-center gap-2">
                                    <span className="bg-[#f59e0b] text-white px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase inline-block select-none">
                                        JLPT {gp.level || 'N3'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="shrink-0 pt-0.5 flex items-center gap-2">
                                <button onClick={() => setIsEditing(true)}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-900/40 shadow-xs transition-all cursor-pointer">
                                    <Settings className="w-3.5 h-3.5" /> Sửa
                                </button>
                                <button onClick={handleDeleteDetail} disabled={saving}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/40 shadow-xs disabled:opacity-50 transition-all cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Xóa
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-b border-slate-100 dark:border-slate-800/80 my-2"></div>

                    {/* Visual Illustration Card (if exists) */}
                    {visualData && visualData.image && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 shadow-sm w-fit mx-auto flex justify-center my-4">
                            <img
                                src={visualData.image}
                                alt={visualData.imageLabel || "Visual illustration"}
                                className="max-h-[420px] max-w-full object-contain rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 shadow-sm p-2"
                            />
                        </div>
                    )}

                    {/* Standard Mazii Structured Form Sections */}
                    <div className="w-full space-y-7">
                        {/* 1. CẤU TRÚC */}
                        {structureLines.length > 0 && (
                            <div className="space-y-2">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Cấu trúc
                                </h2>
                                <div className="space-y-1 pl-0.5">
                                    {structureLines.map((line, idx) => (
                                        <MaziiStructureCard key={idx} formula={line} pattern={gp.pattern} isFirst={idx === 0} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. NGHĨA (GIẢI THÍCH) */}
                        {gp.meaningFull && (
                            <div className="space-y-2">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Nghĩa
                                </h2>
                                <div className="space-y-3 pl-0.5 text-slate-700 dark:text-slate-200 text-sm md:text-[15px] leading-relaxed">
                                    {gp.meaningFull.split(/\n\s*\n/).filter(Boolean).map((para, pIdx) => {
                                        const lines = para.split('\n');
                                        return (
                                            <p key={pIdx} className="leading-relaxed break-words font-normal">
                                                {lines.map((l, lIdx) => (
                                                    <React.Fragment key={lIdx}>
                                                        {l}
                                                        {lIdx < lines.length - 1 && <br />}
                                                    </React.Fragment>
                                                ))}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. CHÚ Ý (if any) */}
                        {displayTips && displayTips.length > 0 && (
                            <div className="space-y-2">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Chú ý
                                </h2>
                                <div className="space-y-2.5 w-full pl-0.5">
                                    {displayTips.map((tip, idx) => {
                                        const cleanText = (tip.text || '').replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{1F600}-\u{1F64F}💡]\s*/u, '');
                                        return (
                                            <div key={idx} className="flex items-start gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 dark:border-amber-900/40 px-4 py-3 rounded-2xl shadow-2xs">
                                                <span className="shrink-0 text-base">{tip.icon || '💡'}</span>
                                                <p className="break-words w-full">{cleanText}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 4. VÍ DỤ */}
                        {normalizedExamples.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Ví dụ
                                </h2>
                                <div className="space-y-2.5 w-full">
                                    {normalizedExamples.map((ex, i) => (
                                        <MaziiExampleItem
                                            key={i}
                                            example={ex}
                                            pattern={gp.pattern}
                                            index={i}
                                            onPlayAudio={speakText}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Progress Bar & Completed/Next Action */}
                    {hasProgress && (
                        <div className="flex flex-col items-center gap-5 pt-8 w-full border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={handleNextClick}
                                className="bg-[#1d70b8] hover:bg-[#155b96] text-white font-bold rounded-2xl px-10 py-3.5 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
                            >
                                {nextGp ? 'HOÀN THÀNH & TIẾP TỤC' : 'HOÀN THÀNH BÀI HỌC'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

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
        </div>
    );
};

export default GrammarDetailScreen;
