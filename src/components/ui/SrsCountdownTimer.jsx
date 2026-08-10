import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const SrsCountdownTimer = ({ targetMs, onExpire, label = 'TIẾP SAU' }) => {
    const [secondsLeft, setSecondsLeft] = useState(() =>
        Math.max(0, Math.ceil((targetMs - Date.now()) / 1000))
    );

    useEffect(() => {
        setSecondsLeft(Math.max(0, Math.ceil((targetMs - Date.now()) / 1000)));
        const timer = setInterval(() => {
            const left = Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
            setSecondsLeft(left);
            if (left <= 0) {
                clearInterval(timer);
                if (onExpire) onExpire();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetMs, onExpire]);

    if (secondsLeft <= 0) {
        return null;
    }

    const hours = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    const secs = secondsLeft % 60;
    const pad = (n) => String(n).padStart(2, '0');
    const formatted = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;

    return (
        <button
            disabled
            className="md:mt-4 px-4 py-2.5 md:w-full rounded-xl text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase transition-all bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 min-h-[44px]"
        >
            <Clock className="w-3.5 h-3.5 animate-spin-slow shrink-0" />
            <span>{label}: {formatted}</span>
        </button>
    );
};

export default SrsCountdownTimer;
