import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { getCacheConfig } from '../utils/cacheConfigService';

export const useJLPTTestData = ({ userId, profile }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
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
            return JSON.parse(localStorage.getItem('quizki_jlpt_saved_progresses') || '{}');
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

    useEffect(() => {
        if (profile?.jlptTargetLevel) {
            setTargetLevel(profile.jlptTargetLevel);
        }
    }, [profile?.jlptTargetLevel]);

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
        setRoadmapProgress({
            N2: Array.from({ length: 24 }, (_, i) => i + 1)
        });
    }, [userId]);

    // Firestore synchronization for JLPT test progress and notes
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
                        const merged = { ...prev, ...data.savedProgresses };
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

    // Load tests
    const testsPath = `artifacts/${appId}/jlptTests`;
    useEffect(() => {
        if (!db) return;
        let active = true;
        let unsub = null;

        // 1. Instant local cache load
        try {
            const savedCache = localStorage.getItem('quizki_cached_jlpt_tests');
            if (savedCache && active) {
                const parsed = JSON.parse(savedCache);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTests(parsed);
                    setLoading(false);
                }
            }
        } catch (e) {}

        (async () => {
            let baseTests = [];

            // 2. Fetch CDN / static data
            try {
                const cacheConfig = await getCacheConfig();
                if (cacheConfig && cacheConfig.jlptUrl) {
                    const urlWithBuster = `${cacheConfig.jlptUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                    const res = await fetch(urlWithBuster);
                    if (res && res.ok && active) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            baseTests = data;
                            if (active) {
                                setTests(data);
                                setLoading(false);
                            }
                        }
                    }
                }
            } catch (e) {}

            if (!baseTests.length) {
                try {
                    const res = await fetch('/data/jlpt_data.json');
                    if (res && res.ok && active) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            baseTests = data;
                            if (active) {
                                setTests(data);
                                setLoading(false);
                            }
                        }
                    }
                } catch (e) {}
            }

            // 3. Always connect to real-time Firestore collection so isPremium/isFixed changes persist across F5!
            if (!active) return;
            try {
                const q = query(collection(db, testsPath));
                unsub = onSnapshot(q, (snap) => {
                    if (!active) return;
                    const firestoreDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    if (firestoreDocs.length === 0 && baseTests.length > 0) {
                        setTests(baseTests);
                    } else {
                        const firestoreMap = new Map();
                        firestoreDocs.forEach(docItem => firestoreMap.set(docItem.id, docItem));

                        const mergedList = [...baseTests];
                        const mergedIds = new Set();

                        for (let i = 0; i < mergedList.length; i++) {
                            const item = mergedList[i];
                            if (firestoreMap.has(item.id)) {
                                const fsDoc = firestoreMap.get(item.id);
                                mergedList[i] = { ...item, ...fsDoc };
                                mergedIds.add(item.id);
                            }
                        }

                        firestoreDocs.forEach(fsDoc => {
                            if (!mergedIds.has(fsDoc.id)) {
                                mergedList.push(fsDoc);
                            }
                        });

                        const resultList = mergedList.length > 0 ? mergedList : firestoreDocs;
                        setTests(resultList);
                        setLoading(false);
                    }
                }, (err) => {
                    console.warn("Firestore jlptTests snapshot warning:", err);
                });
            } catch (e) {
                console.error("Firestore jlptTests snapshot setup error:", e);
            }
        })();

        return () => {
            active = false;
            if (unsub) unsub();
        };
    }, [testsPath]);

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
        saveCompletedTestsToFirestore,
        saveProgressesToFirestore,
        saveNotesToFirestore,
        saveNotesMultiple,
        deleteNotesMultiple
    };
};
