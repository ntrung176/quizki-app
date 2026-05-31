import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, Plus, Trash2, Edit2, Save, X, FileJson, Clipboard, Check, AlertCircle, ChevronRight } from 'lucide-react';
import { GRAMMAR_CATEGORIES } from '../../data/grammarData';
import { subscribeTextbooks, addTextbook, updateTextbook, deleteTextbook, importTextbooksFromJson } from '../../utils/grammarService';

const SAMPLE_TEXTBOOKS_JSON = `[
  {
    "title": "新完全マスター 文法 N2",
    "titleVi": "Shin Kanzen Master N2",
    "description": "Giáo trình ngữ pháp N2 chuyên sâu cho kỳ thi JLPT",
    "levels": ["N2"],
    "category": "jlpt",
    "featured": true,
    "color": "#6366f1"
  },
  {
    "title": "新完全マスター 文法 N3",
    "titleVi": "Shin Kanzen Master N3",
    "description": "Giáo trình ngữ pháp N3 chuyên sâu cho kỳ thi JLPT",
    "levels": ["N3"],
    "category": "jlpt",
    "featured": false,
    "color": "#10b981"
  }
]`;

const TextbookCover = ({ title, titleVi, levels, description, color, featured }) => {
    const primaryColor = color || '#10b981';
    const levelText = (levels && levels.length > 0) ? levels.join(', ') : 'N3';

    return (
        <div 
            className="w-full aspect-[16/10] relative overflow-hidden flex flex-col justify-between p-5 text-white select-none rounded-2xl transition-all duration-350 shadow-md"
            style={{ 
                backgroundColor: primaryColor,
                backgroundImage: 'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.18) 0%, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.22) 100%)'
            }}
        >
            {/* Shimmer gloss sweep effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full z-10 shimmer-sweep pointer-events-none" />

            {/* Inner elegant frame border */}
            <div className="absolute inset-3 border border-white/10 rounded-xl pointer-events-none z-0" />

            {/* Featured star badge */}
            {featured && (
                <div className="absolute top-5 right-5 bg-amber-500/25 backdrop-blur-md border border-amber-400/30 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase z-20 flex items-center gap-0.5">
                    <span>★</span>
                    <span>Nổi bật</span>
                </div>
            )}

            {/* Content Container */}
            <div className="flex flex-col h-full justify-between relative z-10 py-1.5">
                {/* Top: Japanese Title */}
                <div className="text-center">
                    <p className="text-[9px] uppercase tracking-widest font-black text-white/50">
                        Ngữ pháp • Grammar
                    </p>
                    <h4 className="text-[11px] font-bold text-white/80 line-clamp-1 mt-1 tracking-wide leading-relaxed px-2">
                        {title || '日本語'}
                    </h4>
                </div>

                {/* Middle: Level Badge & Vietnamese Title */}
                <div className="text-center my-auto flex flex-col items-center justify-center">
                    {/* Level stamp */}
                    <div className="px-4 py-1 rounded-xl bg-white/10 border border-white/25 backdrop-blur-md shadow-inner inline-block mb-2.5 font-black text-3xl tracking-widest text-center min-w-[4rem]">
                        {levelText}
                    </div>
                    {/* Vietnamese Title */}
                    <h3 className="text-base font-extrabold tracking-tight text-white leading-snug line-clamp-2 px-2">
                        {titleVi || 'Giáo trình'}
                    </h3>
                </div>

                {/* Bottom: Description */}
                <div className="text-center mt-auto">
                    <p className="text-[10px] text-white/70 line-clamp-2 leading-relaxed px-2 font-medium">
                        {description || 'Tài liệu ôn thi năng lực Nhật ngữ chất lượng cao'}
                    </p>
                </div>
            </div>
        </div>
    );
};

