import React, { useState } from 'react';
import { BookOpen, X as XIcon, RefreshCw, Volume2, Check, Trash2, Sparkle, Bot, Loader2 } from 'lucide-react';
import { playAudio, generateAudioSilent } from '../../utils/audio';

const AdminEditDictModal = ({
    editingDictItem,
    setEditingDictItem,
    handleSaveDictItem,
    originalAudioBase64,
    setNotification
}) => {
    const [showAudioRecreatePopup, setShowAudioRecreatePopup] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [customAudioText, setCustomAudioText] = useState('');
    const [isManualInputMode, setIsManualInputMode] = useState(false);

    if (!editingDictItem) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-xl w-full shadow-2xl animate-bounce-in text-left">
                    <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-750 pb-3 mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            Sửa từ vựng kho chung
                        </h3>
                        <button
                            onClick={() => setEditingDictItem(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSaveDictItem} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mục từ (Nhật)</label>
                                <input
                                    type="text"
                                    value={editingDictItem.front}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, front: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nghĩa tiếng Việt</label>
                                <input
                                    type="text"
                                    value={editingDictItem.back || editingDictItem.meaning || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, back: e.target.value, meaning: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hán Việt</label>
                                <input
                                    type="text"
                                    value={editingDictItem.sinoVietnamese || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, sinoVietnamese: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Từ loại (POS)</label>
                                <select
                                    value={editingDictItem.pos || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, pos: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                >
                                    <option value="">Không có</option>
                                    <option value="noun">Danh từ (Noun)</option>
                                    <option value="verb">Động từ (Verb)</option>
                                    <option value="suru_verb">Động từ Suru</option>
                                    <option value="adjective_i">Tính từ đuôi i</option>
                                    <option value="adjective_na">Tính từ đuôi na</option>
                                    <option value="adverb">Phó từ (Adverb)</option>
                                    <option value="pronoun">Đại từ (Pronoun)</option>
                                    <option value="grammar">Ngữ pháp (Grammar)</option>
                                    <option value="phrase">Cụm từ (Phrase)</option>
                                    <option value="other">Khác (Other)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">JLPT Level</label>
                                <select
                                    value={editingDictItem.level || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, level: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                >
                                    <option value="">Không rõ</option>
                                    <option value="N1">N1</option>
                                    <option value="N2">N2</option>
                                    <option value="N3">N3</option>
                                    <option value="N4">N4</option>
                                    <option value="N5">N5</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Từ đồng nghĩa</label>
                                <input
                                    type="text"
                                    value={editingDictItem.synonym || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, synonym: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hán Việt đồng nghĩa</label>
                                <input
                                    type="text"
                                    value={editingDictItem.synonymSinoVietnamese || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, synonymSinoVietnamese: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sắc thái/Nuance</label>
                                <input
                                    type="text"
                                    value={editingDictItem.nuance || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, nuance: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ví dụ</label>
                            <input
                                type="text"
                                value={editingDictItem.example || ''}
                                onChange={(e) => setEditingDictItem(prev => ({ ...prev, example: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giải nghĩa ví dụ</label>
                            <input
                                type="text"
                                value={editingDictItem.exampleMeaning || ''}
                                onChange={(e) => setEditingDictItem(prev => ({ ...prev, exampleMeaning: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                            />
                        </div>

                        {/* Audio Section */}
                        <div className="pt-3 border-t border-gray-150 dark:border-gray-750 mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Audio kho chung</label>
                            <div className="flex flex-col gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-150 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAudioRecreatePopup(true);
                                            setIsManualInputMode(false);
                                            setCustomAudioText(editingDictItem.front.split('（')[0].split('(')[0].trim());
                                        }}
                                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-350 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm dark:text-gray-200 cursor-pointer"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                                        Tạo lại âm thanh
                                    </button>
                                </div>

                                {/* Playback Controls */}
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                    {originalAudioBase64 && (
                                        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-150 dark:border-gray-700">
                                            <span className="text-gray-500 font-medium">Audio gốc (Trước sửa):</span>
                                            <button
                                                type="button"
                                                onClick={() => playAudio(originalAudioBase64)}
                                                className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
                                                title="Nghe audio gốc"
                                            >
                                                <Volume2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {editingDictItem.audioBase64 ? (
                                        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-150 dark:border-gray-700">
                                            <span className="text-gray-500 font-medium">
                                                {editingDictItem.audioBase64 === originalAudioBase64 ? "Audio hiện tại:" : "Audio mới (Sau sửa):"}
                                            </span>
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                                <Check className="w-3.5 h-3.5" /> Có sẵn
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => playAudio(editingDictItem.audioBase64)}
                                                className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
                                                title="Nghe audio mới"
                                            >
                                                <Volume2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingDictItem(prev => ({ ...prev, audioBase64: null }))}
                                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                                                title="Xóa audio"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-150 dark:border-gray-750">
                                            <span className="text-gray-400 italic">Chưa có audio mới</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-gray-750">
                            <button
                                type="button"
                                onClick={() => setEditingDictItem(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
                            >
                                Lưu lại
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sub-modal: Recreate Audio Choices */}
            {showAudioRecreatePopup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full shadow-2xl text-center animate-bounce-in">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-base">Tạo lại âm thanh</h4>
                        
                        {!isManualInputMode ? (
                            <>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                                    Chọn phương thức tạo lại âm thanh cho từ vựng: <br />
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">"{editingDictItem.front}"</span>
                                </p>
                                
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setIsGeneratingAudio(true);
                                            try {
                                                const cleanText = editingDictItem.front.split('（')[0].split('(')[0].trim();
                                                const result = await generateAudioSilent(cleanText);
                                                if (result && result.base64) {
                                                    setEditingDictItem(prev => ({ ...prev, audioBase64: result.base64 }));
                                                    setNotification({ type: 'success', message: 'Đã tạo âm thanh bằng AI thành công!' });
                                                    setShowAudioRecreatePopup(false);
                                                } else {
                                                    setNotification({ type: 'error', message: 'Không thể tạo âm thanh bằng AI. Vui lòng kiểm tra cấu hình Azure Speech.' });
                                                }
                                            } catch (err) {
                                                console.error("AI audio generation error:", err);
                                                setNotification({ type: 'error', message: 'Lỗi khi tạo âm thanh AI: ' + err.message });
                                            } finally {
                                                setIsGeneratingAudio(false);
                                            }
                                        }}
                                        disabled={isGeneratingAudio}
                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {isGeneratingAudio ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Sparkle className="w-4 h-4 text-amber-300 fill-amber-300" />
                                        )}
                                        Dùng AI (Tự động theo chữ Nhật)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsManualInputMode(true)}
                                        className="w-full py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-205 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                    >
                                        <Bot className="w-4 h-4 text-indigo-500" />
                                        Nhập tay chữ đọc (Hiragana...)
                                    </button>
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={() => setShowAudioRecreatePopup(false)}
                                    className="mt-6 text-xs text-gray-500 hover:text-gray-750 dark:hover:text-gray-300 font-medium cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                    Nhập Hiragana hoặc chữ đọc tùy chỉnh cho: <br />
                                    <span className="font-semibold text-indigo-650 dark:text-indigo-400">"{editingDictItem.front}"</span>
                                </p>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={customAudioText}
                                        onChange={(e) => setCustomAudioText(e.target.value)}
                                        placeholder="Ví dụ: たべる..."
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none text-center dark:text-white"
                                        disabled={isGeneratingAudio}
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsManualInputMode(false)}
                                            disabled={isGeneratingAudio}
                                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            Quay lại
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!customAudioText.trim()) {
                                                    setNotification({ type: 'error', message: 'Vui lòng nhập chữ đọc.' });
                                                    return;
                                                }
                                                setIsGeneratingAudio(true);
                                                try {
                                                    const result = await generateAudioSilent(customAudioText.trim());
                                                    if (result && result.base64) {
                                                        setEditingDictItem(prev => ({ ...prev, audioBase64: result.base64 }));
                                                        setNotification({ type: 'success', message: 'Đã tạo âm thanh từ chữ đọc thành công!' });
                                                        setShowAudioRecreatePopup(false);
                                                    } else {
                                                        setNotification({ type: 'error', message: 'Không thể tạo âm thanh. Vui lòng kiểm tra cấu hình Azure Speech.' });
                                                    }
                                                } catch (err) {
                                                    console.error("AI audio generation error:", err);
                                                    setNotification({ type: 'error', message: 'Lỗi khi tạo âm thanh: ' + err.message });
                                                } finally {
                                                    setIsGeneratingAudio(false);
                                                }
                                            }}
                                            disabled={isGeneratingAudio || !customAudioText.trim()}
                                            className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            {isGeneratingAudio && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Tạo âm thanh
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminEditDictModal;
