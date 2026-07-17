import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    ArrowLeft, Plus, Trash2, Edit2, Save, ChevronRight, PenTool, FileJson, 
    Clipboard, Check, AlertCircle, Sparkles, Clock, X 
} from 'lucide-react';
import { 
    subscribeTextbooks, subscribeLessons, subscribeGrammarPoints, 
    addGrammarPoint, updateGrammarPoint, deleteGrammarPoint, importGrammarPointsFromJson 
} from '../../utils/grammarService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';

const SAMPLE_POINTS_JSON = `[
  {
    "pattern": "〜際(に)",
    "meaningShort": "Nhân dịp / Khi",
    "meaningFull": "Cấu trúc trang trọng tương tự とき, dùng khi hướng dẫn, thông báo công cộng.",
    "structureRaw": "V-ru/V-ta + *際(ni) + N-no + *際(ni)",
    "tipsRaw": "Dùng trong văn viết hoặc chỉ dẫn trang trọng.\\nKhông dùng cho các hoạt động sinh hoạt thường ngày.",
    "examplesRaw": "お降りの際は、足元にご注意ください。\\nKhi xuống xe, xin hãy chú ý dưới chân.\\n緊急の際は、このボタンを押してください。\\nTrong trường hợp khẩn cấp, hãy ấn nút này.",
    "visual": {
      "image": "",
      "sentenceJa": "お降りの際は、足元にご注意ください。",
      "descriptionVi": "Khi xuống xe, xin hãy chú ý dưới chân."
    },
    "exercises": [
      {
        "questionVi": "Khi đi du lịch nước ngoài, hộ chiếu là cần thiết。",
        "hint": "passport",
        "answers": ["外国旅行の際、パスポートが必要です。"]
      }
    ],
    "quizzes": [
      {
        "question": "非常の______、このボタンを押してください。",
        "options": ["際", "際に", "とき", "こと"],
        "answer": "際"
      }
    ]
  }
]`;

const EMPTY_FORM = {
    pattern: '',
    meaningShort: '',
    meaningFull: '',
    structureRaw: '',
    tipsRaw: '',
    examplesRaw: '',
    visual: {
        title: '',
        imageLabel: '',
        image: '',
        sentenceJa: '',
        sentenceJaUnderline: '',
        descriptionVi: ''
    }
};

