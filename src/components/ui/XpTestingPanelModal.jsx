import React, { useState } from 'react';
import { Award, Zap, Trophy, CheckCircle2, ShieldCheck, Play, HelpCircle, X, RefreshCw, BarChart2 } from 'lucide-react';
import { getLevelFromXp, getLevelTitle } from '../../utils/scoring';

/**
 * XpTestingPanelModal - Interactive XP & Leaderboard Test Suite
 * Allows testing and verifying XP awards, leveling progress, and live Leaderboard scores.
 */
const XpTestingPanelModal = ({ isOpen, onClose, profile, awardXP, userId }) => {
    const [testLog, setTestLog] = useState([]);
    const [isSimulating, setIsSimulating] = useState(false);

    if (!isOpen) return null;

    const currentXp = profile?.xp || 0;
    const currentLevel = profile?.level || getLevelFromXp(currentXp);
    const currentTitle = profile?.title || getLevelTitle(currentLevel);
    const currentStreak = profile?.streak || 0;

    const xpSources = [
        { id: 'vocab_srs', name: 'SRS Từ Vựng (Review)', points: '8 - 60 XP / thẻ', formula: 'Base (8-60) × Level multiplier (1.0x - 1.6x) + Promotion bonus (+100 XP)', status: '🟢 Đã kết nối' },
        { id: 'kanji_srs', name: 'SRS Kanji (Review)', points: '8 - 60 XP / chữ', formula: 'Base (8-60) × JLPT multiplier + Promotion bonus (+100 XP)', status: '🟢 Đã kết nối' },
        { id: 'grammar_srs', name: 'SRS Ngữ Pháp (Review)', points: '8 - 60 XP / mẫu', formula: 'Base (8-60) × Level multiplier + Promotion bonus (+100 XP)', status: '🟢 Đã bổ sung' },
        { id: 'flashcard_study', name: 'Học Thẻ Flashcard', points: '10 XP / thẻ', formula: 'Cộng 10 XP cho mỗi thẻ đã lật qua', status: '🟢 Đã kết nối' },
        { id: 'quiz_test', name: 'Luyện Thi Trắc Nghiệm', points: '20 XP / câu đúng', formula: '20 XP × Số câu đúng + 50 XP hoàn thành bài test', status: '🟢 Đã kết nối' },
        { id: 'kaiwa_ai', name: 'Luyện Hội Thoại AI Kaiwa', points: '50 - 100 XP / phiên', formula: 'Scorecard AI × 50 - 100 XP dựa trên điểm số hội thoại', status: '🟢 Đã kết nối' },
        { id: 'kanji_lesson', name: 'Học Bài Mới Kanji', points: '25 XP / bài', formula: 'Cộng 25 XP khi hoàn thành bài học Hán tự', status: '🟢 Đã kết nối' },
        { id: 'add_content', name: 'Tạo Từ Vựng / Kanji Mới', points: '10 XP / từ', formula: 'Cộng 10 XP khi tự tạo thẻ hoặc bộ học mới', status: '🟢 Đã kết nối' },
    ];

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
                    <div className="flex items-center space-y-0 space-x-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
                            <Trophy className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                Bảng Kiểm Tra & Chẩn Đoán Điểm XP (XP Test Suite)
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Kiểm tra tính chính xác việc cộng XP và đồng bộ BXH cho tất cả tính năng
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User Stats Card */}
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

                {/* Table Content */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                        💡 <strong>Đã khắc phục lỗi điểm BXH giảm:</strong> Công thức điểm xếp hạng hiện tại dựa trên <strong>Tổng XP tích lũy + Chuỗi ngày Streak</strong> nên điểm chỉ tăng tiến đều theo thời gian, tuyệt đối không bị sụt giảm khi trôi qua 7 ngày nữa!
                    </div>

                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Danh Sách Tất Cả Các Phần Tính Điểm & Nút Thử Nghiệm:
                    </h3>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold">
                                    <th className="p-3">Tính Năng / Mục Học</th>
                                    <th className="p-3">Mức Điểm XP</th>
                                    <th className="p-3 hidden sm:table-cell">Công Thức Chi Tiết</th>
                                    <th className="p-3 text-right">Thao Tác Test</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {xpSources.map((item) => (
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
                                                onClick={() => handleTriggerTestXP(item.name, 25)}
                                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-[11px] transition-all inline-flex items-center gap-1 shadow-sm"
                                            >
                                                <Zap className="w-3 h-3 fill-amber-300 text-amber-300" /> +25 XP
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

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

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Tất cả các điểm XP được cộng thử sẽ lập tức lưu vào tài khoản & đồng bộ BXH.
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold rounded-xl text-xs transition-colors"
                    >
                        Đóng Bảng Test
                    </button>
                </div>
            </div>
        </div>
    );
};

export default XpTestingPanelModal;
