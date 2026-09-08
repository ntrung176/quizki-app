import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Image as ImageIcon, Music, Volume2, Trash2, Check, ChevronDown, AlertTriangle, Wrench, RefreshCw, ShieldAlert } from 'lucide-react';
import { POS_TYPES, ENGLISH_POS_TYPES, JLPT_LEVELS, getPosLabel } from '../../config/constants';
import { compressImage } from '../../utils/image';
import { showToast } from '../../utils/toast';
import { playAudio, generateAudioSilent } from '../../utils/audio';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

import PremiumLockedModal from '../ui/PremiumLockedModal';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { getLanguageService, isEnglishCard } from '../../languages';

const EditCardModal = ({ card, onSave, onClose, onGeminiAssist, allCards = [], canUserUseAI }) => {
    const { isEnglishMode } = useTargetLanguage();
    const [front, setFront] = useState(card?.front || '');
    const [back, setBack] = useState(card?.back || '');
    const [ipa, setIpa] = useState(card?.ipa || '');
    const [synonym, setSynonym] = useState(card?.synonym || '');
    const [example, setExample] = useState(card?.example || '');
    const [exampleMeaning, setExampleMeaning] = useState(card?.exampleMeaning || '');
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [nuance, setNuance] = useState(card?.nuance || '');
    const [pos, setPos] = useState(card?.pos || '');
    const [level, setLevel] = useState(card?.level || '');
    const [sinoVietnamese, setSinoVietnamese] = useState(card?.sinoVietnamese || '');
    const [synonymSinoVietnamese, setSynonymSinoVietnamese] = useState(card?.synonymSinoVietnamese || '');
    const [reading, setReading] = useState(card?.reading || '');
    const [accent, setAccent] = useState(card?.accent || '');
    const [imagePreview, setImagePreview] = useState(card?.imageBase64 || null);
    const [customAudio, setCustomAudio] = useState(card?.audioBase64 || '');
    const [audioFixed, setAudioFixed] = useState(card?.audioFixed || false);
    const [customHiragana, setCustomHiragana] = useState(card?.reading || '');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [posDropdownOpen, setPosDropdownOpen] = useState(false);
    const [showLevels, setShowLevels] = useState(false);

    const handlePreFixAudio = () => {
        if (audioFixed || card?.audioFixed) {
            showToast("Từ vựng này đã được sửa audio trước đó (Tối đa 1 lần/từ).", "warning");
            return;
        }
        const trimmedReading = customHiragana.trim();
        if (!trimmedReading) {
            showToast("Vui lòng nhập cách đọc bằng Hiragana chuẩn xác.", "warning");
            return;
        }
        if (!cardIsEnglish) {
            const isKana = /^[\u3040-\u309F\u30A0-\u30FF\s・ー]+$/.test(trimmedReading);
            if (!isKana) {
                showToast("Cách đọc tiếng Nhật phải nhập bằng Hiragana hoặc Katakana (VD: もくどく).", "warning");
                return;
            }
        }
        setShowConfirmModal(true);
    };

    const executeFixAudio = async () => {
        setShowConfirmModal(false);
        const trimmedReading = customHiragana.trim();
        setIsGeneratingAudio(true);
        try {
            const result = await generateAudioSilent(trimmedReading, trimmedReading);
            if (result && result.base64) {
                setCustomAudio(result.base64);
                setAudioFixed(true);
                if (!cardIsEnglish) {
                    setReading(trimmedReading);
                }
                showToast("Đã tạo audio mới thành công! (Mỗi từ chỉ được sửa 1 lần)", "success");
                playAudio(result.base64, front, null, null, trimmedReading);
            } else {
                throw new Error("Không thể tạo audio từ máy chủ Microsoft Azure TTS. Vui lòng thử lại.");
            }
        } catch (err) {
            console.error("Fix audio error:", err);
            showToast("Lỗi khi tạo audio: " + err.message, "error");
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    useEffect(() => {
        if (!posDropdownOpen) {
            setShowLevels(false);
        }
    }, [posDropdownOpen]);

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

    const langService = getLanguageService({ front, targetLanguage: card?.targetLanguage }, isEnglishMode);
    const cardIsEnglish = langService.code === 'en' || isEnglishCard({ front }, isEnglishMode);

    const handleSave = async () => {
        if (!front.trim() || !back.trim()) return;
        setIsSaving(true);
        const isEng = cardIsEnglish || isEnglishCard({ front }, isEnglishMode);
        await onSave({
            cardId: card.id,
            front: front.trim(),
            back: back.trim(),
            ipa: isEng ? ipa.trim() : '',
            synonym, example, exampleMeaning, nuance, pos, level,
            sinoVietnamese: isEng ? '' : sinoVietnamese,
            synonymSinoVietnamese: isEng ? '' : synonymSinoVietnamese,
            reading: isEng ? '' : (customHiragana.trim() || reading.trim()),
            accent: isEng ? '' : accent.trim(),
            targetLanguage: isEng ? 'en' : 'ja',
            imageBase64: imagePreview,
            audioBase64: customAudio || card?.audioBase64 || null,
            audioFixed: audioFixed || card?.audioFixed || false
        });
        setIsSaving(false);
        onClose();
    };

    const handleAiAssist = async (e) => {
        e.preventDefault();
        if (!front.trim()) return;
        
        if (!canUserUseAI) {
            setShowPremiumModal(true);
            return;
        }

        // Check duplicate
        const currentFrontNormalized = front.split('（')[0].split('(')[0].trim().toLowerCase();
        const isDuplicate = allCards.some(c => {
            if (c.id === card.id) return false;
            const otherFrontNormalized = c.front.split('（')[0].split('(')[0].trim().toLowerCase();
            return otherFrontNormalized === currentFrontNormalized;
        });
        if (isDuplicate) {
            showToast('Từ vựng đã có trong học phần rồi.', 'warning');
            return;
        }

        setIsAiLoading(true);
        const aiData = await onGeminiAssist(front, pos, level, back);
        if (aiData) {
            const isEng = cardIsEnglish || aiData.targetLanguage === 'en';
            if (isEng) {
                setFront(aiData.front || front);
                setIpa(aiData.ipa || formatIPA('', aiData.front || front));
                setSinoVietnamese('');
                setReading('');
                setAccent('');
            } else {
                const rawFront = (aiData.front || aiData.frontWithFurigana || front).trim();
                const bracketMatch = rawFront.match(/^([^（\(]+)[（\(]([^）\)]+)[）\)]/);
                const cleanFront = bracketMatch ? bracketMatch[1].trim() : rawFront.replace(/[（\(][^）\)]+[）\)]/g, '').trim();
                const cleanReading = aiData.reading || (bracketMatch ? bracketMatch[2].trim() : '');
                setFront(cleanFront);
                if (aiData.sinoVietnamese) setSinoVietnamese(aiData.sinoVietnamese);
                if (cleanReading) setReading(cleanReading);
                if (aiData.accent !== undefined) setAccent(String(aiData.accent));
            }
            if (aiData.meaning) setBack(aiData.meaning);
            if (aiData.synonym) setSynonym((aiData.synonym || '').replace(/[（\(][^）\)]+[）\)]/g, '').trim());
            if (aiData.synonymSinoVietnamese && !isEng) setSynonymSinoVietnamese(aiData.synonymSinoVietnamese);
            if (aiData.example) setExample(aiData.example);
            if (aiData.exampleMeaning) setExampleMeaning(aiData.exampleMeaning);
            if (aiData.nuance) setNuance(aiData.nuance);
            if (aiData.pos) setPos(aiData.pos);
            if (aiData.level) setLevel(aiData.level);
        }
        setIsAiLoading(false);
    };

    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chỉnh Sửa Thẻ</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Từ vựng ({cardIsEnglish ? 'Anh' : 'Nhật'})</label>
                                <div className="flex gap-2">
                                    <input type="text" value={front} onChange={(e) => setFront(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-gray-100" />
                                    {onGeminiAssist && (
                                        <button type="button" onClick={handleAiAssist}
                                            className="px-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50">
                                            {isAiLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "AI"}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl relative">
                                {/* Trigger Button */}
                                <button
                                    type="button"
                                    onClick={() => setPosDropdownOpen(!posDropdownOpen)}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-100 text-left flex justify-between items-center cursor-pointer"
                                >
                                    <span>
                                        {pos ? (
                                            pos === 'grammar' ? (
                                                `Ngữ pháp ${level ? `(${level})` : ''}`
                                            ) : (
                                                getPosLabel(pos)
                                            )
                                        ) : (
                                            '-- Chọn Từ Loại --'
                                        )}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" style={{ transform: posDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                                </button>

                                {/* Dropdown Menu */}
                                {posDropdownOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setPosDropdownOpen(false)} 
                                        />
                                        
                                        <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50 text-sm font-medium text-slate-700 dark:text-slate-200 max-h-60 overflow-y-auto">
                                        {Object.entries(cardIsEnglish ? ENGLISH_POS_TYPES : POS_TYPES).map(([key, value]) => {
                                                if (key === 'grammar') {
                                                    return (
                                                        <div key={key} className="relative group/grammar">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    if (window.innerWidth <= 768) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setShowLevels(!showLevels);
                                                                    } else {
                                                                        setPos('grammar');
                                                                        setLevel('');
                                                                        setPosDropdownOpen(false);
                                                                    }
                                                                }}
                                                                className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-left flex justify-between items-center"
                                                            >
                                                                <span>Ngữ pháp</span>
                                                                <span className="text-[10px] text-slate-400">▶</span>
                                                            </button>

                                                            {/* Sub-menu for JLPT levels */}
                                                            <div className={`absolute left-full top-0 ml-1 w-24 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 py-1 ${showLevels ? 'block' : 'hidden md:group-hover/grammar:block'}`}>
                                                                {JLPT_LEVELS.map((lvl) => (
                                                                    <button
                                                                        key={lvl.value}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setPos('grammar');
                                                                            setLevel(lvl.value);
                                                                            setPosDropdownOpen(false);
                                                                        }}
                                                                        className="w-full px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-left text-xs font-semibold"
                                                                    >
                                                                        {lvl.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => {
                                                            setPos(key);
                                                            setLevel('');
                                                            setPosDropdownOpen(false);
                                                        }}
                                                        className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-left"
                                                    >
                                                        {value.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Ý nghĩa</label>
                                <input type="text" value={back} onChange={(e) => setBack(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {cardIsEnglish ? (
                                    <>
                                        <input type="text" value={ipa} onChange={(e) => setIpa(e.target.value)} placeholder="Phiên âm (IPA)" className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-mono" />
                                        <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Đồng nghĩa" className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                    </>
                                ) : (
                                    <>
                                        <input type="text" value={reading} onChange={(e) => setReading(e.target.value)} placeholder="Cách đọc (Hiragana)" className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-japanese" />
                                        <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder="Hán Việt" className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                        <div className="col-span-2">
                                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Đồng nghĩa" className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <textarea value={example} onChange={(e) => setExample(e.target.value)} rows="2" placeholder="Ví dụ (Nhật)" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                            <textarea value={exampleMeaning} onChange={(e) => setExampleMeaning(e.target.value)} rows="2" placeholder="Nghĩa ví dụ" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                            <textarea value={nuance} onChange={(e) => setNuance(e.target.value)} rows="2" placeholder="Ghi chú" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase">Media</h3>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="img-edit-modal" className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium text-sm flex items-center hover:text-indigo-800">
                                        <ImageIcon className="w-4 h-4 mr-2" /> {imagePreview ? "Thay đổi ảnh" : "Tải ảnh lên"}
                                    </label>
                                    <input id="img-edit-modal" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    {imagePreview && (
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={imagePreview} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setImagePreview(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                            <Volume2 className="w-4 h-4 mr-1.5" />
                                            <span>Sửa Audio Phát Âm</span>
                                        </div>
                                        {customAudio && (
                                            <button
                                                type="button"
                                                onClick={() => playAudio(customAudio, front, null, null, customHiragana || reading)}
                                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                                Nghe thử
                                            </button>
                                        )}
                                    </div>

                                    {/* Fix Audio Input & Action */}
                                    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3 rounded-xl space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>{cardIsEnglish ? 'Nhập từ chuẩn tiếng Anh:' : 'Nhập cách đọc Hiragana đúng:'}</span>
                                            </label>
                                            {(audioFixed || card?.audioFixed) && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                                                    <Check className="w-3 h-3" /> Đã sửa (1/1 lần)
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={customHiragana}
                                                onChange={(e) => setCustomHiragana(e.target.value)}
                                                placeholder={cardIsEnglish ? "Nhập từ chuẩn..." : "Nhập Hiragana đúng (VD: もくどく, たべる...)"}
                                                disabled={audioFixed || card?.audioFixed || isGeneratingAudio}
                                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800/80 disabled:cursor-not-allowed font-medium"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (!audioFixed && !card?.audioFixed && customHiragana.trim() && !isGeneratingAudio) {
                                                            handlePreFixAudio();
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handlePreFixAudio}
                                                disabled={audioFixed || card?.audioFixed || isGeneratingAudio || !customHiragana.trim()}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm ${
                                                    audioFixed || card?.audioFixed
                                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                                        : isGeneratingAudio || !customHiragana.trim()
                                                        ? 'bg-indigo-300 dark:bg-indigo-900/50 text-white cursor-not-allowed'
                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                                                }`}
                                            >
                                                {isGeneratingAudio ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                )}
                                                <span>{audioFixed || card?.audioFixed ? 'Đã sửa' : 'Tạo audio'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                    <button onClick={handleSave} disabled={isSaving}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Lưu Thay Đổi
                    </button>
                    <button onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                        Hủy
                    </button>
                </div>
            </div>

            {/* Warning & Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowConfirmModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700/80 bg-amber-50/70 dark:bg-amber-950/40">
                            <h3 className="text-sm font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                <span>Xác nhận sửa Audio (Chỉ 1 lần duy nhất)</span>
                            </h3>
                            <button onClick={() => setShowConfirmModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3.5">
                            <div className="p-3 bg-slate-50 dark:bg-slate-750/70 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Từ vựng:</span>
                                    <span className="text-slate-900 dark:text-white font-extrabold text-sm">{front}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Cách đọc tạo Audio:</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm font-japanese">{customHiragana.trim()}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800/60 rounded-xl text-xs leading-relaxed text-amber-900 dark:text-amber-200 space-y-1.5">
                                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>Quy định sửa Audio:</span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                                    Mỗi từ vựng chỉ được phép sửa audio <strong>1 lần duy nhất</strong> bằng cách nhập cách đọc Hiragana chuẩn xác. Nghiêm cấm hành vi spam, cố tình nhập sai hoặc phá hoại hệ thống — nếu vi phạm sẽ bị <strong>khóa tài khoản vĩnh viễn</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2.5 px-3 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-all cursor-pointer"
                            >
                                Hủy / Kiểm tra lại
                            </button>
                            <button
                                type="button"
                                onClick={executeFixAudio}
                                className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            >
                                <Check className="w-4 h-4" />
                                Xác nhận & Tạo Audio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PremiumLockedModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </div>
    );
};

export default EditCardModal;
