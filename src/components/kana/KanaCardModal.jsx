import React, { useState } from 'react';
import { X, Volume2, CheckCircle, ChevronLeft, ChevronRight, PenTool, BookOpen, Lightbulb } from 'lucide-react';
import { speakJapanese } from '../../utils/audio';
import KanaWritingCanvas from './KanaWritingCanvas';

const KanaCardModal = ({
    item,
    type = 'hiragana',
    isOpen,
    onClose,
    onNext,
    onPrev,
    isMastered = false,
    onToggleMastery
}) => {
    const [activeTab, setActiveTab] = useState('write'); // 'write' | 'mnemonic' | 'examples'

    if (!isOpen || !item) return null;

    const char = type === 'hiragana' ? item.hira : item.kata;
    const counterpartChar = type === 'hiragana' ? item.kata : item.hira;
    const counterpartLabel = type === 'hiragana' ? 'Katakana' : 'Hiragana';

    const handlePlayAudio = (textToSpeak) => {
        speakJapanese(textToSpeak || char);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-indigo-400/30 dark:border-indigo-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all"
            >
                {/* Header with gradient banner */}
                <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="min-w-[52px] h-12 px-2 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner font-japanese shrink-0">
                            <span className={`font-black whitespace-nowrap leading-none ${char.length > 1 ? 'text-2xl' : 'text-3xl'}`}>
                                {char}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-mono font-black tracking-wide">/{item.romaji}/</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-sm uppercase">
                                    {type === 'hiragana' ? 'Hiragana (Chữ mềm)' : 'Katakana (Chữ cứng)'}
                                </span>
                            </div>
                            <p className="text-xs text-indigo-100 font-medium mt-0.5">
                                Bản đối ứng ({counterpartLabel}): <span className="font-bold text-white text-sm ml-1 font-japanese">{counterpartChar}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => handlePlayAudio()}
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
                        onClick={() => setActiveTab('write')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'write'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Tập viết ({item.strokes || 1} nét)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('mnemonic')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'mnemonic'
                                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Mẹo nhớ hình ảnh</span>
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
                        <span>Từ vựng N5 ({item.examples?.length || 0})</span>
                    </button>
                </div>

                {/* Modal Body Content */}
                <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
                    {/* TAB 1: WRITING CANVAS */}
                    {activeTab === 'write' && (
                        <div className="flex flex-col items-center space-y-4 animate-fade-in">
                            <KanaWritingCanvas char={char} romaji={item.romaji} size={250} />

                            {item.strokeHints && item.strokeHints.length > 0 && (
                                <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Hướng dẫn thứ tự các nét:
                                    </span>
                                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                        {item.strokeHints.map((hint, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <span>{hint}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: MNEMONICS */}
                    {activeTab === 'mnemonic' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-xl font-bold">
                                    💡
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                        Mẹo hình tượng hóa chữ {char} ({item.romaji})
                                    </h4>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                        {item.mnemonic || `Hình dung chữ ${char} tương đương với âm /${item.romaji}/ trong từ vựng tiếng Nhật.`}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    So sánh hai bảng chữ cái:
                                </span>
                                <div className="flex items-center justify-center gap-8 text-3xl font-black font-japanese py-2">
                                    <div className="flex flex-col items-center">
                                        <span className="text-indigo-600 dark:text-indigo-400">{item.hira}</span>
                                        <span className="text-[10px] text-slate-400 font-sans mt-1">Hiragana</span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-700 text-xl">↔</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-sky-600 dark:text-sky-400">{item.kata}</span>
                                        <span className="text-[10px] text-slate-400 font-sans mt-1">Katakana</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: EXAMPLES */}
                    {activeTab === 'examples' && (
                        <div className="space-y-3 animate-fade-in">
                            <span className="text-xs font-bold text-slate-500 block px-1">
                                Các từ vựng N5 thông dụng bắt đầu hoặc chứa âm này:
                            </span>
                            {item.examples && item.examples.length > 0 ? (
                                item.examples.map((ex, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handlePlayAudio(ex.word)}
                                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                <Volume2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white font-japanese flex items-center gap-2">
                                                    <span>{ex.word}</span>
                                                    <span className="text-xs text-slate-400 font-mono font-normal">({ex.romaji})</span>
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
                        <span>{isMastered ? 'Đã thuộc chữ này 🎉' : 'Đánh dấu đã thuộc'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        {onPrev && (
                            <button
                                type="button"
                                onClick={onPrev}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                title="Chữ trước đó"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                        {onNext && (
                            <button
                                type="button"
                                onClick={onNext}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                title="Chữ tiếp theo"
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

export default KanaCardModal;
