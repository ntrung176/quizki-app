import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { 
    subscribeJLPTTests, 
    getSynchronousJLPTTests, 
    isJLPTDataLoaded,
    loadJLPTLevelData
} from '../services/jlptDataService';

export const useJLPTTestData = ({ userId, profile }) => {
    const [tests, setTests] = useState(() => getSynchronousJLPTTests());
    const [loading, setLoading] = useState(() => !isJLPTDataLoaded());
    const [targetLevel, setTargetLevel] = useState(profile?.jlptTargetLevel || 'N2');

    const [completedTests, setCompletedTests] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_completed_tests') || '{}');
        } catch (e) {
            return {};
        }
    });
    const [roadmapProgress, setRoadmapProgress] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_jlpt_roadmap_progress');
            if (cached) return JSON.parse(cached);
        } catch (e) {}
        return {
            N2: Array.from({ length: 24 }, (_, i) => i + 1)
        };
    });
    const [savedProgresses, setSavedProgresses] = useState(() => {
        try {
            const raw = JSON.parse(localStorage.getItem('quizki_jlpt_saved_progresses') || '{}');
            const cleaned = {};
            Object.entries(raw).forEach(([k, v]) => {
                if (v && v.answers && Object.keys(v.answers).length > 0) {
                    cleaned[k] = v;
                }
            });
            return cleaned;
        } catch (e) {
            return {};
        }
    });
    const [notes, setNotes] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_jlpt_notes') || '{}');
        } catch (e) {
            return {};
        }
    });
    const [wrongQuestions, setWrongQuestions] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_jlpt_wrong_questions') || '{}');
        } catch (e) {
            return {};
        }
    });

    useEffect(() => {
        if (profile?.jlptTargetLevel) {
            setTargetLevel(profile.jlptTargetLevel);
        }
    }, [profile?.jlptTargetLevel]);

    useEffect(() => {
        if (targetLevel) {
            loadJLPTLevelData(targetLevel);
        }
    }, [targetLevel]);


    const handleUpdateTargetLevel = async (newLevel) => {
        setTargetLevel(newLevel);
        if (userId) {
            try {
                const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
                await updateDoc(profileRef, { jlptTargetLevel: newLevel });
            } catch (e) {
                console.error("Lỗi cập nhật mục tiêu JLPT:", e);
            }
        }
    };

    const toggleRoadmapDay = async (level, dayNum) => {
        const currentCompletedDays = roadmapProgress[level] || [];
        let newCompletedDays;
        if (currentCompletedDays.includes(dayNum)) {
            newCompletedDays = currentCompletedDays.filter(d => d !== dayNum);
        } else {
            newCompletedDays = [...currentCompletedDays, dayNum].sort((a, b) => a - b);
        }

        const updatedProgress = {
            ...roadmapProgress,
            [level]: newCompletedDays
        };

        setRoadmapProgress(updatedProgress);
        try {
            localStorage.setItem('quizki_jlpt_roadmap_progress', JSON.stringify(updatedProgress));
        } catch (e) {}

        if (userId && db) {
            try {
                const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'jlptProgress');
                await setDoc(progressDocRef, { roadmapProgress: updatedProgress }, { merge: true });
            } catch (e) {
                console.error('Error saving roadmap progress to Firestore:', e);
            }
        }
    };

    // Reset states when userId changes
    useEffect(() => {
        setCompletedTests({});
        setSavedProgresses({});
        setNotes({});
        setWrongQuestions({});
        setRoadmapProgress({
            N2: Array.from({ length: 24 }, (_, i) => i + 1)
        });
    }, [userId]);

    // Firestore synchronization for JLPT test progress, notes, and wrong questions
    useEffect(() => {
        if (!userId || !db) return;
        const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'jlptProgress');
        getDoc(progressDocRef).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.completedTests) {
                    setCompletedTests(prev => {
                        const merged = { ...prev, ...data.completedTests };
                        try { localStorage.setItem('quizki_completed_tests', JSON.stringify(merged)); } catch (e) {}
                        return merged;
                    });
                }
                if (data.savedProgresses) {
                    setSavedProgresses(prev => {
                        const merged = { ...prev };
                        Object.entries(data.savedProgresses).forEach(([k, v]) => {
                            if (v && v.answers && Object.keys(v.answers).length > 0) {
                                merged[k] = v;
                            } else {
                                delete merged[k];
                            }
                        });
                        try { localStorage.setItem('quizki_jlpt_saved_progresses', JSON.stringify(merged)); } catch (e) {}
                        return merged;
                    });
                }
                if (data.notes) {
                    setNotes(prev => {
                        const merged = { ...prev, ...data.notes };
                        try { localStorage.setItem('quizki_jlpt_notes', JSON.stringify(merged)); } catch (e) {}
                        return merged;
                    });
                }
                if (data.wrongQuestions) {
                    setWrongQuestions(prev => {
                        const merged = { ...prev, ...data.wrongQuestions };
                        try { localStorage.setItem('quizki_jlpt_wrong_questions', JSON.stringify(merged)); } catch (e) {}
                        return merged;
                    });
                }
                if (data.roadmapProgress) {
                    setRoadmapProgress(prev => {
                        const merged = { ...prev, ...data.roadmapProgress };
                        try { localStorage.setItem('quizki_jlpt_roadmap_progress', JSON.stringify(merged)); } catch (e) {}
                        return merged;
                    });
                }
            }
        }).catch(e => console.error('Error loading JLPT progress from Firestore:', e));
    }, [userId]);

    const saveCompletedTestsToFirestore = async (newCompleted) => {
        if (!userId || !db) return;
        try {
            const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'jlptProgress');
            await setDoc(progressDocRef, { completedTests: newCompleted }, { merge: true });
        } catch (e) {
            console.error('Error saving completed tests to Firestore:', e);
        }
    };

    const saveProgressesToFirestore = async (newProgresses) => {
        if (!userId || !db) return;
        try {
            const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'jlptProgress');
            await setDoc(progressDocRef, { savedProgresses: newProgresses }, { merge: true });
        } catch (e) {
            console.error('Error saving saved progresses to Firestore:', e);
        }
    };

    const saveNotesToFirestore = async (newNotes) => {
        if (!userId || !db) return;
        try {
            const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'jlptProgress');
            await setDoc(progressDocRef, { notes: newNotes }, { merge: true });
        } catch (e) {
            console.error('Error saving notes to Firestore:', e);
        }
    };

    const saveWrongQuestionsToFirestore = async (newWrongs) => {
        if (!userId || !db) return;
        try {
            const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'jlptProgress');
            await setDoc(progressDocRef, { wrongQuestions: newWrongs }, { merge: true });
        } catch (e) {
            console.error('Error saving wrong questions to Firestore:', e);
        }
    };

    const recordWrongQuestions = (newWrongs) => {
        setWrongQuestions(prev => {
            const updated = { ...prev, ...newWrongs };
            try { localStorage.setItem('quizki_jlpt_wrong_questions', JSON.stringify(updated)); } catch (e) {}
            saveWrongQuestionsToFirestore(updated);
            return updated;
        });
    };

    const removeWrongQuestion = (key) => {
        setWrongQuestions(prev => {
            const updated = { ...prev };
            delete updated[key];
            try { localStorage.setItem('quizki_jlpt_wrong_questions', JSON.stringify(updated)); } catch (e) {}
            saveWrongQuestionsToFirestore(updated);
            return updated;
        });
    };

    const clearAllWrongQuestions = () => {
        setWrongQuestions({});
        try { localStorage.removeItem('quizki_jlpt_wrong_questions'); } catch (e) {}
        saveWrongQuestionsToFirestore({});
    };

    const saveNotesMultiple = (updates) => {
        setNotes(prev => {
            const updated = { ...prev, ...updates };
            localStorage.setItem('quizki_jlpt_notes', JSON.stringify(updated));
            saveNotesToFirestore(updated);
            return updated;
        });
    };

    const deleteNotesMultiple = (keys) => {
        setNotes(prev => {
            const updated = { ...prev };
            keys.forEach(k => delete updated[k]);
            localStorage.setItem('quizki_jlpt_notes', JSON.stringify(updated));
            saveNotesToFirestore(updated);
            return updated;
        });
    };

    // Subscribe to unified JLPT data service (singleton in-memory cache + firestore sync)
    useEffect(() => {
        const unsubscribe = subscribeJLPTTests((latestTests) => {
            setTests(latestTests);
            setLoading(false);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('quizki_completed_tests');
        if (saved) {
            try { setCompletedTests(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    return {
        tests,
        setTests,
        loading,
        targetLevel,
        handleUpdateTargetLevel,
        completedTests,
        setCompletedTests,
        roadmapProgress,
        toggleRoadmapDay,
        savedProgresses,
        setSavedProgresses,
        notes,
        setNotes,
        wrongQuestions,
        recordWrongQuestions,
        removeWrongQuestion,
        clearAllWrongQuestions,
        saveCompletedTestsToFirestore,
        saveProgressesToFirestore,
        saveNotesToFirestore,
        saveNotesMultiple,
        deleteNotesMultiple
    };
};
