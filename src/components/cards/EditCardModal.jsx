import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Image as ImageIcon, Music, Volume2, Trash2, Check, ChevronDown, AlertTriangle, Wrench, RefreshCw, ShieldAlert } from 'lucide-react';
import { POS_TYPES, ENGLISH_POS_TYPES, KOREAN_POS_TYPES, JLPT_LEVELS, getPosLabel } from '../../config/constants';
import { compressImage } from '../../utils/image';
import { showToast } from '../../utils/toast';
import { playAudio, generateAudioSilent, clearAudioCache, saveSharedAudio, getTTSVoice } from '../../utils/audio';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

import PremiumLockedModal from '../ui/PremiumLockedModal';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { useLanguage } from '../../context/LanguageContext';
import { getLanguageService, isEnglishCard, isKoreanCard } from '../../languages';

const EditCardModal = ({ card, onSave, onClose, onGeminiAssist, allCards = [], canUserUseAI }) => {
    const { isEnglishMode, isKoreanMode } = useTargetLanguage();
    const { t, language } = useLanguage();
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

    const langService = getLanguageService({ front, targetLanguage: card?.targetLanguage }, isEnglishMode, isKoreanMode);
    const cardIsEnglish = langService.code === 'en' || isEnglishCard({ front }, isEnglishMode);
    const cardIsKorean = langService.code === 'ko' || isKoreanCard({ front }, isKoreanMode);

    const handlePreFixAudio = () => {
        const trimmedReading = customHiragana.trim();
        if (!trimmedReading) {
            showToast(cardIsKorean ? (language === "vi" ? "Vui lòng nhập từ vựng hoặc cách đọc tiếng Hàn chuẩn." : "Please enter valid Korean word or reading.") : cardIsEnglish ? (language === "vi" ? "Vui lòng nhập từ tiếng Anh chuẩn." : "Please enter a valid English word.") : (language === "vi" ? "Vui lòng nhập cách đọc bằng Hiragana chuẩn xác." : "Please enter standard Hiragana reading."), "warning");
            return;
        }
        if (!cardIsEnglish && !cardIsKorean) {
            const isKana = /^[\u3040-\u309F\u30A0-\u30FF\s・ー]+$/.test(trimmedReading);
            if (!isKana) {
                showToast(language === "vi" ? "Cách đọc tiếng Nhật phải nhập bằng Hiragana hoặc Katakana (VD: もくどく)." : "Japanese reading must be in Hiragana or Katakana (e.g. もくどく).", "warning");
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
            // Xóa cache cũ để đảm bảo phát âm mới nhất không bị load lại audio cũ
            clearAudioCache(front, trimmedReading);

            // Force generate with fresh Azure TTS using exact reading and bypass any old caches
            const result = await generateAudioSilent(front || trimmedReading, trimmedReading, null, {
                forceRegenerate: true,
                skipNative: true
            });
            if (result && result.base64) {
                setCustomAudio(result.base64);
                setAudioFixed(true);
                if (!cardIsEnglish) {
                    setReading(trimmedReading);
                }
                const gender = getTTSVoice() === 'male' ? 'male' : 'female';
                saveSharedAudio(front || trimmedReading, result.base64, gender, trimmedReading);

                showToast(language === "vi" ? "Đã tạo audio phát âm chuẩn theo Hiragana mới!" : "Audio regenerated with new reading!", "success");
                playAudio(result.base64, front || trimmedReading, null, null, trimmedReading);
            } else {
                throw new Error("Không thể tạo audio từ máy chủ Microsoft Azure TTS. Vui lòng thử lại.");
            }
        } catch (err) {
            console.error("Fix audio error:", err);
            showToast((language === "vi" ? "Lỗi khi tạo audio: " : "Error generating audio: ") + err.message, "error");
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

    const handleSave = async () => {
        if (!front.trim() || !back.trim()) return;
        setIsSaving(true);
        const isEng = cardIsEnglish || isEnglishCard({ front }, isEnglishMode);
        const isKo = cardIsKorean || isKoreanCard({ front }, isKoreanMode);
        const finalReading = isEng ? '' : (customHiragana.trim() || reading.trim());
        const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(front.trim());
        const updatedFrontWithFurigana = (!isEng && !isKo && hasKanji && finalReading)
            ? `${front.trim()}（${finalReading}）`
            : front.trim();

        await onSave({
            cardId: card.id,
            front: front.trim(),
            frontWithFurigana: updatedFrontWithFurigana,
            back: back.trim(),
            ipa: isEng ? ipa.trim() : '',
            synonym, example, exampleMeaning, nuance, pos, level,
            sinoVietnamese: isEng ? '' : sinoVietnamese,
            synonymSinoVietnamese: isEng ? '' : synonymSinoVietnamese,
            reading: finalReading,
            accent: (isEng || isKo) ? '' : accent.trim(),
            targetLanguage: isKo ? 'ko' : (isEng ? 'en' : 'ja'),
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
            showToast(t('forms.duplicateWordWarning', 'Từ vựng đã có trong học phần rồi.'), 'warning');
            return;
        }

        setIsAiLoading(true);
        const aiData = await onGeminiAssist(front, pos, level, back);
        if (aiData) {
            const isEng = cardIsEnglish || aiData.targetLanguage === 'en';
            const isKo = cardIsKorean || aiData.targetLanguage === 'ko';
            if (isKo) {
                setFront(aiData.front || front);
                setReading(aiData.reading || '');
                setSinoVietnamese(aiData.sinoVietnamese || '');
                setIpa('');
                setAccent('');
            } else if (isEng) {
                setFront(aiData.front || front);
                setIpa(aiData.ipa || '');
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto overflow-x-hidden">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full min-w-0 max-h-[92vh] overflow-y-auto overflow-x-hidden flex flex-col my-auto">
                <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">{t('forms.editCardTitle', 'Chỉnh Sửa Thẻ')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer shrink-0">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-3 sm:p-4 space-y-4 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4 min-w-0">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('forms.wordLabel', 'Từ vựng')} ({cardIsKorean ? (language === 'vi' ? 'Hàn' : 'Korean') : cardIsEnglish ? (language === 'vi' ? 'Anh' : 'English') : (language === 'vi' ? 'Nhật' : 'Japanese')})</label>
                                <div className="flex gap-2">
                                    <input type="text" value={front} onChange={(e) => setFront(e.target.value)}
                                        className="flex-1 min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-900 dark:text-gray-100" />
                                    {onGeminiAssist && (
                                        <button type="button" onClick={handleAiAssist}
                                            className="px-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 shrink-0 cursor-pointer">
                                            {isAiLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "AI"}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl relative min-w-0">
                                {/* Trigger Button */}
                                <button
                                    type="button"
                                    onClick={() => setPosDropdownOpen(!posDropdownOpen)}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-100 text-left flex justify-between items-center cursor-pointer"
                                >
                                    <span>
                                            {pos ? (
                                                pos === 'grammar' ? (
                                                    `${t('forms.grammar', 'Ngữ pháp')} ${level ? `(${level})` : ''}`
                                                ) : (
                                                    getPosLabel(pos, cardIsKorean ? 'ko' : cardIsEnglish ? 'en' : 'ja')
                                                )
                                            ) : (
                                            t('forms.partOfSpeechSelect', '-- Chọn Từ Loại --')
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
                                        {Object.entries(cardIsKorean ? KOREAN_POS_TYPES : cardIsEnglish ? ENGLISH_POS_TYPES : POS_TYPES).map(([key, value]) => {
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
                                                                <span>{t('forms.grammar', 'Ngữ pháp')}</span>
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
                            <div className="space-y-2 min-w-0">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('forms.definitionLabel', 'Ý nghĩa')}</label>
                                <input type="text" value={back} onChange={(e) => setBack(e.target.value)} className="w-full min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 min-w-0">
                                {cardIsKorean ? (
                                    <>
                                        <input type="text" value={reading} onChange={(e) => setReading(e.target.value)} placeholder={t('forms.romajaLabel', 'Phiên âm Romaja')} className="w-full min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                        <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder={t('forms.sinoKoreanLabel', 'Âm Hán Hàn')} className="w-full min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                        <div className="col-span-2 min-w-0">
                                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder={t('forms.synonyms', 'Đồng nghĩa')} className="w-full min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                        </div>
                                    </>
                                ) : cardIsEnglish ? (
                                    <>
                                        <input type="text" value={ipa} onChange={(e) => setIpa(e.target.value)} placeholder={t('forms.ipaLabel', 'Phiên âm (IPA)')} className="w-full min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-mono" />
                                        <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder={t('forms.synonyms', 'Đồng nghĩa')} className="w-full min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                    </>
                                ) : (
                                    <>
                                        <input type="text" value={reading} onChange={(e) => {
                                            setReading(e.target.value);
                                            setCustomHiragana(e.target.value);
                                        }} placeholder={t('forms.readingLabel', 'Cách đọc (Hiragana)')} className="w-full min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-japanese" />
                                        <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder={t('forms.sinoVietnameseLabel', 'Hán Việt')} className="w-full min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                        <div className="col-span-2 min-w-0">
                                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder={t('forms.synonyms', 'Đồng nghĩa')} className="w-full min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4 min-w-0">
                            <textarea value={example} onChange={(e) => setExample(e.target.value)} rows="2" placeholder={cardIsKorean ? t('forms.examplePlaceholderKo', 'Ví dụ (Hàn)') : cardIsEnglish ? t('forms.examplePlaceholderEn', 'Ví dụ (Anh)') : t('forms.examplePlaceholderJa', 'Ví dụ (Nhật)')} className="w-full min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                            <textarea value={exampleMeaning} onChange={(e) => setExampleMeaning(e.target.value)} rows="2" placeholder={t('forms.exampleMeaningPlaceholder', 'Nghĩa ví dụ')} className="w-full min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                            <textarea value={nuance} onChange={(e) => setNuance(e.target.value)} rows="2" placeholder={t('forms.nuanceNotePlaceholder', 'Ghi chú')} className="w-full min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl space-y-3 min-w-0">
                                <h3 className="text-xs font-bold text-gray-400 uppercase">Media</h3>
                                <div className="flex items-center justify-between min-w-0 gap-2">
                                    <label htmlFor="img-edit-modal" className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium text-sm flex items-center hover:text-emerald-800 shrink-0">
                                        <ImageIcon className="w-4 h-4 mr-2" /> {imagePreview ? t('forms.changeImage', 'Thay đổi ảnh') : t('forms.uploadImage', 'Tải ảnh lên')}
                                    </label>
                                    <input id="img-edit-modal" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    {imagePreview && (
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 group shrink-0">
                                            <img src={imagePreview} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setImagePreview(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3 min-w-0">
                                    <div className="flex items-center justify-between min-w-0 gap-2">
                                        <div className="flex items-center text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                            <Volume2 className="w-4 h-4 mr-1.5 shrink-0" />
                                            <span className="truncate">{t('forms.editAudio', 'Sửa Audio Phát Âm')}</span>
                                        </div>
                                        {customAudio && (
                                            <button
                                                type="button"
                                                onClick={() => playAudio(customAudio, front, null, null, customHiragana || reading)}
                                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                                {t('forms.testAudio', 'Nghe thử')}
                                            </button>
                                        )}
                                    </div>

                                    {/* Fix Audio Input & Action */}
                                    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3 rounded-xl space-y-2.5 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                                                <Wrench className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                <span className="truncate">{cardIsKorean ? (language === 'vi' ? 'Nhập từ tiếng Hàn chuẩn:' : 'Enter valid Korean word:') : cardIsEnglish ? (language === 'vi' ? 'Nhập từ chuẩn tiếng Anh:' : 'Enter valid English word:') : (language === 'vi' ? 'Nhập cách đọc Hiragana đúng:' : 'Enter valid Hiragana reading:')}</span>
                                            </label>
                                            {(audioFixed || card?.audioFixed) && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full flex items-center gap-1 border border-emerald-300 dark:border-emerald-800 shrink-0">
                                                    <Check className="w-3 h-3" /> {t('forms.audioFixedBadge', 'Đã sửa audio')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                                            <input
                                                type="text"
                                                value={customHiragana}
                                                onChange={(e) => {
                                                    setCustomHiragana(e.target.value);
                                                    if (!cardIsEnglish && !cardIsKorean) {
                                                        setReading(e.target.value);
                                                    }
                                                }}
                                                placeholder={cardIsEnglish ? (language === 'vi' ? "Nhập từ chuẩn..." : "Enter valid word...") : (language === 'vi' ? "Nhập Hiragana đúng (VD: ほころびる, たべる...)" : "Enter standard Hiragana (e.g. ほころびる, たべる...)")}
                                                disabled={isGeneratingAudio}
                                                className="w-full min-w-0 flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none font-medium font-japanese"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (customHiragana.trim() && !isGeneratingAudio) {
                                                            handlePreFixAudio();
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handlePreFixAudio}
                                                disabled={isGeneratingAudio || !customHiragana.trim()}
                                                className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm ${
                                                    isGeneratingAudio || !customHiragana.trim()
                                                        ? 'bg-emerald-300 dark:bg-emerald-900/50 text-white cursor-not-allowed'
                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                                }`}
                                            >
                                                {isGeneratingAudio ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                )}
                                                <span>{customAudio || audioFixed ? t('forms.regenerateAudio', 'Tạo lại audio') : t('forms.generateAudio', 'Tạo audio')}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2.5 sm:gap-3 px-4 py-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 shrink-0">
                    <button onClick={handleSave} disabled={isSaving}
                        className="flex-1 min-w-0 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                        <span className="truncate">{t('forms.saveChanges', 'Lưu Thay Đổi')}</span>
                    </button>
                    <button onClick={onClose} className="px-5 sm:px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 shrink-0 cursor-pointer">
                        {t('common.cancel', 'Hủy')}
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
                                <span>{t('forms.confirmFixAudioTitle', 'Xác nhận sửa Audio (Chỉ 1 lần duy nhất)')}</span>
                            </h3>
                            <button onClick={() => setShowConfirmModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3.5">
                            <div className="p-3 bg-slate-50 dark:bg-slate-750/70 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{t('forms.wordLabel', 'Từ vựng')}:</span>
                                    <span className="text-slate-900 dark:text-white font-extrabold text-sm">{front}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{t('forms.readingLabel', 'Cách đọc tạo Audio')}:</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm font-japanese">{customHiragana.trim()}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800/60 rounded-xl text-xs leading-relaxed text-amber-900 dark:text-amber-200 space-y-1.5">
                                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>{t('forms.audioRulesTitle', 'Quy định sửa Audio:')}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                                    {language === 'vi' ? 'Mỗi từ vựng chỉ được phép sửa audio 1 lần duy nhất bằng cách nhập cách đọc Hiragana chuẩn xác. Nghiêm cấm hành vi spam, cố tình nhập sai hoặc phá hoại hệ thống — nếu vi phạm sẽ bị khóa tài khoản vĩnh viễn.' : 'Each vocabulary word is only allowed to fix audio once by entering the accurate reading. Spamming or abusive behavior will result in a permanent ban.'}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2.5 px-3 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-all cursor-pointer"
                            >
                                {t('forms.cancelCheckAgain', 'Hủy / Kiểm tra lại')}
                            </button>
                            <button
                                type="button"
                                onClick={executeFixAudio}
                                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 dark:shadow-emerald-900/50 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            >
                                <Check className="w-4 h-4" />
                                {t('forms.confirmAndGenerateAudio', 'Xác nhận & Tạo Audio')}
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
