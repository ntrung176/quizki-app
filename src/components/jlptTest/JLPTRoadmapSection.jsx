import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Check } from 'lucide-react';
import { WEEK_GROUPS, ROADMAP_TASKS } from './jlptConstants';
import { ROUTES } from '../../router';

export const getDayTask = (dayNum) => {
    const modulus = dayNum % 5;
    if (modulus === 1) return ROADMAP_TASKS.vocabulary;
    if (modulus === 2) return ROADMAP_TASKS.grammar;
    if (modulus === 3) return ROADMAP_TASKS.reading;
    if (modulus === 4) return ROADMAP_TASKS.listening;
    return ROADMAP_TASKS.practice;
};

const JLPTRoadmapSection = ({
    targetLevel,
    roadmapProgress,
    toggleRoadmapDay,
    setSelectedLevel
}) => {
    const navigate = useNavigate();
    const [activeWeekGroup, setActiveWeekGroup] = useState(0);

    const currentGroup = WEEK_GROUPS[activeWeekGroup];
    const days = Array.from(
        { length: currentGroup.range[1] - currentGroup.range[0] + 1 },
        (_, i) => currentGroup.range[0] + i
    );

    return (
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-6 animate-fade-in font-sans">
            {/* Week Tabs */}
            <div className="flex flex-wrap gap-2">
                {WEEK_GROUPS.map((group, idx) => {
                    const isSelected = activeWeekGroup === idx;
                    const groupCompletedCount = (roadmapProgress[targetLevel] || []).filter(
                        d => d >= group.range[0] && d <= group.range[1]
                    ).length;

                    return (
                        <button
                            key={idx}
                            onClick={() => setActiveWeekGroup(idx)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-sm cursor-pointer ${
                                isSelected
                                    ? 'bg-[#2E5B70] text-white border-[#2E5B70]'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-655 dark:text-slate-400 border-slate-205 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span>{group.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                                {groupCompletedCount}/10
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Week Title & Theme */}
            <div className="bg-slate-50/50 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-700/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Chủ đề tuần học</span>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                        {currentGroup.theme} (Ngày {currentGroup.range[0]} - {currentGroup.range[1]})
                    </h5>
                </div>
                {/* Progress indicator */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#2E5B70] dark:text-sky-400">
                        {Math.round(((roadmapProgress[targetLevel] || []).filter(
                            d => d >= currentGroup.range[0] && d <= currentGroup.range[1]
                        ).length / 10) * 100)}%
                    </span>
                    <div className="w-24 bg-slate-100 dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-[#2E5B70] dark:bg-sky-500 h-2 rounded-full transition-all duration-300"
                            style={{
                                width: `${((roadmapProgress[targetLevel] || []).filter(
                                    d => d >= currentGroup.range[0] && d <= currentGroup.range[1]
                                ).length / 10) * 100}%`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {days.map((dayNum) => {
                    const isCompleted = (roadmapProgress[targetLevel] || []).includes(dayNum);
                    const task = getDayTask(dayNum);

                    return (
                        <div
                            key={dayNum}
                            className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between min-h-[140px] relative overflow-hidden group shadow-sm ${
                                isCompleted
                                    ? 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-250 dark:border-emerald-900/45'
                                    : 'bg-white dark:bg-slate-800 border-slate-150 dark:border-slate-750/80 hover:border-slate-300 dark:hover:border-slate-650'
                            }`}
                        >
                            <div>
                                {/* Header: Day number & status */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                        isCompleted
                                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450'
                                            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                                    }`}>
                                        Ngày {dayNum < 10 ? `0${dayNum}` : dayNum}
                                    </span>
                                    <button
                                        onClick={() => toggleRoadmapDay(targetLevel, dayNum)}
                                        className={`p-1.5 rounded-full transition-all duration-150 cursor-pointer ${
                                            isCompleted
                                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-200'
                                        }`}
                                        title={isCompleted ? "Đánh dấu chưa hoàn thành" : "Đánh dấu đã hoàn thành"}
                                    >
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>
                                </div>
                                {/* Task description */}
                                <h6 className={`text-xs font-bold ${
                                    isCompleted ? 'text-emerald-900 dark:text-emerald-350' : 'text-slate-800 dark:text-white'
                                }`}>
                                    {task.title}
                                </h6>
                                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 leading-relaxed line-clamp-3">
                                    {task.desc}
                                </p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100/50 dark:border-slate-700/30 flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        if (task.title.includes("tự")) {
                                            navigate(ROUTES.VOCAB_LIST);
                                        } else {
                                            setSelectedLevel(targetLevel);
                                            document.getElementById("test-list-section")?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                    className={`text-[10px] font-extrabold flex items-center gap-1 transition cursor-pointer ${
                                        isCompleted
                                            ? 'text-emerald-600 dark:text-emerald-400 hover:underline'
                                            : 'text-[#2E5B70] dark:text-sky-400 hover:underline'
                                    }`}
                                >
                                    Học ngay <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default JLPTRoadmapSection;