const GrammarTextbooksScreen = ({ isAdmin }) => {
    const navigate = useNavigate();
    const [textbooks, setTextbooks] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonText, setJsonText] = useState('');
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');
    const [copied, setCopied] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ title: '', titleVi: '', description: '', levels: '', category: 'jlpt', featured: false, color: '#10b981' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsub = subscribeTextbooks(setTextbooks);
        return () => unsub && unsub();
    }, []);

    const filtered = useMemo(() => {
        let list = textbooks;
        if (activeCategory !== 'all') list = list.filter(t => t.category === activeCategory);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(t => (t.title || '').toLowerCase().includes(q) || (t.titleVi || '').toLowerCase().includes(q));
        }
        return list;
    }, [textbooks, activeCategory, searchQuery]);

    const handleSave = async () => {
        setSaving(true);
        const data = { 
            ...form, 
            levels: form.levels.split(',').map(s => s.trim()).filter(Boolean),
            color: form.color || '#10b981'
        };
        if (editId) {
            await updateTextbook(editId, data);
        } else {
            await addTextbook(data, 'admin');
        }
        setShowAdd(false); setEditId(null);
        setForm({ title: '', titleVi: '', description: '', levels: '', category: 'jlpt', featured: false, color: '#10b981' });
        setSaving(false);
    };

    const handleJsonImportSubmit = async () => {
        setSaving(true);
        setImportError('');
        setImportSuccess('');
        try {
            const parsed = JSON.parse(jsonText);
            if (!Array.isArray(parsed)) {
                throw new Error("Dữ liệu JSON gốc phải là một Danh sách các Giáo trình (Array).");
            }
            const res = await importTextbooksFromJson(parsed, 'admin');
            if (res.success) {
                setImportSuccess(`Nhập dữ liệu thành công! Đã thêm ${res.count} giáo trình.`);
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
        navigator.clipboard.writeText(SAMPLE_TEXTBOOKS_JSON);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEdit = (tb) => {
        setForm({ title: tb.title || '', titleVi: tb.titleVi || '', description: tb.description || '', levels: (tb.levels || []).join(', '), category: tb.category || 'jlpt', featured: tb.featured || false, color: tb.color || '#10b981' });
        setEditId(tb.id); setShowAdd(true); setShowJsonImport(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Xoá giáo trình này và tất cả bài học bên trong?')) await deleteTextbook(id);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <style>{`
                @keyframes shimmer-effect {
                    0% { transform: translateX(-100%) skewX(-15deg); }
                    100% { transform: translateX(100%) skewX(-15deg); }
                }
                .shimmer-sweep {
                    transform: translateX(-100%) skewX(-15deg);
                    width: 50%;
                }
                .group:hover .shimmer-sweep {
                    animation: shimmer-effect 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
            <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Curriculum / Grammar</p>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">Chọn giáo trình Ngữ pháp</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">Khám phá các lộ trình học tập từ cơ bản đến nâng cao hoặc quản lý tài liệu.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex flex-wrap gap-2">
                    {GRAMMAR_CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                            className={`px-4 py-2 text-xs font-bold rounded-full border transition-all ${activeCategory === cat.id ? 'bg-slate-700 text-white border-slate-700 dark:bg-indigo-600 dark:border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                            {cat.label}
                        </button>
                    ))}
                </div>
                <div className="relative ml-auto w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm giáo trình..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white" />
                </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setShowAdd(true); setShowJsonImport(false); setEditId(null); setForm({ title: '', titleVi: '', description: '', levels: '', category: 'jlpt', featured: false, color: '#10b981' }); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
                        <Plus className="w-4 h-4" /> Thêm giáo trình
                    </button>
                    <button onClick={() => { setShowJsonImport(true); setShowAdd(false); setImportError(''); setImportSuccess(''); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                        <FileJson className="w-4 h-4 text-indigo-500" /> Nhập bằng JSON
                    </button>
                </div>
            )}

            {/* Admin: Add/Edit Form */}
            {showAdd && isAdmin && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
                    <h3 className="font-bold text-slate-800 dark:text-white">{editId ? 'Sửa giáo trình' : 'Thêm giáo trình mới'}</h3>
                    <input placeholder="Tên tiếng Nhật (VD: 新完全マスター)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none" />
                    <input placeholder="Tên tiếng Việt" value={form.titleVi} onChange={e => setForm(f => ({ ...f, titleVi: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none" />
                    <textarea placeholder="Mô tả" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none resize-none" />
                    <input placeholder="Cấp độ (VD: N2, N3)" value={form.levels} onChange={e => setForm(f => ({ ...f, levels: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none" />
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none">
                        {GRAMMAR_CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <div className="space-y-2 py-1">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Màu sắc hiển thị (Thumbnail)</span>
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { name: 'Xanh ngọc', value: '#10b981' },
                                { name: 'Xanh lục', value: '#0d9488' },
                                { name: 'Classic Blue', value: '#3b82f6' },
                                { name: 'Indigo', value: '#6366f1' },
                                { name: 'Tím', value: '#8b5cf6' },
                                { name: 'Hồng cánh sen', value: '#ec4899' },
                                { name: 'Đỏ hồng', value: '#f43f5e' },
                                { name: 'Đỏ đậm', value: '#be123c' },
                                { name: 'Vàng cam', value: '#f59e0b' },
                                { name: 'Xám đậm', value: '#475569' }
                            ].map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, color: p.value }))}
                                    style={{ backgroundColor: p.value }}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                                        (form.color || '#10b981') === p.value 
                                            ? 'border-slate-800 dark:border-white scale-110 shadow-md shadow-slate-300 dark:shadow-none' 
                                            : 'border-transparent hover:scale-105'
                                    }`}
                                    title={p.name}
                                />
                            ))}
                            <div className="relative flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                                <input 
                                    type="color" 
                                    value={form.color || '#10b981'} 
                                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                    className="w-7 h-7 rounded cursor-pointer border border-slate-200 dark:border-slate-700 p-0 overflow-hidden" 
                                />
                                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase select-all">{form.color || '#10b981'}</span>
                            </div>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} /> Giáo trình nổi bật
                    </label>
                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={saving || !form.titleVi} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                            <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-200">
                            Huỷ
                        </button>
                    </div>
                </div>
            )}

            {/* Admin: JSON Import Panel */}
            {showJsonImport && isAdmin && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileJson className="w-5 h-5 text-indigo-500" /> Nhập giáo trình hàng loạt từ JSON
                        </h3>
                        <button onClick={() => handleCopySample()} className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold rounded-lg transition-all border border-transparent hover:border-indigo-200">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                            {copied ? 'Đã sao chép mẫu!' : 'Copy JSON mẫu'}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                        Nhập danh sách giáo trình. Định dạng mẫu gồm các trường: <code>title</code>, <code>titleVi</code>, <code>description</code>, <code>levels</code> (mảng), <code>category</code>, <code>featured</code>.
                    </p>

                    <textarea placeholder="Paste chuỗi JSON của bạn vào đây..." value={jsonText} onChange={e => setJsonText(e.target.value)} rows={8}
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
                            {saving ? 'Đang nhập...' : 'Nhập dữ liệu'}
                        </button>
                        <button onClick={() => setShowJsonImport(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-200">
                            Huỷ
                        </button>
                    </div>
                </div>
            )}

            {/* Textbooks grid */}
            {filtered.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 py-12">Chưa có giáo trình nào. {isAdmin ? 'Nhấn "Thêm giáo trình" hoặc "Nhập bằng JSON" để bắt đầu.' : ''}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filtered.map(tb => (
                    <div key={tb.id} className="group relative text-left rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-350">
                        <button onClick={() => navigate(`/grammar/textbook/${tb.id}`)} className="w-full text-left">
                            <TextbookCover 
                                title={tb.title} 
                                titleVi={tb.titleVi} 
                                levels={tb.levels} 
                                description={tb.description} 
                                color={tb.color} 
                                featured={tb.featured} 
                            />
                        </button>
                        {isAdmin && (
                            <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button onClick={(e) => { e.stopPropagation(); handleEdit(tb); }} className="p-2 bg-white/95 dark:bg-slate-800/95 shadow-lg rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all border border-slate-200/40 dark:border-slate-700/40" title="Sửa giáo trình"><Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(tb.id); }} className="p-2 bg-white/95 dark:bg-slate-800/95 shadow-lg rounded-xl hover:bg-red-50 dark:hover:bg-red-950/60 transition-all border border-slate-200/40 dark:border-slate-700/40" title="Xóa giáo trình"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GrammarTextbooksScreen;
