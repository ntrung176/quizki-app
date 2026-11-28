import React from 'react';
import { Play, RotateCcw } from 'lucide-react';

/**
 * Shared action buttons for JLPT exam and practice cards.
 * Completed cards show both "Xem lại" and a direct "Vào thi" button
 * so learners can review answers or retake the exam in one click.
 */
const JLPTCardActionButtons = ({
    test,
    status,
    isLocked = false,
    startTest,
    reviewTest,
    setLockedPkgName,
    setShowPremiumModal,
    startLabel,
    redoLabel = 'Vào thi',
    compact = false,
}) => {
    const handleGatedAction = (e, actionFn) => {
        e.stopPropagation();
        if (isLocked) {
            setLockedPkgName?.('jlpt_prep');
            setShowPremiumModal?.(true);
            return;
        }
        actionFn?.(test);
    };

    const reviewBtnClass = compact
        ? 'px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold transition flex items-center gap-1 cursor-pointer active:translate-y-0.5 active:border-b-0 select-none'
        : 'px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer active:translate-y-0.5 active:border-b-0 select-none';

    const startSizeClass = compact
        ? 'px-3 py-1.5 rounded-xl text-xs border-b-2 gap-1'
        : 'px-3.5 py-2 rounded-xl text-xs border-b-4 gap-1.5';

    const pairedStartSizeClass = compact
        ? 'px-3 py-1.5 rounded-xl text-xs border-b-2 gap-1'
        : 'px-3.5 py-2 rounded-xl text-xs border-b-2 gap-1.5';

    const colorClass = isLocked
        ? 'bg-amber-500 hover:bg-amber-400 border-amber-700 text-white'
        : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white';

    if (status === 'completed') {
        return (
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <button
                    type="button"
                    onClick={(e) => handleGatedAction(e, reviewTest)}
                    className={reviewBtnClass}
                    title="Xem lại kết quả và giải thích"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xem lại</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => handleGatedAction(e, startTest)}
                    className={`${pairedStartSizeClass} ${colorClass} font-black uppercase tracking-wider transition active:translate-y-0.5 active:border-b-0 flex items-center cursor-pointer select-none`}
                    title="Vào làm lại đề này"
                >
                    <Play className="w-3.5 h-3.5 fill-white text-white" />
                    <span>{redoLabel}</span>
                </button>
            </div>
        );
    }

    const resolvedStartLabel = status === 'in_progress'
        ? 'Làm tiếp'
        : (startLabel || 'Vào thi');

    return (
        <button
            type="button"
            onClick={(e) => handleGatedAction(e, startTest)}
            className={`${startSizeClass} ${colorClass} font-black uppercase tracking-wider transition active:translate-y-0.5 active:border-b-2 flex items-center cursor-pointer select-none ml-auto shrink-0`}
        >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            <span>{resolvedStartLabel}</span>
        </button>
    );
};

export default JLPTCardActionButtons;
