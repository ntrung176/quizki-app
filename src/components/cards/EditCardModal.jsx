import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Image as ImageIcon, Volume2, Trash2, Check, ChevronDown, Wrench, RefreshCw, Sparkles, Play } from 'lucide-react';
import { POS_TYPES, ENGLISH_POS_TYPES, KOREAN_POS_TYPES, JLPT_LEVELS, getPosLabel } from '../../config/constants';
import { compressImage } from '../../utils/image';
import { showToast } from '../../utils/toast';
import { playAudio, generateAudioSilent, clearAudioCache, saveSharedAudio, getTTSVoice } from '../../utils/audio';

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
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [posDropdownOpen, setPosDropdownOpen] = useState(false);
    const [showLevels, setShowLevels] = useState(false);

    const langService = getLanguageService({ front, targetLanguage: card?.targetLanguage }, isEnglishMode, isKoreanMode);
    const cardIsEnglish = langService.code === 'en' || isEnglishCard({ front }, isEnglishMode);
    const cardIsKorean = langService.code === 'ko' || isKoreanCard({ front }, isKoreanMode);

    // Xử lý tạo / tạo lại audio trực tiếp, mượt mà và tin cậy
    const handleGenerateAudioDirect = async () => {
        const trimmedReading = customHiragana.trim();
        if (!trimmedReading) {
            showToast(
                cardIsKorean 
                    ? (language === "vi" ? "Vui lòng nhập từ vựng hoặc cách đọc tiếng Hàn chuẩn." : "Please enter valid Korean word or reading.") 
                    : cardIsEnglish 
                        ? (language === "vi" ? "Vui lòng nhập từ tiếng Anh chuẩn." : "Please enter a valid English word.") 
                        : (language === "vi" ? "Vui lòng nhập cách đọc bằng Hiragana chuẩn xác." : "Please enter standard Hiragana reading."), 
                "warning"
            );
            return;
        }

        if (!cardIsEnglish && !cardIsKorean) {
            const isKana = /^[\u3040-\u309F\u30A0-\u30FF\s・ー]+$/.test(trimmedReading);
            if (!isKana) {
                showToast(
                    language === "vi" 
                        ? "Cách đọc tiếng Nhật phải nhập bằng Hiragana hoặc Katakana (VD: もくどく)." 
                        : "Japanese reading must be in Hiragana or Katakana (e.g. もくどく).", 
                    "warning"
                );
                return;
            }
        }

        setIsGeneratingAudio(true);
        try {
            // Xóa cache cũ cả theo front lẫn reading
            clearAudioCache(front, trimmedReading);

            // Tạo audio mới với timeout dài & fallback Google TTS tự động
            const textToSpeak = (!cardIsEnglish && !cardIsKorean) ? trimmedReading : (front || trimmedReading);
            const result = await generateAudioSilent(front || trimmedReading, trimmedReading, null, {
                forceRegenerate: true,
                skipNative: false
            });

            if (result && result.base64) {
                setCustomAudio(result.base64);
                setAudioFixed(true);
                if (!cardIsEnglish) {
                    setReading(trimmedReading);
                }
                const gender = getTTSVoice() === 'male' ? 'male' : 'female';
                saveSharedAudio(front || trimmedReading, result.base64, gender, trimmedReading);

                showToast(
                    language === "vi" 
                        ? "Đã tạo phát âm mới thành công!" 
                        : "Audio regenerated successfully!", 
                    "success"
                );
                // Tự động phát âm thanh mới để người dùng nghe kiểm tra ngay
                playAudio(result.base64, front || trimmedReading, null, null, trimmedReading);
            } else {
                throw new Error("Không thể tạo audio từ máy chủ. Vui lòng kiểm tra kết nối mạng.");
            }
        } catch (err) {
            console.error("Audio generation error:", err);
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
            id: card.id,
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
                if (cleanReading) {
                    setReading(cleanReading);
                    setCustomHiragana(cleanReading);
                }
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fade-in">
            {/* Duolingo 3D Modal Box */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border-2 border-b-[6px] border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full min-w-0 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col my-auto transition-all animate-scale-up">
                
                {/* Header Bar */}
                <div className="flex items-center justify-between px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800/80 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {t('forms.editCardTitle', 'Chỉnh Sửa Thẻ Từ Vựng')}
                        </h2>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer active:translate-y-0.5 active:border-b-1 shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Form */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        
                        {/* LEFT COLUMN: Front, Pos, Meaning, Reading */}
                        <div className="space-y-3.5 sm:space-y-4 min-w-0">
                            {/* Front Word & AI Auto-fill */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('forms.wordLabel', 'Từ vựng')} ({cardIsKorean ? (language === 'vi' ? 'Hàn' : 'Korean') : cardIsEnglish ? (language === 'vi' ? 'Anh' : 'English') : (language === 'vi' ? 'Nhật' : 'Japanese')})
                                </label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={front} 
                                        onChange={(e) => setFront(e.target.value)}
                                        className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-500 focus:outline-none text-slate-900 dark:text-white text-sm font-bold shadow-xs" 
                                    />
                                    {onGeminiAssist && (
                                        <button 
                                            type="button" 
                                            onClick={handleAiAssist}
                                            className="px-4 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-2 border-2 border-b-4 border-emerald-700 text-white rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none shadow-xs"
                                        >
                                            {isAiLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-3.5 h-3.5" />}
                                            <span>AI</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Part of Speech (POS) Dropdown */}
                            <div className="space-y-1.5 relative min-w-0">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('forms.partOfSpeechLabel', 'Từ loại')}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setPosDropdownOpen(!posDropdownOpen)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 text-left flex justify-between items-center cursor-pointer shadow-xs focus:border-emerald-500"
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
                                    <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200" style={{ transform: posDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                                </button>

                                {/* Dropdown Menu */}
                                {posDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setPosDropdownOpen(false)} />
                                        <div className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border-2 border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs font-bold text-slate-700 dark:text-slate-200 max-h-60 overflow-y-auto custom-scrollbar">
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
                                                                className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-left flex justify-between items-center cursor-pointer"
                                                            >
                                                                <span>{t('forms.grammar', 'Ngữ pháp')}</span>
                                                                <span className="text-[10px] text-slate-400">▶</span>
                                                            </button>

                                                            <div className={`absolute left-full top-0 ml-1 w-24 rounded-xl bg-white dark:bg-slate-800 shadow-xl border-2 border-slate-200 dark:border-slate-700 py-1 ${showLevels ? 'block' : 'hidden md:group-hover/grammar:block'}`}>
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
                                                                        className="w-full px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-left text-xs font-bold cursor-pointer"
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
                                                        className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-left cursor-pointer"
                                                    >
                                                        {value.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Definition (Ý nghĩa) */}
                            <div className="space-y-1.5 min-w-0">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('forms.definitionLabel', 'Ý nghĩa & Định nghĩa')}
                                </label>
                                <input 
                                    type="text" 
                                    value={back} 
                                    onChange={(e) => setBack(e.target.value)} 
                                    className="w-full min-w-0 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-xs font-bold focus:border-emerald-500 focus:outline-none shadow-xs" 
                                />
                            </div>

                            {/* Sub fields: Reading, Sino-Vietnamese, Synonyms */}
                            <div className="grid grid-cols-2 gap-2.5 min-w-0">
                                {cardIsKorean ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">{t('forms.romajaLabel', 'Phiên âm Romaja')}</label>
                                            <input type="text" value={reading} onChange={(e) => setReading(e.target.value)} placeholder="Romaja..." className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">{t('forms.sinoKoreanLabel', 'Âm Hán Hàn')}</label>
                                            <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder="Hán Hàn..." className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold" />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">{t('forms.synonyms', 'Đồng nghĩa')}</label>
                                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Từ đồng nghĩa..." className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold" />
                                        </div>
                                    </>
                                ) : cardIsEnglish ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">{t('forms.ipaLabel', 'Phiên âm (IPA)')}</label>
                                            <input type="text" value={ipa} onChange={(e) => setIpa(e.target.value)} placeholder="/.../" className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">{t('forms.synonyms', 'Đồng nghĩa')}</label>
                                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Synonyms..." className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">{t('forms.readingLabel', 'Cách đọc (Hiragana)')}</label>
                                            <input 
                                                type="text" 
                                                value={reading} 
                                                onChange={(e) => {
                                                    setReading(e.target.value);
                                                    setCustomHiragana(e.target.value);
                                                }} 
                                                placeholder="Hiragana..." 
                                                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-japanese font-bold" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">{t('forms.sinoVietnameseLabel', 'Hán Việt')}</label>
                                            <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder="Hán Việt..." className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold" />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">{t('forms.synonyms', 'Đồng nghĩa')}</label>
                                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Từ đồng nghĩa..." className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Examples, Notes, Media & Audio Tool */}
                        <div className="space-y-3.5 sm:space-y-4 min-w-0">
                            {/* Examples */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {cardIsKorean ? t('forms.examplePlaceholderKo', 'Câu ví dụ (Hàn)') : cardIsEnglish ? t('forms.examplePlaceholderEn', 'Câu ví dụ (Anh)') : t('forms.examplePlaceholderJa', 'Câu ví dụ (Nhật)')}
                                </label>
                                <textarea 
                                    value={example} 
                                    onChange={(e) => setExample(e.target.value)} 
                                    rows="2" 
                                    className="w-full min-w-0 px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none shadow-xs" 
                                />
                            </div>

                            {/* Example Meaning */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('forms.exampleMeaningPlaceholder', 'Nghĩa của câu ví dụ')}
                                </label>
                                <textarea 
                                    value={exampleMeaning} 
                                    onChange={(e) => setExampleMeaning(e.target.value)} 
                                    rows="2" 
                                    className="w-full min-w-0 px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none shadow-xs" 
                                />
                            </div>

                            {/* Nuance / Notes */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('forms.nuanceNotePlaceholder', 'Ghi chú ngữ cảnh & Sắc thái')}
                                </label>
                                <textarea 
                                    value={nuance} 
                                    onChange={(e) => setNuance(e.target.value)} 
                                    rows="2" 
                                    className="w-full min-w-0 px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none shadow-xs" 
                                />
                            </div>

                            {/* Media Section: Image & Audio Tool */}
                            <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 space-y-3 min-w-0">
                                
                                {/* Image Upload row */}
                                <div className="flex items-center justify-between min-w-0 gap-2">
                                    <label htmlFor="img-edit-modal" className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center hover:text-emerald-700 shrink-0">
                                        <ImageIcon className="w-4 h-4 mr-1.5" /> 
                                        <span>{imagePreview ? t('forms.changeImage', 'Thay đổi ảnh minh họa') : t('forms.uploadImage', 'Tải ảnh minh họa lên')}</span>
                                    </label>
                                    <input id="img-edit-modal" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    {imagePreview && (
                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 group shrink-0 shadow-xs">
                                            <img src={imagePreview} className="w-full h-full object-cover" />
                                            <button 
                                                type="button" 
                                                onClick={() => setImagePreview(null)} 
                                                className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* AUDIO TOOLKIT (DUOLINGO 3D) */}
                                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2.5 min-w-0">
                                    <div className="flex items-center justify-between min-w-0 gap-2">
                                        <div className="flex items-center text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                            <Volume2 className="w-4 h-4 mr-1.5 shrink-0" />
                                            <span>{t('forms.editAudio', 'Sửa Audio Phát Âm')}</span>
                                        </div>
                                        
                                        {/* Nút Nghe thử */}
                                        {customAudio && (
                                            <button
                                                type="button"
                                                onClick={() => playAudio(customAudio, front, null, null, customHiragana || reading)}
                                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 active:border-b-1 border-2 border-b-3 border-amber-700 text-white rounded-xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs select-none shrink-0"
                                                title="Nghe thử audio hiện tại"
                                            >
                                                <Play className="w-3 h-3 fill-white" />
                                                <span>{t('forms.testAudio', 'Nghe thử')}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Input Hiragana & Nút Tạo audio trực tiếp */}
                                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700/80 p-3 rounded-2xl space-y-2 min-w-0 shadow-xs">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                                                <Wrench className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                <span className="truncate">
                                                    {cardIsKorean ? (language === 'vi' ? 'Nhập từ tiếng Hàn chuẩn:' : 'Enter valid Korean word:') : cardIsEnglish ? (language === 'vi' ? 'Nhập từ chuẩn tiếng Anh:' : 'Enter valid English word:') : (language === 'vi' ? 'Nhập cách đọc Hiragana đúng:' : 'Enter valid Hiragana reading:')}
                                                </span>
                                            </label>
                                            {(audioFixed || card?.audioFixed) && (
                                                <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1 border border-emerald-300 dark:border-emerald-800 shrink-0">
                                                    <Check className="w-2.5 h-2.5" /> {t('forms.audioFixedBadge', 'Đã lưu audio')}
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
                                                placeholder={cardIsEnglish ? (language === 'vi' ? "Nhập từ chuẩn..." : "Enter valid word...") : (language === 'vi' ? "Nhập Hiragana đúng (VD: それとも, たべる...)" : "Enter standard Hiragana (e.g. それとも, たべる...)")}
                                                disabled={isGeneratingAudio}
                                                className="w-full min-w-0 flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none font-bold font-japanese"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (customHiragana.trim() && !isGeneratingAudio) {
                                                            handleGenerateAudioDirect();
                                                        }
                                                    }
                                                }}
                                            />
                                            
                                            {/* Nút Tạo Audio Duolingo 3D */}
                                            <button
                                                type="button"
                                                onClick={handleGenerateAudioDirect}
                                                disabled={isGeneratingAudio || !customHiragana.trim()}
                                                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 select-none border-2 border-b-3 ${
                                                    isGeneratingAudio || !customHiragana.trim()
                                                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                                        : 'bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-1 border-emerald-700 text-white cursor-pointer shadow-xs'
                                                }`}
                                            >
                                                {isGeneratingAudio ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                                                )}
                                                <span>{isGeneratingAudio ? 'Đang tạo...' : (customAudio || audioFixed ? t('forms.regenerateAudio', 'Tạo lại audio') : t('forms.generateAudio', 'Tạo audio'))}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions (Duolingo 3D Style) */}
                <div className="flex gap-3 px-5 py-3.5 sm:py-4 border-t-2 border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex-1 min-w-0 py-3 px-6 bg-emerald-500 hover:bg-emerald-400 active:translate-y-1 active:border-b-2 border-2 border-b-[5px] border-emerald-700 text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                        <span className="truncate">{t('forms.saveChanges', 'Lưu Thay Đổi')}</span>
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:translate-y-0.5 active:border-b-2 border-2 border-b-4 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm transition-all shrink-0 cursor-pointer select-none"
                    >
                        {t('common.cancel', 'Hủy')}
                    </button>
                </div>
            </div>

            <PremiumLockedModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </div>
    );
};

export default EditCardModal;
