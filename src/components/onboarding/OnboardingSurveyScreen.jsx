import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Check, Bell, Sparkles, Trophy, Flame,
    Compass, RotateCcw, Target
} from 'lucide-react';
import { FlagIcon } from '../ui/FlagIcon';
import { ROUTES } from '../../router';
import { auth } from '../../config/firebase';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import {
    ONBOARDING_LANGUAGES,
    NATIVE_LANGUAGES,
    DISCOVERY_SOURCES,
    LEARNING_MOTIVATIONS,
    PROFICIENCY_LEVELS,
    VALUE_PROPOSITIONS,
    DAILY_GOALS,
    STARTING_PATHS,
    PLACEMENT_QUESTIONS_JA,
    PLACEMENT_QUESTIONS_EN
} from './onboardingData';

const STORAGE_KEY = 'quizki_onboarding_survey';
const ROADMAP_KEY = 'quizki_user_roadmap';
const TOTAL_BASE_STEPS = 9; // Step 0 to 8

const getDiagnosedResult = (score) => {
    if (score >= 12) {
        return {
            level: 'n3',
            levelLabel: 'Cấp độ N3 (Trung cấp vững vàng)',
            desc: 'Bạn đã có vốn từ phong phú, nắm vững ngữ pháp liên kết và nhận diện sắc thái N3 rất tốt.',
            stage: 4,
            stageLabel: 'Chặng 4: N3 — 3,000 Từ vựng & Phản xạ Kaiwa AI'
        };
    } else if (score >= 9) {
        return {
            level: 'n4',
            levelLabel: 'Cấp độ N4 (Sơ cấp nâng cao)',
            desc: 'Bạn đã vững các thể động từ cơ bản và kính ngữ. Bước tiếp theo là chinh phục Kanji và cấu trúc N3.',
            stage: 3,
            stageLabel: 'Chặng 3: N4 — 1,500 Từ vựng, 300 Kanji & Thể động từ'
        };
    } else if (score >= 5) {
        return {
            level: 'n5_advanced',
            levelLabel: 'Cấp độ N5 Nâng cao',
            desc: 'Bạn nắm tốt bảng chữ cái và từ vựng cốt lõi. QuizKi sẽ giúp bạn kết nối từ vựng thành câu hoàn chỉnh.',
            stage: 2,
            stageLabel: 'Chặng 2: N5 — 800 Từ vựng & 100 Kanji cốt lõi'
        };
    } else {
        return {
            level: 'n5_scratch',
            levelLabel: 'Khởi đầu N5 (Nền tảng căn bản)',
            desc: 'Lộ trình tối ưu cho bạn là làm chủ bảng chữ cái Kana, phát âm chuẩn và 200 từ vựng căn bản.',
            stage: 1,
            stageLabel: 'Chặng 1: Nền tảng Bảng chữ cái & Phát âm'
        };
    }
};

