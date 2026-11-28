/**
 * Helpers for snapshotting, inferring, and reactivating interrupted JLPT real-exam sessions
 * with exact remaining timer phases, section position, and previously selected answers.
 */

const SUSPENDED_REAL_EXAMS_KEY = 'quizki_jlpt_suspended_real_exams';

const safeReadStorageMap = (key) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const safeWriteStorageMap = (key, data) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data || {}));
    } catch {
        // Ignore quota / private browsing storage restrictions
    }
};

export const loadSuspendedRealExams = () => safeReadStorageMap(SUSPENDED_REAL_EXAMS_KEY);

export const saveSuspendedRealExam = (testId, snapshot) => {
    if (!testId || !snapshot) return {};
    const map = loadSuspendedRealExams();
    const next = { ...map, [testId]: snapshot };
    safeWriteStorageMap(SUSPENDED_REAL_EXAMS_KEY, next);
    return next;
};

export const clearSuspendedRealExam = (testId) => {
    if (!testId) return {};
    const map = loadSuspendedRealExams();
    if (!(testId in map) && !(String(testId) in map)) return map;
    const next = { ...map };
    delete next[testId];
    delete next[String(testId)];
    safeWriteStorageMap(SUSPENDED_REAL_EXAMS_KEY, next);
    return next;
};

/**
 * Counts total and answered questions across single and subQuestion items.
 */
export const countAnsweredInTest = (test, answers = {}) => {
    let totalQuestions = 0;
    let answeredCount = 0;
    const safeAnswers = answers || {};

    (test?.sections || []).forEach((sec, si) => {
        (sec?.questions || []).forEach((q, qi) => {
            if (Array.isArray(q?.subQuestions) && q.subQuestions.length > 0) {
                q.subQuestions.forEach((_, sqi) => {
                    totalQuestions += 1;
                    if (safeAnswers[`s${si}_q${qi}_sq${sqi}`] !== undefined) answeredCount += 1;
                });
            } else {
                totalQuestions += 1;
                if (safeAnswers[`s${si}_q${qi}`] !== undefined) answeredCount += 1;
            }
        });
    });

    return { answeredCount, totalQuestions };
};

const sectionHasAnyAnswer = (test, si, answers = {}) => {
    const sec = test?.sections?.[si];
    if (!sec) return false;
    return (sec.questions || []).some((q, qi) => {
        if (Array.isArray(q?.subQuestions) && q.subQuestions.length > 0) {
            return q.subQuestions.some((_, sqi) => answers[`s${si}_q${qi}_sq${sqi}`] !== undefined);
        }
        return answers[`s${si}_q${qi}`] !== undefined;
    });
};

const findResumeSectionIdx = (test, sectionIndices = [], answers = {}) => {
    if (!Array.isArray(sectionIndices) || sectionIndices.length === 0) return 0;
    // Prefer the last section with answers if some questions remain unanswered in this phase, or the first section
    let lastWithAnswer = -1;
    for (const si of sectionIndices) {
        if (sectionHasAnyAnswer(test, si, answers)) lastWithAnswer = si;
    }
    return lastWithAnswer >= 0 ? lastWithAnswer : sectionIndices[0];
};

/**
 * Captures exact active real-exam progress so the exam can be resumed with zero data/time loss.
 */
export const buildRealExamSnapshot = ({
    test,
    answers = {},
    currentSectionIdx = 0,
    currentQuestionIdx = 0,
    timeRemaining = 0,
    phaseElapsedOffsetSec = 0,
    examPhases = [],
    currentPhaseIdx = 0,
    timeTaken = 0,
    terminatedByViolation = false,
    examAudioStates = {}
}) => {
    if (!test) return null;
    const testId = test.id || test._id;
    const { answeredCount, totalQuestions } = countAnsweredInTest(test, answers);
    const activePhase = Array.isArray(examPhases) && examPhases[currentPhaseIdx] ? examPhases[currentPhaseIdx] : null;
    const futureSeconds = Array.isArray(examPhases)
        ? examPhases.slice(currentPhaseIdx + 1).reduce((s, p) => s + (p.seconds || 0), 0)
        : 0;

    return {
        testId,
        answers: { ...(answers || {}) },
        answeredCount,
        totalQuestions,
        currentSectionIdx,
        currentQuestionIdx,
        currentPhaseIdx,
        timeRemaining: Math.max(0, Math.round(timeRemaining || 0)),
        totalRemainingSeconds: Math.max(0, Math.round(timeRemaining || 0)) + futureSeconds,
        phaseElapsedOffsetSec: Math.max(0, Math.round(phaseElapsedOffsetSec || 0)),
        phaseLabel: activePhase?.label || 'Thi thực tế JLPT',
        timeTaken: Math.max(0, Math.round(timeTaken || 0)),
        terminatedByViolation: Boolean(terminatedByViolation),
        examAudioStates: examAudioStates && typeof examAudioStates === 'object' ? { ...examAudioStates } : {},
        savedAt: Date.now()
    };
};

/**
 * Resolves a resume/reactivation payload from an explicit snapshot OR infers it accurately
 * from a completed real-exam record created prior to explicit snapshots.
 */
