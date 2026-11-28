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

    const paddingClass = compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs';

    const reviewBtnClass = `${paddingClass} rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-950 font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:translate-y-0.5 active:border-b-2 select-none`;

    const primaryColorClass = isLocked
        ? 'bg-amber-500 hover:bg-amber-400 border-2 border-amber-600 border-b-4 border-b-amber-700 text-white'
        : 'bg-emerald-500 hover:bg-emerald-400 border-2 border-emerald-600 border-b-4 border-b-emerald-700 text-white';

    if (status === 'completed') {
        return (
            <div className="flex items-center gap-2 shrink-0 ml-auto">
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
                    className={`${paddingClass} rounded-2xl ${primaryColorClass} font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 flex items-center gap-1.5 cursor-pointer select-none`}
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
            className={`${paddingClass} rounded-2xl ${primaryColorClass} font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 flex items-center gap-1.5 cursor-pointer select-none ml-auto shrink-0`}
        >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            <span>{resolvedStartLabel}</span>
        </button>
    );
};

export default JLPTCardActionButtons;
