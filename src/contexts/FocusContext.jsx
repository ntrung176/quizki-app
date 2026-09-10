import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { showToast } from '../utils/toast';
import { playFocusStartSound, playBreakReminderSound, playFocusCompleteSound } from '../utils/soundEffects';

const FocusContext = createContext();

const STORAGE_KEY_STATS = 'quizki_focus_stats';
const STORAGE_KEY_CONFIG = 'quizki_focus_config';

/**
 * Chia tổng thời gian người dùng chọn thành các chu kỳ Pomodoro chuẩn (25 phút/phiên tập trung),
 * nghỉ ngắn 5 phút giữa các phiên, và cứ mỗi 2 phiên tập trung thì được nghỉ dài 10 phút.
 */
export const buildFocusSchedule = (totalMinutes, skipBreaks = false) => {
    const mins = Math.max(25, totalMinutes || 25);
    if (skipBreaks || mins <= 25) {
        return [
            {
                id: 'focus-1',
                type: 'focus',
                durationMinutes: mins,
                durationSeconds: mins * 60,
                periodIndex: 1,
                totalPeriods: 1
            }
        ];
    }

    const schedule = [];
    let remaining = mins;
    const focusChunks = [];

    // Chia thành các đoạn chuẩn Pomodoro 25 phút
    while (remaining > 0) {
        if (remaining >= 25) {
            focusChunks.push(25);
            remaining -= 25;
        } else {
            focusChunks.push(remaining);
            remaining = 0;
        }
    }

    const totalFocusCount = focusChunks.length;

    focusChunks.forEach((chunkMins, idx) => {
        schedule.push({
            id: `focus-${idx + 1}`,
            type: 'focus',
            durationMinutes: chunkMins,
            durationSeconds: chunkMins * 60,
            periodIndex: idx + 1,
            totalPeriods: totalFocusCount
        });

        // Thêm nghỉ giải lao ở giữa các phiên tập trung:
        // Cứ mỗi 2 phiên học (sau phiên 2, 4, 6...) thì nghỉ dài 10 phút, các phiên khác nghỉ ngắn 5 phút
        if (idx < totalFocusCount - 1) {
            const isLongBreak = (idx + 1) % 2 === 0;
            const breakMins = isLongBreak ? 10 : 5;
            schedule.push({
                id: `break-${idx + 1}`,
                type: 'break',
                isLongBreak,
                durationMinutes: breakMins,
                durationSeconds: breakMins * 60,
                breakIndex: idx + 1,
                totalBreaks: totalFocusCount - 1
            });
        }
    });

    return schedule;
};

