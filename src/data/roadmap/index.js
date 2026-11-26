/**
 * Unified Roadmap Curriculum & Progress Management Service
 * Supports Japanese (10-Stage Sharded Data-Driven Path), Korean, and English tracks.
 */

import { JA_ROADMAP_STAGES } from './jaCurriculum';
import { KO_ROADMAP_STAGES } from './koCurriculum';
import { EN_ROADMAP_STAGES } from './enCurriculum';
import {
    ROADMAP_PROGRESS_KEY,
    mergeProgressObjects,
    saveProgressToFirestore,
    hydrateRoadmapProgressFromCloud
} from './roadmapCloudSync';
import {
    getSynchronouslyCachedStages,
    loadRoadmapManifest,
    loadRoadmapStageChunk,
    loadRoadmapLessonById
} from './roadmapLoader';
import { auth } from '../../config/firebase';
import { safeSetLocalStorage } from '../../utils/storageCleanup';

export {
    ROADMAP_PROGRESS_KEY,
    loadRoadmapManifest,
    loadRoadmapStageChunk,
    loadRoadmapLessonById,
    hydrateRoadmapProgressFromCloud
};

/**
 * Get full curriculum stages based on current target language
 * @param {'ja'|'ko'|'en'} lang
 */
export const getRoadmapStages = (lang = 'ja') => {
    if (lang === 'ko' || lang === 'korean') return KO_ROADMAP_STAGES;
    if (lang === 'en' || lang === 'english') return EN_ROADMAP_STAGES;
    return getSynchronouslyCachedStages();
};

/**
 * Retrieve saved progress from localStorage + placement unlocks
 */
export const getRoadmapProgress = () => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return { completedLessons: {}, unlockedStages: [1] };
    }
    try {
        const raw = localStorage.getItem(ROADMAP_PROGRESS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return mergeProgressObjects(parsed, {});
    } catch (e) {
        console.warn('Failed to parse roadmap progress:', e);
    }
    return mergeProgressObjects({}, {});
};

/**
 * Check if a specific lesson is unlocked
 */
export const isLessonUnlocked = (stage, lessonIndex, progress) => {
    if (!stage || !Array.isArray(stage.lessons)) return false;
    const targetLesson = stage.lessons[lessonIndex];
    if (!targetLesson) return false;

    // Completed lessons are always replayable
    if (progress.completedLessons?.[targetLesson.id]?.completed) return true;

    const stageNumber = stage.stage;
    const isStageUnlocked = (progress.unlockedStages || [1]).includes(stageNumber);
    if (!isStageUnlocked) return false;

    // First lesson in an unlocked stage is always unlocked
    if (lessonIndex === 0) return true;

    // Allow skipping directly to Milestone ("Thi vượt chặng") on an unlocked stage or previous lesson completed
    if (targetLesson.isMilestone) return true;

    const prevLesson = stage.lessons[lessonIndex - 1];
    if (!prevLesson) return false;
    return !!progress.completedLessons?.[prevLesson.id]?.completed;
};

/**
 * Calculate completion percentage and stats for a given stage
 */
export const getStageStats = (stage, progress) => {
    const lessons = stage?.lessons || [];
    if (lessons.length === 0) {
        return { total: 0, completed: 0, percent: 0, isAllCompleted: false };
    }
    const total = lessons.length;
    let completed = 0;
    lessons.forEach((l) => {
        if (progress.completedLessons?.[l.id]?.completed) {
            completed += 1;
        }
    });
    const percent = Math.round((completed / total) * 100);
    return {
        total,
        completed,
        percent,
        isAllCompleted: completed === total
    };
};

/**
 * Find the current active lesson that the user should learn next
 */
export const findCurrentActiveLessonId = (stages, progress) => {
    const unlockedSet = new Set(progress.unlockedStages || [1]);
    // Prefer highest unlocked incomplete stage first so placement-placed users jump straight there
    const sortedStages = [...(stages || [])].sort((a, b) => Number(a.stage) - Number(b.stage));
    const highestUnlocked = Math.max(...(progress.unlockedStages || [1]));

    const orderedCandidates = [
        ...sortedStages.filter((s) => Number(s.stage) === highestUnlocked),
        ...sortedStages.filter((s) => Number(s.stage) !== highestUnlocked)
    ];

    for (const stage of orderedCandidates) {
        if (!unlockedSet.has(stage.stage)) continue;
        const lessons = stage.lessons || [];
        for (let i = 0; i < lessons.length; i++) {
            const lesson = lessons[i];
            const isCompleted = !!progress.completedLessons?.[lesson.id]?.completed;
            if (!isCompleted && isLessonUnlocked(stage, i, progress)) {
                return lesson.id;
            }
        }
    }
    return stages[0]?.lessons?.[0]?.id || null;
};

/**
 * Save completion of a lesson, unlocking the next node/stage & syncing to Firestore
 */
export const saveRoadmapLessonComplete = (lessonId, score = 100, stars = 3, lang = 'ja', options = {}) => {
    const progress = getRoadmapProgress();
    const updatedCompleted = {
        ...progress.completedLessons,
        [lessonId]: {
            completed: true,
            score: Math.max(score, progress.completedLessons[lessonId]?.score || 0),
            stars: Math.max(stars, progress.completedLessons[lessonId]?.stars || 0),
            completedAt: Date.now()
        }
    };

    const stages = getRoadmapStages(lang);
    const unlockedStagesSet = new Set(progress.unlockedStages || [1]);

    // Check stage completion OR milestone completion (Jump-Ahead Test!)
    stages.forEach((stage, idx) => {
        const lessons = stage.lessons || [];
        const milestone = lessons.find((l) => l.isMilestone);
        const isCurrentCompleted = lessons.length > 0 && lessons.every((l) => updatedCompleted[l.id]?.completed);
        const isMilestonePassed = milestone && updatedCompleted[milestone.id]?.completed;
        if ((isCurrentCompleted || isMilestonePassed) && stages[idx + 1]) {
            unlockedStagesSet.add(stages[idx + 1].stage);
        }
    });

    if (options.unlockStageNum) {
        unlockedStagesSet.add(Number(options.unlockStageNum));
    }

    const newProgress = {
        completedLessons: updatedCompleted,
        unlockedStages: Array.from(unlockedStagesSet).sort((a, b) => a - b),
        lastUpdated: Date.now()
    };

    safeSetLocalStorage(ROADMAP_PROGRESS_KEY, JSON.stringify(newProgress));

    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quizki-roadmap-updated', { detail: { lessonId, newProgress } }));
        }
    } catch (_) {}

    const activeUid = options.userId || auth?.currentUser?.uid;
    if (activeUid) {
        saveProgressToFirestore(activeUid, newProgress).catch(() => {});
    }

    return newProgress;
};

/**
 * Helper to find a lesson across cached stages
 */
export const findLessonById = (lessonId, lang = 'ja') => {
    const stages = getRoadmapStages(lang);
    for (const stage of stages) {
        const found = (stage.lessons || []).find((l) => l.id === lessonId);
        if (found) return { lesson: found, stage };
    }
    return null;
};
