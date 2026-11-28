import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import {
    subscribeJLPTTests,
    getSynchronousJLPTTests,
    isJLPTDataLoaded,
    updateSingleJLPTTestInCache
} from '../../services/jlptDataService';
import { ROUTES } from '../../router';
import LoadingIndicator from '../ui/LoadingIndicator';
import JlptStudioTab from '../admin/JlptStudioTab';
import JLPTQuestionSearchModal from '../jlptTest/JLPTQuestionSearchModal';
import { parseYearlyExamMeta } from '../jlptTest/jlptYearlyConstants';
import { showToast } from '../../utils/toast';

/**
 * JLPT Studio Admin Screen: Gemini Pro (Neon) authoring + manual Mondai audio slicing.
 * Intentionally avoids rendering the full 4,000+ test DOM list to keep navigation instant.
 */
const JLPTAdminScreen = () => {
    const location = useLocation();
    const [searchOverride, setSearchOverride] = useState(null);

    const studioPrefill = useMemo(() => {
        if (searchOverride && searchOverride.searchKey === location.search) {
            return searchOverride.prefill;
        }
        const params = new URLSearchParams(location.search || '');
        const linkedId = params.get('testId') || params.get('editTestId') || '';
        return {
            authorMode: params.get('authorMode') || (linkedId ? 'append' : 'yearly'),
            level: params.get('level') || 'N3',
            year: params.get('year') || 2024,
            session: params.get('session') || '12',
            mondai: params.get('mondai') || 1,
            testId: linkedId
        };
    }, [location.search, searchOverride]);

    const [tests, setTests] = useState(() => {
        const cached = getSynchronousJLPTTests();
        if (cached && cached.length > 0) {
            return [...cached].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        return [];
    });
    const [loading, setLoading] = useState(() => !isJLPTDataLoaded());
    const [showQuestionSearchModal, setShowQuestionSearchModal] = useState(false);
    const testsPath = `artifacts/${appId}/jlptTests`;

    useEffect(() => {
        const unsubscribe = subscribeJLPTTests((latestTests) => {
            const list = [...latestTests].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setTests(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Global shortcut Ctrl+K to open lightweight question search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setShowQuestionSearchModal((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSaveSearchedQuestion = async (testId, sectionIdx, questionIdx, updatedQuestion) => {
        try {
            const targetTest = tests.find((t) => t.id === testId);
            if (!targetTest) return false;
            const updatedSections = JSON.parse(JSON.stringify(targetTest.sections || []));
            if (!updatedSections[sectionIdx]?.questions) return false;
            updatedSections[sectionIdx].questions[questionIdx] = updatedQuestion;

            await setDoc(doc(db, testsPath, testId), {
                ...targetTest,
                sections: updatedSections,
                updatedAt: Date.now()
            }, { merge: true });

            updateSingleJLPTTestInCache(testId, { sections: updatedSections });
            setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, sections: updatedSections } : t)));
            showToast('Đã lưu thay đổi câu hỏi thành công!', 'success');
            return true;
        } catch (err) {
            console.error('Error saving question:', err);
            showToast('Lỗi khi lưu câu hỏi: ' + err.message, 'error');
            return false;
        }
    };

    const handleSelectTestFromSearch = (test) => {
        setShowQuestionSearchModal(false);
        if (!test?.id) return;
        const meta = parseYearlyExamMeta(test);
        setSearchOverride({
            searchKey: location.search,
            prefill: {
                authorMode: test.category === 'mondai_listening' ? 'mondai' : 'append',
                level: test.level || 'N3',
                year: meta.year || 2024,
                session: meta.session || '12',
                mondai: Number(test.mondaiNumber) || 1,
                testId: test.id
            }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return <LoadingIndicator text="Đang tải dữ liệu JLPT Studio..." />;
    }

    return (
        <div className="jlpt-screen min-h-screen bg-[#FAFBFD] dark:bg-slate-900 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            to={ROUTES.JLPT_TEST}
                            className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:scale-105"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-emerald-500" />
                                Studio Soạn Đề &amp; Nghe JLPT
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Soạn đề bằng Gemini Pro (Neon), dán JSON và cắt Audio thủ công theo từng Mondai
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowQuestionSearchModal(true)}
                        className="px-4 py-2.5 text-xs font-black bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 rounded-2xl transition flex items-center gap-2 shadow-2xs cursor-pointer self-start sm:self-auto"
                    >
                        <Search className="w-4 h-4 text-emerald-500" />
                        <span>Tìm &amp; Sửa câu hỏi</span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-slate-900 font-mono text-slate-500">
                            Ctrl+K
                        </span>
                    </button>
                </div>

                <JlptStudioTab
                    initialAuthorMode={studioPrefill.authorMode}
                    initialLevel={studioPrefill.level}
                    initialYear={studioPrefill.year}
                    initialSession={studioPrefill.session}
                    initialMondai={studioPrefill.mondai}
                    initialTargetTestId={studioPrefill.testId}
                    existingTests={tests}
                    onTestSaved={(saved) => {
                        if (!saved?.id) return;
                        setTests((prev) => {
                            const exists = prev.some((t) => t.id === saved.id);
                            return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
                        });
                    }}
                />
            </div>

            <JLPTQuestionSearchModal
                isOpen={showQuestionSearchModal}
                onClose={() => setShowQuestionSearchModal(false)}
                tests={tests}
                onSaveQuestion={handleSaveSearchedQuestion}
                onSelectTest={handleSelectTestFromSearch}
            />
        </div>
    );
};

export default JLPTAdminScreen;
