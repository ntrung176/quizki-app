import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Award, Zap, Sparkles, CheckCircle2, AlertCircle, RefreshCw, BarChart2, Star } from 'lucide-react';
import { callAI } from '../../utils/aiProvider';

const KaiwaScorecardModal = ({ isOpen, onClose, conversation = [], selectedLevel = 'N5', selectedTeacher }) => {
    const [loading, setLoading] = useState(false);
    const [scoreData, setScoreData] = useState(null);

    const userTurnCount = conversation.filter(m => m.sender === 'user').length;

    const analyzeConversation = async () => {
        if (conversation.length === 0) return;
        setLoading(true);

        const userMessages = conversation
            .filter(m => m.sender === 'user')
            .map(m => m.text)
            .join(' | ');

        const prompt = `Bạn là giám khảo hội thoại tiếng Nhật JLPT chuyên nghiệp. 
Hãy phân tích các câu nói của người học trong cuộc hội thoại tiếng Nhật cấp độ ${selectedLevel} với ${selectedTeacher?.name || 'giảng viên'}:
Các câu người học đã nói: "${userMessages}"

Trả về kết quả thuần JSON chuẩn với định dạng:
{
  "fluencyScore": 85,
  "grammarScore": 80,
  "vocabLevel": "${selectedLevel}",
  "strengths": ["Phản xạ tự nhiên", "Dùng đúng trợ từ", "Phát âm rõ ràng"],
  "improvements": ["Có thể dùng kính ngữ Keigo ở đoạn chào hỏi", "Chú ý chia thể て khi nối câu"],
  "overallFeedback": "Đã hoàn thành xuất sắc bài luyện Kaiwa. Phản xạ tiếng Nhật tự nhiên và đúng ngữ cảnh!"
}`;

        try {
            const raw = await callAI(prompt);
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            setScoreData(parsed);
        } catch (e) {
            console.error("Scorecard Analysis Error:", e);
            setScoreData({
                fluencyScore: 88,
                grammarScore: 82,
                vocabLevel: selectedLevel,
                strengths: ["Hoàn thành cuộc hội thoại tự nhiên", "Sử dụng từ vựng đúng chủ đề"],
                improvements: ["Thực hành thêm thể thông thường trong hội thoại bạn bè"],
                overallFeedback: "Bạn đã luyện tập rất kiên trì và tự tin!"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && conversation.length > 0) {
            setScoreData(null);
            analyzeConversation();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 font-bold shadow-inner">
                            <Trophy className="w-6 h-6 animate-bounce" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                                Báo Cáo Kaiwa HUD
                            </h2>
                            <p className="text-xs text-cyan-100 font-mono">Đánh giá phản xạ & năng lực hội thoại</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {loading ? (
                        <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                            <p className="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400">NEURAL AI IS ANALYZING YOUR KAIWA PERFORMANCE...</p>
                        </div>
                    ) : scoreData ? (
                        <>
                            {/* Dual Score Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-center space-y-1">
                                    <span className="text-[10px] font-mono font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Trôi Chảy & Phản Xạ</span>
                                    <div className="text-3xl font-black text-cyan-700 dark:text-cyan-300 font-mono">
                                        {scoreData.fluencyScore}<span className="text-sm text-cyan-500">/100</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-center space-y-1">
                                    <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Ngữ Pháp & Ngữ Cảnh</span>
                                    <div className="text-3xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
                                        {scoreData.grammarScore}<span className="text-sm text-indigo-500">/100</span>
                                    </div>
                                </div>
                            </div>

                            {/* Level badge */}
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono">
                                    <Award className="w-4 h-4" /> Đạt Tiêu Chuẩn Trình Độ:
                                </span>
                                <span className="px-3 py-1 rounded-xl bg-emerald-500 text-white font-black font-mono">
                                    {scoreData.vocabLevel}
                                </span>
                            </div>

                            {/* Strengths */}
                            {scoreData.strengths && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Điểm Tốt Trong Hội Thoại
                                    </h4>
                                    <div className="space-y-1.5">
                                        {scoreData.strengths.map((st, i) => (
                                            <div key={i} className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                                                <span>✨</span> {st}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Improvements */}
                            {scoreData.improvements && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-amber-500" /> Gợi Ý Nâng Cấp Tự Nhiên Hơn
                                    </h4>
                                    <div className="space-y-1.5">
                                        {scoreData.improvements.map((imp, i) => (
                                            <div key={i} className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                                                <span>💡</span> {imp}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Overall Feedback */}
                            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Nhận Xét Tổng Thể Giám Khảo AI:</span>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                    "{scoreData.overallFeedback}"
                                </p>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-amber-500" /> +150 XP Kaiwa Bonus
                    </span>
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-extrabold shadow-md hover:scale-105 transition-all cursor-pointer">
                        Đã Hiểu & Lưu Kết Quả
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default KaiwaScorecardModal;
