import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { showToast } from '../utils/toast';
import { playCompletionFanfare, playCorrectSound } from '../utils/soundEffects';

const FocusContext = createContext();

const STORAGE_KEY_STATS = 'quizki_focus_stats';
const STORAGE_KEY_CONFIG = 'quizki_focus_config';

export const FocusProvider = ({ children }) => {
    // Configuration states
    const [targetMinutes, setTargetMinutes] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.targetMinutes || 40;
            }
        } catch (e) {}
        return 40;
    });

    const [skipBreaks, setSkipBreaks] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
            if (saved) {
                const parsed = JSON.parse(saved);
                return !!parsed.skipBreaks;
            }
        } catch (e) {}
        return false;
    });

    // Session stats
    const [stats, setStats] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_STATS);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return { completedSessions: 0, totalFocusMinutes: 0 };
    });

    // Active session state
    const [status, setStatus] = useState('idle'); // 'idle' | 'focusing' | 'break' | 'paused'
    const [previousStatus, setPreviousStatus] = useState('idle');
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [currentMode, setCurrentMode] = useState('focus'); // 'focus' | 'break'
    const [isModalOpen, setIsModalOpen] = useState(false);

    const timerRef = useRef(null);

    // Save config changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ targetMinutes, skipBreaks }));
        } catch (e) {}
    }, [targetMinutes, skipBreaks]);

    // Save stats changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
        } catch (e) {}
    }, [stats]);

    // Timer Ticker Effect
    useEffect(() => {
        if (status === 'focusing' || status === 'break') {
            timerRef.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        handleTimerCompletion();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [status, currentMode, skipBreaks, targetMinutes]);

    // Handle session / break transition
    const handleTimerCompletion = () => {
        playCompletionFanfare();

        if (currentMode === 'focus') {
            // Completed a focus session!
            const addedMinutes = Math.round(totalSeconds / 60);
            setStats(prev => ({
                completedSessions: prev.completedSessions + 1,
                totalFocusMinutes: prev.totalFocusMinutes + addedMinutes
            }));

            if (skipBreaks) {
                showToast(`🎉 Xuất sắc! Đã hoàn thành phiên tập trung ${addedMinutes} phút!`, 'success');
                setStatus('idle');
                setCurrentMode('focus');
            } else {
                // Determine break duration (5 min for short break, 15 min for long break after 4 sessions)
                const isLongBreak = (stats.completedSessions + 1) % 4 === 0;
                const breakMins = isLongBreak ? 15 : 5;
                const breakSecs = breakMins * 60;

                showToast(`🎉 Đã xong phiên tập trung! Hãy nghỉ giải lao ${breakMins} phút ☕`, 'success', 5000);
                setCurrentMode('break');
                setStatus('break');
                setSecondsLeft(breakSecs);
                setTotalSeconds(breakSecs);
            }
        } else {
            // Completed a break!
            showToast('🎯 Hết giờ nghỉ giải lao! Bắt đầu phiên tập trung mới nào!', 'info', 5000);
            setCurrentMode('focus');
            setStatus('idle');
        }
    };

    // Actions
    const startFocusSession = (customMins = targetMinutes, customSkipBreaks = skipBreaks) => {
        const mins = customMins || 40;
        const totalSecs = mins * 60;
        setTargetMinutes(mins);
        setSkipBreaks(customSkipBreaks);
        setCurrentMode('focus');
        setTotalSeconds(totalSecs);
        setSecondsLeft(totalSecs);
        setStatus('focusing');
        playCorrectSound();
        showToast(`🎯 Đã bắt đầu phiên tập trung ${mins} phút!`, 'success');
    };

    const pauseSession = () => {
        if (status === 'focusing' || status === 'break') {
            setPreviousStatus(status);
            setStatus('paused');
        }
    };

    const resumeSession = () => {
        if (status === 'paused') {
            setStatus(previousStatus || 'focusing');
        }
    };

    const stopSession = () => {
        setStatus('idle');
        setSecondsLeft(0);
        setTotalSeconds(0);
        setCurrentMode('focus');
        showToast('Đã dừng phiên tập trung.', 'info');
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Calculate break info text
    const getBreakInfoText = (mins, isSkip) => {
        if (isSkip) return 'Bỏ qua giờ nghỉ ngơi.';
        if (mins < 30) return 'Bạn sẽ có 1 lần nghỉ ngắn (5 phút).';
        if (mins < 60) return 'Bạn sẽ có 1 lần nghỉ ngắn (5 phút).';
        const breaks = Math.floor(mins / 30);
        return `Bạn sẽ có ${breaks} lần nghỉ (5 - 15 phút).`;
    };

    return (
        <FocusContext.Provider value={{
            targetMinutes,
            setTargetMinutes,
            skipBreaks,
            setSkipBreaks,
            stats,
            status,
            currentMode,
            secondsLeft,
            totalSeconds,
            isModalOpen,
            setIsModalOpen,
            startFocusSession,
            pauseSession,
            resumeSession,
            stopSession,
            formatTime,
            getBreakInfoText
        }}>
            {children}
        </FocusContext.Provider>
    );
};

export const useFocus = () => {
    const context = useContext(FocusContext);
    if (!context) {
        throw new Error('useFocus must be used within a FocusProvider');
    }
    return context;
};
