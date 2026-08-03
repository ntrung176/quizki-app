import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingIndicator from '../ui/LoadingIndicator';
import { Search, Filter, Bookmark, BookOpen, ExternalLink, Trash2, CheckSquare, Square, ListChecks, X, Check, FileJson, Plus, Loader2, Sparkles } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getSharedGrammarPointsList, getSharedGrammarSrs, getCachedUserGrammarSrsData, updateCachedUserGrammarSrs, subscribeGrammarSrs, deleteGrammarPoint, deleteGrammarPointsBatch, importDirectGrammarPointsFromJson } from '../../utils/grammarService';
import { aiGenerateGrammarPointsJson } from '../../utils/aiProvider';
import { showToast } from '../../utils/toast';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';

const AI_SYSTEM_PROMPT = `Bạn là một chuyên gia biên soạn giáo trình tiếng Nhật JLPT cho ứng dụng QuizKi App.
Hãy giúp tôi tạo dữ liệu JSON cho các mẫu ngữ pháp tiếng Nhật tuân thủ STRICT các quy tắc sau:

1. QUY CHUẨN KÝ HIỆU NGUYÊN TẮC:
- Danh từ: N
- Tính từ đuôi i: いA
- Tính từ đuôi na: なA
- Động từ thể từ điển: V-る
- Động từ thể Masu: V-ます
- Động từ thể Te: V-て
- Động từ thể Ta: V-た
- Động từ thể Nai: V-ない
- Thể thông thường: Pl
- Thể lịch sự: Po

2. QUY TẮC CẤU TRÚC (structure):
- Các thể kết hợp ĐƯỢC TÁCH NGHĨA HÀNG DỌC BẰNG DẤU GẠCH CHÉO '/'.
- KHÔNG bao gồm lại mẫu ngữ pháp chính trong 'structure' vì ứng dụng sẽ tự nối mẫu ngữ pháp vào sau.
- Ví dụ đúng: "V-る / V-ない / V-ている / いA / なA な / N の"

3. BÀI TẬP (BẮT BUỘC TẠO ĐỦ CẢ 2 PHẦN TRẮC NGHIỆM & ĐẶT CÂU):
- "quizzes": Mảng câu hỏi Trắc nghiệm điền lỗ trống (4 đáp án, gồm question, options, answer, explanation).
- "exercises": Mảng câu hỏi Đặt câu dịch Việt -> Nhật (gồm questionVi, hint, answers).

4. ĐỊNH DẠNG JSON KẾT QUẢ:
[
  {
    "pattern": "~うちに",
    "meaningShort": "Trong lúc... (chuyển biến tự nhiên)",
    "meaning": "Trong lúc / Trong khi đang làm gì đó thì có sự thay đổi diễn ra một cách tự nhiên",
    "meaningFull": "【意味・用法】\\n~ をしている間に自然に変わる。\\n\\n• Tiếng Việt: Dùng khi muốn nói rằng một sự thay đổi đã diễn ra một cách tự nhiên trong lúc một hành động khác đang diễn ra.",
    "structureRaw": "V-る / V-ない / V-ている",
    "tipsRaw": "💡 Lưu ý ngữ pháp: Vế sau biểu thị sự biến đổi diễn ra TỰ NHIÊN, không dùng với câu mang ý chí hay quyết định chủ quan của người nói.\\n💡 Tình huống sử dụng: Dùng khi miêu tả cảm xúc, thói quen, kỹ năng hoặc trạng thái dần thay đổi theo thời gian.\\n💡 Văn phong: Phổ biến trong cả văn nói giao tiếp hàng ngày lẫn văn viết.",
    "examplesRaw": "住んでいるうちに日本の生活に慣れました。\\nTrong lúc sống ở Nhật, tôi đã dần quen với cuộc sống ở đây lúc nào không hay.",
    "quizzes": [
      {
        "question": "日本に住んでいる（　　）、日本語が上手になりました。",
        "options": ["うちに", "あいだに", "ために", "かわりに"],
        "answer": "うちに",
        "explanation": "Dùng 'うちに' vì biểu thị sự thay đổi diễn ra tự nhiên trong lúc đang sống ở Nhật."
      }
    ],
    "exercises": [
      {
        "questionVi": "Trong lúc sống ở Nhật, tôi đã quen với cuộc sống ở đây.",
        "hint": "住む, 慣れる",
        "answers": [
          "日本に住んでいるうちに、日本の生活に慣れました。",
          "日本に住んでいるうちに日本の生活に慣れました。"
        ]
      }
    ]
  }
]`;

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_COLORS = {
    N5: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/40',
    N4: 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/40',
    N3: 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/40',
    N2: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/40',
    N1: 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-900/40',
};

