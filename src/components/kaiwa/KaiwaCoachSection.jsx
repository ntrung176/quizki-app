import React, { useState, useEffect, useMemo } from 'react';
import { 
    BookOpen, Sparkles, MessageSquare, Search, ChevronRight, 
    Lightbulb, UserCheck, ArrowRight, X, Play, CheckCircle2, Award 
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
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold">Đang tải giáo trình Huấn luyện Giao tiếp & Viết...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Strip */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-800/40 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Huấn Luyện Viên Giao Tiếp & Nhật Ký (Coach Series)</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                        Trọn bộ 70 Bài Học Chiến Lược Phản Xạ & Tạo Lập Câu
                    </h3>
                    <p className="text-xs text-slate-300 font-medium max-w-xl leading-relaxed">
                        Mỗi bài học trang bị khung chiến lược từng bước (Strategy Steps), các tình huống Persona nhập vai thực tế và từ vựng kích hoạt phản xạ.
                    </p>
                </div>

                <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Tìm bài học, persona, từ khóa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-2xl text-xs bg-slate-950/80 border border-indigo-800/60 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                    />
                </div>
            </div>

            {/* Lesson Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
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
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xs border border-indigo-200/60 dark:border-indigo-800/60">
                                        Bài {lesson.lessonNum}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {totalSteps} bước chiến lược
                                    </span>
                                </div>

                                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {lesson.title}
                                </h4>

                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 dark:text-slate-500 mt-3">
                                    <span>{totalPersonas} vai diễn nhập vai</span>
                                    <span>•</span>
                                    <span>Chiến lược phản xạ</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                    <span>Xem chiến lược & Luyện tập</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lesson Detail & Practice Modal */}
            {selectedLesson && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-6">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-xs">
                                        Bài {selectedLesson.lessonNum}
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                        {selectedLesson.title}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Khung hướng dẫn phương pháp giao tiếp và các tình huống thực chiến
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
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                        activeStepIndex === sIdx
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    Khung {sIdx + 1}
                                </button>
                            ))}
                        </div>

                        {/* Current Step Content */}
                        {selectedLesson.steps && selectedLesson.steps[activeStepIndex] && (
                            <div className="space-y-5">
                                {/* Strategy Steps List */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                                        <Lightbulb className="w-4 h-4" />
                                        <span>Chiến lược từng bước:</span>
                                    </div>
                                    <div className="space-y-2">
                                        {selectedLesson.steps[activeStepIndex].strategy.map((st, stIdx) => (
                                            <div 
                                                key={stIdx}
                                                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium flex items-start gap-2.5"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                                                    {stIdx + 1}
                                                </div>
                                                <span>{st}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Personas Scenarios */}
                                {selectedLesson.steps[activeStepIndex].personas && selectedLesson.steps[activeStepIndex].personas.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                                            <UserCheck className="w-4 h-4" />
                                            <span>Tình huống & Vai diễn nhập vai (Personas):</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {selectedLesson.steps[activeStepIndex].personas.map((p, pIdx) => (
                                                <div
                                                    key={pIdx}
                                                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                                                >
                                                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                                        🎭 {p.label}
                                                    </p>
                                                    {p.triggers && p.triggers.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 pt-1">
                                                            {p.triggers.map((trig, tIdx) => (
                                                                <span key={tIdx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
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
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setSelectedLesson(null)}
                                className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={() => {
                                    const currentLessonTitle = selectedLesson.title;
                                    setSelectedLesson(null);
                                    if (onStartCoachChat) {
                                        onStartCoachChat(currentLessonTitle);
                                    }
                                }}
                                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>Luyện tập với AI Teacher theo bài này</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KaiwaCoachSection;
