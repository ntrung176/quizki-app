import React, { useState, useEffect, useMemo } from 'react';
import { 
    BookOpen, Compass, MessageSquare, Search, ChevronRight, 
    Lightbulb, UserCheck, ArrowRight, X, Play, CheckCircle2, Award, Zap 
} from 'lucide-react';

const KaiwaCoachSection = ({ onStartCoachChat }) => {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    useEffect(() => {
        const fetchCoachData = async () => {
            try {
                const res = await fetch('/data/kaiwa_coach_data.json');
                if (res.ok) {
                    const data = await res.json();
                    setLessons(data);
                }
            } catch (err) {
                console.error('Error loading coach data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCoachData();
    }, []);

    const filteredLessons = useMemo(() => {
        return lessons.filter(l => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const matchTitle = (l.title || '').toLowerCase().includes(q);
            const matchNum = String(l.lessonNum || '').includes(q);
            const matchSteps = (l.steps || []).some(s => 
                (s.strategy || []).some(st => st.toLowerCase().includes(q)) ||
                (s.personas || []).some(p => p.label.toLowerCase().includes(q))
            );
            return matchTitle || matchNum || matchSteps;
        });
    }, [lessons, searchQuery]);

    if (loading) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold">Đang tải giáo trình Huấn luyện Giao tiếp & Phản xạ...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col space-y-3.5 sm:space-y-4">
            {/* Header Strip - Duolingo Compact Banner */}
            <div className="p-3.5 sm:p-4 bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-emerald-500/30 text-white rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
                <div className="space-y-0.5 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-1.5 text-emerald-400 text-xs font-black uppercase tracking-wider">
                        <Compass className="w-4 h-4 text-emerald-400" />
                        <span>Huấn Luyện Viên Giao Tiếp & Nhật Ký (Coach Series)</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                        Trọn bộ 70 Bài Học Chiến Lược Phản Xạ & Tạo Lập Câu
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium max-w-xl leading-relaxed hidden sm:block">
                        Khung chiến lược từng bước (Strategy Steps), tình huống Persona thực tế và từ vựng kích hoạt phản xạ tự nhiên.
                    </p>
                </div>

                <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Tìm bài học, persona, từ khóa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-2xl text-xs bg-slate-950/80 border-2 border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            {/* Lesson Grid - Natural full page scroll */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pb-16 sm:pb-24">
                {filteredLessons.map(lesson => {
                    const totalSteps = lesson.steps?.length || 0;
                    const totalPersonas = (lesson.steps || []).reduce((sum, s) => sum + (s.personas?.length || 0), 0);

                    return (
                        <div
                            key={lesson.id}
                            onClick={() => {
                                setSelectedLesson(lesson);
                                setActiveStepIndex(0);
                            }}
                            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border-2 border-b-4 border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500 dark:hover:border-emerald-500 p-4 sm:p-5 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <span className="px-2.5 py-0.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-300/80 dark:border-emerald-800/80">
                                        Bài {lesson.lessonNum}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {totalSteps} bước chiến lược
                                    </span>
                                </div>

                                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                                    {lesson.title}
                                </h4>

                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 mt-2.5">
                                    <span>{totalPersonas} vai diễn nhập vai</span>
                                    <span>•</span>
                                    <span>Phản xạ AI</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onStartCoachChat) {
                                            onStartCoachChat(lesson);
                                        }
                                    }}
                                    className="w-full py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-3 border-emerald-700 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs select-none"
                                >
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    <span>Luyện phản xạ bài này</span>
                                </button>

                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 px-1">
                                    <span>Xem chi tiết chiến lược</span>
                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lesson Detail & Practice Modal */}
            {selectedLesson && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[88vh] overflow-y-auto custom-scrollbar shadow-2xl p-5 sm:p-6 space-y-5">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-0.5 rounded-xl bg-emerald-500 text-white font-black text-xs border-b-2 border-emerald-700">
                                        Bài {selectedLesson.lessonNum}
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                        {selectedLesson.title}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Chiến lược phản xạ từng bước và các vai diễn nhập vai thực chiến
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedLesson(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Steps Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {(selectedLesson.steps || []).map((step, sIdx) => (
                                <button
                                    key={step.stepKey || sIdx}
                                    onClick={() => setActiveStepIndex(sIdx)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                                        activeStepIndex === sIdx
                                            ? 'bg-emerald-500 text-white shadow-xs border-b-2 border-emerald-700'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    Khung {sIdx + 1}
                                </button>
                            ))}
                        </div>

                        {/* Current Step Content */}
                        {selectedLesson.steps && selectedLesson.steps[activeStepIndex] && (
                            <div className="space-y-4">
                                {/* Strategy Steps List */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                                        <Lightbulb className="w-4 h-4" />
                                        <span>Chiến lược từng bước:</span>
                                    </div>
                                    <div className="space-y-2">
                                        {selectedLesson.steps[activeStepIndex].strategy.map((st, stIdx) => (
                                            <div 
                                                key={stIdx}
                                                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium flex items-start gap-2.5"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                                                    {stIdx + 1}
                                                </div>
                                                <span>{st}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Personas Scenarios */}
                                {selectedLesson.steps[activeStepIndex].personas && selectedLesson.steps[activeStepIndex].personas.length > 0 && (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                                            <UserCheck className="w-4 h-4" />
                                            <span>Tình huống & Vai diễn nhập vai (Personas):</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selectedLesson.steps[activeStepIndex].personas.map((p, pIdx) => (
                                                <div
                                                    key={pIdx}
                                                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1"
                                                >
                                                    <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                                        🎭 {p.label}
                                                    </p>
                                                    {p.triggers && p.triggers.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 pt-1">
                                                            {p.triggers.map((trig, tIdx) => (
                                                                <span key={tIdx} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                                                    #{trig}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Modal Action CTA */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                            <button
                                onClick={() => setSelectedLesson(null)}
                                className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-200"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={() => {
                                    const lessonToStart = selectedLesson;
                                    setSelectedLesson(null);
                                    if (onStartCoachChat) {
                                        onStartCoachChat(lessonToStart);
                                    }
                                }}
                                className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-3 border-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer select-none"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>Luyện phản xạ với AI Teacher theo bài này</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KaiwaCoachSection;
