// AdminBookBlankFillerModal.jsx — Batch AI Example Blanks Filler & Conjugator
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    X, Wand2, CheckCircle2, AlertTriangle, Play, Pause, Square,
    CloudUpload, RefreshCw, BookOpen, Check, Eye, Loader2, Sparkles,
    BookMarked, Layers, ArrowRight
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getSharedBookGroups, updateEditedBookGroupLocalCache, syncBooksToCDN } from '../../utils/bookService';
import { aiFillExampleBlanks } from '../../utils/aiProvider';
import { showToast, showConfirm } from '../../utils/toast';
import FuriganaText from '../ui/FuriganaText';

const BATCH_SIZES = [
    { value: 10, label: '10 từ / đợt (Thử nghiệm)' },
    { value: 30, label: '30 từ / đợt' },
    { value: 60, label: '60 từ / đợt (Khuyên dùng)' },
    { value: 120, label: '120 từ / đợt' },
    { value: 'ALL', label: 'Tất cả từ còn lại' }
];

const hasBlankInExample = (v) => {
    if (!v) return false;
    const ex = (v.example || v.exampleSentence || '').trim();
    return /_{2,}|（\s*）|\(\s*\)|\[\s*\]/.test(ex);
};

const AdminBookBlankFillerModal = ({
    isOpen,
    onClose,
    initialGroupId = null,
    initialBookId = null,
    onSuccessUpdate = null
}) => {
    const [bookGroups, setBookGroups] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Filters
    const [selectedGroupId, setSelectedGroupId] = useState('ALL');
    const [selectedBookId, setSelectedBookId] = useState('ALL');
    const [batchSize, setBatchSize] = useState(60);

    // Preview state
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewSample, setPreviewSample] = useState(null);

    // Execution state
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState({
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        percent: 0,
        currentWord: ''
    });
    const [logs, setLogs] = useState([]);
    const [isSyncingCDN, setIsSyncingCDN] = useState(false);

    const abortRef = useRef(false);
    const isPausedRef = useRef(false);
    const logsEndRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // Load data when opened
    useEffect(() => {
        if (!isOpen) return;

        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const groups = await getSharedBookGroups(false, false);
                setBookGroups(groups || []);
                if (initialGroupId) {
                    setSelectedGroupId(initialGroupId);
                }
                if (initialBookId) {
                    setSelectedBookId(initialBookId);
                }
            } catch (err) {
                console.error('Error loading book groups for blank filler:', err);
                showToast('Lỗi khi tải dữ liệu sách', 'error');
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();
    }, [isOpen, initialGroupId, initialBookId]);

    // Available books based on group selection
    const availableBooks = useMemo(() => {
        if (selectedGroupId === 'ALL') {
            return bookGroups.flatMap(g => (g.books || []).map(b => ({ ...b, groupName: g.name, parentGroupId: g.id })));
        }
        const g = bookGroups.find(gr => gr.id === selectedGroupId);
        return (g?.books || []).map(b => ({ ...b, groupName: g.name, parentGroupId: g.id }));
    }, [bookGroups, selectedGroupId]);

    // Reset book filter if group changes and book is no longer valid
    useEffect(() => {
        if (selectedBookId !== 'ALL') {
            const exists = availableBooks.some(b => b.id === selectedBookId);
            if (!exists) setSelectedBookId('ALL');
        }
    }, [availableBooks, selectedBookId]);

    // Flatten all vocab matching selected filters
    const allFilteredTasks = useMemo(() => {
        const tasks = [];
        bookGroups.forEach(g => {
            if (selectedGroupId !== 'ALL' && g.id !== selectedGroupId) return;

            (g.books || []).forEach(b => {
                if (selectedBookId !== 'ALL' && b.id !== selectedBookId) return;

                (b.chapters || []).forEach(c => {
                    (c.lessons || []).forEach(l => {
                        (l.vocab || []).forEach((v, vIdx) => {
                            tasks.push({
                                groupId: g.id,
                                groupName: g.name,
                                bookId: b.id,
                                bookName: b.name,
                                chapterId: c.id,
                                chapterName: c.name,
                                lessonId: l.id,
                                lessonName: l.name,
                                vocabIndex: vIdx,
                                vocab: v,
                                hasBlank: hasBlankInExample(v)
                            });
                        });
                    });
                });
            });
        });
        return tasks;
    }, [bookGroups, selectedGroupId, selectedBookId]);

    // Compute stats
    const stats = useMemo(() => {
        const total = allFilteredTasks.length;
        const withBlanks = allFilteredTasks.filter(t => t.hasBlank).length;
        const complete = total - withBlanks;
        const percent = total > 0 ? Math.round((complete / total) * 100) : 100;
        return { total, withBlanks, complete, percent };
    }, [allFilteredTasks]);

    // Preview Single Random Item
    const handlePreviewSingle = async () => {
        const candidateTasks = allFilteredTasks.filter(t => t.hasBlank);
        if (candidateTasks.length === 0) {
            showToast('Không có từ vựng nào có chỗ trống trong phạm vi đã chọn! 🎉', 'info');
            return;
        }

        const randomTask = candidateTasks[Math.floor(Math.random() * candidateTasks.length)];
        setIsPreviewing(true);
        setPreviewSample(null);

        try {
            const aiRes = await aiFillExampleBlanks([randomTask.vocab]);
            if (Array.isArray(aiRes) && aiRes[0]) {
                setPreviewSample({
                    task: randomTask,
                    beforeExample: randomTask.vocab.example || randomTask.vocab.exampleSentence,
                    beforeMeaning: randomTask.vocab.exampleMeaning || randomTask.vocab.exampleTranslation,
                    afterExample: aiRes[0].example,
                    afterMeaning: aiRes[0].exampleMeaning
                });
                showToast('Đã tạo thử mẫu xem trước thành công! ✨', 'success');
            } else {
                showToast('AI không trả về kết quả hợp lệ cho mẫu này', 'warning');
            }
        } catch (e) {
            console.error('Preview error:', e);
            showToast('Lỗi AI khi xem trước: ' + (e?.message || e), 'error');
        } finally {
            setIsPreviewing(false);
        }
    };

    // Apply previewed sample directly
    const handleApplyPreviewSample = async () => {
        if (!previewSample) return;
        const { task, afterExample, afterMeaning } = previewSample;

        try {
            // Find current lesson in state
            const g = bookGroups.find(gr => gr.id === task.groupId);
            const b = g?.books?.find(bk => bk.id === task.bookId);
            const c = b?.chapters?.find(ch => ch.id === task.chapterId);
            const l = c?.lessons?.find(ls => ls.id === task.lessonId);

            if (!l || !l.vocab) {
                showToast('Không tìm thấy bài học tương ứng', 'error');
                return;
            }

            const updatedVocab = [...l.vocab];
            if (updatedVocab[task.vocabIndex]) {
                updatedVocab[task.vocabIndex] = {
                    ...updatedVocab[task.vocabIndex],
                    example: afterExample,
                    exampleSentence: afterExample,
                    exampleMeaning: afterMeaning || updatedVocab[task.vocabIndex].exampleMeaning,
                    exampleTranslation: afterMeaning || updatedVocab[task.vocabIndex].exampleTranslation
                };
            }

            // Save to Firestore
            const lessonRef = doc(db, 'bookGroups', task.groupId, 'books', task.bookId, 'chapters', task.chapterId, 'lessons', task.lessonId);
            await setDoc(lessonRef, { vocab: updatedVocab }, { merge: true });

            // Update local memory
            setBookGroups(prev => prev.map(grp => {
                if (grp.id !== task.groupId) return grp;
                const updatedGroup = {
                    ...grp,
                    books: (grp.books || []).map(bk => {
                        if (bk.id !== task.bookId) return bk;
                        return {
                            ...bk,
                            chapters: (bk.chapters || []).map(ch => {
                                if (ch.id !== task.chapterId) return ch;
                                return {
                                    ...ch,
                                    lessons: (ch.lessons || []).map(ls => ls.id === task.lessonId ? { ...ls, vocab: updatedVocab } : ls)
                                };
                            })
                        };
                    })
                };
                updateEditedBookGroupLocalCache(updatedGroup);
                return updatedGroup;
            }));

            showToast('Đã áp dụng mẫu xem trước vào bài học thành công! 🎉', 'success');
            setPreviewSample(null);
            if (onSuccessUpdate) onSuccessUpdate();
        } catch (err) {
            console.error('Error applying preview sample:', err);
            showToast('Lỗi lưu mẫu: ' + (err?.message || err), 'error');
        }
    };

    // Run batch processing
    const handleStartBatch = async () => {
        const candidateTasks = allFilteredTasks.filter(t => t.hasBlank);
        if (candidateTasks.length === 0) {
            showToast('Tất cả câu ví dụ trong phạm vi đã chọn đều đã có đầy đủ từ vựng! 🎉', 'info');
            return;
        }

        const targetCount = batchSize === 'ALL' ? candidateTasks.length : Math.min(batchSize, candidateTasks.length);
        const tasksToRun = candidateTasks.slice(0, targetCount);

        const confirmMsg = `Bạn chuẩn bị dùng AI để điền từ & chia thể cho ${tasksToRun.length} câu ví dụ (${selectedGroupId === 'ALL' ? 'Toàn bộ nhóm sách' : 'Nhóm đã chọn'}). Bạn có muốn bắt đầu không?`;
        if (!(await showConfirm(confirmMsg, { type: 'info', confirmText: 'Bắt đầu ngay' }))) {
            return;
        }

        abortRef.current = false;
        isPausedRef.current = false;
        setIsRunning(true);
        setIsPaused(false);
        setProgress({
            total: tasksToRun.length,
            processed: 0,
            succeeded: 0,
            failed: 0,
            percent: 0,
            currentWord: ''
        });

        const initialLog = `[${new Date().toLocaleTimeString()}] 🚀 Bắt đầu tiến trình điền từ cho ${tasksToRun.length} câu ví dụ...`;
        setLogs([initialLog]);

        let succeededCount = 0;
        let failedCount = 0;

        // Group tasks by lesson so we save lesson by lesson
        const lessonMap = new Map();
        tasksToRun.forEach(t => {
            const key = `${t.groupId}:::${t.bookId}:::${t.chapterId}:::${t.lessonId}`;
            if (!lessonMap.has(key)) {
                lessonMap.set(key, {
                    groupId: t.groupId,
                    bookId: t.bookId,
                    chapterId: t.chapterId,
                    lessonId: t.lessonId,
                    bookName: t.bookName,
                    lessonName: t.lessonName,
                    tasks: []
                });
            }
            lessonMap.get(key).tasks.push(t);
        });

        let totalProcessed = 0;

        // Process lesson by lesson
        for (const [lessonKey, lessonInfo] of lessonMap.entries()) {
            if (abortRef.current) {
                setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏹️ Tiến trình đã bị dừng bởi người dùng.`]);
                break;
            }

            while (isPausedRef.current) {
                await new Promise(r => setTimeout(r, 500));
                if (abortRef.current) break;
            }
            if (abortRef.current) break;

            const lessonTasks = lessonInfo.tasks;
            const SUB_BATCH_SIZE = 6;

            // Find current lesson vocab in state
            const currentGroupObj = bookGroups.find(gr => gr.id === lessonInfo.groupId);
            const currentBookObj = currentGroupObj?.books?.find(bk => bk.id === lessonInfo.bookId);
            const currentChapterObj = currentBookObj?.chapters?.find(ch => ch.id === lessonInfo.chapterId);
            const currentLessonObj = currentChapterObj?.lessons?.find(ls => ls.id === lessonInfo.lessonId);

            if (!currentLessonObj || !currentLessonObj.vocab) {
                totalProcessed += lessonTasks.length;
                failedCount += lessonTasks.length;
                continue;
            }

            const updatedLessonVocab = currentLessonObj.vocab.map(v => ({ ...v }));
            let lessonModifiedCount = 0;

            for (let b = 0; b < lessonTasks.length; b += SUB_BATCH_SIZE) {
                if (abortRef.current) break;
                while (isPausedRef.current) {
                    await new Promise(r => setTimeout(r, 500));
                    if (abortRef.current) break;
                }
                if (abortRef.current) break;

                const subBatch = lessonTasks.slice(b, b + SUB_BATCH_SIZE);
                const firstWord = subBatch[0]?.vocab?.word || subBatch[0]?.vocab?.front || '';

                setProgress(prev => ({
                    ...prev,
                    currentWord: `${lessonInfo.bookName} › ${lessonInfo.lessonName} › ${firstWord}`
                }));

                try {
                    const aiResults = await aiFillExampleBlanks(subBatch.map(s => s.vocab));
                    if (Array.isArray(aiResults)) {
                        aiResults.forEach(res => {
                            const taskItem = subBatch[res.index];
                            if (taskItem && res.example) {
                                const targetVocab = updatedLessonVocab[taskItem.vocabIndex];
                                if (targetVocab) {
                                    targetVocab.example = res.example;
                                    targetVocab.exampleSentence = res.example;
                                    if (res.exampleMeaning) {
                                        targetVocab.exampleMeaning = res.exampleMeaning;
                                        targetVocab.exampleTranslation = res.exampleMeaning;
                                    }
                                    succeededCount++;
                                    lessonModifiedCount++;
                                }
                            }
                        });

                        const wordNames = subBatch.map(s => (s.vocab.word || s.vocab.front || '').split('（')[0]).join(', ');
                        setLogs(prev => [
                            ...prev,
                            `[${new Date().toLocaleTimeString()}] ✅ ${lessonInfo.bookName} (${lessonInfo.lessonName}): Điền thành công ${subBatch.length} từ: [${wordNames}]`
                        ]);
                    } else {
                        failedCount += subBatch.length;
                        setLogs(prev => [
                            ...prev,
                            `[${new Date().toLocaleTimeString()}] ⚠️ AI không trả về đúng định dạng cho đợt ${subBatch.length} từ.`
                        ]);
                    }
                } catch (subErr) {
                    failedCount += subBatch.length;
                    setLogs(prev => [
                        ...prev,
                        `[${new Date().toLocaleTimeString()}] ❌ Lỗi gọi AI: ${subErr.message || subErr}`
                    ]);
                }

                totalProcessed += subBatch.length;
                const pct = Math.round((totalProcessed / tasksToRun.length) * 100);
                setProgress(prev => ({
                    ...prev,
                    processed: totalProcessed,
                    succeeded: succeededCount,
                    failed: failedCount,
                    percent: pct
                }));

                // Short delay to avoid rate limit
                await new Promise(r => setTimeout(r, 600));
            }

            // Save lesson to Firestore & local state if modified
            if (lessonModifiedCount > 0) {
                try {
                    const lessonRef = doc(db, 'bookGroups', lessonInfo.groupId, 'books', lessonInfo.bookId, 'chapters', lessonInfo.chapterId, 'lessons', lessonInfo.lessonId);
                    await setDoc(lessonRef, { vocab: updatedLessonVocab }, { merge: true });

                    setBookGroups(prev => prev.map(grp => {
                        if (grp.id !== lessonInfo.groupId) return grp;
                        const updatedGroup = {
                            ...grp,
                            books: (grp.books || []).map(bk => {
                                if (bk.id !== lessonInfo.bookId) return bk;
                                return {
                                    ...bk,
                                    chapters: (bk.chapters || []).map(ch => {
                                        if (ch.id !== lessonInfo.chapterId) return ch;
                                        return {
                                            ...ch,
                                            lessons: (ch.lessons || []).map(ls => ls.id === lessonInfo.lessonId ? { ...ls, vocab: updatedLessonVocab } : ls)
                                        };
                                    })
                                };
                            })
                        };
                        updateEditedBookGroupLocalCache(updatedGroup);
                        return updatedGroup;
                    }));
                } catch (saveErr) {
                    console.error('Error saving lesson after blank filling:', saveErr);
                    setLogs(prev => [
                        ...prev,
                        `[${new Date().toLocaleTimeString()}] ⚠️ Không thể lưu bài ${lessonInfo.lessonName} vào Firestore: ${saveErr.message}`
                    ]);
                }
            }
        }

        setIsRunning(false);
        setIsPaused(false);
        setProgress(prev => ({ ...prev, percent: 100, currentWord: '' }));
        setLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 🎉 HOÀN TẤT TIẾN TRÌNH! Đã điền thành công: ${succeededCount} câu ví dụ | Thất bại: ${failedCount}.`
        ]);

        if (succeededCount > 0) {
            showToast(`Thành công! Đã điền từ & chia đúng thể cho ${succeededCount} câu ví dụ! 🎉`, 'success');
            if (onSuccessUpdate) onSuccessUpdate();
        }
    };

    const handlePauseResume = () => {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
        setLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ${isPausedRef.current ? '⏸️ Tạm dừng tiến trình.' : '▶️ Tiếp tục tiến trình.'}`
        ]);
    };

    const handleStop = () => {
        abortRef.current = true;
        isPausedRef.current = false;
        setIsPaused(false);
    };

    const handleSyncCDNNow = async () => {
        if (isSyncingCDN) return;
        setIsSyncingCDN(true);
        showToast('Đang tải dữ liệu Kho sách và xuất lên Cloud Storage CDN...', 'info', 5000);
        try {
            await syncBooksToCDN();
            showToast('Đã xuất Kho sách lên Cloud Storage CDN thành công! 🎉', 'success');
        } catch (e) {
            console.error('Error syncing books to CDN:', e);
            showToast('Lỗi khi đồng bộ CDN: ' + (e?.message || e), 'error');
        } finally {
            setIsSyncingCDN(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
                
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-transparent dark:from-indigo-950/20 dark:via-purple-950/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                AI Lắp Từ Vào Chỗ Trống & Chia Đúng Thể Ví Dụ
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                Tự động nhận diện dấu gạch dưới <code>______</code>, lắp từ vựng mục tiêu và chia thể ngữ pháp chuẩn.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isRunning}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-30"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* MODAL BODY */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
                    
                    {/* FILTER & CONFIG BAR */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        {/* Group Selection */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Nhóm sách
                            </label>
                            <select
                                value={selectedGroupId}
                                onChange={e => setSelectedGroupId(e.target.value)}
                                disabled={isRunning || isLoadingData}
                                className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                            >
                                <option value="ALL">🌐 Tất cả nhóm sách ({bookGroups.length})</option>
                                {bookGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Book Selection */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <BookMarked className="w-3.5 h-3.5 text-sky-500" /> Cuốn sách cụ thể
                            </label>
                            <select
                                value={selectedBookId}
                                onChange={e => setSelectedBookId(e.target.value)}
                                disabled={isRunning || isLoadingData}
                                className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                            >
                                <option value="ALL">📚 Tất cả sách trong nhóm ({availableBooks.length})</option>
                                {availableBooks.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {selectedGroupId === 'ALL' ? `[${b.groupName}] ${b.name}` : b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Batch size */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-amber-500" /> Số lượng đợt này
                            </label>
                            <select
                                value={batchSize}
                                onChange={e => setBatchSize(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))}
                                disabled={isRunning}
                                className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                            >
                                {BATCH_SIZES.map(bs => (
                                    <option key={bs.value} value={bs.value}>{bs.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* STATS OVERVIEW */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng từ vựng</span>
                            <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">{stats.total}</span>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 text-center">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Ví dụ hoàn chỉnh</span>
                            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.complete}</span>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/70 dark:border-amber-800/40 text-center">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Có chỗ trống (______)</span>
                            <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">{stats.withBlanks}</span>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-200/70 dark:border-indigo-800/40 text-center">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Tỷ lệ hoàn thiện</span>
                            <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">{stats.percent}%</span>
                        </div>
                    </div>

                    {/* PREVIEW SAMPLE CARD (IF ANY) */}
                    {previewSample && (
                        <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                                    <Eye className="w-3.5 h-3.5" /> Kết quả xem trước mẫu thử
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {previewSample.task.bookName} › {previewSample.task.lessonName}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                                        {previewSample.task.vocab.word || previewSample.task.vocab.front}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        ({previewSample.task.vocab.reading})
                                    </span>
                                    <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                                        : {previewSample.task.vocab.meaning || previewSample.task.vocab.back}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                                    <div className="space-y-1">
                                        <span className="font-bold text-rose-500 uppercase tracking-wider text-[10px] block">Trước (Có chỗ trống):</span>
                                        <p className="text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-900/40 p-2 rounded border border-slate-200/50 dark:border-slate-700/40 whitespace-pre-line">
                                            {previewSample.beforeExample}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="font-bold text-emerald-500 uppercase tracking-wider text-[10px] block">Sau khi AI điền & chia thể:</span>
                                        <div className="text-slate-800 dark:text-slate-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-200 dark:border-emerald-800/40 whitespace-pre-line leading-relaxed">
                                            <FuriganaText text={previewSample.afterExample} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    onClick={() => setPreviewSample(null)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                    Đóng mẫu
                                </button>
                                <button
                                    onClick={handleApplyPreviewSample}
                                    className="px-3.5 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-3.5 h-3.5" /> Áp dụng từ này vào sách
                                </button>
                            </div>
                        </div>
                    )}

                    {/* LIVE PROGRESS & LOGS (WHEN RUNNING) */}
                    {(isRunning || logs.length > 0) && (
                        <div className="space-y-3 animate-fade-in">
                            {/* Progress bar */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        {isRunning ? (
                                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        )}
                                        {progress.currentWord ? progress.currentWord : 'Đang xử lý...'}
                                    </span>
                                    <span className="text-indigo-600 dark:text-indigo-400">
                                        {progress.processed}/{progress.total} ({progress.percent}%)
                                    </span>
                                </div>

                                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 ease-out"
                                        style={{ width: `${progress.percent}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                    <span>Thành công: <strong className="text-emerald-500">{progress.succeeded}</strong></span>
                                    <span>Lỗi / Bỏ qua: <strong className="text-rose-500">{progress.failed}</strong></span>
                                </div>
                            </div>

                            {/* Terminal Logs */}
                            <div className="bg-slate-950 text-slate-200 rounded-xl p-3.5 font-mono text-xs max-h-48 overflow-y-auto space-y-1 border border-slate-800 shadow-inner">
                                {logs.map((log, i) => (
                                    <div key={i} className="leading-relaxed break-words">{log}</div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    )}

                </div>

                {/* MODAL FOOTER */}
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSyncCDNNow}
                            disabled={isRunning || isSyncingCDN}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            title="Xuất dữ liệu mới nhất lên Cloud Storage CDN cho học viên"
                        >
                            {isSyncingCDN ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                            Đồng bộ CDN
                        </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Preview button */}
                        <button
                            type="button"
                            onClick={handlePreviewSingle}
                            disabled={isRunning || isPreviewing || stats.withBlanks === 0}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                        >
                            {isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 text-indigo-500" />}
                            Xem trước 1 từ
                        </button>

                        {/* Start / Pause / Stop controls */}
                        {isRunning ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handlePauseResume}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                                >
                                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                    {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStop}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                                >
                                    <Square className="w-3.5 h-3.5" /> Dừng lại
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleStartBatch}
                                disabled={stats.withBlanks === 0 || isLoadingData}
                                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg disabled:opacity-40 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4" /> Bắt đầu điền bằng AI
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminBookBlankFillerModal;
