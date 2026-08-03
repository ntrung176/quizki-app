import React, { useState } from 'react';
import { Award, Zap, Trophy, CheckCircle2, ShieldCheck, Play, HelpCircle, X, RefreshCw, BarChart2, BookOpen, Layers, Sparkles } from 'lucide-react';
import { getLevelFromXp, getLevelTitle } from '../../utils/scoring';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp, query } from 'firebase/firestore';
import { showToast } from '../../utils/toast';
import { normalizeAllUserScores } from '../../utils/normalizeUserScore';

/**
 * XpTestingPanelModal - Interactive XP & Leaderboard Test Suite
 * Allows testing and verifying XP awards, leveling progress, live Leaderboard scores,
 * and batch recalculating/synchronizing scores for ALL users in Firestore.
 */
const XpTestingPanelModal = ({ isOpen, onClose, profile, awardXP, userId }) => {
    const [testLog, setTestLog] = useState([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [activeTab, setActiveTab] = useState('ALL');

    if (!isOpen) return null;

    const currentXp = profile?.xp || 0;
    const currentLevel = profile?.level || getLevelFromXp(currentXp);
    const currentTitle = profile?.title || getLevelTitle(currentLevel);

    const categories = [
        { id: 'ALL', name: 'Tất Cả Mục', icon: '🌟' },
        { id: 'VOCAB', name: 'Từ Vựng', icon: '📚' },
        { id: 'KANJI', name: 'Kanji', icon: '🈸' },
        { id: 'GRAMMAR', name: 'Ngữ Pháp', icon: '⛩️' },
        { id: 'PRACTICE', name: 'Luyện Thi & AI', icon: '🎮' },
    ];

    const xpSources = [
        // 📚 Từ Vựng
        { id: 'vocab_srs', category: 'VOCAB', categoryName: '📚 Menu Từ Vựng', name: 'SRS Từ Vựng (Review Ngắt Quãng)', points: '1 - 6 XP / thẻ', formula: 'Trả lời đúng: Lặp lại (+1), Khó (+2), Tốt (+4), Dễ (+6 XP)', testAmount: 4, status: '🟢 Đã kết nối' },
        { id: 'flashcard_study', category: 'VOCAB', categoryName: '📚 Menu Từ Vựng', name: 'Học Thẻ Flashcard Học Phần', points: '3 XP / thẻ', formula: '+3 XP cho mỗi thẻ lật xem + 10 XP thưởng hoàn thành bài', testAmount: 3, status: '🟢 Đã kết nối' },
        { id: 'vocab_set_practice', category: 'VOCAB', categoryName: '📚 Menu Từ Vựng', name: 'Trắc Nghiệm / Gõ Từ Học Phần', points: '3 XP / câu', formula: '+3 XP cho mỗi câu đúng + 10 XP thưởng hoàn thành lượt ôn', testAmount: 3, status: '🟢 Đã kết nối' },
        { id: 'book_lesson', category: 'VOCAB', categoryName: '📚 Menu Từ Vựng', name: 'Học Từ Vựng Theo Sách / Giáo Trình', points: '2 XP / từ + 10 XP / bài', formula: '+2 XP cho mỗi từ lật trong bài + 10 XP thưởng hoàn thành bài học', testAmount: 2, status: '🟢 Đã kết nối' },
        { id: 'add_vocab', category: 'VOCAB', categoryName: '📚 Menu Từ Vựng', name: 'Tự Tạo Từ Vựng / Bộ Thẻ Mới', points: '2 XP / từ', formula: '+2 XP khi tự tạo từ mới hoặc import từ vựng vào bộ học', testAmount: 2, status: '🟢 Đã kết nối' },

        // 🈸 Kanji
        { id: 'kanji_srs', category: 'KANJI', categoryName: '🈸 Menu Kanji (Hán Tự)', name: 'SRS Kanji (Review Ngắt Quãng)', points: '1 - 10 XP / chữ', formula: 'Trả lời đúng: Lặp lại (+1), Khó (+3), Tốt (+6), Dễ (+10 XP)', testAmount: 6, status: '🟢 Đã kết nối' },
        { id: 'kanji_lesson', category: 'KANJI', categoryName: '🈸 Menu Kanji (Hán Tự)', name: 'Học Bài Mới Kanji Theo Cấp Độ', points: '5 XP / bài', formula: '+5 XP khi hoàn thành lượt học bài Hán tự mới', testAmount: 5, status: '🟢 Đã kết nối' },

        // ⛩️ Ngữ Pháp
        { id: 'grammar_srs', category: 'GRAMMAR', categoryName: '⛩️ Menu Ngữ Pháp', name: 'SRS Ngữ Pháp (Review Ngắt Quãng)', points: '1 - 6 XP / mẫu', formula: 'Trả lời đúng: Lặp lại (+1), Khó (+2), Tốt (+4), Dễ (+6 XP)', testAmount: 4, status: '🟢 Đã kết nối' },
        { id: 'grammar_practice', category: 'GRAMMAR', categoryName: '⛩️ Menu Ngữ Pháp', name: 'Luyện Tập Ngữ Pháp Theo Bài', points: '3 XP / câu', formula: '+3 XP cho mỗi câu gõ/chọn đúng + 10 XP hoàn thành bài', testAmount: 3, status: '🟢 Đã kết nối' },

        // 🎮 Luyện Thi & AI Kaiwa
        { id: 'quiz_test', category: 'PRACTICE', categoryName: '🎮 Menu Luyện Thi & AI Kaiwa', name: 'Luyện Thi Trắc Nghiệm JLPT', points: '2 XP / câu đúng', formula: '2 XP × Số câu đúng + 20 XP thưởng hoàn thành đề thi', testAmount: 2, status: '🟢 Đã kết nối' },
        { id: 'kaiwa_ai', category: 'PRACTICE', categoryName: '🎮 Menu Luyện Thi & AI Kaiwa', name: 'Luyện Hội Thoại AI Kaiwa', points: '10 XP / phiên', formula: '+10 XP cho mỗi phiên luyện nói Kaiwa với AI', testAmount: 10, status: '🟢 Đã kết nối' },
    ];

    const filteredSources = activeTab === 'ALL' 
        ? xpSources 
        : xpSources.filter(s => s.category === activeTab);

    // Group filtered sources by categoryName for clean visual headers
    const groupedSources = filteredSources.reduce((groups, source) => {
        const cat = source.categoryName;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(source);
        return groups;
    }, {});

    const handleTriggerTestXP = (sourceName, amount) => {
        setIsSimulating(true);
        if (awardXP) {
            awardXP(amount);
        }
        const timeStr = new Date().toLocaleTimeString('vi-VN');
        setTestLog(prev => [
            { id: Date.now(), time: timeStr, source: sourceName, amount: amount, status: 'Thành công' },
            ...prev
        ]);
        setTimeout(() => setIsSimulating(false), 300);
    };

    // Batch Recalculate & Synchronize Scores for ALL Users in Firestore
    const handleRecalculateAllUserScores = async () => {
        if (!db || !appId) return;
        setIsRecalculating(true);
        try {
            const publicStatsPath = `artifacts/${appId}/public/data/userStats`;
            const q = query(collection(db, publicStatsPath));
            const snap = await getDocs(q);
            
            let updatedCount = 0;
            let alreadyCorrectCount = 0;
            let errorCount = 0;

            for (const userDoc of snap.docs) {
                try {
                    const data = userDoc.data();
                    const xp = Math.max(Number(data.xp || 0), Number(data.score || 0), Number(data.totalXp || 0));
                    const masteredVocab = Number(data.mastered || 0);
                    const masteredKanji = Number(data.kanjiMastered || 0);
                    const streak = Number(data.streak || 0);
                    const activeDays = Number(data.activeDays || 0);

                    // Multi-Dimensional Honor Score Formula
                    const calculatedScore = Math.round(
                        xp +
                        (masteredVocab * 10) +
                        (masteredKanji * 25) +
                        (streak * 30) +
                        (activeDays * 15)
                    );

                    if (data.score !== calculatedScore) {
                        // Update publicStats doc
                        await setDoc(doc(db, publicStatsPath, userDoc.id), {
                            score: calculatedScore,
                            lastUpdated: serverTimestamp()
                        }, { merge: true });

                        // Try updating user profile doc if permitted
                        try {
                            const profileRef = doc(db, `artifacts/${appId}/users/${userDoc.id}/settings/profile`);
                            await setDoc(profileRef, { score: calculatedScore }, { merge: true });
                        } catch (pErr) {
                            // Permission denied for other user profiles is expected in client SDK
                        }

                        updatedCount++;
                    } else {
                        alreadyCorrectCount++;
                    }
                } catch (userErr) {
                    console.warn(`Lỗi cập nhật user ${userDoc.id}:`, userErr);
                    errorCount++;
                }
            }

            const total = snap.docs.length;
            showToast(`✅ Đã quét tất cả ${total} người dùng: Cập nhật mới ${updatedCount} user, ${alreadyCorrectCount} user điểm đã chuẩn sẵn từ trước!`, 'success');
            
            const timeStr = new Date().toLocaleTimeString('vi-VN');
            setTestLog(prev => [
                { 
                    id: Date.now(), 
                    time: timeStr, 
                    source: `Đã quét ${total} user (Cập nhật ${updatedCount}, Chuẩn sẵn ${alreadyCorrectCount})`, 
                    amount: 0, 
                    status: 'Hoàn tất 100%' 
                },
                ...prev
            ]);
        } catch (e) {
            console.error("Lỗi khi chuẩn hóa điểm người dùng:", e);
            showToast("Lỗi khi đồng bộ điểm: " + e.message, 'error');
        } finally {
            setIsRecalculating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
                            <Trophy className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                Bảng Kiểm Tra & Chẩn Đoán Điểm XP (Admin XP Test Suite)
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Kiểm tra tính chính xác việc cộng XP và đồng bộ BXH phân loại theo Menu học tập
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User Stats Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Tổng XP Hiện Tại</span>
                        <span className="text-xl font-black text-amber-500 flex items-center justify-center gap-1 mt-0.5">
                            <Zap className="w-4 h-4 fill-amber-500" /> {currentXp.toLocaleString()} XP
                        </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Cấp Độ (Level)</span>
                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                            Lv.{currentLevel}
                        </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Danh Hiệu</span>
                        <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400 mt-1 block truncate">
                            {currentTitle}
                        </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Trạng Thái Đồng Bộ</span>
                        <span className="text-xs font-bold text-emerald-500 flex items-center justify-center gap-1 mt-1">
                            <ShieldCheck className="w-4 h-4" /> Đã Khóa Tăng Đều
                        </span>
                    </div>
                </div>

                {/* Category Navigation Tabs */}
                <div className="px-4 pt-3 pb-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                activeTab === cat.id
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                        </button>
                    ))}
                </div>

                {/* Content Table */}
                <div className="p-4 overflow-y-auto flex-1 space-y-5">
                    {Object.entries(groupedSources).map(([categoryTitle, sources]) => (
                        <div key={categoryTitle} className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                <span>{categoryTitle}</span>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                            </div>

                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold">
                                            <th className="p-3">Mục Học Tập</th>
                                            <th className="p-3">Mức Điểm XP</th>
                                            <th className="p-3 hidden sm:table-cell">Công Thức Chi Tiết</th>
                                            <th className="p-3 text-right">Thao Tác Test</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {sources.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                                                    {item.name}
                                                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-normal mt-0.5">
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-extrabold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                    {item.points}
                                                </td>
                                                <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] hidden sm:table-cell">
                                                    {item.formula}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleTriggerTestXP(item.name, item.testAmount || 3)}
                                                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-[11px] transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                                    >
                                                        <Zap className="w-3 h-3 fill-amber-300 text-amber-300" /> +{item.testAmount || 3} XP
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Test Action Log */}
                    {testLog.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lịch Sử Test Trực Tiếp:</h4>
                            <div className="bg-slate-900 text-slate-200 rounded-2xl p-3 font-mono text-xs max-h-32 overflow-y-auto space-y-1">
                                {testLog.map(log => (
                                    <div key={log.id} className="flex justify-between items-center text-[11px]">
                                        <span>[{log.time}] Test thành công mục: <strong className="text-indigo-400">{log.source}</strong></span>
                                        <span className="text-emerald-400 font-bold">+{log.amount} XP</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer with Batch Recalibration */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={handleRecalculateAllUserScores}
                            disabled={isRecalculating}
                            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            title="Tính lại điểm số BXH dựa trên XP + Streak + ActiveDays"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                            {isRecalculating ? 'Đang Xử Lý...' : '🔄 Đồng Bộ Công Thức BXH'}
                        </button>

                        <button
                            onClick={async () => {
                                if (!db || !appId) return;
                                setIsRecalculating(true);
                                try {
                                    const result = await normalizeAllUserScores();
                                    showToast(`⚡ Đã chuẩn hóa ${result.total} người dùng: Gán Score = XP thành công!`, 'success');
                                    const timeStr = new Date().toLocaleTimeString('vi-VN');
                                    setTestLog(prev => [
                                        { 
                                            id: Date.now(), 
                                            time: timeStr, 
                                            source: `Chuẩn hóa Score = XP (${result.total} user, cập nhật ${result.updatedCount})`, 
                                            amount: 0, 
                                            status: 'Hoàn tất 100%' 
                                        },
                                        ...prev
                                    ]);
                                } catch (e) {
                                    console.error("Lỗi khi chuẩn hóa điểm:", e);
                                    showToast("Lỗi khi chuẩn hóa điểm: " + e.message, 'error');
                                } finally {
                                    setIsRecalculating(false);
                                }
                            }}
                            disabled={isRecalculating}
                            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-600 hover:to-purple-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-white/20"
                            title="Chuẩn hóa điểm người dùng: Gán trực tiếp điểm trên Bảng xếp hạng = XP của người dùng"
                        >
                            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                            {isRecalculating ? 'Đang Chuẩn Hóa...' : '⚡ Chuẩn Hóa Điểm Người Dùng (Score = XP)'}
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                        Đóng Bảng Test
                    </button>
                </div>
            </div>
        </div>
    );
};

export default XpTestingPanelModal;
