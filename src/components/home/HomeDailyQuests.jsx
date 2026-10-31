import React, { useState } from 'react';
import { Target, CheckCircle2, Circle, Flame, PenTool, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';

const HomeDailyQuests = ({
    userId,
    totalDue = 0,
    dailyActivityLogs = [],
    isJapaneseMode = true
}) => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const todayStr = new Date().toISOString().split('T')[0];
    const questKey = userId ? `quizki_daily_quests_${userId}_${todayStr}` : `quizki_daily_quests_${todayStr}`;

    const [questState, setQuestState] = useState(() => {
        try {
            const saved = localStorage.getItem(questKey);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const hasClearedSrs = totalDue === 0;
    const hasStudiedToday = Array.isArray(dailyActivityLogs) && dailyActivityLogs.some(log => {
        if (!log) return false;
        const logDate = log.date || (log.timestamp ? new Date(log.timestamp).toISOString().split('T')[0] : '');
        return logDate === todayStr;
    });

    const isQuest1Done = questState.quest1 || hasClearedSrs;
    const isQuest2Done = questState.quest2 || hasStudiedToday;
    const isQuest3Done = !!questState.quest3;

    const toggleQuest = (qKey, defaultRoute) => {
        const nextState = { ...questState, [qKey]: !questState[qKey] };
        setQuestState(nextState);
        try {
            localStorage.setItem(questKey, JSON.stringify(nextState));
        } catch (_) {}
        if (!questState[qKey] && defaultRoute) {
            navigate(defaultRoute);
        }
    };

    const quests = [
        {
            id: 'quest1',
            icon: Flame,
            color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60',
            title: t('home.questSrsReview', 'Ôn thẻ SRS đến hạn'),
            xp: '+50 XP',
            isDone: isQuest1Done,
            route: ROUTES.VOCAB_REVIEW
        },
        {
            id: 'quest2',
            icon: PenTool,
            color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60',
            title: isJapaneseMode ? t('home.questKanji', 'Luyện Kanji hoặc Từ') : t('home.questKanji', 'Luyện Từ vựng'),
            xp: '+30 XP',
            isDone: isQuest2Done,
            route: isJapaneseMode ? ROUTES.KANJI_REVIEW : ROUTES.VOCAB_ADD
        },
        {
            id: 'quest3',
            icon: MessageSquare,
            color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60',
            title: t('home.questKaiwa', 'Đàm thoại AI 3 phút'),
            xp: '+40 XP',
            isDone: isQuest3Done,
            route: ROUTES.JLPT_KAIWA
        }
    ];

    const completedCount = [isQuest1Done, isQuest2Done, isQuest3Done].filter(Boolean).length;
    const allDone = completedCount === 3;

    return (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            {/* Header: Title & Progress Bar */}
            <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Target className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {t('home.dailyQuestsTitle', 'Nhiệm vụ hôm nay')}
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                        {completedCount}/3
                    </span>
                    <div className="w-14 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${(completedCount / 3) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Quests Vertical List - Compact & Zero Ellipsis */}
            <div className="flex flex-col gap-2">
                {quests.map(q => {
                    const Icon = q.icon;
                    return (
                        <div
                            key={q.id}
                            onClick={() => toggleQuest(q.id, q.route)}
                            className={`p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer select-none active:scale-[0.99] ${
                                q.isDone
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60'
                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${q.color}`}>
                                    <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                                </div>
                                <span className={`text-xs font-bold leading-tight ${q.isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {q.title}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {q.xp}
                                </span>
                                {q.isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                                ) : (
                                    <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HomeDailyQuests;