const OnboardingSurveyScreen = () => {
    const navigate = useNavigate();
    const { t, setLanguage } = useLanguage();
    const { setTargetLanguage } = useTargetLanguage();

    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {
                targetLang: 'ja',
                nativeLang: 'vi',
                source: null,
                motivation: null,
                level: null,
                dailyGoal: 15,
                notifications: false,
                startingPath: null,
                placementScore: 0,
                diagnosedLevel: null
            };
        } catch (_) {
            return {
                targetLang: 'ja',
                nativeLang: 'vi',
                source: null,
                motivation: null,
                level: null,
                dailyGoal: 15,
                notifications: false,
                startingPath: null,
                placementScore: 0,
                diagnosedLevel: null
            };
        }
    });

    const [placementIndex, setPlacementIndex] = useState(0);
    const [placementScore, setPlacementScore] = useState(0);
    const [selectedPlacementOpt, setSelectedPlacementOpt] = useState(null);
    const [placementAnswered, setPlacementAnswered] = useState(false);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzingProgress, setAnalyzingProgress] = useState(0);

    // Save answers
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
        } catch (_) {}
    }, [answers]);

    // Lock body overflow so no background window scrolling occurs
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // Analyzing animation on final step
    useEffect(() => {
        if (step === 10) {
            setIsAnalyzing(true);
            setAnalyzingProgress(10);
            const interval = setInterval(() => {
                setAnalyzingProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setIsAnalyzing(false), 250);
                        return 100;
                    }
                    return prev + 20;
                });
            }, 120);
            return () => clearInterval(interval);
        }
    }, [step]);

    const canProceed = () => {
        switch (step) {
            case 0: return !!answers.targetLang;
            case 1: return !!answers.nativeLang;
            case 2: return !!answers.source;
            case 3: return !!answers.motivation;
            case 4: return !!answers.level;
            case 5: return true;
            case 6: return !!answers.dailyGoal;
            case 7: return true;
            case 8: return !!answers.startingPath;
            default: return true;
        }
    };

    const handleNext = () => {
        if (!canProceed()) return;

        if (step === 8) {
            if (answers.startingPath === 'test') {
                setStep(9);
                setPlacementIndex(0);
                setPlacementScore(0);
                setPlacementAnswered(false);
                setSelectedPlacementOpt(null);
                return;
            } else {
                setStep(10);
                return;
            }
        }

        if (step < 8) {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (step === 0) {
            navigate(ROUTES.HOME);
            return;
        }
        if (step === 9) {
            handlePlacementBack();
            return;
        }
        if (step === 10) {
            setStep(answers.startingPath === 'test' ? 9 : 8);
            return;
        }
        setStep(prev => prev - 1);
    };

    const handlePlacementBack = () => {
        if (placementIndex > 0) {
            setPlacementIndex(prev => prev - 1);
            setSelectedPlacementOpt(null);
            setPlacementAnswered(false);
        } else {
            setStep(8);
        }
    };

    const handleRequestNotification = async () => {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                setAnswers(prev => ({ ...prev, notifications: permission === 'granted' }));
            } catch (_) {}
        }
        setStep(8);
    };

    const placementQuestions = answers.targetLang === 'en' ? PLACEMENT_QUESTIONS_EN : PLACEMENT_QUESTIONS_JA;

    const handlePlacementSelect = (opt) => {
        if (placementAnswered) return;
        setSelectedPlacementOpt(opt);
        setPlacementAnswered(true);

        const currentQ = placementQuestions[placementIndex];
        const isCorrect = opt === currentQ.answer;
        if (isCorrect) {
            setPlacementScore(s => s + 1);
        }
    };

    const handlePlacementNext = () => {
        if (placementIndex < placementQuestions.length - 1) {
            setPlacementIndex(prev => prev + 1);
            setSelectedPlacementOpt(null);
            setPlacementAnswered(false);
        } else {
            const finalScore = (placementAnswered && selectedPlacementOpt === placementQuestions[placementIndex].answer)
                ? placementScore
                : placementScore;
            const diag = getDiagnosedResult(finalScore);
            setAnswers(prev => ({
                ...prev,
                placementScore: finalScore,
                diagnosedLevel: diag.level,
                startingStage: diag.stage
            }));
            setStep(10);
        }
    };

    const persistRoadmapData = () => {
        const isScratch = answers.startingPath === 'scratch';
        const diag = isScratch
            ? { level: 'n5_scratch', stage: 1, levelLabel: 'Khởi đầu N5 (Từ số 0)' }
            : getDiagnosedResult(answers.placementScore || 0);

        const bundle = {
            targetLang: answers.targetLang,
            nativeLang: answers.nativeLang,
            dailyGoal: answers.dailyGoal || 15,
            startingPath: answers.startingPath,
            placementScore: answers.placementScore || 0,
            diagnosedLevel: diag.level,
            startingStage: diag.stage,
            updatedAt: Date.now()
        };

        try {
            localStorage.setItem(ROADMAP_KEY, JSON.stringify(bundle));
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...answers, ...bundle }));
        } catch (_) {}

        return bundle;
    };

    const handleStartDirectStudy = () => {
        if (answers.targetLang && setTargetLanguage) {
            setTargetLanguage(answers.targetLang);
        }
        persistRoadmapData();
        try {
            localStorage.setItem('quizki_guest_mode', 'true');
        } catch (_) {}
        navigate(ROUTES.HOME, { state: { focusRoadmap: true, isGuest: true } });
    };

    const handleCreateProfile = () => {
        if (answers.targetLang && setTargetLanguage) {
            setTargetLanguage(answers.targetLang);
        }
        persistRoadmapData();
        navigate(`${ROUTES.LOGIN}?mode=register`);
    };

    const diagnosis = useMemo(() => {
        if (answers.startingPath === 'scratch') {
            return {
                level: 'n5_scratch',
                levelLabel: 'Khởi đầu N5 (Từ số 0)',
                desc: 'Lộ trình tối ưu cho bạn là làm quen bảng chữ cái Kana, phát âm chuẩn và 200 từ vựng căn bản.',
                stage: 1,
                stageLabel: 'Chặng 1: Nền tảng Bảng chữ cái & Phát âm'
            };
        }
        return getDiagnosedResult(answers.placementScore || 0);
    }, [answers.startingPath, answers.placementScore]);

    const progressPercent = step === 9
        ? Math.round(((placementIndex + 1) / placementQuestions.length) * 100)
        : step === 10
        ? 100
        : Math.round(((step + 1) / (TOTAL_BASE_STEPS + 1)) * 100);

    return (
        <div className="fixed inset-0 z-30 overflow-hidden bg-[#fdfbf7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white">
            {/* FIXED TOP HEADER - Progress Bar & Step Indicator */}
            <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 z-50 bg-[#fdfbf7]/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 flex items-center shadow-xs">
                <div className="max-w-xl w-full mx-auto flex items-center gap-4">
                    {/* Progress Bar */}
                    <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out shadow-xs"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                        {step === 9 ? `${placementIndex + 1}/${placementQuestions.length}` : step < 10 ? `${step + 1}/${TOTAL_BASE_STEPS}` : '100%'}
                    </span>
                </div>
            </header>

            {/* MIDDLE CONTENT AREA - Exactly Pinned Between Header and Footer */}
            <main className={`fixed top-14 sm:top-16 ${step <= 9 ? 'bottom-16 sm:bottom-20' : 'bottom-0'} left-0 right-0 z-40 overflow-y-auto flex flex-col items-center justify-center px-4 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}>
                <div className="max-w-xl w-full mx-auto -translate-y-6 sm:-translate-y-12 py-2">
                {/* STEP 0: TARGET LANGUAGE */}
                {step === 0 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Bước 1 / 8</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Bạn muốn học ngôn ngữ nào?
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Bạn có thể thay đổi hoặc học thêm ngôn ngữ khác bất kỳ lúc nào.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {ONBOARDING_LANGUAGES.map((lang) => {
                                const isSelected = answers.targetLang === lang.id;
                                return (
                                    <div
                                        key={lang.id}
                                        onClick={() => {
                                            setAnswers(prev => ({ ...prev, targetLang: lang.id }));
                                            if (setTargetLanguage) setTargetLanguage(lang.id);
                                        }}
                                        className={`p-3.5 sm:p-4 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3.5 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <FlagIcon countryCode={lang.code} className="w-8 h-6 rounded-sm shadow-xs object-cover shrink-0" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-sm sm:text-base">{lang.title}</h3>
                                                    {lang.tag && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${lang.tagColor}`}>
                                                            {lang.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{lang.sub}</p>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 1: NATIVE LANGUAGE */}
                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Bước 2 / 8</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Bạn nói ngôn ngữ nào tốt nhất?
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                QuizKi sẽ hiển thị phần giải nghĩa và chú thích ngữ pháp theo ngôn ngữ này.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {NATIVE_LANGUAGES.map((lang) => {
                                const isSelected = answers.nativeLang === lang.id;
                                return (
                                    <div
                                        key={lang.id}
                                        onClick={() => {
                                            setAnswers(prev => ({ ...prev, nativeLang: lang.id }));
                                            if (setLanguage) setLanguage(lang.id === 'vi' ? 'vi' : 'en');
                                        }}
                                        className={`p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <FlagIcon countryCode={lang.code} className="w-6 h-4.5 rounded-sm object-cover shrink-0" />
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-xs sm:text-sm truncate">{lang.title}</h3>
                                                <p className="text-[10px] text-slate-400 truncate">{lang.sub}</p>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 2: DISCOVERY SOURCE */}
                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Bước 3 / 8</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Bạn biết đến QuizKi từ đâu?
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Cảm ơn bạn đã lựa chọn nền tảng ngoại ngữ QuizKi.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {DISCOVERY_SOURCES.map((item) => {
                                const isSelected = answers.source === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setAnswers(prev => ({ ...prev, source: item.id }))}
                                        className={`p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-2 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-xl shrink-0">{item.icon}</span>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-xs sm:text-sm truncate">{item.title}</h3>
                                                <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 3: MOTIVATION */}
                {step === 3 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Bước 4 / 8</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Động lực chính khiến bạn học là gì?
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Chúng tôi sẽ ưu tiên từ vựng và chủ đề hội thoại sát mục tiêu của bạn.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                            {LEARNING_MOTIVATIONS.map((item) => {
                                const isSelected = answers.motivation === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setAnswers(prev => ({ ...prev, motivation: item.id }))}
                                        className={`p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-2xl shrink-0">{item.icon}</span>
                                            <div>
                                                <h3 className="font-bold text-xs sm:text-sm">{item.title}</h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.sub}</p>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 4: PROFICIENCY LEVEL */}
                {step === 4 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Bước 5 / 8</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Trình độ hiện tại của bạn ở mức nào?
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Chọn mức độ bạn cảm thấy phù hợp nhất với bản thân lúc này.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                            {PROFICIENCY_LEVELS.map((item) => {
                                const isSelected = answers.level === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setAnswers(prev => ({ ...prev, level: item.id }))}
                                        className={`p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-2xl shrink-0">{item.icon}</span>
                                            <div>
                                                <h3 className="font-bold text-xs sm:text-sm">{item.title}</h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.sub}</p>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 5: VALUE PROPOSITIONS */}
                {step === 5 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Bước 6 / 8</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Đây là những gì QuizKi mang lại cho bạn 🎉
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Phương pháp khoa học giúp bạn học ít hơn nhưng nhớ lâu hơn gấp 3 lần.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {VALUE_PROPOSITIONS.map((prop, idx) => (
                                <div
                                    key={idx}
                                    className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="text-2xl mb-1.5">{prop.icon}</div>
                                        <h3 className="font-black text-xs sm:text-sm text-slate-800 dark:text-white leading-snug">
                                            {prop.title}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            {prop.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 6: DAILY COMMITMENT */}
                {step === 6 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Bước 7 / 8</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Mỗi ngày bạn muốn dành bao nhiêu thời gian?
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Duy trì đều đặn 15 phút mỗi ngày mang lại hiệu quả vượt trội.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {DAILY_GOALS.map((goal) => {
                                const isSelected = answers.dailyGoal === goal.minutes;
                                return (
                                    <div
                                        key={goal.id}
                                        onClick={() => setAnswers(prev => ({ ...prev, dailyGoal: goal.minutes }))}
                                        className={`p-3.5 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-2xl shrink-0">{goal.icon}</span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h3 className="font-black text-xs sm:text-sm">{goal.title}</h3>
                                                    {goal.isRecommended && (
                                                        <span className="text-[9px] font-black uppercase px-1 rounded-sm bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                            Chuẩn
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 truncate">{goal.sub}</p>
                                            </div>
                                        </div>

                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 7: NOTIFICATION */}
                {step === 7 && (
                    <div className="space-y-4 text-center max-w-sm mx-auto animate-fade-in">
                        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-200 dark:border-amber-800 flex items-center justify-center shadow-md shadow-amber-500/10">
                            <Bell className="w-8 h-8 text-amber-500 animate-bounce" />
                        </div>

                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Bước 8 / 8</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Giữ vững ngọn lửa Streak mỗi ngày 🔥
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Nhận một thông báo ngắn mỗi ngày để không bị quên từ vựng đến hạn ôn tập SRS.
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleRequestNotification}
                                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
                            >
                                <Bell className="w-4 h-4" />
                                <span>BẬT THÔNG BÁO NHẮC NHỞ</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 8: STARTING PATH */}
                {step === 8 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Lộ trình học</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                                Bạn muốn bắt đầu từ đâu?
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Chọn điểm xuất phát để QuizKi xây dựng lộ trình học tập tối ưu nhất cho bạn.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {STARTING_PATHS.map((path) => {
                                const isSelected = answers.startingPath === path.id;
                                return (
                                    <div
                                        key={path.id}
                                        onClick={() => setAnswers(prev => ({ ...prev, startingPath: path.id }))}
                                        className={`p-4 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3.5 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <span className="text-3xl shrink-0">{path.icon}</span>
                                            <div>
                                                <h3 className="font-black text-sm sm:text-base">{path.title}</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{path.sub}</p>
                                            </div>
                                        </div>

                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 9: PLACEMENT TEST */}
                {step === 9 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                            <div className="flex items-center gap-2">
                                <span className="text-sky-600 dark:text-sky-400 font-mono uppercase tracking-wider font-black">
                                    Placement Test • Câu {placementIndex + 1}/{placementQuestions.length}
                                </span>
                                {placementQuestions[placementIndex].level && (
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        placementQuestions[placementIndex].level === 'N3'
                                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                                            : placementQuestions[placementIndex].level === 'N4'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    }`}>
                                        Cấp độ {placementQuestions[placementIndex].level}
                                    </span>
                                )}
                            </div>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">Đúng: {placementScore}</span>
                        </div>

                        {/* Question card */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-xs text-center min-h-[95px] flex items-center justify-center">
                            <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-relaxed">
                                {placementQuestions[placementIndex].question}
                            </h2>
                        </div>

                        {/* Options in 2x2 grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {placementQuestions[placementIndex].options.map((opt, i) => {
                                const currentQ = placementQuestions[placementIndex];
                                const isCorrect = opt === currentQ.answer;
                                const isSelected = selectedPlacementOpt === opt;

                                let cls = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-sky-400 hover:bg-sky-50/20';
                                if (placementAnswered) {
                                    if (isCorrect) {
                                        cls = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200';
                                    } else if (isSelected) {
                                        cls = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-200';
                                    } else {
                                        cls = 'opacity-40 border-slate-200 dark:border-slate-800 text-slate-400';
                                    }
                                }

                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        disabled={placementAnswered}
                                        onClick={() => handlePlacementSelect(opt)}
                                        className={`p-3.5 rounded-2xl border-2 border-b-4 font-bold text-xs sm:text-sm text-left flex items-center justify-between transition-all select-none active:translate-y-0.5 active:border-b-2 cursor-pointer ${cls}`}
                                    >
                                        <span className="truncate mr-2">{opt}</span>
                                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
                                            {i + 1}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Explanation */}
                        {placementAnswered && (
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 animate-fade-in flex items-center gap-2.5">
                                <span className="text-lg shrink-0">
                                    {selectedPlacementOpt === placementQuestions[placementIndex].answer ? '✅' : '💡'}
                                </span>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {placementQuestions[placementIndex].explanation}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 10: ROADMAP ANALYSIS */}
                {step === 10 && (
                    <div className="space-y-4 animate-fade-in">
                        {isAnalyzing ? (
                            <div className="text-center py-10 space-y-4 max-w-sm mx-auto">
                                <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 dark:border-emerald-700 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-emerald-500 animate-spin" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                        Đang thiết lập lộ trình học tối ưu...
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Phân tích kết quả & cấu hình thuật toán SRS theo mục tiêu {answers.dailyGoal} phút/ngày.
                                    </p>
                                </div>
                                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                                        style={{ width: `${analyzingProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-center sm:text-left">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black uppercase tracking-wider mb-1.5">
                                        <Trophy className="w-3.5 h-3.5" /> Lộ trình đã sẵn sàng
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                        Kế hoạch học tập dành riêng cho bạn!
                                    </h1>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {diagnosis.desc}
                                    </p>
                                </div>

                                {/* Overview Badges */}
                                <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs text-center">
                                    <div className="p-1 border-r border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Ngôn ngữ</span>
                                        <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white mt-0.5 block truncate">
                                            {answers.targetLang === 'ja' ? 'Tiếng Nhật 🇯🇵' : answers.targetLang === 'en' ? 'Tiếng Anh 🇬🇧' : 'Tiếng Hàn 🇰🇷'}
                                        </span>
                                    </div>
                                    <div className="p-1 border-r border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Mỗi ngày</span>
                                        <span className="text-xs sm:text-sm font-black text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                                            <Flame className="w-3.5 h-3.5 fill-amber-500" /> {answers.dailyGoal}p
                                        </span>
                                    </div>
                                    <div className="p-1">
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Điểm khởi đầu</span>
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                                            Chặng {diagnosis.stage}
                                        </span>
                                    </div>
                                </div>

                                {/* Recommended Stage Box */}
                                <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-700 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-2xl">🎯</span>
                                        <div className="min-w-0">
                                            <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                                                Khuyến nghị xuất phát
                                            </span>
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                {diagnosis.stageLabel}
                                            </h4>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-500 text-white shrink-0 shadow-xs">
                                        Đã xếp lớp
                                    </span>
                                </div>

                                {/* Final CTAs */}
                                <div className="space-y-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCreateProfile}
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
                                    >
                                        <span>TẠO HỒ SƠ ĐỂ LƯU TIẾN TRÌNH</span>
                                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleStartDirectStudy}
                                        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-b-4 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer select-none"
                                    >
                                        <span>BẮT ĐẦU HỌC NGAY THEO LỘ TRÌNH</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </main>

            {/* FIXED BOTTOM FRAME - PERMANENTLY DOCKED AT BOTTOM OF SCREEN */}
            {step <= 9 && (
                <footer className="fixed bottom-0 left-0 right-0 h-16 sm:h-20 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 flex items-center shadow-lg">
                    <div className="max-w-xl w-full mx-auto flex items-center justify-between gap-4">
                        {/* 1 duy nhất nút Quay lại */}
                        <button
                            type="button"
                            onClick={step === 9 ? handlePlacementBack : handleBack}
                            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 border-2 border-slate-300 dark:border-slate-700 transition-all cursor-pointer select-none active:translate-y-0.5"
                        >
                            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                            <span>
                                {step === 9 ? (placementIndex === 0 ? 'Thoát bài test' : 'Câu trước') : (step === 0 ? 'Trang chủ' : 'Quay lại')}
                            </span>
                        </button>

                        {/* 1 duy nhất nút Tiếp tục */}
                        {step === 9 ? (
                            placementAnswered ? (
                                <button
                                    type="button"
                                    onClick={handlePlacementNext}
                                    className="py-2.5 sm:py-3 px-6 sm:px-8 bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2 select-none"
                                >
                                    <span>{placementIndex < placementQuestions.length - 1 ? 'CÂU TIẾP THEO' : 'XEM KẾT QUẢ'}</span>
                                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handlePlacementNext}
                                    className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer select-none flex items-center gap-1"
                                >
                                    <span>Bỏ qua câu này</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className={`py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all select-none flex items-center justify-center gap-2 ${
                                    canProceed()
                                        ? 'bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 text-white cursor-pointer shadow-md'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-b-0 cursor-not-allowed opacity-60'
                                }`}
                            >
                                <span>{step === 8 && answers.startingPath === 'test' ? 'BẮT ĐẦU TEST TRÌNH ĐỘ' : 'TIẾP TỤC'}</span>
                                <ArrowRight className="w-4 h-4 stroke-[3]" />
                            </button>
                        )}
                    </div>
                </footer>
            )}
        </div>
    );
};

export default OnboardingSurveyScreen;
