import React, { useMemo } from 'react';
import { calculateSrsForecast } from '../../utils/srs';
import { Calendar, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

const SRSForecastChart = ({ items = [], daysCount = 14, title = "Dự Báo Thẻ Đến Hạn SRS (14 Ngày Tới)" }) => {
    const forecast = useMemo(() => {
        return calculateSrsForecast(items, daysCount);
    }, [items, daysCount]);

    const maxCount = useMemo(() => {
        const max = Math.max(...forecast.map(f => f.count), 1);
        return max;
    }, [forecast]);

    const totalDueInPeriod = useMemo(() => {
        return forecast.reduce((acc, curr) => acc + curr.count, 0);
    }, [forecast]);

    const peakDay = useMemo(() => {
        let maxObj = forecast[0];
        forecast.forEach(f => {
            if (f.count > maxObj.count) maxObj = f;
        });
        return maxObj;
    }, [forecast]);

    if (!items || items.length === 0) return null;

    return (
        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-lg space-y-4 my-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Tổng số thẻ cần ôn trong {daysCount} ngày: <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalDueInPeriod} thẻ</span>
                        </p>
                    </div>
                </div>

                {peakDay && peakDay.count > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium self-start sm:self-auto">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Cao điểm: <strong>{peakDay.dayLabel} ({peakDay.count} thẻ)</strong></span>
                    </div>
                )}
            </div>

            {/* Bar Chart Container */}
            <div className="pt-2 pb-1">
                <div className="h-36 sm:h-40 flex items-end gap-1.5 sm:gap-2 px-1">
                    {forecast.map((item) => {
                        const heightPercent = maxCount > 0 ? Math.max(8, Math.round((item.count / maxCount) * 100)) : 8;
                        const isToday = item.dayOffset === 0;
                        const isPeak = peakDay && peakDay.count > 0 && item.count === peakDay.count && item.count > 0;

                        return (
                            <div 
                                key={item.dayOffset} 
                                className="flex-1 flex flex-col items-center justify-end h-full group relative"
                            >
                                {/* Tooltip on hover */}
                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap z-20 transform group-hover:-translate-y-1">
                                    {item.dayLabel} ({item.dateString}): {item.count} thẻ
                                </div>

                                {/* Bar Value Label */}
                                <span className={`text-[10px] sm:text-xs font-bold mb-1 transition-colors ${
                                    isToday ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-500'
                                }`}>
                                    {item.count > 0 ? item.count : ''}
                                </span>

                                {/* Bar Graphic */}
                                <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800/60 rounded-t-md overflow-hidden flex items-end h-full">
                                    <div 
                                        className={`w-full rounded-t-md transition-all duration-500 ease-out ${
                                            isToday 
                                                ? 'bg-gradient-to-t from-rose-500 to-amber-500 shadow-md shadow-rose-500/20' 
                                                : isPeak 
                                                    ? 'bg-gradient-to-t from-amber-500 to-yellow-400' 
                                                    : 'bg-gradient-to-t from-indigo-500 to-cyan-400 group-hover:from-indigo-400 group-hover:to-cyan-300'
                                        }`}
                                        style={{ height: `${item.count > 0 ? heightPercent : 4}%` }}
                                    />
                                </div>

                                {/* X-axis Label */}
                                <div className="mt-2 text-center">
                                    <p className={`text-[10px] sm:text-xs font-semibold ${
                                        isToday ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {item.dayLabel}
                                    </p>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:block">
                                        {item.dateString}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SRSForecastChart;
