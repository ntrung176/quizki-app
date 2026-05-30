import React, { useState, useEffect, useRef } from 'react';
import { Plus, Wand2, Loader2, Image as ImageIcon, Check, X, Search, BookOpen, Languages, MessageSquare, Tag, Sparkles, ChevronDown, CreditCard, Trash2, GripVertical } from 'lucide-react';
import { JLPT_LEVELS, POS_TYPES } from '../../config/constants';
import { compressImage } from '../../utils/image';
import OnboardingTour from '../ui/OnboardingTour';
import ImageSearchModal from '../ui/ImageSearchModal';
import { TopTabBar } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import { showToast } from '../../utils/toast';
import BatchAiModal from './BatchAiModal';

const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

export const CardEditorItem = ({
    card,
    index,
    isActive,
    onActivate,
    onUpdate,
    onDelete,
    onAiAssist,
    onGenerateMoreExample,
    aiCreditsRemaining,
    isAiLoading,
    frontInputRef
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showImageSearch, setShowImageSearch] = useState(false);
    const [isGeneratingExample, setIsGeneratingExample] = useState(false);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                onUpdate(card.id, 'imageBase64', compressedBase64);
            } catch (error) {
                console.error("Lỗi nén ảnh:", error);
                showToast("Không thể xử lý ảnh này.", 'error');
            }
        }
    };

    const handleGenerateExample = async (meaning) => {
        if (!onGenerateMoreExample || !card.front || !meaning) return;
        setIsGeneratingExample(true);
        const aiData = await onGenerateMoreExample(card.front, meaning, card.level);
        if (aiData && aiData.example && aiData.exampleMeaning) {
            onUpdate(card.id, 'example', card.example ? `${card.example}\n${aiData.example}` : aiData.example);
            onUpdate(card.id, 'exampleMeaning', card.exampleMeaning ? `${card.exampleMeaning}\n${aiData.exampleMeaning}` : aiData.exampleMeaning);
        }
        setIsGeneratingExample(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onAiAssist(card.id);
        } else if (e.key === 'g' && (e.altKey || e.metaKey)) {
            e.preventDefault();
            onAiAssist(card.id);
        }
    };

    if (!isActive) {
        return (
            <div 
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 hover:shadow-md cursor-pointer transition-all group flex items-start gap-4"
                onClick={() => onActivate(card.id)}
            >
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-sm shrink-0">
                    {index + 1}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
                        <p className={`text-lg font-bold ${card.front ? 'text-slate-800 dark:text-slate-150' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                            {card.front || 'Thuật ngữ (Tiếng Nhật)'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">THUẬT NGỮ</p>
                    </div>
                    <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
                        <p className={`text-lg font-bold ${card.back ? 'text-slate-800 dark:text-slate-150' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                            {card.back || 'Định nghĩa (Tiếng Việt)'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">ĐỊNH NGHĨA</p>
                    </div>
                </div>
                <button 
                    onClick={(e) => onDelete(e, card.id)} 
                    className="p-2 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xóa thẻ"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-md border border-slate-100 dark:border-slate-700/60 transition-all relative space-y-6">
            {/* Card Header Info */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/65 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm">
                        {index + 1}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-900/65 rounded-lg border border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 text-xs font-bold">
                        <Languages className="w-3.5 h-3.5" />
                        <span>JA-VI</span>
                    </div>
                    {aiCreditsRemaining !== undefined && (
                        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/25 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-850 text-xs text-indigo-600 dark:text-indigo-400" title="Số lượt AI còn lại">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="font-bold">{aiCreditsRemaining}</span>
                        </div>
                    )}
                </div>
                <button 
                    onClick={(e) => onDelete(e, card.id)} 
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                    title="Xóa thẻ"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-5">
                {/* Thuật ngữ & Định nghĩa */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">THUẬT NGỮ (TIẾNG NHẬT) *</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={card.front}
                                onChange={(e) => onUpdate(card.id, 'front', e.target.value)}
                                onKeyDown={handleKeyDown}
                                ref={frontInputRef}
                                required
                                placeholder="Ví dụ: 食べる"
                                className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 py-2.5 text-2xl font-bold text-slate-800 dark:text-white outline-none transition-colors"
                            />
                            {onAiAssist && (
                                <button
                                    type="button"
                                    onClick={() => onAiAssist(card.id)}
                                    disabled={isAiLoading || !card.front.trim()}
                                    className="flex items-center justify-center p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white rounded-xl shadow hover:shadow-md transition-all font-bold disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                    title="Tự động điền thông tin bằng AI (Alt+G)"
                                >
                                    {isAiLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ĐỊNH NGHĨA (TIẾNG VIỆT) *</label>
                        <input
                            type="text"
                            value={card.back}
                            onChange={(e) => onUpdate(card.id, 'back', e.target.value)}
                            required
                            placeholder="Ví dụ: Ăn"
                            className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 py-2.5 text-2xl font-bold text-slate-800 dark:text-white outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Từ loại & Hán Việt */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">TỪ LOẠI</label>
                        <div className="relative">
                            <select
                                value={card.pos}
                                onChange={(e) => onUpdate(card.id, 'pos', e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">-- Chọn từ loại --</option>
                                {Object.entries(POS_TYPES).map(([key, value]) => (
                                    <option key={key} value={key}>{value.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">HÁN VIỆT</label>
                        <input
                            type="text"
                            value={card.sinoVietnamese}
                            onChange={(e) => onUpdate(card.id, 'sinoVietnamese', e.target.value)}
                            placeholder="Âm Hán Việt..."
                            className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 py-2 text-base font-semibold text-slate-700 dark:text-slate-200 outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Ví dụ & Ngữ cảnh */}
                <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                    <label className="block text-[11px] font-bold text-indigo-400 dark:text-indigo-400 uppercase tracking-wider mb-1">VÍ DỤ & NGỮ CẢNH</label>
                    
                    <div>
                        <input
                            type="text"
                            value={card.example}
                            onChange={(e) => onUpdate(card.id, 'example', e.target.value)}
                            placeholder="Câu ví dụ tiếng Nhật"
                            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none"
                        />
                    </div>
                    <div>
                        <input
                            type="text"
                            value={card.exampleMeaning}
                            onChange={(e) => onUpdate(card.id, 'exampleMeaning', e.target.value)}
                            placeholder="Nghĩa câu ví dụ (Việt)"
                            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 py-2 text-sm text-slate-500 dark:text-slate-400 outline-none"
                        />
                    </div>
                    
                    {onGenerateMoreExample && card.back.includes(';') && (
                        <div className="pt-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Tạo thêm ví dụ bằng AI theo nghĩa:</p>
                            <div className="flex flex-wrap gap-2">
                                {card.back.split(';').map(m => m.trim()).filter(Boolean).map((meaning, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => { e.preventDefault(); handleGenerateExample(meaning); }}
                                        disabled={isGeneratingExample}
                                        className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-800/30"
                                    >
                                        {isGeneratingExample ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                        {meaning}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Advanced section */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-900/10">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tùy chọn bổ sung (Ảnh, Đồng nghĩa, Ghi chú)</h3>
                            {card.imageBase64 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdvanced && (
                        <div className="p-4 pt-0 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Từ đồng nghĩa</label>
                                    <input
                                        type="text"
                                        value={card.synonym}
                                        onChange={(e) => onUpdate(card.id, 'synonym', e.target.value)}
                                        placeholder="食事する"
                                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sắc thái / Ghi chú</label>
                                    <input
                                        type="text"
                                        value={card.nuance}
                                        onChange={(e) => onUpdate(card.id, 'nuance', e.target.value)}
                                        placeholder="Ghi chú sắc thái..."
                                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-3 mt-4 bg-white dark:bg-gray-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="flex-1 space-y-2">
                                    <label htmlFor={`image-upload-${card.id}`} className="flex flex-col items-center justify-center w-full h-16 border-2 border-slate-200 dark:border-slate-700 border-dashed rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 flex items-center gap-1">
                                            <ImageIcon className="w-4 h-4" /> Tải ảnh lên
                                        </p>
                                        <input id={`image-upload-${card.id}`} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowImageSearch(true)}
                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-800/30"
                                    >
                                        <Search className="w-3.5 h-3.5" /> Tìm ảnh online
                                    </button>
                                </div>
                                {card.imageBase64 && (
                                    <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-sm flex-shrink-0 group">
                                        <img src={card.imageBase64} alt="Preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => onUpdate(card.id, 'imageBase64', null)} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <ImageSearchModal
                    isOpen={showImageSearch}
                    onClose={() => setShowImageSearch(false)}
                    onSelectImage={(base64) => onUpdate(card.id, 'imageBase64', base64)}
                    defaultQuery={card.front ? card.front.split('（')[0].split('(')[0].trim() : ''}
                    meaningVi={card.back || ''}
                />
            </div>
        </div>
    );
};

const AddCardForm = ({
    onSave,
    onBack,
    onAddFolder,
    onGeminiAssist,
    onExtractVocabFromImage,
    batchMode = false,
    batchVocabList = [],
    onBatchSkip,
    userId,
    onGenerateMoreExample,
    aiCreditsRemaining
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState(null);
    const [cards, setCards] = useState([
        { id: Date.now(), front: '', back: '', synonym: '', example: '', exampleMeaning: '', nuance: '', pos: '', level: '', sinoVietnamese: '', synonymSinoVietnamese: '', imageBase64: null, audioBase64: null }
    ]);
    const [activeCardId, setActiveCardId] = useState(cards[0].id);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoadingMap, setIsAiLoadingMap] = useState({});
    
    // Bulk AI Modal State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchModalInitialTab, setBatchModalInitialTab] = useState('text');

    const activeFrontInputRef = useRef(null);

    // Init from batch mode
    useEffect(() => {
        if (batchMode && batchVocabList && batchVocabList.length > 0) {
            const initialCards = batchVocabList.map((vocab, index) => ({
                id: Date.now() + index,
                front: typeof vocab === 'string' ? vocab : vocab.front || '',
                back: typeof vocab === 'string' ? '' : vocab.back || '',
                synonym: '', example: '', exampleMeaning: '', nuance: '', pos: '', level: '', sinoVietnamese: '', synonymSinoVietnamese: '', imageBase64: null, audioBase64: null
            }));
            setCards(initialCards);
            setActiveCardId(initialCards[0].id);
            setTitle('Học phần nhập tự động');
        }
    }, [batchMode, batchVocabList]);

    const handleUpdateCard = (id, field, value) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleDeleteCard = (e, id) => {
        e.stopPropagation();
        if (cards.length === 1) return;
        const newCards = cards.filter(c => c.id !== id);
        setCards(newCards);
        if (activeCardId === id) {
            setActiveCardId(newCards[newCards.length - 1].id);
        }
    };

    const handleAddCardRow = () => {
        const newCard = { id: Date.now(), front: '', back: '', synonym: '', example: '', exampleMeaning: '', nuance: '', pos: '', level: '', sinoVietnamese: '', synonymSinoVietnamese: '', imageBase64: null, audioBase64: null };
        setCards(prev => [...prev, newCard]);
        setActiveCardId(newCard.id);
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const handleCoverImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                setCoverImage(compressedBase64);
            } catch (error) {
                console.error("Lỗi nén ảnh bìa:", error);
                showToast("Không thể xử lý ảnh bìa này.", 'error');
            }
        }
    };

    const handleAiAssist = async (id) => {
        const card = cards.find(c => c.id === id);
        if (!card || !card.front.trim()) {
            if (activeCardId === id && activeFrontInputRef.current && !isMobileDevice()) {
                activeFrontInputRef.current.focus();
            }
            return;
        }

        setIsAiLoadingMap(prev => ({ ...prev, [id]: true }));
        const aiData = await onGeminiAssist(card.front, card.pos, card.level, false);
        
        if (aiData) {
            setCards(prev => prev.map(c => {
                if (c.id === id) {
                    return {
                        ...c,
                        front: aiData.frontWithFurigana || c.front,
                        back: aiData.meaning || c.back,
                        sinoVietnamese: aiData.sinoVietnamese || c.sinoVietnamese,
                        synonym: aiData.synonym || c.synonym,
                        synonymSinoVietnamese: aiData.synonymSinoVietnamese || c.synonymSinoVietnamese,
                        example: aiData.example || c.example,
                        exampleMeaning: aiData.exampleMeaning || c.exampleMeaning,
                        nuance: aiData.nuance || c.nuance,
                        pos: aiData.pos || c.pos,
                        level: aiData.level || c.level
                    };
                }
                return c;
            }));
        }
        setIsAiLoadingMap(prev => ({ ...prev, [id]: false }));
    };

    const handleBatchAiComplete = (generatedCards) => {
        setCards(prev => {
            const cleanPrev = prev.filter(c => c.front.trim() !== '' || c.back.trim() !== '');
            const combined = [...cleanPrev, ...generatedCards];
            
            if (generatedCards.length > 0) {
                setActiveCardId(generatedCards[0].id);
            }
            return combined;
        });
    };

    const handleSaveSet = async () => {
        const validCards = cards.filter(c => c.front.trim() && c.back.trim());
        if (validCards.length === 0) {
            showToast('Học phần phải có ít nhất 1 thẻ hợp lệ (có Thuật ngữ và Định nghĩa)', 'error');
            return;
        }

        setIsSaving(true);
        let folderId = null;
        
        if (title.trim()) {
            try {
                if (onAddFolder) {
                    folderId = await onAddFolder(title.trim(), description.trim(), coverImage);
                }
            } catch (e) {
                console.error("Lỗi khi tạo thư mục:", e);
            }
        }

        let successCount = 0;
        for (let card of validCards) {
            const success = await onSave({
                ...card,
                action: 'continue',
                folderId: folderId
            });
            if (success) successCount++;
        }

        setIsSaving(false);
        
        if (successCount > 0) {
            showToast(`Đã lưu thành công ${successCount} từ vựng vào học phần!`, 'success');
        }

        if (batchMode && onBatchSkip) {
            await onBatchSkip();
        }
        
        onBack();
    };

    return (
        <div className="w-full pb-32 animate-fade-in bg-slate-50 dark:bg-gray-900 min-h-screen">
            <TopTabBar tabs={VOCAB_TABS} />
            
            <div className="max-w-4xl mx-auto px-4 lg:px-8 mt-6 space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                            Thêm học phần mới
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Tạo lộ trình học tập của bạn với bộ sưu tập từ vựng tập trung.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-6 py-2.5 text-sm font-semibold rounded-xl text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 dark:text-slate-350 dark:bg-gray-800 dark:hover:bg-gray-700/60 dark:border-gray-700 transition-colors shadow-sm"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveSet}
                            disabled={isSaving}
                            className="px-6 py-2.5 text-sm font-bold rounded-xl text-white bg-[#204051] hover:bg-[#1a3543] dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Tạo học phần
                        </button>
                    </div>
                </div>

                {/* Metadata Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row gap-6 items-stretch">
                    <div className="flex-1 space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5">TIÊU ĐỀ HỌC PHẦN</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="VD: Từ vựng N3 bài 1..."
                                className="w-full px-0 py-2.5 bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 text-2xl font-bold text-slate-850 dark:text-white outline-none placeholder-slate-400 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider mb-1.5">THÊM MÔ TẢ</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Mô tả mục tiêu của bộ từ vựng này..."
                                className="w-full px-0 py-2 bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 text-base text-slate-650 dark:text-slate-200 outline-none placeholder-slate-400 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-64 h-36 md:h-auto shrink-0 relative flex items-center justify-center">
                        {coverImage ? (
                            <div className="relative w-full h-full rounded-2xl overflow-hidden group/cover">
                                <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setCoverImage(null)}
                                    className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white hover:bg-red-500 transition-colors shadow"
                                    title="Xóa ảnh bìa"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 rounded-2xl cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/20 group/label">
                                <ImageIcon className="w-6 h-6 text-slate-450 group-hover/label:text-indigo-500 transition-colors mb-2" />
                                <span className="text-xs font-semibold text-slate-400 group-hover/label:text-indigo-500 transition-colors">Thêm ảnh bìa</span>
                                <input type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>

                {/* Control Action Row */}
                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={handleAddCardRow}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700/60 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm dòng mới
                    </button>
                    {onGeminiAssist && (
                        <div className="flex flex-wrap gap-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setBatchModalInitialTab('text');
                                    setIsBatchModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-indigo-650 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 dark:text-indigo-400 dark:bg-slate-800 dark:border-indigo-900/50 dark:hover:bg-slate-750 transition-all shadow-sm"
                            >
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                Tạo bằng AI hàng loạt
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setBatchModalInitialTab('image');
                                    setIsBatchModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-purple-650 bg-purple-50 hover:bg-purple-100 border border-purple-100 dark:text-purple-400 dark:bg-slate-800 dark:border-purple-900/50 dark:hover:bg-slate-750 transition-all shadow-sm"
                            >
                                <ImageIcon className="w-4 h-4 text-purple-500" />
                                Thêm từ vựng theo ảnh
                            </button>
                        </div>
                    )}
                </div>

                {/* Cards List */}
                <div className="space-y-6">
                    {cards.map((card, index) => (
                        <CardEditorItem
                            key={card.id}
                            card={card}
                            index={index}
                            isActive={activeCardId === card.id}
                            onActivate={setActiveCardId}
                            onUpdate={handleUpdateCard}
                            onDelete={handleDeleteCard}
                            onAiAssist={handleAiAssist}
                            onGenerateMoreExample={onGenerateMoreExample}
                            aiCreditsRemaining={aiCreditsRemaining}
                            isAiLoading={isAiLoadingMap[card.id]}
                            frontInputRef={activeCardId === card.id ? activeFrontInputRef : null}
                        />
                    ))}
                </div>

                {/* Add Card Button (Centered) */}
                <div className="pt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={handleAddCardRow}
                        className="flex flex-col items-center justify-center gap-2 p-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-dashed border-slate-200 dark:border-gray-700 text-slate-450 hover:text-indigo-600 hover:border-indigo-400 dark:hover:text-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 font-bold text-sm w-full transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        THÊM THẺ MỚI
                    </button>
                </div>
            </div>

            {/* Bottom floating save bar on mobile */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-slate-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden z-40 flex gap-3">
                <button
                    type="button"
                    onClick={handleSaveSet}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3.5 text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center shadow-md"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                    Tạo học phần
                </button>
            </div>

            {/* Bulk AI Creation Modal */}
            <BatchAiModal
                isOpen={isBatchModalOpen}
                initialTab={batchModalInitialTab}
                onClose={() => setIsBatchModalOpen(false)}
                onGeminiAssist={onGeminiAssist}
                onExtractVocabFromImage={onExtractVocabFromImage}
                aiCreditsRemaining={aiCreditsRemaining}
                onGenerateComplete={handleBatchAiComplete}
            />

            <OnboardingTour section="vocabAdd" />
        </div>
    );
};

export default AddCardForm;
