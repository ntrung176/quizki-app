import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import {
    getRoadmapStages,
    getRoadmapProgress,
    getStageStats,
    findCurrentActiveLessonId,
    loadRoadmapManifest,
    loadRoadmapStageChunk,
    loadRoadmapLessonById,
    hydrateRoadmapProgressFromCloud
} from '../../data/roadmap';
import RoadmapLessonModal from './RoadmapLessonModal';
import RoadmapStageHeaderBar from './RoadmapStageHeaderBar';
import RoadmapUnitBlock from './RoadmapUnitBlock';

/**
 * HomeLearningRoadmap Component - Authentic Duolingo Interactive Winding Path
 * 10 Japanese stages (Kana -> N5 -> N4 -> N3 -> N2 -> N1) backed by real QuizKi datasets,
 * lazy-loaded stage chunks, cloud progress sync, and automatic SRS integration after every lesson.
 */
const HomeLearningRoadmap = ({ isHighlighted = false, awardXP, userId, allCards = [], folders = [] }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { isKoreanMode, isEnglishMode } = useTargetLanguage();

    const langCode = isKoreanMode ? 'ko' : isEnglishMode ? 'en' : 'ja';

    const [stages, setStages] = useState(() => getRoadmapStages(langCode));
    const [activeStageChunk, setActiveStageChunk] = useState(null);
    const [isLoadingStage, setIsLoadingStage] = useState(false);
    const [progress, setProgress] = useState(() => getRoadmapProgress());
    const [selectedStageNum, setSelectedStageNum] = useState(1);
    const [activeLessonData, setActiveLessonData] = useState(null); // { lesson, stage, unlockStageOnPass }
    const [lockedHint, setLockedHint] = useState(null);

    // Load manifest for Japanese 10-stage curriculum
    useEffect(() => {
        if (langCode !== 'ja') {
            setStages(getRoadmapStages(langCode));
            setActiveStageChunk(null);
            return;
        }
        let mounted = true;
        loadRoadmapManifest().then((manifest) => {
            if (mounted && manifest?.stages?.length > 0) {
                setStages(manifest.stages);
            }
        });
        return () => { mounted = false; };
    }, [langCode]);

    // Sync roadmap progress with Firestore cloud so clearing browser storage preserves progress
    useEffect(() => {
        if (!userId) return;
        hydrateRoadmapProgressFromCloud(userId, getRoadmapProgress()).then((merged) => {
            if (merged) setProgress(merged);
        });
    }, [userId]);

    useEffect(() => {
        const handleProgressUpdate = () => {
            setProgress(getRoadmapProgress());
        };
        window.addEventListener('quizki-roadmap-updated', handleProgressUpdate);
        return () => window.removeEventListener('quizki-roadmap-updated', handleProgressUpdate);
    }, []);

    // Find current active lesson across all unlocked stages
    const currentActiveLessonId = useMemo(() => {
        return findCurrentActiveLessonId(stages, progress);
    }, [stages, progress]);

    // Auto-select stage containing active lesson on initial placement/load
    const hasAutoSelectedRef = React.useRef(false);
    useEffect(() => {
        if (hasAutoSelectedRef.current || !currentActiveLessonId || stages.length === 0) return;
        for (const st of stages) {
            if ((st.lessons || []).some((l) => l.id === currentActiveLessonId)) {
                setSelectedStageNum(st.stage);
                hasAutoSelectedRef.current = true;
                break;
            }
        }
    }, [stages, currentActiveLessonId]);

    // Lazy-load full stage chunk (units + questions + SRS items) whenever user selects a stage
    useEffect(() => {
        if (langCode !== 'ja') {
            const st = stages.find((s) => s.stage === selectedStageNum) || stages[0] || null;
            setActiveStageChunk(st);
            return;
        }
        let cancelled = false;
        setIsLoadingStage(true);
        loadRoadmapStageChunk(selectedStageNum)
            .then((chunk) => {
                if (!cancelled && chunk) setActiveStageChunk(chunk);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingStage(false);
            });
        return () => { cancelled = true; };
    }, [langCode, selectedStageNum, stages]);

    const currentStageMeta = useMemo(() => {
        return stages.find((s) => s.stage === selectedStageNum) || stages[0];
    }, [stages, selectedStageNum]);

    const currentStage = useMemo(() => {
        if (activeStageChunk && activeStageChunk.stage === selectedStageNum) {
            return activeStageChunk;
        }
        return currentStageMeta;
    }, [activeStageChunk, selectedStageNum, currentStageMeta]);

    const currentStageStats = useMemo(() => {
        return getStageStats(currentStage, progress);
    }, [currentStage, progress]);

    // Map lessonId -> index inside flat stage.lessons so unlock rules work across units cleanly
    const lessonGlobalIndexMap = useMemo(() => {
        const map = new Map();
        (currentStage?.lessons || []).forEach((l, i) => map.set(l.id, i));
        return map;
    }, [currentStage]);

    // Normalize units even for Korean/English legacy tracks
    const displayUnits = useMemo(() => {
        if (Array.isArray(currentStage?.units) && currentStage.units.length > 0 && currentStage.units[0]?.lessons) {
            return currentStage.units;
        }
        return [
            {
                id: `${currentStage?.id || 'unit'}_u1`,
                title: currentStage?.title || '',
                subtitle: currentStage?.sub || '',
                lessons: currentStage?.lessons || []
            }
        ];
    }, [currentStage]);

    const handleNodeClick = async (lesson, stage, isUnlocked) => {
        if (!isUnlocked) {
            setLockedHint(`Hoàn thành bài trước hoặc nhấn "Thi vượt chặng mở khóa" để vào Chặng ${stage.stage} nhé! 🔒`);
            setTimeout(() => setLockedHint(null), 3500);
            return;
        }
        if (Array.isArray(lesson.questions) && lesson.questions.length > 0) {
            setActiveLessonData({ lesson, stage, unlockStageOnPass: null });
            return;
        }
        setIsLoadingStage(true);
        const loaded = await loadRoadmapLessonById(stage.stage, lesson.id);
        setIsLoadingStage(false);
        if (loaded?.lesson) {
            setActiveLessonData({ lesson: loaded.lesson, stage: loaded.stage, unlockStageOnPass: null });
        }
    };

    // Duolingo-style Section Jump Test: pass Milestone of stage k-1 to unlock stage k directly
    const handleJumpTestStage = async (targetStageNum) => {
        const prevStageNum = Math.max(1, targetStageNum - 1);
        setIsLoadingStage(true);
        const prevStageChunk = await loadRoadmapStageChunk(prevStageNum);
        setIsLoadingStage(false);

        const lessons = prevStageChunk?.lessons || [];
        const milestone = lessons.find((l) => l.isMilestone) || lessons[lessons.length - 1];
        if (milestone && milestone.questions?.length > 0) {
            setActiveLessonData({
                lesson: milestone,
                stage: prevStageChunk,
                unlockStageOnPass: targetStageNum
            });
        }
    };

    return (
        <section
            id="home-learning-roadmap"
            className={`p-4 sm:p-6 bg-white/95 dark:bg-slate-900/95 rounded-3xl border-2 transition-all backdrop-blur-md shadow-xs ${
                isHighlighted
                    ? 'border-emerald-500 ring-4 ring-emerald-400/20'
                    : 'border-slate-200/80 dark:border-slate-800/80'
            }`}
        >
            {/* 1. ROADMAP HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-500/20 shrink-0">
                        🗺️
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                {t('roadmap.title', 'Lộ Trình Học Tương Tác')}
                            </h2>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 shrink-0">
                                {langCode === 'ja' ? 'Kana → N1 + Auto SRS' : 'Tương tác + SRS'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('roadmap.subtitle', 'Học theo sách giáo khoa, Kanji, Ngữ pháp & Đề JLPT — Tự động lưu vào SRS sau mỗi bài.')}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate(ROUTES.ONBOARDING)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-850 border-2 border-b-4 border-slate-200 dark:border-slate-700 rounded-xl transition-all self-start sm:self-auto cursor-pointer select-none active:translate-y-0.5 active:border-b-2"
                >
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('roadmap.retakeSurvey', 'Khảo sát trình độ')}</span>
                </button>
            </div>

            {/* 2. STAGE SELECTOR & ACTIVE HERO BAR */}
            <RoadmapStageHeaderBar
                stages={stages}
                progress={progress}
                selectedStageNum={selectedStageNum}
                onSelectStage={setSelectedStageNum}
                currentStage={currentStage}
                currentStageStats={currentStageStats}
                isLoadingStage={isLoadingStage}
                onJumpTestStage={langCode === 'ja' ? handleJumpTestStage : null}
            />

            {lockedHint && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <span>{lockedHint}</span>
                </div>
            )}

            {/* 3. MULTI-UNIT DUOLINGO WINDING PATH */}
            <div className="space-y-8">
                {displayUnits.map((unit, uIdx) => (
                    <RoadmapUnitBlock
                        key={unit.id || `unit_${uIdx}`}
                        unit={unit}
                        unitIndex={uIdx}
                        currentStage={currentStage}
                        lessonGlobalIndexMap={lessonGlobalIndexMap}
                        progress={progress}
                        currentActiveLessonId={currentActiveLessonId}
                        onNodeClick={handleNodeClick}
                    />
                ))}
            </div>

            {/* 4. INTERACTIVE LESSON RUNNER MODAL */}
            {activeLessonData && (
                <RoadmapLessonModal
                    lesson={activeLessonData.lesson}
                    stage={activeLessonData.stage}
                    targetLang={langCode}
                    awardXP={awardXP}
                    userId={userId}
                    allCards={allCards}
                    folders={folders}
                    unlockStageOnPass={activeLessonData.unlockStageOnPass}
                    onClose={() => setActiveLessonData(null)}
                    onLessonCompleted={() => setProgress(getRoadmapProgress())}
                />
            )}
        </section>
    );
};

export default HomeLearningRoadmap;
