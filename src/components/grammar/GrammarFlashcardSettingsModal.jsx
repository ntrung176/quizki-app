import React from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, RotateCcw, Volume2, Layers, Keyboard, CreditCard, Sparkles } from 'lucide-react';

export const DEFAULT_GRAMMAR_FLASHCARD_SETTINGS = {
    reviewType: 'flashcard', // 'flashcard' | 'typing'
    studyMode: 'ja_to_vi', // 'ja_to_vi' | 'vi_to_ja' | 'random'
    showLevel: true,
    showAudioButton: true,
    showHint: true,
    showMeaning: true,
    showStructure: true,
    showExamples: true,
    showFurigana: true,
    showExampleVi: true,
    audioEnabled: true,
    autoPlayAudio: false,
};

const GrammarFlashcardSettingsModal = ({
    isOpen,
    onClose,
    settings = DEFAULT_GRAMMAR_FLASHCARD_SETTINGS,
    onUpdateSettings,
}) => {
    if (!isOpen) return null;

    const currentSettings = {
        ...DEFAULT_GRAMMAR_FLASHCARD_SETTINGS,
        ...settings,
    };

    const handleToggle = (key) => {
        onUpdateSettings({
            ...currentSettings,
            [key]: !currentSettings[key],
        });
    };

    const handleSetReviewType = (type) => {
        onUpdateSettings({
            ...currentSettings,
            reviewType: type,
        });
    };

    const handleSetMode = (mode) => {
        onUpdateSettings({
            ...currentSettings,
            studyMode: mode,
        });
    };

    const handleReset = () => {
        onUpdateSettings({ ...DEFAULT_GRAMMAR_FLASHCARD_SETTINGS });
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />

            {/* Modal Container */}
            <div
                className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-200 dark:border-slate-800 animate-scale-up text-slate-800 dark:text-slate-150 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Settings className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-white leading-tight">
                                Cấu hình thẻ Ngữ pháp
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Tùy chỉnh hiển thị trong phiên ôn tập SRS
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Section 1: Review Type (Flashcard 3D vs Typing Input) */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Hình thức ôn tập:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={() => handleSetReviewType('flashcard')}
                            className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center border-2 transition-all cursor-pointer ${
                                currentSettings.reviewType === 'flashcard'
                                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <CreditCard className="w-5 h-5 mb-1 text-indigo-500" />
                            <span className="text-xs font-bold">Thẻ Flashcard 3D</span>
                            <span className="text-[10px] opacity-75 mt-0.5">Lật xem cấu trúc & ví dụ</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSetReviewType('typing')}
                            className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center border-2 transition-all cursor-pointer ${
                                currentSettings.reviewType === 'typing'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <Keyboard className="w-5 h-5 mb-1 text-emerald-500" />
                            <span className="text-xs font-bold">Gõ phím (Typing)</span>
                            <span className="text-[10px] opacity-75 mt-0.5">Tự gõ để nhớ sâu</span>
                        </button>
                    </div>

                    {currentSettings.reviewType === 'typing' && (
                        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 rounded-2xl p-3 text-[11.5px] text-emerald-800 dark:text-emerald-300 space-y-1">
                            <div className="font-bold flex items-center gap-1 text-emerald-900 dark:text-emerald-200">
                                <Sparkles className="w-3.5 h-3.5" /> Chế độ Gõ phím (Typing):
                            </div>
                            <p className="opacity-90 leading-relaxed">
                                Bạn có thể gõ câu trả lời bằng chữ <strong>Hiragana</strong> (hoặc Romaji / Tiếng Việt). Nhấn <kbd className="px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900 rounded font-mono text-[10px]">Enter</kbd> để kiểm tra so khớp từng ký tự.
                            </p>
                        </div>
                    )}
                </div>

                {/* Section 2: Study Direction (Chiều học) */}
                <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Chiều câu hỏi & gợi ý:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            {
                                id: 'ja_to_vi',
                                label: '🇯🇵 ➔ 🇻🇳',
                                title: 'Nhật ➔ Việt',
                                desc: 'Mẫu câu ➔ Nghĩa',
                            },
                            {
                                id: 'vi_to_ja',
                                label: '🇻🇳 ➔ 🇯🇵',
                                title: 'Việt ➔ Nhật',
                                desc: 'Nghĩa ➔ Mẫu câu',
                            },
                            {
                                id: 'random',
                                label: '🔀',
                                title: 'Ngẫu nhiên',
                                desc: 'Trộn 2 chiều',
                            },
                        ].map((m) => {
                            const isSelected = currentSettings.studyMode === m.id;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSetMode(m.id)}
                                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center text-center border-2 transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                                            : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <span className="text-base font-bold mb-0.5">{m.label}</span>
                                    <span className="text-xs font-bold leading-tight">{m.title}</span>
                                    <span className="text-[10px] opacity-75 mt-0.5">{m.desc}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section 3: Front Side Display Options */}
                <div className="space-y-3 pt-2 border-t border-slate-150 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Mặt trước (Mặt câu hỏi):
                    </p>
                    <div className="space-y-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                            <span>Hiển thị cấp độ JLPT (N5 - N1)</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={currentSettings.showLevel}
                                    onChange={() => handleToggle('showLevel')}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <span>Nút nghe phát âm mẫu câu ở mặt trước</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={currentSettings.showAudioButton}
                                    onChange={() => handleToggle('showAudioButton')}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                            </label>
                        </div>

                        {currentSettings.studyMode !== 'ja_to_vi' && (
                            <div className="flex items-center justify-between">
                                <span>Gợi ý chữ cái đầu khi học Việt ➔ Nhật</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={currentSettings.showHint}
                                        onChange={() => handleToggle('showHint')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 4: Back Side Display Options */}
                <div className="space-y-3 pt-2 border-t border-slate-150 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Mặt sau (Mặt giải nghĩa & cấu trúc):
                    </p>
                    <div className="space-y-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Công thức kết hợp ngữ pháp (Cấu trúc)
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={currentSettings.showStructure}
                                    onChange={() => handleToggle('showStructure')}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Câu ví dụ minh họa
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={currentSettings.showExamples}
                                    onChange={() => handleToggle('showExamples')}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                            </label>
                        </div>

                        {currentSettings.showExamples && (
                            <div className="pl-4 space-y-2.5 border-l-2 border-indigo-100 dark:border-indigo-900/50 ml-1 py-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Hiện phiên âm Furigana trên câu ví dụ
                                    </span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentSettings.showFurigana}
                                            onChange={() => handleToggle('showFurigana')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-8 h-4.5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Hiện bản dịch tiếng Việt của câu ví dụ
                                    </span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentSettings.showExampleVi}
                                            onChange={() => handleToggle('showExampleVi')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-8 h-4.5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 5: Audio Options */}
                <div className="space-y-3 pt-2 border-t border-slate-150 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Cài đặt âm thanh (Phát âm):
                    </p>
                    <div className="space-y-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                                Bật âm thanh phát âm
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={currentSettings.audioEnabled}
                                    onChange={() => handleToggle('audioEnabled')}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                            </label>
                        </div>

                        {currentSettings.audioEnabled && (
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-400">
                                    Tự động phát âm thanh khi lật thẻ
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={currentSettings.autoPlayAudio}
                                        onChange={() => handleToggle('autoPlayAudio')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Mặc định
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs md:text-sm cursor-pointer text-center"
                    >
                        Áp dụng & Đóng
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GrammarFlashcardSettingsModal;
