import React, { useState } from 'react';
import { X, Volume2, CheckCircle, ChevronLeft, ChevronRight, BookOpen, Lightbulb, Info, ArrowRightLeft } from 'lucide-react';
import { speakEnglish } from '../../utils/audio';

const IpaCardModal = ({
    item,
    isOpen,
    onClose,
    onNext,
    onPrev,
    isMastered = false,
    onToggleMastery
}) => {
    const [activeTab, setActiveTab] = useState('articulation'); // 'articulation' | 'minimal_pairs' | 'examples'

    if (!isOpen || !item) return null;

    const handlePlayAudio = (textToSpeak) => {
        speakEnglish(textToSpeak || item.keyWord);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-violet-400/30 dark:border-violet-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all"
            >
                {/* Header with gradient banner */}
                <div className="relative bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="min-w-[60px] h-14 px-2.5 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner font-serif shrink-0">
                            <span className="font-black text-3xl whitespace-nowrap leading-none">
                                /{item.char}/
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold tracking-tight">{item.name}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-sm uppercase">
                                    {item.type}
                                </span>
                            </div>
                            <p className="text-xs text-purple-100 font-medium mt-0.5">
                                Từ khóa đại diện: <strong className="text-white font-bold">{item.keyWord}</strong> ({item.keyWordMeaning})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => handlePlayAudio(item.keyWord)}
                            className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            title="Nghe phát âm chuẩn"
                        >
                            <Volume2 className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            title="Đóng modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-nav Tab Switcher */}
                <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-1.5 gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('articulation')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'articulation'
                                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <Info className="w-3.5 h-3.5" />
                        <span>Khẩu hình & Khí âm</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('minimal_pairs')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'minimal_pairs'
                                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Cặp âm dễ nhầm</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('examples')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'examples'
                                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Từ vựng mẫu ({item.examples?.length || 0})</span>
                    </button>
                </div>

                {/* Modal Body Content */}
                <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
                    {/* TAB 1: ARTICULATION GUIDE */}
                    {activeTab === 'articulation' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Big Character Card */}
                            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/60 relative">
                                <span className="text-6xl font-black font-serif text-violet-900 dark:text-violet-100 select-none">
                                    /{item.char}/
                                </span>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                        Ví dụ chuẩn:
                                    </span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        {item.keyWord} ({item.keyWordMeaning})
                                    </span>
                                </div>
                            </div>

                            {/* Detailed Articulation description */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Hướng dẫn khẩu hình miệng & Vị trí đặt lưỡi:
                                </span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {item.articulation}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: MINIMAL PAIRS */}
                    {activeTab === 'minimal_pairs' && (
                        <div className="space-y-4 animate-fade-in">
                            {item.minimalPair ? (
                                <div className="space-y-3">
                                    <span className="text-xs font-bold text-slate-500 block px-1">
                                        So sánh phân biệt cặp âm tương phản:
                                    </span>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Word A */}
                                        <div 
                                            onClick={() => handlePlayAudio(item.minimalPair.wordA)}
                                            className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-center space-y-1.5 cursor-pointer hover:border-violet-400 hover:shadow-md transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-violet-200 dark:bg-violet-900 text-violet-700 dark:text-violet-300 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Volume2 className="w-4 h-4" />
                                            </div>
                                            <div className="text-lg font-black text-violet-900 dark:text-violet-100">
                                                {item.minimalPair.wordA}
                                            </div>
                                            <div className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                                                {item.minimalPair.ipaA}
                                            </div>
                                        </div>

                                        {/* Word B */}
                                        <div 
                                            onClick={() => handlePlayAudio(item.minimalPair.wordB)}
                                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1.5 cursor-pointer hover:border-violet-400 hover:shadow-md transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Volume2 className="w-4 h-4" />
                                            </div>
                                            <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                                                {item.minimalPair.wordB}
                                            </div>
                                            <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                                                {item.minimalPair.ipaB}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-slate-500 text-center font-medium pt-1">
                                        💡 Bấm vào từng thẻ để nghe và phân biệt rõ sự khác biệt giữa hai âm.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                                    Âm này là âm độc lập, hãy tập trung vào khẩu hình miệng chuẩn.
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: EXAMPLES */}
                    {activeTab === 'examples' && (
                        <div className="space-y-3 animate-fade-in">
                            <span className="text-xs font-bold text-slate-500 block px-1">
                                Các từ vựng mẫu chuẩn Oxford chứa âm /{item.char}/:
                            </span>
                            {item.examples && item.examples.length > 0 ? (
                                item.examples.map((ex, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handlePlayAudio(ex.word)}
                                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between hover:border-violet-400 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                <Volume2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                                    <span>{ex.word}</span>
                                                    <span className="text-xs text-violet-600 dark:text-violet-400 font-mono font-normal">{ex.ipa}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {ex.meaning}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                                    Chưa có từ vựng ví dụ cho ký tự này.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer (Mastery Toggle & Prev/Next) */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onToggleMastery}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                            isMastered
                                ? 'bg-emerald-500 text-white shadow-emerald-500/30 shadow-md'
                                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                    >
                        <CheckCircle className={`w-4 h-4 ${isMastered ? 'fill-white text-emerald-500' : ''}`} />
                        <span>{isMastered ? 'Đã thuộc âm này 🎉' : 'Đánh dấu đã thuộc'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        {onPrev && (
                            <button
                                type="button"
                                onClick={onPrev}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                title="Âm trước đó"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                        {onNext && (
                            <button
                                type="button"
                                onClick={onNext}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                title="Âm tiếp theo"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IpaCardModal;
