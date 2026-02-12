import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import {
    List, Search, Upload, Download, ArrowDown, GraduationCap, Tag, Volume2,
    X, Edit, Trash2, Loader2, Check, Image as ImageIcon, Music,
    FolderPlus, Folder, FolderOpen, ChevronRight, Filter, Eye, MoreVertical, Plus
} from 'lucide-react';
import { JLPT_LEVELS, POS_TYPES, getPosLabel, getPosColor, getLevelColor } from '../../config/constants';
import { SearchInput } from '../ui';
import { SrsStatusCell } from '../ui';
import { playAudio } from '../../utils/audio';
import { compressImage } from '../../utils/image';

// ==================== Edit Modal Component ====================
const EditCardModal = ({ card, onSave, onClose, onGeminiAssist }) => {
    const [front, setFront] = useState(card?.front || '');
    const [back, setBack] = useState(card?.back || '');
    const [synonym, setSynonym] = useState(card?.synonym || '');
    const [example, setExample] = useState(card?.example || '');
    const [exampleMeaning, setExampleMeaning] = useState(card?.exampleMeaning || '');
    const [nuance, setNuance] = useState(card?.nuance || '');
    const [pos, setPos] = useState(card?.pos || '');
    const [level, setLevel] = useState(card?.level || '');
    const [sinoVietnamese, setSinoVietnamese] = useState(card?.sinoVietnamese || '');
    const [synonymSinoVietnamese, setSynonymSinoVietnamese] = useState(card?.synonymSinoVietnamese || '');
    const [imagePreview, setImagePreview] = useState(card?.imageBase64 || null);
    const [customAudio, setCustomAudio] = useState(card?.audioBase64 || '');
    const [showAudioInput, setShowAudioInput] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

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
        onClose();
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
                                    <button type="button" onClick={handleAiAssist}
                                        className="px-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50">
                                        {isAiLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "AI"}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl space-y-3">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {JLPT_LEVELS.map((lvl) => (
                                        <button key={lvl.value} type="button" onClick={() => setLevel(lvl.value)}
                                            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${level === lvl.value
                                                ? `${lvl.color} shadow-sm ring-1 ring-offset-1 ring-indigo-200 dark:ring-indigo-800`
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                }`}>
                                            {lvl.label}
                                        </button>
                                    ))}
                                </div>
                                <select value={pos} onChange={(e) => setPos(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-100">
                                    <option value="">-- Chọn Từ Loại --</option>
                                    {Object.entries(POS_TYPES).map(([key, value]) => (<option key={key} value={key}>{value.label}</option>))}
                                </select>
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
                                    <button type="button" onClick={() => setShowAudioInput(!showAudioInput)} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium flex items-center w-full justify-between">
                                        <div className="flex items-center"><Music className="w-4 h-4 mr-2" /> {customAudio ? "Có Audio" : "Thêm Audio"}</div>
                                        <span className="text-xs text-gray-400">{showAudioInput ? '▲' : '▼'}</span>
                                    </button>
                                    {showAudioInput && (
                                        <div className="mt-2 space-y-2">
                                            <label htmlFor="audio-edit-modal" className="cursor-pointer px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium inline-block">
                                                {customAudio ? "Chọn file khác" : "Chọn file .mp3/wav"}
                                            </label>
                                            <input id="audio-edit-modal" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={handleAudioFileChange} className="hidden" />
                                            {customAudio && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Đã có</span>
                                                    <button type="button" onClick={() => playAudio(customAudio)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Volume2 className="w-4 h-4" /></button>
                                                    <button type="button" onClick={() => setCustomAudio('')} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </div>
                                    )}
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
        </div>
    );
};

// ==================== Folder Management Modal ====================
const FolderManagerModal = ({ folders, onClose, onCreateFolder, onRenameFolder, onDeleteFolder }) => {
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    const handleCreate = () => {
        if (!newFolderName.trim()) return;
        onCreateFolder(newFolderName.trim());
        setNewFolderName('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[450px] max-w-[90vw] shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-indigo-500" />
                        Quản lý thư mục
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Create new folder */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        placeholder="Tên thư mục mới..."
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={!newFolderName.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" /> Tạo
                    </button>
                </div>

                {/* Folder list */}
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {/* Default folder */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                        <Folder className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 italic flex-1">Chưa phân loại (mặc định)</span>
                    </div>

                    {folders.map(folder => (
                        <div key={folder.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 group transition-colors">
                            <Folder className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            {renamingId === folder.id ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { onRenameFolder(folder.id, renameValue); setRenamingId(null); }
                                            if (e.key === 'Escape') setRenamingId(null);
                                        }}
                                        autoFocus
                                        className="flex-1 px-2 py-1 bg-white dark:bg-slate-600 border border-indigo-300 dark:border-indigo-500 rounded text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <button onClick={() => { onRenameFolder(folder.id, renameValue); setRenamingId(null); }} className="text-indigo-500 hover:text-indigo-600">
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{folder.name}</span>
                                    <span className="text-xs text-gray-400">{folder.count || 0} từ</span>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                        <button
                                            onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name); }}
                                            className="p-1 text-gray-400 hover:text-indigo-500 rounded"
                                            title="Đổi tên"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteFolder(folder.id)}
                                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                                            title="Xóa thư mục"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {folders.length === 0 && (
                        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Chưa có thư mục nào. Tạo thư mục để quản lý từ vựng!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==================== Main ListView Component ====================
const ListView = React.memo(({ allCards, onDeleteCard, onPlayAudio, onExport, onImportTSV, onSaveChanges, onGeminiAssist, onNavigateToImport, scrollToCardId, onScrollComplete, savedFilters, onFiltersChange }) => {
    const [editingCard, setEditingCard] = useState(null);
    const [filterLevel, setFilterLevel] = useState(savedFilters?.filterLevel || 'all');
    const [filterPos, setFilterPos] = useState(savedFilters?.filterPos || 'all');
    const [filterAudio, setFilterAudio] = useState(savedFilters?.filterAudio || 'all');
    const [filterFolder, setFilterFolder] = useState(savedFilters?.filterFolder || 'all');
    const [sortOrder, setSortOrder] = useState(savedFilters?.sortOrder || 'newest');
    const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm || '');
    const deferredSearchTerm = useDeferredValue(searchTerm);

    // Folder management
    const [folders, setFolders] = useState(() => {
        const saved = localStorage.getItem('vocab_folders');
        return saved ? JSON.parse(saved) : [];
    });
    const [showFolderManager, setShowFolderManager] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(null); // card id to move

    // Card-to-folder mapping
    const [cardFolders, setCardFolders] = useState(() => {
        const saved = localStorage.getItem('vocab_card_folders');
        return saved ? JSON.parse(saved) : {};
    });

    // Save folders and mappings to localStorage
    useEffect(() => {
        localStorage.setItem('vocab_folders', JSON.stringify(folders));
    }, [folders]);

    useEffect(() => {
        localStorage.setItem('vocab_card_folders', JSON.stringify(cardFolders));
    }, [cardFolders]);

    // Folder CRUD
    const createFolder = useCallback((name) => {
        setFolders(prev => [...prev, { id: `folder_${Date.now()}`, name }]);
    }, []);

    const renameFolder = useCallback((id, newName) => {
        if (!newName.trim()) return;
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
    }, []);

    const deleteFolder = useCallback((id) => {
        setFolders(prev => prev.filter(f => f.id !== id));
        setCardFolders(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(cardId => {
                if (next[cardId] === id) delete next[cardId];
            });
            return next;
        });
        if (filterFolder === id) setFilterFolder('all');
    }, [filterFolder]);

    const moveCardToFolder = useCallback((cardId, folderId) => {
        setCardFolders(prev => {
            const next = { ...prev };
            if (folderId === 'none') {
                delete next[cardId];
            } else {
                next[cardId] = folderId;
            }
            return next;
        });
        setShowMoveModal(null);
    }, []);

    // Folder counts
    const foldersWithCounts = useMemo(() => {
        return folders.map(f => ({
            ...f,
            count: Object.values(cardFolders).filter(fId => fId === f.id).length
        }));
    }, [folders, cardFolders]);

    const unfiledCount = useMemo(() => {
        return allCards.filter(c => !cardFolders[c.id]).length;
    }, [allCards, cardFolders]);

    // Progressive loading
    const [displayedCount, setDisplayedCount] = useState(50);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);
    }, []);

    // Restore filters
    const previousSavedFiltersRef = useRef(null);
    const isRestoringRef = useRef(false);

    useEffect(() => {
        if (savedFilters && JSON.stringify(previousSavedFiltersRef.current) !== JSON.stringify(savedFilters)) {
            isRestoringRef.current = true;
            previousSavedFiltersRef.current = savedFilters;
            setFilterLevel(savedFilters.filterLevel || 'all');
            setFilterPos(savedFilters.filterPos || 'all');
            setFilterAudio(savedFilters.filterAudio || 'all');
            setFilterFolder(savedFilters.filterFolder || 'all');
            setSortOrder(savedFilters.sortOrder || 'newest');
            setSearchTerm(savedFilters.searchTerm || '');
            setTimeout(() => { isRestoringRef.current = false; }, 50);
        }
    }, [savedFilters]);

    useEffect(() => {
        if (isRestoringRef.current || !onFiltersChange) return;
        onFiltersChange({ filterLevel, filterPos, filterAudio, filterFolder, sortOrder, searchTerm });
    }, [filterLevel, filterPos, filterAudio, filterFolder, sortOrder, searchTerm, onFiltersChange]);

    const resetFilters = useCallback(() => {
        setFilterLevel('all');
        setFilterPos('all');
        setFilterAudio('all');
        setFilterFolder('all');
        setSortOrder('newest');
        setSearchTerm('');
    }, []);

    // Pre-compute
    const preprocessedCards = useMemo(() => {
        return allCards.map(card => {
            if (!card._searchableText) {
                card._searchableText = [
                    card.front?.toLowerCase() || '',
                    card.back?.toLowerCase() || '',
                    card.synonym?.toLowerCase() || '',
                    card.sinoVietnamese?.toLowerCase() || ''
                ].join(' ');
            }
            if (card._timestamp === undefined) {
                card._timestamp = card.createdAt?.getTime() || 0;
            }
            return card;
        });
    }, [allCards]);

    // Filtering
    const filteredCards = useMemo(() => {
        const searchTermLower = deferredSearchTerm.trim().toLowerCase();
        const hasSearch = searchTermLower.length > 0;
        const hasLevelFilter = filterLevel !== 'all';
        const hasPosFilter = filterPos !== 'all';
        const hasAudioFilter = filterAudio !== 'all';
        const hasFolderFilter = filterFolder !== 'all';
        const hasAnyFilter = hasSearch || hasLevelFilter || hasPosFilter || hasAudioFilter || hasFolderFilter;

        let result;
        if (!hasAnyFilter) {
            result = [...preprocessedCards];
        } else {
            result = [];
            for (let i = 0; i < preprocessedCards.length; i++) {
                const card = preprocessedCards[i];
                if (hasSearch && !card._searchableText.includes(searchTermLower)) continue;
                if (hasLevelFilter && card.level !== filterLevel) continue;
                if (hasPosFilter && card.pos !== filterPos) continue;
                if (hasAudioFilter) {
                    if (filterAudio === 'with' && (!card.audioBase64 || card.audioBase64.trim() === '')) continue;
                    if (filterAudio === 'without' && card.audioBase64 && card.audioBase64.trim() !== '') continue;
                }
                if (hasFolderFilter) {
                    if (filterFolder === 'unfiled' && cardFolders[card.id]) continue;
                    if (filterFolder !== 'unfiled' && cardFolders[card.id] !== filterFolder) continue;
                }
                result.push(card);
            }
        }

        if (sortOrder === 'newest') {
            result.sort((a, b) => b._timestamp - a._timestamp);
        } else {
            result.sort((a, b) => a._timestamp - b._timestamp);
        }
        return result;
    }, [preprocessedCards, filterLevel, filterPos, filterAudio, filterFolder, sortOrder, deferredSearchTerm, cardFolders]);

    useEffect(() => { setDisplayedCount(50); }, [filterLevel, filterPos, filterAudio, filterFolder, sortOrder, deferredSearchTerm]);

    const displayedCards = useMemo(() => filteredCards.slice(0, displayedCount), [filteredCards, displayedCount]);

    // Load more on scroll
    const handleScroll = useCallback(() => {
        const scrollY = window.scrollY || window.pageYOffset;
        const windowHeight = window.innerHeight;
        const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        if (scrollY + windowHeight >= documentHeight - 800 && displayedCount < filteredCards.length && !isLoadingMore) {
            setIsLoadingMore(true);
            requestAnimationFrame(() => {
                setDisplayedCount(prev => Math.min(prev + 50, filteredCards.length));
                setIsLoadingMore(false);
            });
        }
    }, [displayedCount, filteredCards.length, isLoadingMore]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('scroll', handleScroll, { passive: true });
        return () => { window.removeEventListener('scroll', handleScroll); document.removeEventListener('scroll', handleScroll); };
    }, [handleScroll]);

    const loadMore = useCallback(() => {
        setDisplayedCount(prev => Math.min(prev + 100, filteredCards.length));
    }, [filteredCards.length]);

    // Scroll to card
    useEffect(() => {
        if (scrollToCardId) {
            const cardIndex = filteredCards.findIndex(c => c.id === scrollToCardId);
            if (cardIndex >= displayedCount) setDisplayedCount(cardIndex + 10);
            setTimeout(() => {
                const element = document.querySelector(`[data-card-id="${scrollToCardId}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-indigo-500');
                    setTimeout(() => { element.classList.remove('ring-2', 'ring-indigo-500'); }, 2000);
                    if (onScrollComplete) onScrollComplete();
                }
            }, 100);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [scrollToCardId, filteredCards, onScrollComplete, displayedCount]);

    // Stats
    const stats = useMemo(() => {
        const total = allCards.length;
        const hasAudio = allCards.filter(c => c.audioBase64 && c.audioBase64.trim() !== '').length;
        const now = new Date();
        const dueCards = allCards.filter(c => c.nextReview_back && c.nextReview_back <= now).length;
        const newCards = allCards.filter(c => c.intervalIndex_back === -1).length;
        return { total, hasAudio, dueCards, newCards };
    }, [allCards]);

    // Get folder name for a card
    const getFolderName = useCallback((cardId) => {
        const folderId = cardFolders[cardId];
        if (!folderId) return null;
        const folder = folders.find(f => f.id === folderId);
        return folder?.name || null;
    }, [cardFolders, folders]);

    const hasActiveFilters = filterLevel !== 'all' || filterPos !== 'all' || filterAudio !== 'all' || filterFolder !== 'all' || searchTerm.trim() !== '';

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4 lg:p-8">
            {/* Modals */}
            {editingCard && (
                <EditCardModal card={editingCard} onSave={onSaveChanges} onClose={() => setEditingCard(null)} onGeminiAssist={onGeminiAssist} />
            )}
            {showFolderManager && (
                <FolderManagerModal
                    folders={foldersWithCounts}
                    onClose={() => setShowFolderManager(false)}
                    onCreateFolder={createFolder}
                    onRenameFolder={renameFolder}
                    onDeleteFolder={deleteFolder}
                />
            )}

            {/* Move to folder modal */}
            {showMoveModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-[350px] max-w-[90vw] shadow-2xl space-y-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Folder className="w-5 h-5 text-indigo-500" /> Chọn thư mục
                        </h3>
                        <div className="max-h-[250px] overflow-y-auto space-y-1">
                            <button
                                onClick={() => moveCardToFolder(showMoveModal, 'none')}
                                className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Folder className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500 italic">Chưa phân loại</span>
                            </button>
                            {folders.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => moveCardToFolder(showMoveModal, f.id)}
                                    className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-colors ${cardFolders[showMoveModal] === f.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'
                                            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <Folder className={`w-4 h-4 ${cardFolders[showMoveModal] === f.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                                    <span className={`text-sm ${cardFolders[showMoveModal] === f.id ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>{f.name}</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowMoveModal(null)} className="w-full py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                            Đóng
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <List className="w-6 h-6 text-indigo-500" />
                        Danh sách từ vựng
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Quản lý và chỉnh sửa {allCards.length} thẻ ghi nhớ
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowFolderManager(true)}
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                        <FolderPlus className="w-4 h-4" /> Thư mục
                    </button>
                    <button onClick={() => onExport(allCards)}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                        <Upload className="w-4 h-4" /> Xuất
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-indigo-500">{stats.total}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Tổng từ vựng</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-orange-500">{stats.dueCards}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Cần ôn</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-blue-500">{stats.newCards}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Chưa học</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-emerald-500">{stats.hasAudio}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Có âm thanh</div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm từ vựng, Hán Việt, nghĩa..."
                        className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2.5 pl-10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />

                    {/* Level filter pills */}
                    <button onClick={() => setFilterLevel('all')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterLevel === 'all' ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                        Tất cả
                    </button>
                    {JLPT_LEVELS.map(l => (
                        <button key={l.value}
                            onClick={() => setFilterLevel(filterLevel === l.value ? 'all' : l.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterLevel === l.value ? `${l.color} text-white` : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                            {l.label}
                        </button>
                    ))}

                    <span className="text-gray-300 dark:text-gray-600">|</span>

                    {/* POS filter */}
                    <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                        <option value="all">Từ loại</option>
                        {Object.entries(POS_TYPES).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                    </select>

                    {/* Sort */}
                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                        <option value="newest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                    </select>

                    {/* Audio filter */}
                    <select value={filterAudio} onChange={(e) => setFilterAudio(e.target.value)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                        <option value="all">Âm thanh</option>
                        <option value="with">Có</option>
                        <option value="without">Chưa có</option>
                    </select>

                    {/* Folder filter */}
                    {folders.length > 0 && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <select value={filterFolder} onChange={(e) => setFilterFolder(e.target.value)}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                                <option value="all">📁 Tất cả</option>
                                <option value="unfiled">📂 Chưa phân loại</option>
                                {folders.map(f => (<option key={f.id} value={f.id}>📁 {f.name}</option>))}
                            </select>
                        </>
                    )}
                </div>

                {/* Active filter info */}
                {hasActiveFilters && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-500">
                            Tìm thấy <span className="font-bold text-indigo-600 dark:text-indigo-400">{filteredCards.length}</span> từ vựng
                        </span>
                        <button onClick={resetFilters}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Bỏ lọc
                        </button>
                    </div>
                )}
            </div>

            {/* Import buttons bar */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                    {filteredCards.length} từ vựng
                </span>
                {onNavigateToImport && (
                    <button onClick={onNavigateToImport}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" /> Nhập File
                    </button>
                )}
                <input type="file" id="tsv-import-listview" accept=".tsv,.txt" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file && onImportTSV) { onImportTSV(file); e.target.value = ''; } }}
                />
                <button onClick={() => document.getElementById('tsv-import-listview')?.click()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> TSV
                </button>
            </div>

            {/* Vocabulary Cards Grid */}
            {filteredCards.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                    <List className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Không tìm thấy từ vựng nào</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {displayedCards.map(card => {
                        const folderName = getFolderName(card.id);
                        return (
                            <div
                                key={card.id}
                                data-card-id={card.id}
                                className="group relative flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all"
                            >
                                {/* Audio button */}
                                <button
                                    onClick={() => onPlayAudio(card.audioBase64, card.front)}
                                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${card.audioBase64
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                                            : 'bg-gray-50 dark:bg-slate-700 text-gray-300 dark:text-gray-600'
                                        }`}
                                    title={card.audioBase64 ? 'Phát âm thanh' : 'Chưa có âm thanh'}
                                >
                                    <Volume2 className="w-4 h-4" />
                                </button>

                                {/* Main content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{card.front}</span>
                                        {card.sinoVietnamese && (
                                            <span className="text-[10px] font-medium text-pink-500 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-1.5 rounded">{card.sinoVietnamese}</span>
                                        )}
                                        {card.level && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${getLevelColor(card.level)}`}>{card.level}</span>
                                        )}
                                        {card.pos && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${getPosColor(card.pos)}`}>{getPosLabel(card.pos)}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{card.back}</div>
                                    {folderName && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Folder className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">{folderName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* SRS Status */}
                                <div className="flex-shrink-0 hidden sm:block">
                                    <SrsStatusCell intervalIndex={card.intervalIndex_back} nextReview={card.nextReview_back} hasData={true} />
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <div className="flex gap-1">
                                        <button onClick={() => setShowMoveModal(card.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                            title="Chuyển thư mục">
                                            <Folder className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setEditingCard(card)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                            title="Chỉnh sửa">
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => onDeleteCard(card.id, card.front)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                            title="Xóa">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Load more */}
                    {displayedCount < filteredCards.length && (
                        <div className="py-4 text-center space-y-3">
                            {isLoadingMore ? (
                                <div className="flex items-center justify-center gap-2 text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">Đang tải thêm...</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-400">
                                        Đang hiển thị {displayedCount} / {filteredCards.length} từ vựng
                                    </p>
                                    <button onClick={loadMore}
                                        className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
                                        Tải thêm 100 từ vựng
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

ListView.displayName = 'ListView';

export default ListView;
