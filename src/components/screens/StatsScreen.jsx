import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Target, Save, TrendingUp, Flame, List } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MemoryStatCard } from '../cards';
import { JLPT_LEVELS } from '../../config/constants';

const StatsScreen = ({ memoryStats, totalCards, profile, allCards, dailyActivityLogs, onUpdateGoal, onBack }) => {
    const { shortTerm, midTerm, longTerm, new: newCards } = memoryStats;
    const [newGoal, setNewGoal] = useState(profile.dailyGoal);
    const pieChartRef = useRef(null);
    const barChartRef = useRef(null);
    const [pieChartSize, setPieChartSize] = useState({ width: 0, height: 250 });
    const [barChartSize, setBarChartSize] = useState({ width: 0, height: 200 });

    useEffect(() => {
        const updatePieSize = () => {
            if (pieChartRef.current) {
                const width = pieChartRef.current.offsetWidth || 0;
                if (width > 0) {
                    setPieChartSize({ width, height: 250 });
                }
            }
        };
        const updateBarSize = () => {
            if (barChartRef.current) {
                const width = barChartRef.current.offsetWidth || 0;
                if (width > 0) {
                    setBarChartSize({ width, height: 200 });
                }
            }
        };

        const timer = setTimeout(() => {
            updatePieSize();
            updateBarSize();
        }, 100);

        window.addEventListener('resize', () => {
            updatePieSize();
            updateBarSize();
        });

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePieSize);
            window.removeEventListener('resize', updateBarSize);
        };
    }, []);

    const handleSaveGoal = () => { onUpdateGoal(newGoal); };

    // Streak Calculation
    const streak = useMemo(() => {
        if (!dailyActivityLogs || dailyActivityLogs.length === 0) return 0;

        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const reversedLogs = [...dailyActivityLogs].reverse();
        const lastLog = reversedLogs[0];
        if (!lastLog) return 0;

        let currentStreak = 0;
        let checkDate = new Date();

        if (lastLog.id !== todayStr && lastLog.id !== yesterdayStr) {
            return 0;
        }

        if (lastLog.id !== todayStr) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        for (const log of reversedLogs) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            if (log.id === checkDateStr && log.newWordsAdded > 0) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return currentStreak;
    }, [dailyActivityLogs]);

    // Words Added This Week
    const wordsAddedThisWeek = useMemo(() => {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return allCards.filter(c => c.createdAt >= sevenDaysAgo).length;
    }, [allCards]);

    // JLPT Progress Data
    const jlptData = useMemo(() => {
        return JLPT_LEVELS.map(level => {
            const count = allCards.filter(c => c.level === level.value).length;
            return {
                name: level.label,
                count: count,
                target: level.target,
                fill: level.color.split(' ')[0].replace('bg-', 'var(--color-')
            };
        });
    }, [allCards]);

    const pieData = [
        { name: 'Mới', value: newCards, fill: '#94a3b8' },
        { name: 'Ngắn hạn', value: shortTerm, fill: '#f59e0b' },
        { name: 'Trung hạn', value: midTerm, fill: '#10b981' },
        { name: 'Dài hạn', value: longTerm, fill: '#22c55e' },
    ].filter(e => e.value > 0);

    return (
        <div className="space-y-3 md:space-y-8">
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100 pb-2 md:pb-4 border-b dark:border-gray-700">Thống Kê Chi Tiết</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 p-2 md:p-3 rounded-lg md:rounded-xl text-white shadow-lg space-y-0.5 md:space-y-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[9px] md:text-xs uppercase tracking-wide opacity-80">Mục tiêu mỗi ngày</p>
                            <div className="flex items-end gap-1 md:gap-2 mt-0.5 md:mt-1">
                                <input
                                    type="number"
                                    min={1}
                                    value={newGoal}
                                    onChange={e => setNewGoal(e.target.value)}
                                    className="w-12 md:w-20 px-1 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg text-lg md:text-2xl font-bold text-indigo-700 dark:text-indigo-800 bg-white dark:bg-gray-100"
                                />
                                <span className="text-[9px] md:text-xs opacity-90">từ/ngày</span>
                            </div>
                        </div>
                        <Target className="w-4 h-4 md:w-5 md:h-5 text-indigo-200 dark:text-indigo-300 flex-shrink-0" />
                    </div>
                    <button
                        onClick={handleSaveGoal}
                        className="mt-1 md:mt-2 inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-xs font-semibold rounded-md md:rounded-lg bg-white/10 dark:bg-white/20 hover:bg-white/20 dark:hover:bg-white/30 transition-colors"
                    >
                        <Save className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> Lưu mục tiêu
                    </button>
                </div>
                <MemoryStatCard
                    title="Trong tuần"
                    count={wordsAddedThisWeek}
                    icon={TrendingUp}
                    color={{ bg: 'bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-800/30', border: 'border border-sky-100 dark:border-sky-800', text: 'text-sky-600 dark:text-sky-400', iconBg: 'bg-white/80 dark:bg-gray-800/80' }}
                    subtext="từ vựng mới"
                />
                <MemoryStatCard
                    title="Chuỗi ngày"
                    count={streak}
                    icon={Flame}
                    color={{ bg: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30', border: 'border border-amber-100 dark:border-amber-900/30', text: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-white/80 dark:bg-gray-800/80' }}
                    subtext="liên tục"
                />
                <MemoryStatCard
                    title="Tổng số"
                    count={totalCards}
                    icon={List}
                    color={{ bg: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-700/30', border: 'border border-slate-100 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', iconBg: 'bg-white/80 dark:bg-gray-800/80' }}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4">
                {/* Pie Chart */}
                <div className="bg-white dark:bg-gray-800 p-2 md:p-4 rounded-lg md:rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs md:text-base font-bold text-gray-700 dark:text-gray-200 mb-1.5 md:mb-2">Ghi nhớ Từ vựng</h3>
                    {pieData.length > 0 ? (
                        <div ref={pieChartRef} className="chart-container">
                            {pieChartSize.width > 0 ? (
                                <ResponsiveContainer width={pieChartSize.width} height={pieChartSize.height}>
                                    <PieChart margin={{ top: 50, right: 0, bottom: 0, left: 0 }}>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="35%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={false}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend
                                            verticalAlign="bottom"
                                            align="center"
                                            wrapperStyle={{ fontSize: '12px', fontWeight: '500', marginTop: '0px' }}
                                            iconSize={12}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">Đang tải...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="chart-center">
                            <span className="text-gray-400 text-xs md:text-sm">Chưa có dữ liệu</span>
                        </div>
                    )}
                </div>

                {/* Bar Chart */}
                <div className="bg-white dark:bg-gray-800 p-2 md:p-4 rounded-lg md:rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs md:text-base font-bold text-gray-700 dark:text-gray-200 mb-1.5 md:mb-2">Tiến độ theo Cấp độ JLPT</h3>
                    {jlptData && jlptData.length > 0 ? (
                        <div ref={barChartRef} className="chart-container">
                            {barChartSize.width > 0 ? (
                                <ResponsiveContainer width={barChartSize.width} height={barChartSize.height}>
                                    <BarChart data={jlptData} layout="vertical" margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={20} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-white dark:bg-gray-800 p-1.5 md:p-2 border border-gray-100 dark:border-gray-700 shadow-lg rounded-md md:rounded-lg text-[10px] md:text-xs text-gray-900 dark:text-gray-100">
                                                        <p className="font-bold">{d.name}</p>
                                                        <p>Đã có: {d.count}</p>
                                                        <p>Yêu cầu: {d.target}</p>
                                                        <p>Tiến độ: {Math.round((d.count / d.target) * 100)}%</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Bar dataKey="count" barSize={15} radius={[0, 4, 4, 0]}>
                                            {jlptData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={
                                                    index === 0 ? '#10b981' :
                                                        index === 1 ? '#0d9488' :
                                                            index === 2 ? '#0ea5e9' :
                                                                index === 3 ? '#8b5cf6' :
                                                                    '#f43f5e'
                                                } />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">Đang tải...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="chart-center">
                            <span className="text-gray-400 text-xs md:text-sm">Chưa có dữ liệu</span>
                        </div>
                    )}
                    <p className="text-[9px] md:text-xs text-gray-400 mt-1 md:mt-2 text-center">*Số lượng yêu cầu chỉ mang tính chất tham khảo</p>
                </div>
            </div>

            <button onClick={onBack} className="w-full py-2 md:py-3 border border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 font-medium text-sm md:text-base text-gray-600">Quay lại</button>
        </div>
    );
};

export default StatsScreen;
