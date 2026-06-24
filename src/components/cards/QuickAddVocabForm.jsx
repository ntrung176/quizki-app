import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Loader2, Check, X, Languages, Sparkle, 
    ChevronDown, Search, Trash2, ArrowLeft, FolderKanban, Folder, BookOpen
} from 'lucide-react';
import { POS_TYPES } from '../../config/constants';
import { showToast } from '../../utils/toast';
import { TopTabBar } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import { CardEditorItem } from './AddCardForm';

const QuickAddVocabForm = ({
    folders = [], // These are the study sets (type !== 'folder')
    parentFolders = [], // These are the directories/folders (type === 'folder')
    cardFolders = {},
    allCards = [],
    onSave,
    onBack,
    onGeminiAssist,
    onGenerateMoreExample,
    aiCreditsRemaining
}) => {
    const navigate = useNavigate();
    
    // Initialize cards with all fields to match CardEditorItem structure
    const [cards, setCards] = useState([
        { 
            id: Date.now(), 
            front: '', 
            back: '', 
            synonym: '', 
            example: '', 
            exampleMeaning: '', 
            nuance: '', 
            pos: '', 
            level: '', 
            sinoVietnamese: '', 
            synonymSinoVietnamese: '', 
            reading: '',
            accent: '',
            imageBase64: null, 
            audioBase64: null 
        }
    ]);
    const [activeCardId, setActiveCardId] = useState(cards[0].id);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoadingMap, setIsAiLoadingMap] = useState({});
    const [showSetSelector, setShowSetSelector] = useState(false);
    const [selectedModalFolderId, setSelectedModalFolderId] = useState(null);
    const [searchSetQuery, setSearchSetQuery] = useState('');

    const activeFrontInputRef = useRef(null);

    useEffect(() => {
        if (activeCardId && activeFrontInputRef.current) {
            activeFrontInputRef.current.focus();
        }
    }, [activeCardId]);

    const handleUpdateCard = (id, field, value) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleDeleteCard = (id) => {
        if (cards.length === 1) return;
        const newCards = cards.filter(c => c.id !== id);
        setCards(newCards);
        if (activeCardId === id) {
            setActiveCardId(newCards[newCards.length - 1].id);
        }
    };

    const handleAddCardRow = () => {
        const newCard = { 
            id: Date.now(), 
            front: '', 
            back: '', 
            synonym: '', 
            example: '', 
            exampleMeaning: '', 
            nuance: '', 
            pos: '', 
            level: '', 
            sinoVietnamese: '', 
            synonymSinoVietnamese: '', 
            reading: '',
            accent: '',
            imageBase64: null, 
            audioBase64: null 
        };
        setCards(prev => [...prev, newCard]);
        setActiveCardId(newCard.id);
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const handleAiAssist = async (id) => {
        const card = cards.find(c => c.id === id);
        if (!card || !card.front.trim() || !onGeminiAssist) return;

        // Check duplicate in current local set
        const currentFrontNormalized = card.front.split('（')[0].split('(')[0].trim().toLowerCase();
        const isDuplicate = cards.some(c => {
            if (c.id === id) return false;
            const otherFrontNormalized = c.front.split('（')[0].split('(')[0].trim().toLowerCase();
            return otherFrontNormalized === currentFrontNormalized;
        });

        if (isDuplicate) {
            showToast('Từ vựng này đã có trong danh sách thêm nhanh.', 'warning');
            return;
        }

        setIsAiLoadingMap(prev => ({ ...prev, [id]: true }));
        const aiData = await onGeminiAssist(card.front, card.pos || '', card.level || '', card.back || '', false);

        if (aiData) {
            setCards(prev => prev.map(c => {
                if (c.id === id) {
                    return {
                        ...c,
                        front: aiData.frontWithFurigana || c.front,
                        back: aiData.meaning || '',
                        sinoVietnamese: aiData.sinoVietnamese || '',
                        pos: aiData.pos || '',
                        level: aiData.level || '',
                        synonym: aiData.synonym || '',
                        example: aiData.example || '',
                        exampleMeaning: aiData.exampleMeaning || '',
                        nuance: aiData.nuance || '',
                        synonymSinoVietnamese: aiData.synonymSinoVietnamese || '',
                        reading: aiData.reading || '',
                        accent: aiData.accent !== undefined ? String(aiData.accent) : ''
                    };
                }
                return c;
            }));
        }
        setIsAiLoadingMap(prev => ({ ...prev, [id]: false }));
    };

    const handleTriggerSave = () => {
        const validCards = cards.filter(c => c.front.trim() && c.back.trim());
        if (validCards.length === 0) {
            showToast('Vui lòng điền ít nhất 1 từ vựng hợp lệ (có Thuật ngữ và Định nghĩa)', 'error');
            return;
        }
        setSelectedModalFolderId(null);
        setSearchSetQuery('');
        setShowSetSelector(true);
    };

    // Calculate card count per study set
    const folderCardCounts = useMemo(() => {
        const counts = {};
        allCards.forEach(c => {
            if (c.folderId) {
                counts[c.folderId] = (counts[c.folderId] || 0) + 1;
            }
        });
        return counts;
    }, [allCards]);

    // Combine all parent folders and study sets for browsing
    const combinedModalItems = useMemo(() => {
        return [...(parentFolders || []), ...(folders || [])];
    }, [parentFolders, folders]);

    // Determine what items to show in selector modal
    const itemsToShow = useMemo(() => {
        if (searchSetQuery.trim()) {
            // When searching, show only matching study sets directly, ignoring folders hierarchy
            return folders.filter(f => f.name.toLowerCase().includes(searchSetQuery.toLowerCase()));
        }
        // When not searching, show items (folders/study sets) belonging to the current directory level
        return combinedModalItems.filter(f => (f.parentId || null) === selectedModalFolderId);
    }, [combinedModalItems, folders, selectedModalFolderId, searchSetQuery]);

    // Active folder helper inside modal
    const activeFolder = useMemo(() => {
        if (!selectedModalFolderId) return null;
        return parentFolders.find(f => f.id === selectedModalFolderId);
    }, [parentFolders, selectedModalFolderId]);

    const handleSaveToFolder = async (folderId) => {
        const validCards = cards.filter(c => c.front.trim() && c.back.trim());
        setIsSaving(true);
        setShowSetSelector(false);

        try {
            const savePromises = validCards.map(async (card) => {
                const success = await onSave({
                    front: card.front,
                    back: card.back,
                    synonym: card.synonym || '',
                    example: card.example || '',
                    exampleMeaning: card.exampleMeaning || '',
                    nuance: card.nuance || '',
                    pos: card.pos || '',
                    level: card.level || '',
                    sinoVietnamese: card.sinoVietnamese || '',
                    synonymSinoVietnamese: card.synonymSinoVietnamese || '',
                    imageBase64: card.imageBase64 || null,
                    audioBase64: card.audioBase64 || null,
                    action: 'continue',
                    folderId: folderId
                });
                return success;
            });

            const results = await Promise.all(savePromises);
            const successCount = results.filter(Boolean).length;

            setIsSaving(false);

            if (successCount > 0) {
                showToast(`Đã lưu thành công ${successCount} từ vựng vào học phần!`, 'success');
                navigate(`/vocab/set/${folderId}`);
            } else {
                showToast('Lưu từ vựng thất bại hoặc từ bị trùng lặp.', 'error');
            }
        } catch (error) {
            console.error("Lỗi khi lưu thẻ:", error);
            showToast("Có lỗi xảy ra khi lưu từ vựng.", 'error');
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full pb-32 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <TopTabBar tabs={VOCAB_TABS} />

            <div className="max-w-4xl mx-auto px-4 lg:px-8 mt-6 space-y-6 animate-fade-in">
                {/* Header Section */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-2 bg-white dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700/60 text-slate-655 dark:text-slate-350 border border-slate-200 dark:border-gray-700 rounded-xl transition-colors shadow-sm"
                            title="Quay lại"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                                Thêm nhanh từ vựng
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">
                                Nhập danh sách từ vựng chi tiết rồi lưu vào học phần phù hợp.
                            </p>
                        </div>
                    </div>
                    
                    <button
                        type="button"
                        onClick={handleTriggerSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Lưu từ vựng
                    </button>
                </div>

                {/* Cards List */}
                <div className="space-y-4">
                    {cards.map((card, index) => (
                        <CardEditorItem
                            key={card.id}
                            card={card}
                            index={index}
                            isActive={activeCardId === card.id}
                            onActivate={setActiveCardId}
                            onUpdate={handleUpdateCard}
                            onDelete={(e) => {
                                e.stopPropagation();
                                handleDeleteCard(card.id);
                            }}
                            onAiAssist={onGeminiAssist ? handleAiAssist : null}
                            onGenerateMoreExample={onGenerateMoreExample}
                            aiCreditsRemaining={aiCreditsRemaining}
                            isAiLoading={isAiLoadingMap[card.id]}
                            frontInputRef={activeCardId === card.id ? activeFrontInputRef : null}
                        />
                    ))}
                </div>

                {/* Add Card Button (Centered) */}
                <div className="pt-4 flex justify-center">
                    <button
                        type="button"
                        onClick={handleAddCardRow}
                        className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-dashed border-slate-200 dark:border-gray-700 text-slate-450 hover:text-teal-600 hover:border-teal-450 dark:hover:text-teal-400 dark:hover:border-teal-500 hover:bg-teal-50/20 dark:hover:bg-teal-900/10 font-bold text-sm w-full transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        THÊM DÒNG MỚI
                    </button>
                </div>
            </div>

            {/* Floating Save Button on Mobile */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-slate-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden z-40 flex gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 px-4 py-3 text-sm font-semibold rounded-xl text-slate-605 bg-white hover:bg-slate-100 border border-slate-200 dark:text-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700/60 dark:border-gray-700 transition-colors flex items-center justify-center shadow-sm"
                >
                    Hủy
                </button>
                <button
                    type="button"
                    onClick={handleTriggerSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 transition-colors disabled:opacity-50 flex items-center justify-center shadow-md"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                    Lưu từ vựng
                </button>
            </div>

            {/* Folder / Study Set Selector Dialog/Modal */}
            {showSetSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        
                        {/* Dialog Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-750">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                    {activeFolder ? `Thư mục: ${activeFolder.name}` : 'Chọn nơi lưu từ vựng'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {activeFolder ? 'Chọn một học phần trong thư mục này để lưu' : 'Chọn học phần hoặc thư mục để lưu danh sách từ vựng này'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSetSelector(false)}
                                className="p-1.5 hover:bg-slate-105 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 border-b border-slate-50 dark:border-slate-750/50 bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-405" />
                                <input
                                    type="text"
                                    value={searchSetQuery}
                                    onChange={(e) => setSearchSetQuery(e.target.value)}
                                    placeholder="Tìm kiếm học phần..."
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-teal-500 dark:focus:border-teal-500 rounded-xl text-sm outline-none transition-colors text-slate-700 dark:text-slate-250"
                                />
                            </div>
                        </div>

                        {/* Folder / Study Sets List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[45vh] custom-scrollbar">
                            {/* Directory Back Button */}
                            {!searchSetQuery && selectedModalFolderId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const parentFolderId = activeFolder ? (activeFolder.parentId || null) : null;
                                        setSelectedModalFolderId(parentFolderId);
                                    }}
                                    className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all flex items-center gap-2 mb-2 font-bold text-xs"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Quay lại {activeFolder?.parentId ? '' : '(Thư mục chính)'}</span>
                                </button>
                            )}

                            {itemsToShow.length > 0 ? (
                                itemsToShow.map((item) => {
                                    const isFolder = item.type === 'folder';
                                    const cardCount = folderCardCounts[item.id] || 0;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                if (isFolder) {
                                                    setSelectedModalFolderId(item.id);
                                                } else {
                                                    handleSaveToFolder(item.id);
                                                }
                                            }}
                                            className="w-full flex items-center gap-4 p-3.5 text-left rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-900/50 bg-slate-50/30 dark:bg-slate-850/30 hover:bg-teal-50/10 dark:hover:bg-teal-950/10 transition-all group"
                                        >
                                            {/* Folder Cover Image or Icon */}
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                                                {isFolder ? (
                                                    <Folder className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                                                ) : item.coverImage ? (
                                                    <img src={item.coverImage} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <BookOpen className="w-6 h-6 text-slate-450 dark:text-slate-400 group-hover:text-teal-500 transition-colors" />
                                                )}
                                            </div>

                                            {/* Folder/Set details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                                                        {item.name}
                                                    </h4>
                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${isFolder ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400'}`}>
                                                        {isFolder ? 'Thư mục' : 'Học phần'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold mt-0.5">
                                                    {isFolder ? 'Thư mục quản lý' : `${cardCount} từ vựng`}
                                                </p>
                                            </div>

                                            {/* Select button decoration */}
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-teal-500 group-hover:text-white dark:group-hover:bg-teal-600 transition-all flex items-center justify-center text-slate-400 shrink-0">
                                                {isFolder ? <ChevronDown className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8">
                                    <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Không tìm thấy nội dung nào</p>
                                    <p className="text-xs text-slate-400 mt-1">Vui lòng tạo thư mục hoặc học phần trước khi thêm từ.</p>
                                </div>
                            )}
                        </div>

                        {/* Dialog Footer */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-750/50 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowSetSelector(false)}
                                className="px-5 py-2 text-sm font-semibold rounded-xl text-slate-600 bg-white hover:bg-slate-100 border border-slate-250 dark:text-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700/60 dark:border-gray-700 transition-colors shadow-sm"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickAddVocabForm;
