import React, { useMemo } from 'react';
import { calculateSrsForecast } from '../../utils/srs';
import { Calendar, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const SRSForecastChart = ({ items = [], daysCount = 14, title }) => {
    const { t } = useLanguage();
    const chartTitle = title || t('vocab.forecastTitle', 'Dự Báo Thẻ Đến Hạn SRS (14 Ngày Tới)');

    const getLocalizedDayLabel = (item) => {
        if (!item) return '';
        if (item.dayOffset === 0) return t('vocab.today', 'Hôm nay');
        if (item.dayOffset === 1) return t('vocab.tomorrow', 'Ngày mai');
        const dayIdx = item.dayIndex !== undefined
            ? item.dayIndex
            : (item.dayLabel === 'CN' ? 0 : parseInt(String(item.dayLabel).replace('T', ''), 10) - 1);
        if (dayIdx >= 0 && dayIdx < 7) {
            return t(`weekdays.${dayKeys[dayIdx]}`, item.dayLabel);
        }
        return item.dayLabel;
    };

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
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4 my-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                        <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {chartTitle}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('vocab.totalForecastSub', 'Tổng số thẻ cần ôn trong 14 ngày:')} <span className="font-bold text-slate-800 dark:text-slate-200">{totalDueInPeriod} {t('vocab.cardsUnit', 'thẻ')}</span>
                        </p>
                    </div>
                </div>

                {peakDay && peakDay.count > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold self-start sm:self-auto">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t('vocab.peakToday', 'Cao điểm:')} <strong>{getLocalizedDayLabel(peakDay)} ({peakDay.count} {t('vocab.cardsUnit', 'thẻ')})</strong></span>
                    </div>
                )}
            </div>

            {/* Bar Chart Container */}
            <div className="pt-2 pb-1">
                <div className="h-36 sm:h-40 flex items-end gap-1.5 sm:gap-2 px-1">
                    {forecast.map((item) => {
                        const heightPercent = maxCount > 0 ? Math.max(8, Math.round((item.count / maxCount) * 100)) : 8;
                        const isToday = item.dayOffset === 0;
                        const localizedDay = getLocalizedDayLabel(item);

                        return (
                            <div
                                key={item.dayOffset}
                                className="flex-1 flex flex-col items-center justify-end h-full group relative"
                            >
                                {/* Tooltip on hover */}
                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold py-1 px-2 rounded-xl shadow-lg whitespace-nowrap z-20 transform group-hover:-translate-y-1">
                                    {localizedDay} ({item.dateString}): {item.count} {t('vocab.cardsUnit', 'thẻ')} {isToday ? `(${t('vocab.dueNowParen', 'cần ôn ngay')})` : ''}
                                </div>

                                {/* Bar Value Label */}
                                <span className={`text-[10px] sm:text-xs font-bold mb-1 transition-colors ${
                                    isToday ? 'text-amber-500 font-black' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                }`}>
                                    {item.count > 0 ? item.count : ''}
                                </span>

                                {/* Bar Graphic (Duolingo clean flat bars) */}
                                <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden flex items-end h-full">
                                    <div
                                        className={`w-full rounded-t-lg transition-all duration-300 ease-out ${
                                            isToday
                                                ? 'bg-amber-500 hover:bg-amber-400'
                                                : item.count > 0
                                                    ? 'bg-sky-500 hover:bg-sky-400 dark:bg-sky-600 dark:hover:bg-sky-500'
                                                    : 'bg-transparent'
                                        }`}
                                        style={{ height: `${item.count > 0 ? heightPercent : 4}%` }}
                                    />
                                </div>

                                {/* X-axis Label */}
                                <div className="mt-2 text-center">
                                    <p className={`text-[10px] sm:text-xs font-bold ${
                                        isToday ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {localizedDay}
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

export default React.memo(SRSForecastChart);
