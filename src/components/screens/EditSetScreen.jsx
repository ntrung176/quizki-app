import React, { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, Image as ImageIcon, Check, X, Sparkle, Folder, AlertTriangle } from 'lucide-react'

import { compressImage } from '../../utils/image';
import { TopTabBar } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import { showToast } from '../../utils/toast';
import { CardEditorItem } from '../cards/AddCardForm';
import BatchAiModal from '../cards/BatchAiModal';
import PremiumLockedModal from '../ui/PremiumLockedModal';

const isCardModified = (card, originalCard) => {
    if (!originalCard) return true;
    const fields = [
        'front', 'back', 'synonym', 'example', 'exampleMeaning', 
        'nuance', 'pos', 'level', 'sinoVietnamese', 'synonymSinoVietnamese', 
        'reading', 'accent', 'imageBase64', 'audioBase64'
    ];
    for (const f of fields) {
        const val1 = card[f] !== undefined && card[f] !== null ? card[f] : '';
        const val2 = originalCard[f] !== undefined && originalCard[f] !== null ? originalCard[f] : '';
        if (String(val1).trim() !== String(val2).trim()) {
            return true;
        }
    }
    return false;
};

const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

const EditSetScreen = ({
    folderId,
    folders,
    cardFolders,
    allCards,
    onRenameFolder,
    onAddFolder,
    onUpdateCard,
    onDeleteCard,
    onSaveNewCard,
    onBack,
    onGeminiAssist,
    onGenerateMoreExample,
    onExtractVocabFromImage,
    aiCreditsRemaining,
    parentFolders = [],
    canUserUseAI
}) => {
    const folder = folderId === 'unfiled' ? { name: 'Từ vựng lẻ', description: 'Các từ vựng không thuộc học phần nào', coverImage: null } : (folders.find(f => f.id === folderId) || { name: 'Học phần', description: '', coverImage: null });
    const [title, setTitle] = useState(folder.name || '');
    const [description, setDescription] = useState(folder.description || '');
    const [coverImage, setCoverImage] = useState(folder.coverImage || null);

    // Original cards in this set
    const originalSetCards = folderId === 'unfiled' 
        ? allCards.filter(c => !cardFolders[c.id] || cardFolders[c.id] === 'unfiled')
        : allCards.filter(c => cardFolders[c.id] === folderId);

    const [cards, setCards] = useState(originalSetCards.length > 0 ? originalSetCards : [
        { id: `new_${Date.now()}`, isNew: true, front: '', back: '', synonym: '', example: '', exampleMeaning: '', nuance: '', pos: '', level: '', sinoVietnamese: '', synonymSinoVietnamese: '', reading: '', accent: '', imageBase64: null, audioBase64: null }
    ]);

    const [activeCardId, setActiveCardId] = useState(cards[0]?.id);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoadingMap, setIsAiLoadingMap] = useState({});
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [duplicateCheckResult, setDuplicateCheckResult] = useState(null);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    // Bulk AI Modal State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchModalInitialTab, setBatchModalInitialTab] = useState('text');

    const activeFrontInputRef = useRef(null);

    useEffect(() => {
        if (activeCardId && activeFrontInputRef.current) {
            activeFrontInputRef.current.focus();
        }
    }, [activeCardId]);

    const handleUpdateCard = (id, field, value) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleDeleteCardFromUI = async (e, id) => {
        e.stopPropagation();
        if (cards.length === 1) return;

        const card = cards.find(c => c.id === id);
        if (!card.isNew && onDeleteCard) {
            await onDeleteCard(id, '');
        }

        const newCards = cards.filter(c => c.id !== id);
        setCards(newCards);
        if (activeCardId === id) {
            setActiveCardId(newCards[newCards.length - 1].id);
        }
    };

    const handleAddCardRow = () => {
        const newCard = { id: `new_${Date.now()}`, isNew: true, front: '', back: '', synonym: '', example: '', exampleMeaning: '', nuance: '', pos: '', level: '', sinoVietnamese: '', synonymSinoVietnamese: '', reading: '', accent: '', imageBase64: null, audioBase64: null };
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

        if (!canUserUseAI) {
            setShowPremiumModal(true);
            return;
        }

        // Check duplicate in current study set
        const currentFrontNormalized = card.front.split('（')[0].split('(')[0].trim().toLowerCase();
        const isDuplicate = cards.some(c => {
            if (c.id === id) return false;
            const otherFrontNormalized = c.front.split('（')[0].split('(')[0].trim().toLowerCase();
            return otherFrontNormalized === currentFrontNormalized;
        });

        if (isDuplicate) {
            showToast('Từ vựng đã có trong học phần rồi.', 'warning');
            return;
        }

        setIsAiLoadingMap(prev => ({ ...prev, [id]: true }));
        const aiData = await onGeminiAssist(card.front, card.pos, card.level, card.back, false);

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
                        level: aiData.level || c.level,
                        reading: aiData.reading || c.reading || '',
                        accent: aiData.accent !== undefined ? String(aiData.accent) : (c.accent || '')
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

    const handleSaveSet = () => {
        const validCards = cards.filter(c => c.front.trim() && c.back.trim());
        if (validCards.length === 0) {
            showToast('Học phần phải có ít nhất 1 thẻ hợp lệ (có Thuật ngữ và Định nghĩa)', 'error');
            return;
        }

        if (!title.trim()) {
            showToast('Tiêu đề học phần không được để trống', 'error');
            return;
        }

        if (folderId !== 'unfiled') {
            handleConfirmSaveSet(folder?.parentId || null);
        } else {
            setShowFolderSelector(true);
        }
    };

    const handleConfirmSaveSet = async (parentFolderId) => {
        setShowFolderSelector(false);
        const validCards = cards.filter(c => c.front.trim() && c.back.trim());

        // 1. Check for duplicates within the current screen's inputs
        const seenInputs = new Set();
        const screenDuplicates = [];
        for (const card of validCards) {
            const normalized = card.front.split('（')[0].split('(')[0].trim().toLowerCase();
            if (normalized) {
                if (seenInputs.has(normalized)) {
                    screenDuplicates.push(card.front.trim());
                }
                seenInputs.add(normalized);
            }
        }

        if (screenDuplicates.length > 0) {
            showToast(`Có từ vựng bị trùng lặp trên màn hình: ${screenDuplicates.join(', ')}`, 'error');
            return;
        }

        // 2. Check for duplicates in other sets
        const getFrontTextOnly = (front) => {
            if (!front) return '';
            return front.split('（')[0].split('(')[0].trim().toLowerCase();
        };

        const duplicates = [];
        for (const card of validCards) {
            const norm = getFrontTextOnly(card.front);
            if (!norm) continue;

            const existingDuplicate = allCards?.find(c => {
                if (c.id === card.id) return false;

                const otherNorm = getFrontTextOnly(c.front);
                if (otherNorm !== norm) return false;

                const otherFolderId = cardFolders[c.id];
                if (!otherFolderId || otherFolderId === 'unfiled' || otherFolderId === folderId) return false;

                return true;
            });

            if (existingDuplicate) {
                const otherFolderId = cardFolders[existingDuplicate.id];
                const otherFolder = folders?.find(f => f.id === otherFolderId);
                duplicates.push({
                    cardId: card.id,
                    front: card.front,
                    otherSetName: otherFolder ? otherFolder.name : 'Học phần khác'
                });
            }
        }

        if (duplicates.length > 0) {
            setDuplicateCheckResult({ duplicates, parentFolderId });
            return;
        }

        await proceedSaveWithChoices(parentFolderId, []);
    };

    const proceedSaveWithChoices = async (parentFolderId, cardIdsToExclude) => {
        setDuplicateCheckResult(null);
        setIsSaving(true);

        // Delete any existing cards that are explicitly excluded
        if (cardIdsToExclude.length > 0 && onDeleteCard) {
            try {
                const deletePromises = cardIdsToExclude.map(async (cardId) => {
                    const card = cards.find(c => c.id === cardId);
                    if (card && !card.isNew) {
                        return onDeleteCard(cardId, '');
                    }
                });
                await Promise.all(deletePromises);
            } catch (e) {
                console.error("Lỗi khi loại bỏ từ trùng:", e);
            }
        }

        // Filter cards to save
        const validCards = cards.filter(c => c.front.trim() && c.back.trim() && !cardIdsToExclude.includes(c.id));

        if (validCards.length === 0) {
            showToast('Không còn từ vựng nào để lưu sau khi loại bỏ từ trùng.', 'warning');
            setIsSaving(false);
            return;
        }

        let activeFolderId = folderId;
        // Create new folder if 'unfiled' was renamed/edited
        if (folderId === 'unfiled') {
            const hasTitleChanged = title.trim() !== 'Từ vựng lẻ';
            const hasDescChanged = description.trim() !== 'Các từ vựng không thuộc học phần nào';
            const hasCoverChanged = coverImage !== null;

            if (hasTitleChanged || hasDescChanged || hasCoverChanged) {
                if (onAddFolder) {
                    const newId = await onAddFolder(title.trim(), description.trim(), coverImage, parentFolderId);
                    if (!newId) {
                        setIsSaving(false);
                        return; // limits or errors handled inside onAddFolder
                    }
                    activeFolderId = newId;
                }
            }
        } else {
            // Rename folder if title, description, or coverImage changed
            if (folder && onRenameFolder) {
                const hasTitleChanged = title.trim() !== folder.name;
                const hasDescChanged = description.trim() !== (folder.description || '');
                const hasCoverChanged = coverImage !== (folder.coverImage || null);
                const hasParentChanged = parentFolderId !== (folder.parentId || null);

                if (hasTitleChanged || hasDescChanged || hasCoverChanged || hasParentChanged) {
                    try {
                        await onRenameFolder(folderId, { 
                            name: title.trim(), 
                            description: description.trim(),
                            coverImage: coverImage,
                            parentId: parentFolderId || null
                        });
                    } catch (e) {
                        console.error("Lỗi đổi tên học phần:", e);
                    }
                }
            }
        }

        try {
            // Save/update cards in parallel (only if new or modified or folder changed)
            const savePromises = validCards.map(async (card) => {
                if (card.isNew) {
                    const success = await onSaveNewCard({
                        ...card,
                        id: undefined, // remove temp ID
                        isNew: undefined,
                        action: 'continue',
                        folderId: activeFolderId
                    });
                    if (!success) {
                        throw new Error(`Không thể lưu từ vựng (có thể bị trùng lặp): ${card.front}`);
                    }
                    return success;
                } else {
                    const orig = originalSetCards.find(c => c.id === card.id);
                    const isModified = isCardModified(card, orig);
                    const needsFolderUpdate = activeFolderId !== folderId;

                    if (isModified || needsFolderUpdate) {
                        const updates = {
                            front: card.front, back: card.back, synonym: card.synonym, 
                            example: card.example, exampleMeaning: card.exampleMeaning, 
                            nuance: card.nuance, pos: card.pos, level: card.level, 
                            sinoVietnamese: card.sinoVietnamese, synonymSinoVietnamese: card.synonymSinoVietnamese, 
                            reading: card.reading || '', accent: card.accent || '',
                            imageBase64: card.imageBase64, audioBase64: card.audioBase64
                        };
                        if (needsFolderUpdate) {
                            updates.folderId = activeFolderId;
                        }
                        return onUpdateCard(card.id, 'all', updates);
                    }
                    return Promise.resolve(true);
                }
            });

            await Promise.all(savePromises);

            setIsSaving(false);
            showToast(`Đã lưu thành công học phần!`, 'success');
            onBack();
        } catch (error) {
            console.error("Lỗi khi lưu học phần:", error);
            showToast("Có lỗi xảy ra khi lưu học phần.", 'error');
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full pb-32 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <TopTabBar tabs={VOCAB_TABS} />

            <div className="max-w-4xl mx-auto px-4 lg:px-8 mt-6 space-y-8 animate-fade-in">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                            Chỉnh sửa học phần
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Cập nhật thông tin chi tiết và danh sách từ vựng của học phần.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-6 py-2.5 text-sm font-semibold rounded-xl text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 dark:text-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700/60 dark:border-gray-700 transition-colors shadow-sm"
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
                            Lưu học phần
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
                                className="w-full px-0 py-2.5 bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 text-2xl font-bold text-slate-800 dark:text-white outline-none placeholder-slate-400 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">THÊM MÔ TẢ</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Mô tả mục tiêu của bộ từ vựng này..."
                                className="w-full px-0 py-2 bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 text-base text-slate-600 dark:text-slate-200 outline-none placeholder-slate-400 transition-colors"
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
                                    if (!canUserUseAI) {
                                        setShowPremiumModal(true);
                                        return;
                                    }
                                    setBatchModalInitialTab('text');
                                    setIsBatchModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl text-indigo-650 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 dark:text-indigo-400 dark:bg-slate-800 dark:border-indigo-900/50 dark:hover:bg-slate-700 transition-all shadow-sm"
                            >
                                <span className="text-[9px] font-black bg-indigo-200/60 dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md">AI</span>
                                Tạo bằng AI hàng loạt
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!canUserUseAI) {
                                        setShowPremiumModal(true);
                                        return;
                                    }
                                    setBatchModalInitialTab('image');
                                    setIsBatchModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-sky-650 bg-sky-50 hover:bg-sky-100 border border-sky-100 dark:text-sky-400 dark:bg-slate-800 dark:border-sky-900/50 dark:hover:bg-slate-700 transition-all shadow-sm"
                            >
                                <ImageIcon className="w-4 h-4 text-sky-500" />
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
                            onDelete={handleDeleteCardFromUI}
                            onAiAssist={handleAiAssist}
                            onGenerateMoreExample={onGenerateMoreExample}
                            aiCreditsRemaining={aiCreditsRemaining}
                            isAiLoading={isAiLoadingMap[card.id]}
                            frontInputRef={activeCardId === card.id ? activeFrontInputRef : null}
                        />
                    ))}
                </div>

                {/* Add Card Button */}
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

                {/* Bottom Actions for Desktop */}
                <div className="hidden md:flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-6 py-2.5 text-sm font-semibold rounded-xl text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 dark:text-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700/60 dark:border-gray-700 transition-colors shadow-sm"
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
                        Lưu học phần
                    </button>
                </div>
            </div>

            {/* Bottom floating save bar on mobile */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-slate-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden z-40 flex gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 px-4 py-3 text-sm font-semibold rounded-xl text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 dark:text-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700/60 dark:border-gray-700 transition-colors flex items-center justify-center shadow-sm"
                >
                    Hủy
                </button>
                <button
                    type="button"
                    onClick={handleSaveSet}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center shadow-md"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                    Lưu học phần
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
                existingCards={cards}
            />

            {/* Folder Selector Dialog */}
            {showFolderSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        
                        {/* Dialog Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-750">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Chọn thư mục lưu học phần
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Chọn thư mục để sắp xếp học phần này của bạn.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFolderSelector(false)}
                                className="p-1.5 hover:bg-slate-105 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-605 dark:hover:text-slate-200 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Folder List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[50vh] custom-scrollbar">
                            {/* Option: Không phân loại (Root level) */}
                            <button
                                type="button"
                                onClick={() => handleConfirmSaveSet(null)}
                                className={`w-full flex items-center gap-4 p-3.5 text-left rounded-2xl border transition-all group ${(!folder || !folder.parentId) ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 bg-slate-50/30 dark:bg-slate-850/30 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10'}`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-105 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                                    <Folder className="w-5 h-5 text-slate-450 dark:text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                                            Không phân loại (Thư mục gốc)
                                        </h4>
                                        {(!folder || !folder.parentId) && (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-indigo-105 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                                                Hiện tại
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold mt-0.5">
                                        Lưu ở ngoài cùng thư viện học tập
                                    </p>
                                </div>
                                <div className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center shrink-0 ${(!folder || !folder.parentId) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-850 group-hover:bg-indigo-600 group-hover:text-white text-slate-400'}`}>
                                    <Check className="w-4 h-4" />
                                </div>
                            </button>

                            {/* Parent Folders */}
                            {parentFolders.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-750/50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thư mục của bạn</p>
                                    <div className="space-y-2">
                                        {parentFolders.map((pf) => {
                                            const isSelected = folder && folder.parentId === pf.id;
                                            return (
                                                <button
                                                    key={pf.id}
                                                    type="button"
                                                    onClick={() => handleConfirmSaveSet(pf.id)}
                                                    className={`w-full flex items-center gap-4 p-3.5 text-left rounded-2xl border transition-all group ${isSelected ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-80 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900/50 bg-slate-50/30 dark:bg-slate-850/30 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10'}`}
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-705 shrink-0 flex items-center justify-center">
                                                        <Folder className="w-5 h-5 text-amber-500 dark:text-amber-405" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors truncate">
                                                                {pf.name}
                                                            </h4>
                                                            {isSelected && (
                                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                                                                    Hiện tại
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold mt-0.5">
                                                            Thư mục lưu trữ
                                                        </p>
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-850 group-hover:bg-indigo-600 group-hover:text-white text-slate-400'}`}>
                                                        <Check className="w-4 h-4" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dialog Footer */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-750/50 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowFolderSelector(false)}
                                className="px-5 py-2 text-sm font-semibold rounded-xl text-slate-600 bg-white hover:bg-slate-100 border border-slate-250 dark:text-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700/60 dark:border-gray-700 transition-colors shadow-sm"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Duplicates Alert Dialog */}
            {duplicateCheckResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        
                        {/* Dialog Header */}
                        <div className="flex items-center gap-3 p-5 border-b border-slate-150 dark:border-slate-750 bg-amber-50/50 dark:bg-amber-950/10">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Từ vựng đã tồn tại
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Phát hiện từ trùng lặp trong học phần khác
                                </p>
                            </div>
                        </div>

                        {/* List of Duplicates */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[40vh] custom-scrollbar">
                            <p className="text-sm text-slate-650 dark:text-slate-350">
                                Có <strong className="text-amber-600 dark:text-amber-400">{duplicateCheckResult.duplicates.length} từ vựng</strong> trong học phần này đã được tạo ở các học phần khác của bạn:
                            </p>
                            <div className="space-y-2">
                                {duplicateCheckResult.duplicates.map((dup, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                                        <span className="font-semibold text-sm text-slate-750 dark:text-slate-250 truncate max-w-[180px]">
                                            {dup.front}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-450 dark:text-slate-500 shrink-0 font-medium">
                                            <Folder className="w-3.5 h-3.5 text-amber-500/80" />
                                            <span className="truncate max-w-[120px]">{dup.otherSetName}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-750/50 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => proceedSaveWithChoices(duplicateCheckResult.parentFolderId, [])}
                                className="w-full py-2.5 text-sm font-bold rounded-xl text-white bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                            >
                                Vẫn tiếp tục lưu học phần
                            </button>
                            <button
                                type="button"
                                onClick={() => proceedSaveWithChoices(
                                    duplicateCheckResult.parentFolderId, 
                                    duplicateCheckResult.duplicates.map(d => d.cardId)
                                )}
                                className="w-full py-2.5 text-sm font-semibold rounded-xl text-indigo-700 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-indigo-100 dark:border-slate-700"
                            >
                                Lưu và trừ {duplicateCheckResult.duplicates.length} từ trùng
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDuplicateCheckResult(null);
                                    setIsSaving(false);
                                }}
                                className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <PremiumLockedModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </div>
    );
};

export default EditSetScreen;