const GrammarPointsScreen = ({ isAdmin, profile = null }) => {
    const { textbookId, lessonId } = useParams();
    const navigate = useNavigate();
    const [textbook, setTextbook] = useState(null);
    const [lesson, setLesson] = useState(null);
    const [points, setPoints] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonText, setJsonText] = useState('');
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');
    const [copied, setCopied] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    
    // Image uploading state for single visual
    const [uploadingState, setUploadingState] = useState(false);

    useEffect(() => {
        const u1 = subscribeTextbooks(tbs => setTextbook(tbs.find(t => t.id === textbookId)), isAdmin);
        const u2 = subscribeLessons(textbookId, ls => setLesson(ls.find(l => l.id === lessonId)), isAdmin);
        const u3 = subscribeGrammarPoints(textbookId, lessonId, setPoints, isAdmin);
        return () => { u1?.(); u2?.(); u3?.(); };
    }, [textbookId, lessonId, isAdmin]);

    useEffect(() => {
        if (lesson && profile) {
            const userIsAdmin = profile?.email && ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(profile.email);
            const isLocked = lesson.isPremium && !userIsAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('grammar_zen');
            if (isLocked) {
                navigate(`/grammar/textbook/${textbookId}`);
            }
        }
    }, [lesson, profile, textbookId, navigate]);

    // Parse helpers: admin inputs simple text, we convert to arrays
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
    const parseTips = (raw) => raw ? raw.split('\n').filter(Boolean).map(l => ({ icon: '💡', text: l.trim() })) : [];
    const parseExamples = (raw) => {
        if (!raw) return [];
        const lines = raw.split('\n').filter(Boolean);
        const exs = [];
        for (let i = 0; i < lines.length; i += 2) {
            exs.push({ ja: lines[i]?.trim() || '', vi: lines[i + 1]?.trim() || '' });
        }
        return exs;
    };

    // Reverse: convert structured data to raw text for editing
    const toStructureRaw = (arr) => arr ? arr.map(s => s.type === 'highlight' ? `*${s.text}` : s.text).join(' + ') : '';
    const toTipsRaw = (arr) => arr ? arr.map(t => t.text).join('\n') : '';
    const toExamplesRaw = (arr) => arr ? arr.map(e => `${e.ja}\n${e.vi}`).join('\n') : '';

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
                setForm(f => ({
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

    const handleSave = async () => {
        setSaving(true);
        const data = {
            pattern: form.pattern.trim(), 
            meaningShort: form.meaningShort.trim(), 
            meaningFull: form.meaningFull.trim(),
            structure: parseStructure(form.structureRaw), 
            tips: parseTips(form.tipsRaw),
            examples: parseExamples(form.examplesRaw),
            visual: {
                active: !!(form.visual.image.trim() || form.visual.sentenceJa.trim()),
                title: form.visual.title.trim() || "Học Ngữ pháp Trực quan Zen",
                imageLabel: form.visual.imageLabel.trim(),
                image: form.visual.image.trim(),
                sentenceJa: form.visual.sentenceJa.trim(),
                sentenceJaUnderline: form.visual.sentenceJaUnderline.trim(),
                descriptionVi: form.visual.descriptionVi.trim()
            }
        };

        if (editId) {
            const original = points.find(p => p.id === editId);
            data.exercises = original?.exercises || [];
            data.quizzes = original?.quizzes || [];
            await updateGrammarPoint(textbookId, lessonId, editId, data);
        } else {
            data.exercises = [];
            data.quizzes = [];
            await addGrammarPoint(textbookId, lessonId, data, 'admin');
        }
        setShowAdd(false); 
        setEditId(null);
        setForm(EMPTY_FORM);
        setSaving(false);
    };

    const handleJsonImportSubmit = async () => {
        setSaving(true);
        setImportError('');
        setImportSuccess('');
        try {
            const parsed = JSON.parse(jsonText);
            if (!Array.isArray(parsed)) {
                throw new Error("Dữ liệu JSON phải là một Danh sách các Ngữ pháp (Array).");
            }
            const res = await importGrammarPointsFromJson(textbookId, lessonId, parsed, 'admin');
            if (res.success) {
                setImportSuccess(`Nhập ngữ pháp thành công! Đã thêm ${res.count} cấu trúc.`);
                setJsonText('');
                setTimeout(() => setShowJsonImport(false), 2000);
            } else {
                setImportError(res.error || "Có lỗi xảy ra khi lưu vào Firestore.");
            }
        } catch (e) {
            setImportError(`JSON không hợp lệ: ${e.message}`);
        }
        setSaving(false);
    };

    const handleCopySample = () => {
        navigator.clipboard.writeText(SAMPLE_POINTS_JSON);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEdit = (gp) => {
        setForm({
            pattern: gp.pattern || '', 
            meaningShort: gp.meaningShort || '', 
            meaningFull: gp.meaningFull || '',
            structureRaw: toStructureRaw(gp.structure), 
            tipsRaw: toTipsRaw(gp.tips),
            examplesRaw: toExamplesRaw(gp.examples),
            visual: gp.visual ? {
                title: gp.visual.title || '',
                imageLabel: gp.visual.imageLabel || gp.visual.themeRight || gp.visual.themeLeft || '',
                image: gp.visual.image || gp.visual.rightImage || gp.visual.leftImage || '',
                sentenceJa: gp.visual.sentenceJa || '',
                sentenceJaUnderline: gp.visual.sentenceJaUnderline || '',
                descriptionVi: gp.visual.descriptionVi || ''
            } : EMPTY_FORM.visual
        });
        setEditId(gp.id); 
        setShowAdd(true); 
        setShowJsonImport(false);
    };

    if (!textbook || !lesson) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in px-4 md:px-0">
            <div>
                <button onClick={() => navigate(`/grammar/textbook/${textbookId}`)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mb-3">
                    <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
                </button>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">{textbook.title || textbook.titleVi} - {lesson.sectionLabel}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{lesson.title} • {lesson.meaning}</p>
            </div>

            {isAdmin && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setShowAdd(true); setShowJsonImport(false); setEditId(null); setForm(EMPTY_FORM); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
                        <Plus className="w-4 h-4" /> Thêm mẫu ngữ pháp
                    </button>
                    <button onClick={() => { setShowJsonImport(true); setShowAdd(false); setImportError(''); setImportSuccess(''); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                        <FileJson className="w-4 h-4 text-indigo-500" /> Nhập bằng JSON
                    </button>
                </div>
            )}

            {showAdd && isAdmin && (
                <div className="bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-3xl p-6 space-y-4 shadow-sm w-full">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{editId ? 'Sửa ngữ pháp' : 'Thêm ngữ pháp'}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Mẫu ngữ pháp</label>
                            <input placeholder="Mẫu (VD: 〜際(に))" value={form.pattern} onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Nghĩa ngắn</label>
                            <input placeholder="Nghĩa ngắn (VD: Nhân dịp / Khi)" value={form.meaningShort} onChange={e => setForm(f => ({ ...f, meaningShort: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Giải thích chi tiết (GIẢI THÍCH)</label>
                        <textarea placeholder="Giải thích chi tiết..." value={form.meaningFull} onChange={e => setForm(f => ({ ...f, meaningFull: e.target.value }))} rows={2}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Cấu trúc (dùng + ngăn cách, *đọc highlight): VD: V-た + *際(ni) + N-no</label>
                        <input value={form.structureRaw} onChange={e => setForm(f => ({ ...f, structureRaw: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-mono" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Lưu ý (mỗi dòng 1 lưu ý)</label>
                        <textarea value={form.tipsRaw} onChange={e => setForm(f => ({ ...f, tipsRaw: e.target.value }))} rows={3}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Ví dụ (dòng lẻ: tiếng Nhật, dòng chẵn: tiếng Việt)</label>
                        <textarea value={form.examplesRaw} onChange={e => setForm(f => ({ ...f, examplesRaw: e.target.value }))} rows={4}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none font-sans" />
                    </div>

                    {/* Zen Visual Grammar Card integrated directly */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6 space-y-4 w-full">
                        <h3 className="text-base font-bold text-slate-855 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" /> Giao diện trực quan (Zen Visual Grammar)
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 w-full">

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Đường dẫn ảnh minh hoạ</label>
                                <input 
                                    value={form.visual.image} 
                                    onChange={e => setForm(f => ({ ...f, visual: { ...f.visual, image: e.target.value } }))}
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
                                        {form.visual.image && (
                                            <img src={form.visual.image} alt="preview" className="max-h-24 mx-auto object-contain rounded border border-slate-200 shadow-sm" />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nghĩa tiếng Việt giải thích cho ảnh</label>
                                <textarea 
                                    value={form.visual.descriptionVi} 
                                    onChange={e => setForm(f => ({ ...f, visual: { ...f.visual, descriptionVi: e.target.value } }))}
                                    placeholder="VD: Sau một hồi chạy thục mạng, cuối cùng tôi lại bị lỡ chuyến xe buýt."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Câu tiếng Nhật minh hoạ</label>
                                <input 
                                    value={form.visual.sentenceJa} 
                                    onChange={e => setForm(f => ({ ...f, visual: { ...f.visual, sentenceJa: e.target.value } }))}
                                    placeholder="VD: 必死で走ったあげく、バスに乗り遅れてしまった。"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2 shrink-0">
                        <button onClick={handleSave} disabled={saving || !form.pattern} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all hover:bg-indigo-700"><Save className="w-4 h-4" /> Lưu ngữ pháp</button>
                        <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all hover:bg-slate-200">Huỷ</button>
                    </div>
                </div>
            )}

            {/* Admin: JSON Import Panel */}
            {showJsonImport && isAdmin && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm w-full">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileJson className="w-5 h-5 text-indigo-500" /> Nhập cấu trúc Ngữ pháp hàng loạt từ JSON
                        </h3>
                        <button onClick={() => handleCopySample()} className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold rounded-lg transition-all border border-transparent hover:border-indigo-200">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                            {copied ? 'Đã sao chép mẫu!' : 'Copy JSON mẫu'}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                        Nhập danh sách ngữ pháp cho bài học này. Cấu trúc JSON gồm: <code>pattern</code>, <code>meaningShort</code>, <code>meaningFull</code>, <code>structureRaw</code>, <code>tipsRaw</code>, <code>examplesRaw</code>, <code>exercises</code> (mảng Đặt câu), và <code>quizzes</code> (mảng Trắc nghiệm).
                    </p>

                    <textarea placeholder="Paste chuỗi JSON ngữ pháp vào đây..." value={jsonText} onChange={e => setJsonText(e.target.value)} rows={8}
                        className="w-full font-mono text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none resize-y" />

                    {importError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-600 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{importError}</span>
                        </div>
                    )}

                    {importSuccess && (
                        <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-600 font-medium">
                            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                            <span>{importSuccess}</span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={handleJsonImportSubmit} disabled={saving || !jsonText.trim()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? 'Đang nhập...' : 'Nhập ngữ pháp'}
                        </button>
                        <button onClick={() => setShowJsonImport(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-200">
                            Huỷ
                        </button>
                    </div>
                </div>
            )}

            {points.length === 0 && <p className="text-center text-slate-400 py-12">Chưa có mẫu ngữ pháp nào. {isAdmin ? 'Nhấn "Thêm mẫu ngữ pháp" hoặc "Nhập bằng JSON" để bắt đầu.' : ''}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {points.map(gp => (
                    <div key={gp.id} className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 min-w-0 w-full">
                        <button onClick={() => navigate(`/grammar/detail/${gp.id}?tb=${textbookId}&ls=${lessonId}`)} className="w-full text-left">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white pr-16 break-all">{gp.pattern}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 break-all">{gp.meaningShort}</p>
                        </button>
                        <div className="absolute top-3 right-3 flex items-center gap-1 shrink-0">
                            {isAdmin && (
                                <>
                                    <button onClick={() => handleEdit(gp)} className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5 text-indigo-600" /></button>
                                    <button onClick={async () => { if (await window.showConfirm('Xoá?', { type: 'danger' })) deleteGrammarPoint(textbookId, lessonId, gp.id); }} className="p-1.5 rounded-lg hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                                </>
                            )}
                            <button onClick={() => navigate(`/grammar/practice/${gp.id}?tb=${textbookId}&ls=${lessonId}`)} className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition-colors" title="Làm bài tập"><PenTool className="w-4 h-4" /></button>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GrammarPointsScreen;