export const resolveRealExamResumeState = ({
    test,
    completedEntry = null,
    suspendedEntry = null,
    buildPhasesFn
}) => {
    if (!test || typeof buildPhasesFn !== 'function') return null;
    const phases = buildPhasesFn(test) || [];
    const direct = suspendedEntry || completedEntry?.realExamSnapshot || null;

    if (direct && typeof direct.timeRemaining === 'number' && direct.timeRemaining > 0) {
        const safeAnswers = direct.answers || {};
        const { answeredCount, totalQuestions } = countAnsweredInTest(test, safeAnswers);
        const phaseIdx = phases.length > 0
            ? Math.min(Math.max(0, Number(direct.currentPhaseIdx) || 0), phases.length - 1)
            : 0;
        const futureSeconds = phases.slice(phaseIdx + 1).reduce((s, p) => s + (p.seconds || 0), 0);
        const clampedRemaining = Math.max(1, Math.round(direct.timeRemaining));

        return {
            testId: test.id || test._id,
            answers: { ...safeAnswers },
            answeredCount,
            totalQuestions,
            currentSectionIdx: Number.isInteger(direct.currentSectionIdx)
                ? direct.currentSectionIdx
                : findResumeSectionIdx(test, phases[phaseIdx]?.sectionIndices || [0], safeAnswers),
            currentQuestionIdx: Math.max(0, Number(direct.currentQuestionIdx) || 0),
            currentPhaseIdx: phaseIdx,
            timeRemaining: clampedRemaining,
            totalRemainingSeconds: clampedRemaining + futureSeconds,
            phaseElapsedOffsetSec: Math.max(0, Number(direct.phaseElapsedOffsetSec) || 0),
            phaseLabel: phases[phaseIdx]?.label || direct.phaseLabel || 'Thi thực tế JLPT',
            terminatedByViolation: Boolean(direct.terminatedByViolation),
            examAudioStates: direct.examAudioStates && typeof direct.examAudioStates === 'object'
                ? { ...direct.examAudioStates }
                : {},
            savedAt: direct.savedAt || Date.now(),
            source: 'snapshot'
        };
    }

    // Fallback inference for interrupted real exams stored only in completedTests (e.g., before snapshot update)
    if (completedEntry?.wasRealExam && typeof completedEntry.timeTaken === 'number') {
        const safeAnswers = completedEntry.answers || {};
        const { answeredCount, totalQuestions } = countAnsweredInTest(test, safeAnswers);
        const taken = Math.max(0, Math.round(completedEntry.timeTaken));

        if (phases.length > 0) {
            let highestAnsweredPhaseIdx = 0;
            phases.forEach((ph, idx) => {
                const hasAns = (ph.sectionIndices || []).some((si) => sectionHasAnyAnswer(test, si, safeAnswers));
                if (hasAns) highestAnsweredPhaseIdx = idx;
            });

            let phaseIdx = 0;
            let offsetSec = 0;
            while (phaseIdx < phases.length - 1) {
                const phSec = phases[phaseIdx].seconds || 0;
                const remainingAfter = taken - offsetSec;
                const shouldAdvanceByAnswers = highestAnsweredPhaseIdx > phaseIdx && remainingAfter >= Math.floor(phSec * 0.4);
                const shouldAdvanceByClock = remainingAfter >= phSec;
                if (shouldAdvanceByAnswers || shouldAdvanceByClock) {
                    offsetSec += phSec;
                    phaseIdx += 1;
                } else {
                    break;
                }
            }

            const curPhase = phases[phaseIdx];
            const elapsedInPhase = Math.max(0, taken - offsetSec);
            const rawRemaining = (curPhase?.seconds || 0) - elapsedInPhase;
            if (rawRemaining > 15) {
                const futureSeconds = phases.slice(phaseIdx + 1).reduce((s, p) => s + (p.seconds || 0), 0);
                return {
                    testId: test.id || test._id,
                    answers: { ...safeAnswers },
                    answeredCount,
                    totalQuestions,
                    currentSectionIdx: findResumeSectionIdx(test, curPhase?.sectionIndices || [0], safeAnswers),
                    currentQuestionIdx: 0,
                    currentPhaseIdx: phaseIdx,
                    timeRemaining: rawRemaining,
                    totalRemainingSeconds: rawRemaining + futureSeconds,
                    phaseElapsedOffsetSec: offsetSec,
                    phaseLabel: curPhase?.label || 'Thi thực tế JLPT',
                    terminatedByViolation: Boolean(completedEntry.terminatedByViolation),
                    examAudioStates: {},
                    savedAt: completedEntry.date ? new Date(completedEntry.date).getTime() : Date.now(),
                    source: 'inferred'
                };
            }
        } else {
            const totalLimitSec = (test.timeLimit || 60) * 60;
            const rawRemaining = totalLimitSec - taken;
            if (rawRemaining > 15) {
                return {
                    testId: test.id || test._id,
                    answers: { ...safeAnswers },
                    answeredCount,
                    totalQuestions,
                    currentSectionIdx: 0,
                    currentQuestionIdx: 0,
                    currentPhaseIdx: 0,
                    timeRemaining: rawRemaining,
                    totalRemainingSeconds: rawRemaining,
                    phaseElapsedOffsetSec: 0,
                    phaseLabel: 'Thi thực tế JLPT',
                    terminatedByViolation: Boolean(completedEntry.terminatedByViolation),
                    examAudioStates: {},
                    savedAt: completedEntry.date ? new Date(completedEntry.date).getTime() : Date.now(),
                    source: 'inferred'
                };
            }
        }
    }

    return null;
};
