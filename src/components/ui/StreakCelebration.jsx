import React, { useState, useEffect, useMemo } from 'react';
import { Flame, Sparkles } from 'lucide-react';

const StreakCelebration = ({ dailyActivityLogs = [], currentCalculatedStreak = 0 }) => {
    const [show, setShow] = useState(false);
    const [displayStreak, setDisplayStreak] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [particles, setParticles] = useState([]);

    // Get today's local date string (YYYY-MM-DD)
    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Check if there is active study today (using today's UTC string since logs are saved in UTC dates)
    const hasActivityToday = useMemo(() => {
        const todayUTCStr = new Date().toISOString().split('T')[0];
        const todayLog = dailyActivityLogs.find(log => log.id === todayUTCStr);
        if (!todayLog) return false;
        return (todayLog.newWordsAdded || 0) > 0 || 
               (todayLog.newKanjiAdded || 0) > 0 || 
               (todayLog.reviewsDone || 0) > 0;
    }, [dailyActivityLogs]);

    const triggerCelebration = () => {
        const target = hasActivityToday ? currentCalculatedStreak : (currentCalculatedStreak + 1);
        const start = hasActivityToday ? Math.max(0, currentCalculatedStreak - 1) : currentCalculatedStreak;

        // Generate confetti particles
        const colors = ['#f59e0b', '#ef4444', '#f97316', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
        const shapes = ['circle', 'square', 'triangle'];
        const newParticles = Array.from({ length: 60 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 80 + Math.random() * 150;
            return {
                id: i,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance - 20,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                size: 6 + Math.random() * 8,
                rotation: Math.random() * 360,
                delay: Math.random() * 0.2
            };
        });
        setParticles(newParticles);

        // Reset and trigger show
        setIsAnimating(false);
        setDisplayStreak(start);
        setShow(true);

        // Play Sound
        const audio = new Audio('/sfx/duolingo-streak.mp3');
        audio.volume = 0.8;
        
        // Wait for pop-in to play sound and increment number
        setTimeout(() => {
            audio.play().catch(e => console.log('Audio autoplay blocked or failed:', e));
            setIsAnimating(true);
            
            // Increment the streak display
            setTimeout(() => {
                setDisplayStreak(target);
            }, 300);
        }, 500);
    };

    useEffect(() => {
        // Only run if dailyActivityLogs is loaded and the user has an active streak (or has active study today)
        if (currentCalculatedStreak === 0 && !hasActivityToday) {
            return;
        }

        const todayStr = getTodayStr();
        const lastCelebrated = localStorage.getItem('streak_last_celebrated');

        // Check if already celebrated today
        if (lastCelebrated !== todayStr) {
            localStorage.setItem('streak_last_celebrated', todayStr);
            const target = hasActivityToday ? currentCalculatedStreak : (currentCalculatedStreak + 1);
            localStorage.setItem('streak_count_backup', String(target));
            triggerCelebration();
        }
    }, [hasActivityToday, currentCalculatedStreak]);

    // Keyboard shortcut for testing: Shift + Alt + S
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.shiftKey && e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                triggerCelebration();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasActivityToday, currentCalculatedStreak]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-fade-in px-4">
            {/* Inline Custom CSS Animations */}
            <style>{`
                @keyframes flame-burst {
                    0% { transform: scale(0); opacity: 0; filter: brightness(2); }
                    60% { transform: scale(1.25); filter: brightness(1.2); }
                    100% { transform: scale(1); opacity: 1; filter: brightness(1); }
                }
                @keyframes fire-glow {
                    0%, 100% { filter: drop-shadow(0 0 15px rgba(249, 115, 22, 0.4)) drop-shadow(0 0 30px rgba(239, 68, 68, 0.2)); }
                    50% { filter: drop-shadow(0 0 25px rgba(249, 115, 22, 0.7)) drop-shadow(0 0 45px rgba(239, 68, 68, 0.4)); }
                }
                @keyframes streak-pop {
                    0% { transform: scale(0.8); }
                    50% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }
                @keyframes particle-fly {
                    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                    80% { opacity: 0.8; }
                    100% { transform: translate(var(--tw-x), var(--tw-y)) rotate(var(--tw-r)); opacity: 0; }
                }
                .animate-flame {
                    animation: flame-burst 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
                               fire-glow 2s ease-in-out infinite alternate 0.7s;
                }
                .animate-streak-num {
                    animation: streak-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                .particle {
                    animation: particle-fly 1.2s cubic-bezier(0.1, 0.8, 0.25, 1) forwards;
                }
            `}</style>

            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border border-slate-800/80 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden flex flex-col items-center">
                {/* Decorative background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

                {/* Confetti / Streak particles */}
                {isAnimating && particles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute w-2 h-2 pointer-events-none particle"
                        style={{
                            '--tw-x': `${p.x}px`,
                            '--tw-y': `${p.y}px`,
                            '--tw-r': `${p.rotation}deg`,
                            left: '50%',
                            top: '40%',
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            backgroundColor: p.color,
                            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'triangle' ? '0' : '2px',
                            clipPath: p.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none',
                            animationDelay: `${p.delay}s`
                        }}
                    />
                ))}

                {/* Flame Container */}
                <div className="relative w-36 h-36 flex items-center justify-center mb-6 animate-flame">
                    <svg viewBox="0 0 100 120" className="w-full h-full">
                        <defs>
                            <linearGradient id="outerFlameGrad" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#ea580c" />
                                <stop offset="70%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                            <linearGradient id="midFlameGrad" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#f97316" />
                            </linearGradient>
                            <linearGradient id="innerFlameGrad" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#facc15" />
                                <stop offset="100%" stopColor="#f59e0b" />
                            </linearGradient>
                        </defs>
                        {/* Outer layer */}
                        <path 
                            d="M50 5C50 5 82 35 82 68C82 86 67.5 99 50 99C32.5 99 18 86 18 68C18 42 38 22 38 22C38 22 41 33 50 33C59 33 50 5 50 5Z" 
                            fill="url(#outerFlameGrad)" 
                        />
                        {/* Middle layer */}
                        <path 
                            d="M50 25C50 25 72 48 72 70C72 82.5 62 91 50 91C38 91 28 82.5 28 70C28 50 42 38 42 38C42 38 44 46 50 46C56 46 50 25 50 25Z" 
                            fill="url(#midFlameGrad)" 
                        />
                        {/* Inner layer */}
                        <path 
                            d="M50 45C50 45 62 60 62 74C62 81 56 86 50 86C44 86 38 81 38 74C38 60 46 52 46 52C46 52 47.5 56 50 56C52.5 56 50 45 50 45Z" 
                            fill="url(#innerFlameGrad)" 
                        />
                    </svg>

                    {/* Streak Number directly inside the flame */}
                    <div className="absolute inset-0 flex items-end justify-center pb-5">
                        <span 
                            key={displayStreak}
                            className="text-4xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] animate-streak-num"
                        >
                            {displayStreak}
                        </span>
                    </div>
                </div>

                {/* Typography details */}
                <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-center gap-1.5 text-orange-400 font-extrabold tracking-widest text-xs uppercase">
                        <Sparkles className="w-3.5 h-3.5 fill-orange-400 animate-spin" style={{ animationDuration: '3s' }} />
                        Streak Luyện Tập!
                    </div>
                    <h2 className="text-2xl font-black text-white leading-tight">
                        {displayStreak} Ngày Liên Tiếp!
                    </h2>
                    <p className="text-slate-400 text-xs font-medium px-4 leading-relaxed">
                        Bạn đang học tập cực kỳ chăm chỉ. Hãy tiếp tục duy trì ngọn lửa học tập này nhé!
                    </p>
                </div>

                {/* Bouncy action button */}
                <button
                    onClick={() => setShow(false)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white text-sm font-black shadow-lg shadow-orange-500/25 border-b-4 border-orange-700 hover:border-orange-800 transition-all cursor-pointer uppercase tracking-wider"
                >
                    Tiếp tục học
                </button>
            </div>
        </div>
    );
};

export default StreakCelebration;
