import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, Plus, Brain, BarChart3, Layout, Settings, HelpCircle } from 'lucide-react';

const ONBOARDING_KEY = 'quizki-onboarding-seen';

// Check if onboarding has been seen for a specific section
export const hasSeenOnboarding = (section) => {
    try {
        const seen = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}');
        return !!seen[section];
    } catch { return false; }
};

// Mark onboarding as seen for a section
export const markOnboardingSeen = (section) => {
    try {
        const seen = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}');
        seen[section] = true;
        localStorage.setItem(ONBOARDING_KEY, JSON.stringify(seen));
    } catch { }
};

// Reset all onboarding
export const resetAllOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
};

// ==================== Onboarding Steps Data ====================
const ONBOARDING_DATA = {
    home: {
        title: 'Chào mừng đến QuizKi! 🎉',
        steps: [
            {
                icon: Layout,
                title: 'Trang chủ',
                description: 'Đây là trang chính, nơi bạn có thể xem tổng quan tiến độ học tập và truy cập nhanh các chức năng.',
                color: 'from-indigo-500 to-purple-600',
            },
            {
                icon: Plus,
                title: 'Thêm từ vựng',
                description: 'Bắt đầu bằng việc thêm từ vựng mới. Bạn có thể nhập thủ công hoặc dán danh sách JSON.',
                color: 'from-emerald-500 to-teal-600',
            },
            {
                icon: Brain,
                title: 'Ôn tập thông minh',
                description: 'Hệ thống SRS sẽ tự động nhắc bạn ôn tập đúng lúc. Trả lời đúng → khoảng cách tăng, sai → ôn lại ngay.',
                color: 'from-amber-500 to-orange-600',
            },
            {
                icon: BarChart3,
                title: 'Theo dõi tiến độ',
                description: 'Xem thống kê chi tiết về quá trình học tập, số từ đã master, và chuỗi học liên tục.',
                color: 'from-rose-500 to-pink-600',
            },
        ],
    },
    vocabAdd: {
        title: 'Thêm từ vựng 📝',
        steps: [
            {
                icon: Plus,
                title: 'Thêm thủ công',
                description: 'Nhập từ vựng (Nhật), nghĩa (Việt), và bấm AI Hỗ trợ để tự động điền thông tin chi tiết.',
                color: 'from-blue-500 to-indigo-600',
            },
            {
                icon: BookOpen,
                title: 'Thêm bằng JSON',
                description: 'Dán danh sách JSON để thêm nhiều từ cùng lúc. Copy JSON mẫu để bắt đầu nhanh hơn.',
                color: 'from-emerald-500 to-teal-600',
            },
        ],
    },
    vocabReview: {
        title: 'Ôn tập từ vựng 🔥',
        steps: [
            {
                icon: Brain,
                title: 'Các chế độ ôn tập',
                description: 'Bạn có thể ôn theo cách đọc, đồng nghĩa, hoặc ngữ cảnh. Chế độ hỗn hợp sẽ trộn tất cả.',
                color: 'from-orange-500 to-amber-600',
            },
            {
                icon: Sparkles,
                title: 'Nhập đáp án',
                description: 'Nhập đáp án rồi bấm Enter. Nếu sai, nhập lại từ đúng để ghi nhớ sâu hơn.',
                color: 'from-violet-500 to-purple-600',
            },
        ],
    },
    kanjiStudy: {
        title: 'Học Kanji ✍️',
        steps: [
            {
                icon: BookOpen,
                title: 'Lộ trình học',
                description: 'Kanji được chia theo cấp độ JLPT. Bắt đầu từ N5 và tiến dần lên.',
                color: 'from-red-500 to-rose-600',
            },
            {
                icon: Brain,
                title: 'Bài kiểm tra',
                description: 'Sau khi học, làm bài kiểm tra để ghi nhớ. Bao gồm nhận diện nghĩa, cách đọc, và viết Kanji.',
                color: 'from-teal-500 to-cyan-600',
            },
        ],
    },
    settings: {
        title: 'Cài đặt ⚙️',
        steps: [
            {
                icon: Settings,
                title: 'Tùy chỉnh',
                description: 'Điều chỉnh âm lượng hiệu ứng, nhạc nền, chế độ sáng/tối theo sở thích.',
                color: 'from-gray-500 to-slate-600',
            },
            {
                icon: HelpCircle,
                title: 'Phản hồi',
                description: 'Gửi phản hồi, báo lỗi hoặc đề xuất tính năng mới cho ứng dụng.',
                color: 'from-indigo-500 to-blue-600',
            },
        ],
    },
};

// ==================== Onboarding Modal Component ====================
const OnboardingTour = ({ section, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const data = ONBOARDING_DATA[section];
    if (!data) return null;

    useEffect(() => {
        if (!hasSeenOnboarding(section)) {
            // Small delay so page renders first
            const timer = setTimeout(() => setIsVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, [section]);

    const handleNext = () => {
        if (currentStep < data.steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const handleComplete = () => {
        markOnboardingSeen(section);
        setIsVisible(false);
        onComplete?.();
    };

    const handleSkip = () => {
        markOnboardingSeen(section);
        setIsVisible(false);
        onComplete?.();
    };

    if (!isVisible) return null;

    const step = data.steps[currentStep];
    const StepIcon = step.icon;
    const progress = ((currentStep + 1) / data.steps.length) * 100;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={handleSkip}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
                style={{ animation: 'scaleIn 0.3s ease-out' }}
            >
                {/* Header gradient */}
                <div className={`bg-gradient-to-r ${step.color} p-6 pb-12 relative`}>
                    <button
                        onClick={handleSkip}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-2">
                        {data.title}
                    </p>
                    <h3 className="text-white text-xl font-black">{step.title}</h3>
                </div>

                {/* Icon circle */}
                <div className="flex justify-center -mt-8 relative z-10">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-gray-800`}>
                        <StepIcon className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-4 text-center space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        {step.description}
                    </p>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-2">
                        {data.steps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${i === currentStep
                                        ? 'w-6 bg-indigo-500'
                                        : i < currentStep
                                            ? 'w-1.5 bg-indigo-300'
                                            : 'w-1.5 bg-gray-200 dark:bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex gap-3 pt-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" /> Quay lại
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className={`flex-1 py-2.5 px-4 bg-gradient-to-r ${step.color} text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-1 shadow-lg`}
                        >
                            {currentStep < data.steps.length - 1 ? (
                                <>Tiếp theo <ChevronRight className="w-4 h-4" /></>
                            ) : (
                                <>Bắt đầu! <Sparkles className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>

                    {/* Skip link */}
                    <button
                        onClick={handleSkip}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Bỏ qua hướng dẫn
                    </button>
                </div>
            </div>

            {/* Inject animation keyframes */}
            <style>{`
                @keyframes scaleIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default OnboardingTour;
