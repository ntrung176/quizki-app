import React, { useState, useEffect, useRef } from 'react';
import { Plus, Wand2, Loader2, Image as ImageIcon, Music, FileAudio, Check, X } from 'lucide-react';
import { JLPT_LEVELS, POS_TYPES } from '../../config/constants';
import { playAudio } from '../../utils/audio';
import { compressImage } from '../../utils/image';

// Helper function to detect mobile devices
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

const AddCardForm = ({
    onSave,
    onBack,
    onGeminiAssist,
    batchMode = false,
    currentBatchIndex = 0,
    totalBatchCount = 0,
    onBatchNext,
    onBatchSkip,
    editingCard: initialEditingCard = null,
    onOpenBatchImport
}) => {
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [synonym, setSynonym] = useState('');
    const [example, setExample] = useState('');
    const [exampleMeaning, setExampleMeaning] = useState('');
    const [nuance, setNuance] = useState('');
    const [pos, setPos] = useState('');
    const [level, setLevel] = useState('');
    const [sinoVietnamese, setSinoVietnamese] = useState('');
    const [synonymSinoVietnamese, setSynonymSinoVietnamese] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [customAudio, setCustomAudio] = useState('');
    const [showAudioInput, setShowAudioInput] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const frontInputRef = useRef(null);

    // Load data from editingCard if available (for batch mode)
    useEffect(() => {
        if (initialEditingCard) {
            setFront(initialEditingCard.front || '');
            setBack(initialEditingCard.back || '');
            setSynonym(initialEditingCard.synonym || '');
            setExample(initialEditingCard.example || '');
            setExampleMeaning(initialEditingCard.exampleMeaning || '');
            setNuance(initialEditingCard.nuance || '');
            setPos(initialEditingCard.pos || '');
            setLevel(initialEditingCard.level || '');
            setSinoVietnamese(initialEditingCard.sinoVietnamese || '');
            setSynonymSinoVietnamese(initialEditingCard.synonymSinoVietnamese || '');
            setImagePreview(initialEditingCard.imageBase64 || null);
            setCustomAudio(initialEditingCard.audioBase64 || '');
        }
    }, [initialEditingCard]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                setImagePreview(compressedBase64);
            } catch (error) {
                console.error("Lỗi nén ảnh:", error);
                alert("Không thể xử lý ảnh này.");
            }
        }
    };

    const handleRemoveImage = () => { setImagePreview(null); };

    const handleAudioFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.match(/audio\/(wav|mpeg|mp3)/) && !file.name.match(/\.(wav|mp3)$/i)) {
            alert("Vui lòng chỉ tải lên file định dạng .wav hoặc .mp3");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target.result;
            const base64String = result.split(',')[1];
            setCustomAudio(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (action) => {
        if (!front.trim() || !back.trim()) return;
        setIsSaving(true);
        const success = await onSave({
            front, back, synonym, example, exampleMeaning, nuance, pos, level,
            sinoVietnamese, synonymSinoVietnamese, action,
            imageBase64: imagePreview,
            audioBase64: customAudio.trim() !== '' ? customAudio.trim() : null
        });
        setIsSaving(false);
        if (success && action === 'continue') {
            setFront(''); setBack(''); setSynonym(''); setExample(''); setExampleMeaning('');
            setNuance(''); setPos(''); setLevel(''); setSinoVietnamese(''); setSynonymSinoVietnamese('');
            setImagePreview(null); setCustomAudio(''); setShowAudioInput(false);
            if (frontInputRef.current && !isMobileDevice()) {
                frontInputRef.current.focus();
            }
        }
    };

    const handleAiAssist = async (e) => {
        e.preventDefault();
        if (!front.trim()) {
            if (frontInputRef.current && !isMobileDevice()) {
                frontInputRef.current.focus();
            }
            return;
        }
        setIsAiLoading(true);
        const aiData = await onGeminiAssist(front, pos, level);
        if (aiData) {
            if (aiData.frontWithFurigana) setFront(aiData.frontWithFurigana);
            if (aiData.meaning) setBack(aiData.meaning);
            if (aiData.sinoVietnamese) setSinoVietnamese(aiData.sinoVietnamese);
            if (aiData.synonym) setSynonym(aiData.synonym);
            if (aiData.synonymSinoVietnamese) setSynonymSinoVietnamese(aiData.synonymSinoVietnamese);
            if (aiData.example) setExample(aiData.example);
            if (aiData.exampleMeaning) setExampleMeaning(aiData.exampleMeaning);
            if (aiData.nuance) setNuance(aiData.nuance);
            if (aiData.pos) setPos(aiData.pos);
            if (aiData.level) setLevel(aiData.level);
        }
        setIsAiLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'g' && (e.altKey || e.metaKey)) {
            e.preventDefault();
            handleAiAssist(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Thêm Từ Vựng Mới</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Xây dựng kho tàng kiến thức của bạn</p>
                </div>
                <div className="flex items-center gap-2">
                    {onOpenBatchImport && (
                        <button
                            type="button"
                            onClick={onOpenBatchImport}
                            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg md:rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nhập nhiều từ vựng</span>
                        </button>
                    )}
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl">
                        <Plus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Main Info */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Từ vựng (Nhật): <span className="text-rose-500 dark:text-rose-400">*</span>
                            </label>
                        </div>

                        <div className="flex gap-2">
                            <input
                                id="front"
                                type="text"
                                inputMode="text"
                                autoComplete="off"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck="false"
                                ref={frontInputRef}
                                value={front}
                                onChange={(e) => setFront(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={(e) => {
                                    if (window.innerWidth <= 768) {
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                        }, 300);
                                    }
                                }}
                                required
                                className="flex-1 px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-medium text-sm md:text-base lg:text-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 touch-manipulation"
                                placeholder="Ví dụ: 食べる（たべる）"
                            />

                            <button
                                type="button"
                                onClick={handleAiAssist}
                                disabled={isAiLoading}
                                className="flex items-center px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 dark:hover:from-violet-600 dark:hover:to-indigo-600 transition-all font-bold whitespace-nowrap flex-shrink-0 text-xs md:text-sm"
                                title="Tự động điền thông tin bằng AI"
                            >
                                {isAiLoading ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5 md:mr-2" /> : <Wand2 className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />}
                                <span className="hidden sm:inline">AI Hỗ trợ</span>
                            </button>
                        </div>

                        {/* Classification Section */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Phân loại & Cấp độ</label>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {JLPT_LEVELS.map((lvl) => (
                                        <button
                                            key={lvl.value}
                                            type="button"
                                            onClick={() => setLevel(lvl.value)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border ${level === lvl.value
                                                ? `${lvl.color} shadow-sm ring-1 ring-offset-1 ring-indigo-200 dark:ring-indigo-800`
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {lvl.label}
                                        </button>
                                    ))}
                                </div>
                                <select value={pos} onChange={(e) => setPos(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 text-sm font-medium text-gray-700 dark:text-gray-100">
                                    <option value="">-- Chọn Từ Loại --</option>
                                    {Object.entries(POS_TYPES).map(([key, value]) => (<option key={key} value={key}>{value.label}</option>))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Ý nghĩa (Việt): <span className="text-rose-500 dark:text-rose-400">*</span>
                            </label>
                            <input id="back" type="text" value={back} onChange={(e) => setBack(e.target.value)} required
                                className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-sm md:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="Ví dụ: Ăn"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Hán Việt</label>
                                <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)}
                                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="Thực"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Đồng nghĩa</label>
                                <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)}
                                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="食事する..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Additional Info */}
                <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ngữ cảnh & Ví dụ</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Câu ví dụ (Nhật)</label>
                            <textarea
                                value={example}
                                onChange={(e) => setExample(e.target.value)}
                                rows="2"
                                className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="私は毎日ご飯を食べる。"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nghĩa ví dụ (Việt)</label>
                            <textarea
                                value={exampleMeaning}
                                onChange={(e) => setExampleMeaning(e.target.value)}
                                rows="2"
                                className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Tôi ăn cơm mỗi ngày."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sắc thái / Ghi chú</label>
                            <textarea
                                value={nuance}
                                onChange={(e) => setNuance(e.target.value)}
                                rows="3"
                                className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Dùng trong văn viết..."
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Media</h3>

                        {/* Image Upload */}
                        <div className="flex items-start space-x-4">
                            <div className="flex-1">
                                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-1" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Tải ảnh minh họa</p>
                                    </div>
                                    <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                            </div>
                            {imagePreview && (
                                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm group">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button type="button" onClick={handleRemoveImage} className="absolute top-1 right-1 bg-white/80 dark:bg-gray-800/80 p-1 rounded-full text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Audio Upload */}
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={() => setShowAudioInput(!showAudioInput)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center">
                                <Music className="w-4 h-4 mr-1" />
                                {showAudioInput ? 'Ẩn Audio' : 'Tùy chỉnh Audio (Mặc định tự động)'}
                            </button>
                            {showAudioInput && (
                                <div className="mt-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center space-x-2">
                                        <label htmlFor="audio-upload" className="cursor-pointer flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm">
                                            <FileAudio className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                                            {customAudio ? "Đổi file" : "Chọn .wav/.mp3"}
                                        </label>
                                        <input id="audio-upload" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={handleAudioFileChange} className="hidden" />
                                        {customAudio && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Xong</span>}
                                    </div>
                                    {customAudio && (
                                        <div className="flex justify-between items-center mt-2">
                                            <button type="button" onClick={() => playAudio(customAudio)} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Nghe thử</button>
                                            <button type="button" onClick={() => setCustomAudio('')} className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">Xóa</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Batch mode indicator */}
            {batchMode && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 text-center">
                        Đang xử lý từ vựng {currentBatchIndex + 1}/{totalBatchCount}
                    </p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                    type="button"
                    onClick={async () => {
                        if (batchMode && onBatchNext) {
                            const success = await onSave({
                                front, back, synonym, example, exampleMeaning, nuance, pos, level,
                                sinoVietnamese, synonymSinoVietnamese, action: 'continue',
                                imageBase64: imagePreview,
                                audioBase64: customAudio.trim() !== '' ? customAudio.trim() : null
                            });
                            if (success) {
                                setFront(''); setBack(''); setSynonym(''); setExample(''); setExampleMeaning('');
                                setNuance(''); setPos(''); setLevel(''); setSinoVietnamese(''); setSynonymSinoVietnamese('');
                                setImagePreview(null); setCustomAudio(''); setShowAudioInput(false);
                                await onBatchNext();
                            }
                        } else {
                            handleSave('continue');
                        }
                    }}
                    disabled={isSaving || isAiLoading || !front || !back}
                    className="flex-1 flex items-center justify-center px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-xs md:text-sm lg:text-base font-bold rounded-lg md:rounded-xl shadow-md md:shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" /> : <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />}
                    <span className="text-xs md:text-sm lg:text-base">{batchMode ? `Lưu & Tiếp (${currentBatchIndex + 1}/${totalBatchCount})` : 'Lưu & Thêm Tiếp'}</span>
                </button>
                {batchMode && onBatchSkip && (
                    <button
                        type="button"
                        onClick={async () => { await onBatchSkip(); }}
                        disabled={isSaving || isAiLoading}
                        className="flex-1 flex items-center justify-center px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-xs md:text-sm lg:text-base font-bold rounded-lg md:rounded-xl shadow-sm text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 hover:-translate-y-1 transition-all disabled:opacity-50"
                    >
                        <X className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                        <span className="text-xs md:text-sm lg:text-base">Bỏ qua</span>
                    </button>
                )}
                {!batchMode && (
                    <button
                        type="button"
                        onClick={() => handleSave('back')}
                        disabled={isSaving || isAiLoading || !front || !back}
                        className="flex-1 flex items-center justify-center px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-xs md:text-sm lg:text-base font-bold rounded-lg md:rounded-xl shadow-sm text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:-translate-y-1 transition-all disabled:opacity-50"
                    >
                        <Check className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                        <span className="text-xs md:text-sm lg:text-base">Lưu & Về Home</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 text-xs md:text-sm lg:text-base font-medium rounded-lg md:rounded-xl text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                    Hủy
                </button>
            </div>
        </div>
    );
};

export default AddCardForm;
