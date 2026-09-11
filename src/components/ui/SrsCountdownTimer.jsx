import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

const SrsCountdownTimer = ({ targetMs, onExpire, label = 'TIẾP SAU' }) => {
    const validTargetMs = typeof targetMs === 'number' && !isNaN(targetMs) && targetMs > 0 ? targetMs : 0;
    const [secondsLeft, setSecondsLeft] = useState(() =>
        validTargetMs > 0 ? Math.max(0, Math.ceil((validTargetMs - Date.now()) / 1000)) : 0
    );
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    useEffect(() => {
        if (!validTargetMs) return;

        const checkTime = () => {
            const left = Math.max(0, Math.ceil((validTargetMs - Date.now()) / 1000));
            setSecondsLeft(left);
            if (left <= 0) {
                if (onExpireRef.current) onExpireRef.current();
                return false;
            }
            return true;
        };

        if (!checkTime()) return;

        const timer = setInterval(() => {
            if (!checkTime()) {
                clearInterval(timer);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [validTargetMs]);

    if (secondsLeft <= 0 || !validTargetMs) {
        return null;
    }

    const hours = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    const secs = secondsLeft % 60;
    const pad = (n) => String(n).padStart(2, '0');
    const formatted = hours > 0
        ? `${pad(hours)}:${pad(mins)}:${pad(secs)}`
        : `${pad(mins)}:${pad(secs)}`;

    return (
        <button
            disabled
            className="md:mt-3 px-5 py-2.5 md:w-full rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 min-h-[42px]"
        >
            <Clock className="w-3.5 h-3.5 animate-spin-slow shrink-0" />
            <span>{label}: {formatted}</span>
        </button>
    );
};

export default SrsCountdownTimer;
