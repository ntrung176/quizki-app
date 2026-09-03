import React from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';

const ReviewSettingsModal = ({
    showSettings,
    setShowSettings,
    showSettingsMenu,
    setShowSettingsMenu,
    reviewMode,
    cardReviewType,
    inputMode,
    setInputMode,
    isEnglishMode,
    meaningFuriganaEnabled,
    setMeaningFuriganaEnabled,
    meaningHanvietEnabled,
    setMeaningHanvietEnabled,
    synonymFuriganaEnabled,
    setSynonymFuriganaEnabled,
    synonymVietnameseEnabled,
    setSynonymVietnameseEnabled,
    exampleTestFormat,
    setExampleTestFormat,
    exampleFuriganaEnabled,
    setExampleFuriganaEnabled,
    exampleVietnameseEnabled,
    setExampleVietnameseEnabled,
    reviewTestFormat,
    setReviewTestFormat,
    reviewAudioEnabled,
    setReviewAudioEnabled,
    cardSettings,
    setCardSettings,
    setInputValue,
    setHintCount
}) => {
    return (
        <>
            {/* Settings Modal Popup */}
            {showSettings && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 border border-gray-200 dark:border-slate-700"
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-500" />
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Cài đặt ôn tập</h3>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-all cursor-pointer">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Test format / Language direction / Toggle options depending on active mode */}
                        {reviewMode === 'meaning_input' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-600 dark:text-gray-300 block mb-3">Ngôn ngữ câu trả lời</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                setInputMode('meaning');
                                                localStorage.setItem('meaning_input_lang', 'vi');
                                                setInputValue('');
                                                setHintCount(0);
                                            }}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer ${inputMode === 'meaning'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                                : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            🇻🇳 Tiếng Việt
                                        </button>
                                        <button
                                            onClick={() => {
                                                setInputMode('reading');
                                                localStorage.setItem('meaning_input_lang', isEnglishMode ? 'en' : 'ja');
                                                setInputValue('');
                                                setHintCount(0);
                                            }}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer ${inputMode === 'reading'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                                : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            {isEnglishMode ? '🇺🇸 Tiếng Anh' : '🇯🇵 Tiếng Nhật'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{isEnglishMode ? 'Hiện phiên âm IPA' : 'Bật Furigana'}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={meaningFuriganaEnabled}
                                            onChange={(e) => {
                                                setMeaningFuriganaEnabled(e.target.checked);
                                                localStorage.setItem('meaning_furigana_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{isEnglishMode ? 'Hiện từ loại (POS)' : 'Hiện âm Hán Việt'}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={meaningHanvietEnabled}
                                            onChange={(e) => {
                                                setMeaningHanvietEnabled(e.target.checked);
                                                localStorage.setItem('meaning_hanviet_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {cardReviewType === 'synonym' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Bật Furigana</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={synonymFuriganaEnabled}
                                            onChange={(e) => {
                                                setSynonymFuriganaEnabled(e.target.checked);
                                                localStorage.setItem('synonym_furigana_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Hiện nghĩa tiếng Việt</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={synonymVietnameseEnabled}
                                            onChange={(e) => {
                                                setSynonymVietnameseEnabled(e.target.checked);
                                                localStorage.setItem('synonym_vietnamese_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {cardReviewType === 'example' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-600 dark:text-gray-300 block mb-3">Hình thức kiểm tra</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                setExampleTestFormat('multipleChoice');
                                                localStorage.setItem('example_test_format', 'multipleChoice');
                                            }}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer ${exampleTestFormat === 'multipleChoice'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                                : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            📝 Trắc nghiệm
                                        </button>
                                        <button
                                            onClick={() => {
                                                setExampleTestFormat('written');
                                                localStorage.setItem('example_test_format', 'written');
                                            }}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer ${exampleTestFormat === 'written'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                                : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            ✏️ Tự luận
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Bật Furigana</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={exampleFuriganaEnabled}
                                            onChange={(e) => {
                                                setExampleFuriganaEnabled(e.target.checked);
                                                localStorage.setItem('example_furigana_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Hiện câu tiếng Việt</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={exampleVietnameseEnabled}
                                            onChange={(e) => {
                                                setExampleVietnameseEnabled(e.target.checked);
                                                localStorage.setItem('example_vietnamese_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {!['synonym', 'example'].includes(cardReviewType) && reviewMode !== 'meaning_input' && (
                            <div>
                                <label className="text-sm font-bold text-gray-600 dark:text-gray-300 block mb-3">Hình thức kiểm tra ý nghĩa</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => { setReviewTestFormat('multipleChoice'); localStorage.setItem('review_test_format', 'multipleChoice'); }}
                                        className={`py-3 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer ${reviewTestFormat === 'multipleChoice'
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                            : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                            }`}
                                    >
                                        📝 Trắc nghiệm
                                    </button>
                                    <button
                                        onClick={() => { setReviewTestFormat('written'); localStorage.setItem('review_test_format', 'written'); }}
                                        className={`py-3 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer ${reviewTestFormat === 'written'
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                            : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                            }`}
                                    >
                                        ✏️ Tự luận
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Global audio toggle */}
                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Phát âm thanh từ vựng</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={reviewAudioEnabled}
                                    onChange={(e) => {
                                        setReviewAudioEnabled(e.target.checked);
                                        localStorage.setItem('review_audio_enabled', String(e.target.checked));
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all text-sm mt-2 cursor-pointer"
                        >
                            Xong
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Flashcard Settings Modal */}
            {showSettingsMenu && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsMenu(false)}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                        <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">Cấu hình thẻ ghi nhớ</h4>
                        <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Đổi mặt trước/mặt sau</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.swapSides} onChange={(e) => setCardSettings(prev => ({ ...prev, swapSides: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Phát âm thanh từ vựng</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.audioEnabled !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, audioEnabled: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Tự động phát âm thanh khi lật</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.autoPlayAudio} onChange={(e) => setCardSettings(prev => ({ ...prev, autoPlayAudio: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            {cardSettings.reviewType === 'typing' && (
                                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl p-3 text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed space-y-1 mb-2">
                                    <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
                                        <span>⌨️</span> Chế độ gõ từ (Typing):
                                    </p>
                                    <p className="text-[11.5px] opacity-90">
                                        • Bạn có thể tích chọn <strong>Âm Hán Việt</strong> hoặc <strong>Chữ Hán</strong> ở mặt câu hỏi để làm gợi ý khi gõ đáp án.
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt tiếng Nhật hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.word} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Chữ Hán / Từ vựng</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.furigana} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, furigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Phiên âm Furigana</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt {cardSettings.reviewType === 'typing' ? '(gợi ý)' : ''}</span></label>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt nghĩa dịch hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.meaning} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Nghĩa tiếng Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.reading} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, reading: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Cách đọc (Hiragana)</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonym} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Đồng nghĩa</span></label>
                                    {cardSettings.back.synonym && (
                                        <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonymFurigana !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonymFurigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Furigana đồng nghĩa</span></label>
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.example} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                    {cardSettings.back.example && (
                                        <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.exampleFurigana !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleFurigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Furigana ví dụ</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.exampleMeaning !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleMeaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Dịch câu ví dụ</span></label>
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.nuance === true} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, nuance: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Sắc thái / Ghi chú (trong thẻ)</span></label>
                                </div>
                            </div>
                        </div>
                        <div className="pt-3">
                            <button onClick={() => setShowSettingsMenu(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm cursor-pointer">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default ReviewSettingsModal;
