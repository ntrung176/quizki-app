/**
 * Unified Roadmap Curriculum & Progress Management Service
 * Supports Japanese, Korean, and English tracks with Duolingo-style progression.
 */

import { JA_ROADMAP_STAGES } from './jaCurriculum';
import { KO_ROADMAP_STAGES } from './koCurriculum';
import { EN_ROADMAP_STAGES } from './enCurriculum';

export const ROADMAP_PROGRESS_KEY = 'quizki_roadmap_progress';

/**
 * Get full curriculum stages based on current target language
 * @param {'ja'|'ko'|'en'} lang
 */
export const getRoadmapStages = (lang = 'ja') => {
    if (lang === 'ko' || lang === 'korean') return KO_ROADMAP_STAGES;
    if (lang === 'en' || lang === 'english') return EN_ROADMAP_STAGES;
    return JA_ROADMAP_STAGES;
};

/**
 * Retrieve saved progress from localStorage
 */
export const getRoadmapProgress = () => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return { completedLessons: {}, unlockedStages: [1] };
    }
    try {
        const raw = localStorage.getItem(ROADMAP_PROGRESS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                completedLessons: parsed.completedLessons || {},
                unlockedStages: Array.isArray(parsed.unlockedStages) ? parsed.unlockedStages : [1]
            };
        }
    } catch (e) {
        console.warn('Failed to parse roadmap progress:', e);
    }
    return { completedLessons: {}, unlockedStages: [1] };
};

/**
 * Check if a specific lesson is unlocked
 * Rule:
 * 1. The very first lesson of an unlocked stage is unlocked if stage is unlocked.
 * 2. Any subsequent lesson is unlocked if the immediately preceding lesson is completed.
 * 3. Any completed lesson is always unlocked (can be reviewed).
 */
export const isLessonUnlocked = (stage, lessonIndex, progress) => {
    const stageNumber = stage.stage;
    const isStageUnlocked = (progress.unlockedStages || [1]).includes(stageNumber);
    if (!isStageUnlocked) return false;

    // First lesson in stage is unlocked
    if (lessonIndex === 0) return true;

    // Subsequent lessons are unlocked if previous lesson is completed
    const prevLesson = stage.lessons[lessonIndex - 1];
    if (!prevLesson) return false;
    return !!progress.completedLessons?.[prevLesson.id]?.completed;
};

/**
 * Calculate completion percentage and stats for a given stage
 */
export const getStageStats = (stage, progress) => {
    if (!stage || !stage.lessons || stage.lessons.length === 0) {
        return { total: 0, completed: 0, percent: 0, isAllCompleted: false };
    }
    const total = stage.lessons.length;
    let completed = 0;
    stage.lessons.forEach(l => {
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
    for (const stage of stages) {
        const isStageUnlocked = (progress.unlockedStages || [1]).includes(stage.stage);
        if (!isStageUnlocked) continue;

        for (let i = 0; i < stage.lessons.length; i++) {
            const lesson = stage.lessons[i];
            const isCompleted = !!progress.completedLessons?.[lesson.id]?.completed;
            if (!isCompleted) {
                // If this lesson is unlocked, this is the current active lesson!
                if (isLessonUnlocked(stage, i, progress)) {
                    return lesson.id;
                }
            }
        }
    }
    // If all completed, return first lesson of first stage for replay
    return stages[0]?.lessons[0]?.id || null;
};

/**
 * Save completion of a lesson, unlocking the next node/stage
 */
export const saveRoadmapLessonComplete = (lessonId, score = 100, stars = 3, lang = 'ja') => {
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

    // Check if any stage has just been fully completed, unlocking the next stage
    stages.forEach((stage, idx) => {
        const isCurrentCompleted = stage.lessons.every(l => updatedCompleted[l.id]?.completed);
        if (isCurrentCompleted && stages[idx + 1]) {
            unlockedStagesSet.add(stages[idx + 1].stage);
        }
    });

    const newProgress = {
        completedLessons: updatedCompleted,
        unlockedStages: Array.from(unlockedStagesSet).sort((a, b) => a - b),
        lastUpdated: Date.now()
    };

    try {
        localStorage.setItem(ROADMAP_PROGRESS_KEY, JSON.stringify(newProgress));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quizki-roadmap-updated', { detail: { lessonId, newProgress } }));
        }
    } catch (e) {
        console.error('Failed to save roadmap progress:', e);
    }

    return newProgress;
};

/**
 * Helper to find a lesson across all stages
 */
export const findLessonById = (lessonId, lang = 'ja') => {
    const stages = getRoadmapStages(lang);
    for (const stage of stages) {
        const found = stage.lessons.find(l => l.id === lessonId);
        if (found) return { lesson: found, stage };
    }
    return null;
};