export const FocusProvider = ({ children }) => {
    // Configuration states (Mặc định các mốc Pomodoro: 25, 50, 75, 100...)
    const [targetMinutes, setTargetMinutes] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.targetMinutes) {
                    return Math.max(25, Math.round(parsed.targetMinutes / 25) * 25);
                }
            }
        } catch (e) {}
        return 50;
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

    // Schedule queue
    const [sessionSchedule, setSessionSchedule] = useState([]);
    const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);

    const timerRef = useRef(null);
    const scheduleRef = useRef([]);
    const scheduleIndexRef = useRef(0);
    const statusRef = useRef('idle');

    // Synchronize refs for zero-stale closure access
    useEffect(() => {
        scheduleRef.current = sessionSchedule;
    }, [sessionSchedule]);

    useEffect(() => {
        scheduleIndexRef.current = currentScheduleIndex;
    }, [currentScheduleIndex]);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    const currentPeriod = sessionSchedule[currentScheduleIndex] || null;
    const nextPeriod = sessionSchedule[currentScheduleIndex + 1] || null;

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

    // Advance to next period cleanly
    const advanceToNextPeriod = useCallback(() => {
        const schedule = scheduleRef.current;
        const currIdx = scheduleIndexRef.current;
        if (!schedule || schedule.length === 0) return;

        const currentItem = schedule[currIdx];
        const nextIdx = currIdx + 1;

        if (currentItem && currentItem.type === 'focus') {
            setStats(prev => ({
                ...prev,
                totalFocusMinutes: prev.totalFocusMinutes + currentItem.durationMinutes
            }));
        }

        if (nextIdx < schedule.length) {
            const nextItem = schedule[nextIdx];
            scheduleIndexRef.current = nextIdx;
            setCurrentScheduleIndex(nextIdx);
            setCurrentMode(nextItem.type);
            setStatus(nextItem.type === 'focus' ? 'focusing' : 'break');
            setTotalSeconds(nextItem.durationSeconds);
            setSecondsLeft(nextItem.durationSeconds);

            if (nextItem.type === 'break') {
                playBreakReminderSound();
                const breakTypeStr = nextItem.isLongBreak ? 'nghỉ dài' : 'nghỉ giải lao';
                showToast(`☕ Đã xong phiên tập trung! Hãy ${breakTypeStr} ${nextItem.durationMinutes} phút nhé.`, 'success', 5000);
            } else {
                playFocusStartSound();
                showToast(`🎯 Hết giờ nghỉ! Bắt đầu phiên tập trung (${nextItem.periodIndex}/${nextItem.totalPeriods}) - ${nextItem.durationMinutes} phút!`, 'info', 5000);
            }
        } else {
            // Completed all periods in the entire session!
            playFocusCompleteSound();
            setStats(prev => ({
                ...prev,
                completedSessions: prev.completedSessions + 1
            }));
            showToast(`🎉 Xuất sắc! Bạn đã hoàn thành trọn vẹn tất cả các phiên tập trung Pomodoro!`, 'success', 6000);
            setStatus('idle');
            setCurrentMode('focus');
            setSessionSchedule([]);
            setCurrentScheduleIndex(0);
            scheduleIndexRef.current = 0;
            scheduleRef.current = [];
        }
    }, []);

    // Timer Ticker Effect
    useEffect(() => {
        if (status === 'focusing' || status === 'break') {
            if (timerRef.current) clearInterval(timerRef.current);

            timerRef.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        setTimeout(() => {
                            advanceToNextPeriod();
                        }, 0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [status, currentScheduleIndex, advanceToNextPeriod]);

    // Actions
    const startFocusSession = (customMins = targetMinutes, customSkipBreaks = skipBreaks) => {
        const mins = customMins || 50;
        const schedule = buildFocusSchedule(mins, customSkipBreaks);
        setTargetMinutes(mins);
        setSkipBreaks(customSkipBreaks);
        setSessionSchedule(schedule);
        setCurrentScheduleIndex(0);
        scheduleRef.current = schedule;
        scheduleIndexRef.current = 0;

        const firstItem = schedule[0];
        setCurrentMode(firstItem.type);
        setTotalSeconds(firstItem.durationSeconds);
        setSecondsLeft(firstItem.durationSeconds);
        setStatus('focusing');
        playFocusStartSound();

        // Trigger full screen mode for maximum focus
        try {
            if (typeof document !== 'undefined' && document.documentElement && document.documentElement.requestFullscreen && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } catch (e) {}

        const focusText = firstItem.totalPeriods > 1 
            ? `Phiên 1/${firstItem.totalPeriods} (${firstItem.durationMinutes} phút)` 
            : `${firstItem.durationMinutes} phút`;
        showToast(`🎯 Đã bắt đầu phiên tập trung: ${focusText}!`, 'success');
    };

    const pauseSession = () => {
        if (status === 'focusing' || status === 'break') {
            setPreviousStatus(status);
            setStatus('paused');
        }
    };

    const resumeSession = () => {
        if (status === 'paused') {
            setStatus(previousStatus || (currentMode === 'break' ? 'break' : 'focusing'));
            if (currentMode === 'focus') {
                playFocusStartSound();
            }
        }
    };

    const skipToNextPeriod = () => {
        if (status === 'idle') return;
        advanceToNextPeriod();
    };

    const stopSession = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus('idle');
        setSecondsLeft(0);
        setTotalSeconds(0);
        setCurrentMode('focus');
        setSessionSchedule([]);
        setCurrentScheduleIndex(0);
        scheduleRef.current = [];
        scheduleIndexRef.current = 0;
        showToast('Đã dừng phiên tập trung.', 'info');
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Calculate break info text for setup view
    const getBreakInfoText = (mins, isSkip) => {
        if (isSkip) return 'Bỏ qua giờ nghỉ ngơi (học liên tục).';
        if (mins <= 25) return `1 phiên tập trung (25 phút), không nghỉ giữa giờ.`;
        const schedule = buildFocusSchedule(mins, isSkip);
        const focusItems = schedule.filter(s => s.type === 'focus');
        const breakItems = schedule.filter(s => s.type === 'break');
        const shortBreaks = breakItems.filter(b => !b.isLongBreak).length;
        const longBreaks = breakItems.filter(b => b.isLongBreak).length;

        let breakDesc = '';
        if (shortBreaks > 0 && longBreaks > 0) {
            breakDesc = `${shortBreaks} lần nghỉ ngắn (5 phút) & ${longBreaks} lần nghỉ dài (10 phút)`;
        } else if (longBreaks > 0) {
            breakDesc = `${longBreaks} lần nghỉ dài (10 phút)`;
        } else {
            breakDesc = `${shortBreaks} lần nghỉ ngắn (5 phút)`;
        }

        return `Bạn sẽ có ${breakDesc} giữa ${focusItems.length} phiên Pomodoro (${focusItems.map(f => `${f.durationMinutes}p`).join(', ')}).`;
    };

    // Up next display text
    const getUpNextText = () => {
        if (!nextPeriod) return 'Hoàn thành phiên học 🎉';
        if (nextPeriod.type === 'break') {
            return nextPeriod.isLongBreak ? `Nghỉ dài ${nextPeriod.durationMinutes} phút` : `Nghỉ giải lao ${nextPeriod.durationMinutes} phút`;
        }
        return `Phiên tập trung (${nextPeriod.periodIndex}/${nextPeriod.totalPeriods}) - ${nextPeriod.durationMinutes} phút`;
    };

    const value = useMemo(() => ({
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
        sessionSchedule,
        currentScheduleIndex,
        currentPeriod,
        nextPeriod,
        getUpNextText,
        startFocusSession,
        pauseSession,
        resumeSession,
        skipToNextPeriod,
        stopSession,
        formatTime,
        getBreakInfoText
    }), [
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
        sessionSchedule, 
        currentScheduleIndex, 
        currentPeriod, 
        nextPeriod, 
        advanceToNextPeriod
    ]);

    return (
        <FocusContext.Provider value={value}>
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
