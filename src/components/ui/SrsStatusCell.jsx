import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getSrsProgressText } from '../../utils/srs';
import { SRS_INTERVALS, MASTERED_THRESHOLD } from '../../config/constants';

// SrsStatusCell - displays SRS status for a vocabulary card
// Use asDiv={true} when rendering outside a <table> (e.g. in flex/grid layouts)
const SrsStatusCell = ({ intervalIndex, nextReview, hasData, currentInterval, asDiv = false }) => {
    const Wrapper = asDiv ? 'div' : 'td';
    const wrapperClass = asDiv ? '' : 'px-2 md:px-4 py-2 md:py-3';

    if (!hasData) {
        return (
            <Wrapper className={wrapperClass}>
                <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] md:text-xs">Chưa ôn</span>
                </div>
            </Wrapper>
        );
    }

    // Backward compatible: suy ra effective interval
    const effectiveInterval = (typeof currentInterval === 'number' && currentInterval > 0)
        ? currentInterval
        : (intervalIndex >= 0 && intervalIndex < SRS_INTERVALS.length ? SRS_INTERVALS[intervalIndex] : 0);

    const progress = getSrsProgressText(intervalIndex, null, effectiveInterval);
    const isDue = nextReview && nextReview <= Date.now();
    const isMastered = effectiveInterval >= MASTERED_THRESHOLD;

    // Color based on status
    let colorClass = 'text-gray-500 dark:text-gray-400';
    let bgClass = 'bg-gray-100 dark:bg-gray-700';

    if (isMastered) {
        colorClass = 'text-emerald-600 dark:text-emerald-400';
        bgClass = 'bg-emerald-100 dark:bg-emerald-900/30';
    } else if (intervalIndex >= 2) {
        colorClass = 'text-blue-600 dark:text-blue-400';
        bgClass = 'bg-blue-100 dark:bg-blue-900/30';
    } else if (intervalIndex >= 0) {
        colorClass = 'text-orange-600 dark:text-orange-400';
        bgClass = 'bg-orange-100 dark:bg-orange-900/30';
    }

    return (
        <Wrapper className={wrapperClass}>
            <div className="flex flex-col gap-1">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${bgClass}`}>
                    {isMastered ? (
                        <CheckCircle className={`w-3 h-3 ${colorClass}`} />
                    ) : (
                        <Clock className={`w-3 h-3 ${colorClass}`} />
                    )}
                    <span className={`text-[10px] md:text-xs font-medium ${colorClass}`}>
                        {progress}
                    </span>
                </div>
                {isDue && (
                    <span className="text-[9px] md:text-[10px] text-red-500 dark:text-red-400 font-medium">
                        Cần ôn
                    </span>
                )}
            </div>
        </Wrapper>
    );
};

export default SrsStatusCell;
