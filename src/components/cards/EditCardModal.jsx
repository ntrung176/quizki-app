import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Image as ImageIcon, Music, Volume2, Trash2, Check, ChevronDown, AlertTriangle } from 'lucide-react';
import { POS_TYPES, JLPT_LEVELS, getPosLabel } from '../../config/constants';
import { compressImage } from '../../utils/image';
import { showToast } from '../../utils/toast';
import { playAudio } from '../../utils/audio';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

import PremiumLockedModal from '../ui/PremiumLockedModal';

const EditCardModal = ({ card, onSave, onClose, onGeminiAssist, allCards = [], canUserUseAI }) => {
    const [front, setFront] = useState(card?.front || '');
    const [back, setBack] = useState(card?.back || '');
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
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [posDropdownOpen, setPosDropdownOpen] = useState(false);
    const [showLevels, setShowLevels] = useState(false);
    const [isReportingAudio, setIsReportingAudio] = useState(false);
    const [reportedAudio, setReportedAudio] = useState(false);

    const handleReportAudioError = async () => {
        setIsReportingAudio(true);
        try {
            const normalizedWord = front.split('（')[0].split('(')[0].trim();
            const normalizedLower = normalizedWord.toLowerCase();
            
            // 1. Try finding in sharedVocabulary
            let docRef = doc(db, 'sharedVocabulary', normalizedWord);
            let docSnap = await getDoc(docRef);
            
            if (!docSnap.exists() && normalizedWord !== normalizedLower) {
                docRef = doc(db, 'sharedVocabulary', normalizedLower);
                docSnap = await getDoc(docRef);
            }
            
            if (docSnap.exists()) {
                await updateDoc(docRef, {
                    reportedAudioError: true,
                    reportedError: true
                });
            } else {
                // If it doesn't exist, create a draft in sharedVocabulary
                await setDoc(docRef, {
                    front: front.trim(),
                    back: back.trim(),
                    sinoVietnamese: sinoVietnamese.trim(),
                    pos: pos,
                    level: level,
                    synonym: synonym.trim(),
                    nuance: nuance.trim(),
                    example: example.trim(),
                    exampleMeaning: exampleMeaning.trim(),
                    synonymSinoVietnamese: synonymSinoVietnamese.trim(),
                    reportedAudioError: true,
                    reportedError: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
            
            setReportedAudio(true);
            showToast("Đã gửi báo cáo lỗi audio thành công!", "success");
        } catch (error) {
            console.error("Lỗi khi báo cáo lỗi audio:", error);
            showToast("Không thể gửi báo cáo lỗi audio: " + error.message, "error");
        } finally {
            setIsReportingAudio(false);
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
        await onSave({
            cardId: card.id,
            front, back, synonym, example, exampleMeaning, nuance, pos, level,
            sinoVietnamese, synonymSinoVietnamese,
            reading: reading.trim(),
            accent: accent.trim(),
            imageBase64: imagePreview,
            audioBase64: card?.audioBase64 || null
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
            if (aiData.reading) setReading(aiData.reading);
            if (aiData.accent !== undefined) setAccent(String(aiData.accent));
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
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Từ vựng (Nhật)</label>
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
                                        
                                        <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50 text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {Object.entries(POS_TYPES).map(([key, value]) => {
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
                                <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder="Hán Việt" className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
                                <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Đồng nghĩa" className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100" />
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
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <div className="text-indigo-650 dark:text-indigo-400 text-sm font-medium flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Music className="w-4 h-4 mr-2" />
                                            <span>Audio</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg">
                                        {customAudio ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => playAudio(customAudio)}
                                                        className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        <Volume2 className="w-3.5 h-3.5" />
                                                        Nghe thử
                                                    </button>
                                                </div>
                                                
                                                {reportedAudio ? (
                                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                        <Check className="w-3.5 h-3.5" />
                                                        Đã báo cáo lỗi
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleReportAudioError}
                                                        disabled={isReportingAudio}
                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        {isReportingAudio ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                        )}
                                                        Báo cáo lỗi audio
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Không có file audio</span>
                                        )}
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
            <PremiumLockedModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </div>
    );
};

export default EditCardModal;