const LEVEL_BORDER_COLORS = {
    N5: 'border-emerald-500',
    N4: 'border-sky-500',
    N3: 'border-sky-500',
    N2: 'border-amber-500',
    N1: 'border-rose-500',
};

const GrammarListScreen = ({ isAdmin }) => {
    const user = getAuth().currentUser;
    const userId = user?.uid;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [grammarList, setGrammarList] = useState([]);
    const [userGrammarSRS, setUserGrammarSRS] = useState(new Set());
    const [srsData, setSrsData] = useState({});
    const [loading, setLoading] = useState(true);

    const [selectedLevel, setSelectedLevel] = useState(() => searchParams.get('level') || 'N5');
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');

    // Batch Selection States (Admin)
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [selectedGrammarIds, setSelectedGrammarIds] = useState(new Set());
    const [isDeletingBatch, setIsDeletingBatch] = useState(false);

    // Direct JSON Import States (Admin)
    const [showDirectImportModal, setShowDirectImportModal] = useState(false);
    const [jsonInputText, setJsonInputText] = useState('');
    const [importLevel, setImportLevel] = useState('N4');
    const [isImportingJson, setIsImportingJson] = useState(false);
    const [importModalError, setImportModalError] = useState('');
    const [rawAiInput, setRawAiInput] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [showAiPromptGuide, setShowAiPromptGuide] = useState(false);
    const [promptCopied, setPromptCopied] = useState(false);

    const handleCopyAiPrompt = () => {
        navigator.clipboard.writeText(AI_SYSTEM_PROMPT);
        setPromptCopied(true);
        showToast("Đã sao chép Prompt AI cho Ngữ pháp!", "success");
        setTimeout(() => setPromptCopied(false), 2000);
    };

    const handleAiGenerateJson = async () => {
        if (!rawAiInput.trim()) {
            setImportModalError("Vui lòng dán văn bản ngữ pháp thô vào ô!");
            return;
        }
        setAiGenerating(true);
        setImportModalError('');
        try {
            const result = await aiGenerateGrammarPointsJson(rawAiInput);
            if (result && Array.isArray(result) && result.length > 0) {
                setJsonInputText(JSON.stringify(result, null, 2));
                showToast(`✨ AI đã tạo xong ${result.length} điểm ngữ pháp chuẩn JSON!`, "success");
            } else {
                setImportModalError("AI không thể phân tích văn bản này. Vui lòng kiểm tra lại nội dung.");
            }
        } catch (e) {
            console.error("AI error:", e);
            setImportModalError("Lỗi khi gọi AI: " + e.message);
        } finally {
            setAiGenerating(false);
        }
    };

    const handleDirectImport = async () => {
        if (!jsonInputText.trim()) {
            setImportModalError('Vui lòng nhập hoặc dán nội dung JSON ngữ pháp');
            return;
        }

        setIsImportingJson(true);
        setImportModalError('');

        try {
            const res = await importDirectGrammarPointsFromJson(jsonInputText.trim(), importLevel, userId || 'admin');
            if (res.success) {
                showToast(`Đã import thành công ${res.count} mẫu ngữ pháp!`, 'success');
                if (res.items && res.items.length > 0) {
                    setGrammarList(prev => [...res.items, ...prev]);
                }
                setShowDirectImportModal(false);
                setJsonInputText('');
            } else {
                setImportModalError(`Lỗi import: ${res.error}`);
            }
        } catch (e) {
            setImportModalError(`Dữ liệu JSON không hợp lệ: ${e.message}`);
        } finally {
            setIsImportingJson(false);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [gps, srs] = await Promise.all([
                    getSharedGrammarPointsList(),
                    userId ? getSharedGrammarSrs(userId) : Promise.resolve({})
                ]);
                setGrammarList(gps || []);
                if (userId && srs) {
                    setSrsData(srs);
                    setUserGrammarSRS(new Set(Object.keys(srs)));
                }
            } catch (e) {
                console.error('Error loading grammar points:', e);
            } finally {
                setLoading(false);
            }
        };
        load();

        // Real-time listener for cross-device sync
        let unsubSrs = () => {};
        if (userId) {
            unsubSrs = subscribeGrammarSrs(userId, (freshSrs) => {
                setSrsData(freshSrs);
                setUserGrammarSRS(new Set(Object.keys(freshSrs)));
            });
        }
        return () => unsubSrs();
    }, [userId]);

    // Update query params in URL
    useEffect(() => {
        const params = {};
        if (selectedLevel) params.level = selectedLevel;
        if (searchQuery) params.search = searchQuery;
        setSearchParams(params);
    }, [selectedLevel, searchQuery]);

    const filteredGrammar = useMemo(() => {
        return grammarList.filter(gp => {
            const levelStr = gp.level || gp.jlpt || 'N5';
            const matchesLevel = levelStr.toUpperCase().includes(selectedLevel.toUpperCase());

            const query = searchQuery.trim().toLowerCase();
            const matchesSearch = query === '' || 
                (gp.pattern && gp.pattern.toLowerCase().includes(query)) ||
                (gp.meaningShort && gp.meaningShort.toLowerCase().includes(query)) ||
                (gp.meaning && gp.meaning.toLowerCase().includes(query)) ||
                (gp.textbookTitle && gp.textbookTitle.toLowerCase().includes(query));

            return matchesLevel && matchesSearch;
        });
    }, [grammarList, selectedLevel, searchQuery]);

    const toggleSelectItem = (id) => {
        setSelectedGrammarIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedGrammarIds.size === filteredGrammar.length) {
            setSelectedGrammarIds(new Set());
        } else {
            setSelectedGrammarIds(new Set(filteredGrammar.map(gp => gp.id)));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedGrammarIds.size === 0) {
            showToast('Chưa chọn mẫu ngữ pháp nào để xóa', 'info');
            return;
        }

        const count = selectedGrammarIds.size;
        const confirmed = window.showConfirm
            ? await window.showConfirm(`Bạn có chắc chắn muốn XÓA ${count} mẫu ngữ pháp đã chọn? Action này không thể hoàn tác.`, { type: 'danger', confirmText: `Xóa ${count} mục` })
            : window.confirm(`Bạn có chắc chắn muốn XÓA ${count} mẫu ngữ pháp đã chọn?`);

        if (confirmed) {
            setIsDeletingBatch(true);
            const itemsToDelete = filteredGrammar.filter(gp => selectedGrammarIds.has(gp.id));
            const ok = await deleteGrammarPointsBatch(itemsToDelete);
            if (ok) {
                const deletedSet = new Set(selectedGrammarIds);
                setGrammarList(prev => prev.filter(item => !deletedSet.has(item.id)));
                setSelectedGrammarIds(new Set());
                setIsBatchMode(false);
                showToast(`Đã xóa vĩnh viễn ${count} mẫu ngữ pháp!`, 'success');
            } else {
                showToast('Lỗi khi xóa hàng loạt ngữ pháp', 'error');
            }
            setIsDeletingBatch(false);
        }
    };

    const toggleBookmark = async (e, gp) => {
        e.stopPropagation(); // Avoid card click navigation

        if (!userId) {
            showToast('Vui lòng đăng nhập để lưu cấu trúc ngữ pháp', 'error');
            return;
        }

        const isAdded = userGrammarSRS.has(gp.id);

        if (isAdded) {
            // Already bookmarked - we could prompt or redirect to the saved list,
            // but let's allow unfavoriting as well, just like bookmarks usually work.
            // Wait, in Kanji screen we didn't support removing here to prevent accidental losses,
            // but let's mirror that pattern to keep it aligned, OR let's add a small toast notification.
            showToast('Mẫu ngữ pháp này đã được thêm vào SRS. Bạn có thể quản lý tại tab "Đã lưu".', 'info');
            return;
        }

        // Optimistic UI Update
        setUserGrammarSRS(prev => {
            const next = new Set(prev);
            next.add(gp.id);
            return next;
        });
        showToast(`Đã thêm "${gp.pattern}" vào danh sách ôn tập SRS`);

        try {
            const now = Date.now();
            const newSrs = {
                interval: 0,
                ease: 2.5,
                nextReview: now,
                lastReview: now,
                reps: 0,
                learningStep: null,
                isLapsed: false,
                lapseCount: 0,
                prelapseInterval: null,
                state: 'NEW'
            };
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, gp.id), newSrs, { merge: true });
            updateCachedUserGrammarSrs(userId, gp.id, newSrs);

            // Trigger daily activity count
            const todayDateString = new Date().toISOString().split('T')[0];
            const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
            await setDoc(activityRef, {
                newGrammarAdded: increment(1)
            }, { merge: true }).catch(() => {});

        } catch (e) {
            console.error('Error bookmarking grammar:', e);
            showToast('Lỗi khi lưu vào SRS', 'error');
            // Revert state
            setUserGrammarSRS(prev => {
                const next = new Set(prev);
                next.delete(gp.id);
                return next;
            });
        }
    };

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải dữ liệu tra cứu..." />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-8">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6 animate-fade-in">
                {/* Level selector tabs */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {JLPT_LEVELS.map(lvl => {
                        const isActive = selectedLevel === lvl;
                        return (
                            <button
                                key={lvl}
                                onClick={() => setSelectedLevel(lvl)}
                                className={`px-6 py-2.5 rounded-2xl text-sm font-extrabold transition-all duration-300 transform active:scale-95 ${isActive ? LEVEL_COLORS[lvl] : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
                            >
                                {lvl}
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar & Admin Controls */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left">
                        <h2 className="text-lg font-extrabold text-gray-800 dark:text-white flex items-center justify-center md:justify-start gap-2">
                            Tra cứu cấu trúc Ngữ pháp
                            {isAdmin && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowDirectImportModal(true)}
                                        className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                        title="Import trực tiếp JSON ngữ pháp không cần chọn giáo trình"
                                    >
                                        <FileJson className="w-3.5 h-3.5" />
                                        <span>Import JSON</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setIsBatchMode(!isBatchMode);
                                            setSelectedGrammarIds(new Set());
                                        }}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                            isBatchMode
                                                ? 'bg-rose-500 text-white shadow-md'
                                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                                        }`}
                                        title={isBatchMode ? 'Tắt chế độ chọn nhiều' : 'Bật chế độ chọn nhiều để xóa hàng loạt'}
                                    >
                                        <ListChecks className="w-3.5 h-3.5" />
                                        <span>{isBatchMode ? 'Hủy chọn nhiều' : 'Chọn nhiều'}</span>
                                    </button>
                                </div>
                            )}
                        </h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Tìm kiếm qua các mẫu câu, dịch nghĩa hoặc các bài học trong sách giáo khoa.
                        </p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nhập mẫu câu hoặc nghĩa..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400"
                        />
                    </div>
                </div>

                {/* Admin Sticky Batch Action Toolbar */}
                {isAdmin && isBatchMode && (
                    <div className="bg-indigo-900 text-white rounded-2xl p-4 shadow-xl border border-indigo-700 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-3 font-bold text-sm">
                            <button
                                onClick={handleSelectAll}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-xs text-indigo-100 border border-indigo-600 transition-colors"
                            >
                                {selectedGrammarIds.size === filteredGrammar.length ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4" />}
                                <span>{selectedGrammarIds.size === filteredGrammar.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả trong trang'}</span>
                            </button>

                            <span className="text-xs text-indigo-200">
                                Đã chọn <strong className="text-white text-sm font-black font-mono">{selectedGrammarIds.size}</strong> / {filteredGrammar.length} mục
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleBatchDelete}
                                disabled={selectedGrammarIds.size === 0 || isDeletingBatch}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Xóa {selectedGrammarIds.size > 0 ? `${selectedGrammarIds.size} mục đã chọn` : 'mục đã chọn'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    setIsBatchMode(false);
                                    setSelectedGrammarIds(new Set());
                                }}
                                className="p-2 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-indigo-200 hover:text-white transition-colors"
                                title="Đóng"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* List Results */}
                {filteredGrammar.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredGrammar.map(gp => {
                            const isBookmarked = userGrammarSRS.has(gp.id);
                            const isSelected = selectedGrammarIds.has(gp.id);
                            return (
                                <div
                                    key={gp.id}
                                    onClick={() => {
                                        if (isBatchMode) {
                                            toggleSelectItem(gp.id);
                                        } else {
                                            const currentParams = new URLSearchParams(searchParams);
                                            currentParams.set('from', 'list');
                                            currentParams.set('tb', gp.textbookId || '');
                                            currentParams.set('ls', gp.lessonId || '');
                                            navigate(`/grammar/detail/${gp.id}?${currentParams.toString()}`);
                                        }
                                    }}
                                    className={`bg-white dark:bg-slate-800 border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] relative group overflow-hidden ${
                                        isSelected
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/30'
                                            : 'border-gray-250/70 dark:border-slate-700/60 hover:border-slate-350 dark:hover:border-slate-600'
                                    }`}
                                >
                                    {/* Action buttons (Bookmark & Admin Delete / Checkbox) */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                                        {isBatchMode ? (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelectItem(gp.id);
                                                }}
                                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border border-slate-300 dark:border-slate-600'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                            </div>
                                        ) : (
                                            <>
                                                {isAdmin && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const confirmed = window.showConfirm
                                                                ? await window.showConfirm(`Bạn có chắc chắn muốn xóa mẫu ngữ pháp "${gp.pattern}" không?`, { type: 'danger', confirmText: 'Xóa ngay' })
                                                                : window.confirm(`Bạn có chắc chắn muốn xóa mẫu ngữ pháp "${gp.pattern}" không?`);
                                                            if (confirmed) {
                                                                const ok = await deleteGrammarPoint(gp.textbookId, gp.lessonId, gp.id);
                                                                if (ok) {
                                                                    setGrammarList(prev => prev.filter(item => item.id !== gp.id));
                                                                    showToast(`Đã xóa ngữ pháp "${gp.pattern}"`, 'success');
                                                                } else {
                                                                    showToast('Xóa ngữ pháp thất bại', 'error');
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/80 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-all duration-200 shadow-sm"
                                                        title="Xóa mẫu ngữ pháp này"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-rose-500" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => toggleBookmark(e, gp)}
                                                    className={`p-2 rounded-xl border transition-all duration-200 active:scale-95 ${isBookmarked ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 text-indigo-650 dark:text-indigo-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-750 text-slate-400 hover:text-indigo-500'}`}
                                                    title="Lưu ôn tập (SRS)"
                                                >
                                                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-indigo-500' : ''}`} />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-2 pr-10">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                            <span className="truncate max-w-[150px]">{gp.textbookTitle}</span>
                                        </div>

                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors font-japanese">
                                            {gp.pattern}
                                        </h3>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-750/70 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        <span className="line-clamp-1 flex-1 pr-2">{gp.meaningShort || gp.meaning}</span>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-16 shadow-sm border border-gray-200/60 dark:border-slate-700/60 text-center space-y-4">
                        <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                        <div className="space-y-1">
                            <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">Không tìm thấy mẫu ngữ pháp nào</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                                Hãy thử tìm kiếm bằng một từ khoá khác hoặc lọc các cấp độ JLPT khác.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Direct JSON Import Modal (Admin) */}
            {showDirectImportModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <FileJson className="w-6 h-6" />
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                    Import JSON Ngữ pháp Trực tiếp (Tra cứu)
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopyAiPrompt} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl transition-all border border-amber-200 dark:border-amber-900/40 shadow-sm cursor-pointer">
                                    {promptCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                                    {promptCopied ? 'Đã copy Prompt!' : 'Copy Prompt AI'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDirectImportModal(false);
                                        setImportModalError('');
                                    }}
                                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Chọn cấp độ JLPT mặc định:
                                </label>
                                <div className="flex gap-1.5">
                                    {JLPT_LEVELS.map(lvl => (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => setImportLevel(lvl)}
                                            className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                                importLevel === lvl
                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Raw Text Conversion Box */}
                            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        1. Dán văn bản / ghi chú thô vào đây (AI sẽ tự động chuẩn hóa sang JSON):
                                    </label>
                                </div>
                                <textarea
                                    placeholder="Dán bất kỳ ghi chú, bài học hoặc văn bản thô nào về ngữ pháp vào đây..."
                                    value={rawAiInput}
                                    onChange={e => setRawAiInput(e.target.value)}
                                    rows={3}
                                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 rounded-xl outline-none focus:border-indigo-500 font-sans"
                                />
                                <button
                                    onClick={handleAiGenerateJson}
                                    disabled={aiGenerating || !rawAiInput.trim()}
                                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                                    {aiGenerating ? 'AI đang phân tích & tự động tạo JSON chuẩn...' : '🤖 Tự động tạo JSON chuẩn từ văn bản thô (Bằng AI)'}
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                                    2. Kiểm tra hoặc chỉnh sửa chuỗi JSON bên dưới rồi bấm Import:
                                </label>
                                <textarea
                                    value={jsonInputText}
                                    onChange={(e) => setJsonInputText(e.target.value)}
                                    placeholder='Chuỗi JSON ngữ pháp chuẩn sẽ xuất hiện ở đây sau khi bấm tạo bằng AI hoặc tự dán...'
                                    className="w-full h-52 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono dark:text-slate-200 outline-none focus:border-emerald-500 transition-all custom-scrollbar"
                                />
                            </div>

                            {importModalError && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl">
                                    {importModalError}
                                </div>
                            )}

                            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" /> Tự động xử lý thông minh:
                                </p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Hệ thống tự tạo giáo trình & bài học phù hợp nếu chưa có. Không cần thao tác thủ công tạo giáo trình trước!
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <button
                                onClick={() => {
                                    setShowDirectImportModal(false);
                                    setImportModalError('');
                                }}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDirectImport}
                                disabled={isImportingJson || !jsonInputText.trim()}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
                            >
                                {isImportingJson ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Đang Import...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileJson className="w-4 h-4" />
                                        <span>Import Ngay vào Web</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrammarListScreen;
