import React, { useState, useRef } from 'react';
import { Loader2, Image as ImageIcon, Music, Volume2, Trash2, Check, X } from 'lucide-react';
import { JLPT_LEVELS, POS_TYPES } from '../../config/constants';
import { playAudio } from '../../utils/audio';
import { compressImage } from '../../utils/image';

const EditCardForm = ({ card, onSave, onBack, onGeminiAssist }) => {
    const [front, setFront] = useState(card.front);
    const [back, setBack] = useState(card.back);
    const [synonym, setSynonym] = useState(card.synonym);
    const [example, setExample] = useState(card.example);
    const [exampleMeaning, setExampleMeaning] = useState(card.exampleMeaning);
    const [nuance, setNuance] = useState(card.nuance);
    const [pos, setPos] = useState(card.pos || '');
    const [level, setLevel] = useState(card.level || '');
    const [sinoVietnamese, setSinoVietnamese] = useState(card.sinoVietnamese || '');
    const [synonymSinoVietnamese, setSynonymSinoVietnamese] = useState(card.synonymSinoVietnamese || '');
    const [imagePreview, setImagePreview] = useState(card.imageBase64 || null);
    const [customAudio, setCustomAudio] = useState(card.audioBase64 || '');
    const [showAudioInput, setShowAudioInput] = useState(false);
    const [_isSaving, setIsSaving] = useState(false); // eslint-disable-line no-unused-vars
    const [isAiLoading, setIsAiLoading] = useState(false);
    const frontInputRef = useRef(null);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setImagePreview(compressed);
            } catch (error) {
                console.error("Lỗi ảnh:", error);
            }
        }
    };

    const handleRemoveImage = () => { setImagePreview(null); };

    const handleAudioFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const res = event.target.result;
            setCustomAudio(res.split(',')[1]);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!front.trim() || !back.trim()) return;
        setIsSaving(true);
        const hasOriginalAudio = card.audioBase64 && card.audioBase64.trim() !== '';
        const hasNewAudio = customAudio.trim() !== '';
        const audioToSave = hasNewAudio ? customAudio.trim() : (hasOriginalAudio ? undefined : null);
        await onSave({
            cardId: card.id,
            front, back, synonym, example, exampleMeaning, nuance, pos, level,
            sinoVietnamese, synonymSinoVietnamese,
            imageBase64: imagePreview,
            audioBase64: audioToSave
        });
        setIsSaving(false);
    };

    const handleAiAssist = async (e) => {
        e.preventDefault();
        if (!front.trim()) return;
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
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Chỉnh Sửa Thẻ</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Từ vựng (Nhật)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
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
                                className="flex-1 pl-2 md:pl-3 lg:pl-4 pr-2 md:pr-12 py-1.5 md:py-2 lg:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-900/50 font-medium text-sm md:text-base lg:text-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            <button type="button" onClick={handleAiAssist} className="px-2 md:px-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg md:rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 flex-shrink-0 text-xs md:text-sm">
                                {isAiLoading ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : "AI"}
                            </button>
                        </div>

                        {/* Classification & Level */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
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

                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Ý nghĩa</label>
                        <input type="text" value={back} onChange={(e) => setBack(e.target.value)} className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-900/50 text-sm md:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                        <div className="grid grid-cols-2 gap-2 md:gap-4">
                            <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder="Hán Việt" className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Đồng nghĩa" className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <textarea value={example} onChange={(e) => setExample(e.target.value)} rows="2" placeholder="Ví dụ (Nhật)" className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-900/50 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                        <textarea value={exampleMeaning} onChange={(e) => setExampleMeaning(e.target.value)} rows="2" placeholder="Nghĩa ví dụ" className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-900/50 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                        <textarea value={nuance} onChange={(e) => setNuance(e.target.value)} rows="3" placeholder="Ghi chú" className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-900/50 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                    </div>

                    {/* Media Edit */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Media</h3>

                        {/* Image Part */}
                        <div className="flex items-center justify-between">
                            <label htmlFor="img-edit" className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium text-sm flex items-center hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
                                <ImageIcon className="w-4 h-4 mr-2" /> {imagePreview ? "Thay đổi ảnh" : "Tải ảnh lên"}
                            </label>
                            <input id="img-edit" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            {imagePreview && (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 group">
                                    <img src={imagePreview} className="w-full h-full object-cover" />
                                    <button type="button" onClick={handleRemoveImage} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>

                        {/* Audio Part */}
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={() => setShowAudioInput(!showAudioInput)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center w-full justify-between">
                                <div className="flex items-center"><Music className="w-4 h-4 mr-2" /> {customAudio ? "Đã có Audio tuỳ chỉnh" : "Thêm Audio tuỳ chỉnh"}</div>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{showAudioInput ? '▲' : '▼'}</span>
                            </button>

                            {showAudioInput && (
                                <div className="mt-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600 animate-fade-in">
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="audio-edit" className="cursor-pointer px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm">
                                            {customAudio ? "Chọn file khác" : "Chọn file .mp3/wav"}
                                        </label>
                                        <input id="audio-edit" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={handleAudioFileChange} className="hidden" />
                                    </div>

                                    {customAudio && (
                                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Đã lưu</span>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => playAudio(customAudio)} className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"><Volume2 className="w-4 h-4" /></button>
                                                <button type="button" onClick={() => setCustomAudio('')} className="p-1 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    )}
                                    {!customAudio && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-center">Nếu trống, hệ thống sẽ tự tạo audio từ văn bản.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button onClick={handleSave} className="flex-1 py-2 md:py-2.5 lg:py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg md:rounded-xl font-bold text-xs md:text-sm lg:text-base shadow-md md:shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors">Lưu Thay Đổi</button>
                <button onClick={onBack} className="px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl font-medium text-xs md:text-sm lg:text-base text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Hủy</button>
            </div>
        </div>
    );
};

export default EditCardForm;
