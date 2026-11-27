import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Check, Bell, Sparkles, Trophy, Flame, Lock
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FlagIcon } from '../ui/FlagIcon';
import { ROUTES } from '../../router';
import { auth, db, appId } from '../../config/firebase';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { ROADMAP_PROGRESS_KEY } from '../../data/roadmap/roadmapCloudSync';
import {
    ONBOARDING_LANGUAGES,
    NATIVE_LANGUAGES,
    DISCOVERY_SOURCES,
    LEARNING_MOTIVATIONS,
    PROFICIENCY_LEVELS,
    VALUE_PROPOSITIONS,
    DAILY_GOALS,
    STARTING_PATHS,
    PLACEMENT_QUESTIONS_JA
} from './onboardingData';
import {
    ROADMAP_STAGE_SUMMARIES,
    getScratchDiagnosis,
    checkAdaptiveCeiling,
    evaluatePlacementPerformance
} from './placementEvaluator';

const STORAGE_KEY = 'quizki_onboarding_survey';
const ROADMAP_KEY = 'quizki_user_roadmap';
const TOTAL_BASE_STEPS = 9; // Step 0 to 8

const LEVEL_BADGE_COLORS = {
    Kana: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    N5: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    N4: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    N3: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    N2: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
    N1: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
};

const OnboardingSurveyScreen = () => {
    const navigate = useNavigate();
    const { t, setLanguage } = useLanguage();
    const { setTargetLanguage } = useTargetLanguage();

    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState(() => {
        const defaults = {
            targetLang: 'ja',
            nativeLang: 'vi',
            source: null,
            motivation: null,
            level: null,
            dailyGoal: 15,
            notifications: false,
            startingPath: null,
            placementScore: 0,
            placementAnswers: {},
            diagnosedLevel: null,
            startingStage: 1
        };
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return defaults;
            const parsed = JSON.parse(saved);
            return {
                ...defaults,
                ...parsed,
                // Tiếng Anh & Tiếng Hàn đang BETA -> luôn khoá mặc định về Tiếng Nhật
                targetLang: 'ja'
            };
        } catch (_) {
            return defaults;
        }
    });

    const [betaLangHint, setBetaLangHint] = useState('');
    const [placementIndex, setPlacementIndex] = useState(0);
    const [placementAnswers, setPlacementAnswers] = useState(() => answers.placementAnswers || {});
    const [adaptiveNotice, setAdaptiveNotice] = useState('');
    const [manualStageOverride, setManualStageOverride] = useState(null);

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
                setPlacementAnswers({});
                setAdaptiveNotice('');
                setManualStageOverride(null);
                return;
            } else {
                setManualStageOverride(null);
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

    const placementQuestions = PLACEMENT_QUESTIONS_JA;
    const selectedPlacementOpt = placementAnswers[placementIndex];
    const placementAnswered = selectedPlacementOpt !== undefined && selectedPlacementOpt !== '__SKIPPED__';
    const livePlacementStats = useMemo(
        () => evaluatePlacementPerformance(placementAnswers, placementQuestions),
        [placementAnswers, placementQuestions]
    );

    const handlePlacementSelect = (opt) => {
        if (placementAnswered) return;
        setPlacementAnswers(prev => ({ ...prev, [placementIndex]: opt }));
    };

    const finishPlacementAssessment = (finalAnswersMap, reason = '') => {
        const diag = evaluatePlacementPerformance(finalAnswersMap, placementQuestions);
        setAdaptiveNotice(reason);
        setManualStageOverride(null);
        setAnswers(prev => ({
            ...prev,
            targetLang: 'ja',
            placementAnswers: finalAnswersMap,
            placementScore: diag.totalCorrect,
            diagnosedLevel: diag.level,
            startingStage: diag.stage
        }));
        setStep(10);
    };

    const handlePlacementNext = () => {
        const updatedAnswers = placementAnswers[placementIndex] !== undefined
            ? placementAnswers
            : { ...placementAnswers, [placementIndex]: '__SKIPPED__' };

        if (placementAnswers[placementIndex] === undefined) {
            setPlacementAnswers(updatedAnswers);
        }

        const adaptiveCheck = checkAdaptiveCeiling(placementIndex, updatedAnswers, placementQuestions);
        if (adaptiveCheck.shouldStop || placementIndex >= placementQuestions.length - 1) {
            finishPlacementAssessment(updatedAnswers, adaptiveCheck.reason || '');
            return;
        }

        setPlacementIndex(prev => prev + 1);
    };

    const rawDiagnosis = useMemo(() => {
        if (answers.startingPath === 'scratch') {
            return getScratchDiagnosis();
        }
        return evaluatePlacementPerformance(
            Object.keys(placementAnswers).length > 0 ? placementAnswers : (answers.placementAnswers || {}),
            placementQuestions
        );
    }, [answers.startingPath, answers.placementAnswers, placementAnswers, placementQuestions]);

    const effectiveStage = manualStageOverride || rawDiagnosis.stage || 1;
    const diagnosis = useMemo(() => {
        if (!manualStageOverride || manualStageOverride === rawDiagnosis.stage) {
            return rawDiagnosis;
        }
        const overrideMeta = ROADMAP_STAGE_SUMMARIES[manualStageOverride] || rawDiagnosis;
        const unlockedStages = [];
        for (let s = 1; s <= manualStageOverride; s++) unlockedStages.push(s);
        return {
            ...rawDiagnosis,
            ...overrideMeta,
            unlockedStages
        };
    }, [rawDiagnosis, manualStageOverride]);

    const persistRoadmapData = async (chosenStage = effectiveStage) => {
        const stageNum = Math.max(1, Math.min(10, Number(chosenStage || 1)));
        const stageMeta = ROADMAP_STAGE_SUMMARIES[stageNum] || ROADMAP_STAGE_SUMMARIES[1];
        const unlockedStages = [];
        for (let s = 1; s <= stageNum; s++) unlockedStages.push(s);

        const bundle = {
            targetLang: 'ja',
            nativeLang: answers.nativeLang || 'vi',
            dailyGoal: answers.dailyGoal || 15,
            startingPath: answers.startingPath || 'scratch',
            placementScore: diagnosis.totalCorrect || 0,
            diagnosedLevel: stageMeta.level,
            startingStage: stageNum,
            tierBreakdown: diagnosis.tierBreakdown || [],
            updatedAt: Date.now()
        };

        let nextProgress = { completedLessons: {}, unlockedStages, lastUpdated: Date.now() };
        try {
            const rawPrev = localStorage.getItem(ROADMAP_PROGRESS_KEY);
            const prevProg = rawPrev ? JSON.parse(rawPrev) : {};
            const mergedStages = new Set([1, ...(prevProg.unlockedStages || []), ...unlockedStages]);
            nextProgress = {
                completedLessons: prevProg.completedLessons || {},
                unlockedStages: Array.from(mergedStages).sort((a, b) => a - b),
                lastUpdated: Date.now()
            };
            localStorage.setItem(ROADMAP_KEY, JSON.stringify(bundle));
            localStorage.setItem(ROADMAP_PROGRESS_KEY, JSON.stringify(nextProgress));
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...answers, ...bundle }));
            window.dispatchEvent(new CustomEvent('quizki-roadmap-updated', { detail: { newProgress: nextProgress } }));
        } catch (_) {}

        const activeUid = auth?.currentUser?.uid;
        if (activeUid && db && appId) {
            try {
                const roadmapRef = doc(db, `artifacts/${appId}/users/${activeUid}/settings/roadmap`);
                const snap = await getDoc(roadmapRef).catch(() => null);
                const cloudData = snap?.exists?.() ? snap.data() : {};
                const cloudStages = Array.isArray(cloudData.unlockedStages) ? cloudData.unlockedStages : [];
                const syncedStages = Array.from(new Set([1, ...cloudStages, ...nextProgress.unlockedStages])).sort((a, b) => a - b);

                await setDoc(roadmapRef, {
                    ...bundle,
                    completedLessons: { ...(cloudData.completedLessons || {}), ...(nextProgress.completedLessons || {}) },
                    unlockedStages: syncedStages,
                    lastUpdated: Date.now()
                }, { merge: true });

                const profileRef = doc(db, `artifacts/${appId}/users/${activeUid}/settings/profile`);
                await setDoc(profileRef, {
                    targetLanguage: 'ja',
                    dailyGoal: bundle.dailyGoal,
                    updatedAt: Date.now()
                }, { merge: true }).catch(() => {});
            } catch (err) {
                console.warn('Sync placement roadmap to Firestore warning:', err);
            }
        }

        return { bundle, stageNum };
    };

    const handleStartDirectStudy = async () => {
        if (setTargetLanguage) setTargetLanguage('ja');
        const { stageNum } = await persistRoadmapData(effectiveStage);
        const isSignedIn = Boolean(auth?.currentUser);
        if (!isSignedIn) {
            try {
                localStorage.setItem('quizki_guest_mode', 'true');
            } catch (_) {}
        }
        navigate(ROUTES.HOME, {
            state: {
                focusRoadmap: true,
                diagnosedStage: stageNum,
                ...(!isSignedIn ? { isGuest: true } : {})
            }
        });
    };

    const handleCreateProfile = async () => {
        if (setTargetLanguage) setTargetLanguage('ja');
        await persistRoadmapData(effectiveStage);
        navigate(`${ROUTES.LOGIN}?mode=register`);
    };

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
                                const isDisabled = Boolean(lang.disabled);
                                const isSelected = !isDisabled && answers.targetLang === lang.id;
                                return (
                                    <div
                                        key={lang.id}
                                        onClick={() => {
                                            if (isDisabled) {
                                                setBetaLangHint(`${lang.title} hiện đang trong giai đoạn BETA (sắp ra mắt). Vui lòng chọn Tiếng Nhật để bắt đầu lộ trình chuẩn!`);
                                                return;
                                            }
                                            setBetaLangHint('');
                                            setAnswers(prev => ({ ...prev, targetLang: lang.id }));
                                            if (setTargetLanguage) setTargetLanguage(lang.id);
                                        }}
                                        aria-disabled={isDisabled}
                                        className={`p-3.5 sm:p-4 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3.5 select-none ${
                                            isDisabled
                                                ? 'bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 opacity-75 cursor-not-allowed'
                                                : isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/20 cursor-pointer active:translate-y-0.5 active:border-b-2'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer active:translate-y-0.5 active:border-b-2'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <FlagIcon countryCode={lang.code} className={`w-8 h-6 rounded-sm shadow-xs object-cover shrink-0 ${isDisabled ? 'grayscale opacity-70' : ''}`} />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-black text-sm sm:text-base">{lang.title}</h3>
                                                    {lang.tag && (
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide ${lang.tagColor}`}>
                                                            {lang.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{lang.sub}</p>
                                            </div>
                                        </div>
                                        {isDisabled ? (
                                            <div className="w-7 h-7 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-800 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400" title="Phiên bản BETA - Sắp ra mắt">
                                                <Lock className="w-3.5 h-3.5" />
                                            </div>
                                        ) : (
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                            }`}>
                                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {betaLangHint && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs font-bold text-amber-800 dark:text-amber-200 animate-fade-in">
                                ⏳ {betaLangHint}
                            </div>
                        )}
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
                        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sky-600 dark:text-sky-400 font-mono uppercase tracking-wider font-black">
                                    Đánh giá trình độ • Câu {placementIndex + 1}/{placementQuestions.length}
                                </span>
                                {placementQuestions[placementIndex].level && (
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${LEVEL_BADGE_COLORS[placementQuestions[placementIndex].level] || LEVEL_BADGE_COLORS.N5}`}>
                                        {placementQuestions[placementIndex].level}
                                    </span>
                                )}
                                {placementQuestions[placementIndex].skill && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {placementQuestions[placementIndex].skill}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                                    Đúng: {livePlacementStats.totalCorrect}
                                </span>
                                {livePlacementStats.answeredCount >= 3 && (
                                    <button
                                        type="button"
                                        onClick={() => finishPlacementAssessment(placementAnswers, 'Bạn đã chọn chốt kết quả sớm dựa trên các cấp độ vừa trả lời.')}
                                        className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                    >
                                        Chấm điểm ngay →
                                    </button>
                                )}
                            </div>
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
                            <div className="space-y-3.5">
                                <div className="text-center sm:text-left">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black uppercase tracking-wider mb-1.5">
                                        <Trophy className="w-3.5 h-3.5" /> {diagnosis.levelLabel}
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                        Kế hoạch học tập dành riêng cho bạn!
                                    </h1>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {diagnosis.desc}
                                    </p>
                                    {adaptiveNotice && (
                                        <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 mt-1">
                                            🧭 {adaptiveNotice}
                                        </p>
                                    )}
                                </div>

                                {/* Overview Badges */}
                                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs text-center">
                                    <div className="p-1 border-r border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Ngôn ngữ</span>
                                        <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white mt-0.5 block truncate">
                                            Tiếng Nhật 🇯🇵
                                        </span>
                                    </div>
                                    <div className="p-1 border-r border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Mỗi ngày</span>
                                        <span className="text-xs sm:text-sm font-black text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                                            <Flame className="w-3.5 h-3.5 fill-amber-500" /> {answers.dailyGoal}p
                                        </span>
                                    </div>
                                    <div className="p-1">
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Xếp chặng</span>
                                        <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                                            Chặng {effectiveStage} / 10
                                        </span>
                                    </div>
                                </div>

                                {/* Per-tier Breakdown Bar (only shown after placement test) */}
                                {answers.startingPath === 'test' && Array.isArray(diagnosis.tierBreakdown) && diagnosis.tierBreakdown.length > 0 && (
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {diagnosis.tierBreakdown.map((tier) => {
                                            const tested = tier.answered > 0;
                                            const passed = tested && tier.correct >= 2;
                                            return (
                                                <div
                                                    key={tier.level}
                                                    className={`p-2 rounded-xl border text-center ${
                                                        !tested
                                                            ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 text-slate-400'
                                                            : passed
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400/70 text-emerald-700 dark:text-emerald-300'
                                                            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300/70 text-amber-700 dark:text-amber-300'
                                                    }`}
                                                >
                                                    <span className="text-[10px] font-black block">{tier.level}</span>
                                                    <span className="text-xs font-mono font-bold block mt-0.5">
                                                        {tested ? `${tier.correct}/${tier.total}` : '—'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Recommended Stage Box + Optional Stage Override */}
                                <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-700 space-y-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-2xl shrink-0">🎯</span>
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                                                    Mở khóa Chặng 1 → Chặng {effectiveStage}
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

                                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/50">
                                        <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                            Muốn điều chỉnh chặng xuất phát?
                                        </span>
                                        <select
                                            value={effectiveStage}
                                            onChange={(e) => setManualStageOverride(Number(e.target.value))}
                                            className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                                        >
                                            {Object.values(ROADMAP_STAGE_SUMMARIES).map((s) => (
                                                <option key={s.stage} value={s.stage}>
                                                    Chặng {s.stage} ({s.jlptLevel})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Final CTAs */}
                                {auth?.currentUser ? (
                                    <div className="space-y-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleStartDirectStudy}
                                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
                                        >
                                            <span>VÀO HỌC NGAY CHẶNG {effectiveStage} ({diagnosis.jlptLevel})</span>
                                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 pt-1">
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
                                            <span>BẮT ĐẦU HỌC NGAY CHẶNG {effectiveStage}</span>
                                        </button>
                                    </div>
                                )}
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
