import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAiCredits } from '../../hooks/useAiCredits';
import { getFeatureCreditCost } from '../../utils/aiCreditManager';
import { ROUTES } from '../../router';

/**
 * Compact clickable badge displaying live remaining AI Credits (and optional feature cost).
 * Follows Duolingo palette strictly (Emerald / Sky / Amber / Rose / Slate — zero purple).
 */
export const AiCreditPill = ({
    featureId = null,
    cost: explicitCost = null,
    remaining: propRemaining = null,
    isUnlimited: propUnlimited = null,
    compact = false,
    clickable = true,
    onClick = null,
    className = ''
}) => {
    const navigate = useNavigate();
    const { remaining: storeRemaining, isUnlimited: storeUnlimited, initialized } = useAiCredits();

    const effectiveUnlimited = propUnlimited !== null ? Boolean(propUnlimited) : storeUnlimited;
    const effectiveRemaining = propRemaining !== null && propRemaining !== undefined
        ? Number(propRemaining)
        : (initialized ? storeRemaining : 0);

    const actionCost = explicitCost !== null
        ? explicitCost
        : (featureId ? getFeatureCreditCost(featureId) : null);

    const isLow = !effectiveUnlimited && (
        actionCost ? effectiveRemaining < actionCost : effectiveRemaining <= 10
    );

    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) {
            onClick(e);
            return;
        }
        if (clickable) {
            navigate(ROUTES.UPGRADE);
        }
    };

    const Wrapper = clickable ? 'button' : 'div';

    return (
        <Wrapper
            type={clickable ? 'button' : undefined}
            onClick={clickable ? handleClick : undefined}
            title={
                effectiveUnlimited
                    ? 'Tài khoản Quản trị viên: Không giới hạn Credit AI'
                    : `Số dư hiện tại: ${effectiveRemaining.toLocaleString()} Credit AI${actionCost ? ` • Tốn ${actionCost} credit/lượt` : ''}. Bấm để nạp thêm Credit AI.`
            }
            className={`inline-flex items-center gap-1.5 rounded-xl border-2 font-black transition-all select-none ${
                compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
            } ${
                isLow
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                    : 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50'
            } ${clickable ? 'cursor-pointer active:scale-95' : ''} ${className}`}
        >
            <Zap className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isLow ? 'text-rose-500 fill-rose-500' : 'text-amber-500 fill-amber-400'} shrink-0`} />
            <span className="tabular-nums">
                {effectiveUnlimited ? '∞ Credit AI' : `${effectiveRemaining.toLocaleString()} Credit`}
            </span>
            {actionCost !== null && !effectiveUnlimited && (
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black border ${
                    isLow
                        ? 'bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200'
                        : 'bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-700 text-sky-600 dark:text-sky-300'
                }`}>
                    -{actionCost}⚡
                </span>
            )}
        </Wrapper>
    );
};

/**
 * Tiny inline cost indicator placed directly inside AI trigger buttons.
 */
export const AiCostTag = ({ featureId = null, cost: explicitCost = null, darkBg = false, className = '' }) => {
    const { isUnlimited } = useAiCredits();
    if (isUnlimited) return null;

    const cost = explicitCost !== null ? explicitCost : getFeatureCreditCost(featureId);

    return (
        <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none tracking-normal shrink-0 ${
                darkBg
                    ? 'bg-black/20 text-amber-200 border border-white/15'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/70'
            } ${className}`}
            title={`Tiêu tốn ${cost} Credit AI cho mỗi lần thực hiện thành công`}
        >
            <Zap className="w-2.5 h-2.5 fill-current shrink-0" />
            <span>{cost}</span>
        </span>
    );
};

export default AiCreditPill;
