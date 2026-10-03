import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Volume2, CheckCircle2, XCircle, Sparkles, BookOpen,
    MessageSquare, AlertTriangle, ChevronRight, Layers, HelpCircle, Heart
} from 'lucide-react';
import { speakExampleSentence } from '../../utils/audio';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import { showToast } from '../../utils/toast';

const GrammarTopicDetailScreen = () => {
    const { topicId } = useParams();
    const navigate = useNavigate();

    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('patterns');

    // Saved states
    const [isTopicSaved, setIsTopicSaved] = useState(false);
    const [savedPatterns, setSavedPatterns] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_saved_grammar_patterns') || '[]');
        } catch {
            return [];
        }
    });

    useEffect(() => {
        const fetchTopic = async () => {
            try {
                const res = await fetch('/data/grammar_hub_curriculum.json');
                if (res.ok) {
                    const data = await res.json();
                    const found = data.find(t => t.id === topicId);
                    setTopic(found || null);

                    // Check if topic is saved
                    const savedTopics = JSON.parse(localStorage.getItem('quizki_saved_grammar_topics') || '[]');
                    setIsTopicSaved(savedTopics.includes(topicId));
                }
            } catch (err) {
                console.error('Error fetching topic:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTopic();
    }, [topicId]);

    const toggleSaveTopic = () => {
        if (!topic) return;
        try {
            const savedTopics = JSON.parse(localStorage.getItem('quizki_saved_grammar_topics') || '[]');
            let next;
            if (savedTopics.includes(topic.id)) {
                next = savedTopics.filter(id => id !== topic.id);
                setIsTopicSaved(false);
                showToast(`Đã bỏ lưu bài học "${topic.titleVi}"`, 'info');
            } else {
                next = [...savedTopics, topic.id];
                setIsTopicSaved(true);
                showToast(`Đã lưu bài học "${topic.titleVi}" vào danh sách yêu thích`);
            }
            localStorage.setItem('quizki_saved_grammar_topics', JSON.stringify(next));
        } catch (e) {
            console.error('Error saving topic:', e);
        }
    };

    const toggleSavePattern = (patternName) => {
        setSavedPatterns(prev => {
            let next;
            if (prev.includes(patternName)) {
                next = prev.filter(p => p !== patternName);
                showToast(`Đã bỏ lưu mẫu câu "${patternName}"`, 'info');
            } else {
                next = [...prev, patternName];
                showToast(`Đã lưu mẫu câu "${patternName}"`);
            }
            localStorage.setItem('quizki_saved_grammar_patterns', JSON.stringify(next));
            return next;
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fcfcfc] dark:bg-slate-950 flex flex-col">
                <TopTabBar tabs={GRAMMAR_TABS} activeTab="grammar-curriculum" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="min-h-screen bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
                <TopTabBar tabs={GRAMMAR_TABS} activeTab="grammar-curriculum" />
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-lg font-bold mb-2">Không tìm thấy chủ đề này</h2>
                    <button
                        onClick={() => navigate('/grammar/curriculum')}
                        className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-sm rounded-2xl transition shadow-sm cursor-pointer"
                    >
                        Quay lại danh sách chủ đề
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-24">
            {/* Top Bar Tabs */}
            <TopTabBar tabs={GRAMMAR_TABS} activeTab="grammar-curriculum" />

            <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6 animate-fade-in">
                {/* Back button & Action Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/grammar/curriculum')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-xs cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Danh sách chủ đề {topic.level}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-2xl text-xs font-black border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            {topic.level} • BÀI {topic.bai}
                        </span>

                        {/* Save Entire Topic Heart Button */}
                        <button
                            type="button"
                            onClick={toggleSaveTopic}
                            className={`p-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                                isTopicSaved
                                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
                            }`}
                            title={isTopicSaved ? "Bỏ lưu bài học này" : "Lưu toàn bộ bài học"}
                        >
                            <Heart className={`w-4 h-4 transition-colors ${isTopicSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span className="hidden sm:inline">{isTopicSaved ? 'Đã lưu' : 'Lưu bài'}</span>
                        </button>
                    </div>
                </div>

                {/* Header Card - Minimal B&W */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                        <div className="space-y-2 max-w-2xl flex-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span>{topic.levelLabel}</span>
                                <span>•</span>
                                <span>Bài {topic.bai}</span>
                                {topic.reading && (
                                    <>
                                        <span>•</span>
                                        <span className="font-japanese font-semibold">{topic.reading}</span>
                                    </>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                                {topic.titleVi}
                            </h1>

                            {topic.titleJp && (
                                <div className="text-sm font-japanese font-medium text-slate-500 dark:text-slate-400">
                                    {topic.titleJp}
                                </div>
                            )}

                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                                {topic.descVi}
                            </p>
                        </div>

                        {/* Calligraphy Kanji Stamp */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl sm:text-4xl font-black font-japanese text-slate-900 dark:text-white select-none shadow-xs">
                            {topic.kanji}
                        </div>
                    </div>

                    {/* Self Check Goals */}
                    {topic.selfCheckGoals && topic.selfCheckGoals.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                                <span>Mục tiêu tự đánh giá sau bài học:</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {topic.selfCheckGoals.map((goal, gIdx) => (
                                    <div
                                        key={gIdx}
                                        className="flex items-start gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        <span>{goal}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sub Tabs: Patterns vs Reading Passage */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('patterns')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                            activeTab === 'patterns'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        📚 Các mẫu ngữ pháp ({topic.patterns?.length || 0})
                    </button>
                    {topic.readingPassage && (
                        <button
                            onClick={() => setActiveTab('reading')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                                activeTab === 'reading'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            📖 Bài đọc ứng dụng
                        </button>
                    )}
                </div>

                {/* 1. PATTERNS LIST - Minimal B&W */}
                {activeTab === 'patterns' && (
                    <div className="space-y-5">
                        {topic.patterns?.map((pt, pIdx) => {
                            const isPatternSaved = savedPatterns.includes(pt.pattern);

                            return (
                                <div
                                    key={pIdx}
                                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-4 hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200"
                                >
                                    {/* Header: Pattern Name & Sound + Heart Button */}
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="text-xl sm:text-2xl font-black font-japanese text-slate-900 dark:text-white">
                                                    {pt.pattern}
                                                </span>
                                                <button
                                                    onClick={() => speakExampleSentence(pt.pattern)}
                                                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                                    title="Nghe phát âm mẫu câu"
                                                >
                                                    <Volume2 className="w-4 h-4" />
                                                </button>

                                                {/* Pattern-level Heart Save Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSavePattern(pt.pattern)}
                                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer active:scale-90"
                                                    title={isPatternSaved ? "Bỏ lưu mẫu câu này" : "Lưu mẫu câu yêu thích"}
                                                >
                                                    <Heart className={`w-4 h-4 transition-colors ${isPatternSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                </button>
                                            </div>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                💡 {pt.meaning}
                                            </div>
                                        </div>

                                        {pt.priority && (
                                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase">
                                                {pt.priority}
                                            </span>
                                        )}
                                    </div>

                                    {/* Deep Explanation */}
                                    {pt.explanation && (
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            {pt.explanation}
                                        </p>
                                    )}

                                    {/* Special Note */}
                                    {pt.note && (
                                        <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-2xl font-medium">
                                            📌 <strong>Lưu ý:</strong> {pt.note}
                                        </div>
                                    )}

                                    {/* Examples */}
                                    {pt.examples && pt.examples.length > 0 && (
                                        <div className="space-y-2.5">
                                            <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                                                Ví dụ thực tế:
                                            </div>
                                            {pt.examples.map((ex, eIdx) => {
                                                const jaText = ex.japanese || ex.ja || ex.text || ex.sentence;
                                                const viText = ex.vietnamese || ex.vi || ex.meaning || ex.translation;
                                                return (
                                                    <div
                                                        key={eIdx}
                                                        className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 group hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="font-japanese font-medium text-slate-800 dark:text-slate-100 text-sm">
                                                                {jaText}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                {viText}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => speakExampleSentence(jaText)}
                                                            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer"
                                                            title="Nghe phát âm"
                                                        >
                                                            <Volume2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Real Dialogue Section */}
                                    {pt.dialogue && pt.dialogue.lines && pt.dialogue.lines.length > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                            <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>Hội thoại thực tế: {pt.dialogue.title || 'Ứng dụng trong giao tiếp'}</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                {pt.dialogue.lines.map((line, lIdx) => (
                                                    <div key={lIdx} className="flex items-start gap-2.5 text-xs">
                                                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shrink-0 text-[10px]">
                                                            {line.speaker}
                                                        </span>
                                                        <div className="flex-1">
                                                            <div className="font-japanese font-medium text-slate-800 dark:text-slate-200">
                                                                {line.text}
                                                            </div>
                                                            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                                {line.translation}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => speakExampleSentence(line.text)}
                                                            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer"
                                                            title="Nghe phát âm"
                                                        >
                                                            <Volume2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Common Mistakes Callout */}
                                    {pt.commonMistake && (
                                        <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-xs space-y-1.5">
                                            <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                                <span>❌ {pt.commonMistake.wrong}</span>
                                            </div>
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                                <span>✅ {pt.commonMistake.correct}</span>
                                            </div>
                                            {pt.commonMistake.why && (
                                                <div className="text-slate-600 dark:text-slate-400 pl-5 pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
                                                    👉 {pt.commonMistake.why}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 2. READING PASSAGE */}
                {activeTab === 'reading' && topic.readingPassage && (
                    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                                {topic.readingPassage.title}
                            </h3>
                            <p className="text-xs text-slate-400">{topic.readingPassage.titleVi}</p>
                        </div>

                        {/* Japanese Text */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 font-japanese text-sm sm:text-base leading-loose text-slate-800 dark:text-slate-200">
                            {topic.readingPassage.japanese}
                        </div>

                        {/* Vietnamese Translation */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            <strong>Bản dịch:</strong> {topic.readingPassage.vietnamese}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarTopicDetailScreen;
