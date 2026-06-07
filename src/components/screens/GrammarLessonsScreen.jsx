import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Save, ChevronRight, FileJson, Clipboard, Check, AlertCircle, Crown } from 'lucide-react'
import { subscribeTextbooks, subscribeLessons, addLesson, updateLesson, deleteLesson, importLessonsFromJson } from '../../utils/grammarService';
import { PremiumLockedModal } from '../ui';

const SAMPLE_LESSONS_JSON = `[
  {
    "sectionLabel": "第1部 1課",
    "title": "〜とき・〜直後に",
    "meaning": "Thời điểm / Ngay sau khi"
  },
  {
    "sectionLabel": "第1部 2課",
    "title": "〜関係・〜にともなって",
    "meaning": "Liên quan / Đồng hành cùng"
  }
]`;

const GrammarLessonsScreen = ({ isAdmin, profile = null }) => {
    const { textbookId } = useParams();
    const navigate = useNavigate();
    const [textbook, setTextbook] = useState(null);
    const [lessons, setLessons] = useState([]);
    
    // Premium locked states
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [lockedPkgName, setLockedPkgName] = useState('Ngữ pháp chuyên sâu Zen');
    const [showAdd, setShowAdd] = useState(false);
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonText, setJsonText] = useState('');
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');
    const [copied, setCopied] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ sectionLabel: '', title: '', meaning: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsub1 = subscribeTextbooks(tbs => { setTextbook(tbs.find(t => t.id === textbookId) || null); });
        const unsub2 = subscribeLessons(textbookId, setLessons);
        return () => { unsub1 && unsub1(); unsub2 && unsub2(); };
    }, [textbookId]);

    const handleSave = async () => {
        setSaving(true);
        if (editId) await updateLesson(textbookId, editId, form);
        else await addLesson(textbookId, form, 'admin');
        setShowAdd(false); setEditId(null); setForm({ sectionLabel: '', title: '', meaning: '' });
        setSaving(false);
    };

    const handleJsonImportSubmit = async () => {
        setSaving(true);
        setImportError('');
        setImportSuccess('');
        try {
            const parsed = JSON.parse(jsonText);
            if (!Array.isArray(parsed)) {
                throw new Error("Dữ liệu JSON phải là một Danh sách các Bài học (Array).");
            }
            const res = await importLessonsFromJson(textbookId, parsed, 'admin');
            if (res.success) {
                setImportSuccess(`Nhập bài học thành công! Đã thêm ${res.count} bài học.`);
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
        navigator.clipboard.writeText(SAMPLE_LESSONS_JSON);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEdit = (l) => { setForm({ sectionLabel: l.sectionLabel || '', title: l.title || '', meaning: l.meaning || '' }); setEditId(l.id); setShowAdd(true); setShowJsonImport(false); };
    const handleDelete = async (id) => { if (window.confirm('Xoá bài học này?')) await deleteLesson(textbookId, id); };
    const handleToggleLessonPremium = async (lesson) => {
        try {
            await updateLesson(textbookId, lesson.id, {
                isPremium: !lesson.isPremium
            });
        } catch (error) {
            console.error("Error updating lesson premium status: ", error);
        }
    };

    if (!textbook) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div>
                <button onClick={() => navigate('/grammar')} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mb-3">
                    <ArrowLeft className="w-3.5 h-3.5" /> Ngữ pháp
                </button>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {(textbook.levels || []).map(lvl => <span key={lvl} className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{lvl}</span>)}
                </div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">{textbook.title || textbook.titleVi}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{lessons.length} bài học</p>
            </div>

            {isAdmin && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setShowAdd(true); setShowJsonImport(false); setEditId(null); setForm({ sectionLabel: '', title: '', meaning: '' }); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
                        <Plus className="w-4 h-4" /> Thêm bài học
                    </button>
                    <button onClick={() => { setShowJsonImport(true); setShowAdd(false); setImportError(''); setImportSuccess(''); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                        <FileJson className="w-4 h-4 text-indigo-500" /> Nhập bằng JSON
                    </button>
                </div>
            )}

            {showAdd && isAdmin && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
                    <h3 className="font-bold text-slate-800 dark:text-white">{editId ? 'Sửa bài học' : 'Thêm bài học'}</h3>
                    <input placeholder="Nhãn phần (VD: 第1部 1課)" value={form.sectionLabel} onChange={e => setForm(f => ({ ...f, sectionLabel: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none" />
                    <input placeholder="Tiêu đề (VD: 〜とき・〜直後に)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none" />
                    <input placeholder="Ý nghĩa (VD: Thời điểm • Ngay sau khi)" value={form.meaning} onChange={e => setForm(f => ({ ...f, meaning: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none" />
                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={saving || !form.title} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Save className="w-4 h-4" /> Lưu</button>
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg">Huỷ</button>
                    </div>
                </div>
            )}

            {/* Admin: JSON Import Panel */}
            {showJsonImport && isAdmin && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileJson className="w-5 h-5 text-indigo-500" /> Nhập bài học hàng loạt từ JSON
                        </h3>
                        <button onClick={() => handleCopySample()} className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold rounded-lg transition-all border border-transparent hover:border-indigo-200">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                            {copied ? 'Đã sao chép mẫu!' : 'Copy JSON mẫu'}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                        Nhập danh sách bài học cho giáo trình này. Định dạng mẫu gồm các trường: <code>sectionLabel</code> (Ví dụ: 第1部 1課), <code>title</code>, và <code>meaning</code>.
                    </p>

                    <textarea placeholder="Paste chuỗi JSON bài học vào đây..." value={jsonText} onChange={e => setJsonText(e.target.value)} rows={8}
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
                            {saving ? 'Đang nhập...' : 'Nhập bài học'}
                        </button>
                        <button onClick={() => setShowJsonImport(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-200">
                            Huỷ
                        </button>
                    </div>
                </div>
            )}

            {lessons.length === 0 && <p className="text-center text-slate-400 py-12">Chưa có bài học nào. {isAdmin ? 'Nhấn "Thêm bài học" hoặc "Nhập bằng JSON" để bắt đầu.' : ''}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lessons.map(lesson => {
                    const isLocked = lesson.isPremium && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('grammar_zen');
                    const handleLessonClick = () => {
                        if (isLocked) {
                            setLockedPkgName('Ngữ pháp chuyên sâu Zen');
                            setShowPremiumModal(true);
                        } else {
                            navigate(`/grammar/textbook/${textbookId}/lesson/${lesson.id}`);
                        }
                    };
                    return (
                        <div key={lesson.id} className="group relative text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <button onClick={handleLessonClick} className="w-full text-left">
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lesson.sectionLabel}</p>
                                    {lesson.isPremium && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-black tracking-widest text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 rounded-full uppercase">
                                            <Crown className="w-2.5 h-2.5 fill-current" /> Premium
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mt-1 pr-16 flex items-center gap-1.5">
                                    {lesson.title}
                                    {isLocked && <span className="text-sm">🔒</span>}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{lesson.meaning}</p>
                            </button>
                            <div className="absolute top-3 right-3 flex items-center gap-1">
                                {isAdmin && (
                                    <>
                                        <button 
                                            onClick={() => handleToggleLessonPremium(lesson)} 
                                            className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                                            title={lesson.isPremium ? "Đặt làm bài học miễn phí" : "Đặt làm bài học Premium"}
                                        >
                                            {lesson.isPremium ? (
                                                <span className="flex items-center gap-0.5 text-xs text-amber-500 font-bold">
                                                    <Crown className="w-3.5 h-3.5 fill-current" /> Premium
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-bold">🔓 Free</span>
                                            )}
                                        </button>
                                        <button onClick={() => handleEdit(lesson)} className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5 text-indigo-600" /></button>
                                        <button onClick={() => handleDelete(lesson.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                                    </>
                                )}
                                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Premium Locked Modal */}
            <PremiumLockedModal 
                isOpen={showPremiumModal} 
                onClose={() => setShowPremiumModal(false)} 
                pkgName={lockedPkgName} 
            />
        </div>
    );
};

export default GrammarLessonsScreen;
