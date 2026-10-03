import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Volume2, Search, Sparkles, CheckCircle2, XCircle,
    HelpCircle, ChevronDown, ChevronUp, Copy, Check, Bookmark, Share2, Layers, BookOpen
} from 'lucide-react';
import { speakExampleSentence } from '../../utils/audio';
import { showToast } from '../../utils/toast';

const GrammarCheatSheetDetailScreen = () => {
    const { sheetId } = useParams();
    const navigate = useNavigate();

    const [sheet, setSheet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [drillAnswers, setDrillAnswers] = useState({});
    const [showExplanations, setShowExplanations] = useState({});

    useEffect(() => {
        const fetchSheet = async () => {
            try {
                const res = await fetch('/data/grammar_cheatsheets.json');
                if (res.ok) {
                    const data = await res.json();
                    const found = data.find(s => s.id === sheetId);
                    setSheet(found || null);
                }
            } catch (err) {
                console.error('Error fetching sheet:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSheet();
    }, [sheetId]);

    const handleSelectOption = (qIdx, opt) => {
        setDrillAnswers(prev => ({ ...prev, [qIdx]: opt }));
        setShowExplanations(prev => ({ ...prev, [qIdx]: true }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!sheet) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
                <Bookmark className="w-16 h-16 text-slate-400 mb-4" />
                <h2 className="text-xl font-bold mb-2">Không tìm thấy sổ tay tra cứu</h2>
                <button
                    onClick={() => navigate('/grammar/cheatsheets')}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <button
                        onClick={() => navigate('/grammar/cheatsheets')}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Sổ tay chuyên đề</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-2xl text-xs font-black border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            {sheet.level}
                        </span>
                        {sheet.badge && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {sheet.badge}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 pt-6">
                {/* Sheet Title Card - Minimal B&W */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs mb-8">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-2 max-w-2xl flex-1">
                            <div className="flex items-center gap-2.5">
                                <span className="text-2xl">{sheet.icon || '📖'}</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    {sheet.category}
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                                {sheet.title}
                            </h1>
                            {sheet.titleJp && (
                                <div className="text-sm text-slate-500 dark:text-slate-400 font-japanese">
                                    {sheet.titleJp}
                                </div>
                            )}
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                                {sheet.summary}
                            </p>
                        </div>

                        {/* Hanko Stamp */}
                        {sheet.hanko && (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-slate-800 dark:border-slate-200 flex flex-col items-center justify-center text-slate-900 dark:text-white font-japanese font-black text-sm sm:text-base tracking-widest shadow-xs select-none bg-slate-50 dark:bg-slate-800">
                                <div>{sheet.hanko.slice(0, 2)}</div>
                                <div>{sheet.hanko.slice(2, 4)}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 1. SPECIAL VERBS TABLE (For Keigo etc.) */}
                {sheet.specialVerbs && sheet.specialVerbs.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                Bảng 12 Động từ Kính ngữ đặc biệt
                            </h2>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Bấm biểu tượng 🔊 để nghe phát âm
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                        <th className="p-3">Từ gốc (Thể thường)</th>
                                        <th className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">Tôn kính ngữ (Sonkei)</th>
                                        <th className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">Khiêm nhường ngữ (Kenjou)</th>
                                        <th className="p-3">Ý nghĩa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-japanese">
                                    {sheet.specialVerbs.map((v, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                                {v.plain}
                                            </td>
                                            <td className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-medium">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>{v.sonkei}</span>
                                                    {v.sonkei !== '—' && (
                                                        <button
                                                            onClick={() => speakExampleSentence(v.sonkei.split('/')[0].trim())}
                                                            className="p-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-300 transition"
                                                        >
                                                            <Volume2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300 font-medium">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>{v.kenjou}</span>
                                                    {v.kenjou !== '—' && (
                                                        <button
                                                            onClick={() => speakExampleSentence(v.kenjou.split('/')[0].replace(/\([^)]*\)/g, '').trim())}
                                                            className="p-1 rounded hover:bg-teal-200 dark:hover:bg-teal-800 text-teal-600 dark:text-teal-300 transition"
                                                        >
                                                            <Volume2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 font-sans text-xs text-slate-600 dark:text-slate-400">
                                                {v.meaning}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. PARTICLES LIST (For Particles sheet) */}
                {sheet.particlesList && sheet.particlesList.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                        <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                            ⚡ Danh sách các Trợ từ trọng tâm
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sheet.particlesList.map((p, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-japanese">
                                            {p.particle}
                                        </span>
                                        <span className="text-xs font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                                            {p.formula}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                                        {p.meaning}
                                    </p>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 font-japanese bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                        <span>{p.sample}</span>
                                        <button
                                            onClick={() => speakExampleSentence(p.sample)}
                                            className="p-1 text-slate-500 hover:text-indigo-500"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. CONDITIONALS MATRIX (For Conditionals sheet) */}
                {sheet.matrix && sheet.matrix.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                        <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                            🌿 Ma trận đối chiếu 4 mẫu câu điều kiện (To / Ba / Tara / Nara)
                        </h2>
                        <div className="space-y-4">
                            {sheet.matrix.map((m, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-japanese">
                                            {m.form}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 rounded-full">
                                            {m.nature}
                                        </span>
                                    </div>
                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        🧩 Quy tắc: {m.rule}
                                    </div>
                                    <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-3 bg-emerald-500/10 p-2 rounded-lg">
                                        💡 {m.nuance}
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-300 font-japanese bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                        <span>{m.sample}</span>
                                        <button
                                            onClick={() => speakExampleSentence(m.sample)}
                                            className="p-1 text-slate-500 hover:text-emerald-500"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. TRANSITIVITY PAIRS (For Transitivity sheet) */}
                {sheet.pairs && sheet.pairs.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                        <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                            ⚖️ Các cặp Tự động từ (が) & Tha động từ (を) kinh điển
                        </h2>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                        <th className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">Tự động từ (自動詞 - が)</th>
                                        <th className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">Tha động từ (他動詞 - を)</th>
                                        <th className="p-3">Ý nghĩa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-japanese">
                                    {sheet.pairs.map((pair, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                            <td className="p-3 bg-teal-50/40 dark:bg-teal-950/20 text-teal-800 dark:text-teal-200">
                                                <div className="font-bold">{pair.jidou}</div>
                                                <div className="text-[11px] text-slate-500 font-sans mt-0.5">{pair.sampleJ}</div>
                                            </td>
                                            <td className="p-3 bg-blue-50/40 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200">
                                                <div className="font-bold">{pair.tadou}</div>
                                                <div className="text-[11px] text-slate-500 font-sans mt-0.5">{pair.sampleT}</div>
                                            </td>
                                            <td className="p-3 font-sans text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {pair.meaning}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. SECTIONS & EXPLANATION BLOCKS */}
                {sheet.sections && sheet.sections.length > 0 && (
                    <div className="space-y-6 mb-8">
                        {sheet.sections.map((sec, sIdx) => (
                            <div key={sIdx} className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                                    {sec.title}
                                </h3>
                                {sec.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                                        {sec.description}
                                    </p>
                                )}

                                {/* Formulas */}
                                {sec.formulas && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                        {sec.formulas.map((f, fIdx) => (
                                            <div key={fIdx} className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3">
                                                <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 font-mono mb-1">
                                                    {f.formula}
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                    {f.note}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Traps */}
                                {sec.traps && (
                                    <div className="space-y-3 mb-4">
                                        {sec.traps.map((tr, tIdx) => (
                                            <div key={tIdx} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 text-xs sm:text-sm">
                                                <div className="font-semibold text-rose-600 dark:text-rose-400 mb-1">{tr.wrong}</div>
                                                <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">{tr.correct}</div>
                                                <p className="text-xs text-slate-600 dark:text-slate-300">{tr.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Examples */}
                                {sec.examples && (
                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        {sec.examples.map((ex, eIdx) => (
                                            <div key={eIdx} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs sm:text-sm">
                                                <div>
                                                    <div className="font-japanese font-medium text-slate-900 dark:text-slate-100">{ex.ja}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{ex.vi}</div>
                                                </div>
                                                <button
                                                    onClick={() => speakExampleSentence(ex.ja)}
                                                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 shrink-0"
                                                >
                                                    <Volume2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* 6. INTERACTIVE DRILLS */}
                {sheet.drills && sheet.drills.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-2xl p-5 sm:p-6 mb-8 shadow-sm">
                        <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                            🎯 Luyện tập nhanh với đề thi JLPT
                        </h2>
                        <div className="space-y-5">
                            {sheet.drills.map((drill, qIdx) => {
                                const userChoice = drillAnswers[qIdx];
                                const isAnswered = !!userChoice;
                                const isCorrect = userChoice === drill.answer;

                                return (
                                    <div key={qIdx} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                                        <div className="font-semibold text-sm sm:text-base font-japanese mb-3 text-slate-900 dark:text-slate-100">
                                            {qIdx + 1}. {drill.question || drill.q}
                                        </div>

                                        {/* Options */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                            {drill.options?.map((opt, oIdx) => {
                                                const isSelected = userChoice === opt;
                                                const isOptCorrect = opt === drill.answer;
                                                let btnClass = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500';

                                                if (isAnswered) {
                                                    if (isOptCorrect) {
                                                        btnClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold';
                                                    } else if (isSelected) {
                                                        btnClass = 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 line-through';
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={oIdx}
                                                        onClick={() => handleSelectOption(qIdx, opt)}
                                                        className={`p-2.5 rounded-xl border text-xs sm:text-sm font-japanese transition text-left flex items-center justify-between ${btnClass}`}
                                                    >
                                                        <span>{opt}</span>
                                                        {isAnswered && isOptCorrect && (
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                        )}
                                                        {isAnswered && isSelected && !isOptCorrect && (
                                                            <XCircle className="w-4 h-4 text-rose-600" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation */}
                                        {isAnswered && (
                                            <div className="mt-2.5 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-700 dark:text-slate-300">
                                                <strong className="text-indigo-600 dark:text-indigo-400">💡 Giải thích:</strong> {drill.explanation}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarCheatSheetDetailScreen;
