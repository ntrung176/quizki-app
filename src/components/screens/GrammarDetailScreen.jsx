import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Lightbulb, PenTool, Layers, Settings, Save, Trash2, Plus, X } from 'lucide-react';
import { fetchGrammarPointById, updateGrammarPoint } from '../../utils/grammarService';

const GrammarDetailScreen = ({ isAdmin }) => {
    const { grammarId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [gp, setGp] = useState(null);
    const [loading, setLoading] = useState(true);
    const tb = searchParams.get('tb');
    const ls = searchParams.get('ls');

    // Admin editing states
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        pattern: '',
        meaningShort: '',
        meaningFull: '',
        structureRaw: '',
        tips: [],
        examples: []
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const data = await fetchGrammarPointById(grammarId);
            setGp(data);
            setLoading(false);
        })();
    }, [grammarId]);

    // Populate edit form when edit mode is toggled or gp changes
    useEffect(() => {
        if (gp) {
            setEditForm({
                pattern: gp.pattern || '',
                meaningShort: gp.meaningShort || '',
                meaningFull: gp.meaningFull || '',
                structureRaw: gp.structure ? gp.structure.map(s => s.type === 'highlight' ? `*${s.text}` : s.text).join(' + ') : '',
                tips: gp.tips ? [...gp.tips] : [],
                examples: gp.examples ? [...gp.examples] : []
            });
        }
    }, [gp, isEditing]);

    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;
    if (!gp) return <div className="p-8 text-center text-slate-500">Không tìm thấy ngữ pháp.</div>;

    const backUrl = (tb && ls) ? `/grammar/textbook/${tb}/lesson/${ls}` : '/grammar';
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

    const handleSaveDetail = async () => {
        setSaving(true);
        const updatedData = {
            ...gp,
            pattern: editForm.pattern.trim(),
            meaningShort: editForm.meaningShort.trim(),
            meaningFull: editForm.meaningFull.trim(),
            structure: parseStructure(editForm.structureRaw),
            tips: editForm.tips.map(t => ({ ...t, text: t.text.trim() })).filter(t => t.text),
            examples: editForm.examples.map(ex => ({ ja: ex.ja.trim(), vi: ex.vi.trim() })).filter(ex => ex.ja || ex.vi)
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

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <button onClick={() => navigate(backUrl)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mb-3">
                        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại mẫu ngữ pháp
                    </button>
                    {gp.textbook && <p className="text-xs text-slate-400 mb-1">{gp.textbook.title || gp.textbook.titleVi} • {gp.lesson?.sectionLabel} {gp.lesson?.title}</p>}
                    
                    {isEditing ? (
                        <div className="space-y-2 mt-2">
                            <input value={editForm.pattern} onChange={e => setEditForm(f => ({ ...f, pattern: e.target.value }))}
                                placeholder="Mẫu ngữ pháp (VD: 〜際(に))"
                                className="text-2xl font-black px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none w-full" />
                            <input value={editForm.meaningShort} onChange={e => setEditForm(f => ({ ...f, meaningShort: e.target.value }))}
                                placeholder="Ý nghĩa ngắn (VD: Nhân dịp / Khi)"
                                className="text-sm px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none w-full mt-1" />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white">{gp.pattern}</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{gp.meaningShort}</p>
                        </>
                    )}

                    {!isEditing && totalExercises > 0 && (
                        <button onClick={() => navigate(`/grammar/practice/${grammarId}?tb=${tb || gp.textbookId}&ls=${ls || gp.lessonId}`)}
                            className="mt-3 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-all">
                            <Layers className="w-4 h-4" /> Bài tập: {gp.exercises?.length || 0} Đặt câu • {gp.quizzes?.length || 0} Trắc nghiệm
                        </button>
                    )}
                </div>

                {isAdmin && (
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button onClick={handleSaveDetail} disabled={saving}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                                    <Save className="w-3.5 h-3.5" /> Lưu ngữ pháp
                                </button>
                                <button onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1">
                                    <X className="w-3.5 h-3.5" /> Huỷ
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                                <Settings className="w-3.5 h-3.5" /> Sửa ngữ pháp
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* Structure card */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Cấu trúc (Structure)</h2>
                        
                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Chuỗi cấu trúc (Cách nhau bởi dấu +, dùng * để highlight)</label>
                                    <input value={editForm.structureRaw} onChange={e => setEditForm(f => ({ ...f, structureRaw: e.target.value }))}
                                        placeholder="VD: V-ta + *際(ni) + N-no"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none font-medium" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Giải thích chi tiết</label>
                                    <textarea value={editForm.meaningFull} onChange={e => setEditForm(f => ({ ...f, meaningFull: e.target.value }))}
                                        placeholder="Ý nghĩa và cách sử dụng chi tiết..." rows={3}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none resize-none" />
                                </div>
                            </div>
                        ) : (
                            <>
                                {gp.structure?.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {gp.structure.map((s, i) => (
                                            <span key={i} className={`px-3 py-2 rounded-xl text-sm font-bold ${s.type === 'highlight' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-2 border-indigo-300 dark:border-indigo-600' : s.type === 'connector' ? 'text-slate-400 text-lg' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{s.text}</span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 leading-relaxed whitespace-pre-wrap">{gp.meaningFull}</p>
                            </>
                        )}
                    </div>

                    {/* Examples card */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ví dụ (Examples)</h2>
                            {isEditing && (
                                <button onClick={handleAddExample} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Thêm ví dụ
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-4">
                                {editForm.examples.map((ex, i) => (
                                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl relative space-y-2 border border-slate-200 dark:border-slate-800">
                                        <button onClick={() => handleRemoveExample(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Tiếng Nhật</label>
                                            <input value={ex.ja} onChange={e => {
                                                const newExs = [...editForm.examples];
                                                newExs[i].ja = e.target.value;
                                                setEditForm(f => ({ ...f, examples: newExs }));
                                            }} placeholder="Nhập câu tiếng Nhật..."
                                                className="w-full px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Tiếng Việt</label>
                                            <input value={ex.vi} onChange={e => {
                                                const newExs = [...editForm.examples];
                                                newExs[i].vi = e.target.value;
                                                setEditForm(f => ({ ...f, examples: newExs }));
                                            }} placeholder="Nhập bản dịch tiếng Việt..."
                                                className="w-full px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none" />
                                        </div>
                                    </div>
                                ))}
                                {editForm.examples.length === 0 && <p className="text-center text-xs text-slate-400 py-4">Chưa có ví dụ nào.</p>}
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {gp.examples?.map((ex, i) => (
                                    <div key={i} className="border-l-4 border-indigo-400 dark:border-indigo-600 pl-4">
                                        <p className="text-base font-bold text-slate-800 dark:text-white leading-relaxed">{ex.ja}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">{ex.vi}</p>
                                    </div>
                                ))}
                                {(!gp.examples || gp.examples.length === 0) && <p className="text-center text-xs text-slate-400 py-4">Chưa có ví dụ nào.</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Tips / Explanations card */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" /> Giải thích & Lưu ý
                            </h2>
                            {isEditing && (
                                <button onClick={handleAddTip} className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Thêm lưu ý
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-3">
                                {editForm.tips.map((tip, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input value={tip.icon} onChange={e => {
                                            const newTips = [...editForm.tips];
                                            newTips[i].icon = e.target.value;
                                            setEditForm(f => ({ ...f, tips: newTips }));
                                        }} className="w-10 px-2 py-1 text-center bg-white dark:bg-slate-800 border rounded outline-none text-sm" placeholder="💡" />
                                        <input value={tip.text} onChange={e => {
                                            const newTips = [...editForm.tips];
                                            newTips[i].text = e.target.value;
                                            setEditForm(f => ({ ...f, tips: newTips }));
                                        }} className="flex-1 px-3 py-1 bg-white dark:bg-slate-800 border rounded outline-none text-sm" placeholder="Nhập lưu ý..." />
                                        <button onClick={() => handleRemoveTip(i)} className="text-slate-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {editForm.tips.length === 0 && <p className="text-center text-xs text-amber-600/60 py-4 font-medium">Chưa có lưu ý nào.</p>}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {gp.tips?.map((tip, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="text-base shrink-0 mt-0.5">{tip.icon || '💡'}</span>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{tip.text}</p>
                                    </div>
                                ))}
                                {(!gp.tips || gp.tips.length === 0) && <p className="text-center text-xs text-amber-600/60 py-4 font-medium">Chưa có lưu ý nào.</p>}
                            </div>
                        )}
                    </div>

                    {/* Quick Practice card */}
                    {!isEditing && totalExercises > 0 && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-6">
                            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"><PenTool className="w-4 h-4" /> Luyện tập bài tập</h2>
                            <div className="space-y-2 mb-4">
                                {gp.exercises?.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white">Đặt câu dịch thuật</p>
                                            <p className="text-[10px] text-slate-400">Dịch từ tiếng Việt sang tiếng Nhật</p>
                                        </div>
                                        <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 rounded">{gp.exercises.length} câu</span>
                                    </div>
                                )}
                                {gp.quizzes?.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white">Trắc nghiệm chọn từ</p>
                                            <p className="text-[10px] text-slate-400">Chọn phương án đúng điền vào chỗ trống</p>
                                        </div>
                                        <span className="px-2 py-0.5 text-xs font-bold bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 rounded">{gp.quizzes.length} câu</span>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => navigate(`/grammar/practice/${grammarId}?tb=${tb || gp.textbookId}&ls=${ls || gp.lessonId}`)}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                                <Play className="w-4 h-4" /> Luyện tập ngay
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GrammarDetailScreen;
