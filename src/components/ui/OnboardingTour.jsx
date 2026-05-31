import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

const ONBOARDING_KEY = 'quizki-onboarding-done';

// Check / mark helpers (export for settings reset)
export const hasSeenOnboarding = (section) => {
    try {
        const seen = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}');
        return !!seen[section];
    } catch { return false; }
};
export const markOnboardingSeen = (section) => {
    try {
        const seen = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}');
        seen[section] = true;
        localStorage.setItem(ONBOARDING_KEY, JSON.stringify(seen));
    } catch { }
};
export const resetAllOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
};

// ==================== Tour steps targeting sidebar data-tour-id ====================
const TOUR_STEPS = [
    {
        target: '[data-tour-id="HOME"]',
        title: '🏠 Trang chủ',
        desc: 'Xem tổng quan tiến độ học tập, thống kê và truy cập nhanh các chức năng chính của ứng dụng.',
    },
    {
        target: '[data-tour-id="VOCAB"]',
        title: '📖 Học Từ Vựng',
        desc: 'Thêm từ mới, ôn tập từ vựng theo SRS (lặp lại ngắt quãng thông minh), xem & quản lý danh sách từ vựng, và học theo sách giáo khoa.',
    },
    {
        target: '[data-tour-id="KANJI"]',
        title: '🈶 Học Kanji',
        desc: 'Học Kanji theo lộ trình JLPT (N5→N1), ôn tập Kanji bằng SRS, xem Kanji đã lưu và tra cứu hơn 2500 chữ Kanji với nét viết.',
    },
    {
        target: '[data-tour-id="JLPT_TEST"]',
        title: '📝 Luyện thi JLPT',
        desc: 'Làm bài thi JLPT mô phỏng thực tế với đầy đủ phần từ vựng, ngữ pháp, đọc hiểu. Hỗ trợ từ N5 đến N1.',
    },
    {
        target: '[data-tour-id="HUB"]',
        title: '🏆 Bảng vinh danh',
        desc: 'Xem bảng xếp hạng vinh danh học tập và so tài cùng bạn bè!',
    },
    {
        target: '[data-tour-id="SETTINGS"]',
        title: '⚙️ Cài đặt',
        desc: 'Quản lý tài khoản, đổi tên hiển thị, chọn giao diện sáng/tối, điều chỉnh âm thanh hiệu ứng và nhạc nền.',
    },
    {
        target: '[data-tour-id="FEEDBACK"]',
        title: '💬 Phản hồi',
        desc: 'Gửi báo lỗi, đề xuất tính năng mới hoặc góp ý. Mọi phản hồi đều được đọc và xử lý!',
    },
];

// ==================== Main Component ====================
const OnboardingTour = ({ userId }) => {
    const [isActive, setIsActive] = useState(false);
    const [step, setStep] = useState(0);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [highlightRect, setHighlightRect] = useState(null);
    const tooltipRef = useRef(null);

    // Activate for first-time users
    useEffect(() => {
        if (!userId) return;
        if (!hasSeenOnboarding(`tour-v2-${userId}`)) {
            const t = setTimeout(() => setIsActive(true), 800);
            return () => clearTimeout(t);
        }
    }, [userId]);

    // Position tooltip near target
    const reposition = useCallback(() => {
        if (!isActive || step >= TOUR_STEPS.length) return;
        const el = document.querySelector(TOUR_STEPS[step].target);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        setHighlightRect({
            top: rect.top - 3, left: rect.left - 3,
            width: rect.width + 6, height: rect.height + 6,
        });

        const tt = tooltipRef.current;
        const ttH = tt?.offsetHeight || 180;
        const ttW = tt?.offsetWidth || 340;

        // Default: right side of the target
        let top = rect.top + rect.height / 2 - ttH / 2;
        let left = rect.right + 14;

        // Clamp vertical
        if (top + ttH > window.innerHeight - 16) top = window.innerHeight - ttH - 16;
        if (top < 16) top = 16;

        // If off-screen right → position below
        if (left + ttW > window.innerWidth - 16) {
            left = Math.max(16, rect.left);
            top = rect.bottom + 12;
        }

        setPos({ top, left });
    }, [isActive, step]);

    useEffect(() => {
        reposition();
        const id = requestAnimationFrame(reposition);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            cancelAnimationFrame(id);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [reposition]);

    const finish = useCallback(() => {
        setIsActive(false);
        if (userId) markOnboardingSeen(`tour-v2-${userId}`);
    }, [userId]);

    const next = () => step < TOUR_STEPS.length - 1 ? setStep(s => s + 1) : finish();
    const prev = () => step > 0 && setStep(s => s - 1);

    if (!isActive || step >= TOUR_STEPS.length) return null;

    const s = TOUR_STEPS[step];

    return (
        <>
            {/* Highlight ring — no dim overlay */}
            {highlightRect && (
                <div
                    className="fixed rounded-xl pointer-events-none transition-all duration-300 ease-out"
                    style={{
                        ...highlightRect,
                        zIndex: 10000,
                        boxShadow: '0 0 0 3px rgba(99,102,241,0.7), 0 0 16px 4px rgba(99,102,241,0.25)',
                    }}
                />
            )}

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className="fixed w-80 z-[10001] animate-fade-in"
                style={{ top: pos.top, left: pos.left }}
            >
                <div className="bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl shadow-black/40 border border-slate-600/40 overflow-hidden">
                    {/* Arrow left */}
                    {highlightRect && pos.left > (highlightRect.left + highlightRect.width) && (
                        <div
                            className="absolute -left-2 top-1/2 -translate-y-1/2"
                            style={{ zIndex: 1 }}
                        >
                            <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-transparent border-r-slate-800/95 dark:border-r-slate-900/95" />
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-5 pb-3">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[15px] font-bold text-white leading-tight">{s.title}</h3>
                                <p className="text-[13px] text-slate-300 mt-1.5 leading-relaxed">{s.desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-4 pt-1 flex items-center justify-between">
                        {/* Dots */}
                        <div className="flex items-center gap-1.5">
                            {TOUR_STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setStep(i)}
                                    className={`h-2 rounded-full transition-all duration-200 ${i === step ? 'bg-indigo-500 w-5' :
                                            i < step ? 'bg-indigo-400/50 w-2' :
                                                'bg-slate-600 w-2'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={finish}
                                className="text-[11px] text-slate-400 hover:text-white transition-colors px-2 py-1"
                            >
                                Bỏ qua
                            </button>
                            {step > 0 && (
                                <button
                                    onClick={prev}
                                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={next}
                                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-600/30"
                            >
                                {step === TOUR_STEPS.length - 1 ? (
                                    <>Hoàn thành <Sparkles className="w-3.5 h-3.5" /></>
                                ) : (
                                    <>Tiếp theo <ChevronRight className="w-3.5 h-3.5" /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inline animation */}
            <style>{`
                .animate-fade-in {
                    animation: tourFadeIn 0.25s ease-out;
                }
                @keyframes tourFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
};

export default OnboardingTour;
